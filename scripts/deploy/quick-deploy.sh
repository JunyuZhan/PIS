#!/bin/bash
# ============================================
# PIS 快速部署脚本（不管理服务器容器）
# ============================================
# 
# 特性：
#   - 快速部署，生成随机密钥
#   - 不启动服务器上的 Docker 容器
#   - 生成配置文件和部署信息
#   - 支持自定义配置
#
# 使用方法：
#   cd /opt/pis-standalone
#   bash scripts/deploy/quick-deploy.sh
#   bash scripts/deploy/quick-deploy.sh --minio-user albert --minio-pass Zjy-1314
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 全局变量
MINIO_USER=""
MINIO_PASS=""

# 打印函数
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# 打印标题
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  PIS 快速部署脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# 解析参数
MINIO_USER=""
MINIO_PASS=""

for arg in "$@"; do
    case $arg in
        --minio-user)
            MINIO_USER="$2"
            shift 2
            ;;
        --minio-pass)
            MINIO_PASS="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# 生成随机密钥
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex ${1:-32}
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w ${1:-64} | head -n 1
    fi
}

# 检查项目目录
check_project_dir() {
    info "检查项目目录..."
    
    if [ ! -f ".env.example" ]; then
        error "未找到 .env.example 文件"
        error "请确保在项目根目录中运行此脚本"
        exit 1
    fi
    
    success "项目目录检查通过"
}

# 检查并创建 .env 文件
create_env_file() {
    info "检查配置文件..."
    
    if [ -f ".env" ]; then
        warn "检测到现有 .env 文件"
        read -p "是否覆盖现有配置？(y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            success "保留现有配置"
            return 0
        fi
    fi
    
    info "生成配置文件..."
    
    # 生成密钥
    POSTGRES_DB=pis
    POSTGRES_USER=pis
    POSTGRES_PASSWORD=$(generate_secret 32)
    
    MINIO_ROOT_USER=${MINIO_USER:-$(generate_secret 16)}
    MINIO_ROOT_PASSWORD=${MINIO_PASS:-$(generate_secret 32)}
    MINIO_ACCESS_KEY=$MINIO_ROOT_USER
    MINIO_SECRET_KEY=$MINIO_ROOT_PASSWORD
    
    WORKER_API_KEY=$(generate_secret 32)
    AUTH_JWT_SECRET=$(generate_secret 32)
    ALBUM_SESSION_SECRET=$(generate_secret 32)
    
    # 创建 .env 文件
    cat > .env << EOF
# ===========================================
# PIS Standalone 配置
# 自动生成于: $(date)
# ===========================================

# ==================== 数据库配置 ====================
DATABASE_TYPE=postgresql
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=pis
DATABASE_USER=pis
DATABASE_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=pis
POSTGRES_USER=pis
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# ==================== 存储配置 ====================
STORAGE_TYPE=minio

# ==================== MinIO 存储配置 ====================
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_ENDPOINT_HOST=minio
MINIO_ENDPOINT_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET=pis-photos
STORAGE_ENDPOINT=minio
STORAGE_PORT=9000
STORAGE_USE_SSL=false
STORAGE_ACCESS_KEY=$MINIO_ACCESS_KEY
STORAGE_SECRET_KEY=$MINIO_SECRET_KEY
STORAGE_BUCKET=pis-photos

# ==================== Redis ====================
REDIS_HOST=redis
REDIS_PORT=6379

# ==================== Worker 服务 ====================
HTTP_PORT=3001
WORKER_API_KEY=$WORKER_API_KEY
WORKER_BIND_HOST=0.0.0.0

# ==================== Web 应用配置 ====================
DOMAIN=localhost
NEXT_PUBLIC_APP_URL=http://localhost:8081
NEXT_PUBLIC_MEDIA_URL=http://localhost:8081/media
NEXT_PUBLIC_WORKER_URL=http://localhost:3001
MINIO_PUBLIC_URL=http://localhost:19000
STORAGE_PUBLIC_URL=http://localhost:8081/media

# ==================== 会话密钥 ====================
ALBUM_SESSION_SECRET=$ALBUM_SESSION_SECRET

# ==================== 认证模式 ====================
AUTH_MODE=custom
AUTH_JWT_SECRET=$AUTH_JWT_SECRET
EOF

    success "配置文件已生成: .env"
}

# 保存部署信息
save_deployment_info() {
    info "保存部署信息..."
    
    cat > .deployment-info << EOF
# ===========================================
# PIS 部署信息
# ===========================================
# 部署时间: $(date)
# 

# ==================== 服务访问地址 ====================
# 注意：这些服务需要在服务器上启动 Docker 容器后才能访问
# 

# Web 前端
# http://localhost:8081
# http://192.168.50.10:8081  # 如果在服务器上

# 管理后台
# http://localhost:8081/admin
# http://192.168.50.10:8081/admin  # 如果在服务器上

# MinIO Console
# http://localhost:19001
# http://192.168.50.10:19001  # 如果在服务器上

# ==================== MinIO 登录信息 ====================
# 用户名: $MINIO_ROOT_USER
# 密码: $MINIO_ROOT_PASSWORD
# Bucket: pis-photos

# ==================== 数据库连接信息 ====================
# 数据库类型: PostgreSQL
# 数据库主机: postgres
# 数据库端口: 5432
# 数据库名称: pis
# 数据库用户: pis
# 数据库密码: $POSTGRES_PASSWORD

# 容器内连接:
# docker exec -it pis-postgres psql -U pis -d pis

# 宿主机连接:
# psql -h 127.0.0.1 -p 5432 -U pis -d pis

# ==================== 安全密钥 ====================
# ⚠️  警告：请妥善保管以下密钥
# 

# Worker API Key:
# $WORKER_API_KEY

# JWT Secret:
# $AUTH_JWT_SECRET

# 会话密钥:
# $ALBUM_SESSION_SECRET

# ==================== 启动命令 ====================
# 

# 启动所有服务（在服务器上运行）:
# cd /opt/pis-standalone/docker
# docker compose up -d

# 停止所有服务（在服务器上运行）:
# cd /opt/pis-standalone/docker
# docker compose down

# 查看服务状态（在服务器上运行）:
# cd /opt/pis-standalone/docker
# docker compose ps

# 查看服务日志（在服务器上运行）:
# cd /opt/pis-standalone/docker
# docker compose logs -f

# ==================== 下一步操作 ====================
# 

# 1. 提交代码到 GitHub
#    git add .
#    git commit -m "Initial deployment"
#    git push origin main

# 2. 在服务器上拉取代码
#    cd /opt/pis-standalone
#    git pull origin main

# 3. 启动服务（在服务器上运行）
#    cd /opt/pis-standalone/docker
#    docker compose up -d

# 4. 访问 MinIO Console 上传文件
#    http://192.168.50.10:19001
#    用户名: $MINIO_ROOT_USER
#    密码: $MINIO_ROOT_PASSWORD

# 5. 访问 Web 前端
#    http://192.168.50.10:8081

# ==================== 注意事项 ====================
# 

# 1. 本脚本只生成配置文件，不启动服务器上的容器
# 2. 服务器上的容器需要单独启动（见上面的启动命令）
# 3. 首次启动容器时会自动初始化数据库
# 4. MinIO bucket 会自动创建
# 5. 配置文件已保存到项目根目录的 .env 文件
# 6. 部署信息已保存到项目根目录的 .deployment-info 文件
# 7. 请妥善保管 .deployment-info 文件中的安全密钥
EOF

    success "部署信息已保存: .deployment-info"
}

# 显示完成信息
show_completion() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署准备完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}下一步操作：${NC}"
    echo ""
    echo -e "  1. ${CYAN}提交代码到 GitHub${NC}"
    echo -e "     git add ."
    echo -e "     git commit -m \"Initial deployment\""
    echo -e "     git push origin main"
    echo ""
    echo -e "  2. ${CYAN}在服务器上拉取代码${NC}"
    echo -e "     cd /opt/pis-standalone"
    echo -e "     git pull origin main"
    echo ""
    echo -e "  3. ${CYAN}启动服务（在服务器上运行）${NC}"
    echo -e "     cd /opt/pis-standalone/docker"
    echo -e "     docker compose up -d"
    echo ""
    echo -e "  4. ${CYAN}查看部署信息${NC}"
    echo -e "     cat .deployment-info"
    echo ""
    echo -e "${YELLOW}⚠️  注意：${NC}"
    echo -e "   本脚本只生成配置文件，不启动服务器上的容器"
    echo -e "   服务器上的容器需要单独启动"
    echo ""
}

# 主函数
main() {
    print_header
    
    check_project_dir
    create_env_file
    save_deployment_info
    show_completion
}

# 执行主函数
main
