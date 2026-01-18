// marketPulse.js – Premium Market Pulse Engine (stock.json-powered for now)

let pulseData = [];
let newsIndex = 0;

/* -----------------------------------------
   LOAD MARKET PULSE DATA
----------------------------------------- */
async function loadPulseData() {
  const tbody = document.getElementById('pulse-table');
  const lastUpdated = document.getElementById('last-updated');

  if (!tbody) return;

  try {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="pulse-loading">
          Loading live prices…
        </td>
      </tr>
    `;
    if (lastUpdated) lastUpdated.textContent = 'Updating…';

    const res = await fetch('/assets/data/stock.json?t=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load stock.json');

    const data = await res.json();

    pulseData = data.map(item => {
      const trendChange = (Math.random() * 6 - 3).toFixed(1); // -3% to +3%
      const trend = trendChange >= 0 ? 'up' : 'down';

      const numericPrice = parseFloat(item.price);
      const kgPrice = isNaN(numericPrice)
        ? '-'
        : (numericPrice / parseInt(item.size)).toFixed(2);

      return {
        product: item.name,
        origin: item.origin,
        price: `${item.price} • ${kgPrice} AED/kg`,
        trend: `
          <span class="trend ${trend}" style="animation: pulse 1.5s infinite;">
            ${trend} ${Math.abs(trendChange)}%
          </span>
        `,
        supplier: `${item.stock} • Verified`
      };
    });

    renderTable(getActiveFilter());
    updateLastUpdated();
  } catch (err) {
    console.error('Pulse load error:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="pulse-error">
          Failed to load prices. Retrying…
        </td>
      </tr>
    `;
    setTimeout(loadPulseData, 5000);
  }
}

/* -----------------------------------------
   NEWS TICKER
----------------------------------------- */
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

  ticker.innerHTML = newsFeed
    .map((n, i) => `<span style="opacity:${i === newsIndex ? '1' : '0.6'};">${n}</span>`)
    .join(' • ');

  newsIndex = (newsIndex + 1) % newsFeed.length;
}

/* -----------------------------------------
   RENDER TABLE
----------------------------------------- */
function renderTable(filter = "All") {
  const tbody = document.getElementById('pulse-table');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filtered = pulseData.filter(item =>
    filter === "All" || item.origin === filter
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="pulse-empty">
          No data for this origin.
        </td>
      </tr>
    `;
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

/* -----------------------------------------
   FILTER HANDLER
----------------------------------------- */
function getActiveFilter() {
  const active = document.querySelector('.tab-button.active');
  return active ? active.dataset.filter : "All";
}

window.filterPulse = function (filter) {
  renderTable(filter);
};

/* -----------------------------------------
   TIMESTAMP
----------------------------------------- */
function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;

  const now = new Date();
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Dubai'
  };

  el.textContent = now.toLocaleDateString('en-GB', options) + ' GST';
}

/* -----------------------------------------
   INIT
----------------------------------------- */
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

  // News ticker
  setInterval(renderNewsFeed, 8000);
  renderNewsFeed();
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
  .pulse-loading, .pulse-error, .pulse-empty {
    text-align:center; padding:30px; color:#a07c3b;
  }
`;
document.head.appendChild(style);
