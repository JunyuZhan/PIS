import { Metadata } from 'next'
import { StyleTemplateManager } from '@/components/admin/style-template-manager'

export const metadata: Metadata = {
  title: '样式模板管理 - 管理后台',
  description: '管理相册视觉样式模板',
}

export default function StyleTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">样式模板管理</h1>
        <p className="text-text-muted mt-1">
          创建和管理相册的视觉样式模板，包括主题颜色、字体排版、布局效果等
        </p>
      </div>

      <StyleTemplateManager />
    </div>
  )
}
