import type { LifeGameEvent, LifeGameSnapshot, NormalizedRecord, SpendingInsight } from './types';
import { getToday } from '@/lib/storage';

const SMART_CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: '交通通勤', keywords: ['地铁', '公交', '羊城通', '深圳通', '高德', '滴滴', '打车', '单车', '骑行', '货拉拉', '12306', '铁路', '机票', '航旅'] },
  { category: '餐饮美食', keywords: ['美团', '饿了么', '麦当劳', '肯德基', '奶茶', '咖啡', '餐厅', '饭', '粉', '面', '串', '烧烤', '火锅', '寿司', '盒马', '拉扎斯', '三快', '外卖'] },
  { category: '电商购物', keywords: ['京东', '淘宝', '拼多多', '小红书', '抖音', '电商', '天猫', '苏宁', '唯品会', '得物', '闲鱼'] },
  { category: '医疗健康', keywords: ['医院', '体检', '挂号', '药', '诊所', '口腔', '皮肤', '医美', '疫苗'] },
  { category: '教育学习', keywords: ['教育', '课程', '学费', '考试', '培训', '考研', 'CATTI', '翻译', '高斋', '有道', '墨墨', '单词', '超级考研'] },
  { category: '文化娱乐', keywords: ['App Store', 'Apple Music', '会员', '视频', '音乐', '游戏', 'Steam', 'B站', '爱奇艺', '腾讯'] },
  { category: '通讯数码', keywords: ['手机充值', '话费', '流量', '宽带', '电信', '移动', '联通', '数码', '电脑', '手机'] },
  { category: '投资理财', keywords: ['基金', '理财', '投资', '证券', '蚂蚁', '余额宝', '零钱通', '定投', '股票', '黄金'] },
  { category: '转账往来', keywords: ['转账', '红包', '收款', '还款', '借贷', '信用卡', '花呗', '白条'] },
  { category: '工资收入', keywords: ['工资', '代发', '奖金', '补贴', '报销', '劳务'] },
  { category: '生活缴费', keywords: ['水费', '电费', '燃气', '物业', '房租', '停车', '加油', '洗车'] },
  { category: '运动健身', keywords: ['健身', '瑜伽', '游泳', '羽毛球', '篮球', '足球', '私教', '运动'] },
];

/** 与参考 import-engine.js SmartClassifier 对齐的 12 类分类 */
export function smartClassify(record: Pick<NormalizedRecord, 'type' | 'counterparty' | 'product' | 'direction'>): string {
  const text = `${record.type} ${record.counterparty} ${record.product}`.toLowerCase();
  for (const rule of SMART_CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }
  if (record.direction === 'income') {
    if (record.type.includes('工资') || record.type.includes('代发')) return '工资收入';
    if (record.type.includes('转账') || record.type.includes('红包')) return '转账往来';
    return '其他收入';
  }
  return '其他支出';
}

const TAG_RULES: [RegExp, SpendingInsight['tag']][] = [
  [/地铁|公交|通勤|深圳通|羊城通|早高峰/, '通勤'],
  [/打车|滴滴|出租|高铁|火车|机票|货拉拉|交通|高德/, '交通'],
  [/房租|水电|物业|燃气|宽带|网费|住房|租金|生活缴费/, '住房'],
  [/红包|人情|礼金|聚餐|社交|朋友|转账/, '社交'],
  [/娱乐|游戏|电影|KTV|旅游|酒店|休闲|文化娱乐/, '娱乐'],
  [/餐饮|外卖|美食|咖啡|奶茶|食堂|饭|美团|麦当劳/, '餐饮'],
];

export function classifySpendingTag(text: string): SpendingInsight['tag'] {
  for (const [pattern, tag] of TAG_RULES) {
    if (pattern.test(text)) return tag;
  }
  return '其他';
}

export function buildSpendingInsights(records: NormalizedRecord[]): SpendingInsight[] {
  const expenses = records.filter(r => r.direction === 'expense');
  const total = expenses.reduce((s, r) => s + r.amount, 0) || 1;
  const buckets = new Map<SpendingInsight['tag'], { amount: number; count: number }>();

  expenses.forEach(r => {
    const text = `${r.counterparty} ${r.product} ${r.type} ${r.note}`;
    const tag = classifySpendingTag(text);
    const prev = buckets.get(tag) ?? { amount: 0, count: 0 };
    buckets.set(tag, { amount: prev.amount + r.amount, count: prev.count + 1 });
  });

  return [...buckets.entries()]
    .map(([tag, v]) => ({
      tag,
      amount: v.amount,
      count: v.count,
      share: v.amount / total,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildLifeGameSnapshot(records: NormalizedRecord[]): LifeGameSnapshot {
  const monthlyNet: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};
  const tagTotals: Record<string, number> = {};
  const events: LifeGameEvent[] = [];

  records.forEach(r => {
    const month = r.time.slice(0, 7);
    const delta = r.direction === 'income' ? r.amount : -r.amount;
    monthlyNet[month] = (monthlyNet[month] ?? 0) + delta;

    const text = `${r.counterparty} ${r.product} ${r.type}`;
    const category = smartClassify(r);
    categoryTotals[category] = (categoryTotals[category] ?? 0) + r.amount;

    const tag = classifySpendingTag(text);
    if (r.direction === 'expense') tagTotals[tag] = (tagTotals[tag] ?? 0) + r.amount;

    events.push({
      id: `${r.source}-${r.id}`,
      date: r.time,
      type: r.direction,
      amount: r.amount,
      category,
      tag,
      description: r.counterparty || r.product || r.type,
      mood: tag === '娱乐' || tag === '社交' ? 'happy' : tag === '住房' || r.amount > 500 ? 'stress' : 'neutral',
    });
  });

  return {
    generatedAt: getToday(),
    totalEvents: events.length,
    monthlyNet,
    categoryTotals,
    tagTotals,
    events: events.slice(0, 500),
  };
}
