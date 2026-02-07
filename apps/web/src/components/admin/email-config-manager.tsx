'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Send, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { showSuccess, handleApiError, showError } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface EmailConfig {
  id?: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  smtp_pass?: string
  from_email: string
  from_name?: string
  is_active: boolean
  updated_at?: string
}

interface EnvConfig {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  from_email: string
  has_env_config: boolean
}

export function EmailConfigManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null)
  const [formData, setFormData] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    smtp_user: '',
    smtp_pass: '',
    from_email: '',
    from_name: '',
    is_active: true,
  })
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // 获取配置
  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notifications/email-config')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取配置失败')
      }

      if (data.data.config) {
        setConfig(data.data.config)
        setFormData({
          smtp_host: data.data.config.smtp_host || '',
          smtp_port: data.data.config.smtp_port || 587,
          smtp_secure: data.data.config.smtp_secure !== false,
          smtp_user: data.data.config.smtp_user || '',
          smtp_pass: '', // 不显示密码
          from_email: data.data.config.from_email || '',
          from_name: data.data.config.from_name || '',
          is_active: data.data.config.is_active !== false,
        })
      } else {
        // 使用环境变量配置作为初始值
        if (data.data.env_config?.has_env_config) {
          setFormData({
            smtp_host: data.data.env_config.smtp_host || '',
            smtp_port: data.data.env_config.smtp_port || 587,
            smtp_secure: true,
            smtp_user: data.data.env_config.smtp_user || '',
            smtp_pass: '',
            from_email: data.data.env_config.from_email || '',
            from_name: '',
            is_active: true,
          })
        }
      }

      setEnvConfig(data.data.env_config)
    } catch (error) {
      handleApiError(error, '获取邮件配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  // 保存配置
  const handleSave = async () => {
    try {
      setSaving(true)
      setTestResult(null)

      // 验证必填字段
      if (!formData.smtp_host || !formData.smtp_user || !formData.from_email) {
        showError('请填写所有必填字段')
        return
      }

      // 如果是新配置，必须提供密码
      if (!config && (!formData.smtp_pass || formData.smtp_pass.trim() === '')) {
        showError('创建新配置时必须填写 SMTP 密码')
        return
      }

      // 如果密码为空且已有配置，使用占位符（不更新密码）
      const submitData = {
        ...formData,
        smtp_pass: formData.smtp_pass && formData.smtp_pass.trim() !== '' 
          ? formData.smtp_pass 
          : (config ? '******' : ''),
      }

      const response = await fetch('/api/admin/notifications/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存失败')
      }

      showSuccess('邮件配置已保存')
      await fetchConfig()
    } catch (error) {
      handleApiError(error, '保存邮件配置失败')
    } finally {
      setSaving(false)
    }
  }

  // 测试邮件
  const handleTest = async () => {
    if (!testEmail) {
      showError('请输入测试邮箱地址')
      return
    }

    try {
      setTesting(true)
      setTestResult(null)

      const response = await fetch('/api/admin/notifications/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmail }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({ success: true, message: data.message })
        showSuccess(data.message)
      } else {
        setTestResult({ success: false, message: data.message || data.error || '测试失败' })
        showError(data.message || data.error || '测试失败')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '测试失败'
      setTestResult({ success: false, message })
      handleApiError(error, '测试邮件失败')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 配置来源提示 */}
      {envConfig?.has_env_config && !config && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                当前使用环境变量配置
              </p>
              <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                建议在数据库中保存配置，这样可以随时修改而无需重启服务
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 配置表单 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SMTP 服务器 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              SMTP 服务器地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.smtp_host}
              onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
              placeholder="smtp.qq.com"
              className="input w-full"
            />
            <p className="text-xs text-text-muted mt-1">
              常用：QQ邮箱 smtp.qq.com，163邮箱 smtp.163.com，Gmail smtp.gmail.com
            </p>
          </div>

          {/* SMTP 端口 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              SMTP 端口 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.smtp_port}
              onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
              className="input w-full"
            >
              <option value="587">587 (TLS，推荐)</option>
              <option value="465">465 (SSL)</option>
              <option value="25">25 (不加密，不推荐)</option>
            </select>
          </div>

          {/* SMTP 用户名 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              SMTP 用户名（邮箱地址） <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.smtp_user}
              onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
              placeholder="your-email@qq.com"
              className="input w-full"
            />
          </div>

          {/* SMTP 密码 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              SMTP 密码/授权码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.smtp_pass}
                onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                placeholder={config ? '留空则不修改密码' : '请输入密码或授权码'}
                className="input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1">
              QQ邮箱/163邮箱需要使用授权码，而非登录密码
            </p>
          </div>

          {/* 发件人邮箱 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              发件人邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              placeholder="noreply@yourdomain.com"
              className="input w-full"
            />
          </div>

          {/* 发件人名称 */}
          <div>
            <label className="block text-sm font-medium mb-1">发件人名称（可选）</label>
            <input
              type="text"
              value={formData.from_name || ''}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              placeholder="PIS Photography"
              className="input w-full"
            />
          </div>
        </div>

        {/* 启用状态 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
            启用邮件服务
          </label>
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'btn-primary flex items-center gap-2',
              saving && 'opacity-50 cursor-not-allowed'
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存配置
          </button>

          {config && (
            <span className="text-xs text-text-muted">
              最后更新：{config.updated_at ? new Date(config.updated_at).toLocaleString('zh-CN') : '未知'}
            </span>
          )}
        </div>
      </div>

      {/* 测试邮件 */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-accent" />
          测试邮件配置
        </h3>
        <p className="text-sm text-text-muted mb-4">
          保存配置后，可以发送测试邮件验证配置是否正确
        </p>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="input w-full"
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !testEmail}
            className={cn(
              'btn-secondary flex items-center gap-2',
              (testing || !testEmail) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            发送测试邮件
          </button>
        </div>

        {testResult && (
          <div
            className={cn(
              'mt-4 p-4 rounded-lg flex items-start gap-3',
              testResult.success
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            )}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {testResult.success ? '测试成功' : '测试失败'}
              </p>
              <p
                className={cn(
                  'text-xs mt-1',
                  testResult.success
                    ? 'text-green-600/80 dark:text-green-400/80'
                    : 'text-red-600/80 dark:text-red-400/80'
                )}
              >
                {testResult.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
