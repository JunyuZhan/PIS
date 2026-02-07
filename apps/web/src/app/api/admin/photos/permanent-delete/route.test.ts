/**
 * 照片永久删除 API 路由测试
 * 
 * 测试 POST 方法
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { createMockRequest } from '@/test/test-utils'
import { getCurrentUser } from '@/lib/auth/api-helpers'

// Mock dependencies
const { mockSupabaseClient, mockAdminClient, mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    getUser: vi.fn(),
  }

  const mockSupabaseClient = {
    auth: mockAuth,
    from: vi.fn(),
  }

  const mockAdminClient = {
    from: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  }
  
  return { mockSupabaseClient, mockAdminClient, mockAuth }
})

vi.mock('@/lib/auth/api-helpers', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/database', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
  createAdminClient: vi.fn().mockResolvedValue(mockAdminClient),
}))

vi.mock('@/lib/cloudflare-purge', () => ({
  purgePhotoCache: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock global fetch
global.fetch = vi.fn()

describe('POST /api/admin/photos/permanent-delete', () => {
  let mockAuth: any
    let mockSupabaseClient: any
    let mockAdminClient: any
    let purgePhotoCache: any
    let revalidatePath: any
    let originalMockImplementation: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { createClient, createAdminClient } = await import('@/lib/database')
    mockSupabaseClient = await createClient()
    mockAuth = mockSupabaseClient.auth
    mockAdminClient = await createAdminClient()
    
    const { purgePhotoCache: purgeMock } = await import('@/lib/cloudflare-purge')
    purgePhotoCache = purgeMock
    
    const { revalidatePath: revalidateMock } = await import('next/cache')
    revalidatePath = revalidateMock
    
    // 默认用户已登录
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-123', email: 'test@example.com',
    } as any)
    
    // Mock admin role query for requireAdmin
    const mockRoleSelect = vi.fn().mockReturnThis()
    const mockRoleEq = vi.fn().mockReturnThis()
    const mockRoleSingle = vi.fn().mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    })
    originalMockImplementation = (table: string) => {
      if (table === 'users') {
        return {
          select: mockRoleSelect,
          eq: mockRoleEq,
          single: mockRoleSingle,
        }
      }
      // For other tables, return default chain
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
    }
    mockAdminClient.from.mockImplementation(originalMockImplementation)

    // 默认fetch成功
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })

    // 默认 Cloudflare purge 成功
    purgePhotoCache.mockResolvedValue({
      success: true,
      purgedUrls: [],
      failedUrls: [],
    })

    // Default mock implementation for adminClient methods
    mockAdminClient.delete.mockResolvedValue({ data: [], error: null })
    mockAdminClient.update.mockResolvedValue({ data: [], error: null })
    mockAdminClient.insert.mockResolvedValue({ data: [], error: null })
  })

  describe('authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('request validation', () => {
    it('should return 400 for invalid JSON body', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: 'invalid-json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // Since handleError defaults to INTERNAL_ERROR for generic Error, but we pass status 400
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 400 if photoIds is not an array', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: 'not-an-array',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      // Check details for validation error message
      // Zod default message for type mismatch
      expect(data.error.details[0].message).toContain('Expected array')
    })

    it('should return 400 if photoIds is empty', async () => {
      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: [],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 if photoIds exceeds limit', async () => {
      const photoIds = Array.from({ length: 101 }, (_, i) => `photo-${i}`)

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details[0].message).toContain('单次最多删除100张照片')
    })
  })

  describe('photo validation', () => {
    it('should return 404 if no valid photos found', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      // Preserve the users table mock for requireAdmin
      const originalMockImplementation = mockAdminClient.from.getMockImplementation()
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          // Return the original users mock for requireAdmin
          return originalMockImplementation!(table)
        }
        // For other tables, return the new mock
        return {
          select: mockSelect,
          in: mockIn,
          not: mockNot,
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('未找到有效的照片')
    })

    it('should return 500 on database query error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      // Preserve the users table mock for requireAdmin
      const originalMockImplementation = mockAdminClient.from.getMockImplementation()
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          // Return the original users mock for requireAdmin
          return originalMockImplementation!(table)
        }
        // For other tables, return the new mock
        return {
          select: mockSelect,
          in: mockIn,
          not: mockNot,
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should only delete photos that are in trash (deleted_at is not null)', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: 'thumbs/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          preview_key: 'previews/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      // Preserve the users table mock for requireAdmin
      const originalMockImplementation = mockAdminClient.from.getMockImplementation()
      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          // Return the original users mock for requireAdmin
          return originalMockImplementation!(table)
        }
        // For other tables, handle sequential calls
        callCount++
        if (callCount === 1) {
          // First call: photos table
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          // Second call: albums table
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          // Third call: photos count
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          // Subsequent calls: update
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      expect(data.data.deletedCount).toBe(1)
      
      // 验证只查询已删除的照片
      expect(mockNot).toHaveBeenCalledWith('deleted_at', 'is', null)
    })
  })

  describe('file deletion', () => {
    it('should delete all MinIO files (original, thumb, preview)', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: 'thumbs/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          preview_key: 'previews/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 验证调用了 Worker API 删除所有文件
      expect(global.fetch).toHaveBeenCalledTimes(1)
      
      const fetchCalls = (global.fetch as any).mock.calls
      const cleanupFileCalls = fetchCalls.filter((call: any[]) => 
        call[0].includes('/api/worker/cleanup-file')
      )
      expect(cleanupFileCalls.length).toBe(1)
      
      const body = JSON.parse(cleanupFileCalls[0][1].body)
      expect(body.keys).toHaveLength(3)
      expect(body.keys).toContain('raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg')
      expect(body.keys).toContain('thumbs/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg')
      expect(body.keys).toContain('previews/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg')
    })

    it('should skip null file keys', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 只应该删除 original_key
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should continue deletion even if MinIO cleanup fails', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      // MinIO cleanup 失败
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      // 即使 MinIO 删除失败，数据库记录也应该被删除
      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      expect(mockAdminClient.delete).toHaveBeenCalled()
    })
  })

  describe('CDN cache purge', () => {
    it('should purge CDN cache when configured', async () => {
      const originalEnv = process.env
      process.env.NEXT_PUBLIC_MEDIA_URL = 'https://media.example.com'
      process.env.CLOUDFLARE_ZONE_ID = 'zone-123'
      process.env.CLOUDFLARE_API_TOKEN = 'token-123'

      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: 'thumbs/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          preview_key: 'previews/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      purgePhotoCache.mockResolvedValue({
        success: true,
        purgedUrls: [],
        failedUrls: [],
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 验证调用了 CDN purge
      expect(purgePhotoCache).toHaveBeenCalled()

      process.env = originalEnv
    })

    it('should skip CDN purge if not configured', async () => {
      const originalEnv = process.env
      delete process.env.NEXT_PUBLIC_MEDIA_URL
      delete process.env.CLOUDFLARE_ZONE_ID
      delete process.env.CLOUDFLARE_API_TOKEN

      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 不应该调用 CDN purge
      expect(purgePhotoCache).not.toHaveBeenCalled()

      process.env = originalEnv
    })
  })

  describe('database operations', () => {
    it('should delete photo records from database', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      expect(mockAdminClient.delete).toHaveBeenCalled()
      expect(mockAdminClient.delete).toHaveBeenCalledWith('photos', { 'id[]': ['123e4567-e89b-12d3-a456-426614174000'] })
    })

    it('should return 500 on database deletion error', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        }
      })

      mockAdminClient.delete.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Delete failed' },
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should update album cover if cover photo is deleted', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: '123e4567-e89b-12d3-a456-426614174000', // 封面照片被删除
          },
        ],
        error: null,
      })

      // 模拟查询第一张照片（用于设置新封面）
      // 需要支持链式调用：select().eq(album_id).eq(status).is(deleted_at).order().limit()
      const mockFirstPhotoLimit = vi.fn().mockResolvedValue({
        data: [{ id: '123e4567-e89b-12d3-a456-426614174002' }], // 第一张照片
        error: null,
      })
      const mockFirstPhotoOrder = vi.fn().mockReturnValue({
        limit: mockFirstPhotoLimit,
      })
      const mockFirstPhotoIs = vi.fn().mockReturnValue({
        order: mockFirstPhotoOrder,
      })
      // 第二次 eq 调用 (status) 后返回包含 is 方法的对象
      const mockFirstPhotoEq2 = vi.fn().mockReturnValue({
        is: mockFirstPhotoIs,
      })
      // 第一次 eq 调用 (album_id) 后返回包含 eq 方法的对象，以便链式调用第二次 eq
      const mockFirstPhotoEq1 = vi.fn().mockReturnValue({
        eq: mockFirstPhotoEq2,
      })
      // select 调用后返回包含 eq 方法的对象
      const mockFirstPhotoSelect = vi.fn().mockReturnValue({
        eq: mockFirstPhotoEq1,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          // 查询要删除的照片
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          // 查询相册信息
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          // 查询第一张照片（用于设置新封面）
          return {
            select: mockFirstPhotoSelect,
          }
        } else if (callCount === 4) {
          // 查询照片计数
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          // 其他查询（不应该到达这里）
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()

      // Mock delete 操作
      mockAdminClient.delete.mockResolvedValue({
        data: [],
        error: null,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 验证更新了相册封面（设置为第一张照片）
      expect(mockAdminClient.update).toHaveBeenCalledWith(
        'albums', 
        { cover_photo_id: '123e4567-e89b-12d3-a456-426614174002' }, 
        { id: '123e4567-e89b-12d3-a456-426614174001' }
      )
    })

    it('should update album photo count', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 验证更新了相册照片计数
      expect(mockAdminClient.update).toHaveBeenCalledWith('albums', { photo_count: 5 }, { id: '123e4567-e89b-12d3-a456-426614174001' })
    })
  })

  describe('cache revalidation', () => {
    it('should revalidate Next.js cache paths', async () => {
      const mockPhotos = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          album_id: '123e4567-e89b-12d3-a456-426614174001',
          original_key: 'raw/123e4567-e89b-12d3-a456-426614174001/123e4567-e89b-12d3-a456-426614174000.jpg',
          thumb_key: null,
          preview_key: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockResolvedValue({
        data: mockPhotos,
        error: null,
      })

      const mockAlbumsSelect = vi.fn().mockReturnThis()
      const mockAlbumsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'test-album',
            cover_photo_id: null,
          },
        ],
        error: null,
      })

      const mockCountSelect = vi.fn().mockReturnThis()
      const mockCountEq = vi.fn().mockReturnThis()
      const mockCountIs = vi.fn().mockResolvedValue({
        count: 5,
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      let callCount = 0
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return originalMockImplementation(table)
        }
        callCount++
        if (callCount === 1) {
          return {
            select: mockSelect,
            in: mockIn,
            not: mockNot,
          }
        } else if (callCount === 2) {
          return {
            select: mockAlbumsSelect,
            in: mockAlbumsIn,
          }
        } else if (callCount === 3) {
          return {
            select: mockCountSelect,
            eq: mockCountEq,
            is: mockCountIs,
          }
        } else {
          return {
            update: mockUpdate,
            eq: mockUpdateEq,
          }
        }
      })

      mockCountSelect.mockReturnThis()
      mockCountEq.mockReturnThis()
      mockUpdate.mockReturnThis()

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      
      // 验证调用了 revalidatePath
      expect(revalidatePath).toHaveBeenCalledTimes(4)
      expect(revalidatePath).toHaveBeenCalledWith('/api/public/albums/test-album/photos')
      expect(revalidatePath).toHaveBeenCalledWith('/api/public/albums/test-album/groups')
      expect(revalidatePath).toHaveBeenCalledWith('/api/public/albums/test-album')
      expect(revalidatePath).toHaveBeenCalledWith('/album/test-album')
    })
  })

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Unexpected error'))

      const request = createMockRequest('http://localhost:3000/api/admin/photos/permanent-delete', {
        method: 'POST',
        body: {
          photoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
