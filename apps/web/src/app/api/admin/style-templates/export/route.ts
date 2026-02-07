/**
 * 样式模板导出 API
 * 
 * GET: 导出所有自定义样式模板
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

interface StyleTemplateData {
  id: string
  name: string
  description: string | null
  category: string | null
  theme_config: unknown
  typography_config: unknown
  layout_config: unknown
  hero_config: unknown
  hover_config: unknown
  animation_config: unknown
}

/**
 * GET /api/admin/style-templates/export
 * 导出所有自定义样式模板
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = createServerSupabaseClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') // 可选：只导出指定模板

    let query = db
      .from('style_templates')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })

    if (id) {
      query = query.eq('id', id)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Export error:', error)
      throw new Error('导出失败')
    }

    // 转换为导出格式
    const templatesArray = (templates || []) as StyleTemplateData[]
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: templatesArray.map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        theme: t.theme_config,
        typography: t.typography_config,
        layout: t.layout_config,
        hero: t.hero_config,
        hover: t.hover_config,
        animation: t.animation_config,
      })),
    }

    // 返回 JSON 文件
    const jsonContent = JSON.stringify(exportData, null, 2)
    const filename = id
      ? `style-template-${new Date().toISOString().split('T')[0]}.json`
      : `style-templates-all-${new Date().toISOString().split('T')[0]}.json`

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
