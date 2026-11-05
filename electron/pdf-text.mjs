import { pathToFileURL } from 'url';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let pdfjsPromise = null;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
        join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
      ).href;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

function pageItemsToLines(items) {
  if (!Array.isArray(items)) return '';
  const positioned = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.str !== 'string' || !item.str.trim()) continue;
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
  const lines = [];
  let currentY = NaN;
  let parts = [];
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

function pageItemsToText(items) {
  if (!Array.isArray(items)) return '';
  const parts = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.str !== 'string' || !item.str) continue;
    parts.push(item.str);
    if (item.hasEOL) parts.push('\n');
  }
  const flat = parts.join('');
  const lined = pageItemsToLines(items);
  return lined.length > flat.length * 0.5 ? lined : flat;
}

/** @param {Uint8Array} data */
export async function extractPdfTextFromBytes(data) {
  const warnings = [];
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

  const parts = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    try {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = pageItemsToText(content.items);
      if (pageText.trim()) parts.push(pageText);
    } catch (err) {
      warnings.push(`第 ${pageNum} 页解析跳过：${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  const text = parts.join('\n');
  if (text.replace(/\s/g, '').length < 20) {
    throw new Error('无法读取 PDF 文本，请确认文件未加密');
  }
  return { text, warnings };
}

if (process.argv[1]?.endsWith('pdf-text.mjs')) {
  const path = process.argv[2];
  const data = readFileSync(path);
  extractPdfTextFromBytes(new Uint8Array(data)).then(r => {
    console.log('len', r.text.length, 'warnings', r.warnings.length);
    console.log(r.text.slice(0, 400));
  });
}
