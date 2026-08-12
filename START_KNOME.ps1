# =====================================================================
# KNOME ENTERPRISE PLATFORM LAUNCHER
# Runs Knome Backend API and Frontend UI from a single Terminal
# =====================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " STARTING KNOME ENTERPRISE KNOWLEDGE PLATFORM..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Knome Backend API (Port 5095)
Write-Host " Starting Knome Backend API on http://localhost:5095..." -ForegroundColor Yellow
$BackendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir\Backend\Knome.API"
    dotnet run
} -ArgumentList $ScriptDir

Start-Sleep -Seconds 3

# 2. Knome Frontend UI (Port 5173)
Write-Host " Starting Knome Frontend UI on http://localhost:5173..." -ForegroundColor Yellow
$FrontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir\knomeUI\frontend"
    npm run dev
} -ArgumentList $ScriptDir

Start-Sleep -Seconds 2

Write-Host "============================================================" -ForegroundColor Green
Write-Host " KNOME PLATFORM IS ACTIVE AND RUNNING!" -ForegroundColor Green
Write-Host "  -> Knome Web Portal:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "  -> Knome Backend API:   http://localhost:5095" -ForegroundColor Cyan
Write-Host "  -> Single Sign-On:      Delegated to EmployeeHub (http://localhost:5001)" -ForegroundColor Cyan
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
