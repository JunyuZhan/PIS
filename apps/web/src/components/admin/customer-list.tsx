'use client'

import { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  Building2,
  Tag,
  Images,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { showSuccess, handleApiError } from '@/lib/toast'
import { CustomerDialog } from './customer-dialog'
import { SendNotificationDialog } from './send-notification-dialog'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  wechat: string | null
  company: string | null
  address: string | null
  notes: string | null
  tags: string[] | null
  source: string | null
  status: string
  album_count: number
  created_at: string
  updated_at: string
}

interface CustomersResponse {
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '非活跃' },
  { value: 'archived', label: '已归档' },
]

const sourceLabels: Record<string, string> = {
  referral: '转介绍',
  website: '网站',
  social: '社交媒体',
  other: '其他',
}

export function CustomerList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [notifyCustomer, setNotifyCustomer] = useState<Customer | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement>>({})

  // 获取客户列表
  const { data, isLoading, refetch } = useQuery<CustomersResponse>({
    queryKey: ['customers', page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (status) params.set('status', status)

      const res = await fetch(`/api/admin/customers?${params}`)
      if (!res.ok) throw new Error('获取客户列表失败')
      return res.json()
    },
  })

  // 删除客户
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
    },
    onSuccess: () => {
      showSuccess('客户已删除')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      handleApiError(error, '删除客户失败')
    },
  })

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    refetch()
  }, [refetch])

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowDialog(true)
    setMenuOpen(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此客户吗？')) {
      deleteMutation.mutate(id)
    }
    setMenuOpen(null)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    setEditingCustomer(null)
  }

  const handleSaved = () => {
    handleDialogClose()
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }

  const handleSendNotification = (customer: Customer) => {
    setNotifyCustomer(customer)
    setShowNotificationDialog(true)
    setMenuOpen(null)
  }

  const handleNotificationClose = () => {
    setShowNotificationDialog(false)
    setNotifyCustomer(null)
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">客户管理</h2>
          {data && (
            <span className="text-sm text-text-muted">
              ({data.pagination.total} 位客户)
            </span>
          )}
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          添加客户
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名、电话、邮箱、公司..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn-secondary">
            搜索
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="input w-auto"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          className="btn-ghost"
          title="刷新"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* 客户列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : data?.customers.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          {search || status ? '没有找到匹配的客户' : '暂无客户，点击"添加客户"创建第一个客户'}
        </div>
      ) : (
        <div className="bg-surface-elevated rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-text-muted border-b border-border">
                  <th className="px-4 py-3 font-medium">客户</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">联系方式</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">公司</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">标签</th>
                  <th className="px-4 py-3 font-medium text-center">相册</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {data?.customers.map((customer) => (
                  <tr 
                    key={customer.id}
                    className="border-b border-border/50 last:border-0 hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        {customer.source && (
                          <div className="text-xs text-text-muted">
                            来源: {sourceLabels[customer.source] || customer.source}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-text-muted" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-text-secondary">
                            <Mail className="w-3 h-3 text-text-muted" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {customer.company && (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="w-3 h-3 text-text-muted" />
                          {customer.company}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                          {customer.tags.length > 3 && (
                            <span className="text-xs text-text-muted">
                              +{customer.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Images className="w-4 h-4 text-text-muted" />
                        {customer.album_count}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        customer.status === 'active' && 'bg-green-500/10 text-green-500',
                        customer.status === 'inactive' && 'bg-yellow-500/10 text-yellow-500',
                        customer.status === 'archived' && 'bg-gray-500/10 text-gray-500',
                      )}>
                        {customer.status === 'active' ? '活跃' : 
                         customer.status === 'inactive' ? '非活跃' : '已归档'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          ref={(el) => {
                            if (el) buttonRefs.current[customer.id] = el
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (menuOpen === customer.id) {
                              setMenuOpen(null)
                              setMenuPosition(null)
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setMenuPosition({
                                top: rect.bottom + 8,
                                left: rect.right - 120, // 菜单宽度约 120px
                              })
                              setMenuOpen(customer.id)
                            }
                          }}
                          className="p-1.5 rounded hover:bg-surface-elevated transition-colors"
                          type="button"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-text-muted">
                第 {data.pagination.page} / {data.pagination.totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost p-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="btn-ghost p-2 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 菜单弹窗 - 使用 Portal 渲染到 body，避免被表格 overflow 裁剪 */}
      {menuOpen && menuPosition && typeof window !== 'undefined' && createPortal(
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setMenuOpen(null)
              setMenuPosition(null)
            }}
          />
          <div 
            className="fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-xl py-1 min-w-[120px]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${Math.max(8, Math.min(menuPosition.left, window.innerWidth - 128))}px`,
            }}
          >
            {data?.customers.find(c => c.id === menuOpen) && (() => {
              const customer = data.customers.find(c => c.id === menuOpen)!
              return (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(customer)
                      setMenuOpen(null)
                      setMenuPosition(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface transition-colors text-left"
                  >
                    <Edit2 className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSendNotification(customer)
                      setMenuOpen(null)
                      setMenuPosition(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface transition-colors text-left"
                    title={customer.email ? '发送邮件通知' : '客户没有邮箱'}
                  >
                    <Send className="w-4 h-4" />
                    发送通知
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(menuOpen)
                      setMenuOpen(null)
                      setMenuPosition(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-surface transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )
            })()}
          </div>
        </>,
        document.body
      )}

      {/* 客户编辑对话框 */}
      <CustomerDialog
        open={showDialog}
        customer={editingCustomer}
        onClose={handleDialogClose}
        onSaved={handleSaved}
      />

      {/* 发送通知对话框 */}
      <SendNotificationDialog
        open={showNotificationDialog}
        customer={notifyCustomer}
        onClose={handleNotificationClose}
        onSent={handleNotificationClose}
      />
    </div>
  )
}
