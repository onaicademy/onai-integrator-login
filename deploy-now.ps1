#!/usr/bin/env pwsh
# Скрипт для деплоя backend и frontend

Write-Host "🚀 STARTING DEPLOYMENT PROCESS..." -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. BACKEND DEPLOY (GitHub Actions)
# ============================================
Write-Host "📦 Step 1: Deploying Backend via GitHub Actions..." -ForegroundColor Yellow

# Проверяем наличие gh CLI
$ghExists = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghExists) {
    Write-Host "❌ GitHub CLI (gh) not found. Installing..." -ForegroundColor Red
    Write-Host "   Run: winget install GitHub.cli" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Or download from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⏭️  Skipping GitHub Actions trigger, checking status instead..." -ForegroundColor Yellow
} else {
    Write-Host "✅ GitHub CLI found, triggering backend deploy workflow..." -ForegroundColor Green
    
    try {
        gh workflow run deploy-backend.yml --ref main
        Write-Host "✅ Backend deploy workflow triggered!" -ForegroundColor Green
        Start-Sleep -Seconds 3
    } catch {
        Write-Host "⚠️  Could not trigger workflow: $_" -ForegroundColor Yellow
        Write-Host "   Workflow may have already started automatically" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔍 Checking recent workflow runs..." -ForegroundColor Cyan

try {
    $runs = gh run list --workflow=deploy-backend.yml --limit 3 --json status,conclusion,createdAt,displayTitle 2>&1
    if ($LASTEXITCODE -eq 0) {
        $runs | ConvertFrom-Json | ForEach-Object {
            $statusEmoji = switch ($_.status) {
                "completed" { 
                    if ($_.conclusion -eq "success") { "✅" } 
                    elseif ($_.conclusion -eq "failure") { "❌" }
                    else { "⚠️" }
                }
                "in_progress" { "🔄" }
                "queued" { "⏳" }
                default { "❓" }
            }
            $time = [DateTime]::Parse($_.createdAt).ToLocalTime().ToString("HH:mm:ss")
            Write-Host "$statusEmoji [$time] $($_.displayTitle) - Status: $($_.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "⚠️  Could not fetch workflow status" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 2. FRONTEND DEPLOY (Vercel)
# ============================================
Write-Host "📦 Step 2: Checking Vercel Frontend Deploy..." -ForegroundColor Yellow
Write-Host "   ℹ️  Vercel auto-deploys on git push" -ForegroundColor Gray
Write-Host "   🔗 Check: https://vercel.com/dashboard" -ForegroundColor Cyan

Write-Host ""

# ============================================
# 3. HEALTH CHECKS
# ============================================
Write-Host "🏥 Step 3: Running Health Checks..." -ForegroundColor Yellow
Write-Host ""

# Backend health check
Write-Host "   Checking Backend API..." -ForegroundColor Gray
try {
    $backendHealth = Invoke-RestMethod -Uri "https://api.onai.academy/api/health" -TimeoutSec 10
    $timestamp = $backendHealth.timestamp
    Write-Host "   ✅ Backend: OK (timestamp: $timestamp)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend: FAILED - $_" -ForegroundColor Red
}

# Frontend health check
Write-Host "   Checking Frontend..." -ForegroundColor Gray
try {
    $frontendResponse = Invoke-WebRequest -Uri "https://onai.academy" -Method Head -TimeoutSec 10 -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend: OK (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Frontend: Status $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Frontend: FAILED - $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📊 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Backend:  https://api.onai.academy/api/health" -ForegroundColor White
Write-Host "📍 Frontend: https://onai.academy" -ForegroundColor White
Write-Host "📍 GitHub Actions: https://github.com/onaicademy/onai-integrator-login/actions" -ForegroundColor White
Write-Host "📍 Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host ""
Write-Host "✅ Deployment process completed!" -ForegroundColor Green
Write-Host "   Wait 2-3 minutes for workflows to finish" -ForegroundColor Gray
Write-Host ""

