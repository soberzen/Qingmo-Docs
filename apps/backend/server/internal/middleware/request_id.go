package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	RequestIDKey    = "request_id"
	RequestIDHeader = "X-Request-ID"
)

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := strings.TrimSpace(c.GetHeader(RequestIDHeader))

		if requestID == "" || len(requestID) > 128 {
			requestID = generateRequestID()
		}

		c.Set(RequestIDKey, requestID)

		c.Header(RequestIDHeader, requestID)

		c.Next()
	}
}

func generateRequestID() string {
	return uuid.NewString()
}
