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
import { Building2, Phone, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type {
  MembershipChannel,
  MembershipData,
  MembershipTier,
  MembershipVendor,
} from '../types'

type MembershipCardsProps = {
  data: MembershipData
  className?: string
}

function formatRatio(ratio: number): string {
  if (ratio == null || Number.isNaN(ratio)) return '-'
  if (ratio === 1) return '1'
  return String(Math.round(ratio * 1_000_000) / 1_000_000)
}

function TierCard({
  tier,
  accent,
  active,
  onSelect,
}: {
  tier: MembershipTier
  accent: 'default' | 'vip' | 'vip2' | 'other'
  active: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const border =
    accent === 'vip2'
      ? 'border-blue-500/50 ring-1 ring-blue-500/20'
      : accent === 'vip'
        ? 'border-sky-500/35'
        : 'border-border'

  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'bg-card flex w-full flex-col rounded-2xl border p-5 text-left shadow-sm transition-shadow hover:shadow-md',
        border,
        active && 'border-primary/60 ring-1 ring-primary/25'
      )}
    >
      <div className='mb-4 flex items-center gap-2'>
        <span className='bg-muted flex size-9 items-center justify-center rounded-full'>
          <Users className='text-muted-foreground size-4' />
        </span>
        <div>
          <h3 className='text-base font-semibold'>{tier.name}</h3>
          <p className='text-muted-foreground font-mono text-xs'>{tier.group}</p>
        </div>
      </div>
      <dl className='space-y-3 text-sm'>
        <div className='flex items-center justify-between gap-3'>
          <dt className='text-muted-foreground'>{t('Base discount')}</dt>
          <dd className='font-semibold tabular-nums'>{formatRatio(tier.ratio)}</dd>
        </div>
        <div className='flex items-center justify-between gap-3'>
          <dt className='text-muted-foreground'>{t('RPM')}</dt>
          <dd className='font-semibold tabular-nums'>{tier.rpm}</dd>
        </div>
      </dl>
    </button>
  )
}

function EnterpriseCard({
  name,
  phone,
}: {
  name: string
  phone: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <article className='bg-muted/30 border-border flex flex-col rounded-2xl border border-dashed p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <span className='bg-muted flex size-9 items-center justify-center rounded-full'>
          <Building2 className='text-muted-foreground size-4' />
        </span>
        <h3 className='text-base font-semibold'>{name}</h3>
      </div>
      <p className='text-muted-foreground mb-4 flex-1 text-sm'>
        {t('Please contact customer service')}
      </p>
      {phone ? (
        open ? (
          <div className='space-y-2'>
            <a
              href={`tel:${phone}`}
              className='text-foreground block text-center text-base font-semibold tracking-wide'
            >
              {phone}
            </a>
            <button
              type='button'
              className='border-border hover:bg-muted w-full rounded-xl border px-4 py-2.5 text-sm font-semibold'
              onClick={() => setOpen(false)}
            >
              {t('Collapse')}
            </button>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => setOpen(true)}
            className='bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors'
          >
            <Phone className='size-4' />
            {t('Contact Us')}
          </button>
        )
      ) : null}
    </article>
  )
}

function tierAccent(group: string): 'default' | 'vip' | 'vip2' | 'other' {
  if (group === 'vip2') return 'vip2'
  if (group === 'vip') return 'vip'
  if (group === 'default') return 'default'
  return 'other'
}

function vendorList(data: MembershipData): MembershipVendor[] {
  const vendors = data.vendors || []
  const models = data.models || []
  if (!vendors.length) return [{ id: 0, name: '全部渠道' }]
  const used: Record<number, boolean> = {}
  for (const m of models) {
    if (m.vendor_id) used[m.vendor_id] = true
  }
  const filtered = vendors.filter((v) => used[v.id])
  return filtered.length ? filtered : vendors
}

function ChannelDiscountSection({
  channels,
  vendors,
  tier,
}: {
  channels: MembershipChannel[]
  vendors: MembershipVendor[]
  tier: MembershipTier
}) {
  const { t } = useTranslation()
  if (!channels.length) {
    return (
      <p className='text-muted-foreground text-sm'>
        {t('No channel discount configuration yet.')}
      </p>
    )
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {vendors.map((v) => (
        <article
          key={v.id}
          className='bg-card border-border rounded-2xl border p-4 shadow-sm'
        >
          <div className='mb-3 flex items-center justify-between gap-2'>
            <strong className='text-sm font-semibold'>{v.name}</strong>
            <span className='bg-primary/10 text-primary inline-flex min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold'>
              {channels.length}
            </span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[260px] border-collapse text-sm'>
              <thead>
                <tr className='text-muted-foreground border-border border-b text-left text-xs font-semibold'>
                  <th className='py-2 pr-2 font-semibold'>{t('Channel type')}</th>
                  <th className='py-2 pr-2 font-semibold'>{t('Base discount')}</th>
                  <th className='py-2 font-semibold'>{t('Total discount')}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => {
                  const total = ch.ratio * tier.ratio
                  return (
                    <tr key={ch.key} className='border-border border-b last:border-0'>
                      <td className='py-2.5 pr-2'>{ch.name}</td>
                      <td className='py-2.5 pr-2 font-mono tabular-nums'>
                        {formatRatio(ch.ratio)}
                      </td>
                      <td className='py-2.5'>
                        <span className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 inline-flex rounded-full px-2 py-0.5 text-xs font-bold'>
                          {formatRatio(ch.ratio)} × {formatRatio(tier.ratio)} ={' '}
                          {formatRatio(total)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  )
}

export function MembershipCards({ data, className }: MembershipCardsProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(
    () => data.tiers[0]?.group || 'default'
  )

  const tier = useMemo(() => {
    return (
      data.tiers.find((x) => x.group === selected) ||
      data.tiers[0] || {
        group: 'default',
        name: t('Default'),
        ratio: 1,
        rpm: 0,
        total_limit: 0,
        success_limit: 0,
      }
    )
  }, [data.tiers, selected, t])

  const channels = data.channels || []
  const vendors = useMemo(() => vendorList(data), [data])

  return (
    <section className={cn('w-full space-y-10', className)}>
      <div className='max-w-2xl'>
        <p className='text-primary mb-2 text-xs font-semibold tracking-[0.14em] uppercase'>
          {t('User Benefits')}
        </p>
        <h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
          {t('User tiers')}
        </h2>
        <p className='text-muted-foreground mt-2 text-sm sm:text-base'>
          {t(
            'Benefits include request rate and discounts. Tap a user tier to recalculate channel total discount as channel base × user discount.'
          )}
        </p>
      </div>

      <div>
        <div className='mb-3 flex flex-wrap items-end justify-between gap-2'>
          <h3 className='text-lg font-semibold'>{t('User tiers')}</h3>
          <p className='text-muted-foreground text-xs sm:text-sm'>
            {t('Tap a card to switch the channel discount baseline')}
          </p>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {data.tiers.map((item) => (
            <TierCard
              key={item.group}
              tier={item}
              accent={tierAccent(item.group)}
              active={item.group === tier.group}
              onSelect={() => setSelected(item.group)}
            />
          ))}
          <EnterpriseCard
            name={data.enterprise.name}
            phone={data.enterprise.contact_phone}
          />
        </div>
      </div>

      <div>
        <div className='mb-3 flex flex-wrap items-end justify-between gap-2'>
          <h3 className='text-lg font-semibold'>{t('Channel discounts')}</h3>
          <p className='text-muted-foreground text-xs sm:text-sm'>
            {t('Current')}: {tier.name}（{formatRatio(tier.ratio)}） ·{' '}
            {t('Total discount = channel base × user discount')}
          </p>
        </div>
        <ChannelDiscountSection
          channels={channels}
          vendors={vendors}
          tier={tier}
        />
      </div>

      {!data.rate_limit_enabled && (
        <p className='text-muted-foreground text-xs'>
          {t(
            'Model request rate limiting is currently disabled; RPM numbers still reflect configured group limits.'
          )}
        </p>
      )}
    </section>
  )
}
