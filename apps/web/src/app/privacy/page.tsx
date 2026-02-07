import { getTranslations } from 'next-intl/server'
import { defaultLocale } from '@/i18n/config'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: '隐私政策 - PIS',
  description: '了解我们如何收集、使用和保护您的个人信息',
}

export default async function PrivacyPage() {
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
          {t('privacyPolicy.title')}
        </h1>

        <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">
          {/* 简介 */}
          <section>
            <p className="text-lg leading-relaxed">
              {t('privacyPolicy.intro')}
            </p>
          </section>

          {/* 信息收集 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('privacyPolicy.collection.title')}
            </h2>
            <p className="mb-4">{t('privacyPolicy.collection.desc')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('privacyPolicy.collection.item1')}</li>
              <li>{t('privacyPolicy.collection.item2')}</li>
              <li>{t('privacyPolicy.collection.item3')}</li>
            </ul>
          </section>

          {/* 信息使用 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('privacyPolicy.usage.title')}
            </h2>
            <p className="mb-4">{t('privacyPolicy.usage.desc')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('privacyPolicy.usage.item1')}</li>
              <li>{t('privacyPolicy.usage.item2')}</li>
              <li>{t('privacyPolicy.usage.item3')}</li>
            </ul>
          </section>

          {/* 信息保护 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('privacyPolicy.protection.title')}
            </h2>
            <p>{t('privacyPolicy.protection.desc')}</p>
          </section>

          {/* Cookie */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('privacyPolicy.cookies.title')}
            </h2>
            <p>{t('privacyPolicy.cookies.desc')}</p>
          </section>

          {/* 第三方服务 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('privacyPolicy.thirdParty.title')}
            </h2>
            <p>{t('privacyPolicy.thirdParty.desc')}</p>
          </section>

          {/* 联系我们 */}
          <section>
            <h2 className="text-xl font-semibold text-text mb-4">
              {t('privacyPolicy.contact.title')}
            </h2>
            <p>{t('privacyPolicy.contact.desc')}</p>
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
