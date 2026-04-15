#!/bin/bash
# =============================================================================
# Redis 缓存改造 - 健康检查脚本
# =============================================================================
# 用法: ./health-check.sh <environment>
# 示例: ./health-check.sh staging
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查参数
if [ -z "$1" ]; then
    log_error "请指定环境参数"
    echo "用法: $0 <environment>"
    exit 1
fi

ENVIRONMENT=$1
FAILED=0

# 环境配置
case $ENVIRONMENT in
    staging)
        API_URL="${STAGING_API_URL:-https://staging-api.example.com}"
        ;;
    production)
        API_URL="${PROD_API_URL:-https://api.example.com}"
        ;;
    *)
        log_error "未知环境: $ENVIRONMENT"
        exit 1
        ;;
esac

log_info "=========================================="
log_info "  健康检查"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "API: $API_URL"
log_info "=========================================="

# 检查 1: 服务健康端点
log_info "[1/5] 检查服务健康..."

HEALTH_STATUS=$(curl -sf "${API_URL}/health" 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH_STATUS" | grep -q '"status":"ok"' || echo "$HEALTH_STATUS" | grep -q '"code":0'; then
    log_success "服务健康检查通过"
else
    log_error "服务健康检查失败"
    log_error "响应: $HEALTH_STATUS"
    FAILED=$((FAILED + 1))
fi

# 检查 2: 天气 API
log_info "[2/5] 检查天气 API..."

WEATHER_RESPONSE=$(curl -sf "${API_URL}/api/weather/current?location=101010100" 2>/dev/null || echo '{}')
if echo "$WEATHER_RESPONSE" | grep -q '"code":0'; then
    log_success "天气 API 正常"
else
    log_warning "天气 API 可能存在问题"
    log_warning "响应: $WEATHER_RESPONSE"
fi

# 检查 3: 缓存状态
log_info "[3/5] 检查缓存状态..."

CACHE_STATUS=$(curl -sf "${API_URL}/api/cache/status" 2>/dev/null || echo '{"type":"unknown"}')
CACHE_TYPE=$(echo "$CACHE_STATUS" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)

case $CACHE_TYPE in
    redis)
        log_success "缓存类型: Redis"
        ;;
    memory)
        log_success "缓存类型: 内存缓存"
        ;;
    *)
        log_warning "缓存类型未知"
        ;;
esac

log_info "缓存状态: $CACHE_STATUS"

# 检查 4: Redis 连接（如果配置了）
log_info "[4/5] 检查 Redis 连接..."

if [ -n "$REDIS_HOST" ]; then
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h $REDIS_HOST -p ${REDIS_PORT:-6379} ping &> /dev/null; then
            log_success "Redis 连接正常"
            
            # 获取 Redis 信息
            REDIS_INFO=$(redis-cli -h $REDIS_HOST -p ${REDIS_PORT:-6379} info memory 2>/dev/null | grep used_memory_human || echo "N/A")
            log_info "Redis 内存使用: $REDIS_INFO"
        else
            log_warning "Redis 连接失败"
        fi
    else
        log_warning "redis-cli 未安装，跳过 Redis 检查"
    fi
else
    log_info "未配置 Redis，跳过检查"
fi

# 检查 5: 性能指标
log_info "[5/5] 检查性能指标..."

# 测试缓存响应时间
START_TIME=$(date +%s%N)
curl -sf "${API_URL}/api/weather/current?location=101010100" > /dev/null 2>&1 || true
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 100 ]; then
    log_success "响应时间正常: ${RESPONSE_TIME}ms"
elif [ $RESPONSE_TIME -lt 500 ]; then
    log_warning "响应时间较慢: ${RESPONSE_TIME}ms"
else
    log_error "响应时间过长: ${RESPONSE_TIME}ms"
    FAILED=$((FAILED + 1))
fi

# 总结
log_info "=========================================="
if [ $FAILED -eq 0 ]; then
    log_success "  所有健康检查通过!"
    log_info "=========================================="
    exit 0
else
    log_error "  有 $FAILED 项检查失败"
    log_info "=========================================="
    exit 1
fi
