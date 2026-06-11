const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "Aura IPTV",
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Ocultar barra de menu para visual mais limpo
  win.setMenuBarVisibility(false);

  // Carregar do Vercel para permitir atualizações instantâneas (com fallback local se estiver offline)
  win.loadURL('https://aura-iptv-blush.vercel.app').catch(() => {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  });

  // Abrir links externos no navegador padrão do sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
