package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func HelloWorld(c *gin.Context) {
	resp := make(map[string]string)

	resp["message"] = "Hello World"

	c.JSON(http.StatusOK, resp)
}
