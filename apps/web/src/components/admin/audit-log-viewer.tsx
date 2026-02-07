'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  Activity,
  Users,
  Folder,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Image,
  User,
  Settings,
  Bell,
  Palette,
  Languages,
  ArrowUpCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  description: string | null
  changes: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  status: string
  error_message: string | null
  created_at: string
}

interface LogsResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface StatsResponse {
  total: number
  byAction: Array<{ action: string; count: number }>
  byResource: Array<{ resource_type: string; count: number }>
  byUser: Array<{ user_email: string; count: number }>
  daily: Array<{ date: string; count: number }>
  recentActivity: AuditLog[]
}

const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  restore: '恢复',
  login: '登录',
  logout: '登出',
  upload: '上传',
  download: '下载',
  export: '导出',
  import: '导入',
  share: '分享',
  publish: '发布',
  unpublish: '取消发布',
  batch_delete: '批量删除',
  batch_update: '批量更新',
  settings_update: '更新设置',
  password_change: '修改密码',
  role_change: '修改角色',
  permission_change: '修改权限',
}

const RESOURCE_LABELS: Record<string, string> = {
  album: '相册',
  photo: '照片',
  user: '用户',
  customer: '客户',
  template: '模板',
  style_template: '样式模板',
  translation: '翻译',
  notification: '通知',
  system_settings: '系统设置',
  upgrade: '系统升级',
}

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  album: Folder,
  photo: Image,
  user: User,
  customer: Users,
  template: Palette,
  style_template: Palette,
  translation: Languages,
  notification: Bell,
  system_settings: Settings,
  upgrade: ArrowUpCircle,
}

export function AuditLogViewer() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [resourceFilter, setResourceFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [statsDays, setStatsDays] = useState(7)

  // 获取日志列表
  const { data: logsData, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ['audit-logs', page, pageSize, search, actionFilter, resourceFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set('search', search)
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter)
      if (resourceFilter && resourceFilter !== 'all') params.set('resourceType', resourceFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (!res.ok) throw new Error('获取日志失败')
      return res.json()
    },
  })

  // 获取统计数据
  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['audit-logs-stats', statsDays],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs/stats?days=${statsDays}`)
      if (!res.ok) throw new Error('获取统计失败')
      return res.json()
    },
  })

  // 导出日志
  const handleExport = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams({ format })
    if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter)
    if (resourceFilter && resourceFilter !== 'all') params.set('resourceType', resourceFilter)

    const link = document.createElement('a')
    link.href = `/api/admin/audit-logs/export?${params}`
    link.click()
  }

  // 渲染状态徽章
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            成功
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            进行中
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 渲染操作类型
  const renderAction = (action: string) => {
    const label = ACTION_LABELS[action] || action
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default'
    
    if (action.includes('delete')) variant = 'destructive'
    else if (action.includes('create') || action.includes('upload')) variant = 'secondary'
    else if (action.includes('update') || action.includes('settings')) variant = 'outline'

    return <Badge variant={variant}>{label}</Badge>
  }

  // 渲染资源类型
  const renderResource = (type: string, name?: string | null) => {
    const label = RESOURCE_LABELS[type] || type
    const Icon = RESOURCE_ICONS[type] || Info
    
    return (
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span>{label}</span>
        {name && <span className="text-muted-foreground truncate max-w-32">({name})</span>}
      </div>
    )
  }

  const logs = logsData?.logs || []
  const pagination = logsData?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">操作总数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              最近 {statsDays} 天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.byUser?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              有操作记录
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">资源类型</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.byResource?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              涉及类型
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">统计周期</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Select value={String(statsDays)} onValueChange={(v) => setStatsDays(Number(v))}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 天</SelectItem>
                <SelectItem value="14">14 天</SelectItem>
                <SelectItem value="30">30 天</SelectItem>
                <SelectItem value="90">90 天</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* 操作类型分布 */}
      {statsData?.byAction && statsData.byAction.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">操作类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statsData.byAction.map((item) => (
                <Badge key={item.action} variant="secondary" className="text-xs">
                  {ACTION_LABELS[item.action] || item.action}: {item.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选工具栏 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索描述、资源名称、用户..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="操作类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部操作</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="资源类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部资源</SelectItem>
            {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="pending">进行中</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-1" />
          JSON
        </Button>

        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      {/* 日志表格 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">时间</TableHead>
              <TableHead className="w-36">操作者</TableHead>
              <TableHead className="w-24">操作</TableHead>
              <TableHead className="w-40">资源</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-28">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  暂无操作日志
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.created_at), 'MM-dd HH:mm:ss', { locale: zhCN })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm truncate max-w-32">{log.user_email || '系统'}</span>
                      {log.user_role && (
                        <span className="text-xs text-muted-foreground">{log.user_role}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{renderAction(log.action)}</TableCell>
                  <TableCell>{renderResource(log.resource_type, log.resource_name)}</TableCell>
                  <TableCell>
                    <span className="text-sm truncate block max-w-72">{log.description}</span>
                    {log.error_message && (
                      <span className="text-xs text-red-500">{log.error_message}</span>
                    )}
                  </TableCell>
                  <TableCell>{renderStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.ip_address || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
