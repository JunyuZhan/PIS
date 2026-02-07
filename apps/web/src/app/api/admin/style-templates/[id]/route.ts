/**
 * 单个样式模板管理 API
 * 
 * GET: 获取单个样式模板
 * PATCH: 更新样式模板
 * DELETE: 删除样式模板
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'
import { ALBUM_TEMPLATES, type AlbumTemplateStyle } from '@/lib/album-templates'

// 更新 schema（所有字段可选）
const updateStyleTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: z.enum(['wedding', 'event', 'portrait', 'product', 'travel', 'general']).optional(),
  theme_config: z.object({
    mode: z.enum(['light', 'dark']),
    primaryColor: z.string(),
    backgroundColor: z.string(),
    textColor: z.string(),
    accentColor: z.string(),
  }).optional(),
  typography_config: z.object({
    titleFont: z.string(),
    bodyFont: z.string(),
    titleSize: z.enum(['sm', 'md', 'lg', 'xl']),
    spacing: z.enum(['compact', 'normal', 'relaxed']),
  }).optional(),
  layout_config: z.object({
    type: z.enum(['masonry', 'grid', 'story', 'timeline', 'carousel']),
    columns: z.number().min(1).max(6),
    gap: z.enum(['none', 'sm', 'md', 'lg']),
    rounded: z.enum(['none', 'sm', 'md', 'lg', 'full']),
    shadow: z.enum(['none', 'sm', 'md', 'lg']),
  }).optional(),
  hero_config: z.object({
    style: z.enum(['full', 'split', 'minimal', 'overlay']),
    height: z.enum(['sm', 'md', 'lg', 'full']),
    overlay: z.number().min(0).max(1),
    titlePosition: z.enum(['center', 'bottom-left', 'bottom-center']),
  }).optional(),
  hover_config: z.object({
    effect: z.enum(['none', 'zoom', 'lift', 'glow', 'overlay']),
    showInfo: z.boolean(),
  }).optional(),
  animation_config: z.object({
    entrance: z.enum(['none', 'fade', 'slide', 'scale']),
    duration: z.enum(['fast', 'normal', 'slow']),
  }).optional(),
  is_public: z.boolean().optional(),
  sort_order: z.number().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

type TemplateCategory = 'wedding' | 'event' | 'portrait' | 'product' | 'travel' | 'general'

interface StyleTemplateData {
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
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * GET /api/admin/style-templates/[id]
 * 获取单个样式模板
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params

    // 先检查是否是内置模板
    if (ALBUM_TEMPLATES[id]) {
      return NextResponse.json({
        success: true,
        data: {
          ...ALBUM_TEMPLATES[id],
          isBuiltin: true,
        },
      })
    }

    // 查询数据库
    const db = createServerSupabaseClient()
    const { data: templateData, error } = await db
      .from('style_templates')
      .select('*')
      .eq('id', id)
      .single()
    const data = templateData as StyleTemplateData | null

    if (error || !data) {
      throw new ApiError('模板不存在', 404, 'NOT_FOUND')
    }

    // 转换为 AlbumTemplateStyle 格式
    const template: AlbumTemplateStyle & { isBuiltin: boolean; dbId: string } = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      category: data.category || 'general',
      theme: data.theme_config as AlbumTemplateStyle['theme'],
      typography: data.typography_config as AlbumTemplateStyle['typography'],
      layout: data.layout_config as AlbumTemplateStyle['layout'],
      hero: data.hero_config as AlbumTemplateStyle['hero'],
      hover: data.hover_config as AlbumTemplateStyle['hover'],
      animation: data.animation_config as AlbumTemplateStyle['animation'],
      thumbnail: data.thumbnail_url || undefined,
      isBuiltin: false,
      dbId: data.id,
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/admin/style-templates/[id]
 * 更新样式模板
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const db = createServerSupabaseClient()

    // 检查是否是内置模板
    if (ALBUM_TEMPLATES[id]) {
      throw new ApiError('内置模板不能修改', 400, 'BUILTIN_TEMPLATE')
    }

    const body = await request.json()
    const validation = updateStyleTemplateSchema.safeParse(body)

    if (!validation.success) {
      throw new ApiError(
        '输入验证失败',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten()
      )
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // 只添加提供的字段
    if (validation.data.name !== undefined) updateData.name = validation.data.name
    if (validation.data.description !== undefined) updateData.description = validation.data.description
    if (validation.data.category !== undefined) updateData.category = validation.data.category
    if (validation.data.theme_config !== undefined) updateData.theme_config = validation.data.theme_config
    if (validation.data.typography_config !== undefined) updateData.typography_config = validation.data.typography_config
    if (validation.data.layout_config !== undefined) updateData.layout_config = validation.data.layout_config
    if (validation.data.hero_config !== undefined) updateData.hero_config = validation.data.hero_config
    if (validation.data.hover_config !== undefined) updateData.hover_config = validation.data.hover_config
    if (validation.data.animation_config !== undefined) updateData.animation_config = validation.data.animation_config
    if (validation.data.is_public !== undefined) updateData.is_public = validation.data.is_public
    if (validation.data.sort_order !== undefined) updateData.sort_order = validation.data.sort_order

    const { data, error } = await db
      .from('style_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      throw new ApiError('更新模板失败', 500, 'DATABASE_ERROR')
    }

    if (!data) {
      throw new ApiError('模板不存在', 404, 'NOT_FOUND')
    }

    return NextResponse.json({
      success: true,
      message: '样式模板已更新',
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/admin/style-templates/[id]
 * 删除样式模板
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const db = createServerSupabaseClient()

    // 检查是否是内置模板
    if (ALBUM_TEMPLATES[id]) {
      throw new ApiError('内置模板不能删除', 400, 'BUILTIN_TEMPLATE')
    }

    const { error } = await db
      .from('style_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      throw new ApiError('删除模板失败', 500, 'DATABASE_ERROR')
    }

    return NextResponse.json({
      success: true,
      message: '样式模板已删除',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
