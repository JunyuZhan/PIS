'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  Globe, 
  Edit2, 
  Trash2, 
  Download, 
  Upload, 
  X,
  Check,
  RefreshCw,
  ChevronDown,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { showSuccess, handleApiError } from '@/lib/toast'
import { locales, localeNames, type Locale } from '@/i18n/config'

interface Translation {
  id?: string
  locale: string
  namespace: string
  key: string
  defaultValue: string
  customValue?: string
  isCustom: boolean
  isActive: boolean
}

interface TranslationsResponse {
  success: boolean
  data: {
    translations: Translation[]
    namespaces: string[]
    locale: string
    total: number
  }
}

export function TranslationManager() {
  const queryClient = useQueryClient()
  const [locale, setLocale] = useState<Locale>('zh-CN')
  const [namespace, setNamespace] = useState<string>('')
  const [search, setSearch] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  // 获取翻译列表
  const { data, isLoading, refetch } = useQuery<TranslationsResponse>({
    queryKey: ['translations', locale, namespace, search],
    queryFn: async () => {
      const params = new URLSearchParams({ locale })
      if (namespace) params.set('namespace', namespace)
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/admin/translations?${params}`)
      if (!res.ok) throw new Error('获取翻译失败')
      return res.json()
    },
  })

  // 保存翻译
  const saveMutation = useMutation({
    mutationFn: async (translation: {
      locale: string
      namespace: string
      key: string
      value: string
    }) => {
      const res = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(translation),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '保存失败')
      }
      return res.json()
    },
    onSuccess: () => {
      showSuccess('翻译已保存')
      queryClient.invalidateQueries({ queryKey: ['translations'] })
      setEditingKey(null)
    },
    onError: (error) => {
      handleApiError(error, '保存翻译失败')
    },
  })

  // 删除翻译
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/admin/translations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '删除失败')
      }
      return res.json()
    },
    onSuccess: () => {
      showSuccess('已恢复默认翻译')
      queryClient.invalidateQueries({ queryKey: ['translations'] })
    },
    onError: (error) => {
      handleApiError(error, '删除翻译失败')
    },
  })

  // 导出翻译
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ locale })
      const res = await fetch(`/api/admin/translations/export?${params}`)
      if (!res.ok) throw new Error('导出失败')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translations-${locale}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      showSuccess('翻译已导出')
    } catch (error) {
      handleApiError(error, '导出失败')
    }
  }

  // 导入翻译
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
        
        const res = await fetch('/api/admin/translations/import', {
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
        queryClient.invalidateQueries({ queryKey: ['translations'] })
      } catch (error) {
        handleApiError(error, '导入失败')
      }
    }
    input.click()
  }

  // 开始编辑
  const startEdit = (t: Translation) => {
    setEditingKey(`${t.namespace}.${t.key}`)
    setEditValue(t.customValue || t.defaultValue)
  }

  // 保存编辑
  const saveEdit = (t: Translation) => {
    if (!editValue.trim()) {
      handleApiError(null, '翻译内容不能为空')
      return
    }
    
    saveMutation.mutate({
      locale,
      namespace: t.namespace,
      key: t.key,
      value: editValue.trim(),
    })
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingKey(null)
    setEditValue('')
  }

  // 过滤翻译
  const filteredTranslations = data?.data.translations.filter(t => {
    if (showCustomOnly && !t.isCustom) return false
    return true
  }) || []

  // 按命名空间分组
  const groupedTranslations = filteredTranslations.reduce((acc, t) => {
    if (!acc[t.namespace]) acc[t.namespace] = []
    acc[t.namespace].push(t)
    return acc
  }, {} as Record<string, Translation[]>)

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 语言选择 */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="input w-40"
            >
              {locales.map(l => (
                <option key={l} value={l}>{localeNames[l]}</option>
              ))}
            </select>
          </div>

          {/* 命名空间过滤 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="input w-40"
            >
              <option value="">全部命名空间</option>
              {data?.data.namespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>

          {/* 搜索 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索翻译键或内容..."
              className="input pl-10 w-full"
            />
          </div>

          {/* 只显示自定义 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCustomOnly}
              onChange={(e) => setShowCustomOnly(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">仅显示自定义</span>
          </label>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="btn-secondary p-2"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="btn-secondary p-2"
              title="导出翻译"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleImport}
              className="btn-secondary p-2"
              title="导入翻译"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-text-muted">
        <span>共 {filteredTranslations.length} 条翻译</span>
        <span>|</span>
        <span className="text-accent">
          {filteredTranslations.filter(t => t.isCustom).length} 条自定义
        </span>
      </div>

      {/* 翻译列表 */}
      {isLoading ? (
        <div className="card p-8 text-center text-text-muted">
          加载中...
        </div>
      ) : Object.keys(groupedTranslations).length === 0 ? (
        <div className="card p-8 text-center text-text-muted">
          没有找到匹配的翻译
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTranslations).map(([ns, translations]) => (
            <div key={ns} className="card overflow-hidden">
              {/* 命名空间标题 */}
              <div className="px-4 py-3 bg-surface-elevated border-b border-border flex items-center gap-2">
                <ChevronDown className="w-4 h-4 text-text-muted" />
                <span className="font-medium">{ns}</span>
                <span className="text-xs text-text-muted">
                  ({translations.length} 条)
                </span>
              </div>

              {/* 翻译条目 */}
              <div className="divide-y divide-border">
                {translations.map(t => {
                  const fullKey = `${t.namespace}.${t.key}`
                  const isEditing = editingKey === fullKey

                  return (
                    <div
                      key={fullKey}
                      className={cn(
                        'p-4 hover:bg-surface-elevated/50 transition-colors',
                        t.isCustom && 'bg-accent/5'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* 键名 */}
                        <div className="w-1/3 min-w-0">
                          <code className="text-sm text-text-secondary break-all">
                            {t.key}
                          </code>
                          {t.isCustom && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                              自定义
                            </span>
                          )}
                        </div>

                        {/* 值 */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="input flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(t)
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                              />
                              <button
                                onClick={() => saveEdit(t)}
                                disabled={saveMutation.isPending}
                                className="btn-primary p-2"
                                title="保存"
                              >
                                {saveMutation.isPending ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn-secondary p-2"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {/* 当前值（自定义或默认） */}
                              <p className="text-sm break-words">
                                {t.customValue || t.defaultValue}
                              </p>
                              {/* 如果有自定义值，显示默认值作为参考 */}
                              {t.isCustom && t.defaultValue && (
                                <p className="text-xs text-text-muted">
                                  <span className="text-text-muted/60">默认：</span>
                                  {t.defaultValue}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(t)}
                              className="p-2 text-text-muted hover:text-accent transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {t.isCustom && t.id && (
                              <button
                                onClick={() => {
                                  if (confirm('确定要恢复默认翻译吗？')) {
                                    deleteMutation.mutate(t.id!)
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="p-2 text-text-muted hover:text-red-500 transition-colors"
                                title="恢复默认"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
