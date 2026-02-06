'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Palette,
  Download,
  Upload,
  Copy,
  Check,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { showSuccess, handleApiError } from '@/lib/toast'
import { TemplateStyleEditor } from './template-style-editor'
import { TEMPLATE_CATEGORIES, type AlbumTemplateStyle } from '@/lib/album-templates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface StyleTemplate extends AlbumTemplateStyle {
  isBuiltin: boolean
  dbId?: string
}

interface StyleTemplatesResponse {
  success: boolean
  data: {
    templates: StyleTemplate[]
    total: number
    builtinCount: number
    customCount: number
  }
}

export function StyleTemplateManager() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StyleTemplate | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 获取模板列表
  const { data, isLoading, refetch } = useQuery<StyleTemplatesResponse>({
    queryKey: ['style-templates', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      
      const res = await fetch(`/api/admin/style-templates?${params}`)
      if (!res.ok) throw new Error('获取模板失败')
      return res.json()
    },
  })

  // 创建模板
  const createMutation = useMutation({
    mutationFn: async (style: AlbumTemplateStyle) => {
      const res = await fetch('/api/admin/style-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: style.name,
          description: style.description,
          category: style.category,
          theme_config: style.theme,
          typography_config: style.typography,
          layout_config: style.layout,
          hero_config: style.hero,
          hover_config: style.hover,
          animation_config: style.animation,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '创建失败')
      }
      return res.json()
    },
    onSuccess: () => {
      showSuccess('样式模板已创建')
      queryClient.invalidateQueries({ queryKey: ['style-templates'] })
      setShowEditor(false)
      setEditingTemplate(null)
    },
    onError: (error) => {
      handleApiError(error, '创建模板失败')
    },
  })

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: async ({ id, style }: { id: string; style: AlbumTemplateStyle }) => {
      const res = await fetch(`/api/admin/style-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: style.name,
          description: style.description,
          category: style.category,
          theme_config: style.theme,
          typography_config: style.typography,
          layout_config: style.layout,
          hero_config: style.hero,
          hover_config: style.hover,
          animation_config: style.animation,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '更新失败')
      }
      return res.json()
    },
    onSuccess: () => {
      showSuccess('样式模板已更新')
      queryClient.invalidateQueries({ queryKey: ['style-templates'] })
      setShowEditor(false)
      setEditingTemplate(null)
    },
    onError: (error) => {
      handleApiError(error, '更新模板失败')
    },
  })

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/style-templates/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '删除失败')
      }
      return res.json()
    },
    onSuccess: () => {
      showSuccess('样式模板已删除')
      queryClient.invalidateQueries({ queryKey: ['style-templates'] })
    },
    onError: (error) => {
      handleApiError(error, '删除模板失败')
    },
  })

  // 导出所有模板
  const handleExportAll = async () => {
    try {
      const res = await fetch('/api/admin/style-templates/export')
      if (!res.ok) throw new Error('导出失败')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `style-templates-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      showSuccess('模板已导出')
    } catch (error) {
      handleApiError(error, '导出失败')
    }
  }

  // 导入模板
  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const content = await file.text()
        const data = JSON.parse(content)
        
        const res = await fetch('/api/admin/style-templates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!res.ok) {
          const resData = await res.json()
          throw new Error(resData.error?.message || '导入失败')
        }
        
        const result = await res.json()
        showSuccess(result.message)
        queryClient.invalidateQueries({ queryKey: ['style-templates'] })
      } catch (error) {
        handleApiError(error, '导入失败')
      }
    }
    input.click()
  }

  // 复制模板 ID
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      showSuccess('模板 ID 已复制')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = id
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedId(id)
      showSuccess('模板 ID 已复制')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // 基于内置模板创建
  const handleDuplicate = (template: StyleTemplate) => {
    setEditingTemplate({
      ...template,
      id: '',
      name: `${template.name} (副本)`,
      isBuiltin: false,
      dbId: undefined,
    })
    setShowEditor(true)
  }

  // 保存模板
  const handleSave = (style: AlbumTemplateStyle) => {
    if (editingTemplate?.dbId) {
      // 更新现有模板
      updateMutation.mutate({ id: editingTemplate.dbId, style })
    } else {
      // 创建新模板
      createMutation.mutate(style)
    }
  }

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    return TEMPLATE_CATEGORIES.find(c => c.id === category)?.icon || '📷'
  }

  const templates = data?.data.templates || []
  const builtinTemplates = templates.filter(t => t.isBuiltin)
  const customTemplates = templates.filter(t => !t.isBuiltin)

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input w-40"
            >
              <option value="">全部分类</option>
              {TEMPLATE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="btn-secondary p-2"
              title="刷新"
            >
              <Loader2 className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="btn-secondary text-sm"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>
            <button
              onClick={handleExportAll}
              disabled={customTemplates.length === 0}
              className="btn-secondary text-sm"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={() => {
                setEditingTemplate(null)
                setShowEditor(true)
              }}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              新建模板
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-text-muted">
        <span>共 {templates.length} 个模板</span>
        <span>|</span>
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {builtinTemplates.length} 个内置
        </span>
        <span>|</span>
        <span className="text-accent">{customTemplates.length} 个自定义</span>
      </div>

      {/* 内置模板 */}
      {builtinTemplates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            内置模板
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtinTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onDuplicate={() => handleDuplicate(template)}
                onCopyId={() => handleCopyId(template.id)}
                copied={copiedId === template.id}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* 自定义模板 */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Palette className="w-5 h-5 text-accent" />
          自定义模板
        </h3>
        {customTemplates.length === 0 ? (
          <div className="card p-8 text-center text-text-muted">
            <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>还没有自定义模板</p>
            <p className="text-sm mt-2">点击「新建模板」创建，或从内置模板复制</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => {
                  setEditingTemplate(template)
                  setShowEditor(true)
                }}
                onDelete={() => {
                  if (confirm('确定要删除这个模板吗？')) {
                    deleteMutation.mutate(template.dbId!)
                  }
                }}
                onDuplicate={() => handleDuplicate(template)}
                onCopyId={() => handleCopyId(template.id)}
                copied={copiedId === template.id}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.dbId ? '编辑样式模板' : '创建样式模板'}
            </DialogTitle>
            <DialogDescription>
              配置相册的视觉样式，包括主题颜色、字体排版、布局效果等
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <TemplateStyleEditor
              initialStyle={editingTemplate || undefined}
              onSave={handleSave}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 模板卡片组件
function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onCopyId,
  copied,
  getCategoryIcon,
}: {
  template: StyleTemplate
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate: () => void
  onCopyId: () => void
  copied: boolean
  getCategoryIcon: (category: string) => string
}) {
  return (
    <div
      className="card p-4 hover:border-accent/50 transition-colors"
      style={{
        borderColor: template.theme.accentColor + '30',
      }}
    >
      {/* 颜色预览条 */}
      <div className="flex gap-1 mb-3">
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: template.theme.primaryColor }}
        />
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: template.theme.accentColor }}
        />
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: template.theme.backgroundColor }}
        />
      </div>

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span>{getCategoryIcon(template.category)}</span>
            <h4 className="font-medium truncate">{template.name}</h4>
            {template.isBuiltin && (
              <Star className="w-3 h-3 text-yellow-500 shrink-0" />
            )}
          </div>
          {template.description && (
            <p className="text-sm text-text-muted mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-1 mt-3 text-xs">
        <span
          className="px-2 py-0.5 rounded"
          style={{
            backgroundColor: template.theme.mode === 'dark' ? '#333' : '#eee',
            color: template.theme.mode === 'dark' ? '#fff' : '#333',
          }}
        >
          {template.theme.mode === 'dark' ? '暗色' : '亮色'}
        </span>
        <span className="px-2 py-0.5 rounded bg-surface-elevated">
          {template.layout.type === 'masonry' ? '瀑布流' :
           template.layout.type === 'grid' ? '网格' :
           template.layout.type === 'story' ? '故事' :
           template.layout.type === 'timeline' ? '时间线' : '轮播'}
        </span>
        <span className="px-2 py-0.5 rounded bg-surface-elevated">
          {template.typography.titleFont === 'serif' ? '衬线' : '无衬线'}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
        <button
          onClick={onCopyId}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
          title="复制模板 ID"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <button
          onClick={onDuplicate}
          className="p-2 text-text-muted hover:text-accent transition-colors"
          title="复制为新模板"
        >
          <Plus className="w-4 h-4" />
        </button>
        {!template.isBuiltin && onEdit && (
          <button
            onClick={onEdit}
            className="p-2 text-text-muted hover:text-accent transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {!template.isBuiltin && onDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-text-muted hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
