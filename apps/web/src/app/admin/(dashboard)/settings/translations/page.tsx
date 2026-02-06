import { Metadata } from 'next'
import { TranslationManager } from '@/components/admin/translation-manager'

export const metadata: Metadata = {
  title: '语言包管理 - 管理后台',
  description: '管理系统翻译字符串',
}

export default function TranslationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">语言包管理</h1>
        <p className="text-text-muted mt-1">
          管理系统的多语言翻译字符串，可以自定义覆盖默认翻译
        </p>
      </div>

      <TranslationManager />
    </div>
  )
}
