import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { createAdminClient } from '@/lib/database'
import { ApiError } from '@/lib/validation/error-handler'

/**
 * GET /api/admin/notifications
 * 获取通知历史记录
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('需要管理员权限')
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // pending, sent, failed
    const type = searchParams.get('type') // album_ready, reminder, custom
    const customerId = searchParams.get('customer_id')
    const albumId = searchParams.get('album_id')

    const db = await createAdminClient()
    
    // 构建查询
    let query = db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    // 应用过滤
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }
    if (albumId) {
      query = query.eq('album_id', albumId)
    }

    // 获取总数
    const { count: total } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    // 分页
    query = query.range(offset, offset + limit - 1)
    const { data: notifications, error } = await query

    if (error) {
      console.error('获取通知列表失败:', error)
      return ApiError.internal('获取通知列表失败')
    }

    // 获取关联的客户和相册信息
    const customerIds = [...new Set(notifications?.filter(n => n.customer_id).map(n => n.customer_id))]
    const albumIds = [...new Set(notifications?.filter(n => n.album_id).map(n => n.album_id))]

    let customers: Record<string, { name: string; email: string }> = {}
    let albums: Record<string, { title: string; slug: string }> = {}

    if (customerIds.length > 0) {
      const { data: customerData } = await db
        .from('customers')
        .select('id, name, email')
        .in('id', customerIds)
      
      customerData?.forEach(c => {
        customers[c.id] = { name: c.name, email: c.email }
      })
    }

    if (albumIds.length > 0) {
      const { data: albumData } = await db
        .from('albums')
        .select('id, title, slug')
        .in('id', albumIds)
      
      albumData?.forEach(a => {
        albums[a.id] = { title: a.title, slug: a.slug }
      })
    }

    // 格式化结果
    const formattedNotifications = notifications?.map(n => ({
      id: n.id,
      type: n.type,
      channel: n.channel,
      recipient: n.recipient,
      subject: n.subject,
      status: n.status,
      sent_at: n.sent_at,
      error_message: n.error_message,
      created_at: n.created_at,
      customer: n.customer_id ? customers[n.customer_id] : null,
      album: n.album_id ? albums[n.album_id] : null,
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: total || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('获取通知列表 API 错误:', error)
    return ApiError.internal('服务器错误')
  }
}
