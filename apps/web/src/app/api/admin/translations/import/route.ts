/**
 * 翻译导入 API
 * 
 * POST: 导入翻译 JSON 文件
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError, ApiError } from '@/lib/api-error'
import { z } from 'zod'

// 验证导入数据格式
const importDataSchema = z.record(
  z.string(), // locale
  z.record(
    z.string(), // namespace
    z.record(
      z.string(), // key
      z.string()  // value
    )
  )
)

/**
 * POST /api/admin/translations/import
 * 导入翻译数据
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
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

    const importData = validation.data
    const translations: {
      locale: string
      namespace: string
      key: string
      value: string
      is_active: boolean
      updated_at: string
    }[] = []

    // 解析导入数据
    for (const [locale, namespaces] of Object.entries(importData)) {
      for (const [namespace, keys] of Object.entries(namespaces)) {
        for (const [key, value] of Object.entries(keys)) {
          translations.push({
            locale,
            namespace,
            key,
            value,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
        }
      }
    }

    if (translations.length === 0) {
      throw new ApiError('导入数据为空', 400, 'EMPTY_DATA')
    }

    // 批量 upsert
    let successCount = 0
    let errorCount = 0

    // 分批处理，每批 100 条
    const batchSize = 100
    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = translations.slice(i, i + batchSize)
      
      const { error } = await db.upsert('custom_translations', batch, 'locale,namespace,key')

      if (error) {
        console.error('Batch upsert error:', error)
        errorCount += batch.length
      } else {
        successCount += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`,
      data: {
        total: translations.length,
        success: successCount,
        error: errorCount,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
