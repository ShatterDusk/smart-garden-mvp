# proj-alpha 文档重组迁移脚本
# 执行方式: PowerShell 中运行 .\迁移执行脚本.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "proj-alpha 文档重组迁移脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置路径
$ProjectRoot = "f:\PROJECTS\WeChatProjects\MVP"
$DocsNew = "$ProjectRoot\docs_new"
$DocsOld = "$ProjectRoot\docs"
$DesignDocs = "$ProjectRoot\设计文档"
$TraeDocs = "$ProjectRoot\.trae\documents"
$DevToolsDocs = "$ProjectRoot\_dev\tools\docs"

Write-Host "步骤 1: 验证新文档结构..." -ForegroundColor Yellow

# 验证目录结构
$RequiredDirs = @(
    "01-product",
    "02-architecture\diagrams",
    "03-frontend\guides",
    "04-backend\guides",
    "05-process",
    "06-testing\reports",
    "07-operations",
    "08-tasks\active",
    "08-tasks\backlog",
    "08-tasks\archive",
    "09-references",
    "10-project\specs"
)

$AllDirsExist = $true
foreach ($dir in $RequiredDirs) {
    $fullPath = Join-Path $DocsNew $dir
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $dir (缺失)" -ForegroundColor Red
        $AllDirsExist = $false
    }
}

if (-not $AllDirsExist) {
    Write-Host "错误: 目录结构不完整，请检查!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "步骤 2: 验证核心文档已迁移..." -ForegroundColor Yellow

# 验证核心文档
$RequiredDocs = @(
    "01-product\需求规格说明书.md",
    "02-architecture\系统架构设计.md",
    "02-architecture\数据库设计.md",
    "02-architecture\API接口设计.md",
    "03-frontend\前端页面设计.md",
    "05-process\用户管理流程.md",
    "05-process\植物管理流程.md",
    "05-process\设备管理流程.md",
    "05-process\环境数据流程.md",
    "05-process\AI交互流程.md",
    "06-testing\测试方案.md",
    "08-tasks\README.md"
)

$AllDocsExist = $true
foreach ($doc in $RequiredDocs) {
    $fullPath = Join-Path $DocsNew $doc
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $doc" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $doc (缺失)" -ForegroundColor Red
        $AllDocsExist = $false
    }
}

Write-Host ""
Write-Host "步骤 3: 统计文档数量..." -ForegroundColor Yellow

# 统计文档
function Count-MarkdownFiles($path) {
    if (Test-Path $path) {
        return (Get-ChildItem -Path $path -Filter "*.md" -Recurse).Count
    }
    return 0
}

$oldDocsCount = Count-MarkdownFiles $DocsOld
$oldDesignCount = Count-MarkdownFiles $DesignDocs
$oldTraeCount = Count-MarkdownFiles $TraeDocs
$newDocsCount = Count-MarkdownFiles $DocsNew

Write-Host "  原 docs/ 目录: $oldDocsCount 个文档" -ForegroundColor Gray
Write-Host "  原 设计文档/ 目录: $oldDesignCount 个文档" -ForegroundColor Gray
Write-Host "  原 .trae/documents/ 目录: $oldTraeCount 个文档" -ForegroundColor Gray
Write-Host "  新 docs_new/ 目录: $newDocsCount 个文档" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 人工检查 docs_new/ 目录内容" -ForegroundColor White
Write-Host "  2. 确认无误后，执行切换:" -ForegroundColor White
Write-Host "     - 备份原 docs/ 目录" -ForegroundColor White
Write-Host "     - 将 docs_new/ 重命名为 docs/" -ForegroundColor White
Write-Host "     - 删除旧的 设计文档/ 目录" -ForegroundColor White
Write-Host ""
Write-Host "切换命令 (请在确认后执行):" -ForegroundColor Yellow
Write-Host "  Rename-Item -Path '$DocsOld' -NewName 'docs_backup'" -ForegroundColor Gray
Write-Host "  Rename-Item -Path '$DocsNew' -NewName 'docs'" -ForegroundColor Gray
Write-Host ""
