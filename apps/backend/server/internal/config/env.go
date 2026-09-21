package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

func LoadEnv(root, mode string) error {
	if mode == "" {
		mode = os.Getenv("APP_ENV")
	}

	if mode == "" {
		mode = "development"
	}

	files := []string{
		filepath.Join(root, ".env"),
		filepath.Join(root, ".env.local"),
		filepath.Join(root, ".env."+mode),
		filepath.Join(root, ".env."+mode+".local"),
	}

	for _, file := range files {
		fmt.Println(file)
		if _, err := os.Stat(file); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return fmt.Errorf("check env file %s: %w", file, err)
		}
		if err := godotenv.Overload(file); err != nil {
			return fmt.Errorf("load env file %s: %w", file, err)
		}
	}
	return nil
}
