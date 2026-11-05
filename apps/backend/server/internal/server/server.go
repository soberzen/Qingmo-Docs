package server

import (
	"fmt"
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
