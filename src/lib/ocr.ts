import type { OCRSettings } from '@/types';
import { autoCategorize } from '@/lib/csv-import';
import { getToday } from '@/lib/storage';

export interface ParsedReceipt {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  description: string;
  category: string;
  merchant?: string;
  confidence: number;
}

const AMOUNT_PATTERNS = [
  /(?:实付|合计|总计|应付|支付|金额|￥|¥)\s*[：:]?\s*([0-9,]+\.?\d*)/i,
  /([0-9,]+\.\d{2})\s*元/,
  /¥\s*([0-9,]+\.?\d*)/,
];

const DATE_PATTERNS = [
  /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
  /(\d{4})(\d{2})(\d{2})/,
];

export function parseReceiptText(text: string): ParsedReceipt | null {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const combined = lines.join(' ');

  let amount = 0;
  for (const pattern of AMOUNT_PATTERNS) {
    const m = combined.match(pattern);
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ''));
      if (amount > 0) break;
    }
  }
  if (!amount || Number.isNaN(amount)) return null;

  let date = getToday();
  for (const pattern of DATE_PATTERNS) {
    const m = combined.match(pattern);
    if (m) {
      date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      break;
    }
  }

  const merchant = lines.find(l => l.length > 2 && l.length < 40 && !/^\d/.test(l)) ?? '';
  const isRefund = /退款|退回|收入/.test(combined);
  const type: 'income' | 'expense' = isRefund ? 'income' : 'expense';
  const description = merchant || combined.slice(0, 40);
  const category = autoCategorize(`${description} ${combined}`, type);

  return { amount, type, date, description, category, merchant, confidence: 0.6 };
}

async function getBaiduAccessToken(settings: OCRSettings): Promise<string | null> {
  if (!settings.baiduApiKey || !settings.baiduSecretKey) return null;
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(settings.baiduApiKey)}&client_secret=${encodeURIComponent(settings.baiduSecretKey)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function recognizeImageText(imageBase64: string, settings: OCRSettings): Promise<string> {
  if (!settings.provider) throw new Error('请先在设置中配置 OCR 服务商');

  if (settings.provider === 'baidu') {
    const token = await getBaiduAccessToken(settings);
    if (!token) throw new Error('百度 OCR 鉴权失败，请检查 API Key');

    const res = await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `image=${encodeURIComponent(imageBase64.replace(/^data:image\/\w+;base64,/, ''))}`,
    });
    const data = await res.json();
    if (data.error_code) throw new Error(data.error_msg || '百度 OCR 识别失败');
    return (data.words_result ?? []).map((w: { words: string }) => w.words).join('\n');
  }

  throw new Error('当前仅支持百度 OCR，其他服务商即将支持');
}

export async function recognizeReceiptFromImage(
  file: File,
  settings: OCRSettings,
): Promise<ParsedReceipt> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const text = await recognizeImageText(base64, settings);
    const parsed = parseReceiptText(text);
    if (parsed) return { ...parsed, confidence: 0.85 };
    throw new Error('未能从识别结果中提取金额');
  } catch (e) {
    if (e instanceof Error && e.message.includes('Failed to fetch')) {
      throw new Error('OCR 请求失败：浏览器模式下可能受 CORS 限制，请使用桌面版 (npm run app)');
    }
    throw e;
  }
}
