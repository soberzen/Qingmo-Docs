package provide

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"

	"doc-server/internal/auth"
	"doc-server/internal/database"
	"doc-server/internal/dto"
	"doc-server/internal/entity"
	"doc-server/internal/errs"
	"doc-server/pkg"

	"gorm.io/gorm"
)

func Login(
	ctx context.Context,
	req dto.Login,
	tokenManager *auth.TokenManager,
	redis database.RedisService,
	db database.Service,
	userAgent string,
	ip string,
) (accessToken, refreshToken, sessionId string, err error) {
	var user entity.UserEntity

	err = db.DB().WithContext(ctx).Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", "", errs.ErrUserNotFound
		}
		return "", "", "", err
	}

	ok, err := auth.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil {
		return "", "", "", err
	}
	if !ok {
		return "", "", "", errs.ErrPasswordWrong
	}

	sessionId, err = pkg.GenerateSessionID()
	if err != nil {
		return "", "", "", err
	}

	accessToken, _, err = tokenManager.Sign(ctx, uint(user.ID), auth.TokenTypeAccess, "")
	if err != nil {
		return "", "", "", err
	}

	refreshToken, refreshClaims, err := tokenManager.Sign(
		ctx,
		uint(user.ID),
		auth.TokenTypeRefresh,
		sessionId,
	)
	if err != nil {
		return "", "", "", err
	}

	refreshSession := entity.RefreshSessionEntity{
		SessionID: sessionId,
		UserID:    uint(user.ID),
		TokenHash: auth.HashToken(refreshToken),
		UserAgent: userAgent,
		IP:        ip,
		ExpiresAt: refreshClaims.ExpiresAt.Time,
	}

	if err := redis.SaveRefreshSession(ctx, refreshSession); err != nil {
		return "", "", "", err
	}

	go func(session entity.RefreshSessionEntity) {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		if err := db.DB().WithContext(ctx).Create(&session).Error; err != nil {
			log.Printf("persist refresh session failed: %v", err)
		}
	}(refreshSession)

	return accessToken, refreshToken, sessionId, nil
}

func Register(ctx context.Context, req dto.Register, db database.Service) (*entity.UserEntity, error) {
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	var existing entity.UserEntity
	err = db.DB().WithContext(ctx).Where("email = ?", req.Email).First(&existing).Error

	if err == nil {
		return nil, errs.ErrEmailExists
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	user := &entity.UserEntity{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: passwordHash,
		AvatarUrl:    req.AvatarUrl,
	}

	err = db.DB().WithContext(ctx).Create(user).Error
	if err != nil {

		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, errs.ErrEmailExists
		}
		return nil, err
	}

	return user, nil
}

func Profile(ctx context.Context, userId uint, db database.Service) (*entity.UserEntity, error) {
	var user entity.UserEntity

	err := db.DB().WithContext(ctx).
		Select("name, email, avatar_url").
		Where("id = ?", userId).
		First(&user).
		Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query user failed: %w", err)
	}

	return &user, nil
}

func Logout(ctx context.Context, refreshToken string, tokenManager *auth.TokenManager, redis database.RedisService, db database.Service) error {
	claims, err := tokenManager.Parse(ctx, refreshToken, auth.TokenTypeRefresh)
	if err != nil {
		if errors.Is(err, errs.ErrTokenInvalid) || errors.Is(err, errs.ErrUnauthorized) {
			return nil
		}

		return fmt.Errorf("parse refresh token %w", err)
	}

	userId, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil || userId == 0 {
		return nil
	}

	result := db.DB().WithContext(ctx).Model(&entity.RefreshSessionEntity{}).Where(
		"session_id = ? AND user_id = ?",
		claims.SessionID,
		userId,
	).Update(
		"revoked_at",
		gorm.Expr("COALESCE(revoked_at, ?)", time.Now()),
	)

	if result.Error != nil {
		return fmt.Errorf("revoke refresh session: %w", result.Error)
	}

	if err := redis.DeleteRefreshSession(ctx, claims.SessionID); err != nil {
		return fmt.Errorf("delete refresh session cache: %w", err)
	}
	return nil
}
