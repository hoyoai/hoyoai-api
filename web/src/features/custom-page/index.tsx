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
import { isAxiosError } from 'axios'
import { FileWarning } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate } from '@tanstack/react-router'

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { isHttpUrl, isLikelyHtml } from '@/lib/content-format'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getCustomPage } from './api'

type CustomPageProps = {
  pageId: string
}

function CustomPageStatusCard(props: {
  title: string
  message: string
}) {
  return (
    <PublicLayout>
      <div className='mx-auto max-w-2xl py-12'>
        <Card className='border-dashed'>
          <CardHeader className='flex flex-row items-center gap-4'>
            <div className='bg-muted rounded-lg p-2'>
              <FileWarning className='text-muted-foreground h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <CardTitle className='text-lg font-semibold'>
                {props.title}
              </CardTitle>
              <p className='text-muted-foreground text-sm'>{props.message}</p>
            </div>
          </CardHeader>
        </Card>
      </div>
    </PublicLayout>
  )
}

export function CustomPage(props: CustomPageProps) {
  const { t } = useTranslation()
  // 权益页有原生 /benefits（无 iframe）；手机端 /p/benefits iframe 易白屏/高度塌缩
  if (props.pageId.trim() === 'benefits') {
    return <Navigate to='/benefits' replace />
  }
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['custom-page', props.pageId],
    queryFn: async () => requireServerSuccess(await getCustomPage(props.pageId)),
    enabled: props.pageId.trim().length > 0,
    retry: false,
    meta: { errorToast: false },
  })

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 py-12'>
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  const isNotFound = isAxiosError(error) && error.response?.status === 404

  if (isError) {
    return (
      <CustomPageStatusCard
        title={
          isNotFound
            ? t('Custom page not found')
            : t('Failed to load custom page')
        }
        message={
          isNotFound
            ? t('This page does not exist or has been disabled.')
            : t('Something went wrong while loading this page.')
        }
      />
    )
  }

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isUrl = hasContent && isHttpUrl(rawContent)
  const contentIsHtml = hasContent && isLikelyHtml(rawContent)

  if (!hasContent) {
    return (
      <CustomPageStatusCard
        title={t('Custom page')}
        message={t('This custom page has no content yet.')}
      />
    )
  }

  if (isUrl) {
    // Same-origin admin URLs (e.g. /hoyoai/*.html) need allow-same-origin so
    // the page can call public APIs like /api/membership. Cross-origin URLs
    // still run in a sandbox; same-origin + scripts is acceptable because
    // content is admin-configured, matching web-preview.
    return (
      <PublicLayout showMainContainer={false}>
        <main className='flex min-h-[calc(100vh-4rem)] pt-16'>
          <iframe
            src={rawContent}
            className='block h-[calc(100vh-4rem)] min-h-[70vh] w-full border-0 supports-[height:100svh]:h-[calc(100svh-4rem)]'
            title={t('Custom page')}
            sandbox='allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin allow-top-navigation allow-top-navigation-by-user-activation'
          />
        </main>
      </PublicLayout>
    )
  }

  if (contentIsHtml) {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='pt-16'>
          <RichContent
            mode='html'
            htmlVariant='isolated'
            content={rawContent}
            className='prose-neutral dark:prose-invert max-w-none'
          />
        </main>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8'>
        <RichContent
          mode='markdown'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </div>
    </PublicLayout>
  )
}
