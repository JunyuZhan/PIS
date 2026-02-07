import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { ApiError } from '@/lib/validation/error-handler'
import { createAdminClient } from '@/lib/database'
import { APP_VERSION } from '@/lib/version'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { z } from 'zod'

// 请求验证
const rollbackSchema = z.object({
  target_version: z.string().regex(/^v?\d+\.\d+\.\d+(-[\w.]+)?$/, '无效的版本号格式'),
  rebuild: z.boolean().optional().default(false),
})

/**
 * 记录回滚历史
 */
async function recordRollbackHistory(
  fromVersion: string,
  toVersion: string,
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back',
  options: {
    executedBy?: string
    notes?: string
    errorMessage?: string
    rebuildPerformed?: boolean
    historyId?: string
  } = {}
): Promise<string | null> {
  try {
    const db = await createAdminClient()
    
    if (options.historyId) {
      // 更新现有记录
      await db.update('upgrade_history', {
        status,
        completed_at: ['success', 'failed', 'rolled_back'].includes(status) ? new Date().toISOString() : null,
        error_message: options.errorMessage || null,
        notes: options.notes || null,
      }, { id: options.historyId })
      return options.historyId
    } else {
      // 创建新记录
      const { data } = await db.insert('upgrade_history', {
        from_version: fromVersion,
        to_version: toVersion,
        status,
        executed_by: options.executedBy || null,
        rebuild_performed: options.rebuildPerformed || false,
        notes: options.notes || null,
        rollback_available: false, // 回滚操作本身不可再回滚
      })
      const result = data as { id: string }[] | null
      return result?.[0]?.id || null
    }
  } catch (error) {
    console.error('记录回滚历史失败:', error)
    return null
  }
}

/**
 * 执行回滚 API
 * POST /api/admin/upgrade/rollback
 * 
 * 请求体：
 * {
 *   target_version: string,  // 目标版本（如 v1.0.0）
 *   rebuild?: boolean        // 是否重新构建镜像
 * }
 * 
 * 返回流式输出（Server-Sent Events）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('只有管理员可以执行此操作')
    }

    // 解析请求体
    const body = await request.json()
    const validation = rollbackSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: '参数验证失败', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { target_version, rebuild } = validation.data
    const currentVersion = APP_VERSION

    // 确保版本号有 v 前缀
    const targetTag = target_version.startsWith('v') 
      ? target_version 
      : `v${target_version}`

    // 检查是否尝试回滚到当前版本
    const currentTag = currentVersion.startsWith('v') ? currentVersion : `v${currentVersion}`
    if (targetTag === currentTag) {
      return NextResponse.json(
        { error: '不能回滚到当前版本' },
        { status: 400 }
      )
    }

    // 获取项目根目录
    let projectRoot = process.env.PROJECT_ROOT
    
    if (!projectRoot) {
      const cwd = process.cwd()
      if (cwd.includes('/apps/web')) {
        projectRoot = resolve(cwd, '../..')
      } else {
        projectRoot = resolve(cwd, '../..')
      }
      
      if (!existsSync(resolve(projectRoot, 'scripts/deploy/quick-upgrade.sh'))) {
        let currentPath = projectRoot
        for (let i = 0; i < 5; i++) {
          const parentPath = resolve(currentPath, '..')
          if (parentPath === currentPath) break
          if (existsSync(resolve(parentPath, 'scripts/deploy/quick-upgrade.sh'))) {
            projectRoot = parentPath
            break
          }
          currentPath = parentPath
        }
      }
    }
    
    const upgradeScript = resolve(projectRoot, 'scripts/deploy/quick-upgrade.sh')
    
    // 验证脚本文件是否存在
    if (!existsSync(upgradeScript)) {
      return NextResponse.json(
        {
          error: {
            code: 'SCRIPT_NOT_FOUND',
            message: '升级脚本未找到',
            details: `路径: ${upgradeScript}`,
          },
        },
        { status: 404 }
      )
    }

    // 构建命令参数
    const args: string[] = ['--tag', targetTag]
    if (rebuild) {
      args.push('--rebuild')
    }

    // 记录回滚开始
    const historyId = await recordRollbackHistory(
      currentVersion,
      targetTag,
      'running',
      {
        executedBy: admin.id,
        rebuildPerformed: rebuild,
        notes: `回滚从 ${currentVersion} 到 ${targetTag}`,
      }
    )

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // 发送开始消息
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', message: `开始回滚到版本 ${targetTag}...` })}\n\n`)
        )

        // 执行升级脚本（回滚就是升级到旧版本）
        const child = spawn('bash', [upgradeScript, ...args], {
          cwd: projectRoot,
          env: {
            ...process.env,
            PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          },
        })

        let stdoutBuffer = ''
        let stderrBuffer = ''

        // 处理标准输出
        child.stdout.on('data', (data: Buffer) => {
          const text = data.toString()
          stdoutBuffer += text
          
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.trim()) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`)
              )
            }
          }
        })

        // 处理错误输出
        child.stderr.on('data', (data: Buffer) => {
          const text = data.toString()
          stderrBuffer += text
          
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.trim()) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'stderr', message: line })}\n\n`)
              )
            }
          }
        })

        // 处理进程退出
        child.on('close', async (code) => {
          if (code === 0) {
            // 记录回滚成功
            if (historyId) {
              await recordRollbackHistory(currentVersion, targetTag, 'rolled_back', {
                historyId,
                notes: `回滚成功完成`,
              })
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'success', message: `已成功回滚到版本 ${targetTag}` })}\n\n`)
            )
          } else {
            // 记录回滚失败
            if (historyId) {
              await recordRollbackHistory(currentVersion, targetTag, 'failed', {
                historyId,
                errorMessage: stderrBuffer.slice(0, 1000),
                notes: `回滚失败，退出码: ${code}`,
              })
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'error', 
                  message: `回滚失败，退出码: ${code}`,
                  stdout: stdoutBuffer,
                  stderr: stderrBuffer,
                })}\n\n`
              )
            )
          }
          controller.close()
        })

        // 处理错误
        child.on('error', async (error) => {
          if (historyId) {
            await recordRollbackHistory(currentVersion, targetTag, 'failed', {
              historyId,
              errorMessage: error.message,
              notes: `执行脚本失败`,
            })
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'error', 
                message: `执行回滚脚本失败: ${error.message}`,
              })}\n\n`
            )
          )
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('执行回滚 API 错误:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器错误',
          details: error instanceof Error ? error.message : '未知错误',
        },
      },
      { status: 500 }
    )
  }
}
