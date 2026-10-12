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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import {
  type HeaderNavBuiltinKey,
  type HeaderNavConfig,
  type HeaderNavItem,
  parseHeaderNavConfigFromStatus,
  parseHeaderNavModulesFromStatus,
} from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

export type TopNavLink = {
  title: string
  href: string
  disabled?: boolean
  requiresAuth?: boolean
  external?: boolean
}

function builtinTitle(
  key: HeaderNavBuiltinKey,
  t: (key: string) => string
): string {
  switch (key) {
    case 'home':
      return t('Home')
    case 'console':
      return t('Console')
    case 'pricing':
      return t('Model Square')
    case 'rankings':
      return t('Rankings')
    case 'docs':
      return t('Docs')
    case 'about':
      return t('About')
  }
}

function builtinHref(
  key: HeaderNavBuiltinKey,
  docsLink: string | undefined
): { href: string; external?: boolean } | null {
  switch (key) {
    case 'home':
      return { href: '/' }
    case 'console':
      return { href: '/dashboard' }
    case 'pricing':
      return { href: '/pricing' }
    case 'rankings':
      return { href: '/rankings' }
    case 'docs':
      if (docsLink) return { href: docsLink, external: true }
      return { href: '/docs' }
    case 'about':
      return { href: '/about' }
  }
}

function linkFromConfigItem(
  item: HeaderNavItem,
  docsLink: string | undefined,
  isAuthed: boolean,
  t: (key: string) => string
): TopNavLink | null {
  if (!item.enabled) return null

  if (item.kind === 'builtin') {
    const key = item.key as HeaderNavBuiltinKey | undefined
    if (!key) return null
    const target = builtinHref(key, docsLink)
    if (!target) return null
    const requiresAuth = Boolean(item.require_auth) && !isAuthed
    return {
      title: builtinTitle(key, t),
      href: target.href,
      external: target.external,
      requiresAuth,
    }
  }

  if (item.kind === 'custom') {
    const id = item.id?.trim()
    if (!id) return null
    return {
      title: item.title?.trim() || id,
      href: `/p/${id}`,
      requiresAuth: Boolean(item.require_auth) && !isAuthed,
    }
  }

  return null
}

function linksFromHeaderNavConfig(
  config: HeaderNavConfig,
  docsLink: string | undefined,
  isAuthed: boolean,
  t: (key: string) => string
): TopNavLink[] {
  const links: TopNavLink[] = []
  for (const item of config.items) {
    const link = linkFromConfigItem(item, docsLink, isAuthed, t)
    if (link) links.push(link)
  }
  return links
}

/**
 * Generate top navigation links based on HeaderNavConfig (preferred) or
 * legacy HeaderNavModules from backend /api/status.
 */
export function useTopNavLinks(): TopNavLink[] {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { auth } = useAuthStore()

  const headerNavConfig = useMemo(() => {
    return parseHeaderNavConfigFromStatus(
      status as Record<string, unknown> | null
    )
  }, [status])

  const modules = useMemo(() => {
    return parseHeaderNavModulesFromStatus(
      status as Record<string, unknown> | null
    )
  }, [status])

  const docsLink: string | undefined = status?.docs_link as string | undefined
  const isAuthed = !!auth?.user

  return useMemo(() => {
    if (headerNavConfig) {
      return linksFromHeaderNavConfig(headerNavConfig, docsLink, isAuthed, t)
    }

    const links: TopNavLink[] = []

    if (modules?.home !== false) {
      links.push({ title: t('Home'), href: '/' })
    }

    if (modules?.console !== false) {
      links.push({ title: t('Console'), href: '/dashboard' })
    }

    const pricing = modules?.pricing
    if (pricing && typeof pricing === 'object' && pricing.enabled) {
      const requiresAuth = pricing.requireAuth && !isAuthed
      links.push({ title: t('Model Square'), href: '/pricing', requiresAuth })
    }

    const rankings = modules?.rankings
    if (rankings && typeof rankings === 'object' && rankings.enabled) {
      const requiresAuth = rankings.requireAuth && !isAuthed
      links.push({ title: t('Rankings'), href: '/rankings', requiresAuth })
    }

    if (modules?.docs !== false) {
      if (docsLink) {
        links.push({ title: t('Docs'), href: docsLink, external: true })
      } else {
        links.push({ title: t('Docs'), href: '/docs' })
      }
    }

    if (modules?.about !== false) {
      links.push({ title: t('About'), href: '/about' })
    }

    return links
  }, [docsLink, headerNavConfig, isAuthed, modules, t])
}
