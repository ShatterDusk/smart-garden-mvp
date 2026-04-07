@echo off
chcp 65001 >nul
cd /d f:\PROJECTS\WeChatProjects\MVP\scripts

set WECHAT_ENV_ID=prod-4g7ephngc4e53ec3
set WECHAT_APPID=wx6d69e0c6f0dd70a9
set WECHAT_SECRET=4423170f94a79b5f02fd380815d33f07
set COS_BUCKET=7072-prod-4g7ephngc4e53ec3-1401681523
set COS_REGION=ap-shanghai

node test-presigned-url.js
pause
