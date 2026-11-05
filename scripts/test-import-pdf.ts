import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import pdfWorkerUrl from '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
import { detectFileKind } from '../src/lib/import-engine/parsers';
import { parseAbcPdfText, parseCmbPdfText } from '../src/lib/import-engine/bank-pdf';
import { extractPdfTextFromRawStreams } from '../src/lib/import-engine/pdf-extract';

async function extractPdfJs(path: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(pdfWorkerUrl).href;
  const data = readFileSync(path);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    useWasm: false,
    useWorkerFetch: false,
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

for (const path of process.argv.slice(2)) {
  const name = path.split('/').pop() ?? path;
  const bytes = new Uint8Array(readFileSync(path));
  const jsText = await extractPdfJs(path);
  const rawText = extractPdfTextFromRawStreams(bytes);
  const kindJs = detectFileKind(name, jsText);
  const kindRaw = detectFileKind(name, rawText);

  console.log('\n===', name, '===');
  console.log('kind from pdf.js text:', kindJs);
  console.log('kind from raw fallback:', kindRaw);
  console.log('pdf.js text len:', jsText.length);
  console.log('raw text len:', rawText.length);
  console.log('pdf.js sample:\n', jsText.slice(0, 500));
  console.log('abc rows in js:', (jsText.match(/\d{8}\s+\d{6}\s+\S+\s+[+\-][\d,]+\.\d{2}/g) ?? []).length);
  console.log('cmb rows in js:', (jsText.match(/\d{4}-\d{2}-\d{2}\s+CNY\s+[+\-]?[\d,]+\.\d{2}/g) ?? []).length);

  if (/农行|农业/.test(name)) {
    try {
      console.log('ABC parse count:', parseAbcPdfText(jsText, name).length);
    } catch (e) {
      console.log('ABC parse error:', e instanceof Error ? e.message : e);
    }
  } else {
    try {
      console.log('CMB parse count:', parseCmbPdfText(jsText, name).length);
    } catch (e) {
      console.log('CMB parse error:', e instanceof Error ? e.message : e);
    }
  }

  writeFileSync(`/tmp/vaultflow-${name}.txt`, jsText);
}
