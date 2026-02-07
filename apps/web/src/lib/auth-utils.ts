/**
 * 认证工具函数兼容层
 * 
 * 重导出 auth 模块中的函数
 */

export { requireAdmin, requireRole } from './auth/role-helpers'
export { getCurrentUser, requireAuth } from './auth/api-helpers'
export { getUserFromRequest } from './auth'
