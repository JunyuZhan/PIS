# 🚀 快速发布指南

> 5 分钟完成版本发布

**最后更新**: 2026-02-01

---

## 📋 发布前准备（5 分钟）

### 1. 运行最终检查（2 分钟）

```bash
# 代码质量检查
pnpm lint
pnpm test
pnpm build

# 安全检查
pnpm security-check

# Git 状态检查
git status
```

### 2. 更新版本信息（1 分钟）

```bash
# 编辑 CHANGELOG.md，确保版本信息正确
# 检查 package.json 中的版本号
```

### 3. 提交所有更改（1 分钟）

```bash
# 添加所有更改
git add .

# 提交（使用语义化提交信息）
git commit -m "chore: prepare for release v1.0.0"

# 推送到远程
git push origin main
```

### 4. 创建 Git 标签（1 分钟）

```bash
# 创建带注释的标签
git tag -a v1.0.0 -m "Release v1.0.0: Initial stable release"

# 推送标签
git push origin v1.0.0
```

---

## 🎯 GitHub Release 创建（3 分钟）

### 方法 1: 使用 GitHub Web UI（推荐）

1. **访问 Releases 页面**
   - 打开：`https://github.com/JunyuZhan/pis-standalone/releases`
   - 点击 "Draft a new release"

2. **填写发布信息**
   - **Tag**: 选择 `v1.0.0`
   - **Release title**: `Release v1.0.0`
   - **Description**: 复制 `docs/RELEASE_NOTES_TEMPLATE.md` 中的内容并修改

3. **添加附件**（可选）
   - 源代码 ZIP
   - Docker 镜像（如适用）

4. **发布**
   - 点击 "Publish release"

### 方法 2: 使用 GitHub CLI

```bash
# 安装 GitHub CLI（如未安装）
# brew install gh  # macOS
# 或访问 https://cli.github.com/

# 登录 GitHub CLI
gh auth login

# 创建 Release（使用文件内容）
gh release create v1.0.0 \
  --title "Release v1.0.0" \
  --notes-file docs/RELEASE_NOTES_TEMPLATE.md

# 或直接输入说明
gh release create v1.0.0 \
  --title "Release v1.0.0" \
  --notes "Initial stable release of PIS"
```

---

## ✅ 发布后验证（2 分钟）

### 1. 检查 Release 页面

- [ ] Release 页面可以访问
- [ ] 发布说明正确显示
- [ ] 下载链接可用

### 2. 测试下载和安装

```bash
# 测试一键部署脚本（使用新版本标签）
curl -sSL https://raw.githubusercontent.com/JunyuZhan/pis-standalone/v1.0.0/scripts/one-click-deploy.sh | bash
```

### 3. 更新文档链接（如需要）

- [ ] README.md 中的版本号链接
- [ ] 部署文档中的版本引用

---

## 📝 发布说明模板

### 最小版本（快速发布）

```markdown
# Release v1.0.0

Initial stable release of PIS (Private Instant Photo Sharing).

## Features
- Self-hosted photo delivery system
- Advanced image processing
- Watermarking support
- Professional presentation

## Installation
\`\`\`bash
curl -sSL https://raw.githubusercontent.com/JunyuZhan/pis-standalone/main/scripts/one-click-deploy.sh | bash
\`\`\`

See [CHANGELOG.md](CHANGELOG.md) for full details.
```

### 完整版本（重要发布）

使用 `docs/RELEASE_NOTES_TEMPLATE.md` 中的完整模板。

---

## 🎯 发布检查清单（快速版）

- [ ] 代码已测试通过
- [ ] 安全检查通过
- [ ] CHANGELOG.md 已更新
- [ ] 版本号已更新
- [ ] Git 标签已创建
- [ ] GitHub Release 已创建
- [ ] 发布说明已添加
- [ ] 下载链接已验证

---

## 🆘 常见问题

### Q: 如果发布后发现错误怎么办？

**A**: 快速修复流程：

```bash
# 1. 修复错误
git checkout -b hotfix/fix-issue

# 2. 提交修复
git commit -m "fix: description of fix"
git push origin hotfix/fix-issue

# 3. 创建新的补丁版本
git tag -a v1.0.1 -m "Release v1.0.1: Hotfix"
git push origin v1.0.1

# 4. 创建新的 Release
gh release create v1.0.1 --title "Release v1.0.1" --notes "Hotfix release"
```

### Q: 如何回滚发布？

**A**: GitHub Release 无法删除，但可以：

1. **标记为 Pre-release**：编辑 Release，勾选 "Set as a pre-release"
2. **创建新版本**：发布修复版本
3. **更新文档**：在 README 中说明问题

### Q: 发布后需要做什么？

**A**: 发布后任务：

- [ ] 监控错误日志
- [ ] 收集用户反馈
- [ ] 更新文档（如需要）
- [ ] 准备下一个版本

---

## 📚 相关文档

- [完整发布检查清单](RELEASE_CHECKLIST.md) - 详细的发布前检查
- [发布说明模板](RELEASE_NOTES_TEMPLATE.md) - Release Notes 模板
- [变更日志](CHANGELOG.md) - 版本历史记录

---

## ⚡ 一键发布脚本（高级）

创建 `scripts/release.sh` 自动化发布流程：

```bash
#!/bin/bash
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 1.0.0"
  exit 1
fi

echo "🚀 Releasing v$VERSION..."

# 1. 运行检查
echo "📋 Running checks..."
pnpm lint
pnpm test
pnpm security-check

# 2. 更新版本号
echo "📝 Updating version..."
# 这里可以添加自动更新版本号的脚本

# 3. 提交更改
echo "💾 Committing changes..."
git add .
git commit -m "chore: prepare for release v$VERSION" || true

# 4. 创建标签
echo "🏷️  Creating tag..."
git tag -a "v$VERSION" -m "Release v$VERSION"

# 5. 推送
echo "📤 Pushing to remote..."
git push origin main
git push origin "v$VERSION"

# 6. 创建 Release（需要 GitHub CLI）
echo "🎉 Creating GitHub Release..."
gh release create "v$VERSION" \
  --title "Release v$VERSION" \
  --notes-file docs/RELEASE_NOTES_TEMPLATE.md || \
  echo "⚠️  Please create Release manually on GitHub"

echo "✅ Release v$VERSION completed!"
```

---

**祝发布顺利！** 🎉
