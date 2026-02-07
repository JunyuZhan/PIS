/**
 * 样式模板管理 API
 * 
 * GET: 获取样式模板列表
 * POST: 创建样式模板
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'
import { ALBUM_TEMPLATES, type AlbumTemplateStyle } from '@/lib/album-templates'

// 样式配置验证 schema
const themeConfigSchema = z.object({
  mode: z.enum(['light', 'dark']),
  primaryColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
})

const typographyConfigSchema = z.object({
  titleFont: z.string(),
  bodyFont: z.string(),
  titleSize: z.enum(['sm', 'md', 'lg', 'xl']),
  spacing: z.enum(['compact', 'normal', 'relaxed']),
})

const layoutConfigSchema = z.object({
  type: z.enum(['masonry', 'grid', 'story', 'timeline', 'carousel']),
  columns: z.number().min(1).max(6),
  gap: z.enum(['none', 'sm', 'md', 'lg']),
  rounded: z.enum(['none', 'sm', 'md', 'lg', 'full']),
  shadow: z.enum(['none', 'sm', 'md', 'lg']),
})

const heroConfigSchema = z.object({
  style: z.enum(['full', 'split', 'minimal', 'overlay']),
  height: z.enum(['sm', 'md', 'lg', 'full']),
  overlay: z.number().min(0).max(1),
  titlePosition: z.enum(['center', 'bottom-left', 'bottom-center']),
})

const hoverConfigSchema = z.object({
  effect: z.enum(['none', 'zoom', 'lift', 'glow', 'overlay']),
  showInfo: z.boolean(),
})

const animationConfigSchema = z.object({
  entrance: z.enum(['none', 'fade', 'slide', 'scale']),
  duration: z.enum(['fast', 'normal', 'slow']),
})

const createStyleTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['wedding', 'event', 'portrait', 'product', 'travel', 'general']).optional(),
  theme_config: themeConfigSchema,
  typography_config: typographyConfigSchema,
  layout_config: layoutConfigSchema,
  hero_config: heroConfigSchema,
  hover_config: hoverConfigSchema,
  animation_config: animationConfigSchema,
  is_public: z.boolean().optional(),
})

type TemplateCategory = 'wedding' | 'event' | 'portrait' | 'product' | 'travel' | 'general'

interface CustomTemplateData {
  id: string
  name: string
  description: string | null
  category: TemplateCategory | null
  theme_config: unknown
  typography_config: unknown
  layout_config: unknown
  hero_config: unknown
  hover_config: unknown
  animation_config: unknown
  thumbnail_url: string | null
}

/**
 * GET /api/admin/style-templates
 * 获取样式模板列表（包括内置模板和自定义模板）
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = createServerSupabaseClient()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeBuiltin = searchParams.get('includeBuiltin') !== 'false'

    // 获取自定义模板
    let query = db
      .from('style_templates')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: customTemplates, error } = await query

    if (error) {
      console.error('Database error:', error)
      // 即使数据库查询失败，也返回内置模板
    }

    // 组合结果
    const templates: Array<AlbumTemplateStyle & { isBuiltin: boolean; dbId?: string }> = []

    // 添加内置模板
    if (includeBuiltin) {
      for (const [id, template] of Object.entries(ALBUM_TEMPLATES)) {
        if (!category || template.category === category) {
          templates.push({
            ...template,
            id,
            isBuiltin: true,
          })
        }
      }
    }

    // 添加自定义模板
    const customTemplatesArray = (customTemplates || []) as CustomTemplateData[]
    if (customTemplatesArray.length > 0) {
      for (const ct of customTemplatesArray) {
        templates.push({
          id: ct.id,
          name: ct.name,
          description: ct.description || '',
          category: ct.category || 'general',
          theme: ct.theme_config as AlbumTemplateStyle['theme'],
          typography: ct.typography_config as AlbumTemplateStyle['typography'],
          layout: ct.layout_config as AlbumTemplateStyle['layout'],
          hero: ct.hero_config as AlbumTemplateStyle['hero'],
          hover: ct.hover_config as AlbumTemplateStyle['hover'],
          animation: ct.animation_config as AlbumTemplateStyle['animation'],
          thumbnail: ct.thumbnail_url || undefined,
          isBuiltin: false,
          dbId: ct.id,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        templates,
        total: templates.length,
        builtinCount: Object.keys(ALBUM_TEMPLATES).length,
        customCount: customTemplates?.length || 0,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/style-templates
 * 创建自定义样式模板
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request)
    if (!user) {
      throw new ApiError('需要管理员权限', 403, 'FORBIDDEN')
    }
    const db = createServerSupabaseClient()

    const body = await request.json()
    const validation = createStyleTemplateSchema.safeParse(body)

    if (!validation.success) {
      throw new ApiError(
        '输入验证失败',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten()
      )
    }

    const {
      name,
      description,
      category,
      theme_config,
      typography_config,
      layout_config,
      hero_config,
      hover_config,
      animation_config,
      is_public,
    } = validation.data

    const { data, error } = await db
      .from('style_templates')
      .insert({
        name,
        description: description || null,
        category: category || 'general',
        theme_config,
        typography_config,
        layout_config,
        hero_config,
        hover_config,
        animation_config,
        is_public: is_public ?? true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      throw new ApiError('创建模板失败', 500, 'DATABASE_ERROR')
    }

    return NextResponse.json({
      success: true,
      message: '样式模板已创建',
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
