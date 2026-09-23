package server

import (
	"log/slog"
	"net/http"
	"os"

	"doc-server/internal/handler"
	"doc-server/internal/middleware"

	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	router := gin.New()
	// middleware
	router.Use(middleware.RequestID())
	router.Use(middleware.StructuredLogger(logger))
	router.Use(gin.Recovery())
	api := router.Group("/api")
	{
		v1 := api.Group("/v1")
		{
			v1.GET("/hello", handler.HelloWorld)
		}
	}

	return router
}
