# 服务器部署指南

> 在服务器上直接部署 PIS 的步骤说明

---

## 🚀 快速部署步骤

### 1. 连接到服务器

```bash
ssh myu
cd /opt/pis
```

### 2. 确保代码是最新的

```bash
# 如果还没有克隆代码
cd /opt
git clone https://github.com/JunyuZhan/pis.git
cd pis
git checkout development

# 如果已经克隆，更新代码
cd /opt/pis
git pull origin development
```

### 3. 运行交互式部署脚本

```bash
cd /opt/pis/docker
bash deploy.sh
```

### 4. 按照提示完成配置

脚本会引导你完成以下配置：

1. **检查 Docker 环境** ✅ 自动检测
2. **选择部署架构** 
   - 选择 `1` (完全自托管，推荐)
3. **配置域名**
   - 如果有域名，输入域名
   - 如果没有，使用 `localhost` 或服务器 IP
4. **配置数据库** (PostgreSQL)
   - 数据库主机: `localhost` 或 `postgres` (Docker 内)
   - 数据库端口: `5432` (默认)
   - 数据库名称: `pis` (默认)
   - 数据库用户: `pis` (默认)
   - 数据库密码: **留空自动生成** (推荐)
5. **配置 MinIO**
   - MinIO 访问密钥: **留空自动生成** (推荐)
   - MinIO 密钥: **留空自动生成** (推荐)
6. **配置 Worker API**
   - Worker API 密钥: **留空自动生成** (推荐)
7. **配置安全密钥**
   - 相册会话密钥: **留空自动生成** (推荐)
8. **配置告警** (可选)
   - 选择 `3` (仅日志记录) 或配置 Telegram/Email
9. **生成配置文件**
   - 脚本会自动生成 `.env` 文件
10. **检查数据库初始化**
    - Docker 会自动初始化数据库
11. **创建管理员账号**
    - 邮箱: `admin@pis.com` (默认)
    - 密码: 首次登录时设置

### 5. 启动服务

脚本完成后，会自动启动 Docker 服务：

```bash
cd /opt/pis/docker
docker compose -f docker-compose.yml up -d
```

### 6. 验证部署

```bash
# 检查容器状态
docker ps | grep pis

# 查看日志
cd /opt/pis/docker
docker compose -f docker-compose.yml logs -f

# 访问应用
# http://your-server-ip:8088
# 或 http://localhost:8088
```

---

## 📋 配置说明

### 默认配置（推荐）

如果所有配置都使用默认值（留空），脚本会自动：

- ✅ 生成安全的随机密码和密钥
- ✅ 使用 Docker 内数据库 (`postgres`)
- ✅ 使用 Docker 内 MinIO (`minio`)
- ✅ 使用 Docker 内 Redis (`redis`)
- ✅ 配置端口 8088 作为唯一入口

### 域名配置

**如果有域名**：
- 输入你的域名（如 `pis.example.com`）
- 确保域名已解析到服务器 IP

**如果没有域名**：
- 使用 `localhost` 或服务器 IP
- 可以通过 IP:8088 访问

### 端口说明

- **8088**: 唯一 Web 访问端口（HTTP）
- **21**: FTP 端口（相机上传）
- **30000-30009**: FTP 被动模式端口范围

其他服务（PostgreSQL、MinIO、Redis、Worker）**不对外暴露**，仅内部访问。

---

## 🔧 常见问题

### Q: 如何查看部署日志？

```bash
cd /opt/pis/docker
docker compose -f docker-compose.yml logs -f
```

### Q: 如何重启服务？

```bash
cd /opt/pis/docker
docker compose -f docker-compose.yml restart
```

### Q: 如何停止服务？

```bash
cd /opt/pis/docker
docker compose -f docker-compose.yml down
```

### Q: 如何更新代码？

```bash
cd /opt/pis
git pull origin development
cd docker
docker compose -f docker-compose.yml up -d --build
```

### Q: 忘记管理员密码怎么办？

```bash
# 方法1: 重置密码（需要数据库访问）
cd /opt/pis
pnpm create-admin

# 方法2: 通过数据库直接修改
docker exec -it pis-postgres psql -U pis -d pis
# 然后执行 SQL 更新密码
```

---

## ✅ 部署后检查清单

- [ ] 所有容器正常运行 (`docker ps`)
- [ ] 可以访问 Web 界面 (`http://server-ip:8088`)
- [ ] 可以登录管理后台 (`http://server-ip:8088/admin/login`)
- [ ] 可以上传照片
- [ ] 照片处理正常（生成缩略图和预览图）
- [ ] 可以访问相册（访客模式）

---

**提示**: 部署脚本是交互式的，需要根据提示输入配置。建议使用默认值（留空）让脚本自动生成安全密钥。
