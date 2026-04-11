# 工作小组创建脚本
# 使用方法: .\create-workgroup.ps1 -Name "任务名" -Type "项目型"

param(
    [Parameter(Mandatory=$true)]
    [string]$Name,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("项目型", "分析型", "运维型", "支撑型")]
    [string]$Type,
    
    [string]$Description = "",
    [string]$TemplatePath = ".",
    [string]$OutputPath = "..\..\..\..\.."
)

# 颜色定义
$colors = @{
    Success = "Green"
    Info = "Cyan"
    Warning = "Yellow"
    Error = "Red"
}

function Write-ColorOutput {
    param($Message, $Color)
    Write-Host $Message -ForegroundColor $colors[$Color]
}

# 验证模板路径
$templateReadme = Join-Path $TemplatePath "README.md"
if (-not (Test-Path $templateReadme)) {
    Write-ColorOutput "错误: 模板文件不存在于 $TemplatePath" "Error"
    exit 1
}

# 创建工作小组目录
$groupName = "${Name}工作小组"
$groupPath = Join-Path $OutputPath $groupName

Write-ColorOutput "正在创建工作小组: $groupName" "Info"
Write-ColorOutput "类型: $Type" "Info"
Write-ColorOutput "目标路径: $groupPath" "Info"

# 检查目录是否已存在
if (Test-Path $groupPath) {
    Write-ColorOutput "警告: 工作小组目录已存在: $groupPath" "Warning"
    $continue = Read-Host "是否覆盖? (y/N)"
    if ($continue -ne "y") {
        Write-ColorOutput "操作已取消" "Info"
        exit 0
    }
}

# 创建目录结构
try {
    # 主目录
    New-Item -ItemType Directory -Path $groupPath -Force | Out-Null
    
    # 子目录
    $subDirs = @(
        "01-方案与规范",
        "02-执行记录",
        "03-跟踪与报告",
        "04-工作方法"
    )
    
    foreach ($dir in $subDirs) {
        $dirPath = Join-Path $groupPath $dir
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        Write-ColorOutput "  ✓ 创建目录: $dir" "Success"
    }
    
    # 复制并自定义模板文件
    $today = Get-Date -Format "yyyy-MM-dd"
    
    # README.md
    $readmeContent = Get-Content (Join-Path $TemplatePath "README.md") -Raw
    $readmeContent = $readmeContent -replace "{任务名}", $Name
    $readmeContent = $readmeContent -replace "{项目型/分析型/运维型/支撑型}", $Type
    $readmeContent = $readmeContent -replace "YYYY-MM-DD", $today
    $readmeContent | Set-Content (Join-Path $groupPath "README.md") -Encoding UTF8
    Write-ColorOutput "  ✓ 创建 README.md" "Success"
    
    # 方案模板
    $specContent = Get-Content (Join-Path $TemplatePath "01-方案与规范\方案模板.md") -Raw
    $specContent = $specContent -replace "{任务名}", $Name
    $specContent = $specContent -replace "YYYY-MM-DD", $today
    $specContent | Set-Content (Join-Path $groupPath "01-方案与规范\${Name}方案.md") -Encoding UTF8
    Write-ColorOutput "  ✓ 创建 ${Name}方案.md" "Success"
    
    # 执行规范
    $normContent = Get-Content (Join-Path $TemplatePath "01-方案与规范\执行规范模板.md") -Raw
    $normContent = $normContent -replace "{任务名}", $Name
    $normContent = $normContent -replace "YYYY-MM-DD", $today
    $normContent | Set-Content (Join-Path $groupPath "01-方案与规范\执行规范.md") -Encoding UTF8
    Write-ColorOutput "  ✓ 创建 执行规范.md" "Success"
    
    # 问题清单
    $issueContent = Get-Content (Join-Path $TemplatePath "03-跟踪与报告\问题清单模板.md") -Raw
    $issueContent = $issueContent -replace "{任务名}", $Name
    $issueContent = $issueContent -replace "YYYY-MM-DD", $today
    $issueContent | Set-Content (Join-Path $groupPath "03-跟踪与报告\问题清单.md") -Encoding UTF8
    Write-ColorOutput "  ✓ 创建 问题清单.md" "Success"
    
    # 完成报告（初始为空模板）
    $reportContent = Get-Content (Join-Path $TemplatePath "03-跟踪与报告\完成报告模板.md") -Raw
    $reportContent = $reportContent -replace "{任务名}", $Name
    $reportContent = $issueContent -replace "YYYY-MM-DD", $today
    $reportContent | Set-Content (Join-Path $groupPath "03-跟踪与报告\完成报告.md") -Encoding UTF8
    Write-ColorOutput "  ✓ 创建 完成报告.md" "Success"
    
    # 创建标识文件
    "1" | Set-Content (Join-Path $groupPath "1.md") -Encoding UTF8
    
    Write-ColorOutput "`n✅ 工作小组创建成功!" "Success"
    Write-ColorOutput "`n下一步操作:" "Info"
    Write-ColorOutput "  1. 编辑 01-方案与规范/${Name}方案.md，完善方案设计" "Info"
    Write-ColorOutput "  2. 编辑 01-方案与规范/执行规范.md，定制执行规范" "Info"
    Write-ColorOutput "  3. 更新 README.md 中的工作范围和执行路径" "Info"
    Write-ColorOutput "  4. 开始执行第一个路径任务" "Info"
    
} catch {
    Write-ColorOutput "错误: $_" "Error"
    exit 1
}
