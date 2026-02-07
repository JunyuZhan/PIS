
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/database'
import { requireRetoucherOrAdmin } from '@/lib/auth/role-helpers'
import { uploadPhotoSchema } from '@/lib/validation/schemas'
import { safeValidate, handleError, ApiError } from '@/lib/validation/error-handler'
import { getInternalApiUrl } from '@/lib/utils'

interface RouteParams {
  params: Promise<{ id: string }> // photoId
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const paramsData = await params
  const photoId = paramsData.id
  
  // 1. 验证用户权限：只允许管理员或修图师上传精修图
  const user = await requireRetoucherOrAdmin(request)
  if (!user) {
    return ApiError.forbidden('需要管理员或修图师权限才能上传精修图')
  }
  
  // 2. 验证照片存在并获取当前 original_key（用于后续清理旧文件）
  const adminClient = await createAdminClient()
  const { data: photoData, error } = await adminClient
    .from('photos')
    .select('id, album_id, filename, original_key')
    .eq('id', photoId)
    .single()
    
  if (error || !photoData) return ApiError.notFound('照片不存在')
  
  const photo = photoData as { id: string; album_id: string; filename: string; original_key: string | null }
  const oldOriginalKey = photo.original_key // 保存旧的原图路径，用于后续清理
  
  // 3. 解析请求体
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return handleError(new Error('Format Error'), 'Invalid JSON')
  }
  
  const validation = safeValidate(uploadPhotoSchema, body)
  if (!validation.success) return handleError(validation.error, 'Invalid Input')
  
  const { filename, contentType, fileSize, hash } = validation.data
  
  // 4. 生成新路径 (retouched/...)
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const newKey = `retouched/${photo.album_id}/${photo.id}_${Date.now()}.${ext}`
  
  // 5. 更新数据库
  const { error: updateError } = await adminClient.update('photos', {
      original_key: newKey,
      status: 'pending', // 触发 Worker
      file_size: fileSize,
      mime_type: contentType,
      hash: hash,
      retoucher_id: user.id, // 记录修图师
    }, { id: photoId })
    
  if (updateError) return ApiError.internal(updateError.message)
  
  // 5b. 清理旧的原图文件（如果存在且不是精修图路径）
  // 注意：只删除 raw/ 路径下的原图，保留 retouched/ 路径下的文件（可能是之前的精修图）
  if (oldOriginalKey && !oldOriginalKey.startsWith('retouched/')) {
    try {
      const cleanupUrl = getInternalApiUrl('/api/worker/cleanup-file')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) headers['cookie'] = cookieHeader
      
      // 异步清理，不阻塞上传流程
      fetch(cleanupUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: oldOriginalKey }),
      }).catch((cleanupErr) => {
        // 清理失败不影响主流程，只记录警告
        console.warn(`[Retouch Upload] Failed to cleanup old original file ${oldOriginalKey}:`, cleanupErr)
      })
    } catch (cleanupErr) {
      // 清理失败不影响主流程
      console.warn(`[Retouch Upload] Error cleaning up old original file:`, cleanupErr)
    }
  }
  
  // 6. 获取 presigned URL
  try {
    const presignUrl = getInternalApiUrl('/api/worker/presign')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) headers['cookie'] = cookieHeader
    
    const presignResponse = await fetch(presignUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: newKey }),
    })
    
    if (!presignResponse.ok) throw new Error('Worker Error')
    const { uploadUrl } = await presignResponse.json()
    
    return NextResponse.json({ 
      uploadUrl, 
      key: newKey,
      photoId: photo.id,
      albumId: photo.album_id
    })
  } catch {
    return ApiError.internal('Failed to generate upload URL')
  }
}
