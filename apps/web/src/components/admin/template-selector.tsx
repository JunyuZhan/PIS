'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Check, Layout, Palette, Type, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  ALBUM_TEMPLATES, 
  TEMPLATE_CATEGORIES,
  type AlbumTemplateStyle,
  getTemplateCSSVariables
} from '@/lib/album-templates'

interface TemplateSelectorProps {
  value: string | null
  onChange: (templateId: string | null) => void
  coverImage?: string
}

/**
 * 模板预览卡片
 */
function TemplatePreviewCard({ 
  template, 
  isSelected,
  coverImage,
  onClick 
}: { 
  template: AlbumTemplateStyle
  isSelected: boolean
  coverImage?: string
  onClick: () => void 
}) {
  const cssVars = getTemplateCSSVariables(template)
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full rounded-lg overflow-hidden transition-all border-2',
        'hover:ring-2 hover:ring-accent/50',
        isSelected 
          ? 'border-accent ring-2 ring-accent/40 shadow-lg shadow-accent/20 dark:shadow-accent/10' 
          : 'border-border'
      )}
    >
      {/* 预览区域 */}
      <div 
        className="aspect-[4/3] relative"
        style={{ 
          backgroundColor: template.theme.backgroundColor,
          ...cssVars
        }}
      >
        {/* 模拟封面区域 */}
        <div 
          className="absolute inset-0 flex items-center justify-center relative"
          style={{ 
            opacity: template.hero.overlay,
            backgroundColor: 'rgba(0,0,0,0.3)'
          }}
        >
          {coverImage ? (
            <Image 
              src={coverImage} 
              alt="Preview" 
              fill
              className="object-cover opacity-50"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 opacity-50" />
          )}
        </div>

        {/* 模拟照片网格 */}
        <div 
          className={cn(
            'absolute bottom-0 left-0 right-0 p-2',
            template.layout.type === 'grid' ? 'grid grid-cols-3' : 'flex flex-wrap',
          )}
          style={{ gap: cssVars['--template-gap'] }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn(
                'aspect-square',
                template.layout.type === 'masonry' && i % 3 === 0 ? 'w-[30%]' : 'w-[28%]',
              )}
              style={{
                backgroundColor: template.theme.accentColor,
                opacity: 0.3 + (i * 0.1),
                borderRadius: cssVars['--template-rounded'],
              }}
            />
          ))}
        </div>

        {/* 标题预览 */}
        <div 
          className={cn(
            'absolute px-3 py-1',
            template.hero.titlePosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center' :
            template.hero.titlePosition === 'bottom-left' ? 'bottom-8 left-2' :
            'bottom-8 left-1/2 -translate-x-1/2 text-center'
          )}
        >
          <div 
            className={cn(
              'font-semibold truncate',
              template.typography.titleFont === 'serif' ? 'font-serif' : 'font-sans',
              template.typography.titleSize === 'sm' ? 'text-xs' :
              template.typography.titleSize === 'md' ? 'text-sm' :
              template.typography.titleSize === 'lg' ? 'text-base' : 'text-lg'
            )}
            style={{ color: template.theme.textColor }}
          >
            相册标题
          </div>
        </div>

        {/* 选中标记 */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg ring-2 ring-background/50">
            <Check className="w-4 h-4 text-background" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* 模板信息 */}
      <div className="p-3 text-left" style={{ backgroundColor: template.theme.backgroundColor }}>
        <h4 
          className="font-medium text-sm truncate"
          style={{ color: template.theme.textColor }}
        >
          {template.name}
        </h4>
        <p 
          className="text-xs mt-1 line-clamp-2 opacity-70"
          style={{ color: template.theme.textColor }}
        >
          {template.description}
        </p>
        
        {/* 特性标签 */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: template.theme.accentColor + '30',
              color: template.theme.accentColor
            }}
          >
            {template.theme.mode === 'dark' ? '暗色' : '亮色'}
          </span>
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: template.theme.accentColor + '30',
              color: template.theme.accentColor
            }}
          >
            {template.layout.type === 'masonry' ? '瀑布流' : 
             template.layout.type === 'grid' ? '网格' :
             template.layout.type === 'story' ? '故事流' :
             template.layout.type === 'timeline' ? '时间线' : '轮播'}
          </span>
        </div>
      </div>
    </button>
  )
}

/**
 * 相册模板选择器
 */
export function TemplateSelector({ value, onChange, coverImage }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  // 按分类分组模板
  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, AlbumTemplateStyle[]>()
    
    Object.values(ALBUM_TEMPLATES).forEach((template) => {
      const category = template.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(template)
    })
    
    return grouped
  }, [])

  // 过滤后的模板
  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) {
      return Object.values(ALBUM_TEMPLATES)
    }
    return templatesByCategory.get(selectedCategory) || []
  }, [selectedCategory, templatesByCategory])

  // 当前选中的模板
  const selectedTemplate = value ? ALBUM_TEMPLATES[value] : null

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-accent" />
          <h3 className="font-medium">相册模板</h3>
          {selectedTemplate && (
            <span className="text-xs text-text-muted">
              已选择: {selectedTemplate.name}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="btn-ghost p-1"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          {/* 分类过滤 */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full transition-colors',
                selectedCategory === null
                  ? 'bg-accent text-white'
                  : 'bg-surface-elevated text-text-secondary hover:bg-surface'
              )}
            >
              全部
            </button>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1',
                  selectedCategory === cat.id
                    ? 'bg-accent text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* 清除选择 */}
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              ✕ 清除模板选择（使用默认样式）
            </button>
          )}

          {/* 模板网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <TemplatePreviewCard
                key={template.id}
                template={template}
                isSelected={value === template.id}
                coverImage={coverImage}
                onClick={() => onChange(template.id)}
              />
            ))}
          </div>

          {/* 模板详情 */}
          {selectedTemplate && (
            <div className="p-4 bg-surface-elevated rounded-lg border border-border">
              <h4 className="font-medium mb-3">模板详情: {selectedTemplate.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-text-muted">
                    <Palette className="w-3 h-3" />
                    <span>主题</span>
                  </div>
                  <p className="font-medium">
                    {selectedTemplate.theme.mode === 'dark' ? '暗色模式' : '亮色模式'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-text-muted">
                    <Layout className="w-3 h-3" />
                    <span>布局</span>
                  </div>
                  <p className="font-medium">
                    {selectedTemplate.layout.type === 'masonry' ? '瀑布流' :
                     selectedTemplate.layout.type === 'grid' ? '网格布局' :
                     selectedTemplate.layout.type === 'story' ? '故事流' :
                     selectedTemplate.layout.type === 'timeline' ? '时间线' : '轮播'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-text-muted">
                    <Type className="w-3 h-3" />
                    <span>字体</span>
                  </div>
                  <p className="font-medium">
                    {selectedTemplate.typography.titleFont === 'serif' ? '衬线字体' : '无衬线字体'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-text-muted">
                    <Sparkles className="w-3 h-3" />
                    <span>动效</span>
                  </div>
                  <p className="font-medium">
                    {selectedTemplate.animation.entrance === 'none' ? '无动画' :
                     selectedTemplate.animation.entrance === 'fade' ? '淡入' :
                     selectedTemplate.animation.entrance === 'slide' ? '滑入' : '缩放'}
                  </p>
                </div>
              </div>
              
              {/* 主色调预览 */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-text-muted">配色方案:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: selectedTemplate.theme.backgroundColor }}
                    title="背景色"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: selectedTemplate.theme.primaryColor }}
                    title="主色调"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: selectedTemplate.theme.accentColor }}
                    title="强调色"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: selectedTemplate.theme.textColor }}
                    title="文字颜色"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
