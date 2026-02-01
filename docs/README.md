# PIS 文档索引

> Private Instant Photo Sharing - 私有化照片分享系统

---

## 📚 核心文档

| 文档 | 描述 |
|------|------|
| [部署指南 (中文)](./i18n/zh-CN/DEPLOYMENT.md) | 详细部署步骤和配置说明 |
| [部署指南 (English)](./i18n/en/DEPLOYMENT.md) | Deployment guide in English |
| [部署检查清单](./DEPLOYMENT_CHECKLIST.md) | 部署前检查清单和快速参考 |
| [架构示例](./ARCHITECTURE.example.md) | 系统架构概览（不含敏感信息） |
| [开发指南](./DEVELOPMENT.md) | 开发环境设置和代码规范 |
| [快速开始](./QUICK_START.md) | 3 步上手指南 |

---

## 🔐 安全文档

| 文档 | 描述 |
|------|------|
| [安全指南](./SECURITY.md) | 安全最佳实践和配置建议 |
| [开源检查清单](./OPEN_SOURCE_CHECKLIST.md) | 开源发布前检查清单 |

---

## 🚀 发布文档

| 文档 | 描述 |
|------|------|
| [快速发布指南](./QUICK_RELEASE_GUIDE.md) | 5 分钟完成版本发布 |
| [发布前检查清单](./RELEASE_CHECKLIST.md) | 详细的发布前检查清单 |
| [发布说明模板](./RELEASE_NOTES_TEMPLATE.md) | GitHub Release Notes 模板 |

---

## 🎨 功能文档

| 文档 | 描述 |
|------|------|
| [用户指南](./USER_GUIDE.md) | 完整的功能使用说明 |
| [图片风格预设设计](./IMAGE_STYLE_PRESET_DESIGN.md) | 相册风格预设功能设计 |
| [风格预设参数列表](./STYLE_PRESETS_PARAMETERS.md) | 所有风格预设的详细参数参考 |
| [上传队列逻辑](./UPLOAD_QUEUE_LOGIC.md) | 照片上传和处理队列说明 |
| [移动端优化](./MOBILE_OPTIMIZATION.md) | 移动端用户体验优化 |

---

## 🧪 测试文档

| 文档 | 描述 |
|------|------|
| [测试指南](./TESTING.md) | 完整的测试使用指南 |
| [测试覆盖分析](./TEST_COVERAGE_ANALYSIS.md) | 详细的测试覆盖分析报告 |


---

## 🔧 配置和故障排查

| 文档 | 描述 |
|------|------|
| [字体配置指南](./FONTS.md) | 字体文件下载和配置 |
| [环境变量配置](./ENVIRONMENT_VARIABLES.md) | 环境变量详细说明（敏感信息版本） |
| [数据库重置](./RESET_DATABASE.md) | 数据库重置和清理 |
| [日志配置](./LOGGING.md) | 日志系统配置 |
| [日志位置](./LOG_LOCATIONS.md) | 日志文件位置说明 |
| [SSL 问题修复](./SSL_FIX.md) | macOS 开发环境 SSL 证书问题 |

---

## 🐳 Docker 部署相关

| 文档 | 描述 |
|------|------|
| [Docker 容器和存储卷](./DOCKER_CONTAINERS_AND_VOLUMES.md) | 容器命名和组织说明 |
| [Docker 网络和端口](./DOCKER_NETWORK_AND_PORTS.md) | 网络配置和端口说明 |
| [统一入口架构](./UNIFIED_ENTRY_ARCHITECTURE.md) | 统一入口架构设计说明 |
| [端口冲突解决方案](./PORT_CONFLICT_SOLUTIONS.md) | 端口冲突处理方案 |
| [Frpc/DDNSTO 配置指南](./FRPC_DDNSTO_SETUP.md) | 内网穿透配置指南 |

---

## 🏗️ 架构文档

| 文档 | 描述 |
|------|------|
| [架构示例](./ARCHITECTURE.example.md) | 系统架构概览（公开版本） |
| [架构路径](./ARCHITECTURE_PATHS.md) | 系统路径和路由说明 |

---

## 📁 文档结构

```
docs/
├── README.md                      # 文档索引（本文件）
├── DEPLOYMENT_CHECKLIST.md        # 部署检查清单
├── DEVELOPMENT.md                 # 开发指南
├── SECURITY.md                    # 安全指南
├── TESTING.md                     # 测试指南
├── QUICK_RELEASE_GUIDE.md         # 快速发布指南
├── RELEASE_CHECKLIST.md           # 发布前检查清单
├── RELEASE_NOTES_TEMPLATE.md      # 发布说明模板
├── ARCHITECTURE.example.md        # 架构示例（公开版本）
├── FONTS.md                       # 字体配置指南
├── QUICK_START.md                 # 快速开始
├── USER_GUIDE.md                  # 用户指南
└── i18n/
    ├── README.md
    ├── en/
    │   └── DEPLOYMENT.md          # 英文部署指南
    └── zh-CN/
        └── DEPLOYMENT.md          # 中文部署指南
```

---

## 🔒 敏感文档（不提交到 Git）

以下文档包含敏感信息，仅保存在本地：

- `ARCHITECTURE.md` - 完整架构文档（含真实配置）
- `ENVIRONMENT_VARIABLES.md` - 环境变量详细说明（含真实密钥）

> ⚠️ 这些文件已在 `.gitignore` 中排除

---

## 📝 文档维护说明

文档已进行清理和整合：

- ✅ **测试文档**：已合并 `TESTING.md`, `TESTING_GUIDE.md`, `TESTING_QUICK_START.md` → `TESTING.md`
- ✅ **开发文档**：已合并 `DEV_ENVIRONMENT.md` → `DEVELOPMENT.md`
- ✅ **部署文档**：已整合，删除重复文档
- ✅ **脚本文档**：统一在 `scripts/` 目录下
- ✅ **文档清理**：已删除所有开发过程中的临时报告和状态文档（2026-02-01）
- ✅ **文档格式**：已统一文档格式和结构

---

## 📝 贡献

如果你发现文档有错误或需要改进，欢迎提交 Issue 或 Pull Request。

---

## 🔗 相关链接

- [GitHub 仓库](https://github.com/JunyuZhan/pis-standalone)
- [问题反馈](https://github.com/JunyuZhan/pis-standalone/issues)
- [功能请求](https://github.com/JunyuZhan/pis-standalone/issues/new)
