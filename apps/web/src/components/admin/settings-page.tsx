'use client'

import { useState } from 'react'
import { 
  Building2, 
  Globe, 
  Link2, 
  Palette, 
  Settings, 
  Save, 
  Loader2
} from 'lucide-react'
import { useAdminSettings } from '@/hooks/use-settings'
import { showSuccess, handleApiError } from '@/lib/toast'
import { cn } from '@/lib/utils'

type TabId = 'brand' | 'site' | 'feature' | 'social' | 'theme'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'brand', label: '品牌信息', icon: <Building2 className="w-4 h-4" /> },
  { id: 'site', label: '站点设置', icon: <Globe className="w-4 h-4" /> },
  { id: 'feature', label: '功能开关', icon: <Settings className="w-4 h-4" /> },
  { id: 'social', label: '社交链接', icon: <Link2 className="w-4 h-4" /> },
  { id: 'theme', label: '主题外观', icon: <Palette className="w-4 h-4" /> },
]

export function SettingsPage() {
  const { settings, loading, saving, error, updateSettings, refresh } = useAdminSettings()
  const [activeTab, setActiveTab] = useState<TabId>('brand')
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // 更新表单数据
  const updateField = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // 获取字段值
  const getValue = (key: string, defaultValue: unknown = '') => {
    if (key in formData) return formData[key]
    if (settings && settings[activeTab]) {
      const categorySettings = settings[activeTab] as Record<string, unknown>
      if (key in categorySettings) return categorySettings[key]
    }
    return defaultValue
  }

  // 保存设置
  const handleSave = async () => {
    if (Object.keys(formData).length === 0) {
      showSuccess('没有需要保存的更改')
      return
    }

    const result = await updateSettings(formData)
    if (result.success) {
      showSuccess(result.message || '设置已保存')
      setFormData({})
      setHasChanges(false)
    } else {
      handleApiError(new Error(result.message), '保存失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={refresh} className="btn-primary">
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-text-muted mt-1">配置站点品牌、功能和外观</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={cn(
            'btn-primary flex items-center gap-2',
            !hasChanges && 'opacity-50 cursor-not-allowed'
          )}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          保存设置
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 设置表单 */}
      <div className="bg-surface rounded-lg border border-border p-6">
        {activeTab === 'brand' && (
          <BrandSettings getValue={getValue} updateField={updateField} />
        )}
        {activeTab === 'site' && (
          <SiteSettings getValue={getValue} updateField={updateField} />
        )}
        {activeTab === 'feature' && (
          <FeatureSettings getValue={getValue} updateField={updateField} />
        )}
        {activeTab === 'social' && (
          <SocialSettings getValue={getValue} updateField={updateField} />
        )}
        {activeTab === 'theme' && (
          <ThemeSettings getValue={getValue} updateField={updateField} />
        )}
      </div>

      {/* 保存提示 */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-accent text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>有未保存的更改</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm"
          >
            {saving ? '保存中...' : '立即保存'}
          </button>
        </div>
      )}
    </div>
  )
}

// 品牌设置组件
function BrandSettings({ 
  getValue, 
  updateField 
}: { 
  getValue: (key: string, defaultValue?: unknown) => unknown
  updateField: (key: string, value: unknown) => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">品牌信息</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">品牌名称</label>
            <input
              type="text"
              value={getValue('brand_name', '') as string}
              onChange={(e) => updateField('brand_name', e.target.value)}
              className="input w-full"
              placeholder="例如：XX 摄影工作室"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">品牌标语</label>
            <input
              type="text"
              value={getValue('brand_tagline', '') as string}
              onChange={(e) => updateField('brand_tagline', e.target.value)}
              className="input w-full"
              placeholder="例如：专业活动摄影"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">版权与备案</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">版权声明</label>
            <input
              type="text"
              value={getValue('copyright_text', '') as string}
              onChange={(e) => updateField('copyright_text', e.target.value)}
              className="input w-full"
              placeholder="留空则使用品牌名称"
            />
            <p className="text-xs text-text-muted mt-1">显示在页脚的版权声明文字</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ICP 备案号</label>
            <input
              type="text"
              value={getValue('icp_number', '') as string}
              onChange={(e) => updateField('icp_number', e.target.value)}
              className="input w-full"
              placeholder="例如：京ICP备12345678号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">公安备案号</label>
            <input
              type="text"
              value={getValue('police_number', '') as string}
              onChange={(e) => updateField('police_number', e.target.value)}
              className="input w-full"
              placeholder="例如：京公网安备 11010102001234号"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 站点设置组件
function SiteSettings({ 
  getValue, 
  updateField 
}: { 
  getValue: (key: string, defaultValue?: unknown) => unknown
  updateField: (key: string, value: unknown) => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">SEO 设置</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">站点标题</label>
            <input
              type="text"
              value={getValue('site_title', '') as string}
              onChange={(e) => updateField('site_title', e.target.value)}
              className="input w-full"
              placeholder="显示在浏览器标签页"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">站点描述</label>
            <textarea
              value={getValue('site_description', '') as string}
              onChange={(e) => updateField('site_description', e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="用于搜索引擎优化"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SEO 关键词</label>
            <input
              type="text"
              value={getValue('site_keywords', '') as string}
              onChange={(e) => updateField('site_keywords', e.target.value)}
              className="input w-full"
              placeholder="用逗号分隔，如：摄影,相册,婚礼"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 功能开关组件
function FeatureSettings({ 
  getValue, 
  updateField 
}: { 
  getValue: (key: string, defaultValue?: unknown) => unknown
  updateField: (key: string, value: unknown) => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">功能开关</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">允许游客访问首页</p>
              <p className="text-sm text-text-muted">关闭后游客需要登录才能查看首页</p>
            </div>
            <input
              type="checkbox"
              checked={getValue('allow_public_home', true) as boolean}
              onChange={(e) => updateField('allow_public_home', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">新相册默认启用水印</p>
              <p className="text-sm text-text-muted">创建相册时默认开启水印功能</p>
            </div>
            <input
              type="checkbox"
              checked={getValue('default_watermark_enabled', false) as boolean}
              onChange={(e) => updateField('default_watermark_enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">新相册默认允许下载</p>
              <p className="text-sm text-text-muted">创建相册时默认允许访客下载照片</p>
            </div>
            <input
              type="checkbox"
              checked={getValue('default_allow_download', true) as boolean}
              onChange={(e) => updateField('default_allow_download', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">新相册默认显示 EXIF</p>
              <p className="text-sm text-text-muted">创建相册时默认显示照片拍摄信息</p>
            </div>
            <input
              type="checkbox"
              checked={getValue('default_show_exif', true) as boolean}
              onChange={(e) => updateField('default_show_exif', e.target.checked)}
              className="w-5 h-5 rounded"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">性能设置</h3>
        <div>
          <label className="block text-sm font-medium mb-1">实时更新间隔（毫秒）</label>
          <input
            type="number"
            value={getValue('polling_interval', 3000) as number}
            onChange={(e) => updateField('polling_interval', parseInt(e.target.value) || 3000)}
            className="input w-48"
            min={1000}
            max={30000}
            step={500}
          />
          <p className="text-xs text-text-muted mt-1">相册页面自动刷新的间隔时间，建议 2000-5000</p>
        </div>
      </div>
    </div>
  )
}

// 社交链接组件
function SocialSettings({ 
  getValue, 
  updateField 
}: { 
  getValue: (key: string, defaultValue?: unknown) => unknown
  updateField: (key: string, value: unknown) => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">联系方式</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">联系邮箱</label>
            <input
              type="email"
              value={getValue('social_email', '') as string}
              onChange={(e) => updateField('social_email', e.target.value)}
              className="input w-full"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">联系电话</label>
            <input
              type="tel"
              value={getValue('social_phone', '') as string}
              onChange={(e) => updateField('social_phone', e.target.value)}
              className="input w-full"
              placeholder="138-xxxx-xxxx"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">社交媒体</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">微博链接</label>
            <input
              type="url"
              value={getValue('social_weibo', '') as string}
              onChange={(e) => updateField('social_weibo', e.target.value)}
              className="input w-full"
              placeholder="https://weibo.com/u/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instagram</label>
            <input
              type="url"
              value={getValue('social_instagram', '') as string}
              onChange={(e) => updateField('social_instagram', e.target.value)}
              className="input w-full"
              placeholder="https://instagram.com/..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 主题设置组件
function ThemeSettings({ 
  getValue, 
  updateField 
}: { 
  getValue: (key: string, defaultValue?: unknown) => unknown
  updateField: (key: string, value: unknown) => void 
}) {
  const themeMode = getValue('theme_mode', 'system') as string
  const primaryColor = getValue('theme_primary_color', '#4F46E5') as string

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">主题模式</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'light', label: '亮色', desc: '始终使用亮色主题' },
            { value: 'dark', label: '暗色', desc: '始终使用暗色主题' },
            { value: 'system', label: '跟随系统', desc: '自动适应系统设置' },
          ].map(option => (
            <label
              key={option.value}
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-colors',
                themeMode === option.value
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              )}
            >
              <input
                type="radio"
                name="theme_mode"
                value={option.value}
                checked={themeMode === option.value}
                onChange={(e) => updateField('theme_mode', e.target.value)}
                className="sr-only"
              />
              <p className="font-medium">{option.label}</p>
              <p className="text-xs text-text-muted mt-1">{option.desc}</p>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">主色调</h3>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => updateField('theme_primary_color', e.target.value)}
            className="w-16 h-12 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => updateField('theme_primary_color', e.target.value)}
            className="input w-32 font-mono"
            placeholder="#4F46E5"
          />
          <div className="flex gap-2">
            {['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map(color => (
              <button
                key={color}
                onClick={() => updateField('theme_primary_color', color)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                  primaryColor === color ? 'border-white ring-2 ring-accent' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2">选择或输入主题色，影响按钮、链接等元素颜色</p>
      </div>
    </div>
  )
}
