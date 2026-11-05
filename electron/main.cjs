const { app, BrowserWindow, shell, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5174';

let mainWindow;

function getVaultDir() {
  return path.join(app.getPath('documents'), 'VaultFlow');
}

function ensureVaultDir() {
  const dir = getVaultDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getBankParserScriptPath() {
  return path.join(__dirname, '../scripts/bank_pdf_parser.py');
}

function getBankParserOutputDir() {
  ensureVaultDir();
  return path.join(getVaultDir(), 'bank-parser-output');
}

function resolvePythonCommand() {
  const venvPython = path.join(__dirname, '../scripts/.venv/bin/python3');
  if (fs.existsSync(venvPython)) return venvPython;
  if (process.platform === 'win32') {
    const winVenv = path.join(__dirname, '../scripts/.venv/Scripts/python.exe');
    if (fs.existsSync(winVenv)) return winVenv;
    return 'python';
  }
  return 'python3';
}

function runPythonParser(args) {
  return new Promise((resolve, reject) => {
    const scriptPath = getBankParserScriptPath();
    const proc = spawn(resolvePythonCommand(), [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function registerIpcHandlers() {
  ipcMain.handle('vault:getDataDir', () => {
    ensureVaultDir();
    return getVaultDir();
  });

  ipcMain.handle('vault:readFile', async (_event, filename) => {
    ensureVaultDir();
    const filePath = path.join(getVaultDir(), filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('vault:writeFile', async (_event, filename, content) => {
    ensureVaultDir();
    fs.writeFileSync(path.join(getVaultDir(), filename), content, 'utf-8');
    return true;
  });

  ipcMain.handle('vault:readFilePath', async (_event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('vault:writeFilePath', async (_event, filePath, content) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    return dialog.showSaveDialog(win, options);
  });

  ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    return dialog.showOpenDialog(win, options);
  });

  ipcMain.handle('vault:extractPdfText', async (_event, arrayBuffer) => {
    const { extractPdfTextFromBytes } = await import('./pdf-text.mjs');
    const data = arrayBuffer instanceof Uint8Array
      ? arrayBuffer
      : new Uint8Array(arrayBuffer);
    return extractPdfTextFromBytes(data);
  });

  ipcMain.handle('vault:parseBankPdf', async (_event, payload) => {
    const { name, data } = payload ?? {};
    if (!name || !Array.isArray(data) || data.length === 0) {
      return { ok: false, error: '无效的 PDF 数据' };
    }

    const safeName = String(name).replace(/[^\w.\-()\u4e00-\u9fff]/g, '_');
    const tmpPath = path.join(os.tmpdir(), `vaultflow-${Date.now()}-${safeName}`);
    const outputDir = getBankParserOutputDir();
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      fs.writeFileSync(tmpPath, Buffer.from(data));
      const { code, stdout, stderr } = await runPythonParser([
        '--cli',
        '--output-dir',
        outputDir,
        tmpPath,
      ]);

      const lastLine = stdout.trim().split('\n').filter(Boolean).pop() || stdout.trim();
      let summary;
      try {
        summary = JSON.parse(lastLine);
      } catch {
        return {
          ok: false,
          error: stderr.trim() || stdout.trim() || 'Python 脚本无有效输出，请确认已安装 pdfplumber',
        };
      }

      if (!summary.ok || !Array.isArray(summary.results) || summary.results.length === 0) {
        const errMsg = summary.errors?.map(e => `${e.file}: ${e.error}`).join('；')
          || stderr.trim()
          || 'Python 解析失败';
        return { ok: false, error: errMsg };
      }

      const transactions = [];
      for (const item of summary.results) {
        if (item.jsonPath && fs.existsSync(item.jsonPath)) {
          const payloadJson = JSON.parse(fs.readFileSync(item.jsonPath, 'utf-8'));
          if (Array.isArray(payloadJson.transactions)) {
            transactions.push(...payloadJson.transactions);
          }
        }
      }

      if (transactions.length === 0) {
        return { ok: false, error: '解析成功但未读取到流水记录' };
      }

      return { ok: true, transactions, summary: summary.results, exitCode: code };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Python 调用失败' };
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  });

  ipcMain.handle('vault:clearBankParserHistory', async () => {
    const outputDir = getBankParserOutputDir();
    if (fs.existsSync(outputDir)) {
      for (const file of fs.readdirSync(outputDir)) {
        if (file.endsWith('_history.json')) {
          fs.unlinkSync(path.join(outputDir, file));
        }
      }
    }
    try {
      await runPythonParser(['--cli', '--clear-history', '--output-dir', outputDir]);
    } catch {
      /* Python 不可用时仍清除本地 history 文件 */
    }
    return true;
  });

  ipcMain.handle('vault:getBankParserDiagnostics', async () => {
    const outputDir = getBankParserOutputDir();
    let historyFiles = 0;
    let outputFiles = 0;
    if (fs.existsSync(outputDir)) {
      for (const file of fs.readdirSync(outputDir)) {
        if (file.endsWith('_history.json')) historyFiles += 1;
        else if (file.endsWith('.json')) outputFiles += 1;
      }
    }
    return {
      scriptPath: getBankParserScriptPath(),
      outputDir,
      historyFiles,
      outputFiles,
      python: resolvePythonCommand(),
    };
  });

  ipcMain.handle('vault:showNotification', async (event, { title, body, buildingType }) => {
    if (!Notification.isSupported()) return false;
    const n = new Notification({ title: title || 'VaultFlow', body: body || '' });
    if (buildingType && mainWindow && !mainWindow.isDestroyed()) {
      n.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('vault:weather-scene-navigate', { buildingType });
      });
    }
    n.show();
    return true;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'VaultFlow 资产仪表盘',
    backgroundColor: '#0B0E14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
