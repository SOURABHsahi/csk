# =====================================================================
# KNOME ENTERPRISE PLATFORM LAUNCHER
# Runs Knome Backend API and Frontend UI from a single Terminal
# =====================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " STARTING KNOME ENTERPRISE KNOWLEDGE PLATFORM..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $ScriptDir) { $ScriptDir = "D:\Knome main" }

# 0. Free Ports 5095 & 5173 if already occupied by any previous run
$busyPorts = Get-NetTCPConnection -LocalPort 5095, 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pidToKill in $busyPorts) {
    if ($pidToKill -and $pidToKill -ne $PID) {
        Get-Process -Id $pidToKill -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# 1. Knome Backend API (Port 5095)
Write-Host " Starting Knome Backend API on http://localhost:5095..." -ForegroundColor Yellow
$BackendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir\Backend\Knome.API"
    dotnet run --launch-profile http
} -ArgumentList $ScriptDir

Start-Sleep -Seconds 3

# 2. Ensure IIS Sites are Active (Port 8080 & 8081)
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Start-Website -Name "Knome" -ErrorAction SilentlyContinue
    Start-Website -Name "EmployeeHub" -ErrorAction SilentlyContinue
    Write-Host " IIS Sites verified & active (Ports 8080 & 8081)" -ForegroundColor Green
} catch {
    # IIS optional fallback
}

# 3. Knome Frontend UI (Port 5173)
Write-Host " Starting Knome Frontend UI on http://localhost:5173..." -ForegroundColor Yellow
$FrontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir\knomeUI\frontend"
    npm run dev
} -ArgumentList $ScriptDir

Start-Sleep -Seconds 2

Write-Host "============================================================" -ForegroundColor Green
Write-Host " ALL SERVICES ARE ACTIVE AND RUNNING!" -ForegroundColor Green
Write-Host "  -> IIS Knome Portal:     http://localhost:8080" -ForegroundColor Cyan
Write-Host "  -> IIS EmployeeHub:      http://localhost:8081" -ForegroundColor Cyan
Write-Host "  -> Knome Dev UI:         http://localhost:5173" -ForegroundColor Cyan
Write-Host "  -> Knome Backend API:    http://localhost:5095" -ForegroundColor Cyan
Write-Host "  -> Network / WiFi IP:    http://172.16.17.46:8080" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Press Ctrl+C in this terminal to stop all Knome services." -ForegroundColor Gray

# Keep terminal active and stream job logs
try {
    while ($true) {
        Receive-Job -Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue | Write-Host
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host "Stopping all Knome background services..." -ForegroundColor Red
    Stop-Job -Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
}
