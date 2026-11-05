import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { detectFileKind } from '../src/lib/import-engine/parsers';
import { parseAbcPdfText, parseCmbPdfText } from '../src/lib/import-engine/bank-pdf';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  `${process.cwd()}/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs`,
).href;

async function extract(path: string): Promise<string> {
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

for (const path of process.argv.slice(2)) {
  const name = path.split('/').pop() ?? path;
  const text = await extract(path);
  console.log('\nFILE:', name);
  console.log('  kind (full text):', detectFileKind(name, text));
  console.log('  kind (empty text):', detectFileKind(name, ''));
  if (/农行|农业/.test(name)) {
    console.log('  ABC records:', parseAbcPdfText(text, name).length);
  } else {
    console.log('  CMB records:', parseCmbPdfText(text, name).length);
  }
}
