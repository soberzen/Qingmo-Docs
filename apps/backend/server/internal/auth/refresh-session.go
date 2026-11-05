package auth

import "time"

const RefreshSessionKeyPrefix = "auth:refresh:session:"

type RefreshSession struct {
	SessionID string
	UserID    uint
	TokenHash string
	ExpiresAt time.Time
	UserAgent string
	IP        string
}
