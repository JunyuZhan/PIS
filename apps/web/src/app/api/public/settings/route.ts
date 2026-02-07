import { NextResponse } from 'next/server'
import { createClient } from '@/lib/database'

interface PublicSetting {
  key: string
  value: unknown
  category: string
}

/**
 * 获取公开系统设置
 * GET /api/public/settings
 * 
 * 返回 is_public=true 的设置，用于前台显示
 */
export async function GET() {
  try {
    const db = await createClient()
    
    const { data: settings, error } = await db
      .from('system_settings')
      .select('key, value, category')
      .eq('is_public', true)
      .order('category')
      .order('key')

    if (error) {
      console.error('获取公开设置失败:', error)
      // 返回默认值，不报错
      return NextResponse.json({
        success: true,
        data: getDefaultPublicSettings(),
      })
    }

    // 转换为键值对格式
    const result: Record<string, unknown> = {}
    const typedSettings = (settings || []) as PublicSetting[]
    for (const setting of typedSettings) {
      result[setting.key] = setting.value
    }

    // 合并默认值（确保所有必需字段都存在）
    const merged = {
      ...getDefaultPublicSettings(),
      ...result,
    }

    return NextResponse.json({
      success: true,
      data: merged,
    })
  } catch (error) {
    console.error('公开设置 API 错误:', error)
    // 出错时返回默认值
    return NextResponse.json({
      success: true,
      data: getDefaultPublicSettings(),
    })
  }
}

/**
 * 获取默认公开设置
 * 当数据库不可用时使用
 */
function getDefaultPublicSettings(): Record<string, unknown> {
  return {
    // 品牌
    brand_name: process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || 'PIS Photography',
    brand_tagline: process.env.NEXT_PUBLIC_PHOTOGRAPHER_TAGLINE || '专业活动摄影',
    brand_logo: null,
    brand_favicon: null,
    copyright_text: process.env.NEXT_PUBLIC_COPYRIGHT_TEXT || '',
    icp_number: process.env.NEXT_PUBLIC_ICP_NUMBER || '',
    police_number: process.env.NEXT_PUBLIC_POLICE_NUMBER || '',
    // 站点
    site_title: 'PIS - 即时影像分享',
    site_description: '专业级私有化即时摄影分享系统',
    site_keywords: '摄影,相册,分享,活动摄影',
    // 社交
    social_wechat_qrcode: null,
    social_weibo: '',
    social_instagram: '',
    social_email: '',
    social_phone: '',
    // 主题
    theme_mode: 'system',
    theme_primary_color: '#D4AF37',
  }
}
