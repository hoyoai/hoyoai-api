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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading, headerShowSystemNameEnabled } =
    useSystemConfig()
  const showName = Boolean(headerShowSystemNameEnabled)

  return (
    <div className='relative grid h-svh max-w-none'>
      <Link
        to='/'
        className='absolute top-4 left-4 z-10 flex items-center gap-2.5 transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
      >
        <div className='flex h-11 max-w-[min(260px,48vw)] min-h-11 w-auto shrink-0 items-center justify-center max-sm:h-9 max-sm:max-w-[min(200px,58vw)] max-sm:min-h-9'>
          {loading ? (
            <Skeleton className='h-full w-28 rounded-md' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-full w-auto max-w-full rounded-none object-contain'
            />
          )}
        </div>
        {loading && showName ? (
          <Skeleton className='h-6 w-24' />
        ) : showName ? (
          <h1 className='text-xl font-medium'>{systemName}</h1>
        ) : null}
      </Link>
      <div className='container flex items-center pt-16 sm:pt-0'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-8 sm:w-[480px] sm:p-8'>
          {children}
        </div>
      </div>
    </div>
  )
}
