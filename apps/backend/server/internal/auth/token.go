package auth

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"doc-server/internal/errs"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

type Claims struct {
	TokenType TokenType `json:"token_type"`
	SessionID string    `json:"session_id,omitempty"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	keyStore   *RSAKeyStore
	issuer     string
	audience   string
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

func NewTokenManager(
	keyStore *RSAKeyStore,
	issuer string,
	audience string,
	accessTTL time.Duration,
	refreshTTL time.Duration,
) *TokenManager {
	return &TokenManager{
		keyStore:   keyStore,
		issuer:     issuer,
		audience:   audience,
		AccessTTL:  accessTTL,
		RefreshTTL: refreshTTL,
	}
}

func (m *TokenManager) Sign(
	ctx context.Context,
	userID uint,
	tokenType TokenType,
	sessionID string,
) (string, *Claims, error) {
	var ttl time.Duration

	switch tokenType {
	case TokenTypeAccess:
		ttl = m.AccessTTL
	case TokenTypeRefresh:
		ttl = m.RefreshTTL
	default:
		return "", nil, fmt.Errorf("unsupported token type %s", tokenType)
	}

	if ttl <= 0 {
		return "", nil, fmt.Errorf("invalid token TTL for %s", tokenType)
	}

	kid, pair, err := m.keyStore.ActiveKeyContext(ctx, tokenType)
	if err != nil {
		return "", nil, fmt.Errorf("get active RSA key: %w", err)
	}

	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(pair.PrivatePEM))
	if err != nil {
		return "", nil, fmt.Errorf("parse private RSA key: %w", err)
	}

	now := time.Now()

	claims := &Claims{
		TokenType: tokenType,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Audience:  jwt.ClaimStrings{m.audience},
			Subject:   strconv.FormatUint(uint64(userID), 10),
			ID:        uuid.NewString(),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = kid
	signed, err := token.SignedString(privateKey)
	if err != nil {
		return "", nil, fmt.Errorf("sign RSA token: %w", err)
	}

	return signed, claims, nil
}

func (m *TokenManager) Parse(
	ctx context.Context,
	rawToken string,
	expectedType TokenType,
) (*Claims, error) {
	switch expectedType {
	case TokenTypeAccess, TokenTypeRefresh:
	default:
		return nil, errs.ErrTokenInvalid
	}

	claims := new(Claims)

	var internalErr error
	keyFunc := func(token *jwt.Token) (any, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, errs.ErrTokenInvalid
		}

		pair, err := m.keyStore.GetContext(ctx, expectedType, kid)
		if err != nil {
			if errors.Is(err, redis.Nil) {
				return nil, errs.ErrTokenInvalid
			}
			internalErr = fmt.Errorf("get RSA verification key: %w", err)
			return nil, internalErr
		}
		publicKey, err := jwt.ParseRSAPublicKeyFromPEM([]byte(pair.PublicPEM))
		if err != nil {
			internalErr = fmt.Errorf("parse RSA public key: %w", err)
			return nil, internalErr
		}
		return publicKey, nil
	}

	token, err := jwt.ParseWithClaims(
		rawToken,
		claims,
		keyFunc,
		jwt.WithValidMethods([]string{
			jwt.SigningMethodRS256.Alg(),
		}),
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		if internalErr != nil {
			return nil, internalErr
		}
		return nil, errs.ErrTokenInvalid
	}

	if token == nil || !token.Valid {
		return nil, errs.ErrTokenInvalid
	}

	if claims.TokenType != expectedType {
		return nil, errs.ErrTokenInvalid
	}

	return claims, nil
}
