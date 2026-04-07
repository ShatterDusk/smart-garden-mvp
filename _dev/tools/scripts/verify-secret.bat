@echo off
chcp 65001 >nul
cd /d f:\PROJECTS\WeChatProjects\MVP\scripts

echo === 验证 WECHAT_SECRET ===
echo.

set WECHAT_APPID=wx6d69e0c6f0dd70a9
set WECHAT_SECRET=%1

if "%1"=="" (
  echo 使用方法: verify-secret.bat [你的SECRET]
  echo 示例: verify-secret.bat 4423170f94a79b5f02fd380815d33f07
  pause
  exit /b 1
)

node verify-secret.js
pause
