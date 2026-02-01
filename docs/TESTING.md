# PIS 测试指南

> 最后更新: 2026-02-01

---

## 📋 概述

PIS 项目提供了全面的测试套件，涵盖：

- ✅ API 端点测试
- ✅ 业务逻辑测试
- ✅ 前端组件测试（53个测试用例）
- ✅ E2E 测试（5个测试文件）
- ✅ 移动端测试（多设备支持）
- ✅ 边界情况测试
- ✅ 浏览器兼容性测试
- ✅ 性能测试
- ✅ 安全测试

---

## 🚀 快速开始

### 前置条件

1. **安装依赖**:
   ```bash
   pnpm install
   ```

2. **启动服务** (E2E 测试需要):
   ```bash
   # 方式1: 使用 Docker
   cd docker && docker-compose up -d
   
   # 方式2: 使用 pnpm
   pnpm dev
   ```

3. **安装 Playwright 浏览器** (首次运行 E2E 测试):
   ```bash
   pnpm exec playwright install --with-deps
   ```

### 一键运行所有测试

```bash
# 运行完整测试套件（推荐）
bash scripts/test/test-all.sh

# 或运行综合测试
bash scripts/test/comprehensive-test.sh

# 分步骤测试（生成详细报告）
bash scripts/test/run-tests.sh
```

---

## 📋 运行测试

### 1. 组件测试

```bash
# 运行所有组件测试
pnpm test:components

# 查看覆盖率
cd apps/web
pnpm test:coverage src/components

# 监视模式（开发时使用）
cd apps/web
pnpm test:watch src/components
```

### 2. E2E 测试

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# UI 模式运行（可视化，推荐）
pnpm test:e2e:ui

# 调试模式
pnpm test:e2e:debug

# 运行特定测试文件
pnpm exec playwright test e2e/admin-flow.spec.ts

# 运行特定浏览器
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
```

### 3. 移动端测试

```bash
# 运行移动端测试
pnpm test:mobile

# 或直接运行
pnpm exec playwright test --project="Mobile Chrome"
pnpm exec playwright test --project="Mobile Safari"
```

### 4. 边界情况测试

```bash
# 运行边界情况测试
pnpm test:edge-cases

# 或直接运行
bash scripts/test/test-edge-cases.sh
```

### 5. 浏览器兼容性测试

```bash
# 运行浏览器兼容性测试
pnpm test:browser-compat

# 或直接运行
bash scripts/test/test-browser-compat.sh
```

### 6. 其他测试脚本

```bash
# API 端点测试
bash scripts/test/test-api-endpoints.sh

# 登录流程测试
bash scripts/test/test-login-flow.sh

# 业务逻辑测试
bash scripts/test/test-business-logic.sh

# 用户体验测试
bash scripts/test/test-user-experience.sh

# 高并发测试
bash scripts/test/test-high-concurrency.sh
```

---

## 📊 测试脚本说明

### 主要测试脚本

#### 1. `scripts/test/test-all.sh`
**一键运行所有测试**

- ✅ 环境检查
- ✅ 容器状态检查
- ✅ API 端点测试
- ✅ 登录流程测试
- ✅ 数据库功能测试
- ✅ Redis 功能测试
- ✅ MinIO 功能测试
- ✅ Worker 服务测试
- ✅ 资源使用情况

**输出**: 生成时间戳报告文件到 `/tmp/pis-complete-test-report-*.txt`

#### 2. `scripts/test/comprehensive-test.sh`
**综合测试脚本**

**参数**:
- `--skip-build`: 跳过代码质量检查（TypeScript、ESLint）
- `--skip-stress`: 跳过压力测试
- `--skip-security`: 跳过安全检查

**测试内容**:
- 环境检查（Docker、Node.js、pnpm）
- 容器状态和健康检查
- 代码质量测试（可选）
- 单元测试和集成测试
- API 业务逻辑测试
- 数据库连接测试
- 压力测试（可选）
- 安全测试（可选）

**示例**:
```bash
# 运行所有测试
bash scripts/test/comprehensive-test.sh

# 跳过构建相关测试（更快）
bash scripts/test/comprehensive-test.sh --skip-build

# 仅运行核心功能测试
bash scripts/test/comprehensive-test.sh --skip-build --skip-stress --skip-security
```

#### 3. `scripts/test/test-api-endpoints.sh`
**API 端点详细测试**

测试所有 API 端点的功能和响应：
- ✅ 健康检查端点
- ✅ 认证相关端点
- ✅ 公开相册端点
- ✅ 代理端点（MinIO、Media、Worker）
- ✅ 管理端点（需要认证）

#### 4. `scripts/test/test-login-flow.sh`
**登录流程完整测试**

测试登录相关的所有功能：
- ✅ 管理员状态检查
- ✅ 登录页面可访问性
- ✅ 登录 API 验证（空数据、无效格式、缺少字段）
- ✅ 用户名登录支持（admin）
- ✅ SQL 注入防护
- ✅ XSS 防护
- ✅ CORS 配置
- ✅ 速率限制检查

---

## 📊 测试报告

### 组件测试报告

组件测试报告会显示在终端，包括：
- 测试通过/失败状态
- 测试覆盖率（如果使用 `--coverage`）
- 失败的测试详情

### E2E 测试报告

E2E 测试报告位置：
- **HTML 报告**: `playwright-report/index.html`
- **JSON 报告**: `test-results/results.json`
- **截图**: `test-results/` (失败时自动保存)
- **视频**: `test-results/` (失败时自动保存)

查看 HTML 报告：
```bash
pnpm exec playwright show-report
```

---

## 🐛 调试测试

### 组件测试调试

```bash
# 使用 Node.js 调试器
cd apps/web
node --inspect-brk node_modules/.bin/vitest

# 或使用 VS Code 调试配置
# 在 .vscode/launch.json 中添加配置
```

### E2E 测试调试

```bash
# 调试模式（会打开浏览器）
pnpm test:e2e:debug

# 或使用 Playwright Inspector
PWDEBUG=1 pnpm exec playwright test

# 在代码中添加断点
await page.pause()
```

---

## 📝 编写新测试

### 添加组件测试

1. 在组件文件旁边创建 `.test.tsx` 文件
2. 使用 `@testing-library/react` 编写测试
3. 参考现有测试文件作为模板

**示例**:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YourComponent } from './your-component'

describe('YourComponent', () => {
  it('应该正确渲染', () => {
    render(<YourComponent />)
    expect(screen.getByText('预期文本')).toBeInTheDocument()
  })
})
```

### 添加 E2E 测试

1. 在 `e2e/` 目录创建 `.spec.ts` 文件
2. 使用 Playwright API 编写测试
3. 参考现有测试文件作为模板

**示例**:
```typescript
import { test, expect } from '@playwright/test'

test('应该能够完成某个操作', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/')
})
```

---

## ⚙️ 配置

### Playwright 配置

配置文件: `playwright.config.ts`

主要配置项：
- `testDir`: 测试文件目录（默认: `./e2e`）
- `baseURL`: 基础 URL（默认: `http://localhost:3000`）
- `projects`: 测试项目（浏览器和设备）
- `webServer`: Web 服务器配置（自动启动开发服务器）

### Vitest 配置

配置文件: `apps/web/vitest.config.ts`

主要配置项：
- `test.include`: 测试文件模式
- `test.coverage`: 覆盖率配置
- `test.setupFiles`: 测试设置文件

---

## 🔍 测试覆盖范围

### 业务逻辑测试 ✅
- [x] API 端点功能
- [x] 登录流程
- [x] 管理员状态检查
- [x] 错误处理

### 代码质量测试 ⚠️
- [x] ESLint 检查（有少量警告）
- [x] TypeScript 类型检查（有少量错误）
- [ ] 代码覆盖率（目标: 80%+）

### 压力测试 ✅
- [x] Apache Bench 测试
- [x] 并发请求测试
- [ ] 长时间运行测试

### 安全测试 ✅
- [x] SQL 注入防护
- [x] XSS 防护
- [x] 路径遍历防护
- [x] CORS 配置
- [x] 敏感信息检查

---

## 🐛 常见问题

### Q: E2E 测试失败，提示服务未运行

**A**: 确保服务正在运行：
```bash
# 检查服务状态
curl http://localhost:3000/health

# 启动服务
pnpm dev
# 或
cd docker && docker-compose up -d
```

### Q: Playwright 浏览器未安装

**A**: 安装浏览器：
```bash
pnpm exec playwright install --with-deps
```

### Q: 组件测试失败，提示找不到模块

**A**: 检查测试设置文件 `apps/web/src/test/setup.ts` 是否正确配置了 mock。

### Q: 如何跳过某些测试？

**A**: 使用 `test.skip()`:
```typescript
test.skip('这个测试暂时跳过', async () => {
  // ...
})
```

### Q: 测试失败：容器未运行

**解决方案**:
```bash
# 启动所有容器
docker compose -f docker/docker-compose.standalone.yml up -d

# 等待容器健康
docker compose -f docker/docker-compose.standalone.yml ps
```

### Q: 测试失败：端口被占用

**解决方案**:
```bash
# 检查端口占用
lsof -i :8081

# 停止占用端口的进程或修改端口配置
```

### Q: 测试失败：数据库连接错误

**解决方案**:
```bash
# 检查 PostgreSQL 容器状态
docker exec pis-postgres psql -U pis -d pis -c "SELECT 1;"

# 检查环境变量
docker exec pis-postgres env | grep POSTGRES
```

---

## 📈 测试结果解读

### 测试状态

- ✅ **通过**: 测试成功
- ⚠️ **警告**: 测试通过但有警告（不影响功能）
- ❌ **失败**: 测试失败

### 性能指标

#### API 响应时间
- 健康检查: ~40-77ms (P95: 72ms)
- 管理员状态: ~40-50ms
- 登录端点: ~50-100ms

#### 并发性能
- 10 并发: ✅ 稳定
- 请求速率: 222+ 请求/秒
- 错误率: 0%

### 资源使用

典型资源使用情况（参考）：
- **Web 容器**: ~76MB 内存，3-4% CPU
- **Worker 容器**: ~38MB 内存，<1% CPU
- **PostgreSQL**: ~29MB 内存，<1% CPU
- **Redis**: ~15MB 内存，<1% CPU
- **MinIO**: ~308MB 内存，<1% CPU

---

## 🎯 最佳实践

1. **定期运行测试**: 在提交代码前运行 `bash scripts/test/test-all.sh`
2. **查看报告**: 检查生成的测试报告文件
3. **修复失败**: 优先修复失败的测试
4. **提高覆盖率**: 为新功能添加测试
5. **性能监控**: 定期运行压力测试，监控性能变化

---

## 📚 相关文档

- [测试覆盖分析](./TEST_COVERAGE_ANALYSIS.md) - 详细的测试覆盖分析
- [测试脚本文档](../scripts/test/README.md) - 测试脚本使用说明
- [Playwright 文档](https://playwright.dev) - Playwright 官方文档
- [Testing Library 文档](https://testing-library.com) - Testing Library 官方文档

---

**测试工具**: Vitest, Playwright, Apache Bench, curl, Docker CLI  
**测试环境**: Docker Compose (Standalone 模式)  
**报告位置**: `/tmp/pis-*-test-report-*.txt`
