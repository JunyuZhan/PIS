import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-intl translations
const mockTranslations: Record<string, Record<string, string>> = {
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    close: '关闭',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    search: '搜索',
    filter: '筛选',
    reset: '重置',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    submit: '提交',
    upload: '上传',
    download: '下载',
    preview: '预览',
    view: '查看',
    copy: '复制',
    share: '分享',
    settings: '设置',
    logout: '退出登录',
    login: '登录',
    register: '注册',
  },
  nav: {
    dashboard: '控制台',
    albums: '相册管理',
    settings: '设置',
    customers: '客户管理',
    collaborators: '协作者',
    templates: '模板管理',
  },
  album: {
    title: '相册标题',
    password: '访问密码',
    description: '描述',
    settings: '相册设置',
    watermark: '水印设置',
    expireAt: '过期时间',
    allowDownload: '允许下载',
    photos: '照片',
    uploadPhotos: '上传照片',
    deleteAlbum: '删除相册',
    newPhotos: '{count} 张新照片',
    clickToRefresh: '点击刷新',
    faceSearch: '人脸搜索结果',
  },
  sidebar: {
    albums: '相册',
    customers: '客户',
    collaborators: '协作者',
    templates: '模板',
    settings: '设置',
    dashboard: '控制台',
    collapse: '收起侧边栏',
    expand: '展开侧边栏',
    albumManagement: '相册管理',
    customerManagement: '客户管理',
    analytics: '数据分析',
    retouchWorkbench: '修图工作台',
    userManagement: '用户管理',
    systemSettings: '系统设置',
    backToFrontend: '返回前端',
    logout: '退出登录',
    title: 'PIS',
    subtitle: '照片智能服务',
  },
  admin: {
    'sidebar.albumManagement': '相册管理',
    'sidebar.customerManagement': '客户管理',
    'sidebar.analytics': '数据分析',
    'sidebar.retouchWorkbench': '修图工作台',
    'sidebar.userManagement': '用户管理',
    'sidebar.systemSettings': '系统设置',
    'sidebar.backToFrontend': '返回前端',
    'sidebar.logout': '退出登录',
    'sidebar.title': 'PIS',
    'sidebar.subtitle': '照片智能服务',
  },
  password: {
    current: '当前密码',
    new: '新密码',
    confirm: '确认密码',
    change: '修改密码',
    mismatch: '两次输入的密码不一致',
  },
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, unknown>) => {
    // 首先尝试在指定命名空间中查找
    if (namespace && mockTranslations[namespace]?.[key]) {
      return mockTranslations[namespace][key]
    }
    // 然后在 common 命名空间中查找
    if (mockTranslations.common?.[key]) {
      return mockTranslations.common[key]
    }
    // 最后返回 key 本身
    return key
  },
  useLocale: () => 'zh-CN',
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  }),
  createClientFromRequest: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  }),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.AUTH_JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-minimum-32-chars'

// Mock toast functions
vi.mock('@/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  handleApiError: vi.fn(),
}))

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: (importFn: () => Promise<any>) => {
    return {
      __esModule: true,
      default: () => null,
    }
  },
}))

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  callback: IntersectionObserverCallback
  root: Element | null = null
  rootMargin: string = ''
  thresholds: ReadonlyArray<number> = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

global.IntersectionObserver = MockIntersectionObserver as any
