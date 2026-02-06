'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Loader2, Send, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { showSuccess, handleApiError } from '@/lib/toast'

interface Customer {
  id: string
  name: string
  email: string | null
}

interface Album {
  id: string
  title: string
  slug: string
}

interface SendNotificationDialogProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  onSent?: () => void
}

export function SendNotificationDialog({ 
  open, 
  customer, 
  onClose, 
  onSent 
}: SendNotificationDialogProps) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<string>('')
  const [customSubject, setCustomSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'album_ready' | 'custom'>('album_ready')

  // 获取客户关联的相册
  const { data: albumsData, isLoading: loadingAlbums } = useQuery<{ albums: Album[] }>({
    queryKey: ['customer-albums', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return { albums: [] }
      const res = await fetch(`/api/admin/customers/${customer.id}`)
      if (!res.ok) throw new Error('获取相册列表失败')
      return res.json()
    },
    enabled: open && !!customer?.id,
  })

  // 重置状态
  useEffect(() => {
    if (open) {
      setResult(null)
      setSelectedAlbum('')
      setCustomSubject('')
      setCustomMessage('')
      setNotificationType('album_ready')
    }
  }, [open, customer])

  const handleSend = async () => {
    if (!customer || !selectedAlbum) {
      handleApiError(new Error('请选择要通知的相册'))
      return
    }

    if (!customer.email) {
      handleApiError(new Error('该客户没有设置邮箱地址'))
      return
    }

    try {
      setSending(true)
      setResult(null)

      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          album_id: selectedAlbum,
          type: notificationType,
          channel: 'email',
          subject: customSubject || undefined,
          message: customMessage || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({ success: true, message: `通知已发送到 ${customer.email}` })
        showSuccess('通知已发送')
        onSent?.()
      } else {
        setResult({ 
          success: false, 
          message: data.error || data.message || '发送失败' 
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '发送失败'
      setResult({ success: false, message: errorMsg })
      handleApiError(error, '发送通知失败')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">发送通知</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-elevated rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 客户信息 */}
          <div className="bg-surface-elevated rounded-lg p-4">
            <div className="text-sm text-text-muted mb-1">发送给</div>
            <div className="font-medium">{customer?.name}</div>
            {customer?.email ? (
              <div className="text-sm text-text-secondary">{customer.email}</div>
            ) : (
              <div className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4" />
                该客户没有设置邮箱地址
              </div>
            )}
          </div>

          {/* 选择相册 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              选择相册 <span className="text-red-500">*</span>
            </label>
            {loadingAlbums ? (
              <div className="flex items-center gap-2 text-text-muted text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                加载相册列表...
              </div>
            ) : albumsData?.albums && albumsData.albums.length > 0 ? (
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="input"
              >
                <option value="">请选择相册</option>
                {albumsData.albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-text-muted py-2">
                该客户没有关联的相册
              </div>
            )}
          </div>

          {/* 通知类型 */}
          <div>
            <label className="block text-sm font-medium mb-2">通知类型</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="notificationType"
                  value="album_ready"
                  checked={notificationType === 'album_ready'}
                  onChange={() => setNotificationType('album_ready')}
                  className="text-accent"
                />
                <span className="text-sm">相册就绪通知</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="notificationType"
                  value="custom"
                  checked={notificationType === 'custom'}
                  onChange={() => setNotificationType('custom')}
                  className="text-accent"
                />
                <span className="text-sm">自定义通知</span>
              </label>
            </div>
          </div>

          {/* 自定义内容 */}
          {notificationType === 'custom' && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1">邮件主题</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="留空使用默认主题"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">邮件内容</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="留空使用默认内容（包含相册链接的精美模板）"
                  className="input min-h-[120px] resize-none"
                />
                <div className="text-xs text-text-muted mt-1">
                  留空将使用系统默认的精美邮件模板
                </div>
              </div>
            </div>
          )}

          {/* 发送结果 */}
          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              result.success 
                ? 'bg-green-500/10 text-green-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm">{result.message}</div>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={sending}
            >
              {result?.success ? '关闭' : '取消'}
            </button>
            {!result?.success && (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !customer?.email || !selectedAlbum}
                className="flex-1 btn-primary"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    发送通知
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
