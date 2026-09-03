#!/bin/bash
# 换网络后一键同步：检测当前局域网 IP → 更新 env.ts → 重新构建
# 用法：pnpm sync:lan
set -e
cd "$(dirname "$0")/.."

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
if [ -z "$IP" ]; then
  echo "❌ 未检测到局域网 IP（检查 Wi-Fi 是否连接）"
  exit 1
fi

ENV_FILE="src/config/env.ts"
if grep -q "LAN_API_BASE_URL = 'http://[0-9.]*:3000" "$ENV_FILE"; then
  sed -i '' "s|^const LAN_API_BASE_URL = 'http://[0-9.]*:3000|const LAN_API_BASE_URL = 'http://${IP}:3000|" "$ENV_FILE"
  echo "✅ LAN_API_BASE_URL 已更新为 http://${IP}:3000（模拟器走 127.0.0.1 不受影响）"
else
  echo "❌ env.ts 中未找到 LAN_API_BASE_URL，请手动检查"
  exit 1
fi

echo "📦 重新构建中..."
pnpm build:weapp
echo "✅ 完成。请在开发者工具重新点「预览」扫码"
