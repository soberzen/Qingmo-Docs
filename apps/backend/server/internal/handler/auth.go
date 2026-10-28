package handler

import (
	"errors"
	"net/http"
	"os"

	"doc-server/internal/auth"
	"doc-server/internal/database"
	"doc-server/internal/dto"
	"doc-server/internal/errs"
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
		response.Error(c, http.StatusBadRequest, errs.ErrInvalidRequest.Code, errs.FormatValidationMessage(err))
		return
	}

	accessToken, refreshToken, sessionId, err := provide.Login(
		c.Request.Context(),
		req,
		h.tokenManager,
		h.redis,
		h.db,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			response.Error(c, http.StatusUnauthorized, errs.ErrUserNotFound.Code, errs.ErrUserNotFound.Message)
		} else if errors.Is(err, errs.ErrPasswordWrong) {
			response.Error(c, http.StatusUnauthorized, errs.ErrPasswordWrong.Code, errs.ErrPasswordWrong.Message)
		} else {
			_ = c.Error(err)
			response.Error(c, http.StatusInternalServerError, errs.ErrInternal.Code, errs.ErrInternal.Message)
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

	c.SetCookie(
		"session_id",                             // name
		sessionId,                                // value
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
		response.Error(c, http.StatusBadRequest, errs.ErrInvalidRequest.Code, errs.FormatValidationMessage(err))
		return
	}

	user, err := provide.Register(c.Request.Context(), req, h.db)
	if err != nil {
		if errors.Is(err, errs.ErrEmailExists) {
			response.Error(c, http.StatusConflict, errs.ErrEmailExists.Code, errs.ErrEmailExists.Message)
		} else {
			_ = c.Error(err)
			response.Error(c, http.StatusInternalServerError, errs.ErrInternal.Code, errs.ErrInternal.Message)
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
func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, cookieErr := c.Cookie("refresh_token")

	secureCookie := os.Getenv("APP_ENV") != "development"
	for _, name := range []string{"refresh_token", "session_id"} {
		c.SetCookie(name, "", -1, "/", "", secureCookie, true)
	}

	if cookieErr != nil || refreshToken == "" {
		response.Success[any](c, nil)
		return
	}

	err := provide.Logout(
		c.Request.Context(),
		refreshToken,
		h.tokenManager,
		h.redis,
		h.db,
	)
	if err != nil {
		_ = c.Error(err)
		response.Error(
			c,
			http.StatusInternalServerError,
			errs.ErrInternal.Code,
			errs.ErrInternal.Message,
		)
		return
	}

	response.Success[any](c, nil)
}

func (h *AuthHandler) Profile(c *gin.Context) {
	userId := c.GetUint("user_id")
	user, err := provide.Profile(c.Request.Context(), userId, h.db)
	if err != nil {
		_ = c.Error(err)
		response.Error(c, http.StatusInternalServerError, errs.ErrInternal.Code, errs.ErrInternal.Message)
		return
	}
	response.Success(c, gin.H{
		"name":      user.Name,
		"email":     user.Email,
		"avatarUrl": user.AvatarUrl,
	})
}
