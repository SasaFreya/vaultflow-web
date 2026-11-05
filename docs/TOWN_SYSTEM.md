# 人生小镇 / 外出地图 / 微场景（Town System）说明

> 目的：让队友能快速理解“游戏层”是如何挂载在资产系统之上的，并知道要改哪里才不会破坏资产核心。

---

## 1. 分层结构（强约束）

### 资产核心（不要动）

负责：
- 账户、交易、净资产、图表等

路由示例：
- `/` Dashboard
- `/transactions`、`/accounts`、`/analysis`、`/trends` 等

入口：
- `src/App.tsx`

### 小镇 / RPG 层（主要迭代区域）

负责：
- 人生小镇（Hub）：建筑、等级、提示、轻剧情
- 外出地图（Explore）：五域生态、路线、热力、runner
- 微场景（Micro Scenes）：框内交互、写回忆、拍照、AI、生态浮层

入口：
- `src/pages/town/TownHub.tsx`（挂载 `/town/*`）

---

## 2. 路由与页面

- `/town` → `HubTownMap`：人生小镇地图
- `/town/explore` → `WorldMap`：外出生态地图
- `/town/loft` → `LoftPage`：人生馆/小屋（更“内页”）
- `/town/memories` → `MemoriesPage`：回忆页
- `/town/memories/report` → `MemoriesReportPage`：生态报告

> 小镇与外出地图使用 HashRouter，URL 需带 `/#/`。

---

## 3. 关键状态（WorldMap）

`src/pages/town/WorldMap.tsx` 内部主要 UI 状态：

- `sceneBuilding: BuildingType | null`
  - 不为空时：渲染 `ExploreMicroSceneOverlay`（框式微场景）
- `drawerBuilding: BuildingType | null`
  - 不为空且 `sceneBuilding == null`：渲染 `ExploreEcoFloatCard`（居中生态浮层）
- `sceneAnchor: {x,y} | null`
  - 用于设置 transformOrigin 与地图 zoom 的 origin
- `highlightedPinId: string | null`
  - 用于生态浮层点击条目后的 Pin 高亮

交互原则：
- **Pin 点击**只开微场景，不开生态浮层/侧栏
- “生态数据”需要用户在微场景里点击按钮

---

## 4. 微场景（ExploreMicroSceneOverlay）

文件：
- `src/components/town/ExploreMicroSceneOverlay.tsx`

包含能力：
- 框内插画层 + 可选 AIGC 壁纸
- 框内天气粒子（雨/雪）
- `MicroSceneStage`：前/中/地板三层视差；hotspot 点击；角色走向交互
- 写回忆：`MicroSceneMemorySheet`（不跳出地图）
- 照片墙：`MicroScenePhotoWall`（IndexedDB 缩略图）
- 健身导入：仅在 `gym` 显示「导入打卡」CSV
- 音效：`startMicroSceneAmbient('explore', buildingType, enabled)`

---

## 5. 生态浮层（ExploreEcoFloatCard）

文件：
- `src/components/town/ExploreEcoFloatCard.tsx`

与旧侧栏的区别：
- 新版是居中 panel（更符合“框内化”）
- 时间轴条目可点击 → 返回地图高亮对应 Pin 并打开该域微场景

时间轴渲染：
- `src/components/town/DomainMergedTimeline.tsx`

---

## 6. 小镇建筑框内场景（HubMicroSceneOverlay）

文件：
- `src/components/town/HubMicroSceneOverlay.tsx`
- `src/lib/hub-micro-scenes.ts`
- `src/components/town/HubBuilding.tsx`（点击逻辑）
- `src/pages/town/HubTownMap.tsx`（管理 overlay state）

目标：
- 点击银行/心愿树/日历塔/杂货铺/人生馆等：先进入框内场景（不跳出游戏）
- 框内提供“打开完整页面”的可选按钮（用户主动选择跳转）

例：
- 银行场景显示“净资产（本地只读）”摘要，并提示“数据仅存于本机”

---

## 7. 通知深链（Electron + PWA）

- Electron：`electron/main.cjs` + preload/renderer 事件桥
- PWA：`public/sw.js` 发 message → `WorldMap.tsx` 监听 `navigator.serviceWorker.message`

行为：
- 点击通知 → 聚焦窗口 → 打开对应 buildingType 微场景

---

## 8. 设计规范（快速提醒）

涉及小镇/RPG UI 改动时：
- 颜色/圆角/文字：优先用 `--aobi-*` / RPG tokens，禁用纯黑与直角
- 单屏信息密度：避免“网页侧栏/后台系统感”
- 入口唯一性：功能要挂到建筑/家具，不要做孤立列表页

