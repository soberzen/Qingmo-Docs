package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	TokenType TokenType `json:"token_type"`
	SessionID string    `json:"session_id,omitempty"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	accessSecret  []byte
	refreshSecret []byte
	issuer        string
	audience      string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

func NewTokenManager(
	accessSecret string,
	refreshSecret string,
	issuer string,
	audience string,
	accessTTL time.Duration,
	refreshTTL time.Duration,
) *TokenManager {
	return &TokenManager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		issuer:        issuer,
		audience:      audience,
		AccessTTL:     accessTTL,
		RefreshTTL:    refreshTTL,
	}
}

func (m *TokenManager) Sign(
	userID uint,
	tokenType TokenType,
	sessionID string,
) (string, *Claims, error) {
	now := time.Now()
	ttl := m.AccessTTL
	secret := m.accessSecret

	if tokenType == TokenTypeRefresh {
		ttl = m.RefreshTTL
		secret = m.refreshSecret
	}

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
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)

	return signed, claims, err
}

func (m *TokenManager) Parse(
	rawToken string,
	expectedType TokenType,
) (*Claims, error) {
	secret := m.accessSecret
	if expectedType == TokenTypeRefresh {
		secret = m.refreshSecret
	}

	claims := new(Claims)

	token, err := jwt.ParseWithClaims(
		rawToken,
		claims,
		func(token *jwt.Token) (any, error) {
			return secret, nil
		},
		jwt.WithValidMethods([]string{
			jwt.SigningMethodHS256.Alg(),
		}),
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second),
	)

	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.TokenType != expectedType {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
