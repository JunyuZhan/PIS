import { Metadata } from 'next'
import { AuditLogViewer } from '@/components/admin/audit-log-viewer'

export const metadata: Metadata = {
  title: '操作日志 - 管理后台',
  description: '查看系统操作日志和审计记录',
}

export default function AuditLogsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">操作日志</h1>
        <p className="text-muted-foreground">
          查看系统操作日志，追踪用户行为和变更记录
        </p>
      </div>

      <AuditLogViewer />
    </div>
  )
}
