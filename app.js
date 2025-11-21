// Storage key for local persistence
const STORAGE_KEY = 'nyc-directory-data-v1';
// Allowed statuses including the new archived state
const ALLOWED_STATUSES = ['draft', 'planned', 'completed', 'archived'];
const cardGrid = document.getElementById('cardGrid');
const categoryPills = document.getElementById('categoryPills');
const neighborhoodFilter = document.getElementById('neighborhoodFilter');
const budgetFilter = document.getElementById('budgetFilter');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const progressEl = document.getElementById('progress');

const detailPanel = document.getElementById('detailPanel');
const closeDetail = document.getElementById('closeDetail');
const detailDot = document.getElementById('detailDot');
const detailTitle = document.getElementById('detailTitle');
const detailMeta = document.getElementById('detailMeta');
const detailAddress = document.getElementById('detailAddress');
const mapsLink = document.getElementById('mapsLink');
const detailNotes = document.getElementById('detailNotes');
const detailTags = document.getElementById('detailTags');
const detailDates = document.getElementById('detailDates');
const statusActions = document.getElementById('statusActions');
const statusButtonTemplate = document.getElementById('statusButtonTemplate');

const addModal = document.getElementById('addModal');
const openAddModalBtn = document.getElementById('openAddModal');
const closeAddModalBtn = document.getElementById('closeAddModal');

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

const neighborhoodHints = [
  'Harlem',
  'Upper East Side',
  'Upper West Side',
  'Chelsea',
  'Tribeca',
  'Soho',
  'Midtown',
  'Midtown East',
  'Theater District',
  'Financial District',
  'Brooklyn',
  'Prospect Heights',
  'Meatpacking District',
  'Washington Heights',
  'Central Park',
  'Greenwich Village',
  'Lower East Side'
];

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

function normalizeStatus(status) {
  if (!status) return 'draft';
  const normalized = status.toLowerCase();
  return ALLOWED_STATUSES.includes(normalized) ? normalized : 'draft';
}

function enrichItem(item) {
  const emoji = item.emoji || categoryEmoji[item.category] || categoryEmoji.other;
  return {
    ...item,
    id: item.id || createId(),
    emoji,
    status: normalizeStatus(item.status),
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
  const filterSource = statusFilter.value === 'archived' ? items : items.filter((i) => i.status !== 'archived');
  const categories = ['all', ...new Set(filterSource.map((i) => i.category || 'other'))];
  categoryPills.innerHTML = '';
  categories.forEach((cat) => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (cat === activeCategory ? ' active' : '');
    const label = cat === 'all' ? 'All' : capitalize(cat);
    const dotClass = cat === 'all' ? 'category-all' : categoryClass(cat);
    pill.innerHTML = `<span class="pill-dot ${dotClass}"></span><span>${label}</span>`;
    pill.addEventListener('click', () => {
      activeCategory = cat;
      render();
    });
    categoryPills.appendChild(pill);
  });

  const prevNeighborhood = neighborhoodFilter.value || 'all';
  const neighborhoods = ['all', ...new Set(filterSource.map((i) => i.neighborhood).filter(Boolean))];
  neighborhoodFilter.innerHTML = neighborhoods
    .map((n) => `<option value="${n}">${n === 'all' ? 'All' : n}</option>`)
    .join('');
  neighborhoodFilter.value = neighborhoods.includes(prevNeighborhood) ? prevNeighborhood : 'all';

  const prevBudget = budgetFilter.value || 'all';
  const budgets = ['all', ...new Set(filterSource.map((i) => i.budget).filter(Boolean))];
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
    // Archived items are hidden unless explicitly requested
    if (status !== 'archived' && item.status === 'archived') return false;
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
  const activeItems = items.filter((i) => i.status !== 'archived');
  const total = activeItems.length;
  const completed = activeItems.filter((i) => i.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  progressEl.textContent = `Done ${completed}/${total} · ${percent}%`;
}

function renderCards() {
  const filtered = filterItems();
  cardGrid.innerHTML = '';
  if (!filtered.length) {
    cardGrid.innerHTML = '<p class="muted">Nothing here yet. Try another filter or add an item.</p>';
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    const location = splitVenueAddress(item.address);
    const status =
      item.status &&
      `<span class="badge status-${item.status}">${statusBadge[item.status] || ''} ${capitalize(item.status)}</span>`;
    card.innerHTML = `
      <div class="card-top">
        <span class="card-dot ${categoryClass(item.category)}"></span>
        <span class="card-neighborhood">${item.neighborhood || 'NYC'}</span>
      </div>
      <h3 class="card-title">${formatTitle(item)}</h3>
      <p class="card-venue">${location.venue}</p>
      <p class="card-address">${location.address}</p>
      ${status || ''}
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
  detailDot.className = `card-dot detail-dot ${categoryClass(item.category)}`;
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

function splitVenueAddress(address) {
  if (!address) return { venue: 'Venue coming soon', address: 'Add address' };
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { venue: 'Venue coming soon', address: 'Add address' };
  const venue = parts[0];
  const addressLine = parts.length > 1 ? parts.slice(1).join(', ') : address;
  return { venue, address: addressLine || venue };
}

function formatDates(item) {
  const parts = [item.dates, item.estimated_visit_time].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Add dates or timing';
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function categoryClass(category) {
  const safe = category || 'other';
  return `category-${safe}`;
}


function closeDetailPanel() {
  detailPanel.classList.remove('open');
  currentDetailItem = null;
}

closeDetail.addEventListener('click', closeDetailPanel);
detailPanel.addEventListener('click', (e) => {
  if (e.target === detailPanel) closeDetailPanel();
});

// Floating add-item modal controls
openAddModalBtn.addEventListener('click', () => {
  addModal.classList.add('open');
  addItemStatus.textContent = '';
  addName.focus();
});

closeAddModalBtn.addEventListener('click', () => {
  addModal.classList.remove('open');
});

addModal.addEventListener('click', (e) => {
  if (e.target === addModal) addModal.classList.remove('open');
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
  addModal.classList.remove('open');
});

// Attempt to auto-fill fields from a Google Maps link using public page metadata.
addMaps.addEventListener('change', () => handleMapsAutofill());
addMaps.addEventListener('blur', () => handleMapsAutofill());

async function handleMapsAutofill() {
  const url = addMaps.value.trim();
  if (!url || !url.includes('google.com/maps')) return;

  addItemStatus.textContent = 'Fetching place details from Google Maps...';
  const fallbackName = decodeQueryParam(url);
  let html = '';

  try {
    const response = await fetch(url);
    html = await response.text();
  } catch (error) {
    console.warn('Metadata fetch failed, using fallback query parsing.', error);
  }

  const metadata = parseMapsMetadata(html);
  const combinedText = [metadata.ogTitle, metadata.title, metadata.description, fallbackName]
    .filter(Boolean)
    .join(' • ');

  const derivedName = metadata.name || fallbackName || '';
  const derivedAddress = metadata.address || fallbackName || '';
  const derivedNeighborhood = guessNeighborhood(metadata.address || metadata.ogTitle || combinedText);
  const derivedCategory = guessCategory(combinedText);

  if (!addName.value) addName.value = derivedName;
  if (!addAddress.value && derivedAddress) addAddress.value = derivedAddress;
  if (!addNeighborhood.value && derivedNeighborhood) addNeighborhood.value = derivedNeighborhood;
  if (derivedCategory && addCategory.value === 'other') addCategory.value = derivedCategory;

  addItemStatus.textContent = derivedName
    ? `Autofilled from Maps: ${derivedName}`
    : 'Maps link parsed. Edit fields as needed.';
}

function decodeQueryParam(url) {
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q');
    return q ? decodeURIComponent(q.replace(/\+/g, ' ')) : '';
  } catch (error) {
    return '';
  }
}

function parseMapsMetadata(html) {
  if (!html) return {};
  const getMeta = (property) => {
    const regex = new RegExp(`<meta[^>]+${property}="([^"]+)"`, 'i');
    const match = html.match(regex);
    return match ? match[1] : '';
  };

  const ogTitle = getMeta('property="og:title"');
  const description = getMeta('property="og:description"');
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';

  const titleParts = ogTitle?.split('·').map((p) => p.trim()) || [];
  const name = titleParts[0] || title.replace(' - Google Maps', '').trim();
  const address = titleParts.find((p) => /\d{3,} /.test(p)) || description || '';

  return { ogTitle, title, description, name, address };
}

function guessNeighborhood(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const match = neighborhoodHints.find((hint) => lower.includes(hint.toLowerCase()));
  return match || '';
}

function guessCategory(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  if (/(restaurant|café|cafe|bistro|market)/.test(lower)) return 'restaurant';
  if (/(bar|cocktail|lounge)/.test(lower)) return 'bar';
  if (/(gallery|art space)/.test(lower)) return 'gallery';
  if (/museum/.test(lower)) return 'museum';
  if (/(theatre|theater|broadway|show)/.test(lower)) return 'show';
  return '';
}

loadData();
