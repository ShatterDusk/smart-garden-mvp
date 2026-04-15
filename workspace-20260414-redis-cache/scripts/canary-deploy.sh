#!/bin/bash
# =============================================================================
# Redis 缓存改造 - 灰度部署脚本
# =============================================================================
# 用法: ./canary-deploy.sh <environment> <percentage>
# 示例: ./canary-deploy.sh production 10
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
if [ -z "$1" ] || [ -z "$2" ]; then
    log_error "参数不足"
    echo "用法: $0 <environment> <percentage>"
    echo "示例: $0 production 10"
    exit 1
fi

ENVIRONMENT=$1
PERCENTAGE=$2
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 验证百分比
if ! [[ "$PERCENTAGE" =~ ^[0-9]+$ ]] || [ "$PERCENTAGE" -lt 1 ] || [ "$PERCENTAGE" -gt 100 ]; then
    log_error "灰度比例必须是 1-100 之间的数字"
    exit 1
fi

log_info "=========================================="
log_info "  灰度部署"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "灰度比例: ${PERCENTAGE}%"
log_info "时间: $TIMESTAMP"
log_info "=========================================="

# Step 1: 准备灰度配置
log_info "[1/5] 准备灰度配置..."

CANARY_CONFIG="{
    \"canary\": {
        \"enabled\": true,
        \"percentage\": $PERCENTAGE,
        \"strategy\": \"header\",
        \"header_name\": \"X-Canary\"
    },
    \"redis\": {
        \"enabled\": ${USE_REDIS:-true},
        \"connection\": {
            \"host\": \"${REDIS_HOST}\",
            \"port\": ${REDIS_PORT:-6379},
            \"key_prefix\": \"${REDIS_KEY_PREFIX:-plantgpt:weather:}\"
        }
    }
}"

echo "$CANARY_CONFIG" | jq .
log_success "灰度配置已生成"

# Step 2: 部署金丝雀实例
log_info "[2/5] 部署金丝雀实例..."

# 创建金丝雀部署配置
CANARY_DEPLOYMENT="
apiVersion: apps/v1
kind: Deployment
metadata:
  name: plantgpt-backend-canary
  labels:
    app: plantgpt-backend
    track: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: plantgpt-backend
      track: canary
  template:
    metadata:
      labels:
        app: plantgpt-backend
        track: canary
    spec:
      containers:
      - name: backend
        image: plantgpt-backend:${GITHUB_SHA:-latest}
        env:
        - name: NODE_ENV
          value: production
        - name: REDIS_HOST
          value: $REDIS_HOST
        - name: REDIS_PORT
          value: \"6379\"
        - name: REDIS_KEY_PREFIX
          value: plantgpt:weather:
        - name: CANARY_TRACK
          value: canary
        ports:
        - containerPort: 3000
"

echo "$CANARY_DEPLOYMENT" | kubectl apply -f -
kubectl rollout status deployment/plantgpt-backend-canary

log_success "金丝雀实例已部署"

# Step 3: 配置流量分配
log_info "[3/5] 配置流量分配..."

# 创建服务版本
kubectl label deployment plantgpt-backend track=stable --overwrite
kubectl label deployment plantgpt-backend-canary track=canary --overwrite

# 创建灰度权重规则
CANARY_INGRESS="
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: plantgpt-backend-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: \"true\"
    nginx.ingress.kubernetes.io/canary-weight: \"$PERCENTAGE\"
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: plantgpt-backend-canary
            port:
              number: 3000
"

echo "$CANARY_INGRESS" | kubectl apply -f -

log_success "流量分配已配置: ${PERCENTAGE}%"

# Step 4: 健康检查
log_info "[4/5] 执行健康检查..."

sleep 10

# 检查金丝雀实例
CANARY_PODS=$(kubectl get pods -l track=canary -o jsonpath='{.items[*].metadata.name}')
for pod in $CANARY_PODS; do
    if kubectl exec $pod -- curl -sf localhost:3000/health > /dev/null 2>&1; then
        log_success "Pod $pod 健康检查通过"
    else
        log_warning "Pod $pod 健康检查失败"
    fi
done

# 检查 Redis 连接
REDIS_CHECK=$(kubectl exec $CANARY_PODS -- node -e "
    const cache = require('./src/services/CacheService');
    cache.init().then(() => {
        console.log(JSON.stringify(cache.getStatus()));
        cache.close();
    }).catch(console.error);
" 2>/dev/null || echo '{"type":"unknown"}')

log_info "Redis 缓存状态: $REDIS_CHECK"

# Step 5: 完成灰度部署
log_info "[5/5] 灰度部署完成..."

log_info "=========================================="
log_success "  灰度部署成功!"
log_info "=========================================="
log_info "环境: $ENVIRONMENT"
log_info "灰度比例: ${PERCENTAGE}%"
log_info "金丝雀实例: plantgpt-backend-canary"
log_info "=========================================="

# 显示监控信息
log_info ""
log_info "监控信息:"
log_info "- 监控金丝雀: kubectl logs -l track=canary -f"
log_info "- 查看流量: kubectl describe ingress plantgpt-backend-canary"
log_info "- 提升流量: 修改 canary-weight 注解"
log_info "- 全量发布: kubectl annotate ingress plantgpt-backend-canary nginx.ingress.kubernetes.io/canary-weight=100"
log_info "- 回滚: ./scripts/rollback.sh $ENVIRONMENT canary"
log_info ""

# 保存部署信息供后续使用
cat > /tmp/canary-deploy-${TIMESTAMP}.json << EOF
{
    "environment": "$ENVIRONMENT",
    "percentage": $PERCENTAGE,
    "timestamp": "$TIMESTAMP",
    "canary_deployment": "plantgpt-backend-canary",
    "stable_deployment": "plantgpt-backend"
}
EOF

log_success "部署信息已保存: /tmp/canary-deploy-${TIMESTAMP}.json"

exit 0
