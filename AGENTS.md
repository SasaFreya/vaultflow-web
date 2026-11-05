# VaultFlow 人生小镇 · UI 风格规范

改 Hub / 外出地图 / 人生馆 / 温馨小屋相关 UI 前，先对照本规范。

## 设计原则

1. **一个功能一个入口** — 记账→银行，回忆→人生馆，生态→外出地图，习惯/副本→温馨小屋
2. **同一场景同一透视** — 等轴 45° 俯视，禁止正面证件照式图标贴在斜透视背景上
3. **同一色板** — 使用 `--aobi-*` / `LOFT_PALETTE`，禁止混用商务蓝白报表风与手绘风
4. **信息分层** — 默认氛围层；功能面板点击后再展开，避免单屏平铺所有模块

## 色板（粉白小镇马卡龙）

| 用途 | Token / 色值 |
|------|----------------|
| 描边 | `#5D4037` |
| 次要文字 | `#8D6E63` |
| 奶油底 | `#FFF8F0` |
| 粉色主色 | `#FFB7C5` |
| 粉色深 | `#FF8FAB` |
| 木质 | `#C68642` / `#E8B878` |
| 绿色点缀 | `#81C784` |
| 镜子蓝 | `#B3E5FC` |
| 阴影 | `rgba(93, 64, 55, 0.12)` |

CSS 变量：`--rpg-primary`, `--rpg-surface`, `--rpg-border`, `--rpg-text`, `--aobi-action`

## 字体

- 标题：系统 sans，加粗，`14–18px`
- 标签/提示：`10–11px`，圆角胶囊 `border-radius: 12px`
- 数字：`font-mono` 仅用于金额/统计，不用于叙事正文

## 透视规范

### 温馨小屋（`/town/loft`）

- 背景：手绘房间插画（`/rpg/room-bg.png`），斜 45° 俯视
- 家具：**必须用** `LoftFurnitureArt` SVG（`src/components/rpg/LoftFurnitureArt.tsx`）
- 每件家具底部加椭圆阴影（`loft-furniture-shadow` 或 SVG `ellipse`）
- 角色等级徽章在**角色头像**上，不在家具上

### Hub 小镇地图

- 建筑 pin：有机缩放 + 景深（`DEPTH_META`）
- 近大远小：`scaleBoost` + `depth: far|mid|near|front`
- 生态提示：hover 单行，不超过 2 个数据点

### 外出生态地图

- 生活域 zone + pin，账单/回忆/Geo 分层
- 真实地图层：半透明 OSM，`opacity: 0.35`，只读

## 组件清单

| 场景 | 应用组件 |
|------|----------|
| 人生馆入口 | `/town/loft` — 温馨小屋 + 回忆 Tab |
| 家具 | `LoftFurnitureArt` + `RoomScene` |
| 生态抽屉 | `ExploreDomainDrawer` + `DomainMergedTimeline` |
| 关系图 | `LifeRelationGraph`（域 / 人物 / 标签 三色节点） |
| 同步 | `EcoSyncPanel` + WebDAV 自动同步 |

## 建筑入口（唯一性）

| 建筑 | 路由 | 职责 |
|------|------|------|
| 人生馆 | `/town/loft` | 回忆 + 温馨小屋 + 月目标 streak |
| 前庭 | `/town/loft` | 装饰性，已并入人生馆 |
| 银行 | `/` | 资产/流水 |
| 心愿树 | `/goals` | 目标 |
| 日历塔 | `/calendar` | 现金流 |
| 梦想馆 | `/town/dream` | 平行空间 · 样板间搭建 |
| 外出地图 | `/town/explore` | 五域生态 |
| 杂货铺 | `/settings` | 设置 |

## 禁止事项

- ❌ 顶层 Tab 再做一个「人生 RPG」首页
- ❌ 财富 Boss 与银行重复
- ❌ 家具用 emoji 或 PNG 剪贴画替代手绘 SVG
- ❌ 在小镇/外出页改资产核心表或记账逻辑
- ❌ 四种以上美术风格混贴一屏

## 改 UI 检查清单

- [ ] 色板是否全部来自规范表？
- [ ] 透视是否与背景一致（45° 等轴）？
- [ ] 功能入口是否与上表冲突？
- [ ] 单屏信息是否可折叠/分页？
- [ ] 是否只改了 town/RPG 层，未碰资产核心？
