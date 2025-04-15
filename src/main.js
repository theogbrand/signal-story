const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const database = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('create-signal', async (event, signal) => {
  try {
    return await database.createSignal(signal);
  } catch (error) {
    console.error('Error creating signal:', error);
    throw error;
  }
});

ipcMain.handle('get-signals', async () => {
  try {
    return await database.getSignals();
  } catch (error) {
    console.error('Error getting signals:', error);
    throw error;
  }
});

ipcMain.handle('get-signal-by-id', async (event, id) => {
  try {
    return await database.getSignalById(id);
  } catch (error) {
    console.error('Error getting signal by id:', error);
    throw error;
  }
});

ipcMain.handle('update-signal', async (event, id, signal) => {
  try {
    return await database.updateSignal(id, signal);
  } catch (error) {
    console.error('Error updating signal:', error);
    throw error;
  }
});

ipcMain.handle('delete-signal', async (event, id) => {
  try {
    return await database.deleteSignal(id);
  } catch (error) {
    console.error('Error deleting signal:', error);
    throw error;
  }
});

ipcMain.handle('get-tags', async () => {
  try {
    return await database.getTags();
  } catch (error) {
    console.error('Error getting tags:', error);
    throw error;
  }
});

ipcMain.handle('filter-signals-by-tag', async (event, tag) => {
  try {
    return await database.filterSignalsByTag(tag);
  } catch (error) {
    console.error('Error filtering signals by tag:', error);
    throw error;
  }
});

ipcMain.handle('search-signals', async (event, query) => {
  try {
    return await database.searchSignals(query);
  } catch (error) {
    console.error('Error searching signals:', error);
    throw error;
  }
});

app.on('will-quit', async () => {
  try {
    await database.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database:', error);
  }
});
