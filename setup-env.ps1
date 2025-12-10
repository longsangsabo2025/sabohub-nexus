# Script để tạo file .env cho sabohub-nexus

$envContent = @"
# Supabase Configuration
VITE_SUPABASE_URL=https://dqddxowyikefqcdiioyh.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# App Configuration
VITE_APP_NAME=SABOHUB
VITE_APP_DESCRIPTION=Nền tảng quản lý thông minh
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development
VITE_DEBUG=true

# API Configuration
VITE_API_URL=http://localhost:3001

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
"@

if (Test-Path .env) {
    Write-Host "⚠️ File .env đã tồn tại!" -ForegroundColor Yellow
    $overwrite = Read-Host "Bạn có muốn ghi đè? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "❌ Đã hủy" -ForegroundColor Red
        exit
    }
}

$envContent | Out-File -FilePath .env -Encoding utf8
Write-Host "✅ Đã tạo file .env!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ QUAN TRỌNG: Bạn cần cập nhật VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
Write-Host ""
Write-Host "Để lấy Anon Key:" -ForegroundColor Cyan
Write-Host "1. Vào Supabase Dashboard: https://supabase.com/dashboard"
Write-Host "2. Chọn project: dqddxowyikefqcdiioyh"
Write-Host "3. Vào Settings > API"
Write-Host "4. Copy 'anon public' key"
Write-Host "5. Mở file .env và paste vào VITE_SUPABASE_ANON_KEY"
Write-Host ""
Write-Host "Hoặc chạy lệnh này để mở file .env:" -ForegroundColor Cyan
Write-Host "  code .env" -ForegroundColor White

