package setting

import (
	"sync"

	"github.com/QuantumNous/new-api/common"
)

const MembershipPublicCacheKey = "membership:public:v1"

// MembershipContactPhone is shown on the public membership / benefits page
// for the enterprise card. Override via option key MembershipContactPhone.
var MembershipContactPhone = "17614637703"

var membershipContactMutex sync.RWMutex

func GetMembershipContactPhone() string {
	membershipContactMutex.RLock()
	defer membershipContactMutex.RUnlock()
	return MembershipContactPhone
}

func SetMembershipContactPhone(phone string) {
	membershipContactMutex.Lock()
	defer membershipContactMutex.Unlock()
	MembershipContactPhone = phone
}

// DefaultMembershipRateLimitGroup is UniAPI-aligned RPM for display groups:
// Free 5 / Tier1 300 / Tier3 2000 → default / vip / vip2.
// Value format: [maxTotalRequests, maxSuccessRequests] per rate-limit window.
var DefaultMembershipRateLimitGroup = map[string][2]int{
	"default": {0, 5},
	"vip":     {0, 300},
	"vip2":    {0, 2000},
}

// EnsureDefaultMembershipRateLimits merges UniAPI-aligned RPM into the
// in-memory group rate-limit map when a display tier key is missing.
// Returns whether the map (or duration) changed.
func EnsureDefaultMembershipRateLimits() bool {
	ModelRequestRateLimitMutex.Lock()
	defer ModelRequestRateLimitMutex.Unlock()

	changed := false
	if ModelRequestRateLimitGroup == nil {
		ModelRequestRateLimitGroup = make(map[string][2]int)
	}
	for group, limits := range DefaultMembershipRateLimitGroup {
		if _, ok := ModelRequestRateLimitGroup[group]; ok {
			continue
		}
		ModelRequestRateLimitGroup[group] = limits
		changed = true
	}
	if ModelRequestRateLimitDurationMinutes <= 0 {
		ModelRequestRateLimitDurationMinutes = 1
		changed = true
	}
	return changed
}

func InvalidateMembershipPublicCache() {
	if !common.RedisEnabled || common.RDB == nil {
		return
	}
	_ = common.RedisDel(MembershipPublicCacheKey)
}

// EnsureDefaultMembershipDisplayGroups adds missing default/vip/vip2 entries to
// UserUsableGroups so the public membership page has content.
// Returns the JSON string to persist when changed, or empty if unchanged.
func EnsureDefaultMembershipDisplayGroups() (jsonOut string, changed bool) {
	usable := GetUserUsableGroupsCopy()
	wantNames := map[string]string{
		"default": "默认",
		"vip":     "VIP（95折）",
		"vip2":    "VIP2（9折）",
	}
	for group, name := range wantNames {
		if _, ok := usable[group]; ok {
			continue
		}
		usable[group] = name
		changed = true
	}
	if !changed {
		return "", false
	}
	raw, err := common.Marshal(usable)
	if err != nil {
		return "", false
	}
	_ = UpdateUserUsableGroupsByJSONString(string(raw))
	return string(raw), true
}
