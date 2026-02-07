/**
 * PostgreSQL 客户端兼容层
 * 
 * 重导出 database/postgresql-client 中的客户端
 */

export * from '../database/postgresql-client'
export { createClient, createAdminClient } from '../database'
