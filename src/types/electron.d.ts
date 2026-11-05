export interface PdfExtractResult {
  text: string;
  warnings: string[];
}

export interface ExternalBankTransaction {
  id?: string;
  date: string;
  time?: string;
  type: string;
  amount: number;
  balance?: number;
  summary?: string;
  counter?: string;
  channel?: string;
  note?: string;
  source?: string;
  account?: string;
  category?: string;
  importedAt?: string;
  fileName?: string;
}

export interface BankPdfParseResult {
  ok: boolean;
  transactions?: ExternalBankTransaction[];
  error?: string;
  summary?: unknown;
  exitCode?: number;
}

export interface BankParserDiagnostics {
  scriptPath: string;
  outputDir: string;
  historyFiles: number;
  outputFiles: number;
  python: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  readFile: (filename: string) => Promise<string | null>;
  writeFile: (filename: string, content: string) => Promise<boolean>;
  getDataDir: () => Promise<string>;
  showSaveDialog: (options: ElectronSaveDialogOptions) => Promise<ElectronSaveDialogResult>;
  showOpenDialog: (options: ElectronOpenDialogOptions) => Promise<ElectronOpenDialogResult>;
  readFilePath: (filePath: string) => Promise<string | null>;
  writeFilePath: (filePath: string, content: string) => Promise<boolean>;
  extractPdfText: (arrayBuffer: ArrayBuffer) => Promise<PdfExtractResult>;
  parseBankPdf: (payload: { name: string; data: number[] }) => Promise<BankPdfParseResult>;
  clearBankParserHistory: () => Promise<boolean>;
  getBankParserDiagnostics: () => Promise<BankParserDiagnostics>;
  showNotification: (payload: { title: string; body: string; buildingType?: string }) => Promise<boolean>;
  onWeatherSceneNavigate?: (callback: (data: { buildingType: string }) => void) => () => void;
}

export interface ElectronSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface ElectronSaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface ElectronOpenDialogOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface ElectronOpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
