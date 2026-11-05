import { externalRecordsToNormalized, type ExternalBankRecord } from './bank-json-import';
import type { NormalizedRecord } from './types';

export interface PythonParseResult {
  ok: boolean;
  transactions?: ExternalBankRecord[];
  error?: string;
  summary?: unknown;
}

export async function parseBankPdfViaPython(file: File): Promise<NormalizedRecord[] | null> {
  const api = window.electronAPI;
  if (!api?.parseBankPdf) return null;

  const buffer = await file.arrayBuffer();
  const result = await api.parseBankPdf({
    name: file.name,
    data: Array.from(new Uint8Array(buffer)),
  });

  if (!result.ok) {
    throw new Error(result.error || 'Python 解析失败，将尝试内置解析器');
  }
  if (!result.transactions?.length) return null;

  return externalRecordsToNormalized(result.transactions, file.name);
}

export function isPythonParserAvailable(): boolean {
  return Boolean(typeof window !== 'undefined' && window.electronAPI?.parseBankPdf);
}
