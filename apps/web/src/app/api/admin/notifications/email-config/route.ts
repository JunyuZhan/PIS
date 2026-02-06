import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { createAdminClient } from '@/lib/database'
import { ApiError } from '@/lib/validation/error-handler'
import { z } from 'zod'

// 邮件配置验证
const emailConfigSchema = z.object({
  smtp_host: z.string().min(1, '请输入 SMTP 服务器地址'),
  smtp_port: z.number().min(1).max(65535).default(587),
  smtp_secure: z.boolean().default(true),
  smtp_user: z.string().min(1, '请输入 SMTP 用户名'),
  smtp_pass: z.string().min(1, '请输入 SMTP 密码'),
  from_email: z.string().email('请输入有效的发件人邮箱'),
  from_name: z.string().optional(),
  is_active: z.boolean().default(true),
})

/**
 * GET /api/admin/notifications/email-config
 * 获取邮件配置
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('需要管理员权限')
    }

    const db = await createAdminClient()
    const { data: config, error } = await db
      .from('email_config')
      .select('id, smtp_host, smtp_port, smtp_secure, smtp_user, from_email, from_name, is_active, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 如果数据库中没有配置，检查环境变量
    const envConfig = {
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_user: process.env.SMTP_USER || '',
      from_email: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      has_env_config: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    }

    if (error || !config) {
      return NextResponse.json({
        success: true,
        data: {
          config: null,
          env_config: envConfig,
        },
      })
    }

    // 不返回密码
    return NextResponse.json({
      success: true,
      data: {
        config: {
          ...config,
          smtp_pass: config.smtp_pass ? '******' : '', // 隐藏密码
        },
        env_config: envConfig,
      },
    })
  } catch (error) {
    console.error('获取邮件配置失败:', error)
    return ApiError.internal('服务器错误')
  }
}

/**
 * POST /api/admin/notifications/email-config
 * 保存邮件配置
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('需要管理员权限')
    }

    const body = await request.json()
    const validation = emailConfigSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: '参数验证失败', details: validation.error.errors },
        { status: 400 }
      )
    }

    const configData = validation.data
    const db = await createAdminClient()

    // 检查是否已有配置
    const { data: existing } = await db
      .from('email_config')
      .select('id')
      .limit(1)
      .single()

    if (existing) {
      // 更新配置
      const updateData: Record<string, unknown> = {
        smtp_host: configData.smtp_host,
        smtp_port: configData.smtp_port,
        smtp_secure: configData.smtp_secure,
        smtp_user: configData.smtp_user,
        from_email: configData.from_email,
        from_name: configData.from_name,
        is_active: configData.is_active,
        updated_at: new Date().toISOString(),
      }
      
      // 只有当密码不是占位符时才更新
      if (configData.smtp_pass && configData.smtp_pass !== '******') {
        updateData.smtp_pass = configData.smtp_pass
      }

      const { error: updateError } = await db.update('email_config', updateData, { id: existing.id })

      if (updateError) {
        console.error('更新邮件配置失败:', updateError)
        return ApiError.internal('更新邮件配置失败')
      }
    } else {
      // 创建新配置
      const { error: insertError } = await db.insert('email_config', {
        ...configData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('创建邮件配置失败:', insertError)
        return ApiError.internal('创建邮件配置失败')
      }
    }

    return NextResponse.json({
      success: true,
      message: '邮件配置已保存',
    })
  } catch (error) {
    console.error('保存邮件配置失败:', error)
    return ApiError.internal('服务器错误')
  }
}

/**
 * DELETE /api/admin/notifications/email-config
 * 测试邮件配置
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('需要管理员权限')
    }

    const body = await request.json()
    const { test_email } = body

    if (!test_email) {
      return NextResponse.json(
        { error: '请提供测试邮箱地址' },
        { status: 400 }
      )
    }

    // 获取邮件配置
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({
        success: false,
        message: '邮件服务未配置',
        error: '请在环境变量中设置 SMTP_HOST, SMTP_USER, SMTP_PASS',
      }, { status: 400 })
    }

    try {
      const nodemailer = await import('nodemailer')
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      // 发送测试邮件
      await transporter.sendMail({
        from: fromEmail,
        to: test_email,
        subject: 'PIS 邮件配置测试',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>🎉 邮件配置成功！</h2>
            <p>如果您收到这封邮件，说明 PIS 系统的邮件服务已正确配置。</p>
            <p style="color: #666; font-size: 12px;">发送时间：${new Date().toLocaleString('zh-CN')}</p>
          </div>
        `,
      })

      return NextResponse.json({
        success: true,
        message: `测试邮件已发送到 ${test_email}`,
      })
    } catch (sendError) {
      console.error('测试邮件发送失败:', sendError)
      return NextResponse.json({
        success: false,
        message: '邮件发送失败',
        error: sendError instanceof Error ? sendError.message : '未知错误',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('测试邮件配置失败:', error)
    return ApiError.internal('服务器错误')
  }
}
