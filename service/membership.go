package service

import (
	"encoding/json"
	"errors"
	"sort"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/go-redis/redis/v8"
)

const membershipPublicCacheKey = setting.MembershipPublicCacheKey

// membershipTierPreferredOrder prefers known user tiers, then other usable groups.
var membershipTierPreferredOrder = []string{"default", "vip", "vip2"}

// membershipChannelPreferredOrder is UniAPI-style channel lanes (not user VIP tiers).
var membershipChannelPreferredOrder = []string{"default", "stable", "bridge"}

// membershipChannelFallbackRatio used when GroupRatio lacks a known channel key.
var membershipChannelFallbackRatio = map[string]float64{
	"default": 1,
	"stable":  0.99,
	"bridge":  0.96,
}

type MembershipPublicPayload struct {
	RateLimitEnabled bool                 `json:"rate_limit_enabled"`
	DurationMinutes  int                  `json:"duration_minutes"`
	Tiers            []MembershipTier     `json:"tiers"`
	Channels         []MembershipChannel  `json:"channels"`
	Vendors          []MembershipVendor   `json:"vendors"`
	Models           []MembershipModel    `json:"models"`
	Enterprise       MembershipEnterprise `json:"enterprise"`
}

type MembershipTier struct {
	Group        string  `json:"group"`
	Name         string  `json:"name"`
	Ratio        float64 `json:"ratio"`
	RPM          int     `json:"rpm"`
	TotalLimit   int     `json:"total_limit"`
	SuccessLimit int     `json:"success_limit"`
}

type MembershipChannel struct {
	Key   string  `json:"key"`
	Name  string  `json:"name"`
	Ratio float64 `json:"ratio"`
}

type MembershipVendor struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}

type MembershipModel struct {
	ModelName       string  `json:"model_name"`
	VendorID        int     `json:"vendor_id,omitempty"`
	QuotaType       int     `json:"quota_type"`
	ModelRatio      float64 `json:"model_ratio"`
	ModelPrice      float64 `json:"model_price"`
	CompletionRatio float64 `json:"completion_ratio"`
}

type MembershipEnterprise struct {
	Name         string `json:"name"`
	ContactPhone string `json:"contact_phone"`
}

func InvalidateMembershipPublicCache() {
	setting.InvalidateMembershipPublicCache()
}

func GetMembershipPublicCached() (*MembershipPublicPayload, bool, error) {
	if common.RedisEnabled && common.RDB != nil {
		cached, err := common.RedisGet(membershipPublicCacheKey)
		if err == nil && cached != "" {
			var payload MembershipPublicPayload
			if uerr := json.Unmarshal([]byte(cached), &payload); uerr == nil {
				return &payload, true, nil
			}
		} else if err != nil && !errors.Is(err, redis.Nil) {
			common.SysLog("membership redis get: " + err.Error())
		}
	}

	payload := BuildMembershipPublicPayload()
	if common.RedisEnabled && common.RDB != nil {
		raw, err := json.Marshal(payload)
		if err == nil {
			ttl := time.Duration(common.RedisKeyCacheSeconds()) * time.Second
			if ttl <= 0 {
				ttl = 60 * time.Second
			}
			if serr := common.RedisSet(membershipPublicCacheKey, string(raw), ttl); serr != nil {
				common.SysLog("membership redis set: " + serr.Error())
			}
		}
	}
	return payload, false, nil
}

func BuildMembershipPublicPayload() *MembershipPublicPayload {
	usable := setting.GetUserUsableGroupsCopy()
	ratios := ratio_setting.GetGroupRatioCopy()
	duration := setting.ModelRequestRateLimitDurationMinutes
	if duration <= 0 {
		duration = 1
	}

	userTierSet := make(map[string]struct{}, len(membershipTierPreferredOrder))
	for _, group := range membershipTierPreferredOrder {
		userTierSet[group] = struct{}{}
	}

	keys := make([]string, 0, len(usable))
	for group := range usable {
		// User-facing membership cards: only default/vip/vip2 (not channel lanes).
		if _, ok := userTierSet[group]; !ok {
			continue
		}
		keys = append(keys, group)
	}
	sort.SliceStable(keys, func(i, j int) bool {
		return membershipTierRank(keys[i]) < membershipTierRank(keys[j])
	})

	tiers := make([]MembershipTier, 0, len(keys))
	for _, group := range keys {
		ratio := 1.0
		if r, ok := ratios[group]; ok {
			ratio = r
		}
		totalLimit, successLimit, found := setting.GetGroupRateLimit(group)
		if !found {
			totalLimit = setting.ModelRequestRateLimitCount
			successLimit = setting.ModelRequestRateLimitSuccessCount
		}
		rpm := successLimit
		if duration > 1 {
			rpm = successLimit / duration
		}
		tiers = append(tiers, MembershipTier{
			Group:        group,
			Name:         usable[group],
			Ratio:        ratio,
			RPM:          rpm,
			TotalLimit:   totalLimit,
			SuccessLimit: successLimit,
		})
	}

	// Channel lanes always expose Default / Stable / Bridge for discount UI.
	channels := make([]MembershipChannel, 0, len(membershipChannelPreferredOrder))
	for _, key := range membershipChannelPreferredOrder {
		ratio, ok := ratios[key]
		if !ok {
			ratio, ok = membershipChannelFallbackRatio[key]
			if !ok {
				continue
			}
		}
		channels = append(channels, MembershipChannel{
			Key:   key,
			Name:  membershipChannelDisplayName(key),
			Ratio: ratio,
		})
	}

	vendors := make([]MembershipVendor, 0)
	models := make([]MembershipModel, 0)
	for _, v := range model.GetVendors() {
		vendors = append(vendors, MembershipVendor{
			ID:   v.ID,
			Name: v.Name,
			Icon: v.Icon,
		})
	}
	for _, p := range model.GetPricing() {
		models = append(models, MembershipModel{
			ModelName:       p.ModelName,
			VendorID:        p.VendorID,
			QuotaType:       p.QuotaType,
			ModelRatio:      p.ModelRatio,
			ModelPrice:      p.ModelPrice,
			CompletionRatio: p.CompletionRatio,
		})
	}
	sort.SliceStable(models, func(i, j int) bool {
		if models[i].VendorID != models[j].VendorID {
			return models[i].VendorID < models[j].VendorID
		}
		return models[i].ModelName < models[j].ModelName
	})

	return &MembershipPublicPayload{
		RateLimitEnabled: setting.ModelRequestRateLimitEnabled,
		DurationMinutes:  duration,
		Tiers:            tiers,
		Channels:         channels,
		Vendors:          vendors,
		Models:           models,
		Enterprise: MembershipEnterprise{
			Name:         "企业客户",
			ContactPhone: setting.GetMembershipContactPhone(),
		},
	}
}

func membershipTierRank(group string) int {
	for i, name := range membershipTierPreferredOrder {
		if group == name {
			return i
		}
	}
	return len(membershipTierPreferredOrder) + 100
}

func membershipChannelDisplayName(key string) string {
	switch key {
	case "default":
		return "Default"
	case "stable":
		return "Stable"
	case "bridge":
		return "Bridge"
	default:
		return key
	}
}

// EnsureDefaultMembershipRateLimits merges UniAPI-aligned RPM into the in-memory
// group rate-limit map when a display tier key is missing. Returns whether the
// map changed (caller may persist).
func EnsureDefaultMembershipRateLimits() bool {
	return setting.EnsureDefaultMembershipRateLimits()
}
