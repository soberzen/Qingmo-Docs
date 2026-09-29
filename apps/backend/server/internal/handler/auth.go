package handler

import (
	"errors"
	"net/http"
	"os"

	"doc-server/internal/auth"
	"doc-server/internal/database"
	"doc-server/internal/dto"
	"doc-server/internal/provide"
	"doc-server/internal/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	db           database.Service
	redis        database.RedisService
	tokenManager *auth.TokenManager
}

func NewAuthHandler(db database.Service, redis database.RedisService, t *auth.TokenManager) *AuthHandler {
	return &AuthHandler{db: db, redis: redis, tokenManager: t}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.Login
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, 400, "invalid request body")
		return
	}

	accessToken, refreshToken, err := provide.Login(
		c.Request.Context(),
		req,
		h.tokenManager,
		h.redis,
		h.db,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		if errors.Is(err, provide.ErrInvalidCredentials) {
			response.Error(c, http.StatusUnauthorized, 401, "invalid email or password")
		} else {
			response.Error(c, http.StatusInternalServerError, 500, "login failed")
		}
		return
	}

	secureCookie := os.Getenv("APP_ENV") != "development"
	c.SetCookie(
		"refresh_token",                          // name
		refreshToken,                             // value
		int(h.tokenManager.RefreshTTL.Seconds()), // maxAge（秒），和 refresh TTL 保持一致
		"/",                                      // path
		"",                                       // domain，空表示当前域名
		secureCookie,                             // secure，生产环境建议 true（需 HTTPS）
		true,                                     // httpOnly，禁止 JS 读取，防 XSS
	)

	response.Success(c, gin.H{
		"accessToken": accessToken,
	})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.Register
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, 400, "invalid request body")
		return
	}

	user, err := provide.Register(c.Request.Context(), req, h.db)
	if err != nil {
		if errors.Is(err, provide.ErrEmailExists) {
			response.Error(c, http.StatusConflict, 409, "email already exists")
		} else {
			response.Error(c, http.StatusInternalServerError, 500, "register failed")
		}
		return
	}

	response.Success(c, gin.H{
		"id":        user.ID,
		"name":      user.Name,
		"email":     user.Email,
		"avatarUrl": user.AvatarUrl,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {}

func (h *AuthHandler) Logout(c *gin.Context) {}

func (h *AuthHandler) Profile(c *gin.Context) {}
