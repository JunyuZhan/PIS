/**
 * 操作日志工具库
 * 用于记录系统中的关键操作
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'

/**
 * 操作类型
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'login'
  | 'logout'
  | 'upload'
  | 'download'
  | 'export'
  | 'import'
  | 'share'
  | 'publish'
  | 'unpublish'
  | 'batch_delete'
  | 'batch_update'
  | 'settings_update'
  | 'password_change'
  | 'role_change'
  | 'permission_change'

/**
 * 资源类型
 */
export type ResourceType =
  | 'album'
  | 'photo'
  | 'user'
  | 'customer'
  | 'template'
  | 'style_template'
  | 'translation'
  | 'notification'
  | 'system_settings'
  | 'upgrade'

/**
 * 日志记录参数
 */
export interface AuditLogParams {
  /** 操作类型 */
  action: AuditAction
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源 ID */
  resourceId?: string
  /** 资源名称（便于显示） */
  resourceName?: string
  /** 操作描述 */
  description?: string
  /** 变更详情 */
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  /** 额外元数据 */
  metadata?: Record<string, unknown>
  /** 操作状态 */
  status?: 'success' | 'failed' | 'pending'
  /** 错误信息 */
  errorMessage?: string
}

/**
 * 用户信息
 */
interface UserInfo {
  id: string
  email?: string
  role?: string
}

/**
 * 从请求头获取客户端信息
 */
async function getRequestInfo() {
  try {
    const headersList = await headers()
    return {
      ipAddress: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                 headersList.get('x-real-ip') || 
                 'unknown',
      userAgent: headersList.get('user-agent') || 'unknown',
    }
  } catch {
    return {
      ipAddress: 'unknown',
      userAgent: 'unknown',
    }
  }
}

/**
 * 记录操作日志
 */
export async function logAudit(
  user: UserInfo | null,
  params: AuditLogParams
): Promise<void> {
  try {
    const db = createServerSupabaseClient()
    const requestInfo = await getRequestInfo()

    const logEntry = {
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_role: user?.role || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      resource_name: params.resourceName || null,
      description: params.description || generateDescription(params),
      changes: params.changes || {},
      metadata: params.metadata || {},
      ip_address: requestInfo.ipAddress,
      user_agent: requestInfo.userAgent,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
    }

    await db.from('audit_logs').insert(logEntry)
  } catch (error) {
    // 日志记录失败不应影响主业务
    console.error('Failed to record audit log:', error)
  }
}

/**
 * 生成默认描述
 */
function generateDescription(params: AuditLogParams): string {
  const actionMap: Record<AuditAction, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    restore: '恢复',
    login: '登录',
    logout: '登出',
    upload: '上传',
    download: '下载',
    export: '导出',
    import: '导入',
    share: '分享',
    publish: '发布',
    unpublish: '取消发布',
    batch_delete: '批量删除',
    batch_update: '批量更新',
    settings_update: '更新设置',
    password_change: '修改密码',
    role_change: '修改角色',
    permission_change: '修改权限',
  }

  const resourceMap: Record<ResourceType, string> = {
    album: '相册',
    photo: '照片',
    user: '用户',
    customer: '客户',
    template: '模板',
    style_template: '样式模板',
    translation: '翻译',
    notification: '通知',
    system_settings: '系统设置',
    upgrade: '系统升级',
  }

  const action = actionMap[params.action] || params.action
  const resource = resourceMap[params.resourceType] || params.resourceType
  const name = params.resourceName ? `「${params.resourceName}」` : ''

  return `${action}${resource}${name}`
}

/**
 * 便捷方法：记录创建操作
 */
export async function logCreate(
  user: UserInfo | null,
  resourceType: ResourceType,
  resourceId: string,
  resourceName?: string,
  metadata?: Record<string, unknown>
) {
  return logAudit(user, {
    action: 'create',
    resourceType,
    resourceId,
    resourceName,
    metadata,
  })
}

/**
 * 便捷方法：记录更新操作
 */
export async function logUpdate(
  user: UserInfo | null,
  resourceType: ResourceType,
  resourceId: string,
  resourceName?: string,
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
) {
  return logAudit(user, {
    action: 'update',
    resourceType,
    resourceId,
    resourceName,
    changes,
  })
}

/**
 * 便捷方法：记录删除操作
 */
export async function logDelete(
  user: UserInfo | null,
  resourceType: ResourceType,
  resourceId: string,
  resourceName?: string
) {
  return logAudit(user, {
    action: 'delete',
    resourceType,
    resourceId,
    resourceName,
  })
}

/**
 * 便捷方法：记录登录
 */
export async function logLogin(user: UserInfo) {
  return logAudit(user, {
    action: 'login',
    resourceType: 'user',
    resourceId: user.id,
    resourceName: user.email,
  })
}

/**
 * 便捷方法：记录登出
 */
export async function logLogout(user: UserInfo) {
  return logAudit(user, {
    action: 'logout',
    resourceType: 'user',
    resourceId: user.id,
    resourceName: user.email,
  })
}
