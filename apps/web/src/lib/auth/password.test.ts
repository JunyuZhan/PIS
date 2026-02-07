/**
 * @fileoverview 密码哈希工具测试
 * 
 * 测试密码哈希和验证功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  beforeEach(() => {
    // 重置环境变量
    vi.resetModules()
  })

  describe('hashPassword', () => {
    it('应该生成有效的密码哈希', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
      
      // 验证哈希格式：salt:iterations:hash
      const parts = hash.split(':')
      expect(parts.length).toBe(3)
      expect(parts[0].length).toBeGreaterThan(0) // salt
      expect(parts[1]).toBe('100000') // iterations
      expect(parts[2].length).toBeGreaterThan(0) // hash
    })

    it('应该为相同密码生成不同的哈希', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      // 由于使用了随机 salt，每次生成的哈希应该不同
      expect(hash1).not.toBe(hash2)
    })

    it('应该为不同密码生成不同的哈希', async () => {
      const hash1 = await hashPassword('password1')
      const hash2 = await hashPassword('password2')
      
      expect(hash1).not.toBe(hash2)
    })

    it('应该处理空字符串密码', async () => {
      const hash = await hashPassword('')
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      const parts = hash.split(':')
      expect(parts.length).toBe(3)
    })

    it('应该处理特殊字符密码', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      const parts = hash.split(':')
      expect(parts.length).toBe(3)
    })

    it('应该处理长密码', async () => {
      const password = 'a'.repeat(1000)
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      const parts = hash.split(':')
      expect(parts.length).toBe(3)
    })
  })

  describe('verifyPassword', () => {
    it('应该验证正确的密码', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('应该拒绝错误的密码', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword('wrongPassword', hash)
      expect(isValid).toBe(false)
    })

    it('应该拒绝空字符串密码', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword('', hash)
      expect(isValid).toBe(false)
    })

    it('应该拒绝格式错误的哈希', async () => {
      const isValid1 = await verifyPassword('password', '')
      expect(isValid1).toBe(false)
      
      const isValid2 = await verifyPassword('password', 'invalid-hash')
      expect(isValid2).toBe(false)
      
      const isValid3 = await verifyPassword('password', 'only:one:part:too:many')
      expect(isValid3).toBe(false)
    })

    it('应该拒绝缺少部分的哈希', async () => {
      const isValid1 = await verifyPassword('password', ':100000:hash')
      expect(isValid1).toBe(false)
      
      const isValid2 = await verifyPassword('password', 'salt::hash')
      expect(isValid2).toBe(false)
      
      const isValid3 = await verifyPassword('password', 'salt:100000:')
      expect(isValid3).toBe(false)
    })

    it('应该拒绝无效的迭代次数', async () => {
      const isValid1 = await verifyPassword('password', 'salt:invalid:hash')
      expect(isValid1).toBe(false)
      
      const isValid2 = await verifyPassword('password', 'salt:0:hash')
      expect(isValid2).toBe(false)
      
      const isValid3 = await verifyPassword('password', 'salt:-1:hash')
      expect(isValid3).toBe(false)
    })

    it('应该处理特殊字符密码', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
      
      const isValidWrong = await verifyPassword('wrong', hash)
      expect(isValidWrong).toBe(false)
    })

    it('应该处理长密码', async () => {
      const password = 'a'.repeat(1000)
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
      
      const isValidWrong = await verifyPassword('wrong', hash)
      expect(isValidWrong).toBe(false)
    })

    it('应该区分大小写', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)
      
      const isValid1 = await verifyPassword('testPassword123', hash)
      expect(isValid1).toBe(false)
      
      const isValid2 = await verifyPassword('TestPassword123', hash)
      expect(isValid2).toBe(true)
    })

    it('应该处理 Unicode 字符', async () => {
      const password = '测试密码🔐'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
      
      const isValidWrong = await verifyPassword('错误密码', hash)
      expect(isValidWrong).toBe(false)
    })
  })

  describe('hashPassword 和 verifyPassword 集成', () => {
    it('应该能够验证自己生成的哈希', async () => {
      const passwords = [
        'simple',
        'complexPassword123!@#',
        '测试密码',
        'a'.repeat(100),
        '',
      ]
      
      for (const password of passwords) {
        const hash = await hashPassword(password)
        const isValid = await verifyPassword(password, hash)
        expect(isValid).toBe(true)
      }
    })

    it('应该能够区分相似的密码', async () => {
      const password1 = 'password123'
      const password2 = 'password124'
      
      const hash1 = await hashPassword(password1)
      const hash2 = await hashPassword(password2)
      
      // 哈希应该不同
      expect(hash1).not.toBe(hash2)
      
      // 每个密码只能验证自己的哈希
      expect(await verifyPassword(password1, hash1)).toBe(true)
      expect(await verifyPassword(password2, hash1)).toBe(false)
      expect(await verifyPassword(password1, hash2)).toBe(false)
      expect(await verifyPassword(password2, hash2)).toBe(true)
    })
  })
})
