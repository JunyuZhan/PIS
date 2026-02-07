'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useSettings } from '@/hooks/use-settings'

export function SiteFooter() {
  const t = useTranslations('footer')
  const { settings } = useSettings()
  const currentYear = new Date().getFullYear()

  // 使用数据库设置，环境变量作为后备
  const photographerName = settings?.brand_name || process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || 'PIS Photography'
  const copyrightText = settings?.copyright_text || process.env.NEXT_PUBLIC_COPYRIGHT_TEXT || ''
  const icpNumber = settings?.icp_number || process.env.NEXT_PUBLIC_ICP_NUMBER || ''
  const policeNumber = settings?.police_number || process.env.NEXT_PUBLIC_POLICE_NUMBER || ''

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-8">
        <div className="flex flex-col gap-3 text-xs md:text-sm text-text-muted">
          {/* 第一行：版权和链接 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:gap-4">
              <span>© {currentYear} {copyrightText || photographerName}</span>
              <span className="hidden md:inline">|</span>
              <div className="flex items-center gap-2">
                <span className="hover:text-accent transition-colors cursor-pointer">
                  {t('privacyPolicy')}
                </span>
                <span className="text-border">·</span>
                <span className="hover:text-accent transition-colors cursor-pointer">
                  {t('termsOfService')}
                </span>
              </div>
            </div>

            {/* Powered by */}
            <div className="flex items-center gap-1">
              <span>{t('poweredBy')}</span>
              <Link
                href="https://github.com/JunyuZhan/pis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline transition-colors"
              >
                PIS
              </Link>
            </div>
          </div>

          {/* 第二行：备案信息（如果配置了）*/}
          {(icpNumber || policeNumber) && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-text-muted/80">
              {icpNumber && (
                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  {icpNumber}
                </a>
              )}
              {policeNumber && (
                <a
                  href="http://www.beian.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-accent transition-colors"
                >
                  <Image 
                    src="/images/police-badge.png" 
                    alt="" 
                    width={14}
                    height={14}
                    className="w-3.5 h-3.5"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  {policeNumber}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
