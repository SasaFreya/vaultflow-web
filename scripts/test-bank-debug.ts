import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import { parseAbcPdfText, parseCmbPdfText } from '../src/lib/import-engine/bank-pdf';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  `${process.cwd()}/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs`,
).href;

async function extractPdfJs(path: string): Promise<string> {
  const data = readFileSync(path);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    useWasm: false,
    verbosity: 0,
  }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: false });
    let t = '';
    for (const item of content.items ?? []) {
      if (item && typeof item === 'object' && 'str' in item && typeof (item as { str: string }).str === 'string') {
        t += (item as { str: string }).str;
        if ('hasEOL' in item && (item as { hasEOL?: boolean }).hasEOL) t += '\n';
      }
    }
    parts.push(t);
  }
  return parts.join('\n');
}

mkdirSync('scripts/fixtures', { recursive: true });

const CMB_SKIP =
  /记账日期|Transaction Statement|Date|Transaction Amount|Currency|Balance|Summary|Counterparty|温馨提示|申请时间|招商银行|Transaction Statement of|^\d+\s*\/\s*\d+$|Page \d+/i;

for (const path of process.argv.slice(2)) {
  const name = path.split('/').pop() ?? path;
  const jsText = await extractPdfJs(path);

  console.log('\n===', name, '===');
  console.log('pdf.js len:', jsText.length);

  if (/农行|农业/.test(name)) {
    console.log('ABC from pdf.js:', parseAbcPdfText(jsText, name).length);
    writeFileSync('scripts/fixtures/abc-pdfjs.txt', jsText);
  } else {
    const segs = jsText.split(/(?=\d{4}-\d{2}-\d{2})/).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 8);
    let skipExamples: string[] = [];
    for (const line of segs) {
      if (CMB_SKIP.test(line) && line.includes('CNY') && skipExamples.length < 3) {
        skipExamples.push(line.slice(0, 100));
      }
    }
    console.log('CMB skipped CNY examples:', skipExamples);
    console.log('CMB from pdf.js:', parseCmbPdfText(jsText, name).length);
    writeFileSync('scripts/fixtures/cmb-pdfjs.txt', jsText);
  }
}
