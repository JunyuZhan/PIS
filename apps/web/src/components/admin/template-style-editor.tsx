'use client'

import { useState } from 'react'
import { 
  Palette, 
  Type, 
  LayoutGrid, 
  Image, 
  Sparkles,
  Save,
  Download,
  Upload,
  RotateCcw,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlbumTemplateStyle } from '@/lib/album-templates'
import { TEMPLATE_CATEGORIES } from '@/lib/album-templates'
import { showSuccess, handleApiError } from '@/lib/toast'

interface TemplateStyleEditorProps {
  /** 初始模板配置 */
  initialStyle?: Partial<AlbumTemplateStyle>
  /** 保存回调 */
  onSave?: (style: AlbumTemplateStyle) => void
  /** 预览回调 */
  onPreview?: (style: AlbumTemplateStyle) => void
  /** 是否只读 */
  readonly?: boolean
}

// 默认模板样式
const DEFAULT_STYLE: AlbumTemplateStyle = {
  id: '',
  name: '自定义模板',
  description: '',
  category: 'general',
  theme: {
    mode: 'dark',
    primaryColor: '#D4AF37',
    backgroundColor: '#0a0a0a',
    textColor: '#ffffff',
    accentColor: '#D4AF37',
  },
  typography: {
    titleFont: 'serif',
    bodyFont: 'sans',
    titleSize: 'lg',
    spacing: 'normal',
  },
  layout: {
    type: 'masonry',
    columns: 3,
    gap: 'md',
    rounded: 'md',
    shadow: 'md',
  },
  hero: {
    style: 'full',
    height: 'lg',
    overlay: 0.4,
    titlePosition: 'center',
  },
  hover: {
    effect: 'zoom',
    showInfo: false,
  },
  animation: {
    entrance: 'fade',
    duration: 'normal',
  },
}

type TabId = 'basic' | 'theme' | 'typography' | 'layout' | 'hero' | 'effects'

export function TemplateStyleEditor({
  initialStyle,
  onSave,
  onPreview,
  readonly = false,
}: TemplateStyleEditorProps) {
  const [style, setStyle] = useState<AlbumTemplateStyle>({
    ...DEFAULT_STYLE,
    ...initialStyle,
    theme: { ...DEFAULT_STYLE.theme, ...initialStyle?.theme },
    typography: { ...DEFAULT_STYLE.typography, ...initialStyle?.typography },
    layout: { ...DEFAULT_STYLE.layout, ...initialStyle?.layout },
    hero: { ...DEFAULT_STYLE.hero, ...initialStyle?.hero },
    hover: { ...DEFAULT_STYLE.hover, ...initialStyle?.hover },
    animation: { ...DEFAULT_STYLE.animation, ...initialStyle?.animation },
  })
  const [activeTab, setActiveTab] = useState<TabId>('basic')

  // 更新样式
  const updateStyle = <K extends keyof AlbumTemplateStyle>(
    key: K,
    value: AlbumTemplateStyle[K]
  ) => {
    setStyle(prev => ({ ...prev, [key]: value }))
  }

  // 更新嵌套样式
  const updateNestedStyle = <
    K extends keyof AlbumTemplateStyle,
    NK extends keyof NonNullable<AlbumTemplateStyle[K]>
  >(
    key: K,
    nestedKey: NK,
    value: NonNullable<AlbumTemplateStyle[K]>[NK]
  ) => {
    setStyle(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] as object),
        [nestedKey]: value,
      },
    }))
  }

  // 导出模板
  const handleExport = () => {
    try {
      const exportData = {
        ...style,
        id: style.id || `custom_${Date.now()}`,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      }
      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template-${style.name.replace(/\s+/g, '-').toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
      showSuccess('模板已导出')
    } catch (error) {
      handleApiError(error, '导出失败')
    }
  }

  // 导入模板
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const content = await file.text()
        const imported = JSON.parse(content) as Partial<AlbumTemplateStyle>
        
        // 验证导入的数据
        if (!imported.name) {
          throw new Error('无效的模板文件：缺少名称')
        }

        setStyle({
          ...DEFAULT_STYLE,
          ...imported,
          id: `imported_${Date.now()}`,
          theme: { ...DEFAULT_STYLE.theme, ...imported.theme },
          typography: { ...DEFAULT_STYLE.typography, ...imported.typography },
          layout: { ...DEFAULT_STYLE.layout, ...imported.layout },
          hero: { ...DEFAULT_STYLE.hero, ...imported.hero },
          hover: { ...DEFAULT_STYLE.hover, ...imported.hover },
          animation: { ...DEFAULT_STYLE.animation, ...imported.animation },
        })
        showSuccess('模板已导入')
      } catch (error) {
        handleApiError(error, '导入失败，请检查文件格式')
      }
    }
    input.click()
  }

  // 重置为默认
  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？')) {
      setStyle({ ...DEFAULT_STYLE, id: style.id, name: style.name })
      showSuccess('已重置为默认设置')
    }
  }

  // 标签页配置
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: '基本信息', icon: <Type className="w-4 h-4" /> },
    { id: 'theme', label: '主题颜色', icon: <Palette className="w-4 h-4" /> },
    { id: 'typography', label: '字体排版', icon: <Type className="w-4 h-4" /> },
    { id: 'layout', label: '布局设置', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'hero', label: '封面样式', icon: <Image className="w-4 h-4" aria-label="封面样式图标" /> },
    { id: 'effects', label: '动效悬停', icon: <Sparkles className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            disabled={readonly}
            className="btn-secondary text-sm"
          >
            <Upload className="w-4 h-4" />
            导入
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary text-sm"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={handleReset}
            disabled={readonly}
            className="btn-secondary text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
        <div className="flex items-center gap-2">
          {onPreview && (
            <button
              onClick={() => onPreview(style)}
              className="btn-secondary text-sm"
            >
              <Eye className="w-4 h-4" />
              预览
            </button>
          )}
          {onSave && (
            <button
              onClick={() => onSave(style)}
              disabled={readonly || !style.name.trim()}
              className="btn-primary text-sm"
            >
              <Save className="w-4 h-4" />
              保存模板
            </button>
          )}
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'bg-surface-elevated hover:bg-surface-elevated/80'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 基本信息 */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">模板名称 *</label>
            <input
              type="text"
              value={style.name}
              onChange={(e) => updateStyle('name', e.target.value)}
              disabled={readonly}
              className="input"
              placeholder="输入模板名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">模板描述</label>
            <textarea
              value={style.description}
              onChange={(e) => updateStyle('description', e.target.value)}
              disabled={readonly}
              className="input min-h-[80px] resize-none"
              placeholder="可选的模板描述"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">分类</label>
            <select
              value={style.category}
              onChange={(e) => updateStyle('category', e.target.value as AlbumTemplateStyle['category'])}
              disabled={readonly}
              className="input"
            >
              {TEMPLATE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 主题颜色 */}
      {activeTab === 'theme' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">主题模式</label>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => updateNestedStyle('theme', 'mode', mode)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-lg border transition-colors',
                    style.theme.mode === mode
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {mode === 'light' ? '☀️ 亮色' : '🌙 暗色'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">主色调</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.theme.primaryColor}
                  onChange={(e) => updateNestedStyle('theme', 'primaryColor', e.target.value)}
                  disabled={readonly}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={style.theme.primaryColor}
                  onChange={(e) => updateNestedStyle('theme', 'primaryColor', e.target.value)}
                  disabled={readonly}
                  className="input flex-1 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">强调色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.theme.accentColor}
                  onChange={(e) => updateNestedStyle('theme', 'accentColor', e.target.value)}
                  disabled={readonly}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={style.theme.accentColor}
                  onChange={(e) => updateNestedStyle('theme', 'accentColor', e.target.value)}
                  disabled={readonly}
                  className="input flex-1 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">背景色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.theme.backgroundColor}
                  onChange={(e) => updateNestedStyle('theme', 'backgroundColor', e.target.value)}
                  disabled={readonly}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={style.theme.backgroundColor}
                  onChange={(e) => updateNestedStyle('theme', 'backgroundColor', e.target.value)}
                  disabled={readonly}
                  className="input flex-1 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">文字颜色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={style.theme.textColor}
                  onChange={(e) => updateNestedStyle('theme', 'textColor', e.target.value)}
                  disabled={readonly}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={style.theme.textColor}
                  onChange={(e) => updateNestedStyle('theme', 'textColor', e.target.value)}
                  disabled={readonly}
                  className="input flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          
          {/* 颜色预览 */}
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: style.theme.backgroundColor,
              color: style.theme.textColor,
            }}
          >
            <h4 style={{ color: style.theme.primaryColor }} className="text-lg font-bold mb-2">
              预览标题
            </h4>
            <p className="text-sm">这是正文预览文字</p>
            <button
              className="mt-2 px-3 py-1 rounded text-sm"
              style={{
                backgroundColor: style.theme.accentColor,
                color: style.theme.mode === 'dark' ? '#000' : '#fff',
              }}
            >
              按钮样式
            </button>
          </div>
        </div>
      )}

      {/* 字体排版 */}
      {activeTab === 'typography' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">标题字体</label>
            <select
              value={style.typography.titleFont}
              onChange={(e) => updateNestedStyle('typography', 'titleFont', e.target.value)}
              disabled={readonly}
              className="input"
            >
              <option value="serif">衬线字体 (Serif)</option>
              <option value="sans">无衬线字体 (Sans)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">正文字体</label>
            <select
              value={style.typography.bodyFont}
              onChange={(e) => updateNestedStyle('typography', 'bodyFont', e.target.value)}
              disabled={readonly}
              className="input"
            >
              <option value="serif">衬线字体 (Serif)</option>
              <option value="sans">无衬线字体 (Sans)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">标题大小</label>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => updateNestedStyle('typography', 'titleSize', size)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.typography.titleSize === size
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {size === 'sm' ? '小' : size === 'md' ? '中' : size === 'lg' ? '大' : '特大'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">行间距</label>
            <div className="flex gap-2">
              {(['compact', 'normal', 'relaxed'] as const).map(sp => (
                <button
                  key={sp}
                  onClick={() => updateNestedStyle('typography', 'spacing', sp)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.typography.spacing === sp
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {sp === 'compact' ? '紧凑' : sp === 'normal' ? '正常' : '宽松'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 布局设置 */}
      {activeTab === 'layout' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">布局类型</label>
            <div className="grid grid-cols-3 gap-2">
              {(['masonry', 'grid', 'story', 'timeline', 'carousel'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => updateNestedStyle('layout', 'type', type)}
                  disabled={readonly}
                  className={cn(
                    'px-3 py-2 rounded-lg border transition-colors text-sm',
                    style.layout.type === type
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {type === 'masonry' ? '瀑布流' : 
                   type === 'grid' ? '网格' : 
                   type === 'story' ? '故事流' : 
                   type === 'timeline' ? '时间线' : '轮播'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">列数 (桌面端)</label>
            <input
              type="range"
              min="2"
              max="6"
              value={style.layout.columns}
              onChange={(e) => updateNestedStyle('layout', 'columns', parseInt(e.target.value))}
              disabled={readonly}
              className="w-full"
            />
            <div className="text-center text-sm text-text-muted">{style.layout.columns} 列</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">间距</label>
            <div className="flex gap-2">
              {(['none', 'sm', 'md', 'lg'] as const).map(gap => (
                <button
                  key={gap}
                  onClick={() => updateNestedStyle('layout', 'gap', gap)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.layout.gap === gap
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {gap === 'none' ? '无' : gap === 'sm' ? '小' : gap === 'md' ? '中' : '大'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">圆角</label>
            <div className="flex gap-2">
              {(['none', 'sm', 'md', 'lg', 'full'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => updateNestedStyle('layout', 'rounded', r)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.layout.rounded === r
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {r === 'none' ? '无' : r === 'sm' ? '小' : r === 'md' ? '中' : r === 'lg' ? '大' : '圆形'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">阴影</label>
            <div className="flex gap-2">
              {(['none', 'sm', 'md', 'lg'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => updateNestedStyle('layout', 'shadow', s)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.layout.shadow === s
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {s === 'none' ? '无' : s === 'sm' ? '小' : s === 'md' ? '中' : '大'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 封面样式 */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">封面风格</label>
            <div className="grid grid-cols-2 gap-2">
              {(['full', 'split', 'minimal', 'overlay'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => updateNestedStyle('hero', 'style', s)}
                  disabled={readonly}
                  className={cn(
                    'px-3 py-2 rounded-lg border transition-colors',
                    style.hero.style === s
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {s === 'full' ? '全屏' : s === 'split' ? '分栏' : s === 'minimal' ? '简约' : '叠加'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">封面高度</label>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg', 'full'] as const).map(h => (
                <button
                  key={h}
                  onClick={() => updateNestedStyle('hero', 'height', h)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.hero.height === h
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {h === 'sm' ? '小' : h === 'md' ? '中' : h === 'lg' ? '大' : '全屏'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">遮罩透明度: {Math.round(style.hero.overlay * 100)}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={style.hero.overlay * 100}
              onChange={(e) => updateNestedStyle('hero', 'overlay', parseInt(e.target.value) / 100)}
              disabled={readonly}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">标题位置</label>
            <div className="flex gap-2">
              {(['center', 'bottom-left', 'bottom-center'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => updateNestedStyle('hero', 'titlePosition', pos)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors text-sm',
                    style.hero.titlePosition === pos
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {pos === 'center' ? '居中' : pos === 'bottom-left' ? '左下' : '底部居中'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 动效悬停 */}
      {activeTab === 'effects' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">入场动画</label>
            <div className="grid grid-cols-2 gap-2">
              {(['none', 'fade', 'slide', 'scale'] as const).map(e => (
                <button
                  key={e}
                  onClick={() => updateNestedStyle('animation', 'entrance', e)}
                  disabled={readonly}
                  className={cn(
                    'px-3 py-2 rounded-lg border transition-colors',
                    style.animation.entrance === e
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {e === 'none' ? '无' : e === 'fade' ? '淡入' : e === 'slide' ? '滑入' : '缩放'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">动画速度</label>
            <div className="flex gap-2">
              {(['fast', 'normal', 'slow'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => updateNestedStyle('animation', 'duration', d)}
                  disabled={readonly}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border transition-colors',
                    style.animation.duration === d
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {d === 'fast' ? '快' : d === 'normal' ? '正常' : '慢'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">悬停效果</label>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'zoom', 'lift', 'glow', 'overlay'] as const).map(e => (
                <button
                  key={e}
                  onClick={() => updateNestedStyle('hover', 'effect', e)}
                  disabled={readonly}
                  className={cn(
                    'px-3 py-2 rounded-lg border transition-colors text-sm',
                    style.hover.effect === e
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {e === 'none' ? '无' : e === 'zoom' ? '放大' : e === 'lift' ? '浮起' : e === 'glow' ? '发光' : '遮罩'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">悬停显示信息</label>
            <button
              onClick={() => updateNestedStyle('hover', 'showInfo', !style.hover.showInfo)}
              disabled={readonly}
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                style.hover.showInfo ? 'bg-accent' : 'bg-surface-elevated'
              )}
            >
              <div
                className={cn(
                  'absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full transition-transform',
                  style.hover.showInfo && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
