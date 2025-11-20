const STORAGE_KEY = 'nyc-directory-data-v1';
const ITINERARY_KEY = 'nyc-directory-itinerary-v1';
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
const addToItineraryBtn = document.getElementById('addToItinerary');

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatLog = document.getElementById('chatLog');

const itineraryList = document.getElementById('itineraryList');
const travelModeSelect = document.getElementById('travelMode');
const optimizeRoute = document.getElementById('optimizeRoute');
const generateRouteBtn = document.getElementById('generateRoute');
const routeStatus = document.getElementById('routeStatus');

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
let itinerary = [];
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
      loadItinerary();
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
    loadItinerary();
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

function loadItinerary() {
  try {
    const saved = JSON.parse(localStorage.getItem(ITINERARY_KEY) || '[]');
    itinerary = saved.filter((id) => items.some((item) => item.id === id));
  } catch (error) {
    console.error('Unable to load itinerary', error);
    itinerary = [];
  }
  renderItinerary();
}

function persistItinerary() {
  localStorage.setItem(ITINERARY_KEY, JSON.stringify(itinerary));
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
  renderItinerary();
}

function addItemToItinerary(item) {
  if (!item || itinerary.includes(item.id)) return;
  itinerary.push(item.id);
  persistItinerary();
  renderItinerary();
  appendChatBubble(`Added “${formatTitle(item)}” to the itinerary.`, 'assistant');
  addToItineraryBtn.disabled = true;
}

function renderItinerary() {
  itineraryList.innerHTML = '';

  if (!itinerary.length) {
    itineraryList.innerHTML = '<p class="muted">No stops yet. Add a card to begin planning.</p>';
    routeStatus.textContent = '';
    return;
  }

  itinerary.forEach((id, index) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const row = document.createElement('div');
    row.className = 'itinerary-item';
    row.innerHTML = `
      <div>
        <strong>${item.emoji} ${formatTitle(item)}</strong>
        <p class="itinerary-meta">${[item.neighborhood, item.budget, item.subcategory]
          .filter(Boolean)
          .join(' • ')}</p>
      </div>
      <div class="itinerary-actions">
        <button class="btn ghost" aria-label="Move up">▲</button>
        <button class="btn ghost" aria-label="Move down">▼</button>
        <button class="btn" aria-label="Remove">Remove</button>
      </div>
    `;

    const [upBtn, downBtn, removeBtn] = row.querySelectorAll('button');
    upBtn.disabled = index === 0;
    downBtn.disabled = index === itinerary.length - 1;
    upBtn.addEventListener('click', () => moveStop(id, -1));
    downBtn.addEventListener('click', () => moveStop(id, 1));
    removeBtn.addEventListener('click', () => removeFromItinerary(id));
    itineraryList.appendChild(row);
  });
}

function moveStop(id, delta) {
  const index = itinerary.indexOf(id);
  if (index === -1) return;
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= itinerary.length) return;
  const updated = [...itinerary];
  const [entry] = updated.splice(index, 1);
  updated.splice(newIndex, 0, entry);
  itinerary = updated;
  persistItinerary();
  renderItinerary();
}

function removeFromItinerary(id) {
  itinerary = itinerary.filter((stop) => stop !== id);
  persistItinerary();
  renderItinerary();
  if (currentDetailItem && currentDetailItem.id === id) {
    addToItineraryBtn.disabled = false;
  }
}

function generateRouteLink(stops, travelMode, optimize) {
  if (!stops.length) return '';
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${stops[0]}`;
  }

  const [origin, ...rest] = stops;
  const destination = rest.pop();
  const waypointPrefix = optimize ? 'optimize:true|' : '';
  const waypointBody = rest.join('|');
  const waypoints = rest.length ? `${waypointPrefix}${waypointBody}` : '';
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: travelMode
  });
  if (waypoints) params.set('waypoints', waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function generateRoute() {
  const stops = itinerary
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => encodeURIComponent(item.maps_link || item.address || item.name));

  const link = generateRouteLink(stops, travelModeSelect.value, optimizeRoute.checked);
  if (!link) {
    routeStatus.textContent = 'Add at least one stop to generate a route.';
    return;
  }
  routeStatus.textContent = optimizeRoute.checked
    ? 'Route opens in Google Maps with optimized stop order when supported.'
    : 'Route opens in Google Maps using your chosen order.';
  window.open(link, '_blank');
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

  addToItineraryBtn.disabled = itinerary.includes(item.id);
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

function appendChatBubble(text, role = 'assistant') {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function parseChatMessage(raw) {
  const text = raw.trim();
  if (!text) return null;
  const base = {
    name: '',
    category: 'other',
    status: 'draft',
    neighborhood: '',
    address: '',
    budget: '',
    notes: '',
    tags: [],
    maps_link: '',
    dates: '',
    estimated_visit_time: '',
    subcategory: ''
  };

  const parts = text.split(/;|\n/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;

  parts.forEach((part) => {
    const [rawKey, ...rest] = part.split(':');
    if (rest.length) {
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(':').trim();
      switch (key) {
        case 'name':
        case 'title':
          base.name = value;
          break;
        case 'artist':
          base.artist = value;
          break;
        case 'category':
          base.category = value.toLowerCase();
          break;
        case 'subcategory':
          base.subcategory = value;
          break;
        case 'neighborhood':
          base.neighborhood = value;
          break;
        case 'address':
          base.address = value;
          break;
        case 'maps':
        case 'map':
        case 'maps_link':
          base.maps_link = value;
          break;
        case 'budget':
          base.budget = value;
          break;
        case 'status':
          base.status = value.toLowerCase();
          break;
        case 'notes':
          base.notes = value;
          break;
        case 'dates':
          base.dates = value;
          break;
        case 'time':
        case 'estimated_visit_time':
          base.estimated_visit_time = value;
          break;
        case 'tags':
          base.tags = value.split(',').map((t) => t.trim()).filter(Boolean);
          break;
        case 'emoji':
          base.emoji = value;
          break;
        default:
          break;
      }
    } else if (!base.name) {
      base.name = part;
    }
  });

  return base.name ? base : null;
}

function closeDetailPanel() {
  detailPanel.classList.remove('open');
  currentDetailItem = null;
}

closeDetail.addEventListener('click', closeDetailPanel);
detailPanel.addEventListener('click', (e) => {
  if (e.target === detailPanel) closeDetailPanel();
});

addToItineraryBtn.addEventListener('click', () => {
  if (currentDetailItem) addItemToItinerary(currentDetailItem);
});

[neighborhoodFilter, budgetFilter, statusFilter].forEach((select) => {
  select.addEventListener('change', render);
});

searchInput.addEventListener('input', () => {
  renderCards();
  renderProgress();
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  appendChatBubble(message, 'user');
  const parsed = parseChatMessage(message);
  if (!parsed) {
    appendChatBubble(
      'Sorry, I could not understand that. Try "name: Place; category: restaurant; neighborhood: Chelsea; budget: $$; status: planned".',
      'assistant'
    );
    return;
  }
  const newItem = enrichItem(parsed);
  items = [newItem, ...items];
  persist();
  render();
  appendChatBubble(`Added “${formatTitle(newItem)}” (${capitalize(newItem.category)}).`, 'assistant');
  chatInput.value = '';
});

generateRouteBtn.addEventListener('click', generateRoute);

loadData();
