/**
 * 样式模板导入 API
 * 
 * POST: 导入样式模板
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

// 导入数据验证 schema
const importTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.enum(['wedding', 'event', 'portrait', 'product', 'travel', 'general']).optional(),
  theme: z.object({
    mode: z.enum(['light', 'dark']),
    primaryColor: z.string(),
    backgroundColor: z.string(),
    textColor: z.string(),
    accentColor: z.string(),
  }),
  typography: z.object({
    titleFont: z.string(),
    bodyFont: z.string(),
    titleSize: z.enum(['sm', 'md', 'lg', 'xl']),
    spacing: z.enum(['compact', 'normal', 'relaxed']),
  }),
  layout: z.object({
    type: z.enum(['masonry', 'grid', 'story', 'timeline', 'carousel']),
    columns: z.number().min(1).max(6),
    gap: z.enum(['none', 'sm', 'md', 'lg']),
    rounded: z.enum(['none', 'sm', 'md', 'lg', 'full']),
    shadow: z.enum(['none', 'sm', 'md', 'lg']),
  }),
  hero: z.object({
    style: z.enum(['full', 'split', 'minimal', 'overlay']),
    height: z.enum(['sm', 'md', 'lg', 'full']),
    overlay: z.number().min(0).max(1),
    titlePosition: z.enum(['center', 'bottom-left', 'bottom-center']),
  }),
  hover: z.object({
    effect: z.enum(['none', 'zoom', 'lift', 'glow', 'overlay']),
    showInfo: z.boolean(),
  }),
  animation: z.object({
    entrance: z.enum(['none', 'fade', 'slide', 'scale']),
    duration: z.enum(['fast', 'normal', 'slow']),
  }),
})

const importDataSchema = z.object({
  version: z.string().optional(),
  templates: z.array(importTemplateSchema),
})

/**
 * POST /api/admin/style-templates/import
 * 导入样式模板
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request)
    if (!user) {
      throw new ApiError('需要管理员权限', 403, 'FORBIDDEN')
    }
    const db = createServerSupabaseClient()

    const body = await request.json()
    
    // 验证数据格式
    const validation = importDataSchema.safeParse(body)
    if (!validation.success) {
      throw new ApiError(
        '无效的导入数据格式',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten()
      )
    }

    const { templates } = validation.data

    if (templates.length === 0) {
      throw new ApiError('导入数据为空', 400, 'EMPTY_DATA')
    }

    // 批量插入
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const template of templates) {
      try {
        const { error } = await db
          .from('style_templates')
          .insert({
            name: template.name,
            description: template.description || null,
            category: template.category || 'general',
            theme_config: template.theme,
            typography_config: template.typography,
            layout_config: template.layout,
            hero_config: template.hero,
            hover_config: template.hover,
            animation_config: template.animation,
            is_public: true,
            created_by: user.id,
          })

        if (error) {
          console.error('Insert error:', error)
          errorCount++
          errors.push(`${template.name}: ${error.message}`)
        } else {
          successCount++
        }
      } catch (err) {
        errorCount++
        errors.push(`${template.name}: ${err instanceof Error ? err.message : '未知错误'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成：成功 ${successCount} 个，失败 ${errorCount} 个`,
      data: {
        total: templates.length,
        success: successCount,
        error: errorCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
