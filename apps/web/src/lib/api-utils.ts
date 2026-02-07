/**
 * API 工具函数
 * 
 * 提供通用的 API 错误处理和认证辅助函数
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyToken } from './auth/jwt'

// 导出 handleError 从 validation/error-handler
export { handleError } from './validation/error-handler'
// 导出原始 ApiError 作为 ApiErrorHelpers
export { ApiError as ApiErrorHelpers } from './validation/error-handler'

/**
 * 可构造的 ApiError 类
 * 用于兼容使用 `throw new ApiError(message, status, code?, details?)` 的代码
 */
export class ApiError extends Error {
  statusCode: number
  code?: string
  details?: unknown

  constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

/**
 * API 错误响应处理
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    // 检查是否是带有状态码的错误
    const statusCode = (error as Error & { statusCode?: number }).statusCode || 500
    return NextResponse.json(
      {
        error: {
          code: 'API_ERROR',
          message: error.message,
        },
      },
      { status: statusCode }
    )
  }
  
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    },
    { status: 500 }
  )
}

/**
 * 获取当前认证用户
 * 用于 API 路由
 */
export async function requireAuth(): Promise<{
  user: {
    id: string
    email: string
    role: string
  }
}> {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('未授权访问') as Error & { statusCode: number }
    error.statusCode = 401
    throw error
  }
  
  const token = authHeader.substring(7)
  const payload = await verifyToken(token)
  
  if (!payload || !payload.sub) {
    const error = new Error('无效的令牌') as Error & { statusCode: number }
    error.statusCode = 401
    throw error
  }
  
  return {
    user: {
      id: payload.sub,
      email: payload.email || '',
      role: (payload as unknown as { role?: string }).role || 'user',
    },
  }
}
