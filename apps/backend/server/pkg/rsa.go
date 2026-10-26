package pkg

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"

	"github.com/google/uuid"
)

type KeyPair struct {
	Kid        string
	PrivatePEM string
	PublicPEM  string
}

func GenerateKeyPair() (*KeyPair, error) {
	private, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	kid := uuid.New().String()

	privatePEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(private),
	})

	pubBytes, err := x509.MarshalPKIXPublicKey(&private.PublicKey)
	if err != nil {
		return nil, err
	}

	publicPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	})

	return &KeyPair{
		Kid:        kid,
		PrivatePEM: string(privatePEM),
		PublicPEM:  string(publicPEM),
	}, nil
}
