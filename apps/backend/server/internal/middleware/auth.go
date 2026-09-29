package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"doc-server/internal/auth"
	"doc-server/internal/response"

	"github.com/gin-gonic/gin"
)

func Auth(tokenManager *auth.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			response.Error(c, http.StatusUnauthorized, 401, "unauthorized")
			c.Abort()
			return
		}

		rawToken := strings.TrimSpace(
			strings.TrimPrefix(header, "Bearer "),
		)

		claims, err := tokenManager.Parse(rawToken, auth.TokenTypeAccess)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, 401, "invalid or expired token")
			c.Abort()
			return
		}

		userID, err := strconv.ParseUint(claims.Subject, 10, 64)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, 401, "invalid credentials")
			c.Abort()
			return
		}

		c.Set("user_id", uint(userID))

		c.Next()
	}
}
