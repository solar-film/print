const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // We will use the svg for the web, but electron requires an icon file (ico/png)
    // We'll leave icon undefined here; electron-builder uses build/icon.ico by default
  });

  // Load the index.html from a directory relative to this file
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  
  // Maximize by default for better experience
  mainWindow.maximize();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
