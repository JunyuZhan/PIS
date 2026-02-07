/**
 * 原图下载 API 路由测试
 * 
 * 测试 GET 方法
 * 
 * 注意：当前实现直接返回公开访问路径（/media/{key}），
 * 不再使用 Worker API 生成签名 URL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockRequest } from '@/test/test-utils'

// Mock dependencies
const mockDb = {
  from: vi.fn(),
}

vi.mock('@/lib/database', () => ({
  createClient: vi.fn().mockResolvedValue(mockDb),
}))


describe('GET /api/public/download/[id]', () => {
  let mockDb: any
  let GET: typeof import('./route').GET
  const originalEnv = process.env
  
  // Valid UUIDs for testing
  const validPhotoId = '123e4567-e89b-12d3-a456-426614174000'
  const validAlbumId = '123e4567-e89b-12d3-a456-426614174001'

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    
    // 设置必要的环境变量
    process.env = {
      ...originalEnv,
    }
    
    const { createClient } = await import('@/lib/database')
    mockDb = await createClient()
    
    // 重新导入route模块以使用新的mock
    const routeModule = await import('./route')
    GET = routeModule.GET
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('photo validation', () => {
    it('should return 404 if photo does not exist', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      mockDb.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('照片不存在')
    })

    it('should return 404 if photo status is not completed', async () => {
      // 注意：代码中使用了 .eq('status', 'completed')，所以未完成的照片不会返回
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      mockDb.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })

  describe('album validation', () => {
    it('should return 404 if album is deleted', async () => {
      const mockPhoto = {
        id: validPhotoId,
        original_key: `raw/${validAlbumId}/${validPhotoId}.jpg`,
        filename: 'photo.jpg',
        album_id: validAlbumId,
      }
      
      const mockAlbum = {
        id: validAlbumId,
        allow_download: true,
        deleted_at: '2024-01-01T00:00:00Z',
      }

      // Mock first query (photos)
      const mockPhotoQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
      }

      // Mock second query (albums)
      const mockAlbumQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAlbum, error: null }),
      }

      mockDb.from
        .mockReturnValueOnce(mockPhotoQuery)
        .mockReturnValueOnce(mockAlbumQuery)

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('相册不存在')
    })

    it('should return 403 if album does not allow download', async () => {
      const mockPhoto = {
        id: validPhotoId,
        original_key: `raw/${validAlbumId}/${validPhotoId}.jpg`,
        filename: 'photo.jpg',
        album_id: validAlbumId,
      }

      const mockAlbum = {
        id: validAlbumId,
        allow_download: false,
        deleted_at: null,
      }

      // Mock first query (photos)
      const mockPhotoQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
      }

      // Mock second query (albums)
      const mockAlbumQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAlbum, error: null }),
      }

      mockDb.from
        .mockReturnValueOnce(mockPhotoQuery)
        .mockReturnValueOnce(mockAlbumQuery)

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toContain('不允许下载原图')
    })
  })

  describe('download URL generation', () => {
    it('should generate download URL successfully', async () => {
      const originalKey = `raw/${validAlbumId}/${validPhotoId}.jpg`
      const mockPhoto = {
        id: validPhotoId,
        original_key: originalKey,
        filename: 'photo.jpg',
        album_id: validAlbumId,
      }

      const mockAlbum = {
        id: validAlbumId,
        allow_download: true,
        deleted_at: null,
      }

      // Mock first query (photos)
      const mockPhotoQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
      }

      // Mock second query (albums)
      const mockAlbumQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAlbum, error: null }),
      }

      mockDb.from
        .mockReturnValueOnce(mockPhotoQuery)
        .mockReturnValueOnce(mockAlbumQuery)

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      // 当前实现返回直接访问路径
      expect(data.data.downloadUrl).toBe(`/media/${originalKey}`)
      expect(data.data.filename).toBe('photo.jpg')
    })

    it('should return download URL with correct format', async () => {
      const originalKey = `raw/${validAlbumId}/${validPhotoId}.jpg`
      const mockPhoto = {
        id: validPhotoId,
        original_key: originalKey,
        filename: '照片 测试.jpg', // 包含中文字符和空格
        album_id: validAlbumId,
      }

      const mockAlbum = {
        id: validAlbumId,
        allow_download: true,
        deleted_at: null,
      }

      // Mock first query (photos)
      const mockPhotoQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
      }

      // Mock second query (albums)
      const mockAlbumQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAlbum, error: null }),
      }

      mockDb.from
        .mockReturnValueOnce(mockPhotoQuery)
        .mockReturnValueOnce(mockAlbumQuery)

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.downloadUrl).toBe(`/media/${originalKey}`)
      expect(data.data.filename).toBe('照片 测试.jpg')
    })
  })

  describe('error handling', () => {
    it('should return 500 on params error', async () => {
      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.reject(new Error('Invalid params')) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle photo without original_key gracefully', async () => {
      const mockPhoto = {
        id: validPhotoId,
        original_key: null, // 没有原图 key
        filename: 'photo.jpg',
        album_id: validAlbumId,
      }

      const mockAlbum = {
        id: validAlbumId,
        allow_download: true,
        deleted_at: null,
      }

      // Mock first query (photos)
      const mockPhotoQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPhoto, error: null }),
      }

      // Mock second query (albums)
      const mockAlbumQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAlbum, error: null }),
      }

      mockDb.from
        .mockReturnValueOnce(mockPhotoQuery)
        .mockReturnValueOnce(mockAlbumQuery)

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      // 即使 original_key 为空，也应该返回成功（使用空字符串作为 key）
      expect(response.status).toBe(200)
      expect(data.data.downloadUrl).toBe('/media/')
      expect(data.data.filename).toBe('photo.jpg')
    })

    it('should return 500 on database error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockRejectedValue(new Error('Database error'))

      mockDb.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const request = createMockRequest(`http://localhost:3000/api/public/download/${validPhotoId}`)
      const response = await GET(request, { params: Promise.resolve({ id: validPhotoId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
