import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { createAdminClient } from '@/lib/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface CustomerAssociation {
  customer_id: string
  role: string
  notes: string | null
}

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  status: string
  tags: string[] | null
}

/**
 * 获取相册关联的客户列表
 * GET /api/admin/albums/[id]/customers
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const { id: albumId } = await params

    if (!albumId) {
      return NextResponse.json(
        { error: '缺少相册 ID' },
        { status: 400 }
      )
    }

    const db = await createAdminClient()

    // 获取相册关联的客户
    const { data: assocData, error: assocError } = await db
      .from('customer_albums')
      .select('customer_id, role, notes')
      .eq('album_id', albumId)
    
    const associations = (assocData || []) as CustomerAssociation[]

    if (assocError) {
      console.error('获取关联失败:', assocError)
      return NextResponse.json(
        { error: '获取关联失败' },
        { status: 500 }
      )
    }

    if (associations.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // 获取客户详情
    const customerIds = associations.map(a => a.customer_id)
    const { data: customers, error: custError } = await db
      .from('customers')
      .select('id, name, phone, email, company, status, tags')
      .in('id', customerIds)
      .is('deleted_at', null)

    if (custError) {
      console.error('获取客户详情失败:', custError)
      return NextResponse.json(
        { error: '获取客户详情失败' },
        { status: 500 }
      )
    }

    // 合并关联信息
    const customerList = (customers || []) as Customer[]
    const result = customerList.map(customer => {
      const assoc = associations.find(a => a.customer_id === customer.id)
      return {
        ...customer,
        role: assoc?.role || 'client',
        notes: assoc?.notes || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('获取相册客户错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
