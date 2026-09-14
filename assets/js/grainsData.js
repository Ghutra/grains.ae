/* ============================================================
   GRAINS HUB — grainsData.js v4.1
   LADY STARK / CANONICAL COMMERCIAL DATA LAYER

   Source layers:
     1) /assets/data/stock.json
        -> live Grains Hub commercial stock / booking
     2) /assets/data/indiaMarketQuote_2026-09-14.json
        -> latest Amafhh India FOB market observation

   Rules:
   - Exact product identity before price selection.
   - FOB is never silently converted to CIF.
   - Existing CIF prices are never charged freight again.
   - Market observations and Dubai stock are separate layers.
   - Missing specs are null; no silent broken/purity/moisture defaults.
   ============================================================ */

(function (window) {
  'use strict';

  const CONFIG = {
    VERSION: '4.1',
    STOCK_URL: '/assets/data/stock.json',
    MARKET_QUOTE_URL: '/assets/data/indiaMarketQuote_2026-09-14.json',
    CACHE_TTL_MS: 300000
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

  const state = {
    products: [],
    quotes: [],
    loadedAt: 0,
    quoteLoadedAt: 0,
    source: null,
    quoteSource: null,
    loadingPromise: null,
    error: null
  };

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function txt(v) {
    return v == null ? '' : String(v).trim();
  }

  function first(item, keys) {
    for (const k of keys) {
      const n = num(item && item[k]);
      if (n !== null) return n;
    }
    return null;
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

  function canonicalProcessing(v) {
    const s = normalizeText(v);
    if (!s) return '';
    if (s.includes('golden')) return 'Golden Sella';
    if (s.includes('lemon')) return 'Lemon Sella';
    if (s.includes('white') || s.includes('creamy')) return 'White Sella';
    if (s.includes('parboil')) return 'Parboiled';
    if (s.includes('steam')) return 'Steam';
    if (s.includes('brown')) return 'Brown';
    if (s === 'sella') return 'Sella';
    if (s.includes('raw')) return 'Raw';
    return txt(v);
  }

  function cropKey(v) {
    const s = normalizeText(v);
    if (!s) return '';
    if (s.includes('2026')) return '2026';
    if (s.includes('2025')) return '2025';
    return txt(v);
  }

  function originKey(v) {
    const s = normalizeText(v);
    if (s.includes('india')) return 'India';
    if (s.includes('pakistan')) return 'Pakistan';
    if (s.includes('thailand')) return 'Thailand';
    if (s.includes('uae') || s.includes('dubai')) return 'UAE';
    return txt(v);
  }

  function packagingKey(v) {
    const s = normalizeText(v);
    if (!s) return '';
    if (s.includes('50 kg') || s.includes('50kg')) return '50 KG White PP Bag';
    if (s.includes('nonwoven')) return 'Nonwoven';
    if (s.includes('pp')) return 'PP';
    return txt(v);
  }

  function productKey(parts) {
    return [
      originKey(parts.origin),
      canonicalVariety(parts.variety || parts.name),
      cropKey(parts.crop),
      canonicalProcessing(parts.processing),
      txt(parts.brokenPercent) || '',
      txt(parts.grainLengthMM || parts.grainSizeMM) || '',
      packagingKey(parts.packaging)
    ].join('|').toLowerCase();
  }

  function quoteKey(parts) {
    return [
      originKey(parts.origin),
      canonicalVariety(parts.variety),
      cropKey(parts.crop),
      canonicalProcessing(parts.processing),
      txt(parts.supplier),
      txt(parts.basis),
      txt(parts.port),
      txt(parts.currency),
      num(parts.priceUSDPerMT)
    ].join('|').toLowerCase();
  }

  function weightKg(v) {
    const s = txt(v).toLowerCase().replace(/,/g, '');
    const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|mt|ton|tonne|tonnes)\b/);
    if (!m) return null;
    const n = Number(m[1]);
    return /mt|ton|tonne/.test(m[2]) ? n * 1000 : n;
  }

  function pkgKg(x) {
    return first(x, ['packageKg', 'packagingKg', 'bagWeightKg', 'weightKg'])
      ?? weightKg(x && x.size)
      ?? weightKg(x && x.packaging);
  }

  function currency(x) {
    const e = txt(x && (x.currency || x.priceCurrency)).toUpperCase();
    if (e === 'AED' || e === 'USD') return e;
    const p = txt(x && x.price);
    if (/\bUSD\b|\$/.test(p)) return 'USD';
    if (/\bAED\b|د\.?\s*إ/.test(p)) return 'AED';
    return null;
  }

  function availability(x) {
    const a = txt(x && (x.availability || x.status || x.stockStatus)).toLowerCase();
    if (x && (x.isBooking === true || x.booking === true ||
      /booking|pre[\s-]?booking|on[\s-]?request/.test(a))) return 'BOOKING';
    if (/out[\s-]?of[\s-]?stock|sold[\s-]?out|unavailable/.test(a)) return 'OUT_OF_STOCK';
    if (/available|in[\s-]?stock|ready/.test(a)) return 'IN_STOCK';
    if (first(x, ['stockQuantityMT', 'quantityMT', 'availableMT']) !== null ||
        /\bbags?\b|\bmt\b|\btonnes?\b/i.test(txt(x && x.stock))) return 'IN_STOCK';
    return 'UNKNOWN';
  }

  function priceUnit(x, c) {
    const e = txt(x && (x.priceUnit || x.unit)).toUpperCase();
    if (/MT|TON/.test(e)) return 'MT';
    if (/KG/.test(e)) return 'KG';
    if (/BAG|PACKAGE|PACK/.test(e)) return 'PACKAGE';

    const p = txt(x && x.price).toUpperCase();
    if (/\/?\s*(MT|TON|TONNE|TONNES)\b/.test(p)) return 'MT';
    if (/\/?\s*KG\b/.test(p)) return 'KG';
    if (c === 'USD') return 'MT';
    return 'PACKAGE';
  }

  function basis(x, c, a) {
    const b = txt(x && (x.priceBasis || x.basis || x.tradeBasis)).toUpperCase();
    if (/CIF|CFR|C&F/.test(b)) return BASIS.CIF_DUBAI;
    if (/FOB/.test(b)) return BASIS.FOB_ORIGIN;
    if (/DUBAI.?STOCK|LOCAL|STOCK/.test(b)) return BASIS.DUBAI_STOCK;
    if (c === 'AED' && a !== 'BOOKING') return BASIS.DUBAI_STOCK;

    // Legacy USD stock records without an explicit basis are treated as
    // commercial stock, NOT as FOB and NOT as FOB + freight.
    if (c === 'USD') return BASIS.CIF_DUBAI;

    return null;
  }

  function stockMT(x, kg) {
    const direct = first(x, ['stockQuantityMT', 'quantityMT', 'availableMT']);
    if (direct !== null) return direct;

    const bags = first(x, ['stockBags', 'bagCount', 'quantityBags']);
    if (bags !== null && kg !== null) return bags * kg / 1000;

    const m = txt(x && x.stock).match(/([\d,.]+)\s*bags?/i);
    return m && kg !== null ? num(m[1]) * kg / 1000 : null;
  }

  function normalize(x, i) {
    const c = currency(x);
    const a = availability(x);
    const u = priceUnit(x, c);
    const kg = pkgKg(x);
    const p = first(x, ['price', 'currentPrice', 'spotPrice']);

    let pricePerKg = null;
    let pricePerMT = null;

    if (p !== null) {
      if (u === 'KG') {
        pricePerKg = p;
        pricePerMT = p * 1000;
      } else if (u === 'MT') {
        pricePerMT = p;
        pricePerKg = p / 1000;
      } else if (u === 'PACKAGE' && kg) {
        pricePerKg = p / kg;
        pricePerMT = pricePerKg * 1000;
      }
    }

    const origin = txt(x && (x.origin || x.country || x.source));
    const name = txt(x && (x.name || x.product || x.title));

    return {
      id: txt(x && (x.id || x.sku)) || `grain-${i}`,
      name,
      origin,
      originCountry: originKey(origin),
      variety: canonicalVariety(x && (x.variety || x.riceVariety || name)),
      crop: txt(x && (x.crop || x.year || x.cropYear)),
      processing: canonicalProcessing(x && (x.processing || x.process || x.type || x.form)),
      supplier: txt(x && (x.supplier || x.supplierName)),
      supplierTier: txt(x && (x.supplierTier || x.badge || x.tier)),
      grainType: txt(x && (x.grainType || x.type || x.category)),
      grade: txt(x && x.grade),
      packaging: txt(x && (x.packaging || x.pack || x.package)),
      packageKg: kg,
      availability: a,
      rawStock: x && x.stock != null ? x.stock : null,
      stockBags: first(x, ['stockBags', 'bagCount', 'quantityBags']),
      stockMT: stockMT(x, kg),
      currency: c,
      price: p,
      priceUnit: u,
      priceBasis: basis(x, c, a),
      pricePerKg,
      pricePerMT,
      fobUSDPerMT: first(x, ['fobUSDPerMT', 'fobPriceUSDPerMT']),
      freightUSDPerMT: first(x, ['freightUSDPerMT', 'freightPerMT', 'oceanFreightUSDPerMT']),
      cifDubaiUSDPerMT: first(x, ['cifDubaiUSDPerMT', 'cifUSDPerMT']),
      customNonwovenPremiumUSDPerMT: first(x, ['customNonwovenPremiumUSDPerMT', 'customPackingPremiumUSDPerMT', 'packingPremiumUSDPerMT']),
      brokenPercent: first(x, ['brokenPercent', 'broken', 'breakagePercent']),
      purityPercent: first(x, ['purityPercent', 'purity']),
      moisturePercent: first(x, ['moisturePercent', 'moisture']),
      grainLengthMM: first(x, ['grainLengthMM', 'grainSizeMM', 'lengthMM']),
      trend: first(x, ['trendChange', 'trendPercent', 'dailyChangePercent']),
      updatedAt: x && (x.updatedAt || x.lastUpdated || x.timestamp) || null,
      image: txt(x && (x.img || x.image || x.imageUrl)),
      keywords: Array.isArray(x && x.keywords) ? x.keywords : [],
      productKey: productKey({
        origin,
        variety: x && (x.variety || x.riceVariety || name),
        crop: x && (x.crop || x.year || x.cropYear),
        processing: x && (x.processing || x.process || x.type || x.form),
        brokenPercent: first(x, ['brokenPercent', 'broken', 'breakagePercent']),
        grainLengthMM: first(x, ['grainLengthMM', 'grainSizeMM', 'lengthMM']),
        packaging: x && (x.packaging || x.pack || x.package)
      }),
      raw: x
    };
  }

  function normalizeQuote(q, i) {
    const quote = {
      id: txt(q && q.id) || `market-quote-${i}`,
      variety: canonicalVariety(q && q.variety),
      crop: txt(q && q.crop),
      processing: canonicalProcessing(q && q.processing),
      priceUSDPerMT: num(q && q.priceUSDPerMT),
      origin: originKey(q && q.origin),
      port: txt(q && q.port),
      basis: txt(q && q.basis) || BASIS.FOB_ORIGIN,
      currency: txt(q && q.currency).toUpperCase() || 'USD',
      unit: txt(q && q.unit).toUpperCase() || 'MT',
      packing: txt(q && q.packing),
      supplier: txt(q && q.supplier),
      sourceType: txt(q && q.sourceType),
      sourceDocument: txt(q && q.sourceDocument),
      quoteDate: txt(q && q.quoteDate),
      confidence: txt(q && q.confidence),
      grainSizeMM: num(q && q.grainSizeMM),
      productKey: productKey({
        origin: q && q.origin,
        variety: q && q.variety,
        crop: q && q.crop,
        processing: q && q.processing,
        grainLengthMM: q && q.grainSizeMM,
        packaging: q && q.packing
      }),
      quoteKey: quoteKey(q)
    };
    return quote;
  }

  async function fetchJson(url) {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return res.json();
  }

  async function load(force) {
    const fresh = state.loadedAt && Date.now() - state.loadedAt < CONFIG.CACHE_TTL_MS;
    if (!force && fresh && state.products.length) return state.products.slice();

    state.loadingPromise = Promise.allSettled([
      fetchJson(CONFIG.STOCK_URL),
      fetchJson(CONFIG.MARKET_QUOTE_URL)
    ]).then(results => {
      const stockResult = results[0];
      const quoteResult = results[1];

      if (stockResult.status === 'fulfilled') {
        const j = stockResult.value;
        const raw = Array.isArray(j)
          ? j
          : (Array.isArray(j.products) ? j.products : Array.isArray(j.items) ? j.items : []);
        state.products = raw.map(normalize);
        state.loadedAt = Date.now();
        state.source = CONFIG.STOCK_URL;
      } else {
        state.products = [];
      }

      if (quoteResult.status === 'fulfilled') {
        const j = quoteResult.value;
        const raw = Array.isArray(j)
          ? j
          : (Array.isArray(j.records) ? j.records : []);
        state.quotes = raw.map(normalizeQuote);
        state.quoteLoadedAt = Date.now();
        state.quoteSource = CONFIG.MARKET_QUOTE_URL;
      } else {
        state.quotes = [];
      }

      if (!state.products.length && !state.quotes.length) {
        throw new Error('Neither stock.json nor market quote data could be loaded.');
      }

      state.error = null;

      try {
        window.dispatchEvent(new CustomEvent('grainsHubDataReady', {
          detail: {
            products: state.products.length,
            marketQuotes: state.quotes.length
          }
        }));
      } catch (_) {}

      return state.products.slice();
    }).catch(err => {
      state.error = err;
      throw err;
    }).finally(() => {
      state.loadingPromise = null;
    });

    return state.loadingPromise;
  }

  async function ready() {
    if (state.products.length || state.quotes.length) {
      return {
        products: state.products.slice(),
        quotes: state.quotes.slice()
      };
    }
    await load(false);
    return {
      products: state.products.slice(),
      quotes: state.quotes.slice()
    };
  }

  function all() {
    return state.products.slice();
  }

  function marketQuotes() {
    return state.quotes.slice();
  }

  function inStock() {
    return state.products.filter(p => p.availability === 'IN_STOCK');
  }

  function booking() {
    return state.products.filter(p => p.availability === 'BOOKING');
  }

  function formatPrice(p) {
    if (!p || p.price === null) return 'Price on request';
    if (p.priceUnit === 'MT') return `${p.currency || ''} ${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} / MT`;
    if (p.priceUnit === 'KG') return `${p.currency || ''} ${p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} / kg`;
    if (p.packageKg) return `${p.currency || ''} ${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${p.packageKg}kg`;
    return `${p.currency || ''} ${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  function customPackingPrice(p) {
    if (!p) return null;
    if (p.fobUSDPerMT !== null && p.customNonwovenPremiumUSDPerMT !== null) {
      return p.fobUSDPerMT + p.customNonwovenPremiumUSDPerMT;
    }
    return null;
  }

  function cifPrice(p, packing) {
    if (!p) return null;

    // IMPORTANT:
    // If the record already has CIF Dubai, return it exactly.
    // Never add freight to an existing CIF number.
    if (p.priceBasis === BASIS.CIF_DUBAI && p.pricePerMT !== null) {
      return p.pricePerMT;
    }

    const fob = packing === PACKING.CUSTOM_NONWOVEN
      ? customPackingPrice(p)
      : p.fobUSDPerMT;

    if (fob !== null && p.freightUSDPerMT !== null) {
      return fob + p.freightUSDPerMT;
    }

    return p.cifDubaiUSDPerMT;
  }

  function parseQueryIdentity(query) {
    const q = normalizeText(query);
    const c = compact(q);

    const varieties = [
      'PR-11/14','PR-106','PR-47','PR-26','Sona Masoori','IR-64',
      'RH-10','Sharbati','Sugandha','Taj','PUSA','1401','1885',
      '1847','1718','1509','1121'
    ];

    let variety = null;
    for (const v of varieties) {
      const vc = compact(v);
      if (c.includes(vc)) {
        variety = v;
        break;
      }
    }

    const processing =
      c.includes('goldensella') ? 'Golden Sella' :
      c.includes('lemonsella') ? 'Lemon Sella' :
      (c.includes('whitesella') || c.includes('creamysella')) ? 'White Sella' :
      c.includes('parboiled') ? 'Parboiled' :
      c.includes('steam') ? 'Steam' :
      c.includes('brown') ? 'Brown' :
      /\bsella\b/.test(q) ? 'Sella' :
      /\braw\b|\bwhite\b/.test(q) ? 'Raw' :
      null;

    const yearMatch = q.match(/\b(2025|2026)\b/);
    const crop = yearMatch ? yearMatch[1] : null;

    return { variety, processing, crop };
  }

  function findMarketQuotes(query, options) {
    const opts = options || {};
    const parsed = parseQueryIdentity(query);
    let rows = state.quotes.slice();

    if (parsed.variety) {
      rows = rows.filter(r => r.variety === parsed.variety);
    }

    if (parsed.processing) {
      rows = rows.filter(r => r.processing === parsed.processing);
    }

    if (parsed.crop) {
      rows = rows.filter(r => cropKey(r.crop) === parsed.crop);
    }

    // Prefer latest crop when the user didn't specify a year.
    if (!parsed.crop && rows.length > 1) {
      const latest = rows.filter(r => cropKey(r.crop) === '2026');
      if (latest.length) rows = latest;
    }

    if (opts.origin) {
      rows = rows.filter(r => originKey(r.origin) === originKey(opts.origin));
    }

    return rows;
  }

  function findExactMarketQuote(query) {
    const rows = findMarketQuotes(query);
    if (!rows.length) return null;

    // Exact variety + processing beats generic variety matches.
    const parsed = parseQueryIdentity(query);
    rows.sort((a, b) => {
      let sa = 0, sb = 0;
      if (parsed.variety && a.variety === parsed.variety) sa += 20;
      if (parsed.variety && b.variety === parsed.variety) sb += 20;
      if (parsed.processing && a.processing === parsed.processing) sa += 30;
      if (parsed.processing && b.processing === parsed.processing) sb += 30;
      if (a.crop === '2026') sa += 5;
      if (b.crop === '2026') sb += 5;
      return sb - sa;
    });

    return rows[0];
  }

  function commercialPrice(p) {
    if (!p) return null;

    if (p.priceBasis === BASIS.CIF_DUBAI) {
      return {
        amount: p.pricePerMT,
        currency: p.currency,
        unit: 'MT',
        basis: BASIS.CIF_DUBAI,
        label: 'CIF Dubai'
      };
    }

    if (p.priceBasis === BASIS.FOB_ORIGIN && p.pricePerMT !== null) {
      return {
        amount: p.pricePerMT,
        currency: p.currency,
        unit: 'MT',
        basis: BASIS.FOB_ORIGIN,
        label: 'FOB origin'
      };
    }

    if (p.priceBasis === BASIS.DUBAI_STOCK && p.pricePerMT !== null) {
      return {
        amount: p.pricePerMT,
        currency: p.currency,
        unit: 'MT',
        basis: BASIS.DUBAI_STOCK,
        label: 'Dubai stock'
      };
    }

    return null;
  }

  window.GrainsHubData = {
    version: CONFIG.VERSION,
    CONFIG,
    BASIS,
    PACKING,
    load,
    ready,
    normalize,
    normalizeQuote,
    all,
    marketQuotes,
    inStock,
    booking,
    customPackingPrice,
    cifPrice,
    formatPrice,
    commercialPrice,
    parseQueryIdentity,
    findMarketQuotes,
    findExactMarketQuote,
    get state() {
      return {
        ...state,
        products: state.products.slice(),
        quotes: state.quotes.slice()
      };
    }
  };

  // Start loading immediately. UI may render before it finishes,
  // but Alliya will await the same promise and never tell the buyer
  // to refresh just because the data is still loading.
  GrainsHubData.load(false).catch(err => {
    console.warn('[GrainsHubData] Initial load failed:', err);
  });

})(window);
