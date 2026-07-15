/* ============================================================
   MARKET PULSE - Grains Hub
   Version: 2.1 - Fixed Table & Cards
   ============================================================ */

// ============================================================
// 1. CONFIGURATION
// ============================================================
const CONFIG = {
  DATA_URL: '/assets/data/stock.json?t=',
  REFRESH_INTERVAL: 60000,
  NEWS_INTERVAL: 8000,
  MAX_CARDS: 6,
};

// ============================================================
// 2. STATE
// ============================================================
let pulseData = [];
let filteredData = [];
let newsIndex = 0;
let currentFilter = 'all';
let currentSearch = '';
let currentSort = { key: null, dir: 'asc' };

const newsFeed = [
  "1509 Creamy Sella booking opens at $1040 C&F Dubai",
  "Irri 6 5% drops to $385 FOB Dubai – prompt shipment",
  "Sona Massori booking at $540 FOB Dubai",
  "Jebel Ali FCL arrivals: +20 containers this week",
  "Thai White 5% Broken: $485 FOB – 20ft ready",
  "1121 Sella Premium: AED 6.2/kg – Al Ras stock",
];

// ============================================================
// 3. HELPERS
// ============================================================
function getFlag(origin) {
  const o = origin.toLowerCase();
  if (o.includes('india')) return '🇮🇳';
  if (o.includes('pakistan')) return '🇵🇰';
  if (o.includes('thailand')) return '🇹🇭';
  if (o.includes('uae')) return '🇦🇪';
  return '🌍';
}

function getRowClass(item) {
  return item.isBooking ? 'row-booking' : 'row-local';
}

function getTrendArrow(change) {
  const val = parseFloat(change);
  if (isNaN(val) || val === 0) return '■';
  return val > 0 ? '▲' : '▼';
}

function getTrendClass(change) {
  const val = parseFloat(change);
  if (isNaN(val) || val === 0) return 'trend-flat';
  return val > 0 ? 'trend-up' : 'trend-down';
}

function computeMarketMood(data) {
  let up = 0, down = 0;
  data.forEach(p => {
    const val = parseFloat(p.trendChange);
    if (val > 0) up++;
    else if (val < 0) down++;
  });
  const total = up + down;
  if (!total) return 'Market Mood: —';
  const upPct = Math.round((up / total) * 100);
  const downPct = 100 - upPct;
  return `Market Mood: ${upPct}% Up • ${downPct}% Down`;
}

// ============================================================
// 4. DATA LOADING
// ============================================================
async function loadPulseData() {
  const tbody = document.getElementById('pulse-table');
  const lastUpdated = document.getElementById('last-updated');
  const cardsContainer = document.getElementById('priceCards');

  try {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#a07c3b;">⏳ Loading live prices...</td></tr>';
    }

    const res = await fetch(CONFIG.DATA_URL + Date.now());
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();

    if (!data || data.length === 0) {
      throw new Error('No data in stock.json');
    }

    pulseData = data.map(item => {
      const trendChange = (Math.random() * 6 - 3).toFixed(1);
      const trendChangeNum = parseFloat(trendChange);
      const isBooking = String(item.price).toUpperCase().includes('USD');
      const numericPrice = parseFloat(item.price);

      if (isBooking) {
        return {
          product: item.name,
          origin: item.origin,
          flag: getFlag(item.origin),
          isBooking: true,
          priceRaw: numericPrice,
          priceDisplay: `${numericPrice} USD / MT`,
          kgPrice: null,
          trendChange: trendChangeNum,
          trendClass: getTrendClass(trendChangeNum),
          trendArrow: getTrendArrow(trendChangeNum),
          supplier: item.stock || 'Booking',
          badge: item.badge || 'Pre-Booking',
          size: item.size || 'MT',
          image: item.img || null,
        };
      }

      const priceAED = numericPrice;
      const sizeKG = parseInt(item.size);
      const kgPrice = sizeKG ? (priceAED / sizeKG).toFixed(2) : '-';

      return {
        product: item.name,
        origin: item.origin,
        flag: getFlag(item.origin),
        isBooking: false,
        priceRaw: priceAED,
        priceDisplay: `${priceAED.toFixed(2)} AED`,
        kgPrice: kgPrice,
        trendChange: trendChangeNum,
        trendClass: getTrendClass(trendChangeNum),
        trendArrow: getTrendArrow(trendChangeNum),
        supplier: item.stock || 'In Stock',
        badge: item.badge || 'Verified Supplier',
        size: item.size || 'kg',
        image: item.img || null,
      };
    });

    console.log('✅ Loaded ' + pulseData.length + ' products from stock.json');
    applyFiltersAndRender();
    updateLastUpdated();
    updateMarketMood();

  } catch (e) {
    console.error('Pulse data load failed:', e);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#e76f51;">⚠️ Failed to load prices. Retrying...</td></tr>';
    }
    setTimeout(loadPulseData, 5000);
  }
}

// ============================================================
// 5. FILTERING & SEARCH
// ============================================================
function applyFiltersAndRender() {
  filteredData = pulseData.filter(item => {
    const matchesFilter = currentFilter === 'all' || item.origin === currentFilter;
    const matchesSearch = item.product.toLowerCase().includes(currentSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (currentSort.key) {
    const { key, dir } = currentSort;
    filteredData = filteredData.slice().sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  renderCards(filteredData);
  renderTable(filteredData);
  updateRowCount(filteredData.length);
}

// ============================================================
// 6. RENDER CARDS (Fixed Size)
// ============================================================
function renderCards(data) {
  const container = document.getElementById('priceCards');
  if (!container) return;

  const topProducts = data.slice(0, CONFIG.MAX_CARDS);

  if (topProducts.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">
        No products found matching your criteria.
      </div>
    `;
    return;
  }

  container.innerHTML = topProducts.map(item => {
    const isBooking = item.isBooking;
    const price = item.priceDisplay;
    const trendValue = parseFloat(item.trendChange);
    const trendText = isNaN(trendValue) ? '—' : (trendValue > 0 ? `▲ ${Math.abs(trendValue).toFixed(1)}%` : (trendValue < 0 ? `▼ ${Math.abs(trendValue).toFixed(1)}%` : '■ 0%'));
    const trendClass = item.trendClass;

    return `
      <div class="price-card" data-origin="${item.origin}">
        <div class="product-header">
          <span class="product-name">${item.product}</span>
          <span class="flag">${item.flag}</span>
        </div>
        <div class="price">${price} <small>/${item.size || 'MT'}</small></div>
        <div class="price-details">
          <span class="trend ${trendClass}">${trendText}</span>
          <span style="font-size:13px;color:#666;">${isBooking ? '📋 Booking' : '✅ In Stock'}</span>
        </div>
        <div class="stock-info">
          <span>📦 ${item.supplier}</span>
          <span class="badge">${item.badge}</span>
        </div>
        <a href="https://wa.me/971585521976?text=Hi%20Alliya%20-%20I%20want%20${encodeURIComponent(item.product)}" 
           class="book-btn" target="_blank">
          <i class="fab fa-whatsapp"></i> Book Now
        </a>
      </div>
    `;
  }).join('');
}

// ============================================================
// 7. RENDER TABLE (FIXED - using pulse-table ID)
// ============================================================
function renderTable(data) {
  const tbody = document.getElementById('pulse-table');
  if (!tbody) {
    console.warn('Table body not found');
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#999;">No data available. Please check stock.json</td></tr>';
    return;
  }

  console.log('✅ Rendering ' + data.length + ' rows in table');

  tbody.innerHTML = data.map(item => {
    const rowClass = getRowClass(item);
    const trendValue = parseFloat(item.trendChange);
    const trendDisplay = isNaN(trendValue) ? '0.0%' : `${Math.abs(trendValue).toFixed(1)}%`;

    const priceCell = item.isBooking
      ? `<span class="price-main">${item.priceDisplay}</span> <span class="badge badge-booking">BOOKING</span>`
      : `<span class="price-main">${item.priceDisplay}</span><br><span class="price-sub">${item.kgPrice || '-'} AED/kg</span>`;

    return `
      <tr class="${rowClass}" data-origin="${item.origin}" data-name="${item.product}">
        <td class="col-product">
          <strong>${item.product}</strong><br>
          <span class="origin-flag">${item.flag}</span>
          <span class="origin-text">${item.origin}</span>
        </td>
        <td class="col-price">${priceCell}</td>
        <td class="col-trend ${item.trendClass}">
          <span class="trend-arrow">${item.trendArrow}</span>
          <span class="trend-value">${trendDisplay}</span>
        </td>
        <td class="col-supplier">
          <span class="supplier-main">${item.supplier}</span><br>
          <span class="badge ${item.isBooking ? 'badge-booking' : 'badge-supplier'}">${item.badge}</span>
        </td>
        <td class="col-meta">
          <span class="meta-verified">✔️ Verified</span>
        </td>
        <td class="col-action">
          <a href="https://wa.me/971585521976?text=Hi%20Alliya%20-%20I%20want%20${encodeURIComponent(item.product)}" 
             class="whatsapp-link" target="_blank">
            <i class="fab fa-whatsapp"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// 8. NEWS TICKER
// ============================================================
function renderNewsFeed() {
  const ticker = document.getElementById('ticker-text');
  if (!ticker) return;

  ticker.innerHTML = newsFeed.map((n, i) =>
    `<span style="opacity: ${i === newsIndex ? '1' : '0.5'};">${n}</span>`
  ).join(' • ');

  newsIndex = (newsIndex + 1) % newsFeed.length;
}

// ============================================================
// 9. UPDATES
// ============================================================
function updateLastUpdated() {
  const now = new Date();
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dubai'
  };
  const el = document.getElementById('last-updated');
  if (el) {
    el.textContent = now.toLocaleDateString('en-GB', options) + ' GST';
  }
}

function updateMarketMood() {
  const el = document.getElementById('market-mood');
  if (!el) return;
  el.textContent = computeMarketMood(pulseData);
}

function updateRowCount(count) {
  const el = document.getElementById('rowCount');
  if (el) {
    el.textContent = count + ' product' + (count !== 1 ? 's' : '');
  }
}

// ============================================================
// 10. SORTING
// ============================================================
function initSorting() {
  document.querySelectorAll('[data-sort]').forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const key = header.dataset.sort;
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.key = key;
        currentSort.dir = 'asc';
      }
      applyFiltersAndRender();
    });
  });
}

// ============================================================
// 11. FILTER SETUP
// ============================================================
function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('searchInput');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      applyFiltersAndRender();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function() {
      currentSearch = this.value;
      applyFiltersAndRender();
    });
  }
}

// ============================================================
// 12. ASK ALLIYA BUTTON
// ============================================================
function setupAlliyaButton() {
  const btn = document.getElementById('askAlliyaBtn');
  if (btn) {
    btn.addEventListener('click', function() {
      if (window.Alliya && typeof window.Alliya.open === 'function') {
        window.Alliya.open();
      } else {
        window.open('https://wa.me/971585521976?text=Hi%20Alliya%2C%20I%20need%20help%20with%20grain%20prices', '_blank');
      }
    });
  }
}

// ============================================================
// 13. INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Market Pulse initializing...');
  loadPulseData();
  setupFilters();
  initSorting();
  setupAlliyaButton();

  setInterval(renderNewsFeed, CONFIG.NEWS_INTERVAL);
  renderNewsFeed();

  setInterval(loadPulseData, CONFIG.REFRESH_INTERVAL);

  window.filterPulse = function(filter) {
    currentFilter = filter;
    applyFiltersAndRender();
  };

  console.log('✅ Market Pulse v2.1 loaded');
});
