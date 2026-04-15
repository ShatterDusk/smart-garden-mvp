#!/bin/bash
# proj-alpha 后端部署脚本
# 用于在服务器上手动或自动部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
DOCKER_IMAGE_NAME="${DOCKER_IMAGE_NAME:-proj-alpha-backend}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/proj-alpha}"
BACKUP_COUNT="${BACKUP_COUNT:-5}"

echo -e "${GREEN}🚀 proj-alpha 后端部署脚本${NC}"
echo "=========================================="

# 检查必要的环境变量
if [ -z "$DOCKER_IMAGE_TAG" ]; then
    echo -e "${YELLOW}⚠️  未设置 DOCKER_IMAGE_TAG，使用 latest${NC}"
    DOCKER_IMAGE_TAG="latest"
fi

# 创建部署目录
echo -e "${GREEN}📁 确保部署目录存在...${NC}"
mkdir -p $DEPLOY_PATH
mkdir -p $DEPLOY_PATH/uploads
mkdir -p $DEPLOY_PATH/logs
mkdir -p $DEPLOY_PATH/backups

# 备份当前运行的容器（如果存在）
echo -e "${GREEN}💾 备份当前配置...${NC}"
if docker ps | grep -q proj-alpha-backend; then
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    docker inspect proj-alpha-backend > $DEPLOY_PATH/backups/$BACKUP_NAME.json 2>/dev/null || true
    echo -e "${GREEN}✅ 已备份到 $DEPLOY_PATH/backups/$BACKUP_NAME.json${NC}"

    # 保留最近的 N 个备份
    ls -t $DEPLOY_PATH/backups/*.json 2>/dev/null | tail -n +$((BACKUP_COUNT + 1)) | xargs -r rm -f
fi

# 拉取新镜像
echo -e "${GREEN}📦 拉取新镜像: $DOCKER_REGISTRY/$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG${NC}"
docker pull $DOCKER_REGISTRY/$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG

# 停止并移除旧容器
echo -e "${GREEN}🛑 停止旧容器...${NC}"
docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml down 2>/dev/null || \
docker stop proj-alpha-backend 2>/dev/null || true
docker rm proj-alpha-backend 2>/dev/null || true

# 更新镜像标签
docker tag $DOCKER_REGISTRY/$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG $DOCKER_REGISTRY/$DOCKER_IMAGE_NAME:latest

# 启动新容器
echo -e "${GREEN}▶️  启动新容器...${NC}"
if [ -f "$DEPLOY_PATH/docker-compose.prod.yml" ]; then
    cd $DEPLOY_PATH
    docker-compose -f docker-compose.prod.yml up -d
else
    echo -e "${YELLOW}⚠️  未找到 docker-compose.prod.yml，使用 docker run 启动${NC}"
    docker run -d \
        --name proj-alpha-backend \
        --restart unless-stopped \
        -p 3000:3000 \
        --env-file $DEPLOY_PATH/.env \
        -v $DEPLOY_PATH/uploads:/tmp/uploads \
        -v $DEPLOY_PATH/logs:/usr/src/app/logs \
        $DOCKER_REGISTRY/$DOCKER_IMAGE_NAME:latest
fi

# 等待服务启动
echo -e "${GREEN}⏳ 等待服务启动...${NC}"
sleep 5

# 健康检查
echo -e "${GREEN}🏥 执行健康检查...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 健康检查通过！${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}⏳ 健康检查失败，重试 ($RETRY_COUNT/$MAX_RETRIES)...${NC}"
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ 健康检查失败，正在回滚...${NC}"
    # 回滚逻辑
    docker stop proj-alpha-backend 2>/dev/null || true
    docker rm proj-alpha-backend 2>/dev/null || true
    # 这里可以添加回滚到上一个版本的逻辑
    exit 1
fi

# 清理旧镜像
echo -e "${GREEN}🧹 清理旧镜像...${NC}"
docker image prune -f

# 显示部署状态
echo ""
echo -e "${GREEN}📊 部署状态:${NC}"
docker ps | grep proj-alpha-backend || true
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=========================================="
echo "服务地址: http://$(hostname -I | awk '{print $1}'):3000"
echo "健康检查: http://$(hostname -I | awk '{print $1}'):3000/health"
echo "日志查看: docker logs -f proj-alpha-backend"
echo "=========================================="
