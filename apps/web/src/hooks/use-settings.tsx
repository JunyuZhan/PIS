'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

export interface SystemSettings {
  // 品牌
  brand_name: string
  brand_tagline: string
  brand_logo: string | null
  brand_favicon: string | null
  copyright_text: string
  icp_number: string
  police_number: string
  // 站点
  site_title: string
  site_description: string
  site_keywords: string
  // 社交
  social_wechat_qrcode: string | null
  social_weibo: string
  social_instagram: string
  social_email: string
  social_phone: string
  // 主题
  theme_mode: 'light' | 'dark' | 'system'
  theme_primary_color: string
}

interface SettingsContextValue {
  settings: SystemSettings | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const defaultSettings: SystemSettings = {
  brand_name: 'PIS Photography',
  brand_tagline: '专业活动摄影',
  brand_logo: null,
  brand_favicon: null,
  copyright_text: '',
  icp_number: '',
  police_number: '',
  site_title: 'PIS - 即时影像分享',
  site_description: '专业级私有化即时摄影分享系统',
  site_keywords: '摄影,相册,分享,活动摄影',
  social_wechat_qrcode: null,
  social_weibo: '',
  social_instagram: '',
  social_email: '',
  social_phone: '',
  theme_mode: 'system',
  theme_primary_color: '#4F46E5',
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  loading: false,
  error: null,
  refresh: async () => {},
})

/**
 * 设置 Provider 组件
 * 在应用根部使用，提供全局设置访问
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/public/settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.data as SystemSettings)
      } else {
        throw new Error(data.error || '获取设置失败')
      }
    } catch (err) {
      console.error('获取设置失败:', err)
      setError(err instanceof Error ? err.message : '获取设置失败')
      // 使用默认值
      setSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <SettingsContext.Provider 
      value={{ 
        settings: settings || defaultSettings, 
        loading, 
        error,
        refresh: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

/**
 * 获取公开设置 Hook
 * 用于前台组件访问系统设置
 */
export function useSettings() {
  return useContext(SettingsContext)
}

/**
 * 获取管理设置 Hook
 * 用于后台管理页面，包含更新功能
 */
export function useAdminSettings() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [allSettings, setAllSettings] = useState<Array<{
    key: string
    value: unknown
    category: string
    description: string
    is_public: boolean
  }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取设置失败')
      }

      setAllSettings(data.data.settings)
      setSettings(data.data.grouped)
    } catch (err) {
      console.error('获取管理设置失败:', err)
      setError(err instanceof Error ? err.message : '获取设置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updates: Record<string, unknown>) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存设置失败')
      }

      // 重新获取设置
      await fetchSettings()
      
      return { success: true, message: data.message }
    } catch (err) {
      console.error('保存设置失败:', err)
      const message = err instanceof Error ? err.message : '保存设置失败'
      setError(message)
      return { success: false, message }
    } finally {
      setSaving(false)
    }
  }, [fetchSettings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    allSettings,
    loading,
    saving,
    error,
    refresh: fetchSettings,
    updateSettings,
  }
}
