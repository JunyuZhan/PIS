#!/bin/bash
# ============================================
# PIS 快速升级脚本
# ============================================
# 
# 特性：
#   - 快速升级，更新代码和配置
#   - 自动重启 Docker 容器以应用更改
#   - 保留现有配置和数据
#   - 支持强制更新
#
# 使用方法：
#   cd /opt/pis-standalone
#   bash scripts/deploy/quick-upgrade.sh
#   bash scripts/deploy/quick-upgrade.sh --force
#   bash scripts/deploy/quick-upgrade.sh --no-restart  # 不重启容器
#   bash scripts/deploy/quick-upgrade.sh --rebuild    # 重新构建镜像（无缓存）
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
FORCE_UPDATE=false
REGENERATE_SECRETS=false
RESTART_CONTAINERS=true
REBUILD_IMAGES=false
COMPOSE_CMD=""

# 检测项目根目录
detect_project_root() {
    # 从脚本所在目录开始，向上查找项目根目录
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local current_dir="$script_dir"
    
    # 向上查找，直到找到包含 .env.example 的目录
    while [ "$current_dir" != "/" ]; do
        if [ -f "$current_dir/.env.example" ]; then
            PROJECT_ROOT="$current_dir"
            cd "$PROJECT_ROOT"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done
    
    # 如果没找到，尝试从当前工作目录查找
    if [ -f ".env.example" ]; then
        PROJECT_ROOT="$(pwd)"
        return 0
    fi
    
    return 1
}

# 打印函数
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# 打印标题
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  PIS 快速升级脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# 生成随机密钥
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex ${1:-32}
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w ${1:-64} | head -n 1
    fi
}

# 检查密钥是否是默认值或空
is_default_or_empty() {
    local value="$1"
    local default_values="$2"
    
    # 检查是否为空
    if [ -z "$value" ]; then
        return 0  # 是默认值或空
    fi
    
    # 检查是否匹配默认值列表
    for default in $default_values; do
        if [ "$value" = "$default" ]; then
            return 0  # 是默认值
        fi
    done
    
    return 1  # 不是默认值
}

# 更新 .env 文件中的密钥
update_env_secret() {
    local key="$1"
    local new_value="$2"
    local env_file="${PROJECT_ROOT}/.env"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    # 使用 sed 更新密钥（兼容 macOS 和 Linux）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if grep -q "^${key}=" "$env_file"; then
            sed -i '' "s|^${key}=.*|${key}=${new_value}|" "$env_file"
        else
            echo "${key}=${new_value}" >> "$env_file"
        fi
    else
        # Linux
        if grep -q "^${key}=" "$env_file"; then
            sed -i "s|^${key}=.*|${key}=${new_value}|" "$env_file"
        else
            echo "${key}=${new_value}" >> "$env_file"
        fi
    fi
}

# 显示重新构建镜像的提示信息
show_rebuild_info() {
    echo ""
    echo -e "${YELLOW}📦 关于重新构建镜像：${NC}"
    echo ""
    echo -e "${CYAN}以下情况建议使用 --rebuild 选项重新构建镜像：${NC}"
    echo ""
    echo -e "  • ${BOLD}依赖项更新${NC}：package.json、pnpm-lock.yaml 等依赖文件有变更"
    echo -e "  • ${BOLD}Dockerfile 修改${NC}：docker/web.Dockerfile 或 docker/worker.Dockerfile 有变更"
    echo -e "  • ${BOLD}环境变量变更${NC}：构建时使用的环境变量（如 NEXT_PUBLIC_*）有变更"
    echo -e "  • ${BOLD}源代码结构变更${NC}：项目目录结构或构建配置有重大变更"
    echo -e "  • ${BOLD}镜像损坏或异常${NC}：容器启动失败或运行时出现异常"
    echo ""
    echo -e "${CYAN}以下情况通常不需要重新构建镜像：${NC}"
    echo ""
    echo -e "  • ${BOLD}仅配置文件更新${NC}：.env 文件或应用配置变更"
    echo -e "  • ${BOLD}仅数据库变更${NC}：数据库结构或数据变更"
    echo -e "  • ${BOLD}仅代码更新${NC}：仅更新了源代码，但依赖和构建配置未变"
    echo ""
    echo -e "${YELLOW}提示：${NC}如果不确定，可以先不使用 --rebuild，如果升级后出现问题再重新构建"
    echo ""
}

# 解析参数
for arg in "$@"; do
    case $arg in
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --no-restart)
            RESTART_CONTAINERS=false
            shift
            ;;
        --rebuild)
            REBUILD_IMAGES=true
            shift
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --force          强制更新，自动暂存未提交的更改"
            echo "  --no-restart     不重启 Docker 容器"
            echo "  --rebuild        重新构建镜像（无缓存），适用于依赖或 Dockerfile 变更"
            echo "  --help, -h       显示此帮助信息"
            echo ""
            show_rebuild_info
            exit 0
            ;;
        *)
            warn "未知参数: $arg"
            warn "使用 --help 查看帮助信息"
            shift
            ;;
    esac
done

# 如果没有使用 --rebuild，显示提示信息
if [ "$REBUILD_IMAGES" != true ] && [ "$FORCE_UPDATE" != true ]; then
    show_rebuild_info
    echo -e "${CYAN}是否要重新构建镜像？${NC}"
    echo -e "  如果依赖、Dockerfile 或构建配置有变更，建议重新构建"
    echo ""
    read -p "重新构建镜像？(y/N): " rebuild_confirm
    if [ "$rebuild_confirm" = "y" ] || [ "$rebuild_confirm" = "Y" ]; then
        REBUILD_IMAGES=true
        echo ""
    fi
fi

# 检查项目目录
check_project_dir() {
    info "检查项目目录..."
    
    # 自动检测项目根目录
    if ! detect_project_root; then
        error "未找到 .env.example 文件"
        error "请确保在项目根目录中运行此脚本，或确保项目根目录存在 .env.example 文件"
        exit 1
    fi
    
    info "项目根目录: $PROJECT_ROOT"
    
    if [ ! -f "$PROJECT_ROOT/.env.example" ]; then
        error "未找到 .env.example 文件: $PROJECT_ROOT/.env.example"
        exit 1
    fi
    
    success "项目目录检查通过"
}

# 检查 Git 状态
check_git_status() {
    info "检查 Git 状态..."
    
    if [ -d ".git" ]; then
        # 检查是否有未提交的更改
        if ! git diff-index --quiet HEAD --; then
            warn "检测到未提交的更改"
            git status --short
            echo ""
            
            if [ "$FORCE_UPDATE" = true ]; then
                warn "使用 --force 选项，将继续升级"
            else
                read -p "是否要暂存这些更改并继续？(y/N): " confirm
                if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
                    info "升级已取消"
                    exit 0
                fi
                
                info "暂存更改..."
                git stash push -m "Auto-stash before upgrade"
            fi
        else
            success "无未提交的更改"
        fi
    else
        warn "未找到 .git 目录，跳过 Git 检查"
    fi
}

# 拉取最新代码
pull_latest_code() {
    info "拉取最新代码..."
    
    if [ -d ".git" ]; then
        # 检查远程分支
        CURRENT_BRANCH=$(git branch --show-current)
        
        info "当前分支: $CURRENT_BRANCH"
        
        # 拉取最新代码
        if git fetch origin && git pull origin $CURRENT_BRANCH; then
            success "代码更新完成"
        else
            warn "git pull 失败或没有更新"
        fi
    else
        warn "未找到 .git 目录，跳过代码更新"
    fi
}

# 更新配置文件
update_config_files() {
    info "检查配置文件..."
    
    local env_file="${PROJECT_ROOT}/.env"
    
    # 检查 .env 文件
    if [ ! -f "$env_file" ]; then
        warn "未找到 .env 文件: $env_file"
        warn "首次部署？请运行: bash scripts/deploy/quick-deploy.sh"
        return 0
    fi
    
    info "检查密钥配置..."
    
    # 定义需要检查的密钥及其默认值
    local secrets_regenerated=0
    
    # 1. 检查数据库密码
    DB_PASS=$(grep '^DATABASE_PASSWORD=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    POSTGRES_PASS=$(grep '^POSTGRES_PASSWORD=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    
    if is_default_or_empty "$DB_PASS" "changeme your-secure-password" || \
       is_default_or_empty "$POSTGRES_PASS" "changeme your-secure-password"; then
        warn "检测到默认或空的数据库密码，正在重新生成..."
        local new_db_pass=$(generate_secret 32)
        update_env_secret "DATABASE_PASSWORD" "$new_db_pass"
        update_env_secret "POSTGRES_PASSWORD" "$new_db_pass"
        success "数据库密码已重新生成"
        secrets_regenerated=$((secrets_regenerated + 1))
    fi
    
    # 2. 检查 MinIO 密钥
    MINIO_USER=$(grep '^MINIO_ROOT_USER=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    MINIO_ACCESS=$(grep '^MINIO_ACCESS_KEY=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    STORAGE_ACCESS=$(grep '^STORAGE_ACCESS_KEY=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    MINIO_PASS=$(grep '^MINIO_ROOT_PASSWORD=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    MINIO_SECRET=$(grep '^MINIO_SECRET_KEY=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    STORAGE_SECRET=$(grep '^STORAGE_SECRET_KEY=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    
    if is_default_or_empty "$MINIO_USER" "minioadmin" || \
       is_default_or_empty "$MINIO_ACCESS" "minioadmin" || \
       is_default_or_empty "$STORAGE_ACCESS" "minioadmin"; then
        warn "检测到默认或空的 MinIO 访问密钥，正在重新生成..."
        local new_minio_user=$(generate_secret 16)
        update_env_secret "MINIO_ROOT_USER" "$new_minio_user"
        update_env_secret "MINIO_ACCESS_KEY" "$new_minio_user"
        update_env_secret "STORAGE_ACCESS_KEY" "$new_minio_user"
        success "MinIO 访问密钥已重新生成: $new_minio_user"
        secrets_regenerated=$((secrets_regenerated + 1))
    fi
    
    if is_default_or_empty "$MINIO_PASS" "minioadmin" || \
       is_default_or_empty "$MINIO_SECRET" "minioadmin" || \
       is_default_or_empty "$STORAGE_SECRET" "minioadmin"; then
        warn "检测到默认或空的 MinIO 密钥，正在重新生成..."
        local new_minio_pass=$(generate_secret 32)
        update_env_secret "MINIO_ROOT_PASSWORD" "$new_minio_pass"
        update_env_secret "MINIO_SECRET_KEY" "$new_minio_pass"
        update_env_secret "STORAGE_SECRET_KEY" "$new_minio_pass"
        success "MinIO 密钥已重新生成"
        secrets_regenerated=$((secrets_regenerated + 1))
    fi
    
    # 3. 检查 Worker API Key
    WORKER_API_KEY=$(grep '^WORKER_API_KEY=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    if is_default_or_empty "$WORKER_API_KEY" "AUTO_GENERATE_32 changeme"; then
        warn "检测到默认或空的 Worker API Key，正在重新生成..."
        local new_worker_key=$(generate_secret 32)
        update_env_secret "WORKER_API_KEY" "$new_worker_key"
        success "Worker API Key 已重新生成"
        secrets_regenerated=$((secrets_regenerated + 1))
    fi
    
    # 4. 检查 JWT Secret
    JWT_SECRET=$(grep '^AUTH_JWT_SECRET=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    if is_default_or_empty "$JWT_SECRET" "AUTO_GENERATE_32 changeme"; then
        warn "检测到默认或空的 JWT Secret，正在重新生成..."
        local new_jwt_secret=$(generate_secret 32)
        update_env_secret "AUTH_JWT_SECRET" "$new_jwt_secret"
        success "JWT Secret 已重新生成"
        secrets_regenerated=$((secrets_regenerated + 1))
    fi
    
    # 5. 检查会话密钥
    SESSION_SECRET=$(grep '^ALBUM_SESSION_SECRET=' "$env_file" 2>/dev/null | cut -d'=' -f2- | xargs)
    if [ -z "$SESSION_SECRET" ]; then
        warn "检测到空的会话密钥，正在重新生成..."
        local new_session_secret=$(generate_secret 32)
        update_env_secret "ALBUM_SESSION_SECRET" "$new_session_secret"
        success "会话密钥已重新生成"
        secrets_regenerated=$((secrets_regenerated + 1))
    fi
    
    # 总结
    if [ $secrets_regenerated -gt 0 ]; then
        echo ""
        success "已重新生成 $secrets_regenerated 个密钥"
        warn "⚠️  重要提示："
        warn "   - 如果服务正在运行，需要重启容器以应用新密钥"
        warn "   - 请妥善保管新生成的密钥"
        echo ""
    else
        success "所有密钥配置检查通过，无需更新"
    fi
}

# 检查 Docker 环境
check_docker() {
    info "检查 Docker 环境..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        warn "Docker 未安装，跳过容器重启"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        warn "Docker 未运行或无权限，跳过容器重启"
        return 1
    fi
    
    # 检查 Docker Compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        success "Docker Compose 已安装（compose 插件）"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        success "Docker Compose 已安装（standalone）"
    else
        warn "Docker Compose 未安装，跳过容器重启"
        return 1
    fi
    
    return 0
}

# 重启容器
restart_containers() {
    if [ "$RESTART_CONTAINERS" != true ]; then
        return 0
    fi
    
    if ! check_docker; then
        return 0
    fi
    
    local docker_dir="${PROJECT_ROOT}/docker"
    
    if [ ! -d "$docker_dir" ]; then
        warn "未找到 docker 目录: $docker_dir"
        return 0
    fi
    
    cd "$docker_dir"
    
    # 检查 docker-compose 文件
    local compose_file="docker-compose.standalone.yml"
    if [ ! -f "$compose_file" ]; then
        warn "未找到 $compose_file，尝试使用 docker-compose.yml"
        compose_file="docker-compose.yml"
        if [ ! -f "$compose_file" ]; then
            warn "未找到 docker-compose 配置文件，跳过容器重启"
            return 0
        fi
    fi
    
    info "使用配置文件: $compose_file"
    
    # 重新构建并重启容器
    if [ "$REBUILD_IMAGES" = true ]; then
        info "重新构建镜像（无缓存）..."
        if $COMPOSE_CMD -f "$compose_file" build --no-cache; then
            success "镜像构建完成"
            info "启动容器..."
            if $COMPOSE_CMD -f "$compose_file" up -d; then
                success "容器启动成功"
            else
                error "容器启动失败"
                return 1
            fi
        else
            error "镜像构建失败（无缓存）"
            warn "请检查构建日志，修复问题后重试"
            return 1
        fi
    else
        info "重新构建并重启容器（使用缓存）..."
        if $COMPOSE_CMD -f "$compose_file" up -d --build; then
            success "容器重启成功"
        else
            warn "使用缓存构建失败，尝试无缓存重新构建..."
            if $COMPOSE_CMD -f "$compose_file" build --no-cache && \
               $COMPOSE_CMD -f "$compose_file" up -d; then
                success "容器重启成功（已重新构建镜像）"
            else
                error "容器启动失败"
                return 1
            fi
        fi
    fi
    
    # 等待服务启动
    info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    info "检查服务状态..."
    $COMPOSE_CMD -f "$compose_file" ps
    
    return 0
}

# 显示升级信息
show_upgrade_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  升级完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    if [ "$RESTART_CONTAINERS" = true ]; then
        if [ "$REBUILD_IMAGES" = true ]; then
            echo -e "${BLUE}服务已自动重启（镜像已重新构建）${NC}"
        else
            echo -e "${BLUE}服务已自动重启${NC}"
        fi
        echo ""
        echo -e "${BLUE}常用命令：${NC}"
        echo ""
        local compose_cmd="${COMPOSE_CMD:-docker compose}"
        echo -e "  查看服务状态:"
        echo -e "     cd ${PROJECT_ROOT}/docker && $compose_cmd ps"
        echo ""
        echo -e "  查看服务日志:"
        echo -e "     cd ${PROJECT_ROOT}/docker && $compose_cmd logs -f"
        echo ""
        echo -e "  重启服务:"
        echo -e "     cd ${PROJECT_ROOT}/docker && $compose_cmd restart"
        echo ""
        echo -e "  停止服务:"
        echo -e "     cd ${PROJECT_ROOT}/docker && $compose_cmd down"
        echo ""
        if [ "$REBUILD_IMAGES" != true ]; then
            echo -e "${YELLOW}💡 提示：${NC}"
            echo -e "   如果升级后出现问题，可以尝试重新构建镜像："
            echo -e "     cd ${PROJECT_ROOT}/docker"
            echo -e "     $compose_cmd build --no-cache"
            echo -e "     $compose_cmd up -d"
            echo ""
        fi
    else
        echo -e "${BLUE}下一步操作：${NC}"
        echo ""
        echo -e "  1. ${CYAN}重新构建并启动容器${NC}"
        echo -e "     cd ${PROJECT_ROOT}/docker"
        echo -e "     docker compose -f docker-compose.standalone.yml up -d --build"
        echo ""
        echo -e "  2. ${CYAN}查看服务状态${NC}"
        echo -e "     cd ${PROJECT_ROOT}/docker"
        echo -e "     docker compose ps"
        echo ""
    fi
    
    echo -e "${YELLOW}⚠ 注意事项：${NC}"
    echo -e "   - 配置文件会被保留（.env）"
    echo -e "   - 数据卷会被保留"
    echo ""
}

# 主函数
main() {
    print_header
    check_project_dir
    check_git_status
    pull_latest_code
    update_config_files
    restart_containers
    show_upgrade_info
}

# 执行主函数
main
