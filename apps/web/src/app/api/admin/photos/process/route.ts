import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireRetoucherOrAdmin } from '@/lib/auth/role-helpers'
import { processPhotoSchema } from '@/lib/validation/schemas'
import { safeValidate, handleError, createSuccessResponse, ApiError } from '@/lib/validation/error-handler'
import { getInternalApiUrl } from '@/lib/utils'

/**
 * 触发照片处理 API
 * 
 * @route POST /api/admin/photos/process
 * @description 触发 Worker 服务处理照片（生成缩略图、预览图等）
 * 
 * @auth 需要管理员或修图师登录
 * 
 * @body {Object} requestBody - 照片处理请求体
 * @body {string} requestBody.photoId - 照片ID（UUID格式，必填）
 * @body {string} requestBody.albumId - 相册ID（UUID格式，必填）
 * @body {string} requestBody.originalKey - 原始文件在存储中的键名（必填）
 * @body {boolean} [requestBody.isRetouch] - 是否为精修图上传（可选）
 * 
 * @returns {Object} 200 - 处理请求已提交
 * @returns {boolean} 200.data.success - 操作是否成功
 * 
 * @returns {Object} 202 - 请求已接受，但 Worker 服务暂时不可用
 * @returns {Object} 202.warning - 警告信息
 * @returns {string} 202.warning.code - 警告代码（WORKER_UNAVAILABLE）
 * @returns {string} 202.warning.message - 警告消息
 * 
 * @returns {Object} 400 - 请求参数错误（验证失败）
 * @returns {Object} 401 - 未授权（需要登录）
 * @returns {Object} 500 - 服务器内部错误
 * 
 * @note 如果 Worker 服务不可用，会返回 202 状态码，照片将在后台异步处理
 * @note 如果是精修图上传（isRetouch=true），允许修图师权限；否则需要管理员权限
 */
export async function POST(request: NextRequest) {
  try {
    // 先检查用户是否已登录
    const { getCurrentUser } = await import('@/lib/auth/api-helpers')
    const user = await getCurrentUser(request)
    if (!user) {
      return ApiError.unauthorized('需要登录才能执行此操作')
    }

    // 解析请求体以判断是否为精修图上传
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiError.badRequest('请求体格式错误，请提供有效的JSON')
    }

    // 验证输入
    const validation = safeValidate(processPhotoSchema, body)
    if (!validation.success) {
      return handleError(validation.error, '输入验证失败')
    }

    const { photoId, albumId, originalKey, isRetouch } = validation.data

    // 如果是精修图上传，允许修图师或管理员；否则只允许管理员
    if (isRetouch) {
      const retoucherOrAdmin = await requireRetoucherOrAdmin(request)
      if (!retoucherOrAdmin) {
        return ApiError.forbidden('需要修图师或管理员权限才能处理精修图')
      }
    } else {
      const admin = await requireAdmin(request)
      if (!admin) {
        return ApiError.forbidden('需要管理员权限才能处理照片')
      }
    }

    // 使用代理路由调用 Worker API 触发处理
    // 代理路由会自动处理 Worker URL 配置和认证
    const proxyUrl = getInternalApiUrl('/api/worker/process')

    let workerAvailable = true
    let workerError: string | null = null

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // 传递认证 cookie，代理路由会处理认证
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        headers['cookie'] = cookieHeader
      }

      const processRes = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoId, albumId, originalKey, isRetouch }),
      })

      if (!processRes.ok) {
        const errorText = await processRes.text()
        console.error('Worker process error:', processRes.status, errorText)
        workerAvailable = false
        workerError = `Worker 返回错误: ${processRes.status}`
      }
    } catch (err) {
      console.error('Failed to call worker:', err)
      workerAvailable = false
      workerError = err instanceof Error ? err.message : '无法连接到 Worker 服务'
    }

    // 如果 Worker 不可用，返回警告状态码
    if (!workerAvailable) {
      return NextResponse.json(
        {
          success: true,
          warning: {
            code: 'WORKER_UNAVAILABLE',
            message: '照片处理服务暂时不可用，照片将在后台异步处理',
            details: workerError,
          },
        },
        { status: 202 } // 202 Accepted: 请求已接受，但处理尚未完成
      )
    }

    return createSuccessResponse({ success: true })
  } catch (error) {
    return handleError(error, '触发照片处理失败')
  }
}
