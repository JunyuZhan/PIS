/**
 * Supabase Server 兼容层
 * 
 * 此模块提供向后兼容的 Supabase 接口
 * 使用 PostgreSQL 客户端提供同步的客户端创建函数
 */

import { createPostgreSQLClient, createPostgreSQLAdminClient } from './database/postgresql-client'

/**
 * 创建服务端数据库客户端（同步版本）
 * 兼容使用 createServerSupabaseClient() 的旧代码
 */
export function createServerSupabaseClient() {
  return createPostgreSQLAdminClient()
}

/**
 * 创建数据库客户端（同步版本）
 * 兼容使用 createSupabaseClient() 的旧代码
 */
export function createSupabaseClient() {
  return createPostgreSQLClient()
}

// 为了兼容性，也导出异步版本
export { createAdminClient, createClient } from './database'
