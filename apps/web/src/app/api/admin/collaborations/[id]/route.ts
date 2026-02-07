/**
 * 协作邀请响应 API
 * POST: 接受或拒绝邀请
 * DELETE: 退出协作
 * 
 * 注意：此功能正在开发中
 */

import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 接受或拒绝邀请
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params
  
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: '协作功能正在开发中',
      },
      collaborationId: id,
    },
    { status: 501 }
  )
}

// 退出协作
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: '协作功能正在开发中',
      },
      collaborationId: id,
    },
    { status: 501 }
  )
}
