/**
 * @fileoverview 数据库适配器工厂测试
 * 
 * 测试数据库客户端的创建逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient, createClientFromRequest, createAdminClient } from './index'

// Mock PostgreSQL 客户端
vi.mock('./postgresql-client', () => ({
  createPostgreSQLClient: vi.fn().mockResolvedValue({
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
  createPostgreSQLAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Mock Supabase 客户端
vi.mock('../supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
  createClientFromRequest: vi.fn().mockResolvedValue({
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
  createAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
}))

describe('database/index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清除环境变量缓存
    delete process.env.DATABASE_TYPE
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  describe('createClient', () => {
    it('应该在 DATABASE_TYPE=postgresql 时使用 PostgreSQL 客户端', async () => {
      process.env.DATABASE_TYPE = 'postgresql'
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })

    it('应该在 DATABASE_TYPE=PostgreSQL（大小写不敏感）时使用 PostgreSQL 客户端', async () => {
      process.env.DATABASE_TYPE = 'PostgreSQL'
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })

    it('应该在未配置 Supabase 时使用 PostgreSQL 客户端', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      // 不设置 Supabase 环境变量
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })

    it('应该在配置了 Supabase 且 DATABASE_TYPE=supabase 时使用 Supabase 客户端', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      const { createClient: createSupabaseClient } = await import('../supabase/server')
      expect(createSupabaseClient).toHaveBeenCalled()
    })

    it('应该在默认情况下使用 PostgreSQL 客户端', async () => {
      // 不设置 DATABASE_TYPE
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })
  })

  describe('createClientFromRequest', () => {
    it('应该在 DATABASE_TYPE=postgresql 时使用 PostgreSQL 客户端', async () => {
      process.env.DATABASE_TYPE = 'postgresql'
      const request = new NextRequest('http://localhost:3000/test')
      
      const client = await createClientFromRequest(request)
      
      expect(client).toBeDefined()
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })

    it('应该在配置了 Supabase 且 DATABASE_TYPE=supabase 时使用 Supabase 客户端', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      const request = new NextRequest('http://localhost:3000/test')
      
      const client = await createClientFromRequest(request)
      
      expect(client).toBeDefined()
      const { createClientFromRequest: createSupabaseClientFromRequest } = await import('../supabase/server')
      expect(createSupabaseClientFromRequest).toHaveBeenCalledWith(request, undefined)
    })

    it('应该传递 response 参数给 Supabase 客户端', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      const request = new NextRequest('http://localhost:3000/test')
      const response = new Response()
      
      const client = await createClientFromRequest(request, response as any)
      
      expect(client).toBeDefined()
      const { createClientFromRequest: createSupabaseClientFromRequest } = await import('../supabase/server')
      expect(createSupabaseClientFromRequest).toHaveBeenCalledWith(request, response)
    })
  })

  describe('createAdminClient', () => {
    it('应该在 DATABASE_TYPE=postgresql 时使用 PostgreSQL Admin 客户端', async () => {
      process.env.DATABASE_TYPE = 'postgresql'
      
      const client = await createAdminClient()
      
      expect(client).toBeDefined()
      const { createPostgreSQLAdminClient } = await import('./postgresql-client')
      expect(createPostgreSQLAdminClient).toHaveBeenCalled()
    })

    it('应该在未配置 Supabase Admin 时使用 PostgreSQL Admin 客户端', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      // 不设置 Supabase Admin 环境变量
      
      const client = await createAdminClient()
      
      expect(client).toBeDefined()
      const { createPostgreSQLAdminClient } = await import('./postgresql-client')
      expect(createPostgreSQLAdminClient).toHaveBeenCalled()
    })

    it('应该在配置了 Supabase Admin 且 DATABASE_TYPE=supabase 时使用 Supabase Admin 客户端', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
      
      const client = await createAdminClient()
      
      expect(client).toBeDefined()
      const { createAdminClient: createSupabaseAdminClient } = await import('../supabase/server')
      expect(createSupabaseAdminClient).toHaveBeenCalled()
    })

    it('应该优先使用 SUPABASE_URL 而不是 NEXT_PUBLIC_SUPABASE_URL', async () => {
      process.env.DATABASE_TYPE = 'supabase'
      process.env.SUPABASE_URL = 'https://admin.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
      
      const client = await createAdminClient()
      
      expect(client).toBeDefined()
      const { createAdminClient: createSupabaseAdminClient } = await import('../supabase/server')
      expect(createSupabaseAdminClient).toHaveBeenCalled()
    })
  })

  describe('环境变量处理', () => {
    it('应该处理空字符串的 DATABASE_TYPE', async () => {
      process.env.DATABASE_TYPE = ''
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      // 空字符串应该被视为默认值，使用 PostgreSQL
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })

    it('应该处理大小写混合的 DATABASE_TYPE', async () => {
      process.env.DATABASE_TYPE = 'SuPaBaSe'
      
      const client = await createClient()
      
      expect(client).toBeDefined()
      // 应该转换为小写并识别为 supabase
      // 但由于没有配置 Supabase，应该回退到 PostgreSQL
      const { createPostgreSQLClient } = await import('./postgresql-client')
      expect(createPostgreSQLClient).toHaveBeenCalled()
    })
  })
})
