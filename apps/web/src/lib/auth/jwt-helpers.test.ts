/**
 * @fileoverview JWT 辅助函数测试
 * 
 * 测试从请求中获取用户和更新会话的功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getUserFromRequest, updateSessionMiddleware } from './jwt-helpers'
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from './jwt'

// Mock JWT 模块
vi.mock('./jwt', async () => {
  const actual = await vi.importActual('./jwt')
  return {
    ...actual,
    verifyToken: vi.fn(),
    createAccessToken: vi.fn(),
    createRefreshToken: vi.fn(),
  }
})

// 导入 mock 后的函数
import { verifyToken, createAccessToken, createRefreshToken } from './jwt'

// Mock Next.js 的 NextRequest
function createMockRequest(cookies: Record<string, string> = {}): NextRequest {
  const cookieString = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
  
  const headers = new Headers()
  if (cookieString) {
    headers.set('cookie', cookieString)
  }
  
  return new NextRequest('http://localhost:3000/test', {
    headers,
  })
}

describe('jwt-helpers', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
  })

  describe('getUserFromRequest', () => {
    it('应该从有效的访问令牌中获取用户', async () => {
      const mockPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'access' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      vi.mocked(verifyToken).mockResolvedValue(mockPayload)
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'valid-access-token',
      })

      const user = await getUserFromRequest(request)

      expect(user).not.toBeNull()
      expect(user?.id).toBe(testUser.id)
      expect(user?.email).toBe(testUser.email)
      expect(verifyToken).toHaveBeenCalledWith('valid-access-token')
    })

    it('应该在没有访问令牌时返回 null', async () => {
      const request = createMockRequest()

      const user = await getUserFromRequest(request)

      expect(user).toBeNull()
    })

    it('应该在访问令牌无效时返回 null', async () => {
      vi.mocked(verifyToken).mockResolvedValue(null)
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'invalid-token',
      })

      const user = await getUserFromRequest(request)

      expect(user).toBeNull()
      expect(verifyToken).toHaveBeenCalledWith('invalid-token')
    })

    it('应该在没有访问令牌但刷新令牌有效时返回用户', async () => {
      const mockRefreshPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'refresh' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      }
      vi.mocked(verifyToken).mockResolvedValue(mockRefreshPayload)
      
      const request = createMockRequest({
        [REFRESH_COOKIE_NAME]: 'valid-refresh-token',
      })

      const user = await getUserFromRequest(request)

      expect(user).not.toBeNull()
      expect(user?.id).toBe(testUser.id)
      expect(user?.email).toBe(testUser.email)
      expect(verifyToken).toHaveBeenCalledWith('valid-refresh-token')
    })

    it('应该在访问令牌无效但刷新令牌有效时返回用户', async () => {
      const mockRefreshPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'refresh' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      }
      vi.mocked(verifyToken)
        .mockResolvedValueOnce(null) // 访问令牌无效
        .mockResolvedValueOnce(mockRefreshPayload) // 刷新令牌有效
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'invalid-access-token',
        [REFRESH_COOKIE_NAME]: 'valid-refresh-token',
      })

      const user = await getUserFromRequest(request)

      expect(user).not.toBeNull()
      expect(user?.id).toBe(testUser.id)
      expect(user?.email).toBe(testUser.email)
    })

    it('应该在刷新令牌无效时返回 null', async () => {
      vi.mocked(verifyToken).mockResolvedValue(null)
      
      const request = createMockRequest({
        [REFRESH_COOKIE_NAME]: 'invalid-refresh-token',
      })

      const user = await getUserFromRequest(request)

      expect(user).toBeNull()
      expect(verifyToken).toHaveBeenCalledWith('invalid-refresh-token')
    })

    it('应该优先使用访问令牌而不是刷新令牌', async () => {
      const mockAccessPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'access' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      vi.mocked(verifyToken).mockResolvedValue(mockAccessPayload)
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'valid-access-token',
        [REFRESH_COOKIE_NAME]: 'refresh-token',
      })

      const user = await getUserFromRequest(request)

      expect(user).not.toBeNull()
      expect(user?.id).toBe(testUser.id)
      expect(user?.email).toBe(testUser.email)
      // 应该只调用一次 verifyToken（访问令牌）
      expect(verifyToken).toHaveBeenCalledTimes(1)
      expect(verifyToken).toHaveBeenCalledWith('valid-access-token')
    })

    it('应该处理空的 cookie 值', async () => {
      const request = createMockRequest({
        [COOKIE_NAME]: '',
        [REFRESH_COOKIE_NAME]: '',
      })

      const user = await getUserFromRequest(request)

      expect(user).toBeNull()
    })
  })

  describe('updateSessionMiddleware', () => {
    it('应该在访问令牌有效时返回用户', async () => {
      const mockAccessPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'access' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      vi.mocked(verifyToken).mockResolvedValue(mockAccessPayload)
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'valid-access-token',
      })

      const { response, refreshedUser } = await updateSessionMiddleware(request)

      expect(response).toBeDefined()
      expect(refreshedUser).not.toBeNull()
      expect(refreshedUser?.id).toBe(testUser.id)
      expect(refreshedUser?.email).toBe(testUser.email)
    })

    it('应该在访问令牌无效但刷新令牌有效时刷新访问令牌', async () => {
      const mockRefreshPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'refresh' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      }
      vi.mocked(verifyToken)
        .mockResolvedValueOnce(null) // 访问令牌无效
        .mockResolvedValueOnce(mockRefreshPayload) // 刷新令牌有效
      vi.mocked(createAccessToken).mockResolvedValue('new-access-token')
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'invalid-access-token',
        [REFRESH_COOKIE_NAME]: 'valid-refresh-token',
      })

      const { response, refreshedUser } = await updateSessionMiddleware(request)

      expect(response).toBeDefined()
      expect(refreshedUser).not.toBeNull()
      expect(refreshedUser?.id).toBe(testUser.id)
      expect(refreshedUser?.email).toBe(testUser.email)

      // 验证响应中设置了新的访问令牌 cookie
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain(COOKIE_NAME)
      expect(createAccessToken).toHaveBeenCalledWith(testUser)
    })

    it('应该在没有任何令牌时返回 null', async () => {
      const request = createMockRequest()

      const { response, refreshedUser } = await updateSessionMiddleware(request)

      expect(response).toBeDefined()
      expect(refreshedUser).toBeNull()
    })

    it('应该在访问令牌和刷新令牌都无效时返回 null', async () => {
      vi.mocked(verifyToken).mockResolvedValue(null)
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'invalid-access-token',
        [REFRESH_COOKIE_NAME]: 'invalid-refresh-token',
      })

      const { response, refreshedUser } = await updateSessionMiddleware(request)

      expect(response).toBeDefined()
      expect(refreshedUser).toBeNull()
      expect(verifyToken).toHaveBeenCalledTimes(2)
    })

    it('应该在访问令牌有效时不刷新令牌', async () => {
      const mockAccessPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'access' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      vi.mocked(verifyToken).mockResolvedValue(mockAccessPayload)
      
      const request = createMockRequest({
        [COOKIE_NAME]: 'valid-access-token',
      })

      const { response, refreshedUser } = await updateSessionMiddleware(request)

      expect(refreshedUser).not.toBeNull()
      expect(refreshedUser?.id).toBe(testUser.id)
      // 访问令牌有效时，不应该调用 createAccessToken
      expect(createAccessToken).not.toHaveBeenCalled()
    })

    it('应该处理多个 cookie', async () => {
      const accessToken = await createAccessToken(testUser)
      const request = createMockRequest({
        [COOKIE_NAME]: accessToken,
        'other-cookie': 'other-value',
      })

      const { response, refreshedUser } = await updateSessionMiddleware(request)

      expect(response).toBeDefined()
      expect(refreshedUser).not.toBeNull()
    })

    it('应该正确设置刷新后的 cookie 属性', async () => {
      const mockRefreshPayload = {
        sub: testUser.id,
        email: testUser.email,
        type: 'refresh' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      }
      vi.mocked(verifyToken).mockResolvedValue(mockRefreshPayload)
      vi.mocked(createAccessToken).mockResolvedValue('new-access-token')
      
      const request = createMockRequest({
        [REFRESH_COOKIE_NAME]: 'valid-refresh-token',
      })

      const { response } = await updateSessionMiddleware(request)

      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toBeDefined()
      expect(setCookieHeader).toContain(COOKIE_NAME)
      expect(setCookieHeader).toContain('HttpOnly')
      // Next.js 可能使用不同的格式，检查是否包含关键属性
      expect(setCookieHeader).toMatch(/SameSite=(Lax|Strict|None)/i)
      expect(setCookieHeader).toContain('Path=/')
    })
  })

  describe('边界情况', () => {
    it('应该处理非常长的 token', async () => {
      const longToken = 'a'.repeat(10000)
      const request = createMockRequest({
        [COOKIE_NAME]: longToken,
      })

      const user = await getUserFromRequest(request)

      // 无效的长 token 应该返回 null
      expect(user).toBeNull()
    })

    it('应该处理特殊字符的 token', async () => {
      const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const request = createMockRequest({
        [COOKIE_NAME]: specialToken,
      })

      const user = await getUserFromRequest(request)

      expect(user).toBeNull()
    })

    it('应该处理不同用户的令牌', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com' }
      const user2 = { id: 'user-2', email: 'user2@example.com' }

      const mockPayload1 = {
        sub: user1.id,
        email: user1.email,
        type: 'access' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      const mockPayload2 = {
        sub: user2.id,
        email: user2.email,
        type: 'access' as const,
        iss: 'pis-auth',
        aud: 'pis-app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }

      vi.mocked(verifyToken)
        .mockResolvedValueOnce(mockPayload1)
        .mockResolvedValueOnce(mockPayload2)

      const request1 = createMockRequest({ [COOKIE_NAME]: 'token1' })
      const request2 = createMockRequest({ [COOKIE_NAME]: 'token2' })

      const result1 = await getUserFromRequest(request1)
      const result2 = await getUserFromRequest(request2)

      expect(result1?.id).toBe(user1.id)
      expect(result2?.id).toBe(user2.id)
      expect(result1?.id).not.toBe(result2?.id)
    })
  })
})
