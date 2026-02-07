/**
 * 翻译导出 API
 * 
 * GET: 导出自定义翻译为 JSON 文件
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

interface TranslationData {
  locale: string
  namespace: string
  key: string
  value: string
}

/**
 * GET /api/admin/translations/export
 * 导出所有自定义翻译
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = createServerSupabaseClient()

    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') // 可选，不传则导出所有语言

    let query = db
      .from('custom_translations')
      .select('*')
      .eq('is_active', true)
      .order('locale')
      .order('namespace')
      .order('key')

    if (locale) {
      query = query.eq('locale', locale)
    }

    const { data: translations, error } = await query

    if (error) {
      console.error('Export error:', error)
      throw new Error('导出翻译失败')
    }

    // 按语言分组
    const translationsArray = (translations || []) as TranslationData[]
    const exportData: Record<string, Record<string, Record<string, string>>> = {}

    for (const t of translationsArray) {
      if (!exportData[t.locale]) {
        exportData[t.locale] = {}
      }
      if (!exportData[t.locale][t.namespace]) {
        exportData[t.locale][t.namespace] = {}
      }
      exportData[t.locale][t.namespace][t.key] = t.value
    }

    // 返回 JSON 文件
    const jsonContent = JSON.stringify(exportData, null, 2)
    const filename = locale 
      ? `translations-${locale}-${new Date().toISOString().split('T')[0]}.json`
      : `translations-all-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
