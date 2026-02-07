/**
 * 相册协作者管理 API
 * GET: 获取相册协作者列表
 * POST: 添加协作者
 * 
 * 注意：此功能正在开发中，数据库表已创建但 API 尚未完全实现
 */

import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 获取相册协作者列表
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: albumId } = await params
  
  // TODO: 实现协作者功能
  return NextResponse.json({
    albumId,
    collaborators: [],
    message: '协作者功能正在开发中',
  })
}

// 添加协作者
export async function POST(_request: Request, { params }: RouteParams) {
  const { id: albumId } = await params
  
  // TODO: 实现协作者功能
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: '协作者功能正在开发中',
      },
      albumId,
    },
    { status: 501 }
  )
}
