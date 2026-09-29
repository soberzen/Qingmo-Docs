package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"doc-server/internal/entity"

	"github.com/redis/go-redis/v9"
)

const refreshSessionKeyPrefix = "auth:refresh:session:"

type RedisService interface {
	Client() *redis.Client
	Close() error
	SaveRefreshSession(ctx context.Context, session entity.RefreshSessionEntity) error
	DeleteRefreshSession(ctx context.Context, sessionID string) error
	WarmupRefreshSessions(ctx context.Context, db Service) error
}

type redisService struct {
	client *redis.Client
}

var redisInstance *redisService

func NewRedis() RedisService {
	if redisInstance != nil {
		return redisInstance
	}

	db, _ := strconv.Atoi(os.Getenv("REDIS_DB"))
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Fatalf("can not connect redis: %v", err)
	}

	redisInstance = &redisService{client: client}
	return redisInstance
}

func (s *redisService) Client() *redis.Client {
	return s.client
}

func (s *redisService) Close() error {
	return s.client.Close()
}

func (s *redisService) SaveRefreshSession(ctx context.Context, session entity.RefreshSessionEntity) error {
	ttl := time.Until(session.ExpiresAt)
	if ttl <= 0 {
		return nil
	}

	key := RefreshSessionKey(session.SessionID)
	values := map[string]any{
		"user_id":    session.UserID,
		"session_id": session.SessionID,
		"token_hash": session.TokenHash,
		"user_agent": session.UserAgent,
		"ip":         session.IP,
		"expires_at": session.ExpiresAt.Format(time.RFC3339Nano),
	}

	pipe := s.client.TxPipeline()
	pipe.HSet(ctx, key, values)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *redisService) DeleteRefreshSession(ctx context.Context, sessionID string) error {
	return s.client.Del(ctx, RefreshSessionKey(sessionID)).Err()
}

func (s *redisService) WarmupRefreshSessions(ctx context.Context, db Service) error {
	var sessions []entity.RefreshSessionEntity
	if err := db.DB().
		Where("expires_at > ? AND revoked_at IS NULL", time.Now()).
		Find(&sessions).Error; err != nil {
		return err
	}

	for _, session := range sessions {
		if err := s.SaveRefreshSession(ctx, session); err != nil {
			return err
		}
	}

	log.Printf("Loaded %d refresh sessions into redis", len(sessions))
	return nil
}

func RefreshSessionKey(sessionID string) string {
	return refreshSessionKeyPrefix + sessionID
}
