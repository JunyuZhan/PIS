# Release Notes Template

> 使用此模板创建 GitHub Release Notes

---

## 🎉 Release vX.X.X

**发布日期**: YYYY-MM-DD

### 📋 概述

简要描述此版本的主要变更和改进。

---

## ✨ 新功能 (Features)

### 🎨 功能名称
- **描述**: 详细描述新功能
- **使用场景**: 何时使用此功能
- **文档**: [相关文档链接](#)

### 🎨 功能名称 2
- **描述**: 详细描述新功能
- **使用场景**: 何时使用此功能
- **文档**: [相关文档链接](#)

---

## 🐛 Bug 修复 (Bug Fixes)

### 🔧 修复的问题
- **问题**: 描述修复的问题
- **影响**: 谁受到影响
- **解决方案**: 如何修复的

### 🔧 修复的问题 2
- **问题**: 描述修复的问题
- **影响**: 谁受到影响
- **解决方案**: 如何修复的

---

## 🔄 改进 (Improvements)

### ⚡ 性能优化
- **改进**: 描述性能改进
- **影响**: 性能提升百分比或具体指标

### 🎯 用户体验改进
- **改进**: 描述 UX 改进
- **影响**: 如何改善用户体验

---

## 🔒 安全更新 (Security)

### 🛡️ 安全修复
- **问题**: 描述安全漏洞
- **严重程度**: 高/中/低
- **影响**: 谁受到影响
- **解决方案**: 如何修复的

---

## 📚 文档更新 (Documentation)

- 更新了部署文档
- 添加了新的 API 文档
- 更新了用户指南

---

## 🔧 技术变更 (Technical Changes)

### 破坏性变更 (Breaking Changes)

⚠️ **注意**: 此版本包含破坏性变更，升级前请阅读迁移指南。

- **变更**: 描述破坏性变更
- **影响**: 谁受到影响
- **迁移指南**: [迁移文档链接](#)

### 依赖更新

- 更新了 `package-name` 从 `x.x.x` 到 `y.y.y`
- 更新了 `package-name-2` 从 `x.x.x` 到 `y.y.y`

### 数据库变更

- 新增表: `table_name`
- 修改表: `table_name` (添加字段 `field_name`)
- 迁移脚本: `migrations/xxxx-migration-name.sql`

---

## 📦 安装和升级

### 新安装

```bash
# 一键部署
curl -sSL https://raw.githubusercontent.com/JunyuZhan/pis-standalone/main/scripts/one-click-deploy.sh | bash
```

### 从 vX.X.X 升级

```bash
# 使用升级脚本
bash scripts/deploy/quick-upgrade.sh
```

或手动升级：

```bash
# 1. 备份数据
docker-compose exec postgres pg_dump -U pis pis > backup.sql

# 2. 拉取最新代码
git pull origin main

# 3. 运行数据库迁移（如有）
# ...

# 4. 重启服务
docker-compose up -d --build
```

---

## 🧪 测试

此版本已通过以下测试：

- ✅ 单元测试 (100% 通过)
- ✅ 组件测试 (100% 通过)
- ✅ E2E 测试 (100% 通过)
- ✅ 安全扫描 (无高危漏洞)
- ✅ 性能测试 (符合预期)
- ✅ 浏览器兼容性测试 (Chrome, Firefox, Safari, Edge)

---

## 📊 统计数据

- **代码变更**: X 个文件修改，+XXX 行新增，-XXX 行删除
- **提交数量**: XX 个提交
- **贡献者**: X 位贡献者
- **问题修复**: XX 个问题已关闭

---

## 🙏 致谢

感谢所有贡献者和用户的支持！

特别感谢：
- @contributor1 - 贡献了 XXX
- @contributor2 - 贡献了 XXX

---

## 📖 相关链接

- [完整变更日志](CHANGELOG.md)
- [部署文档](docs/i18n/en/DEPLOYMENT.md)
- [升级指南](docs/UPGRADE.md)
- [问题反馈](https://github.com/JunyuZhan/pis-standalone/issues)

---

## 🔗 下载

- **Docker Image**: `docker pull pis/pis-standalone:vX.X.X`
- **Source Code**: [下载 ZIP](https://github.com/JunyuZhan/pis-standalone/archive/vX.X.X.zip)
- **Release Page**: [GitHub Release](https://github.com/JunyuZhan/pis-standalone/releases/tag/vX.X.X)

---

## 📝 示例：v1.0.0 Release Notes

```markdown
# 🎉 Release v1.0.0

**发布日期**: 2026-02-01

### 📋 概述

PIS (Private Instant Photo Sharing) 的第一个稳定版本发布！这是一个专为摄影师设计的自托管照片交付系统。

---

## ✨ 新功能 (Features)

### 🖼️ 图片样式预设
- **描述**: 13 种专业色彩分级预设（人像、风景、通用）
- **使用场景**: 为整个相册应用统一的视觉风格
- **文档**: [样式预设文档](docs/STYLE_PRESETS_PARAMETERS.md)

### 📦 批量下载控制
- **描述**: 管理员控制的批量下载，使用预签名 URL
- **使用场景**: 安全地分享大量照片
- **文档**: [用户指南](docs/USER_GUIDE.md)

### ⚡ 实时同步
- **描述**: 通过 PostgreSQL 通知实现实时照片状态更新
- **使用场景**: 实时查看照片处理进度
- **文档**: [架构文档](docs/ARCHITECTURE.md)

---

## 🐛 Bug 修复 (Bug Fixes)

### 🔧 修复图片处理超时问题
- **问题**: 大文件处理时偶尔超时
- **影响**: 影响大文件上传的用户
- **解决方案**: 优化了 Worker 队列处理逻辑

---

## 🔄 改进 (Improvements)

### ⚡ 性能优化
- **改进**: 并行处理图片，性能提升 13-33%
- **影响**: 图片处理速度显著提升

### 🎯 用户体验改进
- **改进**: 移动端界面优化
- **影响**: 更好的移动端浏览体验

---

## 🔒 安全更新 (Security)

### 🛡️ EXIF 隐私保护
- **问题**: EXIF 数据可能包含 GPS 位置信息
- **严重程度**: 中
- **影响**: 所有上传照片的用户
- **解决方案**: 自动移除所有 GPS 相关信息

---

## 📦 安装

```bash
# 一键部署
curl -sSL https://raw.githubusercontent.com/JunyuZhan/pis-standalone/main/scripts/one-click-deploy.sh | bash
```

---

## 📊 统计数据

- **代码变更**: 265 个文件，+15,000 行新增
- **提交数量**: 150+ 个提交
- **贡献者**: 1 位主要贡献者
- **问题修复**: 50+ 个问题已关闭

---

## 🙏 致谢

感谢所有测试用户和贡献者的支持！

---

## 📖 相关链接

- [完整变更日志](CHANGELOG.md)
- [部署文档](docs/i18n/en/DEPLOYMENT.md)
- [问题反馈](https://github.com/JunyuZhan/pis-standalone/issues)
```

---

**使用说明**:

1. 复制此模板
2. 根据实际版本填写内容
3. 删除不需要的部分
4. 添加具体的变更描述
5. 在 GitHub Release 页面使用此内容
