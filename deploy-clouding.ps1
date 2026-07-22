param(
    [string]$ServerUser = "root",
    [string]$ServerIP = "93.189.88.228",
    [string]$RemoteDir = "/var/www/islamicreelsupdated"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Islamic Reels Studio - Clouding.io Deployer" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $ServerIP) {
    $ServerIP = Read-Host "Vavedi IP adresa na tvoya Clouding.io sarvar (napr. 185.12.34.56)"
}

if (-not $ServerIP) {
    Write-Host " Greshka: Ne e vaveden IP adres." -ForegroundColor Red
    exit 1
}

Write-Host "`n Svarzvane sas sarvara $ServerUser@$ServerIP i obnovyavane..." -ForegroundColor Yellow

$sshCmd = 'pm2 flush 2>/dev/null; journalctl --vacuum-size=10M 2>/dev/null; npm cache clean --force 2>/dev/null; rm -rf /tmp/* /var/tmp/* ~/.cache/* /root/.cache/* ~/.pm2/logs/* /root/.pm2/logs/* /var/log/*.gz ~/islamicreelsupdated/tmp ~/islamicreelsupdated/.output/tmp 2>/dev/null; DIR=$(find / -maxdepth 5 -name package.json 2>/dev/null | grep -v node_modules | head -n 1 | xargs dirname); echo "Found project directory: $DIR"; cd "$DIR" && git pull origin main && npm install --production=false && npm run build && (systemctl restart nginx 2>/dev/null || true) && pm2 delete all 2>/dev/null; if systemctl is-active --quiet nginx; then echo "Nginx active -> Starting app on PORT=3000"; PORT=3000 pm2 start .output/server/index.mjs --name islamic-reels; else echo "No Nginx -> Starting app directly on PORT=80"; PORT=80 pm2 start .output/server/index.mjs --name islamic-reels; fi && pm2 save && pm2 status && df -h'

ssh "$ServerUser@$ServerIP" $sshCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n USPESHNO OBNOVENO! Sarvarat na Clouding.io veche raboti s naj-novite funktsii!" -ForegroundColor Green
} else {
    Write-Host "`n Vnimanie: Proveri dali patyat na projekta na sarvara e tochen." -ForegroundColor Yellow
}
