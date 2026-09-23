package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func StructuredLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		status := c.Writer.Status()
		level := slog.LevelInfo

		switch {
		case status >= 500:
			level = slog.LevelError
		case status >= 400:
			level = slog.LevelWarn
		}

		route := c.FullPath()
		if route == "" {
			route = c.Request.URL.Path
		}

		attrs := []slog.Attr{
			slog.String("request_id", c.GetString(RequestIDKey)),
			slog.String("method", c.Request.Method),
			slog.String("route", route),
			slog.Int("status", status),
			slog.String("client_ip", c.ClientIP()),
			slog.Int64("latency_ms", time.Since(start).Milliseconds()),
		}

		if len(c.Errors) > 0 {
			attrs = append(attrs, slog.Any("errors", c.Errors.Errors()))
		}

		logger.LogAttrs(
			c.Request.Context(),
			level,
			"http request completed",
			attrs...,
		)
	}
}
