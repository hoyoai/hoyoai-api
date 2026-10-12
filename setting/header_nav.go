package setting

import (
	"fmt"
	"regexp"
	"slices"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

const (
	HeaderNavKindBuiltin = "builtin"
	HeaderNavKindCustom  = "custom"
)

var headerNavBuiltinKeys = []string{
	"home",
	"console",
	"pricing",
	"rankings",
	"docs",
	"about",
}

var headerNavAuthKeys = []string{"pricing", "rankings"}

var headerNavCustomIDPattern = regexp.MustCompile(`^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$`)

// HeaderNavItem is one top-nav entry. Order in HeaderNavConfig.Items is
// left-to-right display order.
type HeaderNavItem struct {
	Kind        string `json:"kind"`
	Key         string `json:"key,omitempty"`
	Id          string `json:"id,omitempty"`
	Title       string `json:"title,omitempty"`
	Content     string `json:"content,omitempty"`
	Enabled     bool   `json:"enabled"`
	RequireAuth bool   `json:"require_auth,omitempty"`
}

// HeaderNavConfig is the option-key HeaderNavConfig JSON schema.
type HeaderNavConfig struct {
	Items []HeaderNavItem `json:"items"`
}

var (
	headerNavConfigMutex sync.RWMutex
	headerNavConfig      = defaultHeaderNavConfig()
)

func defaultHeaderNavConfig() HeaderNavConfig {
	return HeaderNavConfig{
		Items: []HeaderNavItem{
			{Kind: HeaderNavKindBuiltin, Key: "home", Enabled: true},
			{Kind: HeaderNavKindBuiltin, Key: "console", Enabled: true},
			{Kind: HeaderNavKindBuiltin, Key: "pricing", Enabled: true, RequireAuth: false},
			{Kind: HeaderNavKindBuiltin, Key: "rankings", Enabled: true, RequireAuth: false},
			{Kind: HeaderNavKindBuiltin, Key: "docs", Enabled: true},
			{Kind: HeaderNavKindBuiltin, Key: "about", Enabled: true},
		},
	}
}

func IsValidHeaderNavCustomID(id string) bool {
	return headerNavCustomIDPattern.MatchString(id)
}

func GetHeaderNavConfigCopy() HeaderNavConfig {
	headerNavConfigMutex.RLock()
	defer headerNavConfigMutex.RUnlock()
	return cloneHeaderNavConfig(headerNavConfig)
}

func HeaderNavConfig2JSONString() string {
	headerNavConfigMutex.RLock()
	defer headerNavConfigMutex.RUnlock()
	raw, err := common.Marshal(headerNavConfig)
	if err != nil {
		common.SysLog("error marshalling HeaderNavConfig: " + err.Error())
		return `{"items":[]}`
	}
	return string(raw)
}

func UpdateHeaderNavConfigByJSONString(jsonStr string) error {
	cfg, err := parseHeaderNavConfig(jsonStr)
	if err != nil {
		return err
	}
	headerNavConfigMutex.Lock()
	headerNavConfig = cfg
	headerNavConfigMutex.Unlock()
	return nil
}

// GetCustomPage returns content for an enabled custom nav page by id.
func GetCustomPage(id string) (content string, ok bool) {
	id = strings.TrimSpace(id)
	if id == "" {
		return "", false
	}
	headerNavConfigMutex.RLock()
	defer headerNavConfigMutex.RUnlock()
	for _, item := range headerNavConfig.Items {
		if item.Kind != HeaderNavKindCustom {
			continue
		}
		if item.Id != id || !item.Enabled {
			continue
		}
		return item.Content, true
	}
	return "", false
}

// DeriveHeaderNavModulesJSON builds the legacy HeaderNavModules JSON from the
// current HeaderNavConfig (builtin items only). Safe to call while holding
// OptionMapRWMutex.
func DeriveHeaderNavModulesJSON() string {
	headerNavConfigMutex.RLock()
	defer headerNavConfigMutex.RUnlock()
	return deriveHeaderNavModulesJSON(headerNavConfig)
}

// SyncHeaderNavModulesFromConfig writes derived HeaderNavModules into OptionMap.
// Do not call while holding OptionMapRWMutex.
func SyncHeaderNavModulesFromConfig() {
	derived := DeriveHeaderNavModulesJSON()
	common.OptionMapRWMutex.Lock()
	defer common.OptionMapRWMutex.Unlock()
	if common.OptionMap == nil {
		common.OptionMap = make(map[string]string)
	}
	common.OptionMap["HeaderNavModules"] = derived
}

func parseHeaderNavConfig(jsonStr string) (HeaderNavConfig, error) {
	jsonStr = strings.TrimSpace(jsonStr)
	if jsonStr == "" {
		return HeaderNavConfig{}, fmt.Errorf("HeaderNavConfig must not be empty")
	}
	var cfg HeaderNavConfig
	if err := common.UnmarshalJsonStr(jsonStr, &cfg); err != nil {
		return HeaderNavConfig{}, fmt.Errorf("invalid HeaderNavConfig JSON: %w", err)
	}
	if err := validateHeaderNavConfig(cfg); err != nil {
		return HeaderNavConfig{}, err
	}
	return cfg, nil
}

func validateHeaderNavConfig(cfg HeaderNavConfig) error {
	if cfg.Items == nil {
		return fmt.Errorf("HeaderNavConfig.items must be an array")
	}
	seenBuiltin := make(map[string]struct{})
	seenCustom := make(map[string]struct{})
	for i, item := range cfg.Items {
		switch item.Kind {
		case HeaderNavKindBuiltin:
			if !slices.Contains(headerNavBuiltinKeys, item.Key) {
				return fmt.Errorf("HeaderNavConfig.items[%d]: invalid builtin key %q", i, item.Key)
			}
			if _, exists := seenBuiltin[item.Key]; exists {
				return fmt.Errorf("HeaderNavConfig.items[%d]: duplicate builtin key %q", i, item.Key)
			}
			seenBuiltin[item.Key] = struct{}{}
			if item.RequireAuth && !slices.Contains(headerNavAuthKeys, item.Key) {
				return fmt.Errorf("HeaderNavConfig.items[%d]: require_auth is only allowed for pricing/rankings", i)
			}
		case HeaderNavKindCustom:
			if !IsValidHeaderNavCustomID(item.Id) {
				return fmt.Errorf("HeaderNavConfig.items[%d]: invalid custom id %q", i, item.Id)
			}
			if strings.TrimSpace(item.Title) == "" {
				return fmt.Errorf("HeaderNavConfig.items[%d]: custom title is required", i)
			}
			if _, exists := seenCustom[item.Id]; exists {
				return fmt.Errorf("HeaderNavConfig.items[%d]: duplicate custom id %q", i, item.Id)
			}
			seenCustom[item.Id] = struct{}{}
		default:
			return fmt.Errorf("HeaderNavConfig.items[%d]: invalid kind %q", i, item.Kind)
		}
	}
	return nil
}

func deriveHeaderNavModulesJSON(cfg HeaderNavConfig) string {
	modules := map[string]any{
		"home":    true,
		"console": true,
		"pricing": map[string]any{"enabled": true, "requireAuth": false},
		"rankings": map[string]any{
			"enabled":     true,
			"requireAuth": false,
		},
		"docs":  true,
		"about": true,
	}
	for _, item := range cfg.Items {
		if item.Kind != HeaderNavKindBuiltin {
			continue
		}
		switch item.Key {
		case "pricing", "rankings":
			modules[item.Key] = map[string]any{
				"enabled":     item.Enabled,
				"requireAuth": item.RequireAuth,
			}
		default:
			modules[item.Key] = item.Enabled
		}
	}
	raw, err := common.Marshal(modules)
	if err != nil {
		common.SysLog("error marshalling derived HeaderNavModules: " + err.Error())
		return "{}"
	}
	return string(raw)
}

func cloneHeaderNavConfig(cfg HeaderNavConfig) HeaderNavConfig {
	out := HeaderNavConfig{
		Items: make([]HeaderNavItem, len(cfg.Items)),
	}
	copy(out.Items, cfg.Items)
	return out
}
