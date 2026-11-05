import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X, FileText, Braces, Bot } from 'lucide-react';
import type { Account, Transaction } from '@/types';
import {
  runImportEngine,
  runBankJsonImport,
  IMPORT_STEPS,
  type ImportEngineResult,
  type DuplicatePair,
} from '@/lib/import-engine';
import { isPythonParserAvailable } from '@/lib/import-engine/pdf-python';
import { isElectron } from '@/lib/persistence';
import { formatCurrency } from '@/lib/storage';

interface ImportWizardProps {
  accounts: Account[];
  existing: Transaction[];
  onConfirm: (items: Omit<Transaction, 'id' | 'createdAt'>[], gameSnapshot: ImportEngineResult['gameSnapshot']) => void;
}

type ImportMode = 'files' | 'json' | 'ai';

const ACCEPT = '.xlsx,.xls,.csv,.pdf';
const JSON_ACCEPT = '.json';

function fileKey(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export function ImportWizard({ accounts, existing, onConfirm }: ImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>('files');
  const [isDragging, setIsDragging] = useState(false);
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [jsonFileName, setJsonFileName] = useState('');
  const [aiJsonText, setAiJsonText] = useState('');
  const [parserDiag, setParserDiag] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<ImportEngineResult | null>(null);
  const [showDupDetails, setShowDupDetails] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isElectron() || !window.electronAPI?.getBankParserDiagnostics) return;
    void window.electronAPI.getBankParserDiagnostics().then(d => {
      setParserDiag(`Python 解析器 · 历史 ${d.historyFiles} · 输出 ${d.outputFiles} · ${d.python}`);
    }).catch(() => {
      setParserDiag('Python 解析器未就绪（需 pip install pdfplumber）');
    });
  }, []);

  const applyResult = useCallback((res: ImportEngineResult) => {
    setProgress(100);
    setStatusText(IMPORT_STEPS[IMPORT_STEPS.length - 1].text);
    setResult(res);
    setSelected(new Set(res.transactions.map((_, i) => i)));

    const failed = res.files.filter(f => f.errors.length > 0);
    if (failed.length > 0) {
      const msg = failed.map(f => `${f.fileName}：${f.errors.join('；')}`).join('\n');
      if (res.transactions.length === 0 && res.allRecords.length === 0) {
        setError(msg);
      } else {
        setError(`部分文件解析失败：${msg}`);
      }
    }
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = [...files];
    if (incoming.length === 0) return;
    setFileQueue(prev => {
      const seen = new Set(prev.map(fileKey));
      return [...prev, ...incoming.filter(f => !seen.has(fileKey(f)))];
    });
    setResult(null);
    setError('');
  }, []);

  const removeFile = (key: string) => {
    setFileQueue(prev => prev.filter(f => fileKey(f) !== key));
    setResult(null);
  };

  const animateProgress = useCallback(async (files: File[]) => {
    setProcessing(true);
    setError('');
    setResult(null);
    for (const step of IMPORT_STEPS.slice(0, -1)) {
      setProgress(step.progress);
      setStatusText(step.text);
      await new Promise(r => setTimeout(r, 100));
    }
    try {
      const res = await runImportEngine(files, { accounts, existing });
      applyResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setProcessing(false);
    }
  }, [accounts, existing, applyResult]);

  const parseJsonText = useCallback(async (text: string, fileName: string) => {
    setProcessing(true);
    setError('');
    setResult(null);
    for (const step of IMPORT_STEPS.slice(0, -1)) {
      setProgress(step.progress);
      setStatusText(step.text);
      await new Promise(r => setTimeout(r, 80));
    }
    try {
      const res = runBankJsonImport(text, fileName, { accounts, existing });
      applyResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON 导入失败');
    } finally {
      setProcessing(false);
    }
  }, [accounts, existing, applyResult]);

  const startParse = useCallback(() => {
    if (fileQueue.length === 0) return;
    void animateProgress(fileQueue);
  }, [fileQueue, animateProgress]);

  const handleJsonFile = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setJsonFileName(file.name);
    void file.text().then(text => parseJsonText(text, file.name));
  }, [parseJsonText]);

  const handleAiParse = useCallback(() => {
    const text = aiJsonText.trim();
    if (!text) {
      setError('请粘贴 AI 返回的 JSON');
      return;
    }
    void parseJsonText(text, 'ai_fallback.json');
  }, [aiJsonText, parseJsonText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const toggleRow = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const confirmImport = () => {
    if (!result) return;
    const items = result.transactions.filter((_, i) => selected.has(i));
    onConfirm(items, result.gameSnapshot);
    setResult(null);
    setSelected(new Set());
    setFileQueue([]);
  };

  const totalRaw = result?.allRecords.length ?? 0;
  const removedCount = result?.dedup.removed.length ?? 0;
  const importCount = result ? result.transactions.filter((_, i) => selected.has(i)).length : 0;


  return (
    <div className="space-y-3">
      <p className="text-xs vault-muted">
        支持微信/支付宝账单、银行 PDF（Electron 优先 Python 解析）、预解析 JSON 与 AI 兜底 JSON。
        历史流水<strong className="vault-heading">不会改动</strong>账户页当前余额。
      </p>

      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--vault-input-bg)' }}>
        {([
          ['files', '文件导入', Upload],
          ['json', '导入 JSON', Braces],
          ['ai', 'AI 兜底', Bot],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMode(key); setError(''); setResult(null); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] transition-colors"
            style={{
              backgroundColor: mode === key ? 'var(--vault-card-bg)' : 'transparent',
              color: mode === key ? 'var(--vault-heading)' : 'var(--vault-muted)',
            }}
          >
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      <p className="text-[10px] vault-muted">
        账本已有 {existing.length} 条流水
        {isPythonParserAvailable() ? ' · Electron Python 解析已启用' : ''}
        {parserDiag ? ` · ${parserDiag}` : ''}
      </p>

      {mode === 'files' && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !processing && inputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
            style={{
              borderColor: isDragging ? 'var(--vault-primary)' : 'var(--vault-border)',
              backgroundColor: 'var(--vault-input-bg)',
              opacity: processing ? 0.7 : 1,
              pointerEvents: processing ? 'none' : 'auto',
            }}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 vault-muted" />
            <p className="text-xs vault-heading">点击或拖拽，可连续添加多个文件</p>
            <p className="text-[10px] vault-muted mt-1">.xlsx · .csv · .pdf 混合上传</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={e => { addFiles(e.target.files ?? []); e.target.value = ''; }}
            />
          </div>

          {fileQueue.length > 0 && (
            <div className="rounded-lg border p-2 space-y-1" style={{ borderColor: 'var(--vault-border)' }}>
              <p className="text-[10px] vault-muted px-1">待解析 {fileQueue.length} 个文件</p>
              {fileQueue.map(f => (
                <div key={fileKey(f)} className="flex items-center gap-2 px-1 py-0.5 text-[10px]">
                  <FileText className="w-3 h-3 shrink-0 vault-muted" />
                  <span className="flex-1 truncate vault-heading">{f.name}</span>
                  <button type="button" onClick={() => removeFile(fileKey(f))} className="p-0.5 hover:opacity-70">
                    <X className="w-3 h-3 vault-muted" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={startParse}
                disabled={processing}
                className="w-full mt-2 py-2 rounded-lg text-xs text-white vault-btn-primary disabled:opacity-40"
              >
                {processing ? '解析中…' : `解析全部 ${fileQueue.length} 个文件`}
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'json' && (
        <div
          onClick={() => !processing && jsonInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer"
          style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-input-bg)' }}
        >
          <Braces className="w-6 h-6 mx-auto mb-2 vault-muted" />
          <p className="text-xs vault-heading">选择 Python 脚本输出的 JSON</p>
          <p className="text-[10px] vault-muted mt-1">支持数组、{'{ transactions: [] }'} 或按银行分组</p>
          {jsonFileName && <p className="text-[10px] vault-muted mt-2">{jsonFileName}</p>}
          <input
            ref={jsonInputRef}
            type="file"
            accept={JSON_ACCEPT}
            className="hidden"
            onChange={e => { handleJsonFile(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-2">
          <p className="text-[10px] vault-muted">
            PDF 无法解析时，用 Acrobat 导出文本 → 发给 AI → 粘贴返回的 JSON 数组
          </p>
          <textarea
            value={aiJsonText}
            onChange={e => setAiJsonText(e.target.value)}
            placeholder='[{"date":"2026-01-01","type":"支出","amount":35.5,"summary":"微信支付","counter":"美团","source":"招商银行","category":"餐饮/外卖"}]'
            rows={6}
            className="w-full rounded-lg border px-2 py-2 text-[10px] font-mono vault-heading"
            style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-input-bg)' }}
          />
          <button
            type="button"
            onClick={handleAiParse}
            disabled={processing || !aiJsonText.trim()}
            className="w-full py-2 rounded-lg text-xs text-white vault-btn-primary disabled:opacity-40"
          >
            解析 AI JSON
          </button>
        </div>
      )}

      {processing && (
        <div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--vault-border)' }}>
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--vault-primary)' }} />
          </div>
          <p className="text-[10px] vault-muted mt-1">{statusText}</p>
        </div>
      )}

      {error && (
        <p className="text-xs flex items-start gap-1 whitespace-pre-line" style={{ color: 'var(--vault-red)' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
        </p>
      )}

      {result && !processing && (
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-nav-active-bg)' }}>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--vault-accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium vault-heading">导入分析报告</p>
              <p className="text-[10px] vault-muted mt-0.5">
                {result.files.map(f => `${f.fileName}（${f.records.length}条）`).join(' · ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--vault-card-bg)' }}>
              <p className="text-[10px] vault-muted">原始记录</p>
              <p className="text-sm font-mono vault-heading">{totalRaw}</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--vault-card-bg)' }}>
              <p className="text-[10px] vault-muted">自动去重</p>
              <p className="text-sm font-mono" style={{ color: 'var(--vault-red)' }}>-{removedCount}</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--vault-card-bg)' }}>
              <p className="text-[10px] vault-muted">待入库</p>
              <p className="text-sm font-mono" style={{ color: 'var(--vault-accent)' }}>{importCount}</p>
            </div>
          </div>

          {result.skippedWalletOverlap > 0 && (
            <p className="text-[10px] vault-muted">与已有微信/支付宝账本重复 {result.skippedWalletOverlap} 条，已跳过</p>
          )}
          {result.skippedExactDuplicate > 0 && (
            <p className="text-[10px] vault-muted">账本中已有相同流水 {result.skippedExactDuplicate} 条，已跳过（清空记账后可重新导入）</p>
          )}
          {result.skippedNoAccount > 0 && (
            <p className="text-[10px]" style={{ color: 'var(--vault-red)' }}>
              未匹配银行账户 {result.skippedNoAccount} 条，请先在「账户」页添加农行/招行账户
            </p>
          )}



          <p className="text-[10px] vault-muted">
            成功解析 {result.files.filter(f => f.records.length > 0).length}/{result.files.length} 个文件
            · 去重 {removedCount} 条
            · 待入库 {importCount} 条
          </p>

          {result.spendingInsights.length > 0 && (
            <div>
              <p className="text-[10px] vault-muted mb-1">支出结构（通勤/住房/社交等）</p>
              <div className="flex flex-wrap gap-1.5">
                {result.spendingInsights.slice(0, 6).map(s => (
                  <span key={s.tag} className="text-[10px] px-2 py-0.5 rounded-full border vault-heading" style={{ borderColor: 'var(--vault-border)' }}>
                    {s.tag} {(s.share * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDupDetails(!showDupDetails)}
            className="flex items-center gap-1 text-[10px] vault-muted"
          >
            {showDupDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            重复明细（{result.dedup.pairs.length} 组）
          </button>

          {showDupDetails && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {result.dedup.pairs.slice(0, 20).map((pair: DuplicatePair, i) => (
                <p key={i} className="text-[10px] vault-muted">
                  保留 {pair.kept.sourceFile} · {pair.kept.counterparty || pair.kept.product} {formatCurrency(pair.kept.amount)}
                  {' → '}移除银行流水 {pair.reason}
                </p>
              ))}
            </div>
          )}

          {result.transactions.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--vault-border)' }}>
              {result.transactions.slice(0, 50).map((tx, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 border-b last:border-0 cursor-pointer text-[10px]"
                  style={{ borderColor: 'var(--vault-border)' }}
                >
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} />
                  <span className="font-mono vault-muted">{tx.date}</span>
                  <span className="flex-1 truncate vault-heading">{tx.description}</span>
                  <span className="font-mono" style={{ color: tx.type === 'income' ? 'var(--vault-accent)' : 'var(--vault-red)' }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </label>
              ))}
              {result.transactions.length > 50 && (
                <p className="text-[10px] vault-muted p-2">…还有 {result.transactions.length - 50} 条</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmImport}
              disabled={importCount === 0}
              className="flex-1 py-2 rounded-lg text-xs text-white vault-btn-primary disabled:opacity-40"
            >
              确认入库 {importCount} 条
            </button>
            <button
              type="button"
              onClick={() => { setResult(null); }}
              className="px-3 py-2 rounded-lg text-xs border vault-muted"
              style={{ borderColor: 'var(--vault-border)' }}
            >
              重新解析
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const template = 'date,amount,type,category,description\n2026-01-15,35.50,expense,餐饮美食,午餐\n';
          const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'vaultflow_template.csv';
          link.click();
        }}
        className="flex items-center gap-2 text-xs vault-muted"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />下载通用 CSV 模板
      </button>
    </div>
  );
}
