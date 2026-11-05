const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  readFile: (filename) => ipcRenderer.invoke('vault:readFile', filename),
  writeFile: (filename, content) => ipcRenderer.invoke('vault:writeFile', filename, content),
  getDataDir: () => ipcRenderer.invoke('vault:getDataDir'),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  readFilePath: (filePath) => ipcRenderer.invoke('vault:readFilePath', filePath),
  writeFilePath: (filePath, content) => ipcRenderer.invoke('vault:writeFilePath', filePath, content),
  extractPdfText: (arrayBuffer) => ipcRenderer.invoke('vault:extractPdfText', arrayBuffer),
  parseBankPdf: (payload) => ipcRenderer.invoke('vault:parseBankPdf', payload),
  clearBankParserHistory: () => ipcRenderer.invoke('vault:clearBankParserHistory'),
  getBankParserDiagnostics: () => ipcRenderer.invoke('vault:getBankParserDiagnostics'),
  showNotification: (payload) => ipcRenderer.invoke('vault:showNotification', payload),
  onWeatherSceneNavigate: (callback) => {
    const fn = (_event, data) => callback(data);
    ipcRenderer.on('vault:weather-scene-navigate', fn);
    return () => ipcRenderer.removeListener('vault:weather-scene-navigate', fn);
  },
});
