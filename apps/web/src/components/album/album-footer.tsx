'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Camera, Heart, Mail, Phone, MessageCircle, Instagram, X } from 'lucide-react'
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
  
  // 联系方式
  const email = settings?.social_email || ''
  const phone = settings?.social_phone || ''
  // 优先使用 wechat_qrcode_url（上传的图片URL），如果没有则使用 social_wechat_qrcode（向后兼容）
  const wechatQrcode = settings?.wechat_qrcode_url || settings?.social_wechat_qrcode || ''
  const weibo = settings?.social_weibo || ''
  const instagram = settings?.social_instagram || ''
  
  // 判断是否有联系方式需要显示
  const hasContactInfo = email || phone || wechatQrcode || weibo || instagram
  const [showWechatQr, setShowWechatQr] = useState(false)

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

        {/* 联系方式区域 */}
        {hasContactInfo && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 py-4 md:py-6 border-b border-border/50 text-xs md:text-sm">
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-1 hover:text-accent transition-colors"
                title={email}
              >
                <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{email}</span>
                <span className="sm:hidden">邮箱</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1 hover:text-accent transition-colors"
                title={phone}
              >
                <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{phone}</span>
                <span className="sm:hidden">电话</span>
              </a>
            )}
            {wechatQrcode && (
              <>
                <div className="relative group">
                  <button
                    onClick={() => setShowWechatQr(true)}
                    className="flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span>微信</span>
                  </button>
                  {/* 桌面端悬停显示 */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block z-10 pointer-events-none">
                    <div className="bg-background border border-border rounded-lg p-2 shadow-lg pointer-events-auto">
                      <Image
                        src={wechatQrcode}
                        alt="微信二维码"
                        width={120}
                        height={120}
                        className="w-[120px] h-[120px]"
                      />
                    </div>
                  </div>
                </div>
                {/* 移动端点击显示弹窗 */}
                {showWechatQr && (
                  <div
                    className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowWechatQr(false)}
                  >
                    <div
                      className="bg-background rounded-lg p-4 max-w-[280px] w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">微信二维码</span>
                        <button
                          onClick={() => setShowWechatQr(false)}
                          className="text-text-muted hover:text-text"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-center">
                        <Image
                          src={wechatQrcode}
                          alt="微信二维码"
                          width={200}
                          height={200}
                          className="w-[200px] h-[200px]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {weibo && (
              <a
                href={weibo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent transition-colors"
              >
                <span>微博</span>
              </a>
            )}
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent transition-colors"
              >
                <Instagram className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Instagram</span>
              </a>
            )}
          </div>
        )}

        {/* 下部分：版权信息 */}
        <div className="flex flex-col gap-2 md:gap-3 pt-4 md:pt-6 text-text-muted text-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 md:gap-4">
              <span>© {currentYear} {copyrightText || photographerName}. All rights reserved.</span>
              <span className="hidden md:inline text-border">|</span>
              <Link href="/privacy" className="hover:text-accent transition-colors">{t('privacyPolicy')}</Link>
              <Link href="/terms" className="hover:text-accent transition-colors">{t('termsOfService')}</Link>
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
              {t('poweredBySuffix') && <span>{t('poweredBySuffix')}</span>}
            </div>
          </div>

          {/* 备案信息（如果配置了）*/}
          {(icpNumber || policeNumber) && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 md:gap-x-4 text-text-muted/80">
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
