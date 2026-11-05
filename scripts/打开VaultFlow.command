#!/bin/bash
cd "$(dirname "$0")/.." || exit 1

PORT=5174
APP_URL="http://127.0.0.1:${PORT}/"

# 优先打开已打包的 macOS 应用
if [ -d "release/mac-arm64/VaultFlow.app" ]; then
  open "release/mac-arm64/VaultFlow.app"
  exit 0
fi
if [ -d "release/mac/VaultFlow.app" ]; then
  open "release/mac/VaultFlow.app"
  exit 0
fi

echo "正在启动 VaultFlow 本地工具..."

if [ ! -d "node_modules" ]; then
  npm install || exit 1
fi

# 构建静态资源
if [ ! -d "dist" ]; then
  npm run build || exit 1
fi

# 启动本地静态服务
if ! curl -fsS "$APP_URL" >/dev/null 2>&1; then
  npx serve dist -l "$PORT" >/tmp/vaultflow-serve.log 2>&1 &
  sleep 1
fi

# 以独立窗口打开（无浏览器地址栏，更像本地工具）
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$APP_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$APP_URL"
else
  open "$APP_URL"
fi

echo "VaultFlow 已在本地打开：$APP_URL"
