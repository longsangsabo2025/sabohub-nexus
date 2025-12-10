# Auto-Deploy Script for SABOHUB Nexus
# Fixes all common issues and deploys to production

$ErrorActionPreference = "Stop"

Write-Host "`nSABOHUB AUTO-DEPLOY SCRIPT`n" -ForegroundColor Cyan

# Configuration
$TOKEN = "oo1EcKsmpnbAN9bD0jBvsDQr"
$PROJECT_DIR = "D:\0.PROJECTS\02-SABO-ECOSYSTEM\sabo-hub\sabohub-nexus"
$DOMAIN = "hub.saboarena.com"

# Step 1: Pre-flight checks
Write-Host "Step 1: Pre-flight checks..." -ForegroundColor Yellow

# Check if in correct directory
if (!(Test-Path ".\package.json")) {
    Write-Host "ERROR: Not in project directory! Changing to: $PROJECT_DIR" -ForegroundColor Red
    Set-Location $PROJECT_DIR
}

# Check node_modules
if (!(Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Step 2: Create favicon.png if missing
Write-Host "`nStep 2: Checking assets..." -ForegroundColor Yellow
if (!(Test-Path ".\public\favicon.png")) {
    if (Test-Path ".\public\favicon.ico") {
        Write-Host "Creating favicon.png from favicon.ico..." -ForegroundColor Yellow
        Copy-Item ".\public\favicon.ico" ".\public\favicon.png" -Force
        Write-Host "✅ favicon.png created" -ForegroundColor Green
    }
}

# Step 3: Build
if (!$SkipBuild) {
    Write-Host "`n📋 Step 3: Building production bundle..." -ForegroundColor Yellow
    
    # Clean dist folder
    if (Test-Path ".\dist") {
        Remove-Item ".\dist" -Recurse -Force
        Write-Host "🧹 Cleaned dist folder" -ForegroundColor Gray
    }
    
    # Build
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Build successful" -ForegroundColor Green
    
    # Check dist size
    $distSize = (Get-ChildItem -Path ".\dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "📦 Bundle size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "`n⏭️  Skipping build (using existing dist/)" -ForegroundColor Yellow
}

# Step 4: Verify dist folder
Write-Host "`n📋 Step 4: Verifying build output..." -ForegroundColor Yellow
if (!(Test-Path ".\dist\index.html")) {
    Write-Host "❌ dist/index.html not found!" -ForegroundColor Red
    exit 1
}

# Check for favicon in dist
if (!(Test-Path ".\dist\favicon.png")) {
    Write-Host "⚠️  Warning: favicon.png not in dist/" -ForegroundColor Yellow
}

Write-Host "✅ Build output verified" -ForegroundColor Green

# Step 5: Deploy to Vercel
Write-Host "`n📋 Step 5: Deploying to Vercel..." -ForegroundColor Yellow

$deployOutput = npx vercel --prod --token $TOKEN --archive=tgz --yes 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host $deployOutput
    exit 1
}

# Extract deployment URL
$deploymentUrl = $deployOutput | Select-String -Pattern "https://sabohub-nexus-[a-z0-9]+-[a-z0-9-]+\.vercel\.app" | ForEach-Object { $_.Matches.Value } | Select-Object -First 1

Write-Host "✅ Deployment successful!" -ForegroundColor Green
if ($deploymentUrl) {
    Write-Host "🔗 Deployment URL: $deploymentUrl" -ForegroundColor Cyan
}

# Step 6: Verify deployment
Write-Host "`n📋 Step 6: Verifying live site..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "https://$DOMAIN" -Method Head -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Site is live and responding!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Site verification failed (might need cache clear)" -ForegroundColor Yellow
}

# Step 7: Final summary
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Live Site: https://$DOMAIN" -ForegroundColor Blue
if ($deploymentUrl) {
    Write-Host "🔗 Vercel URL: $deploymentUrl" -ForegroundColor Gray
}
Write-Host "📊 Dashboard: https://vercel.com/dsmhs-projects/sabohub-nexus" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Clear browser cache (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "  2. Test all features" -ForegroundColor White
Write-Host "  3. Check Supabase connection" -ForegroundColor White
Write-Host ""
