import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).pathname,
).href;

const parsers = await import('../src/lib/import-engine/parsers.ts');
const bankPdf = await import('../src/lib/import-engine/bank-pdf.ts');

async function extract(path) {
  const data = readFileSync(path);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    useWasm: false,
    verbosity: 0,
  }).promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: false });
    let t = '';
    for (const item of content.items ?? []) {
      if (item?.str) {
        t += item.str;
        if (item.hasEOL) t += '\n';
      }
    }
    parts.push(t);
  }
  return parts.join('\n');
}

for (const path of process.argv.slice(2)) {
  const name = path.split('/').pop();
  const text = await extract(path);
  console.log('\nFILE:', name);
  console.log('  kind (full text):', parsers.detectFileKind(name, text));
  console.log('  kind (empty text):', parsers.detectFileKind(name, ''));
  console.log('  kind (filename only):', parsers.detectFileKind(name, 'xxx'));
  if (/农行|农业/.test(name)) {
    console.log('  ABC records:', bankPdf.parseAbcPdfText(text, name).length);
  } else {
    console.log('  CMB records:', bankPdf.parseCmbPdfText(text, name).length);
  }
}
