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
    console.log('Manual data fetch requested from UI');
    const result = await fetchFromAllSources();
    console.log('Manual data fetch completed');
    return { 
      success: true,
      message: result && result.totalFetched > 0 
        ? `Fetched ${result.totalFetched} items from configured sources` 
        : 'No items fetched. Check logs for details'
    };
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    return {
      success: false,
      message: `Error fetching data: ${error.message}`
    };
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
    console.log('Fetching top stories from HackerNews API...');
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Unexpected HackerNews API response format for top stories:', response.data);
      return [];
    }
    
    const storyIds = response.data.slice(0, limit);
    console.log(`Retrieved ${storyIds.length} story IDs from HackerNews`);
    
    const storyPromises = storyIds.map(id => 
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    );
    
    const storyResponses = await Promise.all(storyPromises);
    const stories = storyResponses.map(res => res.data);
    
    console.log(`Successfully fetched details for ${stories.length} HackerNews stories`);
    
    return stories.map(story => ({
      rawTitle: story.title,
      rawSource: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      rawDescription: `Score: ${story.score}, Comments: ${story.descendants || 0}`,
      source: 'hackernews'
    }));
  } catch (error) {
    console.error('Error fetching from HackerNews API:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return [];
  }
}

async function fetchGitHubTrending(limit = 20) {
  try {
    console.log('Fetching trending repositories from GitHub API...');
    const date = new Date();
    date.setDate(date.getDate() - 7); // Get repos from the last week
    const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'WeakSignalTracker'
    };
    
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      console.log('Using GitHub token for authentication');
      headers['Authorization'] = `token ${githubToken}`;
    } else {
      console.log('No GitHub token found, using unauthenticated request (rate limited to 60 requests/hour)');
    }
    
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=created:>${dateString}&sort=stars&order=desc&per_page=${limit}`,
      { headers }
    );
    
    if (!response.data.items || !Array.isArray(response.data.items)) {
      console.error('Unexpected GitHub API response format:', response.data);
      return [];
    }
    
    console.log(`Successfully fetched ${response.data.items.length} trending repositories from GitHub`);
    
    return response.data.items.map(repo => ({
      rawTitle: repo.full_name,
      rawSource: repo.html_url,
      rawDescription: `${repo.description || 'No description'}\nStars: ${repo.stargazers_count}`,
      source: 'github'
    }));
  } catch (error) {
    console.error('Error fetching from GitHub API:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      
      if (error.response.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
        console.error('GitHub API rate limit exceeded. Consider adding a GitHub token for authentication.');
      }
    }
    return [];
  }
}

async function fetchAppleDeveloperNews(limit = 20) {
  try {
    console.log('Fetching Apple Developer News...');
    
    
    const mockAppleNews = [
      {
        title: "What's new in SwiftUI",
        url: "https://developer.apple.com/swiftui/",
        description: "A mock entry for Apple Developer News"
      },
      {
        title: "Introducing iOS 17",
        url: "https://developer.apple.com/ios/",
        description: "A mock entry for Apple Developer News"
      },
      {
        title: "ARKit Updates",
        url: "https://developer.apple.com/augmented-reality/",
        description: "A mock entry for Apple Developer News"
      }
    ];
    
    const results = mockAppleNews.slice(0, limit).map(item => ({
      rawTitle: item.title,
      rawSource: item.url,
      rawDescription: item.description,
      source: 'apple'
    }));
    
    console.log(`Successfully mocked ${results.length} Apple Developer News items`);
    return results;
  } catch (error) {
    console.error('Error fetching Apple Developer News:', error.message);
    return [];
  }
}

async function fetchFromAllSources() {
  const pipelineEnabled = store.get('pipelineEnabled');
  if (!pipelineEnabled) {
    console.log('Data pipeline is disabled. Enable it in settings to fetch data.');
    return;
  }
  
  const sourcesConfig = store.get('sources');
  if (!sourcesConfig) {
    console.log('No sources configuration found');
    return;
  }
  
  console.log('Fetching data from configured sources...');
  console.log('Current configuration:', JSON.stringify(sourcesConfig, null, 2));
  
  const fetchPromises = [];
  let enabledSourcesCount = 0;
  
  if (sourcesConfig.hackernews && sourcesConfig.hackernews.enabled) {
    const limit = sourcesConfig.hackernews.limit || 20;
    console.log(`HackerNews source enabled with limit: ${limit}`);
    enabledSourcesCount++;
    fetchPromises.push(fetchHackerNewsTopStories(limit).then(items => {
      console.log(`Fetched ${items.length} items from HackerNews`);
      return items;
    }));
  } else {
    console.log('HackerNews source is disabled or not configured');
  }
  
  if (sourcesConfig.github && sourcesConfig.github.enabled) {
    const limit = sourcesConfig.github.limit || 20;
    console.log(`GitHub source enabled with limit: ${limit}`);
    enabledSourcesCount++;
    fetchPromises.push(fetchGitHubTrending(limit).then(items => {
      console.log(`Fetched ${items.length} items from GitHub`);
      return items;
    }));
  } else {
    console.log('GitHub source is disabled or not configured');
  }
  
  if (sourcesConfig.apple && sourcesConfig.apple.enabled) {
    const limit = sourcesConfig.apple.limit || 20;
    console.log(`Apple source enabled with limit: ${limit}`);
    enabledSourcesCount++;
    fetchPromises.push(fetchAppleDeveloperNews(limit).then(items => {
      console.log(`Fetched ${items.length} items from Apple`);
      return items;
    }));
  } else {
    console.log('Apple source is disabled or not configured');
  }
  
  if (enabledSourcesCount === 0) {
    console.log('No sources are enabled. Please enable at least one source in the pipeline settings.');
    return;
  }
  
  const results = await Promise.all(fetchPromises);
  const allItems = results.flat();
  
  console.log(`Fetched ${allItems.length} items from all sources`);
  
  let savedCount = 0;
  for (const item of allItems) {
    try {
      await database.createPipelineItem(item);
      savedCount++;
    } catch (error) {
      console.error('Error storing pipeline item:', error);
    }
  }
  
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('pipeline-items-updated');
  }
  
  return {
    totalFetched: allItems.length,
    totalSaved: savedCount,
    sources: {
      hackernews: results[0]?.length || 0,
      github: results[1]?.length || 0,
      apple: results[2]?.length || 0
    }
  };
}

app.on('will-quit', async () => {
  try {
    await database.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database:', error);
  }
});
