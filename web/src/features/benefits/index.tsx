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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { Skeleton } from '@/components/ui/skeleton'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getMembership } from './api'
import { MembershipCards } from './components/membership-cards'

export function Benefits() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['membership'],
    queryFn: async () => {
      const res = await getMembership()
      requireServerSuccess(res)
      return res.data!
    },
  })

  return (
    <PublicLayout showMainContainer={false}>
      <main className='mx-auto w-full max-w-6xl px-4 pt-20 pb-10 sm:px-6 sm:pt-24 sm:pb-14'>
        {query.isLoading && (
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-44 rounded-2xl' />
            ))}
          </div>
        )}
        {query.isError && (
          <p className='text-destructive text-sm'>
            {t('Failed to load membership configuration')}
          </p>
        )}
        {query.data && <MembershipCards data={query.data} />}
      </main>
      <Footer />
    </PublicLayout>
  )
}
