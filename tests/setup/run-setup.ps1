# Load environment variables từ .env file
Write-Host "`n📋 Loading environment variables...`n" -ForegroundColor Cyan

# Đọc .env file
$envFile = Get-Content ".env"
foreach ($line in $envFile) {
    if ($line -match '^VITE_' -and $line -match '=') {
        $parts = $line -split '=', 2
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
        Write-Host "✓ $name" -ForegroundColor Green
    }
}

Write-Host "`n🎯 Running Test Data Setup...`n" -ForegroundColor Yellow

# Chạy setup script
npx tsx tests/setup/global-setup.ts

Write-Host "`n✅ Done!`n" -ForegroundColor Green
