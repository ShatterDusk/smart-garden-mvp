#!/bin/bash
# =============================================================================
# Redis 缓存改造 - 回滚脚本
# =============================================================================
# 用法: ./rollback.sh <environment> [target]
# 示例: ./rollback.sh production
#       ./rollback.sh production canary
#       ./rollback.sh production 20260414_120000
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
    echo "用法: $0 <environment> [target]"
    echo "示例: $0 production"
    echo "      $0 production canary"
    echo "      $0 production 20260414_120000"
    exit 1
fi

ENVIRONMENT=$1
TARGET=${2:-stable}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log_info "=========================================="
log_info "  回滚操作"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "回滚目标: $TARGET"
log_info "时间: $TIMESTAMP"
log_info "=========================================="

# 确认操作
log_warning "⚠️  即将执行回滚操作"
log_warning "这将把服务恢复到之前的状态"
echo ""
read -p "确认执行? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "回滚操作已取消"
    exit 0
fi

# Step 1: 根据目标执行不同的回滚
log_info "[1/4] 执行回滚..."

case $TARGET in
    canary)
        log_info "回滚金丝雀实例..."
        
        # 删除金丝雀部署
        kubectl delete deployment plantgpt-backend-canary --ignore-not-found=true
        kubectl delete ingress plantgpt-backend-canary --ignore-not-found=true
        
        log_success "金丝雀实例已删除"
        ;;

    stable)
        log_info "回滚到稳定版本..."
        
        # 获取当前稳定版本
        CURRENT_IMAGE=$(kubectl get deployment plantgpt-backend -o jsonpath='{.spec.template.spec.containers[0].image}')
        log_info "当前镜像: $CURRENT_IMAGE"
        
        # 获取上一个版本
        BACKUP_IMAGE=${PREVIOUS_IMAGE:-plantgpt-backend:stable}
        kubectl set image deployment/plantgpt-backend backend=$BACKUP_IMAGE
        kubectl rollout status deployment/plantgpt-backend
        
        log_success "已回滚到稳定版本: $BACKUP_IMAGE"
        ;;

    time:*)
        TIMESTAMP_TARGET=${TARGET#time:}
        log_info "回滚到指定时间点: $TIMESTAMP_TARGET"
        
        # 查找对应时间点的备份
        BACKUP_FILE="/tmp/plantgpt-backup-${TIMESTAMP_TARGET}.tar.gz"
        if [ -f "$BACKUP_FILE" ]; then
            tar -xzf "$BACKUP_FILE" -C /tmp/
            kubectl create configmap cache-backup --from-file=/tmp/backup/ --dry-run=client -o yaml | kubectl apply -f -
            log_success "已加载备份: $BACKUP_FILE"
        else
            log_error "未找到备份文件: $BACKUP_FILE"
            exit 1
        fi
        ;;

    *)
        log_error "未知的回滚目标: $TARGET"
        echo "支持的回滚目标:"
        echo "  canary    - 删除金丝雀，恢复到稳定版本"
        echo "  stable    - 回滚到上一个稳定版本"
        echo "  time:TIME - 回滚到指定时间点"
        exit 1
        ;;
esac

# Step 2: 恢复环境变量
log_info "[2/4] 恢复环境变量..."

# 如果之前有备份，尝试恢复
if [ -f "/tmp/plantgpt-backup/.env" ]; then
    kubectl create configmap env-backup --from-env-file=/tmp/plantgpt-backup/.env --dry-run=client -o yaml | kubectl apply -f -
    log_success "环境变量已恢复"
else
    log_warning "未找到环境变量备份"
fi

# Step 3: 清理 Redis 缓存（如有必要）
log_info "[3/4] 清理 Redis 缓存..."

if command -v redis-cli &> /dev/null; then
    read -p "是否清理 Redis 缓存? (yes/no): " clean_cache
    if [ "$clean_cache" == "yes" ]; then
        REDIS_HOST=${PROD_REDIS_HOST:-localhost}
        redis-cli -h $REDIS_HOST FLUSHDB
        log_success "Redis 缓存已清理"
    else
        log_info "跳过缓存清理"
    fi
fi

# Step 4: 验证回滚
log_info "[4/4] 验证回滚..."

sleep 10

# 健康检查
if kubectl exec -it $(kubectl get pods -l app=plantgpt-backend -o jsonpath='{.items[0].metadata.name}') -- curl -sf localhost:3000/health > /dev/null 2>&1; then
    log_success "健康检查通过"
else
    log_warning "健康检查失败，请手动检查服务状态"
fi

# 回滚完成
log_info "=========================================="
log_success "  回滚完成!"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "回滚目标: $TARGET"
log_info "时间: $TIMESTAMP"
log_info "=========================================="

# 显示后续步骤
log_info ""
log_info "后续步骤:"
log_info "1. 检查服务状态: kubectl get pods -l app=plantgpt-backend"
log_info "2. 查看日志: kubectl logs -l app=plantgpt-backend -f"
log_info "3. 监控流量: kubectl describe ingress"
log_info ""

exit 0
