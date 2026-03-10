# 用法：在项目根目录执行
#   .\supabase-push.ps1
# 然后按提示输入你的 Supabase Project Reference ID（在 Dashboard -> Settings -> General 中查看）
# 若已设置环境变量 SUPABASE_PROJECT_REF，可直接运行不输入

$ref = $env:SUPABASE_PROJECT_REF
if (-not $ref) {
    $ref = Read-Host "请输入 Supabase Project Reference ID（Dashboard -> 项目 -> Settings -> General -> Reference ID）"
}
if (-not $ref) {
    Write-Host "未提供 Project Ref，已取消。" -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot
Write-Host "正在链接项目 $ref ..." -ForegroundColor Cyan
npx supabase link --project-ref $ref
if ($LASTEXITCODE -ne 0) {
    Write-Host "链接失败，请检查 Ref 是否正确且已登录 (npx supabase login)。" -ForegroundColor Red
    exit 1
}
Write-Host "正在推送迁移到远程数据库 ..." -ForegroundColor Cyan
npx supabase db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "推送失败。" -ForegroundColor Red
    exit 1
}
Write-Host "迁移已成功应用到 Supabase。" -ForegroundColor Green
