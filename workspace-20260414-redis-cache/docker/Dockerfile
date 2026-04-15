# Redis 服务 - 微信云托管部署
# 适用于缓存、Session、限流等场景（无持久化）

FROM redis:7-alpine

# 设置工作目录
WORKDIR /data

# 创建 Redis 配置文件
RUN echo "bind 0.0.0.0" > /usr/local/etc/redis/redis.conf && \
    echo "port 6379" >> /usr/local/etc/redis/redis.conf && \
    echo "maxmemory 256mb" >> /usr/local/etc/redis/redis.conf && \
    echo "maxmemory-policy allkeys-lru" >> /usr/local/etc/redis/redis.conf && \
    echo "tcp-keepalive 300" >> /usr/local/etc/redis/redis.conf && \
    echo "timeout 0" >> /usr/local/etc/redis/redis.conf

# 暴露 Redis 默认端口
EXPOSE 6379

# 设置 Redis 密码（通过环境变量传入）
ENV REDIS_PASSWORD=""

# 启动脚本
COPY <<'EOF' /start-redis.sh
#!/bin/sh

# 基础配置
CONFIG="/usr/local/etc/redis/redis.conf"

# 如果设置了密码，添加到配置
if [ -n "$REDIS_PASSWORD" ]; then
    echo "requirepass $REDIS_PASSWORD" >> $CONFIG
    echo "[Redis] 密码已设置"
else
    echo "[Redis] 警告：未设置密码，生产环境请设置 REDIS_PASSWORD"
fi

# 如果设置了自定义内存限制，覆盖默认配置
if [ -n "$REDIS_MAXMEMORY" ]; then
    sed -i "s/^maxmemory .*/maxmemory $REDIS_MAXMEMORY/" $CONFIG
    echo "[Redis] 内存限制: $REDIS_MAXMEMORY"
fi

# 启动 Redis
echo "[Redis] 启动服务..."
exec redis-server $CONFIG
EOF

RUN chmod +x /start-redis.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping | grep -q PONG || exit 1

# 启动命令
CMD ["/start-redis.sh"]
