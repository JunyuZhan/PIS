import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/database'
import type { Database } from '@/types/database'
import { AlbumSettingsForm } from '@/components/admin/album-settings-form'

type Album = Database['public']['Tables']['albums']['Row']

interface AlbumSettingsPageProps {
  params: Promise<{ id: string }>
}

/**
 * 相册设置页
 */
export default async function AlbumSettingsPage({
  params,
}: AlbumSettingsPageProps) {
  const { id } = await params
  const db = await createClient()

  // 获取相册信息
  const albumResult = await db
    .from('albums')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (albumResult.error || !albumResult.data) {
    notFound()
  }

  const album = albumResult.data as Album

  // 获取封面照片的原图 key 和尺寸（用于风格预设预览和水印预览）
  let coverOriginalKey: string | null = null
  let coverPreviewDimensions: { width: number; height: number } | null = null
  if (album.cover_photo_id) {
    const coverPhotoResult = await db
      .from('photos')
      .select('original_key, width, height')
      .eq('id', album.cover_photo_id)
      .single()
    
    if (coverPhotoResult.data) {
      const coverPhoto = coverPhotoResult.data as { 
        original_key: string | null
        width: number | null
        height: number | null
      }
      coverOriginalKey = coverPhoto.original_key
      
      // 计算预览图尺寸（保持原图宽高比，按比例缩放到最大 1920px）
      // 注意：这里计算的是预览图的实际尺寸，预览组件会使用这个比例，而不是直接显示原图
      // 预览图最大尺寸与 Worker 的 PREVIEW_MAX_SIZE 保持一致（默认 1920px）
      if (coverPhoto.width && coverPhoto.height) {
        const maxPreviewSize = 1920 // 与 Worker 默认值保持一致
        let previewWidth = coverPhoto.width
        let previewHeight = coverPhoto.height
        
        // 如果原图超过最大预览尺寸，按比例缩放（保持宽高比）
        if (previewWidth > maxPreviewSize || previewHeight > maxPreviewSize) {
          const ratio = Math.min(maxPreviewSize / previewWidth, maxPreviewSize / previewHeight)
          previewWidth = Math.floor(previewWidth * ratio)
          previewHeight = Math.floor(previewHeight * ratio)
        }
        
        // 传递预览图尺寸（保持原图比例），预览组件会基于这个比例绘制
        coverPreviewDimensions = { width: previewWidth, height: previewHeight }
      }
    }
  }

  return (
    <div className="max-w-4xl lg:max-w-6xl">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-text-secondary mb-6">
        <Link
          href={`/admin/albums/${id}`}
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回相册
        </Link>
      </div>

      {/* 页面标题 */}
      <h1 className="text-2xl font-serif font-bold mb-8">相册设置</h1>

      {/* 设置表单组件 */}
      <AlbumSettingsForm 
        album={album} 
        coverOriginalKey={coverOriginalKey}
        coverPreviewDimensions={coverPreviewDimensions}
      />
    </div>
  )
}
