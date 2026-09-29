package pkg

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

func GenerateSessionID() (string, error) {
	b := make([]byte, 32)

	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate session id: %w", err)
	}
	return hex.EncodeToString(b), nil
}
