package entity

import "time"

type RefreshSessionEntity struct {
	ID        uint64 `gorm:"primaryKey"`
	UserID    uint   `gorm:"index;not null"`
	SessionID string `gorm:"size:64;uniqueIndex;not null"`
	TokenHash string `gorm:"size:128;not null;index"`
	UserAgent string `gorm:"size:512"` // 浏览器 User-Agent
	IP        string `gorm:"size:64"`  // IP地址

	ExpiresAt time.Time  `gorm:"not null;index"`
	RevokedAt *time.Time `gorm:"index"`

	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
