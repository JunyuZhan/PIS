import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/database'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { ApiError } from '@/lib/validation/error-handler'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface Album {
  id: string
  title: string
}

// 关联创建 schema
const linkAlbumSchema = z.object({
  albumId: z.string().uuid('无效的相册 ID'),
  role: z.enum(['client', 'guest', 'photographer']).optional(),
  notes: z.string().optional().nullable(),
})

/**
 * POST /api/admin/customers/[id]/albums
 * 关联相册到客户
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return ApiError.forbidden('需要管理员权限')
  }

  const { id: customerId } = await params

  try {
    const body = await request.json()
    const { albumId, role = 'client', notes } = linkAlbumSchema.parse(body)

    const db = await createAdminClient()

    // 验证客户存在
    const { data: customer } = await db.from('customers')
      .select('id')
      .eq('id', customerId)
      .is('deleted_at', null)
      .single()

    if (!customer) {
      return ApiError.notFound('客户不存在')
    }

    // 验证相册存在
    const { data: albumData } = await db.from('albums')
      .select('id, title')
      .eq('id', albumId)
      .is('deleted_at', null)
      .single()

    const album = albumData as Album | null
    if (!album) {
      return ApiError.notFound('相册不存在')
    }

    // 检查是否已关联
    const { data: existing } = await db.from('customer_albums')
      .select('id')
      .eq('customer_id', customerId)
      .eq('album_id', albumId)
      .single()

    if (existing) {
      return ApiError.badRequest('该相册已关联到此客户')
    }

    // 创建关联
    const { data: link, error } = await db.from('customer_albums')
      .insert({
        customer_id: customerId,
        album_id: albumId,
        role,
        notes,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      link,
      album: {
        id: album.id,
        title: album.title,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiError.badRequest(error.errors[0].message)
    }
    console.error('关联相册失败:', error)
    return ApiError.internal('关联相册失败')
  }
}

/**
 * DELETE /api/admin/customers/[id]/albums
 * 取消相册关联
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return ApiError.forbidden('需要管理员权限')
  }

  const { id: customerId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const albumId = searchParams.get('albumId')

    if (!albumId) {
      return ApiError.badRequest('缺少相册 ID')
    }

    const db = await createAdminClient()

    // 删除关联
    const { error } = await db.from('customer_albums')
      .delete()
      .eq('customer_id', customerId)
      .eq('album_id', albumId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('取消关联失败:', error)
    return ApiError.internal('取消关联失败')
  }
}
