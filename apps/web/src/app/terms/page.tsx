import { getTranslations } from 'next-intl/server'
import { defaultLocale } from '@/i18n/config'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: '使用条款 - PIS',
  description: '使用本服务前请仔细阅读本使用条款',
}

export default async function TermsPage() {
  const t = await getTranslations({ locale: defaultLocale, namespace: 'legal' })

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        {/* 返回首页 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToHome')}</span>
        </Link>

        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8">
          {t('termsOfService.title')}
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">
          {/* 简介 */}
          <section>
            <p className="text-lg leading-relaxed">
              {t('termsOfService.intro')}
            </p>
          </section>

          {/* 服务说明 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.service.title')}
            </h2>
            <p>{t('termsOfService.service.desc')}</p>
          </section>

          {/* 用户责任 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.userResponsibility.title')}
            </h2>
            <p className="mb-4">{t('termsOfService.userResponsibility.desc')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('termsOfService.userResponsibility.item1')}</li>
              <li>{t('termsOfService.userResponsibility.item2')}</li>
              <li>{t('termsOfService.userResponsibility.item3')}</li>
            </ul>
          </section>

          {/* 知识产权 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.intellectualProperty.title')}
            </h2>
            <p>{t('termsOfService.intellectualProperty.desc')}</p>
          </section>

          {/* 照片使用 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.photoUsage.title')}
            </h2>
            <p>{t('termsOfService.photoUsage.desc')}</p>
          </section>

          {/* 免责声明 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.disclaimer.title')}
            </h2>
            <p>{t('termsOfService.disclaimer.desc')}</p>
          </section>

          {/* 条款修改 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.modifications.title')}
            </h2>
            <p>{t('termsOfService.modifications.desc')}</p>
          </section>

          {/* 联系我们 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('termsOfService.contact.title')}
            </h2>
            <p>{t('termsOfService.contact.desc')}</p>
          </section>

          {/* 更新日期 */}
          <section className="pt-8 border-t border-border">
            <p className="text-sm text-text-muted">
              {t('lastUpdated')}: 2026-02-08
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
