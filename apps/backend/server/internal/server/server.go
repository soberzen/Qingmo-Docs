package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"doc-server/internal/database"
)

type Server struct {
	port int

	db    database.Service
	redis database.RedisService
}

func NewServer() *http.Server {
	port, _ := strconv.Atoi(os.Getenv("PORT"))
	db := database.New()
	redis := database.NewRedis()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := redis.WarmupRefreshSessions(ctx, db); err != nil {
		log.Fatalf("warmup refresh sessions failed: %v", err)
	}

	NewServer := &Server{
		port:  port,
		db:    db,
		redis: redis,
	}

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", NewServer.port),
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
