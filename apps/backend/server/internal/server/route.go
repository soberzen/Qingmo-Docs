package server

import (
	"net/http"

	"doc-server/internal/handler"

	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	router := gin.Default()

	router.GET("/hello", handler.HelloWorld)

	return router
}
