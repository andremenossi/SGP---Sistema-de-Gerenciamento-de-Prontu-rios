const { app, BrowserWindow } = require('electron');
const path = require('path');

// Verifica se está em modo de desenvolvimento (rodando via 'npm run electron:dev')
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'SGP - Hospitalar',
    // Ícone da janela (opcional, precisa existir na pasta public/build)
    // icon: path.join(__dirname, 'dist', 'favicon.ico'), 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    show: false
  });

  if (isDev) {
    // Em dev, carrega do servidor Vite
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Descomente para debug
  } else {
    // Em produção (EXE), carrega o arquivo local compilado
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
    win.maximize();
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