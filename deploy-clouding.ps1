param(
    [string]$ServerUser = "root",
    [string]$ServerIP = "",
    [string]$RemoteDir = "/var/www/islamicreelsupdated"
)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🚀 Islamic Reels Studio — Clouding.io Deployer" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $ServerIP) {
    $ServerIP = Read-Host "Въведи IP адреса на твоя Clouding.io сървър (напр. 185.12.34.56)"
}

if (-not $ServerIP) {
    Write-Host "❌ Грешка: Не е въведен IP адрес." -ForegroundColor Red
    exit 1
}

Write-Host "`n📡 Свързване със сървъра $ServerUser@$ServerIP и обновяване..." -ForegroundColor Yellow

$sshCmd = "cd $RemoteDir || cd ~/islamicreelsupdated && git pull origin main && npm install && npm run build && (pm2 restart all || pm2 start .output/server/index.mjs --name islamic-reels)"

ssh "$ServerUser@$ServerIP" $sshCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 УСПЕШНО ОБНОВЕНО! Сървърът на Clouding.io вече работи с най-новите функции!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Внимание: Провери дали пътят на проекта на сървъра е точен." -ForegroundColor Yellow
}
