$ErrorActionPreference = "Stop"

$GITHUB_TOKEN = "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"
$REPO_OWNER = "onaicademy"
$REPO_NAME = "onai-integrator-login"
$WORKFLOW_FILE = "deploy.yml"
$BRANCH = "main"

Write-Host "Deploying to DigitalOcean..." -ForegroundColor Cyan

$headers = @{
    "Accept" = "application/vnd.github.v3+json"
    "Authorization" = "token $GITHUB_TOKEN"
}

$body = @{
    ref = $BRANCH
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/$WORKFLOW_FILE/dispatches" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json" | Out-Null

    Write-Host "Deploy triggered successfully!" -ForegroundColor Green
    Write-Host "Check status: https://github.com/$REPO_OWNER/$REPO_NAME/actions" -ForegroundColor Blue
    
    Start-Sleep -Seconds 3
    
    $runsResponse = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runs?per_page=1" `
        -Method Get `
        -Headers $headers
    
    if ($runsResponse.workflow_runs.Count -gt 0) {
        $latestRun = $runsResponse.workflow_runs[0]
        Write-Host "Latest run: $($latestRun.status)" -ForegroundColor Yellow
        Write-Host "URL: $($latestRun.html_url)" -ForegroundColor Blue
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

