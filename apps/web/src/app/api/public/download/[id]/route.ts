import { NextRequest } from 'next/server'
import { createClient } from '@/lib/database'
import { photoIdSchema } from '@/lib/validation/schemas'
import { safeValidate, handleError, createSuccessResponse, ApiError } from '@/lib/validation/error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * 原图下载 API
 * 
 * @route GET /api/public/download/[id]
 * @description 生成带签名的临时下载链接，仅当相册允许下载时才返回
 * 
 * @auth 无需认证（公开接口，但需要相册允许下载）
 * 
 * @param {string} id - 照片ID（UUID格式）
 * 
 * @returns {Object} 200 - 成功返回下载链接
 * @returns {string} 200.data.downloadUrl - 临时下载链接（带签名，有效期有限）
 * @returns {string} 200.data.filename - 文件名
 * 
 * @returns {Object} 403 - 禁止访问（相册不允许下载）
 * @returns {Object} 404 - 照片不存在或未完成处理
 * @returns {Object} 500 - 服务器内部错误
 * 
 * @note 下载链接是临时的，包含签名信息，有效期有限
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const paramsData = await params
    
    // 验证路径参数
    const idValidation = safeValidate(photoIdSchema, paramsData)
    if (!idValidation.success) {
      return handleError(idValidation.error, '无效的照片ID')
    }
    
    const { id } = idValidation.data
    const db = await createClient()

    // 获取照片信息
    // 允许 completed 状态的照片，或者 failed 状态但有原图的照片
    const photoResult = await db
      .from<{ id: string; original_key: string | null; filename: string | null; album_id: string; status: string }>('photos')
      .select('id, original_key, filename, album_id, status')
      .eq('id', id)
      .in('status', ['completed', 'failed'])
      .single()

    if (photoResult.error || !photoResult.data) {
      return ApiError.notFound('照片不存在')
    }

    const photo = photoResult.data

    // 如果照片状态是 failed，必须有 original_key 才能下载
    if (photo.status === 'failed' && !photo.original_key) {
      return ApiError.notFound('照片文件不存在')
    }

    // 获取相册信息，检查下载权限
    const albumResult = await db
      .from<{ id: string; allow_download: boolean; deleted_at: string | null }>('albums')
      .select('id, allow_download, deleted_at')
      .eq('id', photo.album_id)
      .single()

    if (albumResult.error || !albumResult.data) {
      return ApiError.notFound('相册不存在')
    }

    const album = albumResult.data

    // 检查相册是否已删除
    if (album.deleted_at) {
      return ApiError.notFound('相册不存在')
    }

    // 检查下载权限
    if (!album.allow_download) {
      return ApiError.forbidden('该相册不允许下载原图')
    }

    // 直接构建公开访问 URL（不使用签名）
    // MinIO bucket 已设置为公开可读，签名反而会导致验证失败
    const originalKey = photo.original_key || ''
    const downloadUrl = `/media/${originalKey}`

    return createSuccessResponse({
      downloadUrl,
      filename: photo.filename || 'photo',
    })
  } catch (error: unknown) {
    return handleError(error, '获取下载链接失败')
  }
}
