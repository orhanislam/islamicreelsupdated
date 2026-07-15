#!/usr/bin/env bash
set -e

echo "=============================================="
echo "🚀 Islamic Reels Studio — Clouding.io Update"
echo "=============================================="

echo "0. 🧹 Освобождаване на дисково пространство..."
pm2 flush 2>/dev/null || true
journalctl --vacuum-size=20M 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
rm -rf /tmp/* /var/tmp/* ~/.cache/* /root/.cache/* ~/.pm2/logs/* /root/.pm2/logs/* /var/log/*.gz ./tmp ./.output/tmp 2>/dev/null || true

echo "1. 📥 Изтегляне на най-новия код от GitHub..."
git pull origin main

echo "2. 📦 Инсталиране на библиотеки (zod, sharp, p-queue, node-cron)..."
npm install --production=false

echo "3. 🔨 Изграждане на оптимизиран сървърен билд..."
npm run build

echo "4. 🔄 Рестартиране на сървъра..."
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 start .output/server/index.mjs --name "islamic-reels"
    echo "✅ PM2 процесът е рестартиран успешно!"
else
    echo "ℹ️ PM2 не е намерен. Можете да стартирате сървъра с: node .output/server/index.mjs"
fi

echo "=============================================="
echo "🎉 Сървърът е успешно обновен до версия 4.0 Pro!"
echo "=============================================="
