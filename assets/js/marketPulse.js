/* ============================================================
   MARKET PULSE - Grains Hub
   Version: 3.0 - LADY STARK
   ------------------------------------------------------------
   Commercially safe Pulse engine.

   Design:
   stock.json
      -> normalizeProduct()
      -> price-basis engine
      -> filters / cards / table
      -> Shop + Alliya can consume the same canonical semantics

   IMPORTANT:
   - Never treats bag count as MT.
   - Never treats AED/package price as AED/MT.
   - Never invents freight, FOB, CIF or market movement.
   - Booking/local stock are explicit states when supplied; legacy
     stock.json formats remain supported.
   ============================================================ */

const CONFIG = {
  DATA_URL: '/assets/data/stock.json?t=',
  REFRESH_INTERVAL: 60000,
  MAX_CARDS: 6,
  NEWS_INTERVAL: 8000,
  WHATSAPP: '971585521976',
  DEFAULT_BASIS: 'DUBAI_STOCK',
  DEFAULT_PACKING: 'STANDARD_PP',
  DEBUG: false
};

const PULSE_BASIS = {
  FOB_ORIGIN: 'FOB_ORIGIN',
  CIF_DUBAI: 'CIF_DUBAI',
  DUBAI_STOCK: 'DUBAI_STOCK'
};

const PACKING = {
  STANDARD_PP: 'STANDARD_PP',
  CUSTOM_NONWOVEN: 'CUSTOM_NONWOVEN'
};

let pulseData = [];
let filteredData = [];
let newsIndex = 0;

let currentFilter = 'all';
let currentSearch = '';
let currentSort = { key: null, dir: 'asc' };

let currentBasis = CONFIG.DEFAULT_BASIS;
let currentPacking = CONFIG.DEFAULT_PACKING;

/* ------------------------------------------------------------
   1. SMALL UTILITIES
   ------------------------------------------------------------ */

function log(...args) {
  if (CONFIG.DEBUG) console.log('[Pulse]', ...args);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseWeightKg(size) {
  if (size === null || size === undefined) return null;
  const s = String(size).toLowerCase().replace(/,/g, '');

  // "4x10=40kg", "10 x 4 = 40 kg", "40kg"
  const direct = s.match(/(?:=|\b)(\d+(?:\.\d+)?)\s*kg\b/);
  if (direct) return Number(direct[1]);

  // If only a plain weight is supplied, accept it as kg.
  const plain = s.match(/^(\d+(?:\.\d+)?)\s*kg?$/);
  if (plain) return Number(plain[1]);

  return null;
}

function getFlag(origin) {
  const o = String(origin || '').toLowerCase();
  if (o.includes('india')) return '🇮🇳';
  if (o.includes('pakistan')) return '🇵🇰';
  if (o.includes('thailand')) return '🇹🇭';
  if (o.includes('uae')) return '🇦🇪';
  return '🌍';
}

function whatsappUrl(product) {
  const text = `Hi Alliya - I want ${product}`;
  return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function getTrendArrow(change) {
  const val = num(change);
  if (val === null || val === 0) return '■';
  return val > 0 ? '▲' : '▼';
}

function getTrendClass(change) {
  const val = num(change);
  if (val === null || val === 0) return 'trend-flat';
  return val > 0 ? 'trend-up' : 'trend-down';
}

function formatNumber(value, decimals = 2) {
  const n = num(value);
  if (n === null) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatCurrency(value, currency, decimals = 2) {
  const n = num(value);
  if (n === null || !currency) return '—';
  return `${formatNumber(n, decimals)} ${currency}`;
}

/* ------------------------------------------------------------
   2. COMMERCIAL NORMALIZATION
   ------------------------------------------------------------ */

function inferAvailability(item) {
  const raw = [
    item.availability,
    item.status,
    item.stockStatus,
    item.stock
  ].filter(Boolean).join(' ').toLowerCase();

  if (
    item.booking === true ||
    item.isBooking === true ||
    raw.includes('booking') ||
    raw.includes('pre-book')
  ) {
    return 'BOOKING';
  }

  return 'IN_STOCK';
}

function inferCurrency(item) {
  if (item.currency) return String(item.currency).toUpperCase();

  const priceText = String(item.price ?? '').toUpperCase();
  if (priceText.includes('USD') || priceText.includes('$')) return 'USD';
  if (priceText.includes('AED') || priceText.includes('د.إ')) return 'AED';

  // Existing Dubai stock feed is AED unless the listing is clearly a booking/USD item.
  return inferAvailability(item) === 'BOOKING' ? 'USD' : 'AED';
}

function inferPriceUnit(item, currency, availability) {
  if (item.priceUnit) return String(item.priceUnit).toUpperCase();

  const basis = String(item.priceBasis || item.basis || '').toUpperCase();
  if (basis.includes('MT') || basis.includes('TON')) return 'MT';

  const rawPrice = String(item.price ?? '').toUpperCase();
  if (rawPrice.includes('/MT') || rawPrice.includes('PER MT') || rawPrice.includes('TON')) {
    return 'MT';
  }

  if (availability === 'BOOKING' && currency === 'USD') {
    return 'MT';
  }

  return 'PACKAGE';
}

function inferBasis(item, currency, availability) {
  if (item.priceBasis) return String(item.priceBasis).toUpperCase();
  if (item.basis) return String(item.basis).toUpperCase();

  const raw = String(item.price ?? '').toUpperCase();

  if (raw.includes('CIF') || raw.includes('C&F') || raw.includes('CFR')) {
    return 'CIF_DUBAI';
  }

  if (raw.includes('FOB')) return 'FOB_ORIGIN';

  if (availability === 'BOOKING' && currency === 'USD') {
    // Legacy booking records are not assumed to be FOB/CIF.
    return 'BOOKING_UNSPECIFIED';
  }

  return 'DUBAI_STOCK';
}

function inferPackageType(item) {
  const text = [
    item.packaging,
    item.package,
    item.size
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('nonwoven')) return 'CUSTOM_NONWOVEN';
  if (text.includes('pp')) return 'STANDARD_PP';

  return 'UNKNOWN';
}

function getStockQuantity(item, packageKg) {
  // New schema may already provide MT.
  const directMT = num(
    item.stockQuantityMT ??
    item.quantityMT ??
    item.availableMT ??
    item.stockMT
  );

  if (directMT !== null) {
    return {
      value: directMT,
      unit: 'MT',
      mt: directMT,
      source: 'direct'
    };
  }

  // Explicit bag count + package weight.
  const bags = num(
    item.stockBags ??
    item.availableBags ??
    item.bags
  );

  if (bags !== null && packageKg !== null) {
    return {
      value: bags,
      unit: 'bags',
      mt: (bags * packageKg) / 1000,
      source: 'bags'
    };
  }

  // Legacy stock may be "1350 bags".
  const stockText = String(item.stock ?? '');
  const bagMatch = stockText.match(/([\d,.]+)\s*bags?/i);

  if (bagMatch && packageKg !== null) {
    const bagCount = num(bagMatch[1]);
    return {
      value: bagCount,
      unit: 'bags',
      mt: bagCount !== null ? (bagCount * packageKg) / 1000 : null,
      source: 'legacy-stock-bags'
    };
  }

  // Do NOT interpret a naked stock number as MT.
  return {
    value: null,
    unit: 'unknown',
    mt: null,
    source: 'unknown'
  };
}

function getPackingPremium(item) {
  // Explicit product-level configuration wins.
  const premium = num(
    item.customPackingPremiumUSDPerMT ??
    item.packingPremiumUSDPerMT ??
    item.nonwovenPremiumUSDPerMT
  );

  if (premium !== null) return premium;

  // A global default is intentionally NOT applied.
  // $30/MT is a commercial rule, not a universal truth.
  return null;
}

function getFreight(item) {
  // Accept only explicit freight fields from the data source.
  return num(
    item.freightUSDPerMT ??
    item.freightPerMT ??
    item.oceanFreightUSDPerMT
  );
}

function getFOB(item) {
  const fob = num(
    item.fobUSDPerMT ??
    item.fobPriceUSDPerMT ??
    item.fob
  );
  return fob;
}

function getCIF(item) {
  const cif = num(
    item.cifDubaiUSDPerMT ??
    item.cifUSDPerMT ??
    item.cifDubai
  );
  return cif;
}

function getCanonicalPrice(item) {
  const availability = inferAvailability(item);
  const currency = inferCurrency(item);
  const priceUnit = inferPriceUnit(item, currency, availability);
  const basis = inferBasis(item, currency, availability);

  const packageKg = num(item.packageWeightKg ?? item.packWeightKg) ?? parseWeightKg(item.size);
  const rawPrice = num(item.price);

  const fob = getFOB(item);
  const freight = getFreight(item);
  const explicitCIF = getCIF(item);
  const packingPremium = getPackingPremium(item);

  // If the source explicitly gives a package price, retain it.
  let packagePrice = null;
  if (priceUnit === 'PACKAGE' && rawPrice !== null) {
    packagePrice = rawPrice;
  }

  // Do not manufacture FOB/CIF from a local AED package price.
  let fobMT = fob;
  let cifMT = explicitCIF;

  if (
    cifMT === null &&
    fobMT !== null &&
    freight !== null
  ) {
    cifMT = fobMT + freight;
  }

  if (
    currentPacking === PACKING.CUSTOM_NONWOVEN &&
    fobMT !== null &&
    packingPremium !== null
  ) {
    fobMT += packingPremium;
    if (cifMT !== null) cifMT += packingPremium;
  }

  let displayValue = null;
  let displayCurrency = null;
  let displayUnit = null;
  let displayBasis = basis;

  if (currentBasis === PULSE_BASIS.DUBAI_STOCK) {
    if (currency === 'AED' && packagePrice !== null) {
      displayValue = packagePrice;
      displayCurrency = 'AED';
      displayUnit = packageKg ? `${formatNumber(packageKg, 0)}kg` : 'package';
      displayBasis = 'DUBAI_STOCK';
    } else if (currency === 'AED' && priceUnit === 'MT' && rawPrice !== null) {
      displayValue = rawPrice;
      displayCurrency = 'AED';
      displayUnit = 'MT';
      displayBasis = 'DUBAI_STOCK';
    }
  }

  if (currentBasis === PULSE_BASIS.FOB_ORIGIN) {
    if (fobMT !== null) {
      displayValue = fobMT;
      displayCurrency = 'USD';
      displayUnit = 'MT';
      displayBasis = 'FOB_ORIGIN';
    }
  }

  if (currentBasis === PULSE_BASIS.CIF_DUBAI) {
    if (cifMT !== null) {
      displayValue = cifMT;
      displayCurrency = 'USD';
      displayUnit = 'MT';
      displayBasis = 'CIF_DUBAI';
    }
  }

  // Explicit booking price can be shown only when the selected basis is not
  // pretending it is something else.
  if (
    displayValue === null &&
    availability === 'BOOKING' &&
    currency === 'USD' &&
    priceUnit === 'MT'
  ) {
    displayValue = rawPrice;
    displayCurrency = 'USD';
    displayUnit = 'MT';
    displayBasis = basis || 'BOOKING_UNSPECIFIED';
  }

  const pricePerKg =
    displayCurrency === 'AED' &&
    displayUnit !== 'MT' &&
    packageKg &&
    displayValue !== null
      ? displayValue / packageKg
      : null;

  return {
    currency,
    priceUnit,
    basis,
    rawPrice,
    packagePrice,
    packageKg,
    fobMT,
    freightUSDPerMT: freight,
    cifMT,
    packingPremiumUSDPerMT: packingPremium,
    displayValue,
    displayCurrency,
    displayUnit,
    displayBasis,
    pricePerKg
  };
}

function normalizeProduct(item) {
  const availability = inferAvailability(item);
  const packageKg = num(item.packageWeightKg ?? item.packWeightKg) ?? parseWeightKg(item.size);
  const stock = getStockQuantity(item, packageKg);
  const price = getCanonicalPrice(item);

  return {
    raw: item,
    product: item.name || item.product || 'Unnamed product',
    origin: item.origin || 'Unknown',
    flag: getFlag(item.origin),
    availability,
    isBooking: availability === 'BOOKING',

    packaging: item.packaging || item.package || 'Packaging not specified',
    packageKg,

    stockValue: stock.value,
    stockUnit: stock.unit,
    stockMT: stock.mt,

    supplier: item.supplier || item.supplierName || null,
    badge: item.badge || 'Verified Supplier',
    image: item.img || null,

    price,
    trendChange: num(
      item.trendChange ??
      item.change24h ??
      item.dailyChangePercent ??
      item.priceChangePercent
    ),
    keywords: item.keywords || []
  };
}

/* ------------------------------------------------------------
   3. MARKET MOOD
   ------------------------------------------------------------ */

function computeMarketMood(data) {
  const valid = data.filter(p => p.trendChange !== null);
  let up = 0;
  let down = 0;

  valid.forEach(p => {
    if (p.trendChange > 0) up++;
    else if (p.trendChange < 0) down++;
  });

  const total = up + down;
  if (!total) return 'Market Mood: —';

  const upPct = Math.round((up / total) * 100);
  return `Market Mood: ${upPct}% Up • ${100 - upPct}% Down`;
}

/* ------------------------------------------------------------
   4. DATA LOADING
   ------------------------------------------------------------ */

async function loadPulseData() {
  const tbody = document.getElementById('pulse-table');

  try {
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:30px;color:#a07c3b;">⏳ Loading market data...</td></tr>';
    }

    const res = await fetch(CONFIG.DATA_URL + Date.now(), {
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(`stock.json HTTP ${res.status}`);

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No products in stock.json');
    }

    pulseData = data.map(normalizeProduct);

    log('Loaded', pulseData.length, 'products');
    applyFiltersAndRender();
    updateLastUpdated();
    updateMarketMood();
    updateBasisUI();

  } catch (error) {
    console.error('Market Pulse data load failed:', error);

    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:30px;color:#e76f51;">⚠️ Market data temporarily unavailable. Retrying...</td></tr>';
    }

    setTimeout(loadPulseData, 5000);
  }
}

/* ------------------------------------------------------------
   5. BASIS / PACKING CONTROLS
   ------------------------------------------------------------ */

function ensureCommercialControls() {
  // If the new HTML already contains these controls, use them.
  if (
    document.getElementById('pulseBasisControls') &&
    document.getElementById('pulsePackingControls')
  ) {
    bindCommercialControls();
    return;
  }

  // Backward-compatible injection for the existing Pulse HTML.
  const anchor =
    document.querySelector('.filters') ||
    document.querySelector('.filter-bar') ||
    document.querySelector('#priceCards')?.parentElement;

  if (!anchor) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'pulseCommercialControls';
  wrapper.style.cssText = `
    display:flex;
    flex-wrap:wrap;
    gap:12px;
    align-items:center;
    margin:0 0 18px;
    padding:14px 16px;
    border:1px solid rgba(160,124,59,.22);
    border-radius:14px;
    background:rgba(255,255,255,.82);
  `;

  wrapper.innerHTML = `
    <div id="pulseBasisControls" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
      <strong style="font-size:12px;letter-spacing:.08em;color:#765a2d;">PRICE BASIS</strong>
      <button type="button" class="pulse-commercial-btn" data-pulse-basis="FOB_ORIGIN">FOB ORIGIN</button>
      <button type="button" class="pulse-commercial-btn" data-pulse-basis="CIF_DUBAI">CIF DUBAI</button>
      <button type="button" class="pulse-commercial-btn" data-pulse-basis="DUBAI_STOCK">DUBAI STOCK</button>
    </div>

    <div id="pulsePackingControls" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
      <strong style="font-size:12px;letter-spacing:.08em;color:#765a2d;">PACKING</strong>
      <button type="button" class="pulse-commercial-btn" data-pulse-packing="STANDARD_PP">STANDARD PP</button>
      <button type="button" class="pulse-commercial-btn" data-pulse-packing="CUSTOM_NONWOVEN">CUSTOM NONWOVEN</button>
    </div>

    <span id="pulseCommercialNote" style="font-size:12px;color:#777;"></span>
  `;

  anchor.parentNode.insertBefore(wrapper, anchor);

  if (!document.getElementById('pulseCommercialControlStyles')) {
    const style = document.createElement('style');
    style.id = 'pulseCommercialControlStyles';
    style.textContent = `
      .pulse-commercial-btn {
        border:1px solid #d9c8a6;
        background:#fff;
        color:#59451f;
        border-radius:999px;
        padding:7px 11px;
        font-size:11px;
        font-weight:700;
        letter-spacing:.04em;
        cursor:pointer;
        transition:.18s ease;
      }
      .pulse-commercial-btn:hover {
        transform:translateY(-1px);
      }
      .pulse-commercial-btn.active {
        background:#1d1d1d;
        color:#fff;
        border-color:#1d1d1d;
      }
    `;
    document.head.appendChild(style);
  }

  bindCommercialControls();
}

function bindCommercialControls() {
  document.querySelectorAll('[data-pulse-basis]').forEach(btn => {
    if (btn.dataset.pulseBound === '1') return;
    btn.dataset.pulseBound = '1';

    btn.addEventListener('click', () => {
      currentBasis = btn.dataset.pulseBasis;
      applyFiltersAndRender();
      updateBasisUI();
    });
  });

  document.querySelectorAll('[data-pulse-packing]').forEach(btn => {
    if (btn.dataset.pulseBound === '1') return;
    btn.dataset.pulseBound = '1';

    btn.addEventListener('click', () => {
      currentPacking = btn.dataset.pulsePacking;
      // Price basis may change as packing changes, so re-normalize all rows.
      pulseData = pulseData.map(p => normalizeProduct(p.raw));
      applyFiltersAndRender();
      updateBasisUI();
    });
  });

  updateBasisUI();
}

function updateBasisUI() {
  document.querySelectorAll('[data-pulse-basis]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pulseBasis === currentBasis);
  });

  document.querySelectorAll('[data-pulse-packing]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pulsePacking === currentPacking);
  });

  const note = document.getElementById('pulseCommercialNote');
  if (!note) return;

  if (currentBasis === PULSE_BASIS.FOB_ORIGIN) {
    note.textContent = 'Origin price. Freight to Dubai is not included.';
  } else if (currentBasis === PULSE_BASIS.CIF_DUBAI) {
    note.textContent = 'Dubai landed basis. Shown only where freight/CIF data is supplied.';
  } else {
    note.textContent = 'Dubai warehouse stock. AED package prices remain package prices.';
  }

  if (currentPacking === PACKING.CUSTOM_NONWOVEN) {
    note.textContent += ' Custom packing premium is shown only when configured.';
  }
}

/* ------------------------------------------------------------
   6. FILTERING / SEARCH
   ------------------------------------------------------------ */

function applyFiltersAndRender() {
  filteredData = pulseData.filter(item => {
    const matchesFilter =
      currentFilter === 'all' ||
      String(item.origin).toLowerCase() === String(currentFilter).toLowerCase();

    const q = currentSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.product.toLowerCase().includes(q) ||
      String(item.origin).toLowerCase().includes(q) ||
      String(item.packaging).toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  if (currentSort.key) {
    const { key, dir } = currentSort;

    filteredData = filteredData.slice().sort((a, b) => {
      const va = a[key];
      const vb = b[key];

      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      return va < vb
        ? (dir === 'asc' ? -1 : 1)
        : (dir === 'asc' ? 1 : -1);
    });
  }

  renderCards(filteredData);
  renderTable(filteredData);
  updateRowCount(filteredData.length);
}

/* ------------------------------------------------------------
   7. DISPLAY HELPERS
   ------------------------------------------------------------ */

function priceDisplay(item) {
  const p = item.price;

  if (p.displayValue === null) {
    return {
      main: 'Quote',
      sub: currentBasis === PULSE_BASIS.DUBAI_STOCK
        ? 'No Dubai-stock price'
        : 'Basis data not supplied'
    };
  }

  if (p.displayCurrency === 'AED' && p.pricePerKg !== null) {
    return {
      main: formatCurrency(p.displayValue, 'AED'),
      sub: `${formatNumber(p.pricePerKg, 2)} AED/kg`
    };
  }

  return {
    main: formatCurrency(p.displayValue, p.displayCurrency),
    sub: `${p.displayUnit || 'unit'} • ${p.displayBasis.replace(/_/g, ' ')}`
  };
}

function stockDisplay(item) {
  if (item.availability === 'BOOKING') return 'Booking';

  if (item.stockMT !== null) {
    const mt = formatNumber(item.stockMT, 1);
    if (item.stockValue !== null && item.stockUnit === 'bags') {
      return `${formatNumber(item.stockValue, 0)} bags • ${mt} MT`;
    }
    return `${mt} MT`;
  }

  if (item.stockValue !== null && item.stockUnit === 'bags') {
    return `${formatNumber(item.stockValue, 0)} bags`;
  }

  return 'Stock quantity not specified';
}

function availabilityLabel(item) {
  return item.availability === 'BOOKING'
    ? '📋 Booking'
    : '✅ In Stock';
}

/* ------------------------------------------------------------
   8. CARDS
   ------------------------------------------------------------ */

function renderCards(data) {
  const container = document.getElementById('priceCards');
  if (!container) return;

  const topProducts = data.slice(0, CONFIG.MAX_CARDS);

  if (!topProducts.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">
        No products found matching your criteria.
      </div>
    `;
    return;
  }

  container.innerHTML = topProducts.map(item => {
    const price = priceDisplay(item);
    const trend = item.trendChange;
    const trendText =
      trend === null
        ? '—'
        : `${getTrendArrow(trend)} ${Math.abs(trend).toFixed(1)}%`;

    return `
      <div class="price-card" data-origin="${esc(item.origin)}">
        <div class="product-header">
          <span class="product-name">${esc(item.product)}</span>
          <span class="flag">${item.flag}</span>
        </div>

        <div class="price">${esc(price.main)}
          <small>${esc(price.sub)}</small>
        </div>

        <div class="price-details">
          <span class="trend ${getTrendClass(trend)}">${esc(trendText)}</span>
          <span style="font-size:13px;color:#666;">${availabilityLabel(item)}</span>
        </div>

        <div class="stock-info">
          <span>📦 ${esc(stockDisplay(item))}</span>
          <span class="badge">${esc(item.badge)}</span>
        </div>

        <a href="${whatsappUrl(item.product)}" class="book-btn" target="_blank" rel="noopener">
          <i class="fab fa-whatsapp"></i> ${item.isBooking ? 'Request Booking' : 'Get Quote'}
        </a>
      </div>
    `;
  }).join('');
}

/* ------------------------------------------------------------
   9. TABLE
   ------------------------------------------------------------ */

function renderTable(data) {
  const tbody = document.getElementById('pulse-table');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No market data matches the current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(item => {
    const price = priceDisplay(item);
    const trend = item.trendChange;

    const trendDisplay =
      trend === null
        ? '—'
        : `${Math.abs(trend).toFixed(1)}%`;

    const trendArrow = trend === null ? '■' : getTrendArrow(trend);

    const rowClass =
      item.availability === 'BOOKING'
        ? 'row-booking'
        : 'row-local';

    const supplierText =
      item.supplier ||
      (item.availability === 'BOOKING' ? 'Booking' : 'Supplier not specified');

    return `
      <tr class="${rowClass}" data-origin="${esc(item.origin)}" data-name="${esc(item.product)}">
        <td class="col-product">
          <strong>${esc(item.product)}</strong><br>
          <span class="origin-flag">${item.flag}</span>
          <span class="origin-text">${esc(item.origin)}</span>
        </td>

        <td class="col-price">
          <span class="price-main">${esc(price.main)}</span><br>
          <span class="price-sub">${esc(price.sub)}</span>
        </td>

        <td class="col-trend ${getTrendClass(trend)}">
          <span class="trend-arrow">${trendArrow}</span>
          <span class="trend-value">${esc(trendDisplay)}</span>
        </td>

        <td class="col-supplier">
          <span class="supplier-main">${esc(supplierText)}</span><br>
          <span class="badge ${item.isBooking ? 'badge-booking' : 'badge-supplier'}">
            ${esc(item.badge)}
          </span>
        </td>

        <td class="col-meta">
          <span class="meta-verified">${item.stockMT !== null ? `📦 ${esc(formatNumber(item.stockMT, 1))} MT` : '✔️ Verified'}</span>
        </td>

        <td class="col-action">
          <a href="${whatsappUrl(item.product)}"
             class="whatsapp-link"
             target="_blank"
             rel="noopener"
             aria-label="Request quote for ${esc(item.product)}">
            <i class="fab fa-whatsapp"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

/* ------------------------------------------------------------
   10. NEWS
   ------------------------------------------------------------ */

const newsFeed = [
  'Market Pulse uses verified Grains Hub commercial data.',
  'FOB origin pricing excludes freight unless freight data is supplied.',
  'CIF Dubai requires explicit freight or CIF data.',
  'Dubai stock prices remain in their original AED/package basis.',
  'Custom nonwoven packing is shown only when a premium is configured.'
];

function renderNewsFeed() {
  const ticker = document.getElementById('ticker-text');
  if (!ticker || !newsFeed.length) return;

  ticker.innerHTML = newsFeed.map((n, i) =>
    `<span style="opacity:${i === newsIndex ? '1' : '0.5'};">${esc(n)}</span>`
  ).join(' • ');

  newsIndex = (newsIndex + 1) % newsFeed.length;
}

/* ------------------------------------------------------------
   11. UPDATES
   ------------------------------------------------------------ */

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
    el.textContent =
      now.toLocaleDateString('en-GB', options) + ' GST';
  }
}

function updateMarketMood() {
  const el = document.getElementById('market-mood');
  if (el) el.textContent = computeMarketMood(pulseData);
}

function updateRowCount(count) {
  const el = document.getElementById('rowCount');
  if (el) {
    el.textContent = `${count} product${count !== 1 ? 's' : ''}`;
  }
}

/* ------------------------------------------------------------
   12. SORTING
   ------------------------------------------------------------ */

function initSorting() {
  document.querySelectorAll('[data-sort]').forEach(header => {
    if (header.dataset.pulseSortBound === '1') return;
    header.dataset.pulseSortBound = '1';

    header.style.cursor = 'pointer';

    header.addEventListener('click', () => {
      const key = header.dataset.sort;

      if (currentSort.key === key) {
        currentSort.dir =
          currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.key = key;
        currentSort.dir = 'asc';
      }

      applyFiltersAndRender();
    });
  });
}

/* ------------------------------------------------------------
   13. FILTER SETUP
   ------------------------------------------------------------ */

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('searchInput');

  filterBtns.forEach(btn => {
    if (btn.dataset.pulseFilterBound === '1') return;
    btn.dataset.pulseFilterBound = '1';

    btn.addEventListener('click', function () {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      currentFilter = this.dataset.filter || 'all';
      applyFiltersAndRender();
    });
  });

  if (searchInput && searchInput.dataset.pulseSearchBound !== '1') {
    searchInput.dataset.pulseSearchBound = '1';

    searchInput.addEventListener('input', function () {
      currentSearch = this.value;
      applyFiltersAndRender();
    });
  }
}

/* ------------------------------------------------------------
   14. ALLIYA
   ------------------------------------------------------------ */

function setupAlliyaButton() {
  const btn = document.getElementById('askAlliyaBtn');
  if (!btn || btn.dataset.pulseAlliyaBound === '1') return;

  btn.dataset.pulseAlliyaBound = '1';

  btn.addEventListener('click', function () {
    if (window.Alliya && typeof window.Alliya.open === 'function') {
      window.Alliya.open();
    } else {
      window.open(
        `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(
          'Hi Alliya, I need help with grain prices'
        )}`,
        '_blank',
        'noopener'
      );
    }
  });
}

/* ------------------------------------------------------------
   15. PUBLIC API
   ------------------------------------------------------------ */

window.GrainsHubPulse = {
  version: '3.0',
  getData: () => pulseData.slice(),
  getFilteredData: () => filteredData.slice(),

  setBasis(basis) {
    if (!Object.values(PULSE_BASIS).includes(basis)) return;
    currentBasis = basis;
    pulseData = pulseData.map(p => normalizeProduct(p.raw));
    applyFiltersAndRender();
    updateBasisUI();
  },

  setPacking(packing) {
    if (!Object.values(PACKING).includes(packing)) return;
    currentPacking = packing;
    pulseData = pulseData.map(p => normalizeProduct(p.raw));
    applyFiltersAndRender();
    updateBasisUI();
  },

  refresh: loadPulseData
};

window.filterPulse = function(filter) {
  currentFilter = filter || 'all';
  applyFiltersAndRender();
};

/* ------------------------------------------------------------
   16. INITIALIZATION
   ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Market Pulse Lady Stark v3.0 initializing...');

  ensureCommercialControls();
  setupFilters();
  initSorting();
  setupAlliyaButton();

  loadPulseData();

  renderNewsFeed();
  setInterval(renderNewsFeed, CONFIG.NEWS_INTERVAL);
  setInterval(loadPulseData, CONFIG.REFRESH_INTERVAL);

  console.log('👑 Market Pulse Lady Stark v3.0 loaded');
});
