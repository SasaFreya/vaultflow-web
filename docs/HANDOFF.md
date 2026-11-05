# VaultFlow 项目交接文档（发给队友版）

更新时间：2026-07-08  
版本：`1.0.0-beta.1`  
仓库路径：`/Users/jingwen/Documents/个人资产可视化仪表盘app`

> 这份文档面向“接手开发/联调”的队友：先理解系统边界，再按模块定位文件，最后按 Runbook 跑起来。

---

## 1. 项目是什么（一句话）

**VaultFlow** 是一个 **本地优先（Local-first）** 的个人资产可视化工具：  
核心是资产/流水/图表；同时用 **“人生小镇 / 外出地图 / 微场景”** 把生活域（职/身/心/社/家）做成 RPG 式入口，让“记账数据”与“自述回忆”互相投射。

---

## 2. 技术栈与运行形态

- **前端**：React 19 + TypeScript（TS/TSX）+ Vite  
- **路由**：`react-router-dom`（HashRouter，URL 形如 `/#/town/explore`）  
- **动画**：Framer Motion  
- **渲染/粒子**：PixiJS 8（热力、粒子、runner）  
- **桌面端**：Electron（`electron/main.cjs`）  
- **数据**：浏览器本地存储（localStorage + IndexedDB）为主；Electron 侧有本地目录（Documents/VaultFlow）用于导入/导出类能力

> 重要：**v1 明确不接第三方 API（除用户自配的 AI Key）**。默认“手动 10 秒内录入”。

---

## 3. 核心原则（对齐团队认知）

### 3.1 产品/体验原则（小镇规则）

项目有硬性 UI/叙事规范（workspace rules）：
- 小镇是情感容器：**建筑 = 人生维度**，入口不可乱加
- 颜色、圆角、动效、信息密度都需走 `--aobi-*` token，避免“网页报表感”
- 默认克制：主界面常驻按钮 ≤ 6，高级功能渐进披露

（规范来源：`.cursor/rules/aobi-design.mdc` 与 `src/styles/aobi-design-system.css`；视觉拆解参考：`docs/design/六款游戏视觉风格拆解报告.md`）

### 3.2 工程边界（最关键）

这次迭代的原则是：
- **只改 town/RPG/ecosystem 层**（微场景、外出地图、浮层、Pixi、通知深链等）
- **不改资产核心表格/交易计算逻辑**（Dashboard/Transactions/Accounts 等）

---

## 4. 目录结构速览（高频入口）

### 4.1 总路由入口

- `src/App.tsx`：HashRouter + 主 Layout，挂载 `/town/*`
- `src/pages/town/TownHub.tsx`：小镇子路由：
  - `/town` → `HubTownMap`（人生小镇）
  - `/town/explore` → `WorldMap`（外出地图）
  - `/town/loft` / `/town/memories` / `/town/memories/report` 等

### 4.2 外出地图（Explore）

主文件：
- `src/pages/town/WorldMap.tsx`

关键组件：
- `src/components/town/ExploreMapPin.tsx`：建筑 Pin（支持 Lv 动画、高亮）
- `src/components/town/ExploreMicroSceneOverlay.tsx`：**框式微场景（Portal）**
- `src/components/town/ExploreEcoFloatCard.tsx`：**居中生态浮层（替代侧栏抽屉）**
- `src/components/town/ExploreUnifiedPixiLayer.tsx`：单 Canvas：热力 + 粒子 + runner

### 4.3 人生小镇（Hub）

主文件：
- `src/pages/town/HubTownMap.tsx`

关键组件：
- `src/components/town/HubBuilding.tsx`：小镇建筑点击/拖拽
- `src/components/town/HubMicroSceneOverlay.tsx`：**小镇建筑框内场景（不跳出游戏）**
- `src/lib/town-hub-buildings.ts`：建筑元数据（id/route/深度）

---

## 5. 关键交互：现在“点哪里会发生什么”

### 5.1 外出地图：点 Pin 的期望行为

目标：**点击 Pin 必然进入框式微场景**（不打开侧栏抽屉）。

在 `WorldMap.tsx` 中：
- Pin 点击 → `openMicroScene(buildingType, anchor)` → 设置 `sceneBuilding`，清理 `drawerBuilding`
- 生态数据只通过微场景按钮触发：微场景「生态数据」→ 关闭微场景 → 打开 `ExploreEcoFloatCard`

### 5.2 生态浮层与地图联动

`ExploreEcoFloatCard` 的时间轴条目支持点击回到地图高亮：
- 点击时间轴条目 → 高亮对应 Pin（`highlightedPinId`）并打开该域微场景

### 5.3 人生小镇：建筑点击不再“跳出游戏”

问题：银行/目标/日历等建筑直跳外层页面会“跳出游戏感”。  
解决：在 `HubBuilding.tsx` 引入 `onOpenScene`：
- 点建筑 → **框内建筑场景**（`HubMicroSceneOverlay`）
- 框内有一个“打开完整页面”的可选按钮（例如银行 → `/`），让跳转变成用户主动选择
- 外出地图建筑（`explore`）仍直接导航到 `/town/explore`

---

## 6. 生态/回忆/照片/AI：数据如何流动

### 6.1 回忆（Life Memories）

回忆数据来自 `LifeMemoriesProvider`（hook：`useLifeMemories`）。  
外出地图与人生馆共用同一套 memories 数据。

### 6.2 照片：从 localStorage 迁到 IndexedDB

动机：大图放 localStorage 压力大，影响性能与配额。  
实现：
- `src/lib/memory-photo-store.ts`：IndexedDB 存储 + JPEG 压缩（宽度 960，quality 0.82）
- `src/components/town/MicroScenePhotoWall.tsx`：按 memoryId 批量加载缩略图，框内展示照片墙

### 6.3 AI（可选）

- AI 设置结构见 `src/types/index.ts`：
  - `AISettings.dashscopeApiKey`（百炼兼容接口）
- 主要用途：
  - 写回忆草稿：`src/lib/memory-ai.ts`（DashScope chat/completions）
  - 微场景壁纸：`src/lib/micro-scene-aigc.ts`（DashScope 文生图，缓存到 localStorage）

安全原则：
- **没有 Key 就回退**：UI 只提示，不阻断
- Key 只存在本地 settings（local），不上传

---

## 7. 通知与深链（Electron + PWA）

### 7.1 Electron

- 入口：`electron/main.cjs`
- Dev URL：默认 `http://127.0.0.1:5174`
- 通知点击后触发“进入某个微场景”的逻辑（通过 preload/renderer 的事件桥接）

### 7.2 Web / PWA

新增：
- `public/sw.js`：Service Worker，支持通知点击聚焦窗口并 postMessage
- `src/lib/pwa-eco-notify.ts`：注册 SW、请求权限、复用原有提醒逻辑
- `WorldMap.tsx` 监听 SW message：`vaultflow-weather-scene` → `openMicroScene(buildingType)`

---

## 8. Batch 11–12（近期改动摘要）

> 下面是“这段时间队友最容易踩坑的变化点”，按体验目标描述。

### 8.1 彻底去掉外出地图侧栏抽屉（网页感）

- `ExploreDomainDrawer` 旧侧栏已移除（不再被 `WorldMap` 使用）
- 改用 `ExploreEcoFloatCard` 居中浮层（更像“框内面板”）

### 8.2 微场景（Explore）能力补齐

- AIGC 背景图：可选生成可爱室内插画当壁纸（无 Key 回退）
- 热力钻取：列表项内联编辑回忆，不再跳页面
- 照片：IndexedDB 压缩存储 + 框内照片墙
- 天气推送：通知点击直接唤起微场景（Electron + PWA）
- 角色 hotspot：点沙发/器械角色走过去
- Pin 动效：弹跳、升级微动画、框弹出 transformOrigin 联动
- 框内天气粒子：雨/雪
- Pixi：统一 Canvas 含 runner（热力 + 环境粒子 + 小人）
- 地图镜头推近：开场景轻微 zoom 到 Pin

### 8.3 人生小镇（Hub）“不跳出游戏”

银行/心愿树/日历塔/杂货铺/人生馆等：
- 点击建筑 → 框内场景
- 框内提供“打开完整页面”的可选按钮

---

## 9. 本地开发 / 打包 Runbook（最常用）

### 9.1 Web 开发

```bash
npm i
npm run dev
```

访问：`http://127.0.0.1:5174/#/town`（注意 Hash 路由）

### 9.2 Electron 开发（推荐）

```bash
npm run app
```

> 该命令会等待 Vite 在 `5174` 起服务，然后启动 Electron。

### 9.3 产物构建

```bash
npm run build
```

### 9.4 打包桌面端

```bash
npm run app:build
```

---

## 10. 常见问题（Troubleshooting）

### 10.1 “我点 Pin 还是打开右侧抽屉”

这是**旧 bundle**在运行的典型表现（旧版文案会写“抽屉”）。  
建议：
- Electron：确保是 `npm run app` 启动的开发实例，或重新打包安装最新 `.app`
- 浏览器：硬刷新（Cmd+Shift+R），确认 URL 是 `/#/town/explore`

### 10.2 端口占用（5174）

Vite 默认端口固定为 `5174`（见 `vite.config.ts`）。  
如果被占用：
- 停掉旧 dev server/electron
- 或临时改端口启动（并注意 Electron DEV_URL）

---

## 11. 下一步建议（给队友的可选路线）

按“安全性 + 使用性 + 游戏感”优先级排序：

1. **导入/导出与隐私**：提供“导出回忆+照片备份”（加密 zip / 明确本地路径）
2. **权限/通知 UX**：统一 Electron/PWA 的权限开关入口（设置页集中管理）
3. **微场景内轻量记账**：框内记一笔，减少跳出；但不改资产核心计算
4. **回忆编辑撤销/版本**：防误触，提升信任感
5. **性能**：Pixi unified 增量更新（只在 refreshKey 变更时重建）

---

## 12. 关键文件索引（复制给队友就能搜）

- 路由：
  - `src/App.tsx`
  - `src/pages/town/TownHub.tsx`
- 外出地图：
  - `src/pages/town/WorldMap.tsx`
  - `src/components/town/ExploreMicroSceneOverlay.tsx`
  - `src/components/town/ExploreEcoFloatCard.tsx`
  - `src/components/town/ExploreMapPin.tsx`
  - `src/components/town/ExploreUnifiedPixiLayer.tsx`
- 小镇：
  - `src/pages/town/HubTownMap.tsx`
  - `src/components/town/HubBuilding.tsx`
  - `src/components/town/HubMicroSceneOverlay.tsx`
  - `src/lib/town-hub-buildings.ts`
  - `src/lib/hub-micro-scenes.ts`
- 记忆/照片/AI：
  - `src/lib/memory-ai.ts`
  - `src/lib/micro-scene-aigc.ts`
  - `src/lib/memory-photo-store.ts`
  - `src/components/town/MicroSceneMemorySheet.tsx`
  - `src/components/town/MicroScenePhotoWall.tsx`
- 通知/深链：
  - `electron/main.cjs`
  - `src/lib/eco-lag-notify.ts`
  - `public/sw.js`
  - `src/lib/pwa-eco-notify.ts`

