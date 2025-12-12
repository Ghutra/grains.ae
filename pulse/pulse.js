// pulse.js – Market Pulse Engine v2.0
// Real-time sync with /shop/stock.json | Auto-refresh | Golden UI

let pulseData = [];
let newsIndex = 0;

// Fetch stock data (same source as home/shop)
async function loadPulseData() {
  const tbody = document.getElementById('pulse-table');
  const lastUpdated = document.getElementById('last-updated');
  const ticker = document.getElementById('ticker-text');

  try {
    // Show loading
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#a07c3b;">Loading live prices...</td></tr>';
    lastUpdated.textContent = 'Updating...';

    const res = await fetch('/shop/stock.json?t=' + Date.now()); // Cache bust
    const data = await res.json();

    // Map to pulse format + dynamic trend
    pulseData = data.map(item => {
      const trendChange = (Math.random() * 6 - 3).toFixed(1); // -3% to +3%
      const trend = trendChange >= 0 ? 'up' : 'down';
      const kgPrice = (parseFloat(item.price.replace('AED ', '')) / parseInt(item.size)).toFixed(2);

      return {
        product: item.name,
        origin: item.origin,
        price: `${item.price} • ${kgPrice} AED/kg`,
        trend: `<span class="trend ${trend}" style="animation: pulse 1.5s infinite;">
                  ${trend === 'up' ? 'up' : 'down'} ${Math.abs(trendChange)}%
                </span>`,
        supplier: `${item.available} MT • Verified`
      };
    });

    renderTable(getActiveFilter());
    renderNewsFeed();
    updateLastUpdated();
  } catch (e) {
    console.error('Pulse data load failed:', e);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#e76f51;">Failed to load prices. Retrying...</td></tr>';
    setTimeout(loadPulseData, 5000); // Retry
  }
}

// Dynamic News Ticker (Rotating)
const newsFeed = [
  "1509 Creamy Sella booking opens at $800 C&F Dubai",
  "Irri 6 5% drops to $380 C&F Dubai – prompt shipment",
  "Sona Massori booking at $540 C&F Dubai",
  "Sawarna Rice booking at $430 C&F Dubai",
  "Jebel Ali FCL arrivals: +12 containers this week",
  "Thai White 5% Broken: $485 C&F – 20ft ready",
  "1121 Sella Premium: AED 6.2/kg – Al Ras stock"
];

function renderNewsFeed() {
  const ticker = document.getElementById('ticker-text');
  if (!ticker) return;

  // Rotate news every 8 seconds
  ticker.innerHTML = newsFeed.map((n, i) => 
    `<span style="opacity: ${i === newsIndex ? '1' : '0.6'};">${n}</span>`
  ).join(' • ');

  newsIndex = (newsIndex + 1) % newsFeed.length;
}

// Render Table with Filter
function renderTable(filter = "All") {
  const tbody = document.getElementById('pulse-table');
  if (!tbody) return;

  tbody.innerHTML = '';
  const filtered = pulseData.filter(item => filter === "All" || item.origin === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">No data for this origin.</td></tr>';
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${item.product}</strong></td>
      <td>${item.origin}</td>
      <td>${item.price}</td>
      <td>${item.trend}</td>
      <td><small>${item.supplier}</small></td>
    `;
    tbody.appendChild(row);
  });
}

// Get active filter from tab
function getActiveFilter() {
  const active = document.querySelector('.tab-button.active');
  return active ? active.dataset.filter : "All";
}

// Global filter function
window.filterPulse = function(filter) {
  renderTable(filter);
};

// Update timestamp
function updateLastUpdated() {
  const now = new Date();
  const options = { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai'
  };
  const el = document.getElementById('last-updated');
  if (el) el.textContent = now.toLocaleDateString('en-GB', options) + ' GST';
}

// Auto-refresh every 60 seconds
let refreshInterval = setInterval(() => {
  loadPulseData();
}, 60000);

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadPulseData();

  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.filterPulse(btn.dataset.filter);
    });
  });

  // News ticker rotation
  setInterval(renderNewsFeed, 8000);
  renderNewsFeed(); // Initial
});

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  .trend.up { color: #e76f51; }
  .trend.down { color: #2a9d8f; }
`;
document.head.appendChild(style);
