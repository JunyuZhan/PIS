'use client'

import Image from 'next/image'
import { Camera, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSettings } from '@/hooks/use-settings'

export function AlbumFooter() {
  const t = useTranslations('footer')
  const { settings } = useSettings()
  const currentYear = new Date().getFullYear()

  // 使用数据库设置，环境变量作为后备
  const photographerName = settings?.brand_name || process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || 'PIS Photography'
  const copyrightText = settings?.copyright_text || process.env.NEXT_PUBLIC_COPYRIGHT_TEXT || ''
  const icpNumber = settings?.icp_number || process.env.NEXT_PUBLIC_ICP_NUMBER || ''
  const policeNumber = settings?.police_number || process.env.NEXT_PUBLIC_POLICE_NUMBER || ''

  return (
    <footer className="bg-surface border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* 上部分：品牌信息 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-border/50">
          {/* 品牌 Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-serif font-bold text-lg">{photographerName}</p>
              <p className="text-xs text-text-muted">{t('description')}</p>
            </div>
          </div>

          {/* 感谢语 */}
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <span>{t('thankYou')}</span>
            <Heart className="w-4 h-4 text-red-400 fill-current" />
          </div>
        </div>

        {/* 下部分：版权信息 */}
        <div className="flex flex-col gap-3 pt-6 text-text-muted text-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span>© {currentYear} {copyrightText || photographerName}. All rights reserved.</span>
              <span className="hidden md:inline">|</span>
              <a href="#" className="hover:text-accent transition-colors">{t('privacyPolicy')}</a>
              <a href="#" className="hover:text-accent transition-colors">{t('termsOfService')}</a>
            </div>

            <div className="flex items-center gap-1">
              <span>{t('poweredBy')}</span>
              <a
                href="https://github.com/JunyuZhan/pis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                PIS
              </a>
            </div>
          </div>

          {/* 备案信息（如果配置了）*/}
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
