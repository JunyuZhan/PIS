# PIS 快速部署和升级指南

## 📋 概述

本指南介绍如何使用快速部署和升级脚本，不涉及服务器容器的管理。

---

## 🚀 快速部署（首次部署）

### 脚本名称

- `scripts/deploy/quick-deploy.sh`

### 特性

- ✅ 生成随机密钥
- ✅ 创建配置文件（.env）
- ✅ 生成部署信息（.deployment-info）
- ✅ 支持自定义 MinIO 用户名和密码
- ✅ 不启动服务器上的容器

### 使用方法

#### 方法 1：使用随机密钥（推荐）

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-deploy.sh
```

#### 方法 2：自定义 MinIO 密码

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314
```

### 输出文件

| 文件               | 说明                                     |
| ------------------ | ---------------------------------------- |
| `.env`             | 环境配置文件（包含所有密钥）             |
| `.deployment-info` | 部署信息（MinIO 登录信息、数据库连接等） |

### 部署信息示例

```bash
cat .deployment-info
```

输出内容：

```bash
# MinIO 登录信息
# 用户名: <随机生成的用户名>
# 密码: <随机生成的密码>
# Bucket: pis-photos

# 数据库连接信息
# 数据库类型: PostgreSQL
# 数据库主机: postgres
# 数据库端口: 5432
# 数据库名称: pis
# 数据库用户: pis
# 数据库密码: <随机生成的密码>

# Worker API Key: <随机生成的密钥>
# JWT Secret: <随机生成的密钥>
# 会话密钥: <随机生成的密钥>
```

---

## 🔄 快速升级（更新代码）

### 脚本名称

- `scripts/deploy/quick-upgrade.sh`

### 特性

- ✅ 更新代码（git pull）
- ✅ 检查配置文件
- ✅ 保留现有配置
- ✅ 检测默认密钥
- ✅ 不启动/停止服务器上的容器
- ✅ 支持 `--force` 选项（强制更新）

### 使用方法

#### 方法 1：普通升级（推荐）

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-upgrade.sh
```

#### 方法 2：强制升级

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-upgrade.sh --force
```

### 强制升级场景

- 有未提交的更改，但仍要升级
- 忽略警告，强制更新代码

---

## 🎯 一键部署和升级（推荐）

### 脚本名称

- `scripts/deploy/quick-deploy.sh` - 快速部署
- `scripts/deploy/quick-upgrade.sh` - 快速升级

### 特性

- ✅ 首次部署：生成配置、提交、推送
- ✅ 升级：更新代码、提交、推送
- ✅ 保留现有配置
- ✅ 不管理服务器上的容器
- ✅ 支持自定义 MinIO 密码
- ✅ 支持 `--force` 选项（强制更新）

### 使用方法

#### 方法 1：首次部署（生成配置）

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-deploy.sh
```

#### 方法 2：首次部署（自定义 MinIO 密码）

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314
```

#### 方法 3：升级（保留配置）

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-upgrade.sh
```

#### 方法 4：强制升级（忽略警告）

```bash
cd /opt/pis-standalone
bash scripts/deploy/quick-upgrade.sh --force
```

---

## 📋 完整工作流程

### 首次部署流程

#### 1. 本地操作（在 Mac 上）

```bash
# 1. 进入项目目录
cd /Users/apple/Documents/Project/PIS/pis-standalone

# 2. 首次部署（生成配置）
bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314

# 3. 查看部署信息
cat .deployment-info
```

#### 2. 推送到 GitHub

脚本会自动执行：

- ✅ 生成配置文件（.env）
- ✅ 添加文件到 Git
- ✅ 提交更改
- ✅ 推送到 GitHub

#### 3. 服务器操作（在 192.168.50.10 上）

```bash
# 1. 进入项目目录
cd /opt/pis-standalone

# 2. 拉取最新代码
git pull origin main

# 3. 启动服务
cd docker
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 查看服务日志
docker compose logs -f
```

---

## 🔄 升级流程

### 1. 本地操作（在 Mac 上）

```bash
# 1. 进入项目目录
cd /Users/apple/Documents/Project/PIS/pis-standalone

# 2. 升级（保留配置）
bash scripts/deploy/quick-upgrade.sh

# 或者强制升级（有未提交的更改）
bash scripts/deploy/quick-upgrade.sh --force
```

#### 2. 推送到 GitHub

脚本会自动执行：

- ✅ 检查 Git 状态
- ✅ 拉取最新代码（git pull）
- ✅ 添加文件到 Git
- ✅ 提交更改
- ✅ 推送到 GitHub

#### 3. 服务器操作（在 192.168.50.10 上）

```bash
# 1. 进入项目目录
cd /opt/pis-standalone

# 2. 拉取最新代码
git pull origin main

# 3. 停止服务
cd docker
docker compose down

# 4. 重新构建并启动服务
docker compose up -d --build

# 5. 查看服务状态
docker compose ps

# 6. 查看服务日志
docker compose logs -f
```

---

## 📝 修改配置

### 场景：修改 MinIO 密码

#### 方法 1：手动编辑（推荐）

```bash
# 1. 编辑配置文件
cd /opt/pis-standalone
vim .env

# 2. 修改 MinIO 配置
# MINIO_ROOT_USER=albert
# MINIO_ROOT_PASSWORD=Zjy-1314

# 3. 提交更改
git add .env
git commit -m "feat: 修改 MinIO 密码为 albert/Zjy-1314"
git push origin main
```

#### 方法 2：快速部署（生成新配置）

```bash
# 1. 备份旧配置
cp .env .env.backup

# 2. 删除旧配置
rm .env

# 3. 重新部署（生成新配置）
bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314
```

---

## 🔧 服务器容器管理

### 启动服务

```bash
cd /opt/pis-standalone/docker
docker compose up -d
```

### 停止服务

```bash
cd /opt/pis-standalone/docker
docker compose down
```

### 重新构建并启动

```bash
cd /opt/pis-standalone/docker
docker compose down
docker compose up -d --build
```

### 查看服务状态

```bash
cd /opt/pis-standalone/docker
docker compose ps
```

### 查看服务日志

```bash
cd /opt/pis-standalone/docker
docker compose logs -f
```

### 重启特定服务

```bash
cd /opt/pis-standalone/docker
docker compose restart pis-minio
docker compose restart pis-web
docker compose restart pis-worker
```

---

## ⚠️ 注意事项

### 1. 脚本不管理容器

- ⚠️ 本脚本只生成配置和更新代码
- ⚠️ 不启动/停止服务器上的容器
- ⚠️ 服务器上的容器需要手动管理

### 2. 配置文件

- ✅ 首次部署生成 `.env` 文件
- ✅ 升级时保留 `.env` 文件
- ✅ `.env` 文件不会被脚本覆盖

### 3. Git 管理

- ✅ 提交和推送到 GitHub 由脚本自动完成
- ✅ 服务器上只需执行 `git pull`

### 4. 密钥安全

- ⚠️ 部署信息（.deployment-info）包含敏感信息
- ⚠️ 请妥善保管 `.deployment-info` 文件
- ⚠️ 不要将 `.deployment-info` 提交到 Git

---

## 📞 故障排查

### 问题：脚本生成新配置，但想保留旧配置

**原因：** 多次运行部署脚本

**解决：**

```bash
# 恢复备份
cp /opt/pis-standalone/.env.backup /opt/pis-standalone/.env

# 提交更改
git add .env
git commit -m "feat: 恢复旧配置"
git push origin main
```

### 问题：服务器 git pull 失败

**原因：** 服务器上有未提交的更改

**解决：**

```bash
# 暂存更改
cd /opt/pis-standalone
git stash push -m "Auto-stash before pull"

# 拉取代码
git pull origin main

# 恢复暂存（如果需要）
git stash pop
```

### 问题：MinIO 无法登录

**原因：** 密码配置错误或容器未重启

**解决：**

```bash
# 1. 检查配置
cd /opt/pis-standalone
grep MINIO_ROOT .env

# 2. 重启 MinIO 容器
cd docker
docker compose restart pis-minio

# 3. 检查环境变量
docker exec pis-minio env | grep MINIO_ROOT
```

### 问题：服务无法启动

**原因：** 配置错误或依赖未就绪

**解决：**

```bash
# 1. 查看日志
cd /opt/pis-standalone/docker
docker compose logs -f

# 2. 检查配置
cat .env

# 3. 重新构建
docker compose down
docker compose up -d --build
```

---

## 📊 命令速查表

### 本地操作（Mac）

| 命令                                                                                    | 说明                          |
| --------------------------------------------------------------------------------------- | ----------------------------- |
| `bash scripts/deploy/quick-deploy.sh`                                           | 首次部署（生成配置）          |
| `bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314` | 首次部署（自定义 MinIO 密码） |
| `bash scripts/deploy/quick-upgrade.sh`                                         | 升级（更新代码）              |
| `bash scripts/deploy/quick-upgrade.sh --force`                                 | 强制升级（忽略警告）          |
| `cat .deployment-info`                                                                  | 查看部署信息                  |

### 服务器操作（192.168.50.10）

| 命令                                                            | 说明           |
| --------------------------------------------------------------- | -------------- |
| `cd /opt/pis-standalone && git pull origin main`                | 拉取最新代码   |
| `cd /opt/pis-standalone/docker && docker compose up -d`         | 启动服务       |
| `cd /opt/pis-standalone/docker && docker compose down`          | 停止服务       |
| `cd /opt/pis-standalone/docker && docker compose up -d --build` | 重新构建并启动 |
| `cd /opt/pis-standalone/docker && docker compose ps`            | 查看服务状态   |
| `cd /opt/pis-standalone/docker && docker compose logs -f`       | 查看服务日志   |
| `docker restart pis-minio`                                      | 重启 MinIO     |
| `docker restart pis-web`                                        | 重启 Web       |
| `docker restart pis-worker`                                     | 重启 Worker    |

---

## 🎯 推荐工作流程

### 首次部署

```bash
# 本地（Mac）
cd /Users/apple/Documents/Project/PIS/pis-standalone
bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314

# 服务器（192.168.50.10）
cd /opt/pis-standalone
git pull origin main
cd docker
docker compose up -d
```

### 日常升级

```bash
# 本地（Mac）
cd /Users/apple/Documents/Project/PIS/pis-standalone
bash scripts/deploy/quick-upgrade.sh

# 服务器（192.168.50.10）
cd /opt/pis-standalone
git pull origin main
cd docker
docker compose down
docker compose up -d --build
```

### 修改配置

```bash
# 本地（Mac）
cd /Users/apple/Documents/Project/PIS/pis-standalone
vim .env
git add .env
git commit -m "feat: 修改配置"
git push origin main

# 服务器（192.168.50.10）
cd /opt/pis-standalone
git pull origin main
cd docker
docker compose restart <service-name>
```

---

## ✅ 总结

### 部署脚本特性

| 特性             | 说明                                       |
| ---------------- | ------------------------------------------ |
| **不管理容器**   | 脚本不启动/停止服务器上的容器              |
| **自动生成配置** | 首次部署时生成随机密钥                     |
| **保留现有配置** | 升级时不会覆盖 `.env` 文件                 |
| **自定义配置**   | 支持 `--minio-user` 和 `--minio-pass` 参数 |
| **强制更新**     | 支持 `--force` 选项                        |
| **自动推送**     | 自动提交并推送到 GitHub                    |
| **部署信息**     | 生成 `.deployment-info` 文件               |

### 工作流程

1. **首次部署**：生成配置 → 提交推送 → 服务器拉取 → 启动服务
2. **日常升级**：更新代码 → 提交推送 → 服务器拉取 → 重启服务
3. **修改配置**：编辑 .env → 提交推送 → 服务器拉取 → 重启服务
4. **故障排查**：查看日志 → 检查配置 → 重启服务

### 访问地址

| 服务              | 地址                            |
| ----------------- | ------------------------------- |
| **Web 前端**      | http://192.168.50.10:8081       |
| **管理后台**      | http://192.168.50.10:8081/admin |
| **MinIO Console** | http://192.168.50.10:19001      |

---

**记住：本脚本不管理服务器上的容器，服务器上的容器需要手动管理！**
