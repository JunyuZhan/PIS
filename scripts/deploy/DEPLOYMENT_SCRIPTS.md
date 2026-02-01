# PIS 部署脚本总结

本文档总结了 PIS 项目中所有可用的部署脚本及其使用场景。

## 📋 部署脚本列表

### 1. `scripts/deploy/setup.sh` - 引导式部署脚本

**用途：** 交互式菜单，引导完成各种部署任务

**功能：**
- ✅ 本地开发环境设置
- ✅ 生产环境部署配置
- ✅ 环境变量配置
- ✅ Docker 服务管理（启动/停止/重启/查看日志）
- ✅ 数据库架构初始化指导
- ✅ 系统状态检查

**使用场景：**
- 首次部署时使用
- 需要交互式配置时使用
- 本地开发环境设置

**用法：**
```bash
bash scripts/deploy/setup.sh
```

**特点：**
- 菜单式交互界面
- 自动检查依赖
- 支持多种数据库类型（PostgreSQL（推荐）/Supabase（向后兼容））

---

### 2. `scripts/deploy/deploy.sh` - 一键部署脚本

**用途：** 自动化部署脚本，支持本地和远程部署

**功能：**
- ✅ 自动安装 Docker 和 Docker Compose
- ✅ 克隆代码仓库
- ✅ 选择数据库类型（PostgreSQL（推荐）/Supabase（向后兼容））
- ✅ 选择网络模式（内网/公网）
- ✅ 自动生成环境变量配置
- ✅ 构建和启动所有服务
- ✅ 健康检查

**使用场景：**
- 服务器上快速部署
- CI/CD 自动化部署
- 远程服务器部署

**用法：**
```bash
# 在服务器上直接运行
curl -sSL https://raw.githubusercontent.com/JunyuZhan/pis-standalone/main/scripts/deploy/deploy.sh | bash

# 在本地运行，远程部署
bash scripts/deploy/deploy.sh <服务器IP> [用户名]
```

**特点：**
- 支持非交互式模式（通过环境变量）
- 自动处理网络问题（DNS、防火墙）
- 多种构建策略（适应不同网络环境）

---

### 3. `docker/deploy.sh` - Standalone 部署脚本

**用途：** 完全自托管模式的部署向导

**功能：**
- ✅ 选择部署方式（混合/半自托管/完全自托管）
- ✅ 配置域名和 SSL
- ✅ 配置 PostgreSQL（推荐）或 Supabase（向后兼容）
- ✅ 配置 PostgreSQL（自托管模式）
- ✅ 配置 MinIO、Worker、告警等
- ✅ 生成配置文件并启动服务

**使用场景：**
- 完全自托管部署
- 需要自定义配置的部署
- Standalone 模式部署

**用法：**
```bash
cd docker
bash deploy.sh
```

**特点：**
- 详细的配置向导
- 支持三种部署模式
- 自动生成 SSL 证书（自签名）

---

### 4. `scripts/deploy/one-click-deploy.sh` - 真正的一键部署脚本 ⭐ 推荐

**用途：** 完全自动化部署，无需任何交互

**功能：**
- ✅ 完全自动化，无需交互
- ✅ 自动检测并安装 Docker、Docker Compose
- ✅ 自动克隆代码（如果不在项目目录）
- ✅ 使用默认配置（standalone 模式）
- ✅ 自动生成所有密钥和密码
- ✅ 自动启动所有服务
- ✅ 自动创建管理员账户（首次登录设置密码）

**使用场景：**
- 快速测试部署
- 演示环境部署
- 不需要自定义配置的场景

**用法：**
```bash
# 从 GitHub 直接运行
curl -sSL https://raw.githubusercontent.com/JunyuZhan/pis-standalone/main/scripts/deploy/one-click-deploy.sh | bash

# 或在项目目录中运行
bash scripts/deploy/one-click-deploy.sh
```

**特点：**
- 完全自动化
- 适合快速部署
- 使用默认配置

---

### 5. `scripts/deploy/quick-deploy.sh` - 快速部署脚本（只生成配置）

**用途：** 快速生成配置文件，不管理服务器上的容器

**功能：**
- ✅ 快速生成配置文件
- ✅ 不管理服务器上的容器
- ✅ 支持自定义 MinIO 密钥
- ✅ 生成部署信息

**使用场景：**
- 只生成配置文件
- 不启动容器
- 配置后手动启动容器

**用法：**
```bash
bash scripts/deploy/quick-deploy.sh
bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314
```

**特点：**
- 只生成配置
- 不管理容器
- 适合配置管理

---

### 7. `scripts/deploy/quick-upgrade.sh` - 快速升级脚本（只更新代码）

**用途：** 快速升级代码和配置，不管理服务器上的容器

**功能：**
- ✅ 拉取最新代码
- ✅ 更新配置文件
- ✅ 不管理服务器上的容器
- ✅ 支持强制更新

**使用场景：**
- 升级代码和配置
- 不重启容器
- 配置后手动重启容器

**用法：**
```bash
bash scripts/deploy/quick-upgrade.sh
bash scripts/deploy/quick-upgrade.sh --force
```

**特点：**
- 只更新代码
- 不管理容器
- 适合代码升级

---

### 8. `scripts/deploy/start-internal-services.sh` - 内网服务启动脚本

**用途：** 只启动内网容器（MinIO、Redis、数据库等），不启动 Worker 和 Web

**功能：**
- ✅ 自动检测 docker-compose 配置文件
- ✅ 只启动基础服务（MinIO、Redis、数据库）
- ✅ 不启动 Worker 和 Web 服务
- ✅ 健康检查
- ✅ 显示服务访问信息

**使用场景：**
- 本地开发时只需要存储和数据库服务
- 测试环境只需要基础服务
- 不想启动完整的应用栈

**用法：**
```bash
bash scripts/deploy/start-internal-services.sh
```

**特点：**
- 轻量级启动
- 自动适配不同的 docker-compose 配置
- 仅内网访问（127.0.0.1）

---

### 9. `scripts/deploy/update-worker-on-server.sh` - Worker 更新脚本

**用途：** 在服务器上拉取最新代码并更新 Worker 服务

**功能：**
- ✅ 拉取最新代码（可选）
- ✅ 更新环境配置
- ✅ 重新构建 Worker 镜像
- ✅ 重启 Worker 服务

**使用场景：**
- 更新 Worker 服务
- 应用代码更新

**用法：**
```bash
bash scripts/deploy/update-worker-on-server.sh
```

**特点：**
- 只更新 Worker
- 不影响其他服务
- 适合增量更新

---

### 10. `scripts/deploy/verify-deployment.sh` - 部署验证脚本

**用途：** 端到端验证部署是否成功

**功能：**
- ✅ 检查所有服务状态
- ✅ 测试 API 端点
- ✅ 验证数据库连接
- ✅ 验证存储连接

**使用场景：**
- 部署后验证
- 故障排查

**用法：**
```bash
bash scripts/deploy/verify-deployment.sh [SSH_HOST]
```

**特点：**
- 全面验证
- 自动化检查
- 适合 CI/CD

---

## 🐳 Docker Compose 配置文件

项目提供了多个 docker-compose 配置文件，适用于不同的部署场景：

### 1. `docker/docker-compose.yml` - Supabase 版本

**包含服务：**
- MinIO（对象存储）
- Redis（任务队列）
- Worker（图片处理）

**端口：**
- MinIO API: 19000
- MinIO Console: 19001
- Redis: 16379（仅本地）
- Worker: 3001

**使用场景：** 使用 Supabase 云数据库的部署

---

### 3. `docker/docker-compose.mysql.yml` - MySQL 版本

**包含服务：**
- MySQL（数据库）
- MinIO（对象存储）
- Redis（任务队列）
- Worker（图片处理）

**端口：**
- MySQL: 13306（仅本地）
- MinIO API: 19000
- MinIO Console: 19001
- Redis: 16379（仅本地）
- Worker: 3001

**使用场景：** 使用本地 MySQL 数据库的部署

---

### 4. `docker/docker-compose.standalone.yml` - 完全自托管版本

**包含服务：**
- PostgreSQL（数据库）
- MinIO（对象存储）
- Redis（任务队列）
- Web（Next.js 前端）
- Worker（图片处理）
- Nginx（反向代理）

**端口：**
- HTTP: 80
- HTTPS: 443
- PostgreSQL: 5432（仅本地）
- MinIO API: 9000（仅本地）
- MinIO Console: 9001（仅本地）
- Redis: 6379（仅本地）

**使用场景：** 完全自托管部署（所有服务都在本地）

---

## 🎯 快速参考

### 只启动内网容器（推荐用于开发）

```bash
# 使用新脚本
bash scripts/deploy/start-internal-services.sh

# 或手动启动
cd docker
docker-compose up -d minio redis minio-init
```

### 启动完整服务（混合部署，Supabase 数据库）

```bash
cd docker
docker-compose up -d
```

**注意**: 此模式需要单独部署前端到 Vercel，并配置 Supabase 数据库。

### 启动完整服务（Standalone 版本，推荐）

```bash
cd docker
docker-compose -f docker-compose.standalone.yml up -d
```

### 停止所有服务

```bash
cd docker
docker-compose -f docker-compose.standalone.yml down
# 或使用默认文件（docker-compose.yml）
docker-compose down
```

### 查看服务状态

```bash
cd docker
docker-compose ps
```

### 查看日志

```bash
cd docker
docker-compose logs -f [服务名]
# 例如：docker-compose logs -f worker
```

---

## 📝 选择指南

### 我需要什么脚本？

| 场景 | 推荐脚本 | 说明 |
|------|---------|------|
| **首次部署，完全自动化** | **`one-click-deploy.sh`** | **无需任何配置，一键完成** ⭐ |
| **首次部署，需要配置** | **`docker/deploy.sh`** | **引导式配置，适合新手** ⭐ |
| 首次部署，需要引导 | `setup.sh` | 交互式菜单，适合新手 |
| 快速部署到服务器 | `deploy.sh` | 自动化部署，支持远程 |
| 只生成配置 | `quick-deploy.sh` | 不管理容器，只生成配置 |
| 只更新代码 | `quick-upgrade.sh` | 不管理容器，只更新代码 |
| **只启动内网服务** | **`start-internal-services.sh`** | **轻量级，适合开发** |
| 更新 Worker | `update-worker-on-server.sh` | 更新 Worker 服务 |
| 验证部署 | `verify-deployment.sh` | 检查部署是否成功 |

### 我需要什么 docker-compose 文件？

| 数据库类型 | docker-compose 文件 | 说明 |
|-----------|-------------------|------|
| PostgreSQL（推荐） | `docker-compose.standalone.yml` | 完全自托管，包含所有服务 |
| Supabase（向后兼容） | `docker-compose.yml` | 混合部署：前端部署到 Vercel，数据库使用 Supabase |

---

## 🔧 环境变量配置

所有脚本都使用根目录的 `.env` 文件进行配置。

**重要提示：**
- 环境变量文件位于项目根目录（`/path/to/pis/.env`）
- Docker Compose 会自动读取 `../.env`（从 docker 目录执行时）
- 敏感信息（密码、密钥）必须从 `.env` 文件读取，不要硬编码

---

## 📚 相关文档

- [部署指南](../docs/i18n/zh-CN/DEPLOYMENT.md) - 详细部署步骤
- [部署指南 (English)](../docs/i18n/en/DEPLOYMENT.md) - Deployment guide
- [开发指南](../docs/DEVELOPMENT.md) - 开发环境设置
- [脚本工具集](./README.md) - 所有脚本的快速参考
