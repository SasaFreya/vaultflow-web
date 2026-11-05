import { readFileSync } from 'fs';
import { Buffer } from 'buffer';
import iconv from 'iconv-lite';

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();
  return pdfjs;
}

function decodePdfLiteralString(raw) {
  let s = raw
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
  s = s.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8) & 0xff));
  const bytes = Uint8Array.from(s, ch => ch.charCodeAt(0) & 0xff);
  try {
    const gbk = iconv.decode(Buffer.from(bytes), 'gbk');
    if (/[\u4e00-\u9fff]/.test(gbk)) return gbk;
  } catch {}
  return s;
}

function extractRaw(data) {
  const latin1 = new TextDecoder('latin1').decode(data);
  const chunks = [];
  for (const m of latin1.matchAll(/\((?:[^\\()]|\\.)*\)/g)) {
    const decoded = decodePdfLiteralString(m[0].slice(1, -1));
    if (decoded.length >= 2) chunks.push(decoded);
  }
  return chunks.join('\n');
}

async function extractPdfJs(data) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({
    data: data.slice(),
    disableFontFace: true,
    useWasm: false,
    useWorkerFetch: false,
    verbosity: 0,
  }).promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent({ includeMarkedContent: false });
      const items = content.items ?? [];
      let t = '';
      for (const item of items) {
        if (item?.str) {
          t += item.str;
          if (item.hasEOL) t += '\n';
        }
      }
      parts.push(t);
    } catch (e) {
      parts.push(`[PAGE ${i} ERROR: ${e.message}]`);
    }
  }
  return parts.join('\n');
}

const files = process.argv.slice(2);
for (const path of files) {
  console.log('\n========', path, '========');
  const data = readFileSync(path);
  console.log('Size:', data.length);
  try {
    const jsText = await extractPdfJs(new Uint8Array(data));
    console.log('PDF.js length:', jsText.length);
    console.log('PDF.js sample:', jsText.slice(0, 800));
    console.log('Has 招商:', jsText.includes('招商'));
    console.log('Has 农业:', jsText.includes('农业'));
  } catch (e) {
    console.log('PDF.js FAILED:', e.message);
  }
  const raw = extractRaw(new Uint8Array(data));
  console.log('Raw length:', raw.length);
  console.log('Raw sample:', raw.slice(0, 800));
  console.log('Raw Has 招商:', raw.includes('招商'));
  console.log('Raw Has 农业:', raw.includes('农业'));
}
