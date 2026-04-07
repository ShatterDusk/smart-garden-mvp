# proj-alpha 智能园艺助手 - 生产环境 Dockerfile
# 适用于微信云托管 / 传统服务器部署

# 使用 Node.js 18 LTS 轻量级镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json（利用 Docker 缓存层）
COPY package.json ./

# 安装生产环境依赖
# --only=production 只安装 dependencies，跳过 devDependencies
RUN npm install --only=production && \
    npm cache clean --force

# 复制 Sequelize CLI 配置文件（必须在复制应用代码之前）
COPY .sequelizerc ./

# 复制核心应用代码
COPY server.js ./
COPY src/ ./src/

# 创建上传目录（云托管使用 /tmp 作为临时存储）
RUN mkdir -p /tmp/uploads && \
    chmod 755 /tmp/uploads

# 暴露服务端口
EXPOSE 3000

# 健康检查（使用 Node.js 原生方式，无需安装 curl）
# 每 30 秒检查一次，超时 3 秒，启动后等待 5 秒开始检查，失败 3 次后判定不健康
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 启动命令
CMD ["node", "server.js"]
