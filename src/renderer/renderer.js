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

let signals = [];
let currentSignal = null;
let selectedTags = [];
let activeFilter = null;

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
        <div class="detail-actions">
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
    followUpNeeded: currentSignal ? currentSignal.followUpNeeded : false
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
