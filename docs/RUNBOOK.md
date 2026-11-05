# VaultFlow Runbook（开发 / 打包 / 排错）

> 面向：新加入的开发同学、需要快速跑起来做联调的同学。

---

## 1. 前置

- Node.js（建议 LTS）
- npm
- macOS/Windows（Electron 打包按各平台分别产物）

---

## 2. 常用命令

### 2.1 安装依赖

```bash
npm i
```

### 2.2 Web 开发

```bash
npm run dev
```

Vite 默认端口：`5174`（见 `vite.config.ts`）。  
路由是 HashRouter，所以正确访问示例：

- `http://127.0.0.1:5174/#/`
- `http://127.0.0.1:5174/#/town`
- `http://127.0.0.1:5174/#/town/explore`

### 2.3 Electron 开发

```bash
npm run app
```

该命令会：
- 启动 Vite dev server（默认 5174）
- `wait-on http://127.0.0.1:5174`
- 启动 Electron：`electron electron/main.cjs`

### 2.4 构建前端产物

```bash
npm run build
```

### 2.5 打包桌面端

```bash
npm run app:build
```

Electron Builder 输出目录：`release/`

---

## 3. 端口与 Electron DEV_URL

Electron dev 默认 URL（见 `electron/main.cjs`）：

- `DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5174'`

如果你想临时换端口，需要同时设置环境变量：

```bash
VITE_DEV_SERVER_URL=http://127.0.0.1:5180 npm run app
```

---

## 4. Troubleshooting

### 4.1 Vite 报 “Port 5174 is already in use”

- 停掉旧的 `npm run dev` / `npm run app` 进程
- 或用 `VITE_DEV_SERVER_URL` 改端口（见上节）

### 4.2 UI 看起来还是旧版（点 Pin 还是抽屉 / 文案还是旧）

这通常意味着你运行的是旧 bundle 或旧 Electron app：

- **Electron 开发**：确认用的是 `npm run app` 启动的实例，而不是系统里旧安装的 `.app`
- **Electron 打包版**：重新 `npm run app:build` 安装最新产物
- **浏览器**：硬刷新（Cmd+Shift+R），并确认 URL 带 `/#/`（HashRouter）

快速自检点：
- 外出地图底部提示包含 `v1.0.0-beta.1`（可用于判断 bundle 是否更新）

### 4.3 通知点击没有打开微场景

通知分两条链路：

- Electron：走 `electron/preload.cjs` → renderer event
- PWA：走 `public/sw.js` → `postMessage` → `WorldMap.tsx` 监听 `navigator.serviceWorker.message`

排查建议：
- 确认通知权限已授予
- 确认 Web 端已注册 SW（`registerPwaEcoNotify()`）

---

## 5. 代码定位：我应该从哪儿看

- 路由：`src/App.tsx`、`src/pages/town/TownHub.tsx`
- 外出地图：`src/pages/town/WorldMap.tsx`
- 微场景：`src/components/town/ExploreMicroSceneOverlay.tsx`
- 生态浮层：`src/components/town/ExploreEcoFloatCard.tsx`
- 小镇建筑：`src/pages/town/HubTownMap.tsx`、`src/components/town/HubBuilding.tsx`
- Electron：`electron/main.cjs`

