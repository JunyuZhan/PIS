import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/database'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { ApiError } from '@/lib/validation/error-handler'
import { z } from 'zod'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  wechat: string | null
  company: string | null
  address: string | null
  notes: string | null
  tags: string[] | null
  source: string | null
  status: string
  created_at: string
  updated_at: string
}

// 客户创建/更新 schema
const customerSchema = z.object({
  name: z.string().min(1, '客户姓名不能为空').max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('邮箱格式不正确').max(255).optional().nullable(),
  wechat: z.string().max(100).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  source: z.enum(['referral', 'website', 'social', 'other']).optional().nullable(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

/**
 * GET /api/admin/customers
 * 获取客户列表
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return ApiError.forbidden('需要管理员权限')
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const tag = searchParams.get('tag') || ''
    const sort = searchParams.get('sort') || 'created_desc'

    const db = await createAdminClient()
    const offset = (page - 1) * limit

    // 构建查询条件
    let query = db.from('customers')
      .select('*')
      .is('deleted_at', null)

    // 搜索条件（简化为只搜索名字字段）
    // TODO: 实现多字段 OR 搜索需要扩展 PostgreSQL 客户端
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // 状态筛选
    if (status) {
      query = query.eq('status', status)
    }

    // 标签筛选
    // TODO: 实现标签数组筛选需要扩展 PostgreSQL 客户端
    if (tag) {
      // 暂时禁用标签筛选
      console.log('标签筛选暂不支持:', tag)
    }

    // 排序
    switch (sort) {
      case 'name_asc':
        query = query.order('name', { ascending: true })
        break
      case 'name_desc':
        query = query.order('name', { ascending: false })
        break
      case 'created_asc':
        query = query.order('created_at', { ascending: true })
        break
      default: // created_desc
        query = query.order('created_at', { ascending: false })
    }

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data: customersData, error } = await query
    const customers = (customersData || []) as Customer[]

    if (error) {
      throw error
    }

    // 获取总数
    const { data: countResult } = await db.query(`
      SELECT COUNT(*) as count FROM customers 
      WHERE deleted_at IS NULL
      ${search ? `AND (name ILIKE '%${search}%' OR phone ILIKE '%${search}%' OR email ILIKE '%${search}%' OR company ILIKE '%${search}%')` : ''}
      ${status ? `AND status = '${status}'` : ''}
      ${tag ? `AND '${tag}' = ANY(tags)` : ''}
    `)

    const total = parseInt(countResult?.[0]?.count || '0')

    // 获取每个客户关联的相册数量
    const customerIds = customers.map(c => c.id)
    let albumCounts: Record<string, number> = {}
    
    if (customerIds.length > 0) {
      const { data: counts } = await db.query(`
        SELECT customer_id, COUNT(*) as count 
        FROM customer_albums 
        WHERE customer_id = ANY($1::uuid[])
        GROUP BY customer_id
      `, [customerIds])
      
      if (counts) {
        albumCounts = counts.reduce((acc: Record<string, number>, row: { customer_id: string; count: string }) => {
          acc[row.customer_id] = parseInt(row.count)
          return acc
        }, {})
      }
    }

    // 合并相册数量
    const customersWithCounts = customers?.map(customer => ({
      ...customer,
      album_count: albumCounts[customer.id] || 0,
    }))

    return NextResponse.json({
      customers: customersWithCounts || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取客户列表失败:', error)
    return ApiError.internal('获取客户列表失败')
  }
}

/**
 * POST /api/admin/customers
 * 创建新客户
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return ApiError.forbidden('需要管理员权限')
  }

  try {
    const body = await request.json()
    const validatedData = customerSchema.parse(body)

    const db = await createAdminClient()

    // 检查是否存在同名或同电话的客户
    if (validatedData.phone) {
      const { data: existing } = await db.from('customers')
        .select('id')
        .eq('phone', validatedData.phone)
        .is('deleted_at', null)
        .single()

      if (existing) {
        return ApiError.badRequest('该电话号码已存在')
      }
    }

    // 创建客户
    const { data: customer, error } = await db.from('customers')
      .insert({
        ...validatedData,
        created_by: admin.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiError.badRequest(error.errors[0].message)
    }
    console.error('创建客户失败:', error)
    return ApiError.internal('创建客户失败')
  }
}
