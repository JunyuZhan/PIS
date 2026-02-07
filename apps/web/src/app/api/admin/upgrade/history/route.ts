import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { createAdminClient } from '@/lib/database'
import { ApiError } from '@/lib/validation/error-handler'

interface UpgradeHistory {
  id: string
  from_version: string
  to_version: string
  status: string
  executed_by: string | null
  started_at: string
  completed_at: string | null
  error_message: string | null
  notes: string | null
}

interface UserData {
  id: string
  name: string | null
  email: string
}

/**
 * GET /api/admin/upgrade/history
 * 获取升级历史记录
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('需要管理员权限')
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const db = await createAdminClient()

    // 获取升级历史
    const { data: history, error } = await db
      .from('upgrade_history')
      .select(`
        id,
        from_version,
        to_version,
        status,
        started_at,
        completed_at,
        executed_by,
        notes,
        error_message,
        rebuild_performed,
        rollback_available
      `)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('获取升级历史失败:', error)
      return ApiError.internal('获取升级历史失败')
    }

    // 获取总数
    const { data: countData } = await db.query(`
      SELECT COUNT(*) as total FROM upgrade_history
    `)
    const total = parseInt(countData?.[0]?.total || '0')

    // 获取执行人信息
    const historyArray = (history || []) as UpgradeHistory[]
    const executorIds = [...new Set(historyArray.map(h => h.executed_by).filter(Boolean))] as string[]
    let executors: Record<string, string> = {}
    
    if (executorIds.length > 0) {
      const { data: usersData } = await db
        .from('users')
        .select('id, name, email')
        .in('id', executorIds)
      const users = (usersData || []) as UserData[]
      
      executors = users.reduce((acc, user) => {
        acc[user.id] = user.name || user.email
        return acc
      }, {} as Record<string, string>)
    }

    // 格式化返回数据
    const formattedHistory = historyArray.map(item => ({
      ...item,
      executor_name: item.executed_by ? executors[item.executed_by] : null,
      duration: item.completed_at && item.started_at
        ? Math.round((new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 1000)
        : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        history: formattedHistory,
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('获取升级历史 API 错误:', error)
    return ApiError.internal('服务器错误')
  }
}
