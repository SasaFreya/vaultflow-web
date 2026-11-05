#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
PROJECT_DIR="$(cd -- "$(dirname -- "$0")/.." && pwd)"
APP_URL="http://127.0.0.1:5174/"
LOG_FILE="$PROJECT_DIR/.vaultflow-dev.log"
cd "$PROJECT_DIR" || exit 1

fail() {
  echo "$1"
  echo "按回车关闭窗口。"
  read -r
  exit 1
}

command -v node >/dev/null 2>&1 || fail "没有找到 Node.js。"
[ -f node_modules/vite/bin/vite.js ] || fail "缺少项目依赖，请先在项目中运行 npm install。"

if ! curl -fsS --max-time 2 "${APP_URL}@vite/client" 2>/dev/null | grep -q 'createHotContext'; then
  if lsof -nP -iTCP:5174 -sTCP:LISTEN >/dev/null 2>&1; then
    fail "5174 端口被其他服务占用，请关闭该服务后重试。"
  fi
  echo "正在启动个人资产仪表盘（热更新模式）…"
  nohup node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort >"$LOG_FILE" 2>&1 < /dev/null &
  DEV_PID=$!
  disown "$DEV_PID" 2>/dev/null || true
  READY=0
  for ((i=0; i<60; i++)); do
    if curl -fsS --max-time 1 "${APP_URL}@vite/client" 2>/dev/null | grep -q 'createHotContext'; then
      READY=1
      break
    fi
    kill -0 "$DEV_PID" 2>/dev/null || break
    sleep 0.5
  done
  [ "$READY" = 1 ] || { tail -n 20 "$LOG_FILE"; fail "启动失败，请查看上方日志。"; }
fi

open "$APP_URL" || fail "无法打开浏览器，请访问 $APP_URL"
echo "已打开 $APP_URL"
echo "修改项目代码后，页面会自动更新。可以关闭这个终端窗口。"
