package entity

import "time"

type UserEntity struct {
	ID           uint64 `gorm:"primaryKey"`
	Name         string `gorm:"not null"`
	Email        string `gorm:"uniqueIndex:idx_users_email;not null"`
	PasswordHash string `gorm:"not null"`
	AvatarUrl    string
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
	DeletedAt    time.Time `gorm:"index"`
}
