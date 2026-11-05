import { Buffer } from 'buffer';
import iconv from 'iconv-lite';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { isElectron } from '@/lib/persistence';

export interface PdfExtractResult {
  text: string;
  warnings: string[];
}

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

type TextItemLike = {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
};

let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

function pageItemsToLines(items: unknown): string {
  if (!Array.isArray(items)) return '';
  const positioned: { str: string; x: number; y: number }[] = [];
  for (const raw of items) {
    const item = raw as TextItemLike;
    if (!item?.str?.trim()) continue;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    positioned.push({
      str: item.str,
      x: transform[4] ?? 0,
      y: transform[5] ?? 0,
    });
  }
  positioned.sort((a, b) => {
    const dy = Math.round(b.y) - Math.round(a.y);
    if (Math.abs(dy) > 4) return dy;
    return a.x - b.x;
  });

  const lines: string[] = [];
  let currentY = NaN;
  let parts: string[] = [];
  for (const item of positioned) {
    if (Number.isNaN(currentY) || Math.abs(item.y - currentY) > 4) {
      if (parts.length) lines.push(parts.join(' '));
      parts = [item.str];
      currentY = item.y;
    } else {
      parts.push(item.str);
    }
  }
  if (parts.length) lines.push(parts.join(' '));
  return lines.join('\n');
}

function pageItemsToText(items: unknown): string {
  if (!Array.isArray(items)) return '';
  const flatParts: string[] = [];
  for (const raw of items) {
    const item = raw as TextItemLike;
    if (!item?.str) continue;
    flatParts.push(item.str);
    if (item.hasEOL) flatParts.push('\n');
  }
  const flat = flatParts.join('');
  const lined = pageItemsToLines(items);
  return lined.length > flat.replace(/\s/g, '').length * 0.4 ? lined : flat;
}

function decodePdfLiteralString(raw: string): string {
  let s = raw
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f');
  s = s.replace(/\\([0-7]{1,3})/g, (_, oct: string) =>
    String.fromCharCode(parseInt(oct, 8) & 0xff),
  );
  const bytes = Uint8Array.from(s, ch => ch.charCodeAt(0) & 0xff);
  try {
    const gbk = iconv.decode(Buffer.from(bytes), 'gbk');
    if (/[\u4e00-\u9fff]/.test(gbk)) return gbk;
  } catch {
    // fall through
  }
  return s;
}

function decodePdfHexString(hex: string): string {
  const cleaned = hex.replace(/\s/g, '');
  if (cleaned.length < 2) return '';
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  try {
    return iconv.decode(Buffer.from(bytes), 'gbk');
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** Fallback when pdf.js cannot parse the document structure. */
export function extractPdfTextFromRawStreams(data: Uint8Array): string {
  const latin1 = new TextDecoder('latin1').decode(data);
  const chunks: string[] = [];
  const interesting = /[\u4e00-\u9fff\d]|CNY|银行|交易|Date|Amount|支付宝|微信/i;

  for (const m of latin1.matchAll(/\((?:[^\\()]|\\.)*\)/g)) {
    const decoded = decodePdfLiteralString(m[0].slice(1, -1));
    if (decoded.length >= 2 && interesting.test(decoded)) chunks.push(decoded);
  }

  for (const m of latin1.matchAll(/<([0-9A-Fa-f\s]{4,})>/g)) {
    const decoded = decodePdfHexString(m[1]);
    if (decoded.length >= 2 && interesting.test(decoded)) chunks.push(decoded);
  }

  return chunks.join('\n');
}

async function extractWithPdfJs(data: Uint8Array, warnings: string[]): Promise<string> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({
    data: data.slice(),
    disableFontFace: true,
    useSystemFonts: true,
    useWasm: false,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    verbosity: 0,
  }).promise;

  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    try {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = pageItemsToText(content.items);
      if (pageText.trim()) parts.push(pageText);
    } catch (err) {
      warnings.push(
        `第 ${pageNum} 页解析跳过：${err instanceof Error ? err.message : '未知错误'}`,
      );
    }
  }

  return parts.join('\n');
}

async function extractViaElectron(file: File): Promise<PdfExtractResult> {
  const api = window.electronAPI;
  if (!api?.extractPdfText) {
    throw new Error('Electron PDF 提取不可用');
  }
  const buffer = await file.arrayBuffer();
  return api.extractPdfText(buffer);
}

export async function extractPdfText(file: File): Promise<PdfExtractResult> {
  if (isElectron()) {
    try {
      return await extractViaElectron(file);
    } catch {
      // fall through to renderer pdf.js
    }
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const warnings: string[] = [];
  try {
    const text = await extractWithPdfJs(data, warnings);
    if (text.replace(/\s/g, '').length >= 30) {
      return { text, warnings };
    }
    warnings.push('PDF.js 提取文本过短，尝试备用方案');
  } catch (err) {
    warnings.push(
      `PDF.js 解析失败：${err instanceof Error ? err.message : '未知错误'}，尝试备用方案`,
    );
  }

  const fallback = extractPdfTextFromRawStreams(data);
  if (fallback.replace(/\s/g, '').length < 20) {
    throw new Error(
      '无法读取 PDF 文本。请确认文件未加密，且为招行/农行官方导出的流水 PDF',
    );
  }

  return { text: fallback, warnings: [...warnings, '已使用备用文本提取'] };
}
