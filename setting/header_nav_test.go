package setting

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetHeaderNavConfigForTest(t *testing.T) {
	t.Helper()
	headerNavConfigMutex.Lock()
	headerNavConfig = defaultHeaderNavConfig()
	headerNavConfigMutex.Unlock()
	t.Cleanup(func() {
		headerNavConfigMutex.Lock()
		headerNavConfig = defaultHeaderNavConfig()
		headerNavConfigMutex.Unlock()
	})
}

func TestDefaultHeaderNavConfigOrder(t *testing.T) {
	resetHeaderNavConfigForTest(t)
	cfg := GetHeaderNavConfigCopy()
	require.Len(t, cfg.Items, 6)
	keys := make([]string, 0, len(cfg.Items))
	for _, item := range cfg.Items {
		require.Equal(t, HeaderNavKindBuiltin, item.Kind)
		keys = append(keys, item.Key)
		assert.True(t, item.Enabled)
	}
	assert.Equal(t, []string{"home", "console", "pricing", "rankings", "docs", "about"}, keys)
}

func TestUpdateHeaderNavConfigPreservesOrderAndCustomPages(t *testing.T) {
	resetHeaderNavConfigForTest(t)
	raw := `{
		"items": [
			{"kind":"builtin","key":"home","enabled":true},
			{"kind":"custom","id":"benefits","title":"用户权益","content":"https://example.com/benefits.html","enabled":true,"require_auth":false},
			{"kind":"builtin","key":"console","enabled":false},
			{"kind":"builtin","key":"pricing","enabled":true,"require_auth":true},
			{"kind":"builtin","key":"rankings","enabled":false,"require_auth":false},
			{"kind":"builtin","key":"docs","enabled":true},
			{"kind":"builtin","key":"about","enabled":true}
		]
	}`
	require.NoError(t, UpdateHeaderNavConfigByJSONString(raw))

	cfg := GetHeaderNavConfigCopy()
	require.Len(t, cfg.Items, 7)
	assert.Equal(t, HeaderNavKindCustom, cfg.Items[1].Kind)
	assert.Equal(t, "benefits", cfg.Items[1].Id)
	assert.Equal(t, "用户权益", cfg.Items[1].Title)
	assert.Equal(t, "https://example.com/benefits.html", cfg.Items[1].Content)
	assert.False(t, cfg.Items[2].Enabled)
	assert.True(t, cfg.Items[3].RequireAuth)

	content, ok := GetCustomPage("benefits")
	require.True(t, ok)
	assert.Equal(t, "https://example.com/benefits.html", content)

	_, ok = GetCustomPage("missing")
	assert.False(t, ok)
}

func TestGetCustomPageSkipsDisabled(t *testing.T) {
	resetHeaderNavConfigForTest(t)
	raw := `{"items":[{"kind":"custom","id":"promo","title":"Promo","content":"# Hello","enabled":false}]}`
	require.NoError(t, UpdateHeaderNavConfigByJSONString(raw))
	_, ok := GetCustomPage("promo")
	assert.False(t, ok)
}

func TestUpdateHeaderNavConfigRejectsInvalidCustomID(t *testing.T) {
	resetHeaderNavConfigForTest(t)
	before := HeaderNavConfig2JSONString()
	for _, id := range []string{"", "bad id", "Bad_ID", "-leading", "trailing-", "a--b"} {
		raw := `{"items":[{"kind":"custom","id":"` + id + `","title":"X","content":"y","enabled":true}]}`
		err := UpdateHeaderNavConfigByJSONString(raw)
		assert.Error(t, err, "id=%q", id)
		assert.Equal(t, before, HeaderNavConfig2JSONString())
	}
	assert.False(t, IsValidHeaderNavCustomID("bad_id"))
	assert.True(t, IsValidHeaderNavCustomID("benefits"))
	assert.True(t, IsValidHeaderNavCustomID("page-1"))
}

func TestUpdateHeaderNavConfigRejectsInvalidBuiltinAndDuplicates(t *testing.T) {
	resetHeaderNavConfigForTest(t)
	before := HeaderNavConfig2JSONString()

	err := UpdateHeaderNavConfigByJSONString(`{"items":[{"kind":"builtin","key":"unknown","enabled":true}]}`)
	assert.Error(t, err)
	assert.Equal(t, before, HeaderNavConfig2JSONString())

	err = UpdateHeaderNavConfigByJSONString(`{"items":[
		{"kind":"builtin","key":"home","enabled":true},
		{"kind":"builtin","key":"home","enabled":false}
	]}`)
	assert.Error(t, err)

	err = UpdateHeaderNavConfigByJSONString(`{"items":[
		{"kind":"custom","id":"a","title":"A","content":"1","enabled":true},
		{"kind":"custom","id":"a","title":"B","content":"2","enabled":true}
	]}`)
	assert.Error(t, err)

	err = UpdateHeaderNavConfigByJSONString(`{"items":[{"kind":"builtin","key":"home","enabled":true,"require_auth":true}]}`)
	assert.Error(t, err)
}

func TestDeriveHeaderNavModulesJSONFromConfig(t *testing.T) {
	resetHeaderNavConfigForTest(t)
	raw := `{
		"items": [
			{"kind":"builtin","key":"home","enabled":false},
			{"kind":"custom","id":"benefits","title":"权益","content":"md","enabled":true},
			{"kind":"builtin","key":"pricing","enabled":true,"require_auth":true},
			{"kind":"builtin","key":"rankings","enabled":false,"require_auth":false}
		]
	}`
	require.NoError(t, UpdateHeaderNavConfigByJSONString(raw))
	derived := DeriveHeaderNavModulesJSON()
	var modules map[string]any
	require.NoError(t, common.UnmarshalJsonStr(derived, &modules))
	assert.Equal(t, false, modules["home"])
	pricing, ok := modules["pricing"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, true, pricing["enabled"])
	assert.Equal(t, true, pricing["requireAuth"])
	rankings, ok := modules["rankings"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, false, rankings["enabled"])
}
