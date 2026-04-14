# GitHub Actions 自动部署配置指南

## 概述

配置完成后，每次推送到 `main` 或 `master` 分支将自动触发：
1. 代码检查
2. 单元测试
3. 集成测试
4. 构建检查
5. **构建 Docker 镜像**
6. **自动部署到生产服务器**

## 需要配置的 GitHub Secrets

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加以下 Secrets：

### Docker 镜像仓库配置

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `DOCKER_REGISTRY` | Docker 镜像仓库地址 | `docker.io` (Docker Hub) 或 `registry.cn-hangzhou.aliyuncs.com` |
| `DOCKER_USERNAME` | Docker 仓库用户名 | `your-username` |
| `DOCKER_PASSWORD` | Docker 仓库密码或 Token | `your-password-or-token` |
| `DOCKER_IMAGE_NAME` | 镜像名称 | `plantgpt-backend` |

### SSH 部署配置

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `SSH_PRIVATE_KEY` | 服务器的 SSH 私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_HOST` | 部署服务器 IP 或域名 | `192.168.1.100` 或 `api.plantgpt.com` |
| `DEPLOY_USER` | SSH 登录用户名 | `root` 或 `ubuntu` |
| `DEPLOY_PATH` | 服务器上的部署路径 | `/opt/plantgpt` |

## 服务器准备

### 1. 安装 Docker 和 Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 创建部署目录

```bash
sudo mkdir -p /opt/plantgpt
sudo mkdir -p /opt/plantgpt/uploads
sudo mkdir -p /opt/plantgpt/logs
sudo mkdir -p /opt/plantgpt/backups
```

### 3. 配置环境变量文件

创建 `/opt/plantgpt/.env` 文件：

```bash
# 数据库配置
DB_HOST=your-mysql-host
DB_PORT=3306
DB_NAME=smart_garden
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT 配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# 微信小程序配置
WECHAT_APPID=your-appid
WECHAT_SECRET=your-secret
WECHAT_ENV_ID=your-env-id

# 腾讯云 COS 配置
COS_SECRET_ID=your-secret-id
COS_SECRET_KEY=your-secret-key
COS_BUCKET=your-bucket
COS_REGION=ap-shanghai

# 和风天气配置
QWEATHER_KEY=your-key

# 百度植物识别配置
BAIDU_API_KEY=your-key
BAIDU_SECRET_KEY=your-secret

# 硅基流动AI配置
SILICONFLOW_API_KEY=your-key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1

# 任务富余配置
TASK_SURPLUS_COUNT=3

# Docker 配置
DOCKER_REGISTRY=docker.io
DOCKER_IMAGE_NAME=plantgpt-backend
BACKEND_PORT=3000
```

### 4. 复制 docker-compose.prod.yml

将项目中的 `backend/server/docker-compose.prod.yml` 复制到服务器：

```bash
scp backend/server/docker-compose.prod.yml root@your-server:/opt/plantgpt/
```

### 5. 配置 SSH 密钥

生成用于 GitHub Actions 的 SSH 密钥对：

```bash
# 在本地生成密钥对
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# 将公钥添加到服务器的 authorized_keys
cat ~/.ssh/github_actions_deploy.pub | ssh root@your-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 将私钥内容添加到 GitHub Secrets (SSH_PRIVATE_KEY)
cat ~/.ssh/github_actions_deploy
```

## 测试部署

### 1. 手动测试部署脚本

在服务器上手动运行部署脚本测试：

```bash
cd /opt/plantgpt
export DOCKER_IMAGE_TAG=latest
export DOCKER_REGISTRY=docker.io
export DOCKER_IMAGE_NAME=plantgpt-backend
bash /path/to/deploy.sh
```

### 2. 触发自动部署

推送代码到 main 分支：

```bash
git add .
git commit -m "feat: 配置自动部署"
git push origin main
```

然后在 GitHub 仓库的 Actions 标签页查看部署进度。

## 故障排查

### 部署失败

1. **检查 GitHub Actions 日志**
   - 进入仓库的 Actions 标签页
   - 查看失败的 workflow 日志

2. **检查服务器日志**
   ```bash
   # 查看容器日志
   docker logs plantgpt-backend
   
   # 查看系统日志
   journalctl -u docker -f
   ```

3. **检查 SSH 连接**
   ```bash
   # 测试 SSH 连接
   ssh -i ~/.ssh/github_actions_deploy root@your-server
   ```

### 健康检查失败

1. 检查环境变量是否正确配置
2. 检查数据库连接是否正常
3. 检查端口是否被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 检查容器状态
docker ps -a
docker inspect plantgpt-backend
```

## 回滚

如果部署失败，可以手动回滚到上一个版本：

```bash
# 查看历史镜像
docker images | grep plantgpt-backend

# 使用上一个版本的镜像重新部署
docker stop plantgpt-backend
docker rm plantgpt-backend
docker run -d \
    --name plantgpt-backend \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file /opt/plantgpt/.env \
    -v /opt/plantgpt/uploads:/tmp/uploads \
    plantgpt-backend:previous-tag
```

## 安全建议

1. **使用 Docker Hub Access Token** 而不是密码
2. **限制 SSH 密钥权限** - 仅允许执行部署相关命令
3. **启用防火墙** - 仅开放必要的端口
4. **定期更新** - 保持 Docker 和系统更新
5. **使用 HTTPS** - 生产环境建议使用 HTTPS 反向代理（如 Nginx）
