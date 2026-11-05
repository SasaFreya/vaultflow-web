# VaultFlow A/B 实验分析报告

> 分析日期：2026-07-09 · 依据：`documentation/architecture.md` + PRD 假设 A1–A5 · 状态：**设计阶段（尚无真实实验数据）**

---

## 执行结论

| 项目 | 结论 |
|------|------|
| **当前能否做统计决策？** | ❌ 不能 — App 无实验埋点/分流基础设施，内测样本量远低于统计功效要求 |
| **架构最大待验证假设** | **A3**：人生小镇/RPG 层提升留存，而非干扰记账 |
| **推荐动作** | **Extend + Design** — 先建本地实验框架，再跑 EXP-01，目标每组 ≥ 270 人 |
| **Guardrail** | 导入成功率、首次记账完成时间、崩溃率不得恶化 |

---

## 0. 数据可用性审计（基于架构）

从 `documentation/architecture.md` 与代码扫描结论：

| 检查项 | 现状 | 影响 |
|--------|------|------|
| 远程 Analytics | ❌ 无（Local-first 设计） | 无法自动采集 A/B 指标 |
| 实验分流 | ❌ 无 feature flag 系统 | 无法随机分配对照/实验组 |
| 本地埋点 | ❌ 无 `trackEvent` 类实现 | 即使分流也无法算转化率 |
| 技术开关 | ⚠️ 部分存在 | `vaultflow_explore_pixi_*` 仅 localStorage 手动切换，无指标 |
| 内测反馈 | ✅ 邮件 + 问卷（计划） | 仅能做定性，不能做 rigor A/B |

**结论**：本次分析为 **实验预注册（Pre-registration）+ 统计功效规划**，非对已跑完实验的结果判定。待内测收集结构化数据后，用本文 §6 模板填入真实数字即可复算。

---

## 1. 从架构衍生的实验矩阵

PRD 假设 → 可测实验：

| 假设 | 实验 ID | 对照组 (Control) | 实验组 (Variant) | 主指标 | Guardrail |
|------|---------|------------------|------------------|--------|-----------|
| **A3** 游戏化提升留存 | **EXP-01** | 首次打开 → Dashboard 空状态 | 首次打开 → `/town` 小镇引导 | 7 日内完成「账户+导入」激活率 | 导入失败率、卸载率 |
| **A2** 导入路径优化 | **EXP-02** | 空状态 CTA → `/accounts` | 空状态 CTA → `/transactions` 智能导入 | 首次导入成功率 | 手动记账率（是否被替代） |
| 小镇不跳出游戏 | **EXP-03** | Hub 建筑直跳功能页（旧行为） | 框内微场景 + 可选「打开完整页」 | 小镇页次日回访率 | 资产页任务完成率 |
| Pixi 性能/体验 | **EXP-04** | SVG 热力层 | Pixi 统一 Canvas | 外出地图停留 ≥30s 占比 | FPS < 30 占比、内存峰值 |
| **A1** 安装摩擦 | EXP-05 | 纯文字安装指引 | 图文 PDF 安装指引 | 安装→首次打开转化率 | — |
| **A4** 云同步需求 | EXP-06 | 设置页无云同步说明 | 显式「本地备份」引导 | 7 日留存 | 云同步相关负反馈率 |

**优先级**：EXP-01 > EXP-02 > EXP-03 > EXP-04（与架构分层风险一致：先验证小镇层价值，再优化技术渲染）。

---

## 2. 重点实验：EXP-01 详设

### 2.1 实验定义

```
## A/B Test: EXP-01 小镇优先引导 vs 银行仪表盘优先

**Hypothesis**: 首次进入人生小镇（而非传统仪表盘空状态）的用户，
               7 日内完成「添加账户 + 成功导入首份账单」的比例更高，
               因为游戏化入口降低了「记账=枯燥」的心理门槛。

**Duration**: 14 天（覆盖 2 个完整周，洗涤首周新奇效应）
**Traffic split**: 50% / 50%
**Randomization unit**: 新安装用户（按安装日 hash 分流，本地 settings 写入 cohort）
```

### 2.2 变体说明

| 组 | 首次路由 | UI 差异 |
|----|----------|---------|
| **Control** | `/` → `WelcomeEmptyState` | 钱包图标 +「添加第一个账户」 |
| **Variant** | `/town` → `HubTownMap` | 小镇全景 + 银行建筑高亮 + 引导气泡「先逛逛人生小镇」 |

**不变量**（Guardrail 约束）：
- 资产核心逻辑、`VaultDataProvider`、导入引擎 — 两版本完全相同
- 数据仍仅存本地，实验标记不写盘到可识别文件外

### 2.3 指标定义

| 类型 | 指标 | 计算方式 |
|------|------|----------|
| **Primary** | 7 日激活率 | 安装后 7 天内：`accounts.length ≥ 1` 且 `transactions.length ≥ 1`（含导入） |
| Guardrail 1 | 导入成功率 | 尝试导入用户中，首次解析成功占比 |
| Guardrail 2 | 崩溃率 | 启动/导入/保存异常退出次数 / 会话数 |
| Guardrail 3 | 首笔记账耗时 | 安装 → 第一笔 `transaction.createdAt` 的中位分钟数 |
| 探索性 | 小镇访问占比 | 7 日内访问 `/town/*` 会话 / 总会话 |

---

## 3. 实验设置验证（Setup Validation）

### 3.1 样本量（Power Analysis）

公式：\( n = \frac{(Z_{\alpha/2}\sqrt{2\bar{p}(1-\bar{p})} + Z_{\beta}\sqrt{p_1(1-p_1)+p_2(1-p_2)})^2}{(p_2-p_1)^2} \)

参数：α = 0.05（双尾），power = 80%

| 实验 | 对照基准 | 实验目标 | MDE | **每组样本** | **总样本** |
|------|----------|----------|-----|-------------|-----------|
| EXP-01 | 40% | 52% | +12pp | **270** | **540** |
| EXP-02 | 35% | 47% | +12pp | **263** | **526** |
| EXP-03 | 25% | 33% | +8pp | **504** | **1,008** |
| EXP-04 | 60% | 72% | +12pp | **244** | **488** |

### 3.2 当前内测规模 vs 功效

| 场景 | 每组 n | 模拟结果（对照 40% vs 实验 53%） | 判定 |
|------|--------|----------------------------------|------|
| **当前内测** ~15人/组 | 15 | Lift +32.5%，**p = 0.475**，95% CI [-22.7pp, +48.7pp] | ❌ 功效不足，无法下结论 |
| **目标规模** 200人/组 | 200 | Lift +37.5%，**p = 0.003**，显著 | ✅ 可决策 |
| **正式功效点** 270人/组 | 270 | — | ✅ PRD Beta 目标需扩至 540+ 新用户 |

### 3.3 其他 Setup 检查

| 检查项 | EXP-01 状态 | 说明 |
|--------|-------------|------|
| 运行 ≥ 1–2 业务周期 | ⏳ 待启动 | 建议 14 天 |
| 随机化 / SRM | ⏳ 待实现 | 示例：期望 50/50 实得 142/98 → χ²=8.07，**p<0.01，存在 SRM，结果作废** |
| 新奇效应洗涤 | ⏳ | 第 1 周数据单独看，第 2 周为主 |
| 对照/实验代码隔离 | ⚠️ | 需 `experimentCohort` in `VaultSettings`，目前不存在 |

---

## 4. A/B Test Results（待填 — 当前无真实数据）

> 以下为 **结构模板**。内测结束后将 CSV 放入 `docs/experiments/exp-01.csv` 并复算。

```
## A/B Test Results: EXP-01 小镇优先引导

**Hypothesis**: 小镇优先引导提升 7 日激活率
**Duration**: [X days] | **Sample**: [N control / M variant]

| Metric | Control | Variant | Lift | p-value | Significant? |
|--------|---------|---------|------|---------|--------------|
| 7日激活率 (Primary) | —% | —% | —% | — | — |
| 导入成功率 (Guardrail) | —% | —% | —% | — | — |
| 崩溃率 (Guardrail) | —% | —% | —% | — | — |

**Recommendation**: [Ship / Extend / Stop / Investigate]
**Reasoning**: [待填]
**Next steps**: [待填]
```

### 4.1 决策矩阵（预注册）

| 结果模式 | 推荐 |
|----------|------|
| 主指标显著正向 + Guardrail 无恶化 | **Ship** — 默认新用户进小镇 |
| 主指标显著正向 + 导入成功率下降 | **Investigate** — 小镇是否分散了导入注意力 |
| 不显著但正向趋势 | **Extend** — 扩至 540 总样本 |
| 不显著且持平 | **Stop** — 保持 Dashboard 优先，小镇作可选入口 |
| 主指标显著负向 | **Don't ship** — 回滚，分析是否「游戏感」阻碍任务完成 |

---

## 5. EXP-04 技术实验备注（代码已有开关）

架构中外出地图存在 Pixi vs SVG 的 **技术 A/B 试点**（非产品指标实验）：

| localStorage Key | 文件 | 作用 |
|------------------|------|------|
| `vaultflow_explore_pixi_heatmap` | `ExploreHeatmapPixi.tsx` | Pixi 热力 vs SVG |
| `vaultflow_explore_pixi_unified` | `ExploreUnifiedPixiLayer.tsx` | 统一 Canvas |
| `vaultflow_explore_pixi_fps_hud` | `ExploreRouteRunnersPixi.tsx` | FPS HUD |

**问题**：仅有开关，无停留时长/FPS 采集 → **不能构成统计 A/B**。

**建议 Guardrail for EXP-04**：
- 主指标：外出地图单次停留 ≥ 30s 的会话占比
- Guardrail：帧率 < 30fps 的时间占比、WebGL 初始化失败率

---

## 6. 实施路线图：从架构到可分析

### Phase A — 本地实验基础设施（1 周）

```typescript
// 建议新增 src/lib/experiments.ts
interface ExperimentConfig {
  cohort: 'control' | 'variant';
  experiments: Record<string, 'control' | 'variant'>;
}

// VaultSettings 扩展
experimentCohort?: string;  // hash(installId) % 2
onboardingVariant?: 'dashboard' | 'town';
```

- 安装时生成 `installId`（UUID，仅存本地）
- 分流写入 `VaultSettings`，**不上传**
- 事件日志写 `~/Documents/VaultFlow/events.jsonl`（用户可删）

### Phase B — 内测问卷补齐（与 A/B 并行）

在样本不足时，用 **顺序蒙特卡利克测试** 不现实；改用语义缩放问卷：

| 问题 | 量表 | 对应假设 |
|------|------|----------|
| 「小镇让记账更有趣」 | 1–5 Likert | A3 |
| 「我愿意推荐给朋友」 | NPS | GTM |
| 「导入是否一次成功」 | Y/N | A2 |

### Phase C — 公开 Beta 跑 EXP-01（4–6 周）

- 目标：540 新用户，50/50 分流
- 第 7 天 interim read（不提前停，除非 Guardrail 崩溃率 > 5%）
- 第 14 天终局分析 → 更新 PRD A3 假设状态

---

## 7. 分析脚本

内测 CSV 格式（`user_id, cohort, activated_7d, import_success, crashed`）准备好后运行：

```bash
python3 scripts/ab_analyze.py docs/experiments/exp-01.csv
```

脚本逻辑：双样本比例 z 检验 + 95% CI + SRM χ² 检验（见本次分析用的 stdlib 实现）。

---

## 8. 总结建议

| # | 建议 | 优先级 |
|---|------|--------|
| 1 | **不要**在 30 人内测规模上对「小镇 vs 仪表盘」做统计结论 | P0 |
| 2 | 实现本地 `experimentCohort` + `events.jsonl` 埋点 | P0 |
| 3 | 公开 Beta 首选 **EXP-01** 验证架构假设 A3 | P0 |
| 4 | EXP-02 与 EXP-01 **串行**跑，避免交互污染 | P1 |
| 5 | Pixi 技术开关补 FPS/停留埋点后再跑 EXP-04 | P2 |

**Recommendation（当前）**: **Extend the test — 需要更多数据 + 先建实验基础设施**

**Reasoning**: VaultFlow 架构明确将「资产核心」与「小镇体验层」分离，PRD 假设 A3（游戏化提升留存）是产品差异化的核心赌注，但目前既无分流系统也无足够样本。在 15 人/组规模下，即使真实 lift 达 +32.5%，p 值仍高达 0.475，犯第二类错误（漏掉真效应）与第一类错误（假阳性）风险均不可接受。

**Next steps**:
1. 合并 `experimentCohort` 到 `VaultSettings`（约 50 行代码）
2. 内测问卷先收集 A3 定性信号
3. 公开 Beta 扩至 540+ 新用户后复用本文 §4 模板填数
4. 若 EXP-01 Variant 胜且 Guardrail 通过 → 更新 `App.tsx` 默认路由为 `/town`

---

## Related Documents

- 架构：`documentation/architecture.md`
- PRD 假设：`docs/PRD-vaultflow.md` §7.4
- GTM KPI：`docs/GTM-PLAN.md` §6
- 内测流程：`BETA.md`
