# VaultFlow 系统架构

> 版本 `1.0.0-beta.1` · Local-first · Electron + React SPA

---

## 1. 产品概览与关键假设

VaultFlow 是本地优先的个人资产可视化桌面应用。核心假设：

- 用户数据 **不应默认上传** 任何服务器
- 资产计算逻辑与小镇/RPG 体验层 **严格分离**
- AI/OCR 为 **可选增强**，无 Key 时完整可用
- Electron 桌面版为 **主运行形态**；浏览器模式为开发/演示用途

---

## 2. 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 渲染 | React 19 + TypeScript | 函数组件 + Hooks |
| 构建 | Vite 7 | 开发端口固定 `5174` |
| 路由 | react-router-dom 7 | HashRouter（`/#/path`） |
| 样式 | Tailwind 3 + CSS 变量 | `--vault-*` 资产页；`--aobi-*` 小镇页 |
| UI 组件 | Radix UI + shadcn 风格 | `components/ui/` |
| 图表 | Recharts 2 | 仪表盘/趋势 |
| 游戏渲染 | PixiJS 8 | 热力、粒子、runner（统一 Canvas） |
| 桌面壳 | Electron 35 | `electron/main.cjs` + preload |
| 银行 PDF | Python 3 | `scripts/bank_pdf_parser.py`，Electron IPC 调用 |
| 校验 | Zod 4 | `validateAppData` 导入数据校验 |

---

## 3. 系统分层

```
┌─────────────────────────────────────────────────────────┐
│                    表现层 (Pages)                        │
│  Dashboard / Transactions / Accounts / Trends / Town  │
├─────────────────────────────────────────────────────────┤
│                    状态层 (Providers)                    │
│  VaultDataProvider · ThemeProvider · PrivacyProvider    │
│  LifeMemoriesProvider · LifeRPGProvider (小镇/RPG)      │
├─────────────────────────────────────────────────────────┤
│                    业务逻辑 (lib/)                       │
│  storage · persistence · security · import-* · memory-* │
├─────────────────────────────────────────────────────────┤
│                    持久化层                              │
│  localStorage · Electron FS · IndexedDB                 │
├─────────────────────────────────────────────────────────┤
│                    平台层                                │
│  Electron IPC · Service Worker (PWA) · Python 子进程     │
└─────────────────────────────────────────────────────────┘
```

### 3.1 资产核心层（不可被小镇层修改）

- 入口：`src/hooks/useVaultData.tsx` → `VaultDataProvider`
- 数据模型：`src/types/index.ts` → `AppData`
- 计算/sync：`src/lib/storage.ts` → `fullSyncData`, `computeMonthlyData`
- 页面：`Dashboard`, `Transactions`, `Accounts`, `Trends`, `Budget`, `Goals`, `CalendarPage`, `Analysis`, `Settings`

### 3.2 小镇/RPG 体验层（主要迭代区）

- 路由：`/town/*` → `src/pages/town/TownHub.tsx`
- 人生小镇：`HubTownMap` + `HubBuilding` + `HubMicroSceneOverlay`
- 外出地图：`WorldMap` + `ExploreMicroSceneOverlay` + `ExploreEcoFloatCard`
- 回忆：`LifeMemoriesProvider`, `memory-photo-store.ts` (IndexedDB)
- 规范：`AGENTS.md`, `docs/TOWN_SYSTEM.md`

**工程约束**：小镇层只读取资产数据做展示/洞察，不直接修改交易计算逻辑。

---

## 4. 路由结构

| 路径 | 组件 | 职责 |
|------|------|------|
| `/` | Dashboard | 净资产总览 |
| `/transactions` | Transactions | 记账 + 智能导入 |
| `/accounts` | Accounts | 账户 CRUD |
| `/analysis` | Analysis | 分析入口聚合 |
| `/trends` | Trends | 净资产趋势 |
| `/budget` | Budget | 预算管理 |
| `/goals` | Goals | 储蓄目标 |
| `/calendar` | CalendarPage | 现金流日历 |
| `/settings` | Settings | 设置/关于 |
| `/rpg` | LifeRPG | 习惯/任务 |
| `/town` | HubTownMap | 人生小镇 |
| `/town/explore` | WorldMap | 外出生态地图 |
| `/town/loft` | LoftPage | 人生馆/温馨小屋 |
| `/town/memories` | MemoriesPage | 回忆列表 |
| `/town/memories/report` | MemoriesReportPage | 生态报告 |

锁屏门禁：`AppRoutes` 在 `VaultDataProvider.ready` 后检查 `locked` → `LockScreen`。

---

## 5. 数据模型

### 5.1 AppData（资产核心）

```typescript
interface AppData {
  accounts: Account[];           // 账户
  transactions: Transaction[];   // 流水
  budgets: Budget[];             // 预算
  goals: Goal[];                 // 目标
  calendarEvents: CalendarEvent[]; // 日历事件
  assetSnapshots: AssetSnapshot[]; // 净资产快照
  monthlyData: MonthlyBudget[];  // 月度收支（派生）
  forecastEvents?: ForecastEvent[];
  lifeGameSnapshot?: { ... };    // 小镇洞察快照（派生）
}
```

### 5.2 VaultSettings

- 基准货币、汇率、PIN 锁、`netWorthAnchorDate`（趋势反推锚点）
- 可选 `ocr` / `ai` 配置（用户自配 Key）

### 5.3 LifeMemory（小镇层，独立存储）

- 存储于 `LifeMemoriesProvider` 管理的 localStorage key
- 照片大图：`memory-photo-store.ts` → IndexedDB（JPEG 压缩，宽 960）

---

## 6. 持久化架构

### 6.1 存储位置

| 环境 | 资产数据 | 设置 | 照片 |
|------|----------|------|------|
| **Electron** | `~/Documents/VaultFlow/data.json` | 同目录或 localStorage 镜像 | IndexedDB |
| **浏览器** | `localStorage:vaultflow_data` | `localStorage:vaultflow_settings` | IndexedDB |

实现：`src/lib/persistence.ts`

加载优先级（Electron）：
1. 读 `data.json`
2. 回退 localStorage 并迁移到文件
3. 空数据初始化

保存：双写 localStorage + Electron `vault:writeFile`（若可用）

### 6.2 数据同步流水线

```
用户操作 → updateData(updater)
         → fullSyncData(data, settings)
              ├── 重算 budgets.spent
              ├── computeMonthlyData(transactions)
              ├── 更新 assetSnapshots
              └── 生成 lifeGameSnapshot
         → savePersistedData(data)
```

核心函数：`src/lib/storage.ts` → `fullSyncData`

### 6.3 交易 ↔ 账户余额一致性

- 新增交易：`applyTransactionToAccount`
- 删除交易：`reverseTransactionOnAccount`
- 负债账户：`normalizeDebtBalance` 强制负值

---

## 7. 信任边界与权限

### 7.1 认证/授权模型

VaultFlow **无用户账号体系**。安全边界为：

| 机制 | 实现 | 范围 |
|------|------|------|
| PIN 锁屏 | `hashPin` / `verifyPin`（`src/lib/security.ts`） | 本地会话 |
| 隐私遮罩 | `PrivacyProvider` + `MaskedCurrency` | UI 展示 |
| 文件访问 | Electron 仅读写 `Documents/VaultFlow/` | 沙箱目录 |

无角色/多用户权限矩阵。所有本机用户共享同一数据文件（操作系统级隔离）。

### 7.2 出网能力（需用户显式配置）

| 能力 | 触发条件 | 端点 | 数据出境 |
|------|----------|------|----------|
| AI 回忆草稿 | 用户点击 + 已配 `dashscopeApiKey` | DashScope API | 回忆文本/图片 |
| AIGC 壁纸 | 用户点击生成 | DashScope 文生图 | 提示词 |
| OCR（预留） | 用户配置 baidu/tencent/aliyun Key | 各 OCR API | 图片 |
| OSM 地图瓦片 | 外出地图加载 | OpenStreetMap CDN | 地图坐标（只读） |

**无 Key 时**：相关功能 UI 提示降级，主流程不阻断。

详见：`docs/SECURITY_PRIVACY.md`

---

## 8. 关键数据流

### 8.1 智能导入流

```
用户选文件 → Transactions 页
  → 格式检测 (wechat/alipay/cmb/pdf)
  → [PDF] Electron IPC → spawn Python bank_pdf_parser.py
  → 解析为 Transaction[] 预览
  → 用户确认 → addTransactions (bulk)
  → fullSyncData → 重算趋势/快照
```

相关文件：
- `src/lib/import-wechat.ts`, `import-alipay.ts`, `import-bank-pdf.ts`
- `electron/main.cjs` → `vault:parseBankPdf`
- `scripts/bank_pdf_parser.py`

### 8.2 净资产趋势反推

```
用户设置 netWorthAnchorDate + 当前账户余额（锚点）
  → 从锚点日起的交易累计
  → 向前/向后生成 assetSnapshots[]
  → Trends 页渲染曲线
```

### 8.3 小镇微场景交互流

```
WorldMap: 点击 Pin
  → openMicroScene(buildingType, anchor)
  → ExploreMicroSceneOverlay（Portal 框内场景）
  → 用户写回忆 / 拍照 / 查看生态
  → 可选：生态数据按钮 → ExploreEcoFloatCard
  → 时间轴点击 → highlightedPinId + 重新开微场景
```

### 8.4 通知深链

| 平台 | 路径 |
|------|------|
| Electron | `Notification.click` → IPC → renderer `openMicroScene` |
| PWA | `sw.js` postMessage `vaultflow-weather-scene` → WorldMap 监听 |

---

## 9. Electron 架构

```
electron/main.cjs
  ├── BrowserWindow (load Vite dev / dist)
  ├── IPC handlers
  │     ├── vault:getDataDir / readFile / writeFile
  │     ├── vault:parseBankPdf (Python spawn)
  │     ├── dialog:open / save
  │     └── notification + deep link
  └── preload → window.electronAPI

数据目录：~/Documents/VaultFlow/
  ├── data.json          # 主数据
  └── bank-parser-output/ # PDF 解析临时输出
```

开发启动：`npm run app` → Vite `:5174` + Electron

打包：`npm run app:build` → `release/VaultFlow-x.x.x.dmg|exe`

---

## 10. 前端状态管理

不使用 Redux/Zustand。采用 React Context：

| Provider | 文件 | 职责 |
|----------|------|------|
| VaultDataProvider | `hooks/useVaultData.tsx` | 资产数据单一数据源 |
| ThemeProvider | `hooks/useTheme.tsx` | 亮/暗主题 |
| PrivacyProvider | `hooks/usePrivacyMode.tsx` | 金额遮罩 |
| LifeMemoriesProvider | `hooks/useLifeMemories.tsx` | 回忆 CRUD |
| LifeRPGProvider | `hooks/useLifeRPG.tsx` | 任务/习惯 |

**关键修复**（已完成）：全应用共享单一 `VaultDataProvider`，避免各页面独立 state 不同步。

---

## 11. 构建与部署

```bash
npm run dev          # Web 开发 :5174
npm run app          # Electron 开发
npm run build        # tsc + vite build → dist/
npm run app:build:mac  # dmg + zip → release/
npm run app:build:win  # nsis + zip（需 Windows）
npm run tool         # 静态 serve dist（浏览器模式）
```

产物：
- `dist/` — SPA 静态资源
- `release/` — Electron 安装包

---

## 12. 已知风险与假设

| 风险 | 影响 | 缓解 |
|------|------|------|
| localStorage 容量限制（浏览器模式） | 大数据集失败 | 主推 Electron 文件存储 |
| 银行 PDF 版式多样 | 解析失败 | 多银行适配 + 手动记账回退 |
| 未代码签名 | 安装摩擦 | BETA.md 安装指引 |
| 无云同步 | 换机丢数据 | 文档强调备份 `Documents/VaultFlow/` |
| AI Key 明文存 localStorage | 本机可读 | 文档告知风险；不上传 |
| 小镇层误改资产逻辑 | 数据损坏 | 工程规范 + PR 检查清单 |

---

## 13. Related Documents

| 文档 | 路径 |
|------|------|
| 安全与隐私 | `docs/SECURITY_PRIVACY.md` |
| 小镇系统 | `docs/TOWN_SYSTEM.md` |
| 交接 / Runbook | `docs/HANDOFF.md`, `docs/RUNBOOK.md` |
| UI 规范 | `AGENTS.md` |
| PRD | `docs/PRD-vaultflow.md` |
| 一页摘要 | `docs/PROJECT-SUMMARY.md` |
| GTM | `docs/GTM-PLAN.md` |
| 内测 | `BETA.md` |
