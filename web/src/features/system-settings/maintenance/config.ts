/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type HeaderNavAccessConfig = {
  enabled: boolean
  requireAuth: boolean
}

export type HeaderNavModulesConfig = {
  home: boolean
  console: boolean
  pricing: HeaderNavAccessConfig
  rankings: HeaderNavAccessConfig
  docs: boolean
  about: boolean
  [key: string]: boolean | HeaderNavAccessConfig
}

export type SidebarSectionConfig = {
  enabled: boolean
  [key: string]: boolean
}

export type SidebarModulesAdminConfig = Record<string, SidebarSectionConfig>

export const HEADER_NAV_DEFAULT: HeaderNavModulesConfig = {
  home: true,
  console: true,
  pricing: {
    enabled: true,
    requireAuth: false,
  },
  rankings: {
    enabled: true,
    requireAuth: false,
  },
  docs: true,
  about: true,
}

export const SIDEBAR_MODULES_DEFAULT: SidebarModulesAdminConfig = {
  chat: {
    enabled: true,
    playground: true,
    chat: true,
  },
  console: {
    enabled: true,
    detail: true,
    token: true,
    log: true,
    audit: true,
    midjourney: true,
    task: true,
  },
  personal: {
    enabled: true,
    topup: true,
    personal: true,
    security: true,
  },
  admin: {
    enabled: true,
    channel: true,
    models: true,
    redemption: true,
    user: true,
    setting: true,
    subscription: true,
  },
}

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return fallback
}

const cloneHeaderNavDefault = (): HeaderNavModulesConfig => ({
  ...HEADER_NAV_DEFAULT,
  pricing: { ...HEADER_NAV_DEFAULT.pricing },
  rankings: { ...HEADER_NAV_DEFAULT.rankings },
})

const parseAccessModule = (
  raw: unknown,
  fallback: HeaderNavAccessConfig
): HeaderNavAccessConfig => {
  if (
    typeof raw === 'boolean' ||
    typeof raw === 'string' ||
    typeof raw === 'number'
  ) {
    return {
      enabled: toBoolean(raw, fallback.enabled),
      requireAuth: fallback.requireAuth,
    }
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    return {
      enabled: toBoolean(record.enabled, fallback.enabled),
      requireAuth: toBoolean(record.requireAuth, fallback.requireAuth),
    }
  }
  return { ...fallback }
}

const cloneSidebarDefault = (): SidebarModulesAdminConfig =>
  Object.entries(SIDEBAR_MODULES_DEFAULT).reduce<SidebarModulesAdminConfig>(
    (acc, [section, config]) => {
      acc[section] = { ...config }
      return acc
    },
    {}
  )

export function parseHeaderNavModules(
  value: string | null | undefined
): HeaderNavModulesConfig {
  const base = cloneHeaderNavDefault()
  if (!value) {
    return base
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const result: HeaderNavModulesConfig = {
      ...base,
      pricing: { ...base.pricing },
      rankings: { ...base.rankings },
    }

    Object.entries(parsed).forEach(([key, raw]) => {
      if (key === 'pricing') {
        result.pricing = parseAccessModule(raw, base.pricing)
        return
      }
      if (key === 'rankings') {
        result.rankings = parseAccessModule(raw, base.rankings)
        return
      }

      if (typeof raw === 'boolean') {
        result[key] = raw
        return
      }
      if (typeof raw === 'string' || typeof raw === 'number') {
        result[key] = toBoolean(raw, Boolean(base[key]))
        return
      }
    })

    return result
  } catch {
    return base
  }
}

export function serializeHeaderNavModules(
  config: HeaderNavModulesConfig
): string {
  return JSON.stringify(config)
}

export type HeaderNavItemKind = 'builtin' | 'custom'

export type HeaderNavConfigItem = {
  kind: HeaderNavItemKind
  key?: string
  id?: string
  title?: string
  content?: string
  enabled: boolean
  require_auth?: boolean
}

export type HeaderNavOrderedConfig = {
  items: HeaderNavConfigItem[]
}

export const HEADER_NAV_CONFIG_DEFAULT: HeaderNavOrderedConfig = {
  items: [
    { kind: 'builtin', key: 'home', enabled: true },
    { kind: 'builtin', key: 'console', enabled: true },
    {
      kind: 'builtin',
      key: 'pricing',
      enabled: true,
      require_auth: false,
    },
    {
      kind: 'builtin',
      key: 'rankings',
      enabled: true,
      require_auth: false,
    },
    { kind: 'builtin', key: 'docs', enabled: true },
    { kind: 'builtin', key: 'about', enabled: true },
  ],
}

const HEADER_NAV_CUSTOM_ID_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/

export function isValidHeaderNavCustomId(id: string): boolean {
  return HEADER_NAV_CUSTOM_ID_PATTERN.test(id)
}

export function cloneHeaderNavConfig(
  config: HeaderNavOrderedConfig
): HeaderNavOrderedConfig {
  return {
    items: config.items.map((item) => ({ ...item })),
  }
}

export function headerNavModulesToConfig(
  modules: HeaderNavModulesConfig
): HeaderNavOrderedConfig {
  return {
    items: [
      {
        kind: 'builtin',
        key: 'home',
        enabled: Boolean(modules.home),
      },
      {
        kind: 'builtin',
        key: 'console',
        enabled: Boolean(modules.console),
      },
      {
        kind: 'builtin',
        key: 'pricing',
        enabled: Boolean(modules.pricing?.enabled),
        require_auth: Boolean(modules.pricing?.requireAuth),
      },
      {
        kind: 'builtin',
        key: 'rankings',
        enabled: Boolean(modules.rankings?.enabled),
        require_auth: Boolean(modules.rankings?.requireAuth),
      },
      {
        kind: 'builtin',
        key: 'docs',
        enabled: Boolean(modules.docs),
      },
      {
        kind: 'builtin',
        key: 'about',
        enabled: Boolean(modules.about),
      },
    ],
  }
}

export function parseHeaderNavConfigOption(
  value: string | null | undefined,
  fallbackModules?: HeaderNavModulesConfig
): HeaderNavOrderedConfig {
  if (value && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value) as { items?: unknown }
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const items: HeaderNavConfigItem[] = []
        for (const entry of parsed.items) {
          if (!entry || typeof entry !== 'object') continue
          const record = entry as Record<string, unknown>
          if (record.kind === 'builtin') {
            const key = typeof record.key === 'string' ? record.key : ''
            if (!key) continue
            const item: HeaderNavConfigItem = {
              kind: 'builtin',
              key,
              enabled: toBoolean(record.enabled, true),
            }
            if (key === 'pricing' || key === 'rankings') {
              item.require_auth = toBoolean(record.require_auth, false)
            }
            items.push(item)
            continue
          }
          if (record.kind === 'custom') {
            const id = typeof record.id === 'string' ? record.id.trim() : ''
            const title = typeof record.title === 'string' ? record.title : ''
            if (!id || !title) continue
            items.push({
              kind: 'custom',
              id,
              title,
              content:
                typeof record.content === 'string' ? record.content : '',
              enabled: toBoolean(record.enabled, true),
              require_auth: toBoolean(record.require_auth, false),
            })
          }
        }
        if (items.length > 0) {
          return { items }
        }
      }
    } catch {
      // fall through
    }
  }

  if (fallbackModules) {
    return headerNavModulesToConfig(fallbackModules)
  }
  return cloneHeaderNavConfig(HEADER_NAV_CONFIG_DEFAULT)
}

export function serializeHeaderNavConfig(
  config: HeaderNavOrderedConfig
): string {
  return JSON.stringify({
    items: config.items.map((item) => {
      if (item.kind === 'builtin') {
        const out: HeaderNavConfigItem = {
          kind: 'builtin',
          key: item.key,
          enabled: item.enabled,
        }
        if (item.key === 'pricing' || item.key === 'rankings') {
          out.require_auth = Boolean(item.require_auth)
        }
        return out
      }
      return {
        kind: 'custom',
        id: item.id,
        title: item.title,
        content: item.content ?? '',
        enabled: item.enabled,
        require_auth: Boolean(item.require_auth),
      }
    }),
  })
}

export function slugifyHeaderNavCustomId(
  title: string,
  existingIds: Set<string>
): string {
  const base = title
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

  let candidate =
    base && isValidHeaderNavCustomId(base)
      ? base
      : `page-${Math.random().toString(36).slice(2, 8)}`

  if (!isValidHeaderNavCustomId(candidate)) {
    candidate = `page-${Math.random().toString(36).slice(2, 8)}`
  }

  if (!existingIds.has(candidate)) return candidate

  let suffix = 2
  while (existingIds.has(`${candidate}-${suffix}`)) {
    suffix += 1
  }
  return `${candidate}-${suffix}`
}

export function parseSidebarModulesAdmin(
  value: string | null | undefined
): SidebarModulesAdminConfig {
  const defaults = cloneSidebarDefault()
  // If empty string, null, or undefined, use default config
  if (!value || value.trim() === '') return defaults

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const result: SidebarModulesAdminConfig = {}

    Object.entries(parsed).forEach(([sectionKey, raw]) => {
      if (!raw || typeof raw !== 'object') return

      const defaultSection = defaults[sectionKey] ?? { enabled: true }
      const sectionConfig: SidebarSectionConfig = {
        enabled: toBoolean(
          (raw as Record<string, unknown>).enabled,
          defaultSection.enabled ?? true
        ),
      }

      Object.entries(raw as Record<string, unknown>).forEach(
        ([moduleKey, moduleValue]) => {
          if (moduleKey === 'enabled') return
          sectionConfig[moduleKey] = toBoolean(
            moduleValue,
            defaultSection[moduleKey] ?? true
          )
        }
      )

      result[sectionKey] = sectionConfig
    })

    // Merge defaults to ensure expected sections exist
    Object.entries(defaults).forEach(([sectionKey, config]) => {
      if (!result[sectionKey]) {
        result[sectionKey] = { ...config }
        return
      }

      Object.entries(config).forEach(([moduleKey, moduleValue]) => {
        if (!(moduleKey in result[sectionKey])) {
          result[sectionKey][moduleKey] = moduleValue
        }
      })
    })

    return result
  } catch {
    return defaults
  }
}

export function serializeSidebarModulesAdmin(
  config: SidebarModulesAdminConfig
): string {
  return JSON.stringify(config)
}
