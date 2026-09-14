/* ============================================================
   GRAINS HUB — Market Pulse v3.4
   LADY STARK / CANONICAL TRADE DESK

   DATA FLOW
     grainsData.js
       -> stock.json (commercial stock / booking)
       -> indiaMarketQuote_2026-09-14.json (FOB observation)
       -> exact identity matching
       -> Pulse rendering

   COMMERCIAL RULES
     1. Dubai Stock uses the stock record's own price.
     2. Explicit CIF is displayed exactly as stored.
     3. FOB uses an exact current market observation when available.
     4. FOB is never silently converted to CIF.
     5. CIF is never given an automatic +$260 freight uplift.
     6. No fuzzy variety substitution (PR-106 can never become 1121).
     7. No random trend percentages.
     8. Missing basis data is shown as a quote/request state.
   ============================================================ */

(function (window, document) {
  'use strict';

  const CONFIG = {
    VERSION: '3.4',
    REFRESH_INTERVAL: 60000,
    NEWS_INTERVAL: 9000,
    MAX_CARDS: 6,
    WHATSAPP: '971585521976',
    DEFAULT_BASIS: 'DUBAI_STOCK',
    DEFAULT_PACKING: 'STANDARD_PP'
  };

  const BASIS = {
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
  let currentFilter = 'all';
  let currentSearch = '';
  let currentSort = { key: null, dir: 'asc' };
  let currentBasis = CONFIG.DEFAULT_BASIS;
  let currentPacking = PACKING.STANDARD_PP;
  let newsIndex = 0;
  let refreshTimer = null;
  let newsTimer = null;

  function txt(v) {
    return v == null ? '' : String(v).trim();
  }

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeText(v) {
    return txt(v)
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compact(v) {
    return normalizeText(v).replace(/\s+/g, '');
  }

  function canonicalOrigin(v) {
    const s = compact(v);
    if (s.includes('india')) return 'India';
    if (s.includes('pakistan')) return 'Pakistan';
    if (s.includes('thailand')) return 'Thailand';
    if (s.includes('uae') || s.includes('dubai')) return 'UAE';
    return txt(v);
  }

  function canonicalVariety(v) {
    const s = compact(v);
    if (s.includes('pr1114') || s.includes('pr11') || s.includes('pr14')) return 'PR-11/14';
    if (s.includes('pr106')) return 'PR-106';
    if (s.includes('pr47')) return 'PR-47';
    if (s.includes('pr26')) return 'PR-26';
    if (s.includes('sonamasoori') || s.includes('sonamasuri') || s.includes('sonamassori')) return 'Sona Masoori';
    if (s.includes('ir64')) return 'IR-64';
    if (s.includes('rh10')) return 'RH-10';
    if (s.includes('sharbati')) return 'Sharbati';
    if (s.includes('sugandha')) return 'Sugandha';
    if (s === 'taj' || s.startsWith('taj')) return 'Taj';
    if (s.includes('pusa')) return 'PUSA';
    if (s.includes('1401')) return '1401';
    if (s.includes('1885')) return '1885';
    if (s.includes('1847')) return '1847';
    if (s.includes('1718')) return '1718';
    if (s.includes('1509')) return '1509';
    if (s.includes('1121')) return '1121';
    return txt(v);
  }

  /*
    Important distinction:
      "White Rice" = Raw/White rice
      "Creamy Sella" = Sella
    The old broad "white => White Sella" rule caused identity collisions.
  */
  function canonicalProcessing(v) {
    const s = normalizeText(v);
    if (!s) return null;
    if (s.includes('golden')) return 'Golden Sella';
    if (s.includes('lemon')) return 'Lemon Sella';
    if (s.includes('creamy sella') || s.includes('white sella') || s === 'sella') return 'Sella';
    if (s.includes('parboil')) return 'Parboiled';
    if (s.includes('steam')) return 'Steam';
    if (s.includes('brown')) return 'Brown';
    if (/\braw\b/.test(s) || /\bwhite rice\b/.test(s) || s === 'white') return 'Raw';
    return null;
  }

  function cropToken(v) {
    const s = normalizeText(v);
    const m = s.match(/\b(20\d{2})\b/);
    return m ? m[1] : '';
  }

  function cropsCompatible(a, b) {
    const aa = cropToken(a);
    const bb = cropToken(b);
    if (!aa || !bb) return true;
    return aa === bb || txt(a).includes(bb) || txt(b).includes(aa);
  }

  function getFlag(origin) {
    const o = canonicalOrigin(origin).toLowerCase();
    if (o === 'india') return '🇮🇳';
    if (o === 'pakistan') return '🇵🇰';
    if (o === 'thailand') return '🇹🇭';
    if (o === 'uae') return '🇦🇪';
    return '🌍';
  }

  function parseWeightKg(v) {
    const s = txt(v).toLowerCase().replace(/,/g, '');
    const m = s.match(/(?:=|\b)(\d+(?:\.\d+)?)\s*kg\b/);
    if (m) return Number(m[1]);
    const plain = s.match(/^(\d+(?:\.\d+)?)\s*kg?$/);
    return plain ? Number(plain[1]) : null;
  }

  function stockQuantity(raw) {
    const kg = parseWeightKg(raw.size) || parseWeightKg(raw.packaging);
    const explicitMT = num(raw.stockQuantityMT ?? raw.quantityMT ?? raw.availableMT ?? raw.stockMT);
    if (explicitMT !== null) return { value: explicitMT, unit: 'MT', mt: explicitMT };

    const explicitBags = num(raw.stockBags ?? raw.availableBags ?? raw.bags);
    if (explicitBags !== null && kg !== null) {
      return { value: explicitBags, unit: 'bags', mt: explicitBags * kg / 1000 };
    }

    const m = txt(raw.stock).match(/([\d,.]+)\s*bags?/i);
    if (m && kg !== null) {
      const bags = num(m[1]);
      return { value: bags, unit: 'bags', mt: bags === null ? null : bags * kg / 1000 };
    }

    return { value: null, unit: 'unknown', mt: null };
  }

  function availability(raw) {
    const explicit = txt(raw.availability || raw.status || raw.stockStatus).toLowerCase();
    if (raw.booking === true || raw.isBooking === true || /booking|pre[\s-]?booking|on[\s-]?request/.test(explicit)) {
      return 'BOOKING';
    }
    if (/out[\s-]?of[\s-]?stock|sold[\s-]?out|unavailable/.test(explicit)) return 'OUT_OF_STOCK';
    if (/available|in[\s-]?stock|ready/.test(explicit)) return 'IN_STOCK';

    const stockText = txt(raw.stock).toLowerCase();
    if (/booking|pre[\s-]?booking|prompt shipment/.test(stockText)) return 'BOOKING';
    if (/\bbags?\b|\bmt\b|\btonnes?\b/.test(stockText)) return 'IN_STOCK';

    return 'UNKNOWN';
  }

  function inferBasis(raw) {
    const explicit = txt(raw.priceBasis || raw.basis || raw.tradeBasis).toUpperCase();
    if (explicit.includes('CIF') || explicit.includes('CFR') || explicit.includes('C&F')) return BASIS.CIF_DUBAI;
    if (explicit.includes('FOB')) return BASIS.FOB_ORIGIN;
    if (explicit.includes('DUBAI') || explicit.includes('STOCK') || explicit.includes('LOCAL')) return BASIS.DUBAI_STOCK;

    const p = txt(raw.price).toUpperCase();
    if (p.includes('CIF') || p.includes('CFR') || p.includes('C&F')) return BASIS.CIF_DUBAI;
    if (p.includes('FOB')) return BASIS.FOB_ORIGIN;
    if (p.includes('AED')) return BASIS.DUBAI_STOCK;

    return 'BOOKING_UNSPECIFIED';
  }

  function inferCurrency(raw) {
    const explicit = txt(raw.currency || raw.priceCurrency).toUpperCase();
    if (explicit === 'AED' || explicit === 'USD') return explicit;

    const p = txt(raw.price).toUpperCase();
    if (p.includes('AED') || p.includes('د.إ')) return 'AED';
    if (p.includes('USD') || p.includes('$')) return 'USD';

    return null;
  }

  function inferUnit(raw, currency) {
    const explicit = txt(raw.priceUnit || raw.unit).toUpperCase();
    if (explicit.includes('MT') || explicit.includes('TON')) return 'MT';
    if (explicit.includes('KG')) return 'KG';
    if (explicit.includes('PACKAGE') || explicit.includes('BAG')) return 'PACKAGE';

    const p = txt(raw.price).toUpperCase();
    if (/\/?\s*(MT|TON|TONNE|TONNES)\b/.test(p)) return 'MT';
    if (/\bKG\b/.test(p)) return 'KG';

    if (currency === 'USD') return 'MT';
    return 'PACKAGE';
  }

  function parseRawPrice(raw) {
    return num(raw.price);
  }

  function productIdentity(raw) {
    const name = txt(raw.name || raw.product || raw.title);
    return {
      origin: canonicalOrigin(raw.origin || raw.country),
      variety: canonicalVariety(raw.variety || raw.riceVariety || name),
      processing: canonicalProcessing(raw.processing || raw.process || raw.form || name),
      crop: cropToken(raw.crop || raw.year || raw.cropYear || raw.packaging || raw.size),
      name
    };
  }

  function normalizeStock(raw, index) {
    const id = productIdentity(raw);
    const currency = inferCurrency(raw);
    const unit = inferUnit(raw, currency);
    const basis = inferBasis(raw);
    const price = parseRawPrice(raw);
    const kg = parseWeightKg(raw.size) || parseWeightKg(raw.packaging);
    const qty = stockQuantity(raw);

    let pricePerKg = null;
    let pricePerMT = null;

    if (price !== null) {
      if (unit === 'KG') {
        pricePerKg = price;
        pricePerMT = price * 1000;
      } else if (unit === 'MT') {
        pricePerMT = price;
        pricePerKg = price / 1000;
      } else if (unit === 'PACKAGE' && kg) {
        pricePerKg = price / kg;
        pricePerMT = pricePerKg * 1000;
      }
    }

    return {
      id: txt(raw.id || raw.sku) || `grain-${index}`,
      raw,
      name: id.name || 'Unnamed product',
      origin: id.origin || 'Unknown',
      variety: id.variety,
      processing: id.processing,
      crop: id.crop,
      packaging: txt(raw.packaging || raw.package) || 'Packaging not specified',
      packageKg: kg,
      availability: availability(raw),
      currency,
      price,
      priceUnit: unit,
      priceBasis: basis,
      pricePerKg,
      pricePerMT,
      stockValue: qty.value,
      stockUnit: qty.unit,
      stockMT: qty.mt,
      supplier: txt(raw.supplier || raw.supplierName),
      badge: txt(raw.badge) || 'Verified Supplier',
      image: txt(raw.img || raw.image || raw.imageUrl),
      trendChange: num(raw.trendChange ?? raw.change24h ?? raw.dailyChangePercent ?? raw.priceChangePercent)
    };
  }

  function normalizeQuote(q, index) {
    const name = `${q.variety || ''} ${q.processing || ''}`.trim();
    return {
      id: txt(q.id) || `quote-${index}`,
      origin: canonicalOrigin(q.origin),
      variety: canonicalVariety(q.variety),
      processing: canonicalProcessing(q.processing),
      crop: txt(q.crop),
      price: num(q.priceUSDPerMT),
      currency: 'USD',
      unit: 'MT',
      basis: txt(q.basis).toUpperCase() || BASIS.FOB_ORIGIN,
      packing: txt(q.packing),
      supplier: txt(q.supplier),
      sourceType: txt(q.sourceType),
      sourceDocument: txt(q.sourceDocument),
      quoteDate: txt(q.quoteDate),
      confidence: txt(q.confidence),
      port: txt(q.port),
      name
    };
  }

  function quoteMatchesProduct(product, quote) {
    if (product.origin !== quote.origin) return false;
    if (product.variety !== quote.variety) return false;
    if (!product.processing || !quote.processing || product.processing !== quote.processing) return false;
    if (!cropsCompatible(product.crop, quote.crop)) return false;
    return true;
  }

  function findExactQuote(product) {
    if (!window.GrainsHubData || typeof window.GrainsHubData.marketQuotes !== 'function') return null;

    const quotes = window.GrainsHubData.marketQuotes()
      .map(normalizeQuote)
      .filter(q => quoteMatchesProduct(product, q))
      .filter(q => q.basis === BASIS.FOB_ORIGIN && q.currency === 'USD' && q.unit === 'MT');

    if (!quotes.length) return null;

    quotes.sort((a, b) => {
      const da = a.quoteDate || '';
      const db = b.quoteDate || '';
      return db.localeCompare(da);
    });

    return quotes[0];
  }

  function selectedPrice(product) {
    /* ---------------- DUBAI STOCK ---------------- */
    if (currentBasis === BASIS.DUBAI_STOCK) {
      if (product.currency === 'AED') {
        return {
          amount: product.price,
          currency: 'AED',
          unit: product.priceUnit,
          basis: BASIS.DUBAI_STOCK,
          label: 'Dubai stock',
          source: 'stock'
        };
      }

      if (product.priceBasis === BASIS.CIF_DUBAI) {
        return {
          amount: product.pricePerMT ?? product.price,
          currency: 'USD',
          unit: 'MT',
          basis: BASIS.CIF_DUBAI,
          label: 'CIF Dubai',
          source: 'stock'
        };
      }

      if (product.price !== null) {
        return {
          amount: product.pricePerMT ?? product.price,
          currency: product.currency || 'USD',
          unit: product.priceUnit || 'MT',
          basis: product.priceBasis || 'BOOKING_UNSPECIFIED',
          label: product.priceBasis === 'BOOKING_UNSPECIFIED' ? 'Booking quote' : product.priceBasis,
          source: 'stock'
        };
      }

      return null;
    }

    /* ---------------- FOB ORIGIN ---------------- */
    if (currentBasis === BASIS.FOB_ORIGIN) {
      const quote = findExactQuote(product);

      if (quote) {
        return {
          amount: quote.price,
          currency: 'USD',
          unit: 'MT',
          basis: BASIS.FOB_ORIGIN,
          label: 'FOB India Port',
          source: 'market_quote',
          quote
        };
      }

      if (product.priceBasis === BASIS.FOB_ORIGIN && product.pricePerMT !== null) {
        return {
          amount: product.pricePerMT,
          currency: product.currency || 'USD',
          unit: 'MT',
          basis: BASIS.FOB_ORIGIN,
          label: 'FOB origin',
          source: 'stock'
        };
      }

      return null;
    }

    /* ---------------- CIF DUBAI ---------------- */
    if (currentBasis === BASIS.CIF_DUBAI) {
      /*
        Explicit CIF only.
        No +260 freight. No +250 stock convention. No estimate.
      */
      if (product.priceBasis === BASIS.CIF_DUBAI && product.pricePerMT !== null) {
        return {
          amount: product.pricePerMT,
          currency: 'USD',
          unit: 'MT',
          basis: BASIS.CIF_DUBAI,
          label: 'CIF Dubai',
          source: 'stock'
        };
      }

      /*
        If a source record has explicit CIF fields, use them exactly.
        This is deliberately separate from FOB quotes.
      */
      const raw = product.raw || {};
      const explicitCif = num(raw.cifDubaiUSDPerMT ?? raw.cifUSDPerMT ?? raw.cifDubai);
      if (explicitCif !== null) {
        return {
          amount: explicitCif,
          currency: 'USD',
          unit: 'MT',
          basis: BASIS.CIF_DUBAI,
          label: 'CIF Dubai',
          source: 'stock'
        };
      }

      return null;
    }

    return null;
  }

  function formatNumber(v, decimals = 2) {
    const n = num(v);
    if (n === null) return '—';
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function priceDisplay(product) {
    const p = selectedPrice(product);

    if (!p || p.amount === null) {
      return {
        main: 'Quote',
        sub: currentBasis === BASIS.FOB_ORIGIN
          ? 'No current FOB observation'
          : currentBasis === BASIS.CIF_DUBAI
            ? 'No explicit CIF data'
            : 'Price on request'
      };
    }

    if (p.currency === 'AED' && p.unit === 'PACKAGE') {
      const pkg = product.packageKg ? `${formatNumber(product.packageKg, 0)}kg` : 'package';
      const perKg = product.packageKg ? p.amount / product.packageKg : null;
      return {
        main: `AED ${formatNumber(p.amount)}`,
        sub: `${pkg}${perKg !== null ? ` • AED ${formatNumber(perKg, 2)}/kg` : ''}`
      };
    }

    const basisLabel = p.label || String(p.basis || '').replace(/_/g, ' ');
    return {
      main: `${p.currency} ${formatNumber(p.amount)}`,
      sub: `${p.unit || 'MT'} • ${basisLabel}`
    };
  }

  function stockDisplay(product) {
    if (product.availability === 'BOOKING') return 'Booking';

    if (product.stockMT !== null) {
      if (product.stockValue !== null && product.stockUnit === 'bags') {
        return `${formatNumber(product.stockValue, 0)} bags • ${formatNumber(product.stockMT, 1)} MT`;
      }
      return `${formatNumber(product.stockMT, 1)} MT`;
    }

    if (product.stockValue !== null && product.stockUnit === 'bags') {
      return `${formatNumber(product.stockValue, 0)} bags`;
    }

    return 'Quantity not specified';
  }

  function trendText(product) {
    if (product.trendChange === null) return { arrow: '■', text: '—', cls: 'trend-flat' };
    const n = product.trendChange;
    return {
      arrow: n > 0 ? '▲' : n < 0 ? '▼' : '■',
      text: `${Math.abs(n).toFixed(1)}%`,
      cls: n > 0 ? 'trend-up' : n < 0 ? 'trend-down' : 'trend-flat'
    };
  }

  function whatsappUrl(product) {
    const p = product.name;
    const text = `Hi Grains Hub Trade Desk - I want a quote for ${p}`;
    return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(text)}`;
  }

  function computeMarketMood(data) {
    const valid = data.filter(p => p.trendChange !== null);
    if (!valid.length) return 'Market Mood: —';
    let up = 0, down = 0;
    valid.forEach(p => p.trendChange > 0 ? up++ : p.trendChange < 0 ? down++ : null);
    const total = up + down;
    if (!total) return 'Market Mood: Flat';
    const upPct = Math.round(up / total * 100);
    return `Market Mood: ${upPct}% Up • ${100 - upPct}% Down`;
  }

  function renderControls() {
    const anchor = document.querySelector('.filters') || document.querySelector('.filter-bar');
    if (!anchor) return;

    let wrapper = document.getElementById('pulseCommercialControls');

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'pulseCommercialControls';
      wrapper.style.cssText = [
        'display:flex',
        'flex-wrap:wrap',
        'align-items:center',
        'gap:10px',
        'margin:0 0 22px',
        'padding:12px 14px',
        'background:#fff',
        'border:1px solid #e8e4d8',
        'border-radius:12px',
        'box-shadow:0 2px 8px rgba(0,0,0,.04)'
      ].join(';');

      wrapper.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <strong style="font-size:11px;letter-spacing:.08em;color:#765a2d">PRICE BASIS</strong>
          <button type="button" class="pulse-commercial-btn" data-pulse-basis="DUBAI_STOCK">DUBAI STOCK</button>
          <button type="button" class="pulse-commercial-btn" data-pulse-basis="FOB_ORIGIN">FOB ORIGIN</button>
          <button type="button" class="pulse-commercial-btn" data-pulse-basis="CIF_DUBAI">CIF DUBAI</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <strong style="font-size:11px;letter-spacing:.08em;color:#765a2d">PACKING</strong>
          <button type="button" class="pulse-commercial-btn" data-pulse-packing="STANDARD_PP">STANDARD PP</button>
          <button type="button" class="pulse-commercial-btn" data-pulse-packing="CUSTOM_NONWOVEN">CUSTOM NONWOVEN</button>
        </div>
        <span id="pulseCommercialNote" style="font-size:12px;color:#777"></span>
      `;

      anchor.parentNode.insertBefore(wrapper, anchor);
    }

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
        .pulse-commercial-btn:hover { transform:translateY(-1px); }
        .pulse-commercial-btn.active {
          background:#1d1d1d;
          color:#fff;
          border-color:#1d1d1d;
        }
      `;
      document.head.appendChild(style);
    }

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

    if (currentBasis === BASIS.DUBAI_STOCK) {
      note.textContent = 'Uses the stock record price exactly; no freight is added.';
    } else if (currentBasis === BASIS.FOB_ORIGIN) {
      note.textContent = 'Uses an exact FOB observation when available. Freight is excluded.';
    } else {
      note.textContent = 'Shows explicit CIF Dubai only. No automatic freight uplift.';
    }

    if (currentPacking === PACKING.CUSTOM_NONWOVEN) {
      note.textContent += ' Packing premium is used only when explicitly configured.';
    }
  }

  function applyFiltersAndRender() {
    const q = currentSearch.trim().toLowerCase();

    filteredData = pulseData.filter(item => {
      const originOk = currentFilter === 'all' ||
        currentFilter === 'booking'
          ? (currentFilter === 'booking' ? item.availability === 'BOOKING' : true)
          : item.origin.toLowerCase() === currentFilter.toLowerCase();

      if (!originOk) return false;
      if (!q) return true;

      return [
        item.name,
        item.origin,
        item.variety,
        item.processing,
        item.packaging,
        item.supplier
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
    });

    if (currentSort.key) {
      const { key, dir } = currentSort;
      filteredData.sort((a, b) => {
        let va = a[key], vb = b[key];
        if (key === 'priceRaw') {
          const pa = selectedPrice(a), pb = selectedPrice(b);
          va = pa ? pa.amount : null;
          vb = pb ? pb.amount : null;
        }
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        return va < vb ? (dir === 'asc' ? -1 : 1) : (dir === 'asc' ? 1 : -1);
      });
    }

    renderCards(filteredData);
    renderTable(filteredData);

    const count = document.getElementById('rowCount');
    if (count) count.textContent = `${filteredData.length} product${filteredData.length === 1 ? '' : 's'}`;

    const mood = document.getElementById('market-mood');
    if (mood) mood.textContent = computeMarketMood(pulseData);
  }

  function renderCards(data) {
    const container = document.getElementById('priceCards');
    if (!container) return;

    const top = data.slice(0, CONFIG.MAX_CARDS);
    if (!top.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999">No products found.</div>`;
      return;
    }

    container.innerHTML = top.map(item => {
      const price = priceDisplay(item);
      const trend = trendText(item);

      return `
        <div class="price-card" data-origin="${esc(item.origin)}">
          <div class="product-header">
            <span class="product-name">${esc(item.name)}</span>
            <span class="flag">${getFlag(item.origin)}</span>
          </div>

          <div class="price">${esc(price.main)}
            <small>${esc(price.sub)}</small>
          </div>

          <div class="price-details">
            <span class="trend ${trend.cls}">${trend.arrow} ${esc(trend.text)}</span>
            <span style="font-size:13px;color:#666">${item.availability === 'BOOKING' ? '📋 Booking' : '✅ In Stock'}</span>
          </div>

          <div class="stock-info">
            <span>📦 ${esc(stockDisplay(item))}</span>
            <span class="badge">${esc(item.badge)}</span>
          </div>

          <a href="${whatsappUrl(item)}" class="book-btn" target="_blank" rel="noopener">
            <i class="fab fa-whatsapp"></i> ${item.availability === 'BOOKING' ? 'Request Booking' : 'Get Quote'}
          </a>
        </div>
      `;
    }).join('');
  }

  function renderTable(data) {
    const tbody = document.getElementById('pulse-table');
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999">No market data matches the current filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(item => {
      const price = priceDisplay(item);
      const trend = trendText(item);

      return `
        <tr class="${item.availability === 'BOOKING' ? 'row-booking' : 'row-local'}"
            data-origin="${esc(item.origin)}"
            data-name="${esc(item.name)}">

          <td class="col-product">
            <strong>${esc(item.name)}</strong><br>
            <span class="origin-flag">${getFlag(item.origin)}</span>
            <span class="origin-text">${esc(item.origin)}</span>
          </td>

          <td class="col-price">
            <span class="price-main">${esc(price.main)}</span><br>
            <span class="price-sub">${esc(price.sub)}</span>
          </td>

          <td class="col-trend ${trend.cls}">
            <span class="trend-arrow">${trend.arrow}</span>
            <span class="trend-value">${esc(trend.text)}</span>
          </td>

          <td class="col-supplier">
            <span class="supplier-main">${esc(stockDisplay(item))}</span><br>
            <span class="badge ${item.availability === 'BOOKING' ? 'badge-booking' : 'badge-supplier'}">
              ${esc(item.badge)}
            </span>
          </td>

          <td class="col-meta">
            <span class="meta-verified">
              ${esc(item.supplier || (item.availability === 'BOOKING' ? 'Booking quote' : 'Supplier not specified'))}
            </span>
          </td>

          <td class="col-action">
            <a href="${whatsappUrl(item)}"
               class="whatsapp-link"
               target="_blank"
               rel="noopener"
               aria-label="Request quote for ${esc(item.name)}">
              <i class="fab fa-whatsapp"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  const newsFeed = [
    'Pulse separates Dubai Stock, FOB Origin and CIF Dubai pricing.',
    'Exact product identity is required before an FOB market quote is matched.',
    'Existing CIF prices are displayed as stored — freight is not added again.',
    'FOB observations exclude freight to Dubai.',
    'No random market movement is generated when no dated trend is supplied.'
  ];

  function renderNewsFeed() {
    const ticker = document.getElementById('ticker-text');
    if (!ticker) return;
    ticker.textContent = newsFeed[newsIndex];
    newsIndex = (newsIndex + 1) % newsFeed.length;
  }

  function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString('en-GB', {
      timeZone: 'Asia/Dubai',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' GST';
  }

  function initSorting() {
    document.querySelectorAll('[data-sort]').forEach(header => {
      if (header.dataset.pulseSortBound === '1') return;
      header.dataset.pulseSortBound = '1';
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

  function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.dataset.pulseFilterBound === '1') return;
      btn.dataset.pulseFilterBound = '1';

      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter || 'all';
        applyFiltersAndRender();
      });
    });

    const search = document.getElementById('searchInput');
    if (search && search.dataset.pulseSearchBound !== '1') {
      search.dataset.pulseSearchBound = '1';
      search.addEventListener('input', function () {
        currentSearch = this.value;
        applyFiltersAndRender();
      });
    }
  }

  function initAlliyaButton() {
    const btn = document.getElementById('askAlliyaBtn');
    if (!btn || btn.dataset.pulseAlliyaBound === '1') return;
    btn.dataset.pulseAlliyaBound = '1';

    btn.addEventListener('click', () => {
      if (window.Alliya && typeof window.Alliya.open === 'function') {
        window.Alliya.open();
      } else {
        window.open(
          `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hi Alliya, I need help with grain prices')}`,
          '_blank',
          'noopener'
        );
      }
    });
  }

  async function loadPulseData() {
    const tbody = document.getElementById('pulse-table');

    try {
      if (!window.GrainsHubData || typeof window.GrainsHubData.ready !== 'function') {
        throw new Error('GrainsHubData v4.1 is not available.');
      }

      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#a07c3b">⏳ Loading Trade Desk data...</td></tr>';
      }

      const ready = await window.GrainsHubData.ready();
      const products = Array.isArray(ready.products) ? ready.products : [];

      if (!products.length) throw new Error('No stock products available.');

      /*
        Re-normalize from raw source inside this Pulse engine.
        This deliberately avoids inheriting ambiguous legacy processing
        labels from older Pulse builds.
      */
      pulseData = products.map(p => normalizeStock(p.raw || p));

      applyFiltersAndRender();
      updateLastUpdated();
      updateBasisUI();

      console.log(`[Pulse ${CONFIG.VERSION}] Loaded ${pulseData.length} stock records; ${ready.quotes ? ready.quotes.length : 0} market quotes.`);
    } catch (error) {
      console.error(`[Pulse ${CONFIG.VERSION}] load failed:`, error);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#e76f51">⚠️ Trade Desk data temporarily unavailable. Retrying...</td></tr>`;
      }
      setTimeout(loadPulseData, 5000);
    }
  }

  window.GrainsHubPulse = {
    version: CONFIG.VERSION,
    BASIS,
    PACKING,
    getData: () => pulseData.slice(),
    getFilteredData: () => filteredData.slice(),
    setBasis: basis => {
      if (!Object.values(BASIS).includes(basis)) return;
      currentBasis = basis;
      applyFiltersAndRender();
      updateBasisUI();
    },
    setPacking: packing => {
      if (!Object.values(PACKING).includes(packing)) return;
      currentPacking = packing;
      applyFiltersAndRender();
      updateBasisUI();
    },
    refresh: loadPulseData
  };

  window.filterPulse = function (filter) {
    currentFilter = filter || 'all';
    applyFiltersAndRender();
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderControls();
    initFilters();
    initSorting();
    initAlliyaButton();
    loadPulseData();

    renderNewsFeed();
    if (newsTimer) clearInterval(newsTimer);
    newsTimer = setInterval(renderNewsFeed, CONFIG.NEWS_INTERVAL);

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadPulseData, CONFIG.REFRESH_INTERVAL);

    console.log(`👑 Market Pulse Lady Stark v${CONFIG.VERSION} loaded`);
  });

})(window, document);
