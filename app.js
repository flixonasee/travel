const STORAGE_KEY = 'nyc-directory-data-v1';
const cardGrid = document.getElementById('cardGrid');
const categoryPills = document.getElementById('categoryPills');
const neighborhoodFilter = document.getElementById('neighborhoodFilter');
const budgetFilter = document.getElementById('budgetFilter');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const progressEl = document.getElementById('progress');

const detailPanel = document.getElementById('detailPanel');
const closeDetail = document.getElementById('closeDetail');
const detailEmoji = document.getElementById('detailEmoji');
const detailTitle = document.getElementById('detailTitle');
const detailMeta = document.getElementById('detailMeta');
const detailAddress = document.getElementById('detailAddress');
const mapsLink = document.getElementById('mapsLink');
const detailNotes = document.getElementById('detailNotes');
const detailTags = document.getElementById('detailTags');
const detailDates = document.getElementById('detailDates');
const statusActions = document.getElementById('statusActions');
const statusButtonTemplate = document.getElementById('statusButtonTemplate');

const addItemForm = document.getElementById('addItemForm');
const addItemStatus = document.getElementById('addItemStatus');
const addName = document.getElementById('addName');
const addCategory = document.getElementById('addCategory');
const addSubcategory = document.getElementById('addSubcategory');
const addNeighborhood = document.getElementById('addNeighborhood');
const addBudget = document.getElementById('addBudget');
const addStatus = document.getElementById('addStatus');
const addDates = document.getElementById('addDates');
const addTime = document.getElementById('addTime');
const addAddress = document.getElementById('addAddress');
const addMaps = document.getElementById('addMaps');
const addTags = document.getElementById('addTags');
const addNotes = document.getElementById('addNotes');

const categoryEmoji = {
  museum: '🖼️',
  gallery: '🏛️',
  restaurant: '🍽️',
  bar: '🍸',
  show: '🎭',
  shop: '🛍️',
  experience: '✨',
  walk: '🚶‍♂️',
  other: '⭐️'
};

const statusBadge = {
  draft: '📝',
  planned: '📌',
  completed: '✅',
  archived: '🗂️'
};

let items = [];
let activeCategory = 'all';
let currentDetailItem = null;

function createId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

async function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      items = JSON.parse(saved);
      ensureDefaults();
      render();
      return;
    } catch (error) {
      console.error('Failed to parse stored data', error);
    }
  }

  try {
    const res = await fetch('data.json');
    const data = await res.json();
    items = data.map(enrichItem);
    persist();
    render();
  } catch (error) {
    console.error('Unable to load data.json. Using empty dataset.', error);
    items = [];
    render();
  }
}

function enrichItem(item) {
  const emoji = item.emoji || categoryEmoji[item.category] || categoryEmoji.other;
  return {
    ...item,
    id: item.id || createId(),
    emoji,
    status: item.status || 'draft',
    tags: item.tags || []
  };
}

function ensureDefaults() {
  items = items.map(enrichItem);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderFilters() {
  const categories = ['all', ...new Set(items.map((i) => i.category || 'other'))];
  categoryPills.innerHTML = '';
  categories.forEach((cat) => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (cat === activeCategory ? ' active' : '');
    const label = cat === 'all' ? 'All' : capitalize(cat);
    const emoji = cat === 'all' ? '⭐️' : categoryEmoji[cat] || '⭐️';
    pill.textContent = `${emoji} ${label}`;
    pill.addEventListener('click', () => {
      activeCategory = cat;
      render();
    });
    categoryPills.appendChild(pill);
  });

  const prevNeighborhood = neighborhoodFilter.value || 'all';
  const neighborhoods = ['all', ...new Set(items.map((i) => i.neighborhood).filter(Boolean))];
  neighborhoodFilter.innerHTML = neighborhoods
    .map((n) => `<option value="${n}">${n === 'all' ? 'All' : n}</option>`)
    .join('');
  neighborhoodFilter.value = neighborhoods.includes(prevNeighborhood) ? prevNeighborhood : 'all';

  const prevBudget = budgetFilter.value || 'all';
  const budgets = ['all', ...new Set(items.map((i) => i.budget).filter(Boolean))];
  budgetFilter.innerHTML = budgets
    .map((b) => `<option value="${b}">${b === 'all' ? 'All' : b}</option>`)
    .join('');
  budgetFilter.value = budgets.includes(prevBudget) ? prevBudget : 'all';
}

function filterItems() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const neighborhood = neighborhoodFilter.value;
  const budget = budgetFilter.value;
  const status = statusFilter.value;

  return items.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (neighborhood !== 'all' && item.neighborhood !== neighborhood) return false;
    if (budget !== 'all' && item.budget !== budget) return false;
    if (status !== 'all' && item.status !== status) return false;

    if (searchTerm) {
      const haystack = `${item.name || ''} ${item.artist || ''} ${item.title || ''} ${
        item.tags?.join(' ') || ''
      } ${item.notes || ''} ${item.dates || ''}`
        .toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });
}

function renderProgress() {
  const total = items.length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  progressEl.textContent = `Completed: ${completed} / Total ${total} (${percent}%)`;
}

function renderCards() {
  const filtered = filterItems();
  cardGrid.innerHTML = '';
  if (!filtered.length) {
    cardGrid.innerHTML = '<p>No items found. Adjust filters or add more entries.</p>';
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    const timing = item.dates || item.estimated_visit_time
      ? `<p class="card-dates">${[item.dates, item.estimated_visit_time].filter(Boolean).join(' • ')}</p>`
      : '';
    card.innerHTML = `
      <div class="card-emoji">${item.emoji}</div>
      <div>
        <h3 class="card-title">${formatTitle(item)}</h3>
        <p class="card-meta">${item.neighborhood || 'NYC'} ${item.budget ? '• ' + item.budget : ''}</p>
        ${timing}
        ${item.status ? `<span class="badge">${statusBadge[item.status] || ''} ${capitalize(item.status)}</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openDetail(item));
    cardGrid.appendChild(card);
  });
}

function render() {
  renderFilters();
  renderProgress();
  renderCards();
}

function openDetail(item) {
  currentDetailItem = item;
  detailPanel.classList.add('open');
  detailEmoji.textContent = item.emoji;
  detailTitle.textContent = formatTitle(item);
  detailMeta.textContent = [item.neighborhood, item.budget, item.subcategory].filter(Boolean).join(' • ');
  detailDates.textContent = formatDates(item);
  detailAddress.textContent = item.address || 'Address to be added';
  detailNotes.textContent = item.notes || 'Add your notes here.';
  detailTags.innerHTML = item.tags?.length
    ? item.tags.map((t) => `<span class="tag">${t}</span>`).join('')
    : '<span class="tag">No tags</span>';
  mapsLink.href = item.maps_link || '#';

  statusActions.innerHTML = '';
  const actions = [
    { label: 'Move to Draft', status: 'draft' },
    { label: 'Mark as Planned', status: 'planned' },
    { label: 'Mark as Completed', status: 'completed' },
    { label: 'Archive', status: 'archived' }
  ];

  actions
    .filter((action) => action.status !== item.status)
    .forEach((action) => {
      const btn = statusButtonTemplate.content.firstElementChild.cloneNode(true);
      btn.textContent = `${statusBadge[action.status] || ''} ${action.label}`;
      btn.addEventListener('click', () => updateStatus(item, action.status));
      statusActions.appendChild(btn);
    });
}

function updateStatus(item, status) {
  items = items.map((entry) => (entry.id === item.id ? { ...entry, status } : entry));
  persist();
  render();
  closeDetailPanel();
}

function formatTitle(item) {
  if (item.artist || item.title) {
    const artist = item.artist ? `${item.artist}` : '';
    const title = item.title ? `${item.title}` : '';
    return [artist, title].filter(Boolean).join(' — ');
  }
  return item.name || 'Untitled';
}

function formatDates(item) {
  const parts = [item.dates, item.estimated_visit_time].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Add dates or timing';
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}


function closeDetailPanel() {
  detailPanel.classList.remove('open');
  currentDetailItem = null;
}

closeDetail.addEventListener('click', closeDetailPanel);
detailPanel.addEventListener('click', (e) => {
  if (e.target === detailPanel) closeDetailPanel();
});

[neighborhoodFilter, budgetFilter, statusFilter].forEach((select) => {
  select.addEventListener('change', render);
});

searchInput.addEventListener('input', () => {
  renderCards();
  renderProgress();
});

addItemForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = addName.value.trim();
  const category = addCategory.value;
  if (!name) {
    addItemStatus.textContent = 'Please add a name or title.';
    return;
  }

  const newItem = enrichItem({
    name,
    category,
    subcategory: addSubcategory.value.trim(),
    neighborhood: addNeighborhood.value.trim(),
    budget: addBudget.value.trim(),
    status: addStatus.value,
    dates: addDates.value.trim(),
    estimated_visit_time: addTime.value.trim(),
    address: addAddress.value.trim(),
    maps_link: addMaps.value.trim(),
    tags: addTags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    notes: addNotes.value.trim()
  });

  items = [newItem, ...items];
  persist();
  render();
  addItemStatus.textContent = `Added “${formatTitle(newItem)}” (${capitalize(newItem.category)}).`;
  addItemForm.reset();
  addCategory.value = category;
});

loadData();
