package service

import (
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

func TestBuildMembershipPublicPayloadOrderAndRPM(t *testing.T) {
	prevEnabled := setting.ModelRequestRateLimitEnabled
	prevDuration := setting.ModelRequestRateLimitDurationMinutes
	prevGroupJSON := setting.ModelRequestRateLimitGroup2JSONString()
	prevUsable := setting.UserUsableGroups2JSONString()
	prevRatio := ratio_setting.GroupRatio2JSONString()
	prevPhone := setting.GetMembershipContactPhone()
	t.Cleanup(func() {
		setting.ModelRequestRateLimitEnabled = prevEnabled
		setting.ModelRequestRateLimitDurationMinutes = prevDuration
		_ = setting.UpdateModelRequestRateLimitGroupByJSONString(prevGroupJSON)
		_ = setting.UpdateUserUsableGroupsByJSONString(prevUsable)
		_ = ratio_setting.UpdateGroupRatioByJSONString(prevRatio)
		setting.SetMembershipContactPhone(prevPhone)
	})

	setting.ModelRequestRateLimitEnabled = true
	setting.ModelRequestRateLimitDurationMinutes = 1
	_ = setting.UpdateUserUsableGroupsByJSONString(`{"default":"默认","vip":"VIP（95折）","vip2":"VIP2（9折）"}`)
	_ = ratio_setting.UpdateGroupRatioByJSONString(
		`{"default":1,"vip":0.95,"vip2":0.9,"stable":0.99,"bridge":0.96}`,
	)
	_ = setting.UpdateModelRequestRateLimitGroupByJSONString(`{"default":[0,5],"vip":[0,300],"vip2":[0,2000]}`)
	setting.SetMembershipContactPhone("17614637703")

	payload := BuildMembershipPublicPayload()
	if len(payload.Tiers) != 3 {
		t.Fatalf("expected 3 tiers, got %d", len(payload.Tiers))
	}
	want := []struct {
		group string
		rpm   int
		ratio float64
	}{
		{"default", 5, 1},
		{"vip", 300, 0.95},
		{"vip2", 2000, 0.9},
	}
	for i, w := range want {
		got := payload.Tiers[i]
		if got.Group != w.group || got.RPM != w.rpm || got.Ratio != w.ratio {
			t.Fatalf("tier[%d]=%+v, want group=%s rpm=%d ratio=%v", i, got, w.group, w.rpm, w.ratio)
		}
	}
	if len(payload.Channels) != 3 {
		t.Fatalf("channels=%+v", payload.Channels)
	}
	wantCh := []struct {
		key   string
		ratio float64
	}{
		{"default", 1},
		{"stable", 0.99},
		{"bridge", 0.96},
	}
	for i, w := range wantCh {
		got := payload.Channels[i]
		if got.Key != w.key || got.Ratio != w.ratio {
			t.Fatalf("channel[%d]=%+v, want key=%s ratio=%v", i, got, w.key, w.ratio)
		}
	}
	if payload.Enterprise.ContactPhone != "17614637703" {
		t.Fatalf("enterprise phone=%q", payload.Enterprise.ContactPhone)
	}
}

func TestEnsureDefaultMembershipRateLimits(t *testing.T) {
	prev := setting.ModelRequestRateLimitGroup2JSONString()
	t.Cleanup(func() {
		_ = setting.UpdateModelRequestRateLimitGroupByJSONString(prev)
	})
	_ = setting.UpdateModelRequestRateLimitGroupByJSONString(`{}`)
	if !EnsureDefaultMembershipRateLimits() {
		t.Fatal("expected change when empty")
	}
	total, success, ok := setting.GetGroupRateLimit("vip")
	if !ok || total != 0 || success != 300 {
		t.Fatalf("vip limits = %d,%d ok=%v", total, success, ok)
	}
	if EnsureDefaultMembershipRateLimits() {
		t.Fatal("second ensure should be no-op")
	}
}
