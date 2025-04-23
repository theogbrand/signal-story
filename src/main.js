const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const database = require('./database');
const Store = require('electron-store').default;
const schedule = require('node-schedule');
const https = require('https');
const axios = require('axios');

const store = new Store({
  name: 'pipeline-config',
  defaults: {
    pipelineEnabled: false,
    sources: {
      hackernews: { enabled: false, limit: 20 },
      github: { enabled: false, limit: 20 },
      apple: { enabled: false, limit: 20 }
    },
    fetchIntervals: {
      daily: false,
      weekly: false
    }
  }
});

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

const scheduleJobs = {};

function scheduleFetchJobs() {
  Object.values(scheduleJobs).forEach(job => job.cancel());
  
  const pipelineEnabled = store.get('pipelineEnabled');
  if (!pipelineEnabled) {
    console.log('Data pipeline is disabled, not scheduling fetch jobs');
    return;
  }
  
  const fetchIntervals = store.get('fetchIntervals');
  if (!fetchIntervals) return;
  
  if (fetchIntervals.daily) {
    scheduleJobs.daily = schedule.scheduleJob('0 0 * * *', fetchFromAllSources);
    console.log('Scheduled daily fetch job');
  }
  
  if (fetchIntervals.weekly) {
    scheduleJobs.weekly = schedule.scheduleJob('0 0 * * 0', fetchFromAllSources);
    console.log('Scheduled weekly fetch job');
  }
}

app.whenReady().then(() => {
  createWindow();
  scheduleFetchJobs();
});

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

ipcMain.handle('get-pipeline-config', () => {
  return {
    pipelineEnabled: store.get('pipelineEnabled'),
    sources: store.get('sources'),
    fetchIntervals: store.get('fetchIntervals')
  };
});

ipcMain.handle('save-pipeline-config', async (event, config) => {
  try {
    store.set('pipelineEnabled', config.pipelineEnabled);
    store.set('sources', config.sources);
    store.set('fetchIntervals', config.fetchIntervals);
    
    scheduleFetchJobs();
    
    return { success: true };
  } catch (error) {
    console.error('Error saving pipeline configuration:', error);
    throw error;
  }
});

ipcMain.handle('fetch-pipeline-data-now', async () => {
  try {
    await fetchFromAllSources();
    return { success: true };
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    throw error;
  }
});

ipcMain.handle('get-pipeline-items', async () => {
  try {
    return await database.getPipelineItems();
  } catch (error) {
    console.error('Error getting pipeline items:', error);
    throw error;
  }
});

ipcMain.handle('get-pipeline-items-by-source', async (event, source) => {
  try {
    return await database.getPipelineItemsBySource(source);
  } catch (error) {
    console.error('Error getting pipeline items by source:', error);
    throw error;
  }
});

ipcMain.handle('approve-pipeline-item', async (event, itemId, signalData) => {
  try {
    return await database.approvePipelineItem(itemId, signalData);
  } catch (error) {
    console.error('Error approving pipeline item:', error);
    throw error;
  }
});

ipcMain.handle('delete-pipeline-item', async (event, itemId) => {
  try {
    return await database.deletePipelineItem(itemId);
  } catch (error) {
    console.error('Error deleting pipeline item:', error);
    throw error;
  }
});


async function fetchHackerNewsTopStories(limit = 20) {
  try {
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
    const storyIds = response.data.slice(0, limit);
    
    const storyPromises = storyIds.map(id => 
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    );
    
    const storyResponses = await Promise.all(storyPromises);
    const stories = storyResponses.map(res => res.data);
    
    return stories.map(story => ({
      rawTitle: story.title,
      rawSource: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      rawDescription: `Score: ${story.score}, Comments: ${story.descendants || 0}`,
      source: 'hackernews'
    }));
  } catch (error) {
    console.error('Error fetching from HackerNews API:', error);
    return [];
  }
}

async function fetchGitHubTrending(limit = 20) {
  try {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Get repos from the last week
    const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=created:>${dateString}&sort=stars&order=desc&per_page=${limit}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'WeakSignalTracker'
        }
      }
    );
    
    return response.data.items.map(repo => ({
      rawTitle: repo.full_name,
      rawSource: repo.html_url,
      rawDescription: `${repo.description || 'No description'}\nStars: ${repo.stargazers_count}`,
      source: 'github'
    }));
  } catch (error) {
    console.error('Error fetching from GitHub API:', error);
    return [];
  }
}

async function fetchAppleDeveloperNews(limit = 20) {
  return [];
}

async function fetchFromAllSources() {
  const sourcesConfig = store.get('sources');
  if (!sourcesConfig) return;
  
  console.log('Fetching data from configured sources...');
  
  const fetchPromises = [];
  
  if (sourcesConfig.hackernews && sourcesConfig.hackernews.enabled) {
    const limit = sourcesConfig.hackernews.limit || 20;
    fetchPromises.push(fetchHackerNewsTopStories(limit));
  }
  
  if (sourcesConfig.github && sourcesConfig.github.enabled) {
    const limit = sourcesConfig.github.limit || 20;
    fetchPromises.push(fetchGitHubTrending(limit));
  }
  
  if (sourcesConfig.apple && sourcesConfig.apple.enabled) {
    const limit = sourcesConfig.apple.limit || 20;
    fetchPromises.push(fetchAppleDeveloperNews(limit));
  }
  
  const results = await Promise.all(fetchPromises);
  const allItems = results.flat();
  
  console.log(`Fetched ${allItems.length} items from all sources`);
  
  for (const item of allItems) {
    try {
      await database.createPipelineItem(item);
    } catch (error) {
      console.error('Error storing pipeline item:', error);
    }
  }
  
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('pipeline-items-updated');
  }
}

app.on('will-quit', async () => {
  try {
    await database.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database:', error);
  }
});
