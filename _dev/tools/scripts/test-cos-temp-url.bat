@echo off
chcp 65001 >nul
cd /d f:\PROJECTS\WeChatProjects\MVP\scripts

set WECHAT_ENV_ID=prod-4g7ephngc4e53ec3
set WECHAT_APPID=wx6d69e0c6f0dd70a9
set WECHAT_SECRET=4423170f94a79b5f02fd380815d33f07
set TEST_FILE_ID=cloud://prod-4g7ephngc4e53ec3.prod-4g7ephngc4e53ec3-1401681523/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg

node test-cos-temp-url.js
pause
