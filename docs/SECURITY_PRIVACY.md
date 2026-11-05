# VaultFlow 安全与隐私说明（工程视角）

> 目的：让团队对“哪些数据在哪儿”“哪些能力会出网/不会出网”“风险点与约束”达成一致。

---

## 1. 数据边界：默认本地优先

VaultFlow 的默认策略是 **Local-first**：

- **资产/交易/回忆**：存于浏览器本地存储（localStorage / IndexedDB）与 Electron 本地目录
- **不默认上传**到任何服务器

工程实现上，团队应持续遵守：
- 不在 v1 引入第三方线上存储/同步（除明确的 WebDAV 同步模块，若存在也需用户配置）
- 不在默认路径写入敏感数据到可被云同步的目录（如 iCloud Drive）——Electron 使用 Documents/VaultFlow（用户可控）

---

## 2. 存储位置与类型

### 2.1 localStorage

用途：
- 设置项（主题、开关、AI key 等）
- 少量缓存（例如微场景 AIGC 壁纸 dataURL 缓存）

风险：
- 容量小（不同浏览器差异大）
- 明文可读（同一用户环境下）

对策：
- 大图不放 localStorage（已迁移到 IndexedDB）
- AI key 不外传、不上报、不日志打印

### 2.2 IndexedDB

用途：
- 回忆照片（大图压缩后存储）

实现：
- `src/lib/memory-photo-store.ts`
  - 写入前 JPEG 压缩（宽度 960，quality 0.82）

风险：
- 仍是明文存储，但位于本地浏览器数据库

对策：
- 提供用户侧“清理数据”入口（建议后续做一键清理）
- 做导出时显式提示照片包含敏感信息

### 2.3 Electron 本地目录

- `electron/main.cjs`：`Documents/VaultFlow`
- 主要用于导入/解析等本地能力（例如 pdf 解析脚本输出目录等）

风险：
- 文件系统层面的数据残留

对策：
- 输出目录明确可见、可删除
- 不把 AI key 写入文件

---

## 3. 出网能力（必须显式）

### 3.1 AI（可选，用户自配）

当前 AI 设置字段：
- `AISettings.dashscopeApiKey`（百炼兼容接口）

调用点：
- 文本/视觉草稿：`src/lib/memory-ai.ts`（DashScope chat/completions）
- 微场景壁纸：`src/lib/micro-scene-aigc.ts`（DashScope 文生图）

约束：
- 没有 Key：直接回退，不报错打断
- 不做后台静默调用：只在用户显式触发（拍照草稿/生成壁纸/AI 回声）
- 不在日志输出 key 或完整 payload（尤其是图片 base64）

### 3.2 天气/提醒

通知机制：
- Electron：系统通知（可带 deep link / event）
- Web：Notification + Service Worker（PWA）

约束：
- 不自动弹权限请求：只在设置页或用户动作中触发
- Notification click 仅用于打开本地页面/微场景，不携带敏感数据

---

## 4. 输入安全：导入与编辑

### 4.1 CSV 导入（健身打卡）

实现：
- `src/lib/import-gym-csv.ts`：解析 CSV 文本

安全约束：
- 行数上限（例如 MAX_ROWS）
- 单行长度限制（防止超长注入/性能问题）
- 只生成“回忆草稿”，不触碰资产核心表

### 4.2 内联编辑回忆

实现：
- `ExploreHeatDrillPanel` 中对回忆文本进行直接更新

风险：
- 误触导致内容覆盖

建议（后续）：
- 提供撤销（Undo）或版本历史

---

## 5. UI 安全/信任：避免“跳出游戏导致误操作”

问题：
- 从小镇建筑直接跳转资产页，用户会有“离开游戏”感，且更容易在高密度表格误操作

现状：
- 小镇建筑默认改为框内场景，完整功能页跳转变成用户主动点击

建议（后续）：
- 对“会改动资产/交易”的按钮，增加二次确认/撤销机制
- 隐私模式（`PrivacyProvider`）在小镇场景默认开启数字遮罩更符合预期

---

## 6. 工程检查清单（PR/发版前）

- [ ] 本次改动只触及 town/RPG/ecosystem 相关文件（不动资产核心）
- [ ] `npm run build` 通过
- [ ] AI key 不出现在日志/报错提示中
- [ ] 通知权限不自动弹窗请求
- [ ] CSV/导入有上限保护（行数、大小、节流）
- [ ] 大图存储走 IndexedDB，不走 localStorage

