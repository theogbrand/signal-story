const addSignalBtn = document.getElementById('add-signal-btn');
const signalModal = document.getElementById('signal-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const signalForm = document.getElementById('signal-form');
const signalsList = document.getElementById('signals-list');
const searchInput = document.getElementById('search-input');
const tagFilters = document.getElementById('tag-filters');
const sortSelect = document.getElementById('sort-select');
const predefinedTagsContainer = document.getElementById('predefined-tags');
const selectedTagsContainer = document.getElementById('selected-tags');

const pipelineSettingsBtn = document.getElementById('pipeline-settings-btn');
const pipelineSettingsModal = document.getElementById('pipeline-settings-modal');
const closePipelineSettingsModal = document.getElementById('close-pipeline-settings-modal');
const cancelPipelineSettingsBtn = document.getElementById('cancel-pipeline-settings-btn');
const savePipelineSettingsBtn = document.getElementById('save-pipeline-settings-btn');
const fetchNowBtn = document.getElementById('fetch-now-btn');

const pipelineEnabledToggle = document.getElementById('pipeline-enabled-toggle');
const hackernewsEnabledToggle = document.getElementById('hackernews-enabled-toggle');
const githubEnabledToggle = document.getElementById('github-enabled-toggle');
const appleEnabledToggle = document.getElementById('apple-enabled-toggle');
const hackernewsLimit = document.getElementById('hackernews-limit');
const githubLimit = document.getElementById('github-limit');
const appleLimit = document.getElementById('apple-limit');
const dailyFetchToggle = document.getElementById('daily-fetch-toggle');
const weeklyFetchToggle = document.getElementById('weekly-fetch-toggle');

const pipelineItemsModal = document.getElementById('pipeline-items-modal');
const closePipelineItemsModal = document.getElementById('close-pipeline-items-modal');
const pipelineItemsList = document.getElementById('pipeline-items-list');

let signals = [];
let currentSignal = null;
let selectedTags = [];
let activeFilter = null;

let pipelineConfig = {
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
};

let pipelineItems = [];

const predefinedTags = [
  'policy', 
  'tech', 
  'consumer trend', 
  'surprising data', 
  'recurring complaint',
  'new habit/hack',
  'emerging policy',
  'technical breakthrough'
];

document.addEventListener('DOMContentLoaded', async () => {
  renderPredefinedTags();
  await loadSignals();
  renderTagFilters();
  setupEventListeners();
  
  await initializePipeline();
});

function setupEventListeners() {
  addSignalBtn.addEventListener('click', () => {
    openModal();
  });

  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  signalForm.addEventListener('submit', handleFormSubmit);

  searchInput.addEventListener('input', handleSearch);

  sortSelect.addEventListener('change', handleSort);
  
  const customTagInput = document.getElementById('custom-tag-input');
  const addCustomTagBtn = document.getElementById('add-custom-tag-btn');
  
  addCustomTagBtn.addEventListener('click', () => {
    addCustomTag();
  });
  
  customTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      addCustomTag();
    }
  });
  
  setupPipelineEventListeners();
}

async function loadSignals() {
  try {
    signals = await window.api.getSignals();
    renderSignals();
  } catch (error) {
    console.error('Error loading signals:', error);
  }
}

async function createSignal(signal) {
  try {
    const newSignal = await window.api.createSignal(signal);
    signals.unshift(newSignal);
    renderSignals();
    closeModal();
  } catch (error) {
    console.error('Error creating signal:', error);
  }
}

async function updateSignal(id, signal) {
  try {
    const updatedSignal = await window.api.updateSignal(id, signal);
    signals = signals.map(s => s.id === id ? updatedSignal : s);
    renderSignals();
    closeModal();
  } catch (error) {
    console.error('Error updating signal:', error);
  }
}

async function deleteSignal(id) {
  if (confirm('Are you sure you want to delete this signal?')) {
    try {
      await window.api.deleteSignal(id);
      signals = signals.filter(s => s.id !== id);
      renderSignals();
    } catch (error) {
      console.error('Error deleting signal:', error);
    }
  }
}

function renderSignals() {
  signalsList.innerHTML = '';

  let filteredSignals = [...signals];

  if (activeFilter) {
    filteredSignals = filteredSignals.filter(signal => 
      signal.categoryTags.includes(activeFilter)
    );
  }

  const searchQuery = searchInput.value.toLowerCase();
  if (searchQuery) {
    filteredSignals = filteredSignals.filter(signal => 
      signal.title.toLowerCase().includes(searchQuery) ||
      signal.sourceContext.toLowerCase().includes(searchQuery) ||
      signal.whyItMatters.toLowerCase().includes(searchQuery)
    );
  }

  if (filteredSignals.length === 0) {
    signalsList.innerHTML = `
      <div class="empty-state">
        <p>${signals.length === 0 ? 'No signals yet. Click "Add Signal" to get started.' : 'No signals match your filters.'}</p>
      </div>
    `;
    return;
  }

  const summaryElement = document.createElement('div');
  summaryElement.className = 'signals-summary';
  summaryElement.innerHTML = `
    <p>Showing ${filteredSignals.length} of ${signals.length} signals</p>
  `;
  signalsList.appendChild(summaryElement);

  filteredSignals.forEach(signal => {
    const signalCard = document.createElement('div');
    signalCard.className = 'signal-card';
    
    const truncateText = (text, maxLength = 150) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };
    
    signalCard.innerHTML = `
      <div class="signal-card-header">
        <h3 class="signal-card-title">${signal.title}</h3>
        <span class="signal-card-date">${formatDate(signal.dateCreated)}</span>
      </div>
      <div class="signal-card-content">
        <p><strong>Source/Context:</strong> ${truncateText(signal.sourceContext)}</p>
        <p><strong>Why It Matters:</strong> ${truncateText(signal.whyItMatters)}</p>
      </div>
      <div class="signal-card-tags">
        ${signal.categoryTags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <div class="signal-card-actions">
        <button class="view-btn secondary-btn" data-id="${signal.id}">View</button>
        <button class="edit-btn secondary-btn" data-id="${signal.id}">Edit</button>
        <button class="delete-btn secondary-btn" data-id="${signal.id}">Delete</button>
      </div>
    `;

    signalCard.querySelector('.view-btn').addEventListener('click', () => {
      viewSignalDetail(signal);
    });

    signalCard.querySelector('.edit-btn').addEventListener('click', () => {
      openModal(signal);
    });

    signalCard.querySelector('.delete-btn').addEventListener('click', () => {
      deleteSignal(signal.id);
    });

    signalsList.appendChild(signalCard);
  });
}

function viewSignalDetail(signal) {
  const detailModal = document.createElement('div');
  detailModal.className = 'modal';
  detailModal.style.display = 'block';
  
  detailModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Signal Details</h2>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <h3>${signal.title}</h3>
          <p class="detail-date">Captured on ${formatDate(signal.dateCreated)}</p>
        </div>
        <div class="detail-section">
          <h4>Source/Context</h4>
          <p>${signal.sourceContext}</p>
        </div>
        <div class="detail-section">
          <h4>Why It Matters</h4>
          <p>${signal.whyItMatters}</p>
        </div>
        <div class="detail-section">
          <h4>Categories/Tags</h4>
          <div class="tag-list">
            ${signal.categoryTags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
        <div class="detail-section">
          <div class="follow-up-container">
            <label class="follow-up-label">
              <input type="checkbox" id="follow-up-checkbox" ${signal.followUpNeeded ? 'checked' : ''}>
              Mark for follow-up
            </label>
          </div>
          <div class="notes-container">
            <h4>Notes</h4>
            <textarea id="signal-notes" placeholder="Add notes for future reference...">${signal.notes || ''}</textarea>
          </div>
        </div>
        <div class="detail-actions">
          <button class="save-detail-btn primary-btn">Save Changes</button>
          <button class="edit-detail-btn secondary-btn">Edit</button>
          <button class="close-detail-btn secondary-btn">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(detailModal);
  
  detailModal.querySelector('.close-btn').addEventListener('click', () => {
    document.body.removeChild(detailModal);
  });
  
  detailModal.querySelector('.close-detail-btn').addEventListener('click', () => {
    document.body.removeChild(detailModal);
  });
  
  detailModal.querySelector('.edit-detail-btn').addEventListener('click', () => {
    document.body.removeChild(detailModal);
    openModal(signal);
  });
  
  detailModal.querySelector('.save-detail-btn').addEventListener('click', () => {
    const followUpNeeded = detailModal.querySelector('#follow-up-checkbox').checked;
    const notes = detailModal.querySelector('#signal-notes').value.trim();
    
    updateSignalReviewData(signal.id, { followUpNeeded, notes })
      .then(() => {
        showToast('Signal review data saved successfully');
        document.body.removeChild(detailModal);
      })
      .catch(error => {
        console.error('Error saving review data:', error);
        showToast('Error saving review data');
      });
  });
}

function renderTagFilters() {
  tagFilters.innerHTML = '';
  
  const allTag = document.createElement('span');
  allTag.className = `tag ${!activeFilter ? 'active' : ''}`;
  allTag.textContent = 'All';
  allTag.addEventListener('click', () => {
    activeFilter = null;
    updateActiveFilter();
    renderSignals();
  });
  tagFilters.appendChild(allTag);
  
  const uniqueTags = new Set();
  signals.forEach(signal => {
    signal.categoryTags.forEach(tag => uniqueTags.add(tag));
  });
  
  [...uniqueTags].sort().forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = `tag ${activeFilter === tag ? 'active' : ''}`;
    tagElement.textContent = tag;
    tagElement.addEventListener('click', () => {
      activeFilter = tag;
      updateActiveFilter();
      renderSignals();
    });
    tagFilters.appendChild(tagElement);
  });
}

function updateActiveFilter() {
  document.querySelectorAll('#tag-filters .tag').forEach(tag => {
    if ((tag.textContent === 'All' && !activeFilter) || 
        (tag.textContent === activeFilter)) {
      tag.classList.add('active');
    } else {
      tag.classList.remove('active');
    }
  });
}

function renderPredefinedTags() {
  predefinedTagsContainer.innerHTML = '';
  
  predefinedTags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    tagElement.addEventListener('click', () => {
      toggleTag(tag);
    });
    predefinedTagsContainer.appendChild(tagElement);
  });
}

function renderSelectedTags() {
  selectedTagsContainer.innerHTML = '';
  
  selectedTags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    tagElement.innerHTML += ' <span class="remove-tag">×</span>';
    tagElement.querySelector('.remove-tag').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTag(tag);
    });
    selectedTagsContainer.appendChild(tagElement);
  });
}

function openModal(signal = null) {
  signalForm.reset();
  selectedTags = [];
  
  document.getElementById('modal-title').textContent = signal ? 'Edit Signal' : 'Add New Signal';
  
  if (signal) {
    currentSignal = signal;
    document.getElementById('signal-id').value = signal.id;
    document.getElementById('signal-title').value = signal.title;
    document.getElementById('signal-source').value = signal.sourceContext;
    document.getElementById('signal-why').value = signal.whyItMatters;
    selectedTags = [...signal.categoryTags];
  } else {
    currentSignal = null;
    document.getElementById('signal-id').value = '';
  }
  
  renderSelectedTags();
  signalModal.style.display = 'block';
}

function closeModal() {
  signalModal.style.display = 'none';
  currentSignal = null;
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById('signal-title').value.trim();
  const sourceContext = document.getElementById('signal-source').value.trim();
  const whyItMatters = document.getElementById('signal-why').value.trim();
  
  let isValid = true;
  let errorMessage = '';
  
  if (!title) {
    isValid = false;
    errorMessage = 'Title is required';
    document.getElementById('signal-title').classList.add('error');
  } else {
    document.getElementById('signal-title').classList.remove('error');
  }
  
  if (!sourceContext) {
    isValid = false;
    errorMessage = errorMessage ? errorMessage + '\nSource/Context is required' : 'Source/Context is required';
    document.getElementById('signal-source').classList.add('error');
  } else {
    document.getElementById('signal-source').classList.remove('error');
  }
  
  if (!whyItMatters) {
    isValid = false;
    errorMessage = errorMessage ? errorMessage + '\nWhy It Matters is required' : 'Why It Matters is required';
    document.getElementById('signal-why').classList.add('error');
  } else {
    document.getElementById('signal-why').classList.remove('error');
  }
  
  if (selectedTags.length === 0) {
    isValid = false;
    errorMessage = errorMessage ? errorMessage + '\nAt least one tag is required' : 'At least one tag is required';
    document.getElementById('selected-tags').classList.add('error');
  } else {
    document.getElementById('selected-tags').classList.remove('error');
  }
  
  if (!isValid) {
    showFormError(errorMessage);
    return;
  }
  
  clearFormError();
  
  const signalData = {
    title,
    sourceContext,
    whyItMatters,
    categoryTags: selectedTags,
    dateCreated: currentSignal ? currentSignal.dateCreated : new Date().toISOString(),
    followUpNeeded: currentSignal ? currentSignal.followUpNeeded : false,
    notes: currentSignal ? currentSignal.notes : ''
  };
  
  const signalId = document.getElementById('signal-id').value;
  
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  if (signalId) {
    updateSignal(signalId, signalData)
      .then(() => {
        showToast(currentSignal ? 'Signal updated successfully' : 'Signal created successfully');
      })
      .catch(error => {
        showFormError('Error saving signal: ' + error.message);
      })
      .finally(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      });
  } else {
    createSignal(signalData)
      .then(() => {
        showToast('Signal created successfully');
      })
      .catch(error => {
        showFormError('Error saving signal: ' + error.message);
      })
      .finally(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      });
  }
}

function showFormError(message) {
  let errorElement = document.getElementById('form-error');
  
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = 'form-error';
    errorElement.className = 'form-error';
    document.getElementById('signal-form').prepend(errorElement);
  }
  
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

function clearFormError() {
  const errorElement = document.getElementById('form-error');
  if (errorElement) {
    errorElement.style.display = 'none';
  }
}

function showToast(message) {
  let toast = document.getElementById('toast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function addCustomTag() {
  const customTagInput = document.getElementById('custom-tag-input');
  const customTag = customTagInput.value.trim();
  
  if (customTag && !selectedTags.includes(customTag)) {
    selectedTags.push(customTag);
    renderSelectedTags();
    
    if (!predefinedTags.includes(customTag)) {
      predefinedTags.push(customTag);
      renderPredefinedTags();
    }
    
    customTagInput.value = '';
    
    document.getElementById('selected-tags').classList.remove('error');
  }
}

async function updateSignalReviewData(id, reviewData) {
  try {
    const signal = signals.find(s => s.id === id);
    if (!signal) throw new Error('Signal not found');
    
    const updatedSignal = {
      ...signal,
      followUpNeeded: reviewData.followUpNeeded,
      notes: reviewData.notes
    };
    
    const result = await window.api.updateSignal(id, updatedSignal);
    signals = signals.map(s => s.id === id ? result : s);
    renderSignals();
    return result;
  } catch (error) {
    console.error('Error updating signal review data:', error);
    throw error;
  }
}

function toggleTag(tag) {
  const index = selectedTags.indexOf(tag);
  if (index === -1) {
    selectedTags.push(tag);
  } else {
    selectedTags.splice(index, 1);
  }
  renderSelectedTags();
}

function handleSearch() {
  renderSignals();
}

function handleSort() {
  const sortOrder = sortSelect.value;
  
  signals.sort((a, b) => {
    const dateA = new Date(a.dateCreated);
    const dateB = new Date(b.dateCreated);
    
    if (sortOrder === 'newest') {
      return dateB - dateA;
    } else {
      return dateA - dateB;
    }
  });
  
  renderSignals();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}


function setupPipelineEventListeners() {
  pipelineSettingsBtn.addEventListener('click', openPipelineSettingsModal);
  closePipelineSettingsModal.addEventListener('click', closePipelineSettings);
  cancelPipelineSettingsBtn.addEventListener('click', closePipelineSettings);
  savePipelineSettingsBtn.addEventListener('click', savePipelineSettings);
  fetchNowBtn.addEventListener('click', fetchPipelineDataNow);
  
  closePipelineItemsModal.addEventListener('click', () => {
    pipelineItemsModal.style.display = 'none';
  });
  
  document.addEventListener('pipeline-items-updated', loadPipelineItems);
  
  document.querySelectorAll('.pipeline-items-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pipeline-items-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const source = btn.getAttribute('data-source');
      filterPipelineItemsBySource(source);
    });
  });
}

async function loadPipelineConfig() {
  try {
    pipelineConfig = await window.api.getPipelineConfig();
    updatePipelineSettingsUI();
  } catch (error) {
    console.error('Error loading pipeline configuration:', error);
  }
}

function updatePipelineSettingsUI() {
  pipelineEnabledToggle.checked = pipelineConfig.pipelineEnabled;
  
  const sources = pipelineConfig.sources;
  if (sources.hackernews) {
    hackernewsEnabledToggle.checked = sources.hackernews.enabled;
    hackernewsLimit.value = sources.hackernews.limit || 20;
  }
  
  if (sources.github) {
    githubEnabledToggle.checked = sources.github.enabled;
    githubLimit.value = sources.github.limit || 20;
  }
  
  if (sources.apple) {
    appleEnabledToggle.checked = sources.apple.enabled;
    appleLimit.value = sources.apple.limit || 20;
  }
  
  const intervals = pipelineConfig.fetchIntervals;
  dailyFetchToggle.checked = intervals.daily;
  weeklyFetchToggle.checked = intervals.weekly;
}

function openPipelineSettingsModal() {
  loadPipelineConfig();
  pipelineSettingsModal.style.display = 'block';
}

function closePipelineSettings() {
  pipelineSettingsModal.style.display = 'none';
}

async function savePipelineSettings() {
  try {
    const updatedConfig = {
      pipelineEnabled: pipelineEnabledToggle.checked,
      sources: {
        hackernews: {
          enabled: hackernewsEnabledToggle.checked,
          limit: parseInt(hackernewsLimit.value, 10) || 20
        },
        github: {
          enabled: githubEnabledToggle.checked,
          limit: parseInt(githubLimit.value, 10) || 20
        },
        apple: {
          enabled: appleEnabledToggle.checked,
          limit: parseInt(appleLimit.value, 10) || 20
        }
      },
      fetchIntervals: {
        daily: dailyFetchToggle.checked,
        weekly: weeklyFetchToggle.checked
      }
    };
    
    await window.api.savePipelineConfig(updatedConfig);
    pipelineConfig = updatedConfig;
    
    showToast('Pipeline settings saved successfully');
    closePipelineSettings();
  } catch (error) {
    console.error('Error saving pipeline settings:', error);
    showFormError('Error saving pipeline settings: ' + error.message);
  }
}

async function fetchPipelineDataNow() {
  try {
    fetchNowBtn.textContent = 'Fetching...';
    fetchNowBtn.disabled = true;
    
    const result = await window.api.fetchPipelineDataNow();
    
    if (result.success) {
      showToast(result.message || 'Data fetched successfully');
    } else {
      showToast(result.message || 'No data fetched. Check configuration.');
    }
    
    await loadPipelineItems();
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    showToast('Error fetching data: ' + (error.message || 'Unknown error'));
  } finally {
    fetchNowBtn.textContent = 'Fetch Data Now';
    fetchNowBtn.disabled = false;
  }
}

async function loadPipelineItems() {
  try {
    pipelineItems = await window.api.getPipelineItems();
    
    const pipelineBadge = document.querySelector('.pipeline-badge');
    if (pipelineBadge) {
      if (pipelineItems.length > 0) {
        pipelineBadge.textContent = `${pipelineItems.length} items`;
      } else {
        pipelineBadge.remove();
      }
    } else if (pipelineItems.length > 0) {
      const headerActions = document.querySelector('.header-actions');
      const newBadge = document.createElement('div');
      newBadge.className = 'pipeline-badge';
      newBadge.textContent = `${pipelineItems.length} items`;
      newBadge.addEventListener('click', openPipelineItemsModal);
      headerActions.appendChild(newBadge);
    }
  } catch (error) {
    console.error('Error loading pipeline items:', error);
  }
}

function openPipelineItemsModal() {
  renderPipelineItems();
  pipelineItemsModal.style.display = 'block';
}

function filterPipelineItemsBySource(source) {
  const items = document.querySelectorAll('.pipeline-item');
  
  if (source === 'all') {
    items.forEach(item => item.style.display = 'block');
    return;
  }
  
  items.forEach(item => {
    const itemSource = item.querySelector('.pipeline-item-source').textContent.toLowerCase();
    if (itemSource === source.toLowerCase()) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

function renderPipelineItems() {
  pipelineItemsList.innerHTML = '';
  
  if (pipelineItems.length === 0) {
    pipelineItemsList.innerHTML = `
      <div class="empty-state">
        <p>No pipeline items available. Configure data sources and fetch data to see items here.</p>
      </div>
    `;
    return;
  }
  
  pipelineItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'pipeline-item';
    
    itemElement.innerHTML = `
      <div class="pipeline-item-header">
        <h3 class="pipeline-item-title">${item.rawTitle}</h3>
        <span class="pipeline-item-source">${item.source}</span>
      </div>
      <div class="pipeline-item-content">
        <p><strong>Source/Context:</strong> <a href="${item.rawSource}" target="_blank">${item.rawSource}</a></p>
        <p><strong>Description:</strong> ${item.rawDescription || 'No description'}</p>
        <p><strong>Fetched:</strong> ${formatDate(item.fetchDate)}</p>
      </div>
      <div class="pipeline-item-form">
        <div class="form-group">
          <label for="item-why-${item.itemId}">Why It Matters:</label>
          <textarea id="item-why-${item.itemId}" placeholder="Explain why this signal matters..."></textarea>
        </div>
        <div class="form-group">
          <label for="item-tags-${item.itemId}">Tags:</label>
          <div class="tag-selector">
            <div class="tag-options item-tags-options-${item.itemId}">
              ${predefinedTags.map(tag => `<span class="tag" data-item-id="${item.itemId}" data-tag="${tag}">${tag}</span>`).join('')}
            </div>
            <div class="selected-tags item-selected-tags-${item.itemId}"></div>
          </div>
        </div>
        <div class="pipeline-item-actions">
          <button class="approve-btn primary-btn" data-item-id="${item.itemId}">Approve</button>
          <button class="discard-btn secondary-btn" data-item-id="${item.itemId}">Discard</button>
        </div>
      </div>
    `;
    
    pipelineItemsList.appendChild(itemElement);
    
    const tagOptions = itemElement.querySelectorAll(`.tag-options[class*="item-tags-options-${item.itemId}"] .tag`);
    const selectedTagsContainer = itemElement.querySelector(`.selected-tags[class*="item-selected-tags-${item.itemId}"]`);
    const itemSelectedTags = new Map();
    
    tagOptions.forEach(tagElement => {
      tagElement.addEventListener('click', () => {
        const tag = tagElement.getAttribute('data-tag');
        if (!itemSelectedTags.has(tag)) {
          itemSelectedTags.set(tag, true);
          
          const selectedTag = document.createElement('span');
          selectedTag.className = 'tag';
          selectedTag.textContent = tag;
          selectedTag.innerHTML += ' <span class="remove-tag">×</span>';
          
          selectedTag.querySelector('.remove-tag').addEventListener('click', () => {
            selectedTagsContainer.removeChild(selectedTag);
            itemSelectedTags.delete(tag);
          });
          
          selectedTagsContainer.appendChild(selectedTag);
        }
      });
    });
    
    itemElement.querySelector('.approve-btn').addEventListener('click', () => {
      approveItem(item.itemId, itemElement, Array.from(itemSelectedTags.keys()));
    });
    
    itemElement.querySelector('.discard-btn').addEventListener('click', () => {
      discardItem(item.itemId, itemElement);
    });
  });
}

async function approveItem(itemId, itemElement, selectedTags) {
  const whyItMatters = itemElement.querySelector(`#item-why-${itemId}`).value.trim();
  
  if (!whyItMatters) {
    showToast('Please explain why this signal matters');
    return;
  }
  
  if (selectedTags.length === 0) {
    showToast('Please select at least one tag');
    return;
  }
  
  try {
    const item = pipelineItems.find(i => i.itemId === itemId);
    
    const signalData = {
      title: item.rawTitle,
      sourceContext: item.rawSource,
      whyItMatters,
      categoryTags: selectedTags,
      dateCreated: new Date().toISOString()
    };
    
    await window.api.approvePipelineItem(itemId, signalData);
    
    pipelineItemsList.removeChild(itemElement);
    
    pipelineItems = pipelineItems.filter(i => i.itemId !== itemId);
    
    const pipelineBadge = document.querySelector('.pipeline-badge');
    if (pipelineBadge) {
      if (pipelineItems.length > 0) {
        pipelineBadge.textContent = `${pipelineItems.length} items`;
      } else {
        pipelineBadge.remove();
      }
    }
    
    await loadSignals();
    
    showToast('Item approved and added to signals');
  } catch (error) {
    console.error('Error approving pipeline item:', error);
    showToast('Error approving item');
  }
}

async function discardItem(itemId, itemElement) {
  if (confirm('Are you sure you want to discard this item?')) {
    try {
      await window.api.deletePipelineItem(itemId);
      
      pipelineItemsList.removeChild(itemElement);
      
      pipelineItems = pipelineItems.filter(i => i.itemId !== itemId);
      
      const pipelineBadge = document.querySelector('.pipeline-badge');
      if (pipelineBadge) {
        if (pipelineItems.length > 0) {
          pipelineBadge.textContent = `${pipelineItems.length} items`;
        } else {
          pipelineBadge.remove();
        }
      }
      
      showToast('Item discarded');
    } catch (error) {
      console.error('Error discarding pipeline item:', error);
      showToast('Error discarding item');
    }
  }
}

async function initializePipeline() {
  setupPipelineEventListeners();
  await loadPipelineConfig();
  await loadPipelineItems();
}
