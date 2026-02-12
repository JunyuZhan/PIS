#!/bin/bash
# =====================================================
# PIS Docker Secrets 初始化脚本
# =====================================================
# 用途：自动生成所有必需的密钥文件
# 运行：./init-secrets.sh
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔐 初始化 PIS Docker Secrets..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 生成密钥函数
generate_secret() {
    local file=$1
    local description=$2
    local generator=$3
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}⏭️  跳过${NC} $file（已存在）"
        return
    fi
    
    eval "$generator" > "$file"
    chmod 600 "$file"
    echo -e "${GREEN}✅ 生成${NC} $file - $description"
}

# 提示用户输入或生成
prompt_or_generate() {
    local file=$1
    local description=$2
    local default_generator=$3
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}⏭️  跳过${NC} $file（已存在）"
        return
    fi
    
    echo ""
    echo -e "${YELLOW}📝 $description${NC}"
    echo "   按 Enter 自动生成，或输入自定义值："
    read -r input
    
    if [ -z "$input" ]; then
        eval "$default_generator" > "$file"
        echo -e "${GREEN}✅ 自动生成${NC} $file"
    else
        echo -n "$input" > "$file"
        echo -e "${GREEN}✅ 已保存${NC} $file"
    fi
    chmod 600 "$file"
}

echo "======================================"
echo "必需的密钥文件"
echo "======================================"

# 数据库密码
prompt_or_generate "db_password" \
    "PostgreSQL 数据库密码" \
    "openssl rand -base64 24 | tr -d '\n'"

# JWT 密钥
generate_secret "jwt_secret" \
    "JWT 签名密钥（64字符）" \
    "openssl rand -base64 64 | tr -d '\n'"

# MinIO 密钥
prompt_or_generate "minio_access_key" \
    "MinIO 访问密钥（用户名）" \
    "echo -n 'pis-minio-$(openssl rand -hex 4)'"

generate_secret "minio_secret_key" \
    "MinIO 密钥" \
    "openssl rand -base64 32 | tr -d '\n'"

# Worker API 密钥
generate_secret "worker_api_key" \
    "Worker API 认证密钥" \
    "openssl rand -base64 32 | tr -d '\n'"

# Album Session Secret
generate_secret "album_session_secret" \
    "相册会话密钥" \
    "openssl rand -base64 32 | tr -d '\n'"

echo ""
echo "======================================"
echo "可选的密钥文件"
echo "======================================"

# Redis 密码（可选）
if [ ! -f "redis_password" ]; then
    echo ""
    echo -e "${YELLOW}📝 Redis 密码（可选，留空表示不启用密码）${NC}"
    read -r redis_pwd
    if [ -n "$redis_pwd" ]; then
        echo -n "$redis_pwd" > redis_password
        chmod 600 redis_password
        echo -e "${GREEN}✅ 已保存${NC} redis_password"
    else
        echo -e "${YELLOW}⏭️  跳过${NC} redis_password"
    fi
else
    echo -e "${YELLOW}⏭️  跳过${NC} redis_password（已存在）"
fi

# Cloudflare Token（可选）
if [ ! -f "cloudflare_api_token" ]; then
    echo ""
    echo -e "${YELLOW}📝 Cloudflare API Token（可选，用于 CDN 缓存清除）${NC}"
    echo "   输入 Token 或留空跳过："
    read -r cf_token
    if [ -n "$cf_token" ]; then
        echo -n "$cf_token" > cloudflare_api_token
        chmod 600 cloudflare_api_token
        echo -e "${GREEN}✅ 已保存${NC} cloudflare_api_token"
    else
        echo -e "${YELLOW}⏭️  跳过${NC} cloudflare_api_token"
    fi
else
    echo -e "${YELLOW}⏭️  跳过${NC} cloudflare_api_token（已存在）"
fi

# Cloudflare Zone ID（可选）
if [ ! -f "cloudflare_zone_id" ]; then
    echo ""
    echo -e "${YELLOW}📝 Cloudflare Zone ID（可选）${NC}"
    echo "   输入 Zone ID 或留空跳过："
    read -r cf_zone
    if [ -n "$cf_zone" ]; then
        echo -n "$cf_zone" > cloudflare_zone_id
        chmod 600 cloudflare_zone_id
        echo -e "${GREEN}✅ 已保存${NC} cloudflare_zone_id"
    else
        echo -e "${YELLOW}⏭️  跳过${NC} cloudflare_zone_id"
    fi
else
    echo -e "${YELLOW}⏭️  跳过${NC} cloudflare_zone_id（已存在）"
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 初始化完成！${NC}"
echo "======================================"
echo ""
echo "已生成的密钥文件："
ls -la 2>/dev/null | grep -v "^d" | grep -v "README\|init-secrets\|.gitkeep" | tail -n +2 || echo "（无）"
echo ""
echo "重要提醒："
echo "  1. 这些文件不会被 Git 跟踪，请安全备份"
echo "  2. 下次部署时直接使用现有密钥文件"
echo ""
echo "FTP 上传说明："
echo "  - FTP 账号由应用层管理（每个相册独立）"
echo "  - 在 PIS 后台创建相册时会自动生成 FTP 账号"
echo "  - 账号格式：album_{相册ID}"
echo "  - 查看方式：相册设置 → FTP 上传"
echo ""
echo "下一步："
echo "  docker compose -f docker/docker-compose.secrets.yml up -d"
echo ""
