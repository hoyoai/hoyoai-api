package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

// GetMembership returns public membership tier info (usable groups, ratios, RPM)
// for the benefits / homepage UI. Responses are cached in Redis when enabled.
func GetMembership(c *gin.Context) {
	payload, fromCache, err := service.GetMembershipPublicCached()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "",
		"data":       payload,
		"from_cache": fromCache,
	})
}
