package provide

import (
	"context"
	"errors"
	"log"
	"time"

	"doc-server/internal/auth"
	"doc-server/internal/database"
	"doc-server/internal/dto"
	"doc-server/internal/entity"
	"doc-server/pkg"

	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailExists        = errors.New("email already exists")
)

func Login(
	ctx context.Context,
	req dto.Login,
	tokenManager *auth.TokenManager,
	redis database.RedisService,
	db database.Service,
	userAgent string,
	ip string,
) (accessToken, refreshToken string, err error) {
	var user entity.UserEntity

	err = db.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("email = ?", req.Email).First(&user).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", ErrInvalidCredentials
		}
		return "", "", err
	}

	ok, err := auth.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil {
		return "", "", err
	}
	if !ok {
		return "", "", ErrInvalidCredentials
	}

	sessionID, err := pkg.GenerateSessionID()
	if err != nil {
		return "", "", err
	}

	accessToken, _, err = tokenManager.Sign(uint(user.ID), auth.TokenTypeAccess, "")
	if err != nil {
		return "", "", err
	}

	refreshToken, refreshClaims, err := tokenManager.Sign(
		uint(user.ID),
		auth.TokenTypeRefresh,
		sessionID,
	)
	if err != nil {
		return "", "", err
	}

	refreshSession := entity.RefreshSessionEntity{
		SessionID: sessionID,
		UserID:    uint(user.ID),
		TokenHash: auth.HashToken(refreshToken),
		UserAgent: userAgent,
		IP:        ip,
		ExpiresAt: refreshClaims.ExpiresAt.Time,
	}

	if err := redis.SaveRefreshSession(ctx, refreshSession); err != nil {
		return "", "", err
	}

	go func(session entity.RefreshSessionEntity) {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		if err := db.DB().WithContext(ctx).Create(&session).Error; err != nil {
			log.Printf("persist refresh session failed: %v", err)
		}
	}(refreshSession)

	return accessToken, refreshToken, nil
}

func Register(ctx context.Context, req dto.Register, db database.Service) (*entity.UserEntity, error) {
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &entity.UserEntity{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: passwordHash,
		AvatarUrl:    req.AvatarUrl,
	}

	err = db.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing entity.UserEntity
		err := tx.Where("email = ?", req.Email).First(&existing).Error
		if err == nil {
			return ErrEmailExists
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		return tx.Create(user).Error
	})
	if err != nil {
		return nil, err
	}

	return user, nil
}
