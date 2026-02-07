/**
 * 协作邀请列表 API
 * GET: 获取当前用户的协作邀请列表
 * 
 * 注意：此功能正在开发中
 */

import { NextResponse } from 'next/server'

// 获取协作邀请列表
export async function GET() {
  return NextResponse.json({
    pending: [],
    active: [],
    message: '协作功能正在开发中',
  })
}
