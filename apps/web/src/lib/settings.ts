import { createClient } from './database'

interface SettingRow {
  key: string
  value: unknown
}

export interface PublicSettings {
  // 品牌
  brand_name: string
  brand_tagline: string
  brand_logo: string | null
  brand_favicon: string | null
  logo_url: string | null       // 新字段
  favicon_url: string | null    // 新字段
  copyright_text: string
  icp_number: string
  police_number: string
  // 站点
  site_title: string
  site_description: string
  site_keywords: string
  // 社交
  social_wechat_qrcode: string | null
  wechat_qrcode_url: string | null  // 新字段
  social_weibo: string
  social_instagram: string
  social_email: string
  social_phone: string
  // 主题
  theme_mode: 'light' | 'dark' | 'system'
  theme_primary_color: string
}

const defaultSettings: PublicSettings = {
  brand_name: process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || 'PIS Photography',
  brand_tagline: process.env.NEXT_PUBLIC_PHOTOGRAPHER_TAGLINE || '专业活动摄影',
  brand_logo: null,
  brand_favicon: null,
  logo_url: null,
  favicon_url: null,
  copyright_text: process.env.NEXT_PUBLIC_COPYRIGHT_TEXT || '',
  icp_number: process.env.NEXT_PUBLIC_ICP_NUMBER || '',
  police_number: process.env.NEXT_PUBLIC_POLICE_NUMBER || '',
  site_title: 'PIS - 即时影像分享',
  site_description: '专业级私有化即时摄影分享系统',
  site_keywords: '摄影,相册,分享,活动摄影',
  social_wechat_qrcode: null,
  wechat_qrcode_url: null,
  social_weibo: '',
  social_instagram: '',
  social_email: '',
  social_phone: '',
  theme_mode: 'system',
  theme_primary_color: '#D4AF37',
}

/**
 * 获取公开设置（服务端使用）
 * 缓存 60 秒
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const db = await createClient()
    
    const { data: settings, error } = await db
      .from('system_settings')
      .select('key, value')
      .eq('is_public', true)

    if (error) {
      console.error('获取公开设置失败:', error)
      return defaultSettings
    }

    // 转换为对象
    const result: Record<string, unknown> = {}
    const settingsList = (settings || []) as SettingRow[]
    for (const setting of settingsList) {
      result[setting.key] = setting.value
    }

    // 合并默认值
    return {
      ...defaultSettings,
      ...result,
    } as PublicSettings
  } catch (error) {
    console.error('获取设置出错:', error)
    return defaultSettings
  }
}

/**
 * 获取品牌信息
 */
export async function getBrandSettings() {
  const settings = await getPublicSettings()
  return {
    name: settings.brand_name,
    tagline: settings.brand_tagline,
    logo: settings.brand_logo,
    favicon: settings.brand_favicon,
    copyright: settings.copyright_text || settings.brand_name,
    icp: settings.icp_number,
    police: settings.police_number,
  }
}

/**
 * 获取 SEO 设置
 */
export async function getSeoSettings() {
  const settings = await getPublicSettings()
  return {
    title: settings.site_title,
    description: settings.site_description,
    keywords: settings.site_keywords,
  }
}

/**
 * 获取社交链接
 */
export async function getSocialSettings() {
  const settings = await getPublicSettings()
  return {
    wechatQrcode: settings.social_wechat_qrcode,
    weibo: settings.social_weibo,
    instagram: settings.social_instagram,
    email: settings.social_email,
    phone: settings.social_phone,
  }
}
