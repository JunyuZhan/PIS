'use client'

import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react'
import Image from 'next/image'
import { 
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Building2,
  Globe,
  Link2,
  Palette,
  Settings as SettingsIcon,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react'
import { showSuccess, handleApiError, showError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'

interface SettingsFormData {
  // 品牌
  brand_name: string
  brand_tagline: string
  copyright_text: string
  icp_number: string
  police_number: string
  logo_url: string
  favicon_url: string
  // 站点
  site_title: string
  site_description: string
  site_keywords: string
  // 功能
  allow_public_home: boolean
  default_watermark_enabled: boolean
  default_allow_download: boolean
  default_show_exif: boolean
  polling_interval: number
  // 社交
  social_email: string
  social_phone: string
  social_weibo: string
  social_instagram: string
  wechat_qrcode_url: string
  // 主题
  theme_mode: string
  theme_primary_color: string
  theme_border_radius: string
}

const defaultFormData: SettingsFormData = {
  brand_name: 'PIS Photography',
  brand_tagline: '专业活动摄影',
  copyright_text: '',
  icp_number: '',
  police_number: '',
  logo_url: '',
  favicon_url: '',
  site_title: 'PIS - 即时影像分享',
  site_description: '专业级私有化即时摄影分享系统',
  site_keywords: '摄影,相册,分享,活动摄影',
  allow_public_home: true,
  default_watermark_enabled: false,
  default_allow_download: true,
  default_show_exif: true,
  polling_interval: 3000,
  social_email: '',
  social_phone: '',
  social_weibo: '',
  social_instagram: '',
  wechat_qrcode_url: '',
  theme_mode: 'system',
  theme_primary_color: '#D4AF37',
  theme_border_radius: 'md',
}

type SectionId = 'brand' | 'site' | 'feature' | 'social' | 'theme'

export function SystemSettingsSection() {
  const [formData, setFormData] = useState<SettingsFormData>(defaultFormData)
  const [initialData, setInitialData] = useState<SettingsFormData>(defaultFormData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(['brand']))
  
  // 获取主题控制钩子
  const { setTheme, setPrimaryColor, setBorderRadius } = useTheme()
  
  // 上传状态
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  // 处理文件上传
  const handleFileUpload = async (
    file: File,
    type: 'logo' | 'favicon' | 'wechat_qrcode',
    fieldKey: keyof SettingsFormData
  ) => {
    // 防止重复上传
    if (uploading[type]) {
      console.warn(`[Settings] Upload already in progress for ${type}`)
      return
    }

    setUploading(prev => ({ ...prev, [type]: true }))
    
    try {
      console.log(`[Settings] Uploading ${type}:`, file.name, file.size)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      // 创建带超时的 AbortController
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时（文件上传需要更长时间）

      try {
        const response = await fetch('/api/admin/settings/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // 检查响应状态
        if (!response.ok) {
          let errorMessage = '上传失败'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            console.error('[Settings] Upload error:', errorData)
          } catch {
            errorMessage = `上传失败: ${response.status} ${response.statusText}`
          }
          throw new Error(errorMessage)
        }
        
        const data = await response.json()
        console.log('[Settings] Upload success:', data)
        
        if (!data.success && !data.data?.url) {
          throw new Error(data.error || '上传失败')
        }
        
        // 更新表单数据
        updateField(fieldKey, data.data.url)
        showSuccess('上传成功')
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId)
        
        // 处理 AbortError（超时）
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('上传超时，请检查网络连接后重试')
        }
        
        throw fetchError
      }
    } catch (error) {
      console.error(`[Settings] Upload ${type} failed:`, error)
      handleApiError(error, `上传${type === 'logo' ? 'Logo' : type === 'favicon' ? 'Favicon' : '微信二维码'}失败`)
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  // 获取设置
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取设置失败')
      }

      // 解析设置到表单数据
      const grouped = data.data.grouped as Record<string, Record<string, unknown>>
      const newFormData: SettingsFormData = { ...defaultFormData }

      // 品牌设置
      if (grouped.brand) {
        newFormData.brand_name = (grouped.brand.brand_name as string) || defaultFormData.brand_name
        newFormData.brand_tagline = (grouped.brand.brand_tagline as string) || defaultFormData.brand_tagline
        newFormData.copyright_text = (grouped.brand.copyright_text as string) || ''
        newFormData.icp_number = (grouped.brand.icp_number as string) || ''
        newFormData.police_number = (grouped.brand.police_number as string) || ''
        newFormData.logo_url = (grouped.brand.logo_url as string) || (grouped.brand.brand_logo as string) || ''
        newFormData.favicon_url = (grouped.brand.favicon_url as string) || (grouped.brand.brand_favicon as string) || ''
      }

      // 站点设置
      if (grouped.site) {
        newFormData.site_title = (grouped.site.site_title as string) || defaultFormData.site_title
        newFormData.site_description = (grouped.site.site_description as string) || defaultFormData.site_description
        newFormData.site_keywords = (grouped.site.site_keywords as string) || defaultFormData.site_keywords
      }

      // 功能设置
      if (grouped.feature) {
        newFormData.allow_public_home = grouped.feature.allow_public_home !== false
        newFormData.default_watermark_enabled = grouped.feature.default_watermark_enabled === true
        newFormData.default_allow_download = grouped.feature.default_allow_download !== false
        newFormData.default_show_exif = grouped.feature.default_show_exif !== false
        newFormData.polling_interval = parseInt(String(grouped.feature.polling_interval)) || 3000
      }

      // 社交设置
      if (grouped.social) {
        newFormData.social_email = (grouped.social.social_email as string) || ''
        newFormData.social_phone = (grouped.social.social_phone as string) || ''
        newFormData.social_weibo = (grouped.social.social_weibo as string) || ''
        newFormData.social_instagram = (grouped.social.social_instagram as string) || ''
        newFormData.wechat_qrcode_url = (grouped.social.wechat_qrcode_url as string) || (grouped.social.social_wechat_qrcode as string) || ''
      }

      // 主题设置
      if (grouped.theme) {
        newFormData.theme_mode = (grouped.theme.theme_mode as string) || 'system'
        newFormData.theme_primary_color = (grouped.theme.theme_primary_color as string) || '#D4AF37'
        newFormData.theme_border_radius = (grouped.theme.theme_border_radius as string) || 'md'
      }

      setFormData(newFormData)
      setInitialData(newFormData)
    } catch (error) {
      console.error('获取设置失败:', error)
      handleApiError(error, '获取设置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // 更新表单字段
  const updateField = <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // 检查是否有更改
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData)

  // 保存设置
  const handleSave = async (e?: MouseEvent<HTMLButtonElement>) => {
    // 阻止事件冒泡
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // 检查是否有更改
    if (!hasChanges) {
      showError('没有需要保存的更改')
      return
    }

    // 防止重复点击
    if (saving) {
      return
    }

    try {
      setSaving(true)
      
      // 收集所有更改的设置
      const updates: Record<string, unknown> = {}
      
      // 对比并只发送更改的字段
      for (const [key, value] of Object.entries(formData)) {
        const initialValue = initialData[key as keyof SettingsFormData]
        if (value !== initialValue) {
          updates[key] = value
        }
      }

      // 如果没有需要更新的字段，直接返回
      if (Object.keys(updates).length === 0) {
        setSaving(false)
        showError('没有需要保存的更改')
        return
      }

      console.log('[Settings] Saving updates:', updates)

      // 创建带超时的 AbortController
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updates }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // 检查响应状态
        if (!response.ok) {
          let errorMessage = '保存失败'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            console.error('[Settings] Save error:', errorData)
          } catch {
            // 如果响应不是 JSON，使用状态文本
            errorMessage = `保存失败: ${response.status} ${response.statusText}`
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log('[Settings] Save success:', data)

        if (!data.success) {
          throw new Error(data.error || '保存失败')
        }

        showSuccess(data.message || '设置已保存')
        setInitialData(formData)
        
        // 同步主题设置到 ThemeProvider
        if ('theme_mode' in updates) {
          setTheme(formData.theme_mode as 'light' | 'dark' | 'system')
        }
        if ('theme_primary_color' in updates) {
          setPrimaryColor(formData.theme_primary_color)
        }
        if ('theme_border_radius' in updates) {
          setBorderRadius(formData.theme_border_radius as 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full')
        }
        
        // 触发前台设置刷新（通过自定义事件）
        // 前台 SettingsProvider 会监听此事件并刷新设置
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('settings-updated'))
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId)
        
        // 处理 AbortError（超时）
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('请求超时，请检查网络连接后重试')
        }
        
        throw fetchError
      }
    } catch (error) {
      console.error('[Settings] Save failed:', error)
      handleApiError(error, '保存设置失败')
    } finally {
      setSaving(false)
    }
  }

  // 切换展开状态
  const toggleSection = (section: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 品牌信息 */}
      <Section
        id="brand"
        title="品牌信息"
        icon={<Building2 className="w-4 h-4" />}
        expanded={expandedSections.has('brand')}
        onToggle={() => toggleSection('brand')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">品牌名称</label>
            <input
              type="text"
              value={formData.brand_name}
              onChange={(e) => updateField('brand_name', e.target.value)}
              className="input w-full"
              placeholder="例如：XX 摄影工作室"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">品牌标语</label>
            <input
              type="text"
              value={formData.brand_tagline}
              onChange={(e) => updateField('brand_tagline', e.target.value)}
              className="input w-full"
              placeholder="例如：专业活动摄影"
            />
          </div>
          
          {/* Logo 上传 */}
          <div>
            <label className="block text-sm font-medium mb-1">网站 Logo</label>
            <ImageUploader
              value={formData.logo_url}
              onChange={(url) => updateField('logo_url', url)}
              onUpload={(file) => handleFileUpload(file, 'logo', 'logo_url')}
              uploading={uploading.logo}
              placeholder="上传 Logo（PNG/JPG/SVG，最大 2MB）"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              previewSize="large"
            />
          </div>
          
          {/* Favicon 上传 */}
          <div>
            <label className="block text-sm font-medium mb-1">网站图标 (Favicon)</label>
            <ImageUploader
              value={formData.favicon_url}
              onChange={(url) => updateField('favicon_url', url)}
              onUpload={(file) => handleFileUpload(file, 'favicon', 'favicon_url')}
              uploading={uploading.favicon}
              placeholder="上传 Favicon（PNG/ICO，最大 512KB）"
              accept="image/png,image/x-icon,image/svg+xml"
              previewSize="small"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">版权声明</label>
            <input
              type="text"
              value={formData.copyright_text}
              onChange={(e) => updateField('copyright_text', e.target.value)}
              className="input w-full"
              placeholder="留空则使用品牌名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ICP 备案号</label>
            <input
              type="text"
              value={formData.icp_number}
              onChange={(e) => updateField('icp_number', e.target.value)}
              className="input w-full"
              placeholder="例如：京ICP备12345678号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">公安备案号</label>
            <input
              type="text"
              value={formData.police_number}
              onChange={(e) => updateField('police_number', e.target.value)}
              className="input w-full"
              placeholder="例如：京公网安备 11010102001234号"
            />
          </div>
        </div>
      </Section>

      {/* 站点设置 */}
      <Section
        id="site"
        title="SEO 设置"
        icon={<Globe className="w-4 h-4" />}
        expanded={expandedSections.has('site')}
        onToggle={() => toggleSection('site')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">站点标题</label>
            <input
              type="text"
              value={formData.site_title}
              onChange={(e) => updateField('site_title', e.target.value)}
              className="input w-full"
              placeholder="显示在浏览器标签页"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">站点描述</label>
            <textarea
              value={formData.site_description}
              onChange={(e) => updateField('site_description', e.target.value)}
              className="input w-full"
              rows={2}
              placeholder="用于搜索引擎优化"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SEO 关键词</label>
            <input
              type="text"
              value={formData.site_keywords}
              onChange={(e) => updateField('site_keywords', e.target.value)}
              className="input w-full"
              placeholder="用逗号分隔，如：摄影,相册,婚礼"
            />
          </div>
        </div>
      </Section>

      {/* 功能开关 */}
      <Section
        id="feature"
        title="功能开关"
        icon={<SettingsIcon className="w-4 h-4" />}
        expanded={expandedSections.has('feature')}
        onToggle={() => toggleSection('feature')}
      >
        <div className="space-y-3">
          <ToggleItem
            label="允许游客访问首页"
            description="关闭后游客需要登录才能查看首页"
            checked={formData.allow_public_home}
            onChange={(v) => updateField('allow_public_home', v)}
          />
          <ToggleItem
            label="新相册默认启用水印"
            description="创建相册时默认开启水印功能"
            checked={formData.default_watermark_enabled}
            onChange={(v) => updateField('default_watermark_enabled', v)}
          />
          <ToggleItem
            label="新相册默认允许下载"
            description="创建相册时默认允许访客下载照片"
            checked={formData.default_allow_download}
            onChange={(v) => updateField('default_allow_download', v)}
          />
          <ToggleItem
            label="新相册默认显示 EXIF"
            description="创建相册时默认显示照片拍摄信息"
            checked={formData.default_show_exif}
            onChange={(v) => updateField('default_show_exif', v)}
          />
          <div className="pt-2">
            <label className="block text-sm font-medium mb-1">实时更新间隔</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.polling_interval}
                onChange={(e) => updateField('polling_interval', parseInt(e.target.value) || 3000)}
                className="input w-32"
                min={1000}
                max={30000}
                step={500}
              />
              <span className="text-sm text-text-muted">毫秒</span>
            </div>
          </div>
        </div>
      </Section>

      {/* 社交链接 */}
      <Section
        id="social"
        title="联系方式"
        icon={<Link2 className="w-4 h-4" />}
        expanded={expandedSections.has('social')}
        onToggle={() => toggleSection('social')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">联系邮箱</label>
            <input
              type="email"
              value={formData.social_email}
              onChange={(e) => updateField('social_email', e.target.value)}
              className="input w-full"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">联系电话</label>
            <input
              type="tel"
              value={formData.social_phone}
              onChange={(e) => updateField('social_phone', e.target.value)}
              className="input w-full"
              placeholder="138-xxxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">微博链接</label>
            <input
              type="url"
              value={formData.social_weibo}
              onChange={(e) => updateField('social_weibo', e.target.value)}
              className="input w-full"
              placeholder="https://weibo.com/u/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instagram</label>
            <input
              type="url"
              value={formData.social_instagram}
              onChange={(e) => updateField('social_instagram', e.target.value)}
              className="input w-full"
              placeholder="https://instagram.com/..."
            />
          </div>
          
          {/* 微信二维码上传 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">微信二维码</label>
            <ImageUploader
              value={formData.wechat_qrcode_url}
              onChange={(url) => updateField('wechat_qrcode_url', url)}
              onUpload={(file) => handleFileUpload(file, 'wechat_qrcode', 'wechat_qrcode_url')}
              uploading={uploading.wechat_qrcode}
              placeholder="上传微信二维码（PNG/JPG，最大 1MB）"
              accept="image/png,image/jpeg,image/webp"
              previewSize="medium"
            />
            <p className="text-xs text-text-muted mt-1">用于在页脚或联系方式中显示微信二维码</p>
          </div>
        </div>
      </Section>

      {/* 主题设置 */}
      <Section
        id="theme"
        title="主题外观"
        icon={<Palette className="w-4 h-4" />}
        expanded={expandedSections.has('theme')}
        onToggle={() => toggleSection('theme')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">主题模式</label>
            <div className="flex gap-2">
              {[
                { value: 'light', label: '亮色' },
                { value: 'dark', label: '暗色' },
                { value: 'system', label: '跟随系统' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('theme_mode', option.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    formData.theme_mode === option.value
                      ? 'bg-accent text-background ring-2 ring-accent/30 shadow-md shadow-accent/20'
                      : 'bg-background hover:bg-surface-elevated border border-border'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">主色调</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.theme_primary_color}
                onChange={(e) => updateField('theme_primary_color', e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={formData.theme_primary_color}
                onChange={(e) => updateField('theme_primary_color', e.target.value)}
                className="input w-28 font-mono text-sm"
              />
              <div className="flex gap-1">
                {['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateField('theme_primary_color', color)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all hover:scale-110',
                    formData.theme_primary_color === color 
                      ? 'ring-2 ring-offset-2 ring-accent shadow-md shadow-accent/30 scale-110' 
                      : 'ring-1 ring-border hover:ring-accent/50'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">圆角大小</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'none', label: '无', preview: 'rounded-none' },
                { value: 'sm', label: '小', preview: 'rounded-sm' },
                { value: 'md', label: '中', preview: 'rounded-md' },
                { value: 'lg', label: '大', preview: 'rounded-lg' },
                { value: 'xl', label: '特大', preview: 'rounded-xl' },
                { value: 'full', label: '圆形', preview: 'rounded-full' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('theme_border_radius', option.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 transition-colors rounded-lg',
                    formData.theme_border_radius === option.value
                      ? 'bg-accent text-background ring-2 ring-accent/30 shadow-md shadow-accent/20'
                      : 'bg-background hover:bg-surface-elevated border border-border'
                  )}
                >
                  <div 
                    className={cn(
                      'w-4 h-4 bg-current opacity-50',
                      option.preview
                    )} 
                  />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              调整按钮、卡片、输入框等元素的圆角样式
            </p>
          </div>
        </div>
      </Section>

      {/* 保存按钮 */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={cn(
            'btn-primary flex items-center gap-2 min-w-[120px] justify-center',
            (!hasChanges || saving) && 'opacity-50 cursor-not-allowed'
          )}
          title={!hasChanges ? '没有需要保存的更改' : saving ? '正在保存...' : '保存设置'}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>保存中...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>保存设置</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// 可折叠区块组件
function Section({
  id: _id, // eslint-disable-line @typescript-eslint/no-unused-vars
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-background hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="p-4 border-t border-border bg-surface">
          {children}
        </div>
      )}
    </div>
  )
}

// 开关项组件
function ToggleItem({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-accent"
      />
    </label>
  )
}

// 图片上传组件
function ImageUploader({
  value,
  onChange,
  onUpload,
  uploading,
  placeholder,
  accept,
  previewSize = 'medium',
}: {
  value: string
  onChange: (url: string) => void
  onUpload: (file: File) => void
  uploading?: boolean
  placeholder?: string
  accept?: string
  previewSize?: 'small' | 'medium' | 'large'
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
    // 清空 input 以便可以重新选择同一文件
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleClear = () => {
    onChange('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-start gap-3">
      {/* 预览区域 */}
      <div
        className={cn(
          'relative border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center bg-background',
          sizeClasses[previewSize]
        )}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-contain p-1"
              unoptimized
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-md hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <ImageIcon className="w-6 h-6 text-text-muted" />
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        )}
      </div>

      {/* 上传控制 */}
      <div className="flex-1 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id={`upload-${placeholder}`}
        />
        <label
          htmlFor={`upload-${placeholder}`}
          className={cn(
            'btn-secondary inline-flex items-center gap-2 cursor-pointer text-sm',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          <Upload className="w-4 h-4" />
          {uploading ? '上传中...' : '选择文件'}
        </label>
        
        {/* URL 输入框 */}
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-full text-xs"
          placeholder={placeholder || '或粘贴图片 URL'}
        />
      </div>
    </div>
  )
}
