package server

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	"doc-server/internal/auth"
	"doc-server/internal/handler"
	"doc-server/internal/middleware"

	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	issuer := os.Getenv("JWT_ISSUER")
	audience := os.Getenv("JWT_AUDIENCE")
	tokenManager := auth.NewTokenManager(
		accessSecret,
		refreshSecret,
		issuer,
		audience,
		15*time.Minute,
		7*24*time.Hour,
	)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	router := gin.New()
	// middleware
	router.Use(gin.Recovery())
	router.Use(middleware.RequestID())
	router.Use(middleware.StructuredLogger(logger))

	v1 := router.Group("/api/v1")
	// 不需要认证的路由
	public := v1.Group("")
	authHandler := handler.NewAuthHandler(s.db, s.redis, tokenManager)
	{
		public.POST("/auth/login", authHandler.Login)
		public.POST("/auth/register", authHandler.Register)
	}
	// 需要认证的路由
	protected := v1.Group("")
	protected.Use(middleware.Auth(tokenManager))
	{
		protected.POST("/auth/refresh", authHandler.Refresh)
		protected.POST("/auth/logout", authHandler.Logout)
		protected.GET("/auth/profile", authHandler.Profile)
	}
	return router
}
