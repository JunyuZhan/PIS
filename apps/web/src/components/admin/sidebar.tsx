'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Camera, Images, Settings, LogOut, Home, Brush, Users, BarChart3, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/lib/auth'
import { ThemeToggle } from '@/components/theme-toggle'

type UserRole = 'admin' | 'photographer' | 'retoucher' | 'guest'

// 动态导入 LanguageSwitcher，禁用 SSR 以避免 hydration 错误
const LanguageSwitcher = dynamic(
  () => import('@/components/ui/language-switcher').then(mod => ({ default: mod.LanguageSwitcher })),
  { ssr: false }
)

interface AdminSidebarProps {
  user: AuthUser
}

// 导航项配置（使用翻译键）
const navItemsConfig: Array<{
  href: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}> = [
  { href: '/admin', labelKey: 'sidebar.albumManagement', icon: Images },
  { href: '/admin/customers', labelKey: 'sidebar.customerManagement', icon: UserCheck, roles: ['admin'] },
  { href: '/admin/analytics', labelKey: 'sidebar.analytics', icon: BarChart3, roles: ['admin'] },
  { href: '/admin/retouch', labelKey: 'sidebar.retouchWorkbench', icon: Brush, roles: ['admin', 'retoucher'] },
  { href: '/admin/users', labelKey: 'sidebar.userManagement', icon: Users, roles: ['admin'] },
  { href: '/admin/settings', labelKey: 'sidebar.systemSettings', icon: Settings, roles: ['admin'] },
]

export function SidebarContent({ user }: { user: AuthUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('admin')

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-serif font-bold">{t('sidebar.title')}</h1>
            <p className="text-xs text-text-muted">{t('sidebar.subtitle')}</p>
          </div>
        </Link>
      </div>

      {/* 返回前端按钮 */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            'text-text-secondary hover:text-text-primary hover:bg-surface-elevated',
            'border border-border hover:border-accent/20'
          )}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">{t('sidebar.backToFrontend')}</span>
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-1">
        {navItemsConfig
          .filter((item) => {
            // 如果没有指定 roles，所有角色都可以访问
            if (!item.roles) return true
            // 如果用户没有角色信息，默认不允许访问（安全起见）
            if (!user.role) return false
            // 检查用户角色是否在允许的角色列表中
            return item.roles.includes(user.role as UserRole)
          })
          .map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin' || pathname.startsWith('/admin/albums')
                : item.href === '/admin/users'
                ? pathname.startsWith('/admin/users')
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </Link>
            )
          })}
      </nav>

      {/* 语言切换器和主题切换 */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex items-center justify-center gap-2">
          <ThemeToggle 
            size="sm" 
            className="p-2 min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface transition-colors active:scale-[0.98] touch-manipulation" 
          />
          <LanguageSwitcher />
        </div>
      </div>

      {/* 用户信息 */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
            title={t('sidebar.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 hidden md:block">
      <SidebarContent user={user} />
    </aside>
  )
}
