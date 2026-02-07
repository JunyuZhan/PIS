'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Download,
  Upload,
  HardDrive,
  Database,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileJson,
  History,
} from 'lucide-react'

interface TableStats {
  count: number
  info: {
    name: string
    description: string
  }
}

interface BackupInfo {
  tables: Record<string, TableStats>
  storage: {
    totalPhotos: number
    totalBytes: number
    formattedSize: string
  }
  recentOperations: Array<{
    id: string
    action: string
    description: string
    created_at: string
    metadata: Record<string, unknown>
  }>
  backupTables: string[]
}

interface ImportResult {
  success: boolean
  message: string
  summary: {
    totalImported: number
    totalSkipped: number
    totalErrors: number
  }
  details: Record<string, { imported: number; skipped: number; errors: string[] }>
}

export function BackupManager() {
  const queryClient = useQueryClient()
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [skipExisting, setSkipExisting] = useState(true)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // 获取备份信息
  const { data: backupInfo, isLoading } = useQuery<BackupInfo>({
    queryKey: ['backup-info'],
    queryFn: async () => {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) throw new Error('获取备份信息失败')
      return res.json()
    },
  })

  // 导出数据
  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams()
      if (selectedTables.length > 0) {
        params.set('tables', selectedTables.join(','))
      }
      if (includeDeleted) {
        params.set('includeDeleted', 'true')
      }
      
      const res = await fetch(`/api/admin/backup/export?${params}`)
      if (!res.ok) throw new Error('导出失败')
      
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `pis-backup-${Date.now()}.json`
      
      // 下载文件
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      return filename
    },
    onSuccess: (filename) => {
      toast.success(`备份文件已下载: ${filename}`)
      queryClient.invalidateQueries({ queryKey: ['backup-info'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '导出失败')
    },
  })

  // 导入数据
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('请选择备份文件')
      
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('options', JSON.stringify({
        mode: importMode,
        skipExisting,
      }))
      
      const res = await fetch('/api/admin/backup/import', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '导入失败')
      }
      
      return res.json() as Promise<ImportResult>
    },
    onSuccess: (result) => {
      setImportResult(result)
      toast.success(result.message)
      queryClient.invalidateQueries({ queryKey: ['backup-info'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '导入失败')
    },
  })

  // 切换表选择
  const toggleTable = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    )
  }

  // 全选/取消全选
  const toggleAllTables = () => {
    if (!backupInfo) return
    if (selectedTables.length === backupInfo.backupTables.length) {
      setSelectedTables([])
    } else {
      setSelectedTables([...backupInfo.backupTables])
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 系统概览 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据表</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupInfo ? Object.keys(backupInfo.tables).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">可备份数据表</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">照片存储</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupInfo?.storage.formattedSize || '0 B'}
            </div>
            <p className="text-xs text-muted-foreground">
              共 {backupInfo?.storage.totalPhotos || 0} 张照片
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最近操作</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupInfo?.recentOperations.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">备份/恢复记录</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            导出备份
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            导入恢复
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            操作记录
          </TabsTrigger>
        </TabsList>

        {/* 导出备份 */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>导出数据备份</CardTitle>
              <CardDescription>
                选择要备份的数据表，导出为 JSON 格式文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 表选择 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>选择要备份的表</Label>
                  <Button variant="ghost" size="sm" onClick={toggleAllTables}>
                    {selectedTables.length === backupInfo?.backupTables.length
                      ? '取消全选'
                      : '全选'}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {backupInfo?.tables &&
                    Object.entries(backupInfo.tables).map(([table, stats]) => (
                      <div
                        key={table}
                        className="flex items-start space-x-3 rounded-md border p-3"
                      >
                        <Checkbox
                          id={`table-${table}`}
                          checked={selectedTables.includes(table)}
                          onCheckedChange={() => toggleTable(table)}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`table-${table}`}
                            className="cursor-pointer font-medium"
                          >
                            {stats.info.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {stats.info.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {stats.count} 条记录
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 选项 */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="includeDeleted"
                  checked={includeDeleted}
                  onCheckedChange={(checked) =>
                    setIncludeDeleted(checked as boolean)
                  }
                />
                <Label htmlFor="includeDeleted" className="text-sm">
                  包含已删除的数据
                </Label>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在导出...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      导出备份
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 导入恢复 */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>导入数据恢复</CardTitle>
              <CardDescription>
                从 JSON 备份文件恢复数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 文件选择 */}
              <div className="space-y-2">
                <Label>选择备份文件</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        setImportFile(e.target.files?.[0] || null)
                        setImportResult(null)
                      }}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
                    />
                  </div>
                  {importFile && (
                    <Badge variant="outline">
                      <FileJson className="h-3 w-3 mr-1" />
                      {importFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 导入模式 */}
              <div className="space-y-3">
                <Label>导入模式</Label>
                <RadioGroup
                  value={importMode}
                  onValueChange={(v) => setImportMode(v as 'merge' | 'replace')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="mode-merge" />
                    <Label htmlFor="mode-merge" className="font-normal">
                      合并模式 - 只添加新数据，不覆盖现有数据
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="mode-replace" />
                    <Label htmlFor="mode-replace" className="font-normal">
                      替换模式 - 如果 ID 相同则更新现有数据
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 跳过已存在 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipExisting"
                  checked={skipExisting}
                  onCheckedChange={(checked) =>
                    setSkipExisting(checked as boolean)
                  }
                />
                <Label htmlFor="skipExisting" className="text-sm">
                  跳过已存在的记录（基于 ID 判断）
                </Label>
              </div>

              {/* 警告提示 */}
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      注意事项
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>请确保备份文件来源可信</li>
                        <li>建议在导入前先导出当前数据作为备份</li>
                        <li>导入过程可能需要一些时间，请耐心等待</li>
                        <li>照片文件需要单独恢复，此功能只恢复数据库数据</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={!importFile || importMutation.isPending}
                  variant="destructive"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在导入...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      导入数据
                    </>
                  )}
                </Button>
              </div>

              {/* 导入结果 */}
              {importResult && (
                <div className="mt-4 rounded-md border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">{importResult.message}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {importResult.summary.totalImported}
                      </Badge>
                      <span>条导入成功</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {importResult.summary.totalSkipped}
                      </Badge>
                      <span>条已跳过</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {importResult.summary.totalErrors}
                      </Badge>
                      <span>条错误</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 操作记录 */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>备份操作记录</CardTitle>
                <CardDescription>最近的备份和恢复操作</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['backup-info'] })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {backupInfo?.recentOperations &&
              backupInfo.recentOperations.length > 0 ? (
                <div className="space-y-4">
                  {backupInfo.recentOperations.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-start gap-4 pb-4 border-b last:border-0"
                    >
                      <div
                        className={`rounded-full p-2 ${
                          op.action === 'export'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                            : 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
                        }`}
                      >
                        {op.action === 'export' ? (
                          <Download className="h-4 w-4" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{op.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(op.created_at).toLocaleString('zh-CN')}
                        </p>
                        {op.metadata && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(op.metadata.tables as string[])?.map((table) => (
                              <Badge
                                key={table}
                                variant="outline"
                                className="text-xs"
                              >
                                {table}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无备份操作记录
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
