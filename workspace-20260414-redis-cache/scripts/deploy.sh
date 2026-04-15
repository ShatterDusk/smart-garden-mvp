#!/bin/bash
# =============================================================================
# Redis 缓存改造 - 部署脚本
# =============================================================================
# 用法: ./deploy.sh <environment>
# 示例: ./deploy.sh staging
#       ./deploy.sh production
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ -z "$1" ]; then
    log_error "请指定环境参数"
    echo "用法: $0 <environment>"
    echo "示例: $0 staging"
    exit 1
fi

ENVIRONMENT=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="/tmp/plantgpt-build-${TIMESTAMP}"

# 环境配置
case $ENVIRONMENT in
    staging)
        API_URL="https://staging-api.example.com"
        REDIS_HOST="${STAGING_REDIS_HOST:-localhost}"
        ;;
    production)
        API_URL="https://api.example.com"
        REDIS_HOST="${PROD_REDIS_HOST}"
        ;;
    *)
        log_error "未知环境: $ENVIRONMENT"
        exit 1
        ;;
esac

log_info "=========================================="
log_info "  Redis 缓存改造 - 部署脚本"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "构建目录: $BUILD_DIR"
log_info "时间戳: $TIMESTAMP"
log_info "=========================================="

# 创建构建目录
mkdir -p $BUILD_DIR

# Step 1: 准备文件
log_info "[1/6] 准备部署文件..."

if [ -d "backend/server/src/services" ]; then
    cp -r backend/server/src/services/CacheService.js $BUILD_DIR/
    cp -r backend/server/src/services/weatherService.js $BUILD_DIR/
    log_success "缓存服务文件已复制"
else
    log_error "源文件不存在: backend/server/src/services/"
    exit 1
fi

# Step 2: 加载环境变量
log_info "[2/6] 加载环境变量..."

if [ -f ".env" ]; then
    source .env
    log_success "环境变量已加载"
else
    log_warning "未找到 .env 文件，使用默认配置"
fi

# Step 3: 验证 Redis 连接
log_info "[3/6] 验证 Redis 连接..."

if [ -n "$REDIS_HOST" ]; then
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h $REDIS_HOST -p ${REDIS_PORT:-6379} ping &> /dev/null; then
            log_success "Redis 连接成功"
        else
            log_warning "Redis 连接失败，将使用内存缓存模式"
        fi
    else
        log_warning "redis-cli 未安装，跳过 Redis 连接验证"
    fi
else
    log_info "未配置 Redis_HOST，使用内存缓存模式"
fi

# Step 4: 备份当前服务
log_info "[4/6] 备份当前服务..."

BACKUP_DIR="/tmp/plantgpt-backup-${TIMESTAMP}"
mkdir -p $BACKUP_DIR

if [ -d "backend/server/src/services" ]; then
    cp -r backend/server/src/services/*.js $BACKUP_DIR/
    log_success "备份已保存到: $BACKUP_DIR"
else
    log_warning "未找到需要备份的文件"
fi

# Step 5: 部署新服务
log_info "[5/6] 部署服务..."

# 根据不同部署环境选择部署方式
if command -v kubectl &> /dev/null; then
    log_info "使用 Kubernetes 部署..."
    kubectl set image deployment/plantgpt-backend cache-service=plantgpt-backend:${GITHUB_SHA:-latest}
    kubectl rollout status deployment/plantgpt-backend
elif command -v docker &> /dev/null; then
    log_info "使用 Docker 部署..."
    docker-compose -f docker-compose.yml up -d --build
else
    log_info "直接复制文件部署..."
    cp $BUILD_DIR/*.js backend/server/src/services/
fi

log_success "服务部署完成"

# Step 6: 验证部署
log_info "[6/6] 验证部署..."

sleep 5

# 调用健康检查
HEALTH_URL="${API_URL}/health"
if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
    log_success "健康检查通过"
else
    log_warning "健康检查失败，请手动检查服务状态"
fi

# 验证缓存服务
CACHE_STATUS=$(curl -sf "${API_URL}/api/cache/status" 2>/dev/null || echo '{"error":"unknown"}')
log_info "缓存状态: $CACHE_STATUS"

# 完成
log_info "=========================================="
log_success "  部署完成!"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "构建时间: $TIMESTAMP"
log_info "备份位置: $BACKUP_DIR"
log_info "=========================================="

# 显示后续步骤
log_info ""
log_info "后续步骤:"
log_info "1. 访问 ${API_URL}/health 检查服务状态"
log_info "2. 查看日志: docker-compose logs -f"
log_info "3. 如需回滚: ./scripts/rollback.sh $ENVIRONMENT"
log_info ""

exit 0
