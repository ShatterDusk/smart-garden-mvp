@echo off
chcp 65001 >nul
echo ==========================================
echo   IoT Sensor Data Simulator 启动脚本
echo ==========================================
echo.

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.7+
    pause
    exit /b 1
)

REM 检查虚拟环境
if not exist venv (
    echo [信息] 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate

REM 安装依赖
echo [信息] 检查依赖...
pip install -q -r requirements.txt

REM 启动应用
echo [信息] 启动模拟器...
echo [信息] 请访问 http://localhost:8080
echo.
python app/main.py

pause
