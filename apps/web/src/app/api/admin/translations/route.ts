/**
 * 翻译管理 API
 * 
 * GET: 获取翻译列表（默认翻译 + 自定义翻译）
 * POST: 添加/更新自定义翻译
 * DELETE: 删除自定义翻译
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'

// 验证 schema
const customTranslationSchema = z.object({
  locale: z.string().min(2).max(10),
  namespace: z.string().min(1).max(100),
  key: z.string().min(1).max(255),
  value: z.string().min(1),
  is_active: z.boolean().optional().default(true),
})

const deleteTranslationSchema = z.object({
  id: z.string().uuid(),
})

interface CustomTranslationData {
  id: string
  locale: string
  namespace: string
  key: string
  value: string
  is_active: boolean
}

// 获取默认翻译（从 messages 文件）
async function getDefaultTranslations(locale: string): Promise<Record<string, unknown>> {
  try {
    const messagesPath = path.join(process.cwd(), 'src', 'messages', `${locale}.json`)
    const content = await fs.readFile(messagesPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

// 扁平化嵌套对象
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
    } else if (typeof value === 'string') {
      result[newKey] = value
    }
  }
  
  return result
}

// 将扁平化的键解析为命名空间和键
function parseKey(flatKey: string): { namespace: string; key: string } {
  const parts = flatKey.split('.')
  if (parts.length > 1) {
    return {
      namespace: parts[0],
      key: parts.slice(1).join('.'),
    }
  }
  return {
    namespace: 'common',
    key: flatKey,
  }
}

/**
 * GET /api/admin/translations
 * 获取翻译列表
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = createServerSupabaseClient()

    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'zh-CN'
    const namespace = searchParams.get('namespace')
    const search = searchParams.get('search')

    // 获取默认翻译
    const defaultTranslations = await getDefaultTranslations(locale)
    const flatDefaultTranslations = flattenObject(defaultTranslations)

    // 获取自定义翻译
    let query = db
      .from('custom_translations')
      .select('*')
      .eq('locale', locale)
      .order('namespace')
      .order('key')

    if (namespace) {
      query = query.eq('namespace', namespace)
    }

    const { data: customTranslations, error } = await query

    if (error) {
      console.error('Database error:', error)
      // 即使数据库查询失败，也返回默认翻译
    }

    // 合并翻译
    const translationsMap = new Map<string, {
      id?: string
      locale: string
      namespace: string
      key: string
      defaultValue: string
      customValue?: string
      isCustom: boolean
      isActive: boolean
    }>()

    // 添加默认翻译
    for (const [flatKey, value] of Object.entries(flatDefaultTranslations)) {
      const { namespace: ns, key } = parseKey(flatKey)
      
      // 如果有 namespace 过滤，跳过不匹配的
      if (namespace && ns !== namespace) continue
      
      // 如果有搜索词，过滤
      if (search) {
        const searchLower = search.toLowerCase()
        if (!flatKey.toLowerCase().includes(searchLower) && 
            !value.toLowerCase().includes(searchLower)) {
          continue
        }
      }

      translationsMap.set(flatKey, {
        locale,
        namespace: ns,
        key,
        defaultValue: value,
        isCustom: false,
        isActive: true,
      })
    }

    // 覆盖/添加自定义翻译
    const customArray = (customTranslations || []) as CustomTranslationData[]
    for (const custom of customArray) {
      const flatKey = `${custom.namespace}.${custom.key}`
      const existing = translationsMap.get(flatKey)
      
      if (existing) {
        existing.id = custom.id
        existing.customValue = custom.value
        existing.isCustom = true
        existing.isActive = custom.is_active
      } else {
        // 如果有搜索词，过滤
        if (search) {
          const searchLower = search.toLowerCase()
          if (!flatKey.toLowerCase().includes(searchLower) && 
              !custom.value.toLowerCase().includes(searchLower)) {
            continue
          }
        }

        translationsMap.set(flatKey, {
          id: custom.id,
          locale,
          namespace: custom.namespace,
          key: custom.key,
          defaultValue: '',
          customValue: custom.value,
          isCustom: true,
          isActive: custom.is_active,
        })
      }
    }

    // 转换为数组
    const translations = Array.from(translationsMap.values())

    // 获取所有命名空间
    const namespaces = [...new Set(translations.map(t => t.namespace))].sort()

    return NextResponse.json({
      success: true,
      data: {
        translations,
        namespaces,
        locale,
        total: translations.length,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/translations
 * 添加/更新自定义翻译
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = createServerSupabaseClient()

    const body = await request.json()
    const validation = customTranslationSchema.safeParse(body)

    if (!validation.success) {
      throw new ApiError(
        '输入验证失败',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten()
      )
    }

    const { locale, namespace, key, value, is_active } = validation.data

    // 使用 upsert 添加或更新
    const { error } = await db.upsert('custom_translations', {
      locale,
      namespace,
      key,
      value,
      is_active,
      updated_at: new Date().toISOString(),
    }, 'locale,namespace,key')

    if (error) {
      console.error('Upsert error:', error)
      throw new ApiError('保存翻译失败', 500, 'DATABASE_ERROR')
    }

    // 查询更新后的数据
    const { data } = await db
      .from('custom_translations')
      .select('*')
      .eq('locale', locale)
      .eq('namespace', namespace)
      .eq('key', key)
      .single()

    return NextResponse.json({
      success: true,
      message: '翻译已保存',
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/admin/translations
 * 删除自定义翻译
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = createServerSupabaseClient()

    const body = await request.json()
    const validation = deleteTranslationSchema.safeParse(body)

    if (!validation.success) {
      throw new ApiError(
        '输入验证失败',
        400,
        'VALIDATION_ERROR',
        validation.error.flatten()
      )
    }

    const { id } = validation.data

    const { error } = await db
      .from('custom_translations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      throw new ApiError('删除翻译失败', 500, 'DATABASE_ERROR')
    }

    return NextResponse.json({
      success: true,
      message: '翻译已删除',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
