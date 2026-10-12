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
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  SettingsControlChildren,
  SettingsForm,
  SettingsSwitchContent,
  SettingsControlGroup,
  SettingsSwitchRow,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import {
  HEADER_NAV_CONFIG_DEFAULT,
  type HeaderNavConfigItem,
  type HeaderNavOrderedConfig,
  cloneHeaderNavConfig,
  isValidHeaderNavCustomId,
  serializeHeaderNavConfig,
  slugifyHeaderNavCustomId,
} from './config'

type HeaderNavigationSectionProps = {
  config: HeaderNavOrderedConfig
  initialSerialized: string
}

function builtinLabel(
  key: string | undefined,
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
    default:
      return key ?? t('Built-in')
  }
}

function builtinDescription(
  key: string | undefined,
  t: (key: string) => string
): string {
  switch (key) {
    case 'home':
      return t('Landing page with system overview.')
    case 'console':
      return t('User dashboard and quota controls.')
    case 'pricing':
      return t('Public model catalog and pricing page.')
    case 'rankings':
      return t('Public rankings page based on live usage data.')
    case 'docs':
      return t('Documentation or external knowledge base.')
    case 'about':
      return t('Static page describing the platform.')
    default:
      return ''
  }
}

export function HeaderNavigationSection({
  config,
  initialSerialized,
}: HeaderNavigationSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [items, setItems] = useState<HeaderNavConfigItem[]>(() =>
    cloneHeaderNavConfig(config).items
  )

  useEffect(() => {
    setItems(cloneHeaderNavConfig(config).items)
  }, [config])

  const serialized = useMemo(
    () => serializeHeaderNavConfig({ items }),
    [items]
  )

  const updateItem = (
    index: number,
    patch: Partial<HeaderNavConfigItem>
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      const tmp = next[index]
      next[index] = next[nextIndex]
      next[nextIndex] = tmp
      return next
    })
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addCustomPage = () => {
    setItems((prev) => {
      const existingIds = new Set(
        prev
          .filter((item) => item.kind === 'custom' && item.id)
          .map((item) => item.id as string)
      )
      const title = t('Custom page')
      const id = slugifyHeaderNavCustomId(title, existingIds)
      return [
        ...prev,
        {
          kind: 'custom',
          id,
          title,
          content: '',
          enabled: true,
          require_auth: false,
        },
      ]
    })
  }

  const saveNavigation = async () => {
    for (const item of items) {
      if (item.kind !== 'custom') continue
      const id = item.id?.trim() ?? ''
      const title = item.title?.trim() ?? ''
      if (!title) {
        toast.error(t('Custom page title is required'))
        return
      }
      if (!isValidHeaderNavCustomId(id)) {
        toast.error(t('Custom page id is invalid'))
        return
      }
    }

    const customIds = items
      .filter((item) => item.kind === 'custom')
      .map((item) => item.id)
    if (new Set(customIds).size !== customIds.length) {
      toast.error(t('Custom page ids must be unique'))
      return
    }

    if (serialized === initialSerialized) {
      return
    }

    await updateOption.mutateAsync({
      key: 'HeaderNavConfig',
      value: serialized,
    })
  }

  const resetToDefault = () => {
    setItems(cloneHeaderNavConfig(HEADER_NAV_CONFIG_DEFAULT).items)
  }

  return (
    <SettingsSection title={t('Header navigation')}>
      <SettingsForm
        onSubmit={(event) => {
          event.preventDefault()
          void saveNavigation()
        }}
      >
        <SettingsPageFormActions
          onSave={() => {
            void saveNavigation()
          }}
          onReset={resetToDefault}
          isSaving={updateOption.isPending}
          resetLabel='Reset to default'
          saveLabel='Save navigation'
        />

        <p className='text-muted-foreground text-sm'>
          {t(
            'Reorder built-in and custom pages. Custom pages are available at /p/{id}.'
          )}
        </p>

        <div className='flex flex-col gap-3'>
          {items.map((item, index) => {
            const rowKey =
              item.kind === 'builtin'
                ? `builtin-${item.key}-${index}`
                : `custom-${item.id}-${index}`
            const supportsAuth =
              item.kind === 'custom' ||
              item.key === 'pricing' ||
              item.key === 'rankings'

            return (
              <SettingsControlGroup key={rowKey}>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-sm font-medium'>
                      {item.kind === 'builtin'
                        ? builtinLabel(item.key, t)
                        : (item.title?.trim() || t('Custom page'))}
                    </div>
                    <p className='text-muted-foreground text-xs'>
                      {item.kind === 'builtin'
                        ? builtinDescription(item.key, t)
                        : t('Path: /p/{{id}}', { id: item.id })}
                    </p>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label={t('Move up')}
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      <ArrowUp className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label={t('Move down')}
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      <ArrowDown className='h-4 w-4' />
                    </Button>
                    {item.kind === 'custom' ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        aria-label={t('Delete')}
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <SettingsSwitchRow>
                  <SettingsSwitchContent>
                    <Label className='text-sm font-medium'>{t('Enable')}</Label>
                  </SettingsSwitchContent>
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={(checked) =>
                      updateItem(index, { enabled: checked })
                    }
                  />
                </SettingsSwitchRow>

                {supportsAuth ? (
                  <SettingsControlChildren>
                    <SettingsSwitchRow className='py-2'>
                      <SettingsSwitchContent>
                        <Label className='text-sm font-medium'>
                          {t('Require login')}
                        </Label>
                        <p className='text-muted-foreground text-xs'>
                          {item.key === 'pricing'
                            ? t(
                                'Visitors must authenticate before accessing the pricing directory.'
                              )
                            : null}
                          {item.key === 'rankings'
                            ? t(
                                'Visitors must authenticate before accessing the rankings page.'
                              )
                            : null}
                          {item.kind === 'custom'
                            ? t(
                                'Visitors must authenticate before opening this page.'
                              )
                            : null}
                        </p>
                      </SettingsSwitchContent>
                      <Switch
                        checked={Boolean(item.require_auth)}
                        onCheckedChange={(checked) =>
                          updateItem(index, { require_auth: checked })
                        }
                        disabled={!item.enabled}
                      />
                    </SettingsSwitchRow>
                  </SettingsControlChildren>
                ) : null}

                {item.kind === 'custom' ? (
                  <div className='grid gap-3 pt-1'>
                    <div className='space-y-1.5'>
                      <Label htmlFor={`nav-title-${index}`}>
                        {t('Custom page title')}
                      </Label>
                      <Input
                        id={`nav-title-${index}`}
                        value={item.title ?? ''}
                        onChange={(event) =>
                          updateItem(index, { title: event.target.value })
                        }
                        placeholder={t('Custom page title')}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor={`nav-content-${index}`}>
                        {t('Content')}
                      </Label>
                      <Textarea
                        id={`nav-content-${index}`}
                        value={item.content ?? ''}
                        onChange={(event) =>
                          updateItem(index, { content: event.target.value })
                        }
                        placeholder={t('URL or HTML/Markdown')}
                        rows={5}
                      />
                    </div>
                  </div>
                ) : null}
              </SettingsControlGroup>
            )
          })}
        </div>

        <div>
          <Button type='button' variant='outline' onClick={addCustomPage}>
            <Plus className='h-4 w-4' />
            {t('Add custom page')}
          </Button>
        </div>
      </SettingsForm>
    </SettingsSection>
  )
}
