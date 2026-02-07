import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { ApiError } from '@/lib/validation/error-handler'
import { createAdminClient } from '@/lib/database'
import { APP_VERSION } from '@/lib/version'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { existsSync } from 'fs'

interface UpgradeRequestBody {
  skipRestart?: boolean      // 是否跳过容器重启
  rebuildImages?: boolean    // 是否重新构建镜像
  targetVersion?: string     // 目标版本（Git Tag，如 v1.1.0）
}

/**
 * 记录升级历史
 */
async function recordUpgradeHistory(
  fromVersion: string,
  toVersion: string,
  status: 'pending' | 'running' | 'success' | 'failed',
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
        completed_at: status === 'success' || status === 'failed' ? new Date().toISOString() : null,
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
      })
      const result = data as { id: string }[] | null
      return result?.[0]?.id || null
    }
  } catch (error) {
    console.error('记录升级历史失败:', error)
    return null
  }
}

/**
 * 执行升级 API
 * POST /api/admin/upgrade/execute
 * 
 * 请求体：
 * {
 *   skipRestart?: boolean,    // 是否跳过容器重启（使用 --no-restart）
 *   rebuildImages?: boolean,  // 是否重新构建镜像（使用 --rebuild）
 *   targetVersion?: string    // 目标版本 Tag（如 v1.1.0）
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
    let body: UpgradeRequestBody = {}
    try {
      const bodyText = await request.text()
      if (bodyText) {
        body = JSON.parse(bodyText)
      }
    } catch {
      // 忽略解析错误，使用默认值
    }

    // 验证目标版本格式（如果指定）
    if (body.targetVersion) {
      const versionPattern = /^v?\d+\.\d+\.\d+(-[\w.]+)?$/
      if (!versionPattern.test(body.targetVersion)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_VERSION',
              message: '无效的版本号格式',
              details: `版本号应为 v1.0.0 格式，收到: ${body.targetVersion}`,
            },
          },
          { status: 400 }
        )
      }
    }

    // 获取项目根目录
    // 优先级：环境变量 PROJECT_ROOT > 从当前文件位置推断
    // 注意：不要硬编码容器路径，应该通过环境变量配置
    let projectRoot = process.env.PROJECT_ROOT
    
    if (!projectRoot) {
      // 从当前工作目录推断（适用于开发环境和未配置 PROJECT_ROOT 的情况）
      const cwd = process.cwd()
      // 如果当前在 apps/web 目录，向上两级到项目根目录
      if (cwd.includes('/apps/web')) {
        projectRoot = resolve(cwd, '../..')
      } else {
        // 否则尝试从当前目录向上查找
        projectRoot = resolve(cwd, '../..')
      }
      
      // 验证推断的路径是否包含升级脚本
      if (!existsSync(resolve(projectRoot, 'scripts/deploy/quick-upgrade.sh'))) {
        // 如果推断的路径没有升级脚本，尝试向上查找
        let currentPath = projectRoot
        for (let i = 0; i < 5; i++) {
          const parentPath = resolve(currentPath, '..')
          if (parentPath === currentPath) break // 已到达根目录
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
    const args: string[] = []
    if (body.targetVersion) {
      // 确保版本号有 v 前缀
      const tag = body.targetVersion.startsWith('v') 
        ? body.targetVersion 
        : `v${body.targetVersion}`
      args.push('--tag', tag)
    }
    if (body.skipRestart) {
      args.push('--no-restart')
    }
    if (body.rebuildImages) {
      args.push('--rebuild')
    }

    // 获取目标版本
    const targetVersion = body.targetVersion || 'latest'
    const currentVersion = APP_VERSION

    // 记录升级开始
    const historyId = await recordUpgradeHistory(
      currentVersion,
      targetVersion,
      'running',
      {
        executedBy: admin.id,
        rebuildPerformed: body.rebuildImages,
        notes: `升级从 ${currentVersion} 到 ${targetVersion}`,
      }
    )

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // 发送开始消息
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', message: '开始升级...' })}\n\n`)
        )

        // 执行升级脚本
        const child = spawn('bash', [upgradeScript, ...args], {
          cwd: projectRoot,
          env: {
            ...process.env,
            // 确保脚本可以访问必要的环境变量
            PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          },
        })

        let stdoutBuffer = ''
        let stderrBuffer = ''

        // 处理标准输出
        child.stdout.on('data', (data: Buffer) => {
          const text = data.toString()
          stdoutBuffer += text
          
          // 按行发送输出
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
            // 记录升级成功
            if (historyId) {
              await recordUpgradeHistory(currentVersion, targetVersion, 'success', {
                historyId,
                notes: `升级成功完成`,
              })
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'success', message: '升级完成' })}\n\n`)
            )
          } else {
            // 记录升级失败
            if (historyId) {
              await recordUpgradeHistory(currentVersion, targetVersion, 'failed', {
                historyId,
                errorMessage: stderrBuffer.slice(0, 1000), // 限制错误信息长度
                notes: `升级失败，退出码: ${code}`,
              })
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'error', 
                  message: `升级失败，退出码: ${code}`,
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
          // 记录升级失败
          if (historyId) {
            await recordUpgradeHistory(currentVersion, targetVersion, 'failed', {
              historyId,
              errorMessage: error.message,
              notes: `执行脚本失败`,
            })
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'error', 
                message: `执行升级脚本失败: ${error.message}`,
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
    console.error('执行升级 API 错误:', error)
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
