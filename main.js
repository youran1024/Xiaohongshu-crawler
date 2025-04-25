process.env.LANG = 'zh_CN.UTF-8';
const { app, BrowserWindow } = require('electron');
const path = require('path');
const IpcHandlers = require('./src/ipc/handlers');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

app.whenReady().then(() => {
  const mainWindow = createWindow();
  IpcHandlers.setup(require('electron').ipcMain);
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});