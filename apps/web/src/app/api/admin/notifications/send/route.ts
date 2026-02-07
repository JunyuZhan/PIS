import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { createAdminClient } from '@/lib/database'
import { ApiError } from '@/lib/validation/error-handler'
import { z } from 'zod'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface Album {
  id: string
  title: string
  slug: string
  description: string | null
}

interface SystemSettings {
  key: string
  value: string
}

// 请求验证
const sendNotificationSchema = z.object({
  customer_id: z.string().uuid(),
  album_id: z.string().uuid(),
  type: z.enum(['album_ready', 'reminder', 'custom']).default('album_ready'),
  channel: z.enum(['email']).default('email'), // 目前只支持邮件
  subject: z.string().max(500).optional(),
  message: z.string().max(5000).optional(),
})

/**
 * POST /api/admin/notifications/send
 * 发送客户通知（如相册就绪通知）
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return ApiError.forbidden('需要管理员权限')
    }

    const body = await request.json()
    const validation = sendNotificationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: '参数验证失败', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { customer_id, album_id, type, channel, subject, message } = validation.data
    const db = await createAdminClient()

    // 获取客户信息
    const { data: customerData, error: customerError } = await db
      .from('customers')
      .select('id, name, email, phone')
      .eq('id', customer_id)
      .single()
    const customer = customerData as Customer | null

    if (customerError || !customer) {
      return NextResponse.json(
        { error: '客户不存在' },
        { status: 404 }
      )
    }

    // 检查邮箱
    if (channel === 'email' && !customer.email) {
      return NextResponse.json(
        { error: '客户没有设置邮箱地址' },
        { status: 400 }
      )
    }

    // 获取相册信息
    const { data: albumData, error: albumError } = await db
      .from('albums')
      .select('id, title, slug, description')
      .eq('id', album_id)
      .single()
    const album = albumData as Album | null

    if (albumError || !album) {
      return NextResponse.json(
        { error: '相册不存在' },
        { status: 404 }
      )
    }

    // 获取站点设置
    const { data: settingsData } = await db
      .from('system_settings')
      .select('key, value')
      .in('key', ['brand_name', 'site_title'])
    const settings = (settingsData || []) as SystemSettings[]

    const brandName = settings.find(s => s.key === 'brand_name')?.value || 'PIS Photography'
    
    // 构建相册链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL || 
                   'http://localhost:3000'
    const albumUrl = `${baseUrl}/album/${album.slug}`

    // 生成邮件内容
    const emailSubject = subject || `您的相册「${album.title}」已准备就绪`
    const emailContent = message || generateDefaultEmailContent({
      customerName: customer.name,
      albumTitle: album.title,
      albumDescription: album.description,
      albumUrl,
      brandName: String(brandName).replace(/"/g, ''),
    })

    // 记录通知（状态为 pending）
    const { data: notificationData, error: insertError } = await db.insert('notifications', {
      customer_id,
      album_id,
      type,
      channel,
      recipient: customer.email,
      subject: emailSubject,
      content: emailContent,
      status: 'pending',
      created_by: admin.id,
      metadata: {
        customer_name: customer.name,
        album_title: album.title,
        album_url: albumUrl,
      },
    })
    const notification = notificationData as { id: string }[] | null

    if (insertError) {
      console.error('创建通知记录失败:', insertError)
      return ApiError.internal('创建通知记录失败')
    }

    const notificationId = notification?.[0]?.id

    // 尝试发送邮件
    try {
      const sendResult = await sendEmail({
        to: customer.email!,
        subject: emailSubject,
        html: emailContent,
      })

      if (sendResult.success) {
        // 更新状态为已发送
        await db.update('notifications', {
          status: 'sent',
          sent_at: new Date().toISOString(),
        }, { id: notificationId })

        return NextResponse.json({
          success: true,
          message: '通知已发送',
          data: {
            notification_id: notificationId,
            recipient: customer.email,
            sent_at: new Date().toISOString(),
          },
        })
      } else {
        // 更新状态为失败
        await db.update('notifications', {
          status: 'failed',
          error_message: sendResult.error,
        }, { id: notificationId })

        return NextResponse.json({
          success: false,
          message: '邮件发送失败',
          error: sendResult.error,
          data: {
            notification_id: notificationId,
            status: 'failed',
          },
        }, { status: 500 })
      }
    } catch (sendError) {
      const errorMsg = sendError instanceof Error ? sendError.message : '发送失败'
      
      // 更新状态为失败
      await db.update('notifications', {
        status: 'failed',
        error_message: errorMsg,
      }, { id: notificationId })

      return NextResponse.json({
        success: false,
        message: '邮件发送失败',
        error: errorMsg,
        data: {
          notification_id: notificationId,
          status: 'failed',
        },
      }, { status: 500 })
    }
  } catch (error) {
    console.error('发送通知 API 错误:', error)
    return ApiError.internal('服务器错误')
  }
}

/**
 * 生成默认的相册就绪邮件内容
 */
function generateDefaultEmailContent(params: {
  customerName: string
  albumTitle: string
  albumDescription: string | null
  albumUrl: string
  brandName: string
}): string {
  const { customerName, albumTitle, albumDescription, albumUrl, brandName } = params
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>您的相册已准备就绪</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${brandName}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                亲爱的 <strong>${customerName}</strong>，
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                您的相册 <strong>「${albumTitle}」</strong> 已经准备就绪，欢迎查看和下载您的精彩照片！
              </p>
              
              ${albumDescription ? `
              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                ${albumDescription}
              </p>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${albumUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  查看相册
                </a>
              </div>
              
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                如果按钮无法点击，请复制以下链接到浏览器：
              </p>
              <p style="margin: 0 0 20px; color: #667eea; font-size: 14px; word-break: break-all;">
                ${albumUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                此邮件由 ${brandName} 自动发送，如有疑问请联系我们。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * 发送邮件
 * 使用 nodemailer 或环境变量中配置的 SMTP 服务
 */
async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html } = params

  // 检查是否配置了邮件服务
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || '587')
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('邮件服务未配置，通知将被标记为待发送状态')
    return {
      success: false,
      error: '邮件服务未配置。请在环境变量中设置 SMTP_HOST, SMTP_USER, SMTP_PASS',
    }
  }

  try {
    // 动态导入 nodemailer（可能未安装）
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

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
    })

    return { success: true }
  } catch (error) {
    console.error('发送邮件失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '发送失败',
    }
  }
}
