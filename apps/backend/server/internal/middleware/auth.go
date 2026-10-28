package middleware

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"doc-server/internal/auth"
	"doc-server/internal/errs"
	"doc-server/internal/response"

	"github.com/gin-gonic/gin"
)

func Auth(tokenManager *auth.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			response.Error(c, http.StatusUnauthorized, errs.ErrUnauthorized.Code, errs.ErrUnauthorized.Message)
			c.Abort()
			return
		}

		rawToken := strings.TrimSpace(
			strings.TrimPrefix(header, "Bearer "),
		)

		claims, err := tokenManager.Parse(c.Request.Context(), rawToken, auth.TokenTypeAccess)
		if err != nil {
			if errors.Is(err, errs.ErrTokenInvalid) {
				response.Error(c, http.StatusUnauthorized, errs.ErrTokenInvalid.Code, errs.ErrTokenInvalid.Message)
			} else {
				_ = c.Error(err)
				response.Error(
					c,
					http.StatusInternalServerError,
					errs.ErrInternal.Code,
					errs.ErrInternal.Message,
				)
			}
			c.Abort()
			return
		}

		userID, err := strconv.ParseUint(claims.Subject, 10, 64)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, errs.ErrCredentialsError.Code, errs.ErrCredentialsError.Message)
			c.Abort()
			return
		}

		c.Set("user_id", uint(userID))

		c.Next()
	}
}
