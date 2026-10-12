package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

// GetCustomPage serves custom header-nav page content (URL / HTML / Markdown),
// matching GetHomePageContent's public JSON envelope.
func GetCustomPage(c *gin.Context) {
	id := c.Param("id")
	content, ok := setting.GetCustomPage(id)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "custom page not found",
		})
		return
	}
	serveRevalidatedJSON(c, content)
}
