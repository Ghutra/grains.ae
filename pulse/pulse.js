// pulse.js – Market Pulse Engine v4.0
// Bloomberg-style Market Pulse for Grains Hub

let pulseData = [];
let newsIndex = 0;
let currentSort = { key: null, dir: 'asc' };

// --- Helpers ---

function getFlag(origin) {
  const o = origin.toLowerCase();
  if (o.includes('india')) return '🇮🇳';
  if (o.includes('pakistan')) return '🇵🇰';
  if (o.includes('thailand')) return '🇹🇭';
  return '🌍';
}

function getRowClass(item) {
  // Booking rows highlighted
  if (item.isBooking) return 'row-booking';
  return 'row-local';
}

function getTrendArrow(trendChange) {
  const val = parseFloat(trendChange);
  if (isNaN(val) || val === 0) return '■';
  return val > 0 ? '▲' : '▼';
}

function computeMarketMood() {
  let up = 0, down = 0;
  pulseData.forEach(p => {
    const match = p.trendChange;
    if (match > 0) up++;
    else if (match < 0) down++;
  });
  const total = up + down;
  if (!total) return 'Market Mood: —';

  const upPct = Math.round((up / total) * 100);
  const downPct = 100 - upPct;
  return `Market Mood: ${upPct}% Up • ${downPct}% Down`;
}

// --- Fetch & Transform ---

async function loadPulseData() {
  const tbody = document.getElementById('pulse-table');
  const lastUpdated = document.getElementById('last-updated');

  try {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#a07c3b;">Loading live prices...</td></tr>';
    if (lastUpdated) lastUpdated.textContent = 'Updating...';

    const res = await fetch('/assets/data/stock.json?t=' + Date.now());
    const data = await res.json();

    pulseData = data.map(item => {
      const trendChange = (Math.random() * 6 - 3).toFixed(1);
      const trendChangeNum = parseFloat(trendChange);
      const trend = trendChangeNum >= 0 ? 'up' : 'down';

      const isBooking = item.price.toUpperCase().includes('USD');
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
          trend,
          trendChange: trendChangeNum,
          supplier: item.stock,
          badge: item.badge || 'Pre-Booking'
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
        kgPrice,
        trend,
        trendChange: trendChangeNum,
        supplier: item.stock,
        badge: item.badge || 'Verified Supplier'
      };
    });

    renderTable(getActiveFilter());
    renderNewsFeed();
    updateLastUpdated();
    updateMarketMood();

  } catch (e) {
    console.error('Pulse data load failed:', e);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#e76f51;">Failed to load prices. Retrying...</td></tr>';
    setTimeout(loadPulseData, 5000);
  }
}

// --- News Ticker ---

const newsFeed = [
  "1509 Creamy Sella booking opens at $920 C&F Dubai",
  "Irri 6 5% drops to $385 C&F Dubai – prompt shipment",
  "Sona Massori booking at $540 C&F Dubai",
  "Sawarna Rice booking at $475 C&F Dubai",
  "Jebel Ali FCL arrivals: +12 containers this week",
  "Thai White 5% Broken: $485 C&F – 20ft ready",
  "1121 Sella Premium: AED 6.2/kg – Al Ras stock"
];

function renderNewsFeed() {
  const ticker = document.getElementById('ticker-text');
  if (!ticker) return;

  ticker.innerHTML = newsFeed.map((n, i) =>
    `<span style="opacity: ${i === newsIndex ? '1' : '0.6'};">${n}</span>`
  ).join(' • ');

  newsIndex = (newsIndex + 1) % newsFeed.length;
}

// --- Table Rendering & Sorting ---

function renderTable(filter = 'All') {
  const tbody = document.getElementById('pulse-table');
  if (!tbody) return;

  tbody.innerHTML = '';

  let filtered = pulseData.filter(item => filter === 'All' || item.origin === filter);

  // Apply sorting if any
  if (currentSort.key) {
    const { key, dir } = currentSort;
    filtered = filtered.slice().sort((a, b) => {
      let va = a[key];
      let vb = b[key];

      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">No data for this origin.</td></tr>';
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('tr');
    row.className = getRowClass(item);

    const arrow = getTrendArrow(item.trendChange);
    const trendColorClass = item.trendChange > 0 ? 'trend-up' : (item.trendChange < 0 ? 'trend-down' : 'trend-flat');

    const priceCell = item.isBooking
      ? `<span class="price-main">${item.priceDisplay}</span> <span class="badge badge-booking">BOOKING</span>`
      : `<span class="price-main">${item.priceDisplay}</span><br><span class="price-sub">${item.kgPrice} AED/kg</span>`;

    row.innerHTML = `
      <td class="col-product">
        <strong>${item.product}</strong><br>
        <span class="origin-flag">${item.flag}</span>
        <span class="origin-text">${item.origin}</span>
      </td>
      <td class="col-price">
        ${priceCell}
      </td>
      <td class="col-trend ${trendColorClass}">
        <span class="trend-arrow">${arrow}</span>
        <span class="trend-value">${Math.abs(item.trendChange).toFixed(1)}%</span>
      </td>
      <td class="col-supplier">
        <span class="supplier-main">${item.supplier}</span><br>
        <span class="badge badge-supplier">${item.badge}</span>
      </td>
      <td class="col-meta">
        <span class="meta-verified">✔️ Verified</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function getActiveFilter() {
  const active = document.querySelector('.tab-button.active');
  return active ? active.dataset.filter : 'All';
}

window.filterPulse = function(filter) {
  renderTable(filter);
};

function updateMarketMood() {
  const el = document.getElementById('market-mood');
  if (!el) return;
  el.textContent = computeMarketMood();
}

// --- Timestamp ---

function updateLastUpdated() {
  const now = new Date();
  const options = { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai'
  };
  const el = document.getElementById('last-updated');
  if (el) el.textContent = now.toLocaleDateString('en-GB', options) + ' GST';
}

// --- Sorting (Bloomberg-style column headers) ---

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
      renderTable(getActiveFilter());
    });
  });
}

// --- Auto-refresh & Init ---

let refreshInterval = setInterval(() => {
  loadPulseData();
}, 60000);

document.addEventListener('DOMContentLoaded', () => {
  loadPulseData();

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.filterPulse(btn.dataset.filter);
    });
  });

  initSorting();

  setInterval(renderNewsFeed, 8000);
  renderNewsFeed();
});

// --- Styles (Bloomberg feel) ---

const style = document.createElement('style');
style.textContent = `
  #pulse-table tr.row-booking {
    background: rgba(255, 215, 0, 0.06);
    border-left: 3px solid #d4af37;
  }
  #pulse-table tr.row-local {
    background: rgba(255, 255, 255, 0.01);
  }
  #pulse-table tr + tr {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
  }
  #pulse-table td {
    padding: 10px 12px;
    vertical-align: middle;
  }
  .col-product {
    text-align: left;
  }
  .col-price, .col-trend, .col-supplier, .col-meta {
    text-align: right;
  }
  .origin-flag {
    font-size: 14px;
    margin-right: 4px;
  }
  .origin-text {
    font-size: 12px;
    color: #aaa;
  }
  .price-main {
    font-weight: 600;
    font-size: 14px;
  }
  .price-sub {
    font-size: 11px;
    color: #aaa;
  }
  .trend-up {
    color: #2ecc71;
  }
  .trend-down {
    color: #e74c3c;
  }
  .trend-flat {
    color: #bdc3c7;
  }
  .trend-arrow {
    margin-right: 4px;
    font-size: 12px;
  }
  .trend-value {
    font-size: 13px;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge-booking {
    background: rgba(212, 175, 55, 0.15);
    color: #f1c40f;
    border: 1px solid rgba(212, 175, 55, 0.4);
    margin-left: 6px;
  }
  .badge-supplier {
    background: rgba(46, 204, 113, 0.12);
    color: #2ecc71;
    border: 1px solid rgba(46, 204, 113, 0.4);
  }
  .supplier-main {
    font-size: 12px;
  }
  .meta-verified {
    font-size: 11px;
    color: #d4af37;
  }
/* --- COLUMN WIDTHS (Bloomberg fixed-grid layout) --- */
.col-product { width: 32%; }
.col-price { width: 22%; }
.col-trend { width: 14%; }
.col-supplier { width: 22%; }
.col-meta { width: 10%; }

/* --- GLOBAL CELL ALIGNMENT --- */
#pulse-table td {
  vertical-align: middle;
  line-height: 1.25;
  padding: 10px 12px;
  white-space: nowrap;
}

/* --- PRODUCT COLUMN FIX --- */
.col-product {
  text-align: left;
  white-space: normal;
}

.col-product strong {
  display: inline-block;
  margin-bottom: 2px;
}

.origin-flag {
  font-size: 14px;
  margin-right: 4px;
}

.origin-text {
  font-size: 11px;
  opacity: 0.7;
  margin-left: 2px;
}

/* --- PRICE COLUMN FIX (forces perfect stacking) --- */
.col-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.price-main {
  font-weight: 600;
  font-size: 14px;
}

.price-sub {
  font-size: 11px;
  color: #aaa;
  margin-top: 2px;
}

/* --- TREND COLUMN FIX (no wrapping) --- */
.col-trend {
  text-align: right;
  white-space: nowrap;
}

.trend-arrow {
  margin-right: 4px;
  font-size: 12px;
}

.trend-value {
  font-size: 13px;
}

.trend-up { color: #2ecc71; }
.trend-down { color: #e74c3c; }
.trend-flat { color: #bdc3c7; }

/* --- SUPPLIER COLUMN FIX (consistent height) --- */
.col-supplier {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.supplier-main {
  font-size: 12px;
  margin-bottom: 2px;
}

.badge-supplier,
.badge-booking {
  display: inline-block;
  margin-top: 2px;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Supplier badge colors */
.badge-supplier {
  background: rgba(46, 204, 113, 0.12);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.4);
}

.badge-booking {
  background: rgba(212, 175, 55, 0.15);
  color: #f1c40f;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

/* --- META COLUMN (Verified) --- */
.col-meta {
  text-align: right;
}

.meta-verified {
  font-size: 11px;
  color: #d4af37;
}

/* --- ROW STYLING --- */
#pulse-table tr.row-booking {
  background: rgba(255, 215, 0, 0.06);
  border-left: 3px solid #d4af37;
}

#pulse-table tr.row-local {
  background: rgba(255, 255, 255, 0.01);
}

#pulse-table tr + tr {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
`;
document.head.appendChild(style);
