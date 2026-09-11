/* ============================================================
   GRAINS HUB MARKET PULSE
   Version: 3.3 — LADY STARK TRADE DESK INTELLIGENCE

   Architecture:

   stock.json
        ↓
   grainsData.js
        ↓
   ┌───────────────┬────────────────┬────────────────┐
   │ Current Stock │ Price History  │ Trade Desk     │
   │               │                │ Intelligence   │
   └───────────────┴────────────────┴────────────────┘
                         ↓
                   Market Pulse

   DATA SOURCES
   ------------------------------------------------------------
   /assets/data/stock.json
   /assets/data/marketHistory.json
   /assets/data/marketSentiment.json
   /assets/data/freight.json

   IMPORTANT
   ------------------------------------------------------------
   • Never invent FOB prices.
   • Never invent CIF prices.
   • Never generate random trends.
   • Never silently add packing premiums.
   • Historical price movement requires dated observations.
   • CIF reference may use documented Grains Hub cost data,
     but must be clearly labelled as a Trade Desk reference.
   ============================================================ */

(function (window, document) {

  'use strict';

  /* ==========================================================
     1. CONFIGURATION
     ========================================================== */

  const CONFIG = {

    STOCK_URL:
      '/assets/data/stock.json',

    HISTORY_URL:
      '/assets/data/marketHistory.json',

    SENTIMENT_URL:
      '/assets/data/marketSentiment.json',

    FREIGHT_URL:
      '/assets/data/freight.json',

    REFRESH_INTERVAL:
      5 * 60 * 1000,

    HISTORY_REFRESH_INTERVAL:
      15 * 60 * 1000,

    MAX_CARDS:
      6,

    WHATSAPP:
      '971585521976',

    VERSION:
      '3.3',

    DEFAULT_CIF_ADDON_USD_PER_MT:
      null

  };


  /* ==========================================================
     2. STATE
     ========================================================== */

  const state = {

    products: [],
    history: [],
    sentiment: [],
    freight: [],

    currentFilter: 'all',
    currentSearch: '',

    basis: 'FOB_ORIGIN',
    packing: 'STANDARD_PP',

    sortKey: null,
    sortDirection: 'asc',

    loadedAt: null,
    historyLoadedAt: null,

    errors: []

  };


  /* ==========================================================
     3. CONSTANTS
     ========================================================== */

  const BASIS = {

    FOB_ORIGIN:
      'FOB_ORIGIN',

    CIF_DUBAI:
      'CIF_DUBAI',

    DUBAI_STOCK:
      'DUBAI_STOCK'

  };


  const PACKING = {

    STANDARD_PP:
      'STANDARD_PP',

    CUSTOM_NONWOVEN:
      'CUSTOM_NONWOVEN'

  };


  /* ==========================================================
     4. BASIC HELPERS
     ========================================================== */

  function text(value) {

    return value === null ||
           value === undefined
      ? ''
      : String(value).trim();

  }


  function lower(value) {

    return text(value).toLowerCase();

  }


  function number(value) {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const n = Number(
      String(value)
        .replace(/,/g, '')
        .replace(/[^\d.-]/g, '')
    );

    return Number.isFinite(n)
      ? n
      : null;

  }


  function formatNumber(value, decimals = 2) {

    const n = number(value);

    if (n === null) {
      return '—';
    }

    return n.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      }
    );

  }


  function escapeHTML(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


  function normalizeName(value) {

    return lower(value)
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  }


  function slug(value) {

    return normalizeName(value)
      .replace(/\s+/g, '-');

  }


  function getFlag(origin) {

    const o = lower(origin);

    if (o.includes('india')) {
      return '🇮🇳';
    }

    if (o.includes('pakistan')) {
      return '🇵🇰';
    }

    if (o.includes('thailand')) {
      return '🇹🇭';
    }

    if (o.includes('uae')) {
      return '🇦🇪';
    }

    return '🌍';

  }


  /* ==========================================================
     5. FETCH JSON SAFELY
     ========================================================== */

  async function fetchJSON(url) {

    const response = await fetch(
      url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(),
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {

      throw new Error(
        `${url} HTTP ${response.status}`
      );

    }

    return response.json();

  }


  /* ==========================================================
     6. LOAD CANONICAL STOCK
     ========================================================== */

  async function loadStock() {

    if (
      window.GrainsHubData &&
      typeof window.GrainsHubData.load === 'function'
    ) {

      return window.GrainsHubData.load(true);

    }


    const json =
      await fetchJSON(CONFIG.STOCK_URL);

    const raw =
      Array.isArray(json)
        ? json
        : Array.isArray(json.products)
          ? json.products
          : Array.isArray(json.items)
            ? json.items
            : [];

    if (!raw.length) {

      throw new Error(
        'No products found in stock.json'
      );

    }


    return raw.map(function (item, index) {

      return normalizeStockFallback(
        item,
        index
      );

    });

  }


  function normalizeStockFallback(item, index) {

    const price =
      number(
        item.price ??
        item.currentPrice ??
        item.spotPrice
      );

    const packageKg =
      number(
        item.packageKg ??
        item.packagingKg ??
        item.bagWeightKg
      );

    const stockBags =
      number(
        item.stockBags ??
        item.bagCount ??
        item.quantityBags
      );

    let stockMT =
      number(
        item.stockQuantityMT ??
        item.quantityMT ??
        item.availableMT
      );

    if (
      stockMT === null &&
      stockBags !== null &&
      packageKg !== null
    ) {

      stockMT =
        stockBags * packageKg / 1000;

    }


    let currency =
      text(item.currency)
        .toUpperCase();

    if (!currency) {

      const p =
        text(item.price)
          .toUpperCase();

      if (
        p.includes('USD') ||
        p.includes('$')
      ) {

        currency = 'USD';

      } else if (
        p.includes('AED')
      ) {

        currency = 'AED';

      }

    }


    let availability =
      lower(
        item.availability ??
        item.status ??
        item.stockStatus ??
        item.stock
      );

    if (
      availability.includes('booking') ||
      availability.includes('pre-booking') ||
      availability.includes('on request')
    ) {

      availability = 'BOOKING';

    } else {

      availability = 'IN_STOCK';

    }


    return {

      id:
        text(item.id ?? item.sku) ||
        `grain-${index}`,

      name:
        text(
          item.name ??
          item.product ??
          item.title
        ),

      origin:
        text(
          item.origin ??
          item.country
        ),

      supplier:
        text(
          item.supplier ??
          item.supplierName
        ),

      supplierTier:
        text(
          item.supplierTier ??
          item.badge ??
          item.tier
        ),

      packaging:
        text(
          item.packaging ??
          item.pack
        ),

      packageKg,

      availability,

      stockBags,

      stockMT,

      currency,

      price,

      priceUnit:
        text(
          item.priceUnit ??
          item.unit
        ),

      priceBasis:
        text(
          item.priceBasis ??
          item.basis
        ),

      fobUSDPerMT:
        number(
          item.fobUSDPerMT ??
          item.fobPriceUSDPerMT
        ),

      cifDubaiUSDPerMT:
        number(
          item.cifDubaiUSDPerMT ??
          item.cifUSDPerMT
        ),

      customNonwovenPremiumUSDPerMT:
        number(
          item.customNonwovenPremiumUSDPerMT ??
          item.customPackingPremiumUSDPerMT
        ),

      image:
        text(
          item.image ??
          item.img ??
          item.imageUrl
        ),

      raw:
        item

    };

  }


  /* ==========================================================
     7. LOAD MARKET HISTORY
     ========================================================== */

  async function loadHistory() {

    const json =
      await fetchJSON(CONFIG.HISTORY_URL);

    if (
      Array.isArray(json)
    ) {

      return json;

    }


    if (
      Array.isArray(json.records)
    ) {

      return json.records;

    }


    return [];

  }


  /* ==========================================================
     8. LOAD SENTIMENT
     ========================================================== */

  async function loadSentiment() {

    const json =
      await fetchJSON(CONFIG.SENTIMENT_URL);

    if (
      Array.isArray(json)
    ) {

      return json;

    }


    if (
      Array.isArray(json.records)
    ) {

      return json.records;

    }


    return [];

  }


  /* ==========================================================
     9. LOAD FREIGHT
     ========================================================== */

  async function loadFreight() {

    const json =
      await fetchJSON(CONFIG.FREIGHT_URL);

    if (
      Array.isArray(json)
    ) {

      return json;

    }


    if (
      Array.isArray(json.observed_costs)
    ) {

      return json.observed_costs;

    }


    return [];

  }


  /* ==========================================================
     10. HISTORY PRODUCT MATCHING
     ========================================================== */

  function historyTokens(value) {

    return normalizeName(value)
      .split(' ')
      .filter(Boolean);

  }


  function scoreHistoryMatch(
    product,
    history
  ) {

    const productName =
      normalizeName(product.name);

    const historyName =
      normalizeName(
        history.product ??
        history.name
      );

    const productOrigin =
      normalizeName(product.origin);

    const historyOrigin =
      normalizeName(history.origin);

    let score = 0;


    /* Origin is extremely important */

    if (
      productOrigin &&
      historyOrigin
    ) {

      if (
        productOrigin === historyOrigin
      ) {

        score += 20;

      } else {

        return -100;

      }

    }


    /* Exact normalized match */

    if (
      productName === historyName
    ) {

      score += 50;

    }


    /* Token matching */

    const productTokens =
      historyTokens(productName);

    const historyTokensList =
      historyTokens(historyName);


    productTokens.forEach(function(token) {

      if (
        historyTokensList.includes(token)
      ) {

        score += 4;

      }

    });


    /* Important rice identifiers */

    const identifiers = [
      '1121',
      '1509',
      '1718',
      '1847',
      '1401',
      'pusa',
      'sugandha',
      'taj',
      'sharbati',
      'rh10',
      'pr11',
      'pr14',
      'pr106',
      'pr47',
      'pr26',
      'ir64',
      'sona',
      'masoori'
    ];


    identifiers.forEach(function(id) {

      if (
        productName.includes(id) &&
        historyName.includes(id)
      ) {

        score += 8;

      }

    });


    /* Processing form */

    const processingWords = [
      'raw',
      'white',
      'steam',
      'steamed',
      'creamy',
      'sella',
      'golden',
      'dark',
      'light',
      'parboiled'
    ];


    processingWords.forEach(function(word) {

      if (
        productName.includes(word) &&
        historyName.includes(word)
      ) {

        score += 6;

      }

    });


    return score;

  }


  function findHistoryMatches(product) {

    return state.history
      .filter(function(record) {

        return (
          lower(record.basis) === 'fob' ||
          lower(record.basis) === 'cif' ||
          lower(record.basis) === 'cfr' ||
          lower(record.basis) === 'c&f'
        );

      })
      .map(function(record) {

        return {

          record,

          score:
            scoreHistoryMatch(
              product,
              record
            )

        };

      })
      .filter(function(item) {

        return item.score > 0;

      })
      .sort(function(a, b) {

        return b.score - a.score;

      });

  }


  function bestHistoryRecord(product) {

    const matches =
      findHistoryMatches(product);

    return matches.length
      ? matches[0].record
      : null;

  }


  /* ==========================================================
     11. HISTORY PRICE
     ========================================================== */

  function historyPrice(product) {

    const record =
      bestHistoryRecord(product);

    if (!record) {

      return null;

    }


    const price =
      number(record.price);

    if (price === null) {

      return null;

    }


    return {

      price,

      currency:
        text(record.currency)
          .toUpperCase() ||
        'USD',

      unit:
        text(record.unit) ||
        'MT',

      basis:
        text(record.basis)
          .toUpperCase(),

      packing:
        text(record.packing),

      crop:
        text(record.crop),

      port:
        text(record.port),

      source:
        text(record.source),

      sourceType:
        text(record.sourceType),

      sourceDocument:
        text(record.sourceDocument),

      confidence:
        text(record.confidence),

      quoteDate:
        record.quoteDate ||
        record.capturedAt ||
        null,

      record

    };

  }


  /* ==========================================================
     12. HISTORICAL TREND ENGINE
     ========================================================== */

  function recordDate(record) {

    const candidates = [
      record.quoteDate,
      record.capturedAt,
      record.observedAt,
      record.date,
      record.timestamp
    ];


    for (
      let i = 0;
      i < candidates.length;
      i++
    ) {

      if (!candidates[i]) {
        continue;
      }

      const d =
        new Date(candidates[i]);

      if (
        !Number.isNaN(
          d.getTime()
        )
      ) {

        return d;

      }

    }


    return null;

  }


  function getDatedHistory(product) {

    return findHistoryMatches(product)
      .map(function(item) {

        return {

          record:
            item.record,

          score:
            item.score,

          date:
            recordDate(item.record),

          price:
            number(item.record.price)

        };

      })
      .filter(function(item) {

        return (
          item.date !== null &&
          item.price !== null
        );

      })
      .sort(function(a, b) {

        return (
          a.date.getTime() -
          b.date.getTime()
        );

      });

  }


  function calculateTrend(product) {

    const records =
      getDatedHistory(product);


    /*
       We deliberately require dated observations.

       One current quote is NOT a trend.
    */

    if (
      records.length < 2
    ) {

      return {

        available:
          false,

        label:
          'No trend data',

        change24h:
          null,

        change7d:
          null,

        change30d:
          null,

        firstPrice:
          null,

        latestPrice:
          null

      };

    }


    const latest =
      records[records.length - 1];


    function findPreviousWithin(
      days
    ) {

      const cutoff =
        latest.date.getTime() -
        days *
        24 *
        60 *
        60 *
        1000;


      const eligible =
        records.filter(function(item) {

          return (
            item.date.getTime() <=
            cutoff
          );

        });


      if (!eligible.length) {

        return null;

      }


      return eligible[
        eligible.length - 1
      ];

    }


    function percentChange(previous) {

      if (
        !previous ||
        previous.price === 0
      ) {

        return null;

      }


      return (
        (
          latest.price -
          previous.price
        ) /
        previous.price
      ) * 100;

    }


    const previous24 =
      findPreviousWithin(1);

    const previous7 =
      findPreviousWithin(7);

    const previous30 =
      findPreviousWithin(30);


    return {

      available:
        true,

      label:
        'Historical trend',

      change24h:
        percentChange(previous24),

      change7d:
        percentChange(previous7),

      change30d:
        percentChange(previous30),

      firstPrice:
        records[0].price,

      latestPrice:
        latest.price,

      records

    };

  }


  /* ==========================================================
     13. CURRENT FOB
     ========================================================== */

  function getFOB(product) {

    /*
       First priority:
       Explicit current FOB stored in stock.json.
    */

    if (
      product.fobUSDPerMT !== null &&
      product.fobUSDPerMT !== undefined
    ) {

      return {

        price:
          product.fobUSDPerMT,

        source:
          'Current stock record',

        confidence:
          'Recorded',

        packing:
          product.packaging || ''

      };

    }


    /*
       Second priority:
       Real Grains Hub historical/supplier observation.
    */

    const historical =
      historyPrice(product);


    if (
      historical &&
      historical.basis === 'FOB'
    ) {

      return {

        price:
          historical.price,

        source:
          historical.source ||
          'Recorded supplier quotation',

        sourceType:
          historical.sourceType,

        sourceDocument:
          historical.sourceDocument,

        confidence:
          historical.confidence ||
          'Recorded',

        packing:
          historical.packing,

        crop:
          historical.crop,

        port:
          historical.port,

        quoteDate:
          historical.quoteDate

      };

    }


    return null;

  }


  /* ==========================================================
     14. FREIGHT / ALL-IN ADDITION
     ========================================================== */

  function getCurrentAllInAddition() {

    const candidates =
      state.freight
        .filter(function(item) {

          return (
            number(
              item.additionalCostUSDPerMT
            ) !== null
          );

        })
        .map(function(item) {

          return {

            value:
              number(
                item.additionalCostUSDPerMT
              ),

            item

          };

        });


    /*
       Prefer an explicitly observed current
       Grains Hub actual cost.
    */

    const observed =
      candidates.find(function(candidate) {

        const item =
          candidate.item;

        return (
          lower(item.status) ===
          'observed'
          &&
          lower(item.sourceType)
            .includes('grains_hub')
        );

      });


    if (observed) {

      return {

        value:
          observed.value,

        item:
          observed.item,

        label:
          'Current Grains Hub all-in reference'

      };

    }


    /*
       Fallback to any observed additional cost.
    */

    const fallback =
      candidates.find(function(candidate) {

        return (
          lower(
            candidate.item.status
          ) === 'observed'
        );

      });


    if (fallback) {

      return {

        value:
          fallback.value,

        item:
          fallback.item,

        label:
          'Observed logistics reference'

      };

    }


    return null;

  }


  /* ==========================================================
     15. EXPLICIT CUSTOM PACKING PREMIUM
     ========================================================== */

  function getCustomPackingPremium(product) {

    /*
       NEVER assume $30.

       Only use a product-specific value if
       the data actually contains one.
    */

    if (
      product.customNonwovenPremiumUSDPerMT !== null &&
      product.customNonwovenPremiumUSDPerMT !== undefined
    ) {

      return {

        value:
          product.customNonwovenPremiumUSDPerMT,

        source:
          'Product-specific packing record'

      };

    }


    return null;

  }


  /* ==========================================================
     16. CIF ENGINE
     ========================================================== */

  function getCIF(product) {

    /*
       1. Explicit CIF in stock data.
    */

    if (
      product.cifDubaiUSDPerMT !== null &&
      product.cifDubaiUSDPerMT !== undefined
    ) {

      return {

        price:
          product.cifDubaiUSDPerMT,

        type:
          'recorded',

        label:
          'Recorded CIF Dubai',

        source:
          'Current stock record',

        components:
          []

      };

    }


    /*
       2. Look for a real CIF/CFR history observation.
    */

    const matches =
      findHistoryMatches(product);


    const explicitCIF =
      matches.find(function(match) {

        const basis =
          lower(
            match.record.basis
          );

        return (
          basis === 'cif' ||
          basis === 'cfr' ||
          basis === 'c&f'
        );

      });


    if (explicitCIF) {

      const price =
        number(
          explicitCIF.record.price
        );


      if (price !== null) {

        return {

          price,

          type:
            'recorded',

          label:
            'Recorded CIF/CFR Dubai',

          source:
            explicitCIF.record.source ||
            'Recorded quotation',

          confidence:
            explicitCIF.record.confidence,

          components:
            []

        };

      }

    }


    /*
       3. Calculate a clearly-labelled
          Grains Hub Trade Desk reference.

       Current observed addition:
       $260/MT for 25 MT FCL.

       This is NOT presented as a permanent
       freight rate.
    */

    const fob =
      getFOB(product);

    const addon =
      getCurrentAllInAddition();


    if (
      !fob ||
      !addon
    ) {

      return null;

    }


    /*
       Custom packing:
       We do NOT silently add a premium.

       If a specific premium exists,
       add it separately.
    */

    let packingPremium =
      0;

    const components = [];


    if (
      state.packing ===
      PACKING.CUSTOM_NONWOVEN
    ) {

      const customPremium =
        getCustomPackingPremium(product);


      if (!customPremium) {

        return {

          price:
            null,

          type:
            'unavailable',

          label:
            'CIF reference unavailable',

          reason:
            'Custom packing premium is not recorded for this product.',

          components:
            []

        };

      }


      packingPremium =
        customPremium.value;


      components.push({

        name:
          'Custom packing premium',

        value:
          packingPremium

      });

    }


    components.push({

      name:
        'FOB origin',

      value:
        fob.price

    });


    components.push({

      name:
        'Current all-in Dubai addition',

      value:
        addon.value

    });


    const finalPrice =
      fob.price +
      addon.value +
      packingPremium;


    return {

      price:
        finalPrice,

      type:
        'trade_desk_reference',

      label:
        'Grains Hub Trade Desk reference',

      source:
        'Grains Hub Trade Desk',

      confidence:
        addon.item.confidence ||
        'Observed',

      components,

      addonPerMT:
        addon.value,

      packingPremium:

        packingPremium,

      freightRecord:
        addon.item

    };

  }


  /* ==========================================================
     17. DUBAI STOCK PRICE
     ========================================================== */

  function getDubaiStock(product) {

    if (
      product.currency !== 'AED' ||
      product.price === null
    ) {

      return null;

    }


    return {

      price:
        product.price,

      unit:
        product.priceUnit,

      packageKg:
        product.packageKg,

      pricePerKg:
        product.pricePerKg,

      pricePerMT:
        product.pricePerMT

    };

  }


  /* ==========================================================
     18. PRICE PRESENTATION
     ========================================================== */

  function getDisplayedPrice(product) {

    if (
      state.basis ===
      BASIS.FOB_ORIGIN
    ) {

      const fob =
        getFOB(product);


      if (!fob) {

        return {

          main:
            'Price on request',

          sub:
            'FOB price not recorded',

          available:
            false

        };

      }


      return {

        main:
          `USD ${formatNumber(
            fob.price,
            2
          )} / MT`,

        sub:
          [
            fob.port ||
              'FOB Origin',

            fob.packing
              ? `• ${fob.packing}`
              : '',

            fob.crop
              ? `• Crop ${fob.crop}`
              : ''

          ]
          .filter(Boolean)
          .join(' '),

        source:
          fob.source,

        confidence:
          fob.confidence,

        available:
          true

      };

    }


    if (
      state.basis ===
      BASIS.CIF_DUBAI
    ) {

      const cif =
        getCIF(product);


      if (
        !cif ||
        cif.price === null
      ) {

        return {

          main:
            'Price on request',

          sub:
            cif?.reason ||
            'CIF Dubai price not recorded',

          available:
            false

        };

      }


      return {

        main:
          `USD ${formatNumber(
            cif.price,
            2
          )} / MT`,

        sub:
          cif.label,

        source:
          cif.source,

        confidence:
          cif.confidence,

        type:
          cif.type,

        available:
          true

      };

    }


    const stock =
      getDubaiStock(product);


    if (!stock) {

      return {

        main:
          'Price on request',

        sub:
          'Dubai stock price not recorded',

        available:
          false

      };

    }


    let main =
      'AED ' +
      formatNumber(
        stock.price,
        2
      );


    if (
      stock.priceUnit ===
      'MT'
    ) {

      main +=
        ' / MT';

    } else if (
      stock.priceUnit ===
      'KG'
    ) {

      main +=
        ' / kg';

    } else if (
      stock.packageKg
    ) {

      main +=
        ` / ${formatNumber(
          stock.packageKg,
          0
        )}kg`;

    }


    return {

      main,

      sub:
        stock.pricePerKg !== null &&
        stock.pricePerKg !== undefined
          ? `${formatNumber(
              stock.pricePerKg,
              2
            )} AED/kg`
          : 'Dubai stock',

      available:
        true

    };

  }


  /* ==========================================================
     19. TREND PRESENTATION
     ========================================================== */

  function getTrend(product) {

    const trend =
      calculateTrend(product);


    /*
       Do not invent a trend.

       Existing explicit stock trend can only
       be used if the user has actually supplied
       one. Historical trend has priority.
    */

    if (
      trend.available
    ) {

      const value =
        trend.change7d ??
        trend.change24h ??
        trend.change30d;


      if (
        value === null
      ) {

        return {

          text:
            'Historical data',

          className:
            'trend-flat',

          value:
            null

        };

      }


      if (
        value > 0
      ) {

        return {

          text:
            `▲ +${formatNumber(
              value,
              1
            )}% / 7D`,

          className:
            'trend-up',

          value

        };

      }


      if (
        value < 0
      ) {

        return {

          text:
            `▼ ${formatNumber(
              value,
              1
            )}% / 7D`,

          className:
            'trend-down',

          value

        };

      }


      return {

        text:
          '■ 0.0% / 7D',

        className:
          'trend-flat',

        value:
          0

      };

    }


    return {

      text:
        'No trend data',

      className:
        'trend-flat',

      value:
        null

    };

  }


  /* ==========================================================
     20. SENTIMENT
     ========================================================== */

  function sentimentForProduct(product) {

    const origin =
      lower(product.origin);


    /*
       Product-specific sentiment can later be
       added by productId/product.

       For now we support market/origin records.
    */

    const matches =
      state.sentiment
        .filter(function(record) {

          const recordOrigin =
            lower(record.origin);

          const market =
            lower(record.market);

          return (
            (
              recordOrigin &&
              origin &&
              recordOrigin === origin
            )
            ||
            (
              market &&
              origin &&
              market.includes(origin)
            )
          );

        })
        .sort(function(a, b) {

          const da =
            recordDate(a);

          const db =
            recordDate(b);


          if (!da && !db) {
            return 0;
          }

          if (!da) {
            return 1;
          }

          if (!db) {
            return -1;
          }


          return (
            db.getTime() -
            da.getTime()
          );

        });


    const record =
      matches[0];


    if (!record) {

      return null;

    }


    /*
       Do not display the seed sentiment as
       a real Trade Desk call.
    */

    const note =
      lower(record.note);


    if (
      note.includes('initial structure') ||
      note.includes('seed record') ||
      note.includes('replace with the trade desk')
    ) {

      return null;

    }


    return record;

  }


  function sentimentLabel(record) {

    if (!record) {

      return {

        label:
          'No current desk view',

        icon:
          '⚪',

        className:
          'sentiment-neutral'

      };

    }


    const direction =
      lower(
        record.direction ??
        record.deskView
      );


    if (
      direction.includes('strong_bullish') ||
      direction.includes('strong bullish')
    ) {

      return {

        label:
          'Strong Bullish',

        icon:
          '🟢',

        className:
          'sentiment-bullish'

      };

    }


    if (
      direction.includes('bullish')
    ) {

      return {

        label:
          'Bullish',

        icon:
          '🟢',

        className:
          'sentiment-bullish'

      };

    }


    if (
      direction.includes('strong_bearish') ||
      direction.includes('strong bearish')
    ) {

      return {

        label:
          'Strong Bearish',

        icon:
          '🔴',

        className:
          'sentiment-bearish'

      };

    }


    if (
      direction.includes('bearish')
    ) {

      return {

        label:
          'Bearish',

        icon:
          '🔴',

        className:
          'sentiment-bearish'

      };

    }


    return {

      label:
        'Neutral',

      icon:
        '🟡',

      className:
        'sentiment-neutral'

    };

  }


  /* ==========================================================
     21. STOCK DISPLAY
     ========================================================== */

  function stockDisplay(product) {

    if (
      product.availability ===
      'BOOKING'
    ) {

      return {

        text:
          'On request',

        className:
          'booking'

      };

    }


    if (
      product.availability ===
      'OUT_OF_STOCK'
    ) {

      return {

        text:
          'Out of stock',

        className:
          'out-stock'

      };

    }


    if (
      product.stockMT !== null &&
      product.stockMT !== undefined
    ) {

      return {

        text:
          `${formatNumber(
            product.stockMT,
            2
          )} MT`,

        className:
          'in-stock'

      };

    }


    return {

      text:
        'Contact Trade Desk',

      className:
        'unknown-stock'

    };

  }


  /* ==========================================================
     22. SUPPLIER DISPLAY
     ========================================================== */

  function supplierDisplay(product) {

    return (
      product.supplier ||
      'Supplier on request'
    );

  }


  function badgeDisplay(product) {

    return (
      product.supplierTier ||
      (
        product.availability ===
        'BOOKING'
          ? 'Pre-Booking'
          : 'Verified Supplier'
      )
    );

  }


  /* ==========================================================
     23. WHATSAPP
     ========================================================== */

  function whatsappURL(product) {

    const message =
      [
        'Hi Grains Hub Trade Desk,',
        '',
        `I want a quote for ${product.name}.`,
        product.origin
          ? `Origin: ${product.origin}`
          : '',
        `Basis: ${basisLabel()}`,
        `Packing: ${packingLabel()}`
      ]
      .filter(Boolean)
      .join('\n');


    return (
      'https://wa.me/' +
      CONFIG.WHATSAPP +
      '?text=' +
      encodeURIComponent(message)
    );

  }


  /* ==========================================================
     24. LABELS
     ========================================================== */

  function basisLabel() {

    if (
      state.basis ===
      BASIS.FOB_ORIGIN
    ) {

      return 'FOB Origin';

    }


    if (
      state.basis ===
      BASIS.CIF_DUBAI
    ) {

      return 'CIF Dubai';

    }


    return 'Dubai Stock';

  }


  function packingLabel() {

    return (
      state.packing ===
      PACKING.CUSTOM_NONWOVEN
        ? 'Custom Nonwoven'
        : 'Standard PP'
    );

  }


  /* ==========================================================
     25. PRICE BASIS CONTROL
     ========================================================== */

  function createBasisControls() {

    /*
       If v3.2 already created the controls,
       reuse them.

       Otherwise create a clean control bar.
    */

    const existing =
      document.querySelector(
        '[data-gh-pulse-basis-controls]'
      );


    if (existing) {

      return existing;

    }


    const container =
      document.querySelector(
        '.container'
      );


    if (!container) {

      return null;

    }


    const bar =
      document.createElement('div');


    bar.setAttribute(
      'data-gh-pulse-basis-controls',
      'true'
    );


    bar.innerHTML = `

      <div class="gh-pulse-control-inner">

        <div class="gh-control-group">

          <span class="gh-control-label">
            PRICE BASIS
          </span>

          <button
            type="button"
            data-gh-basis="FOB_ORIGIN"
            class="gh-basis-btn active"
          >
            FOB Origin
          </button>

          <button
            type="button"
            data-gh-basis="CIF_DUBAI"
            class="gh-basis-btn"
          >
            CIF Dubai
          </button>

          <button
            type="button"
            data-gh-basis="DUBAI_STOCK"
            class="gh-basis-btn"
          >
            Dubai Stock
          </button>

        </div>


        <div class="gh-control-group">

          <span class="gh-control-label">
            PACKING
          </span>

          <button
            type="button"
            data-gh-packing="STANDARD_PP"
            class="gh-packing-btn active"
          >
            Standard PP
          </button>

          <button
            type="button"
            data-gh-packing="CUSTOM_NONWOVEN"
            class="gh-packing-btn"
          >
            Custom Nonwoven
          </button>

        </div>


        <div
          id="gh-pulse-basis-note"
          class="gh-pulse-basis-note"
        ></div>

      </div>

    `;


    container.insertBefore(
      bar,
      container.firstElementChild
    );


    injectControlCSS();


    return bar;

  }


  function injectControlCSS() {

    if (
      document.getElementById(
        'gh-pulse-v33-style'
      )
    ) {

      return;

    }


    const style =
      document.createElement('style');


    style.id =
      'gh-pulse-v33-style';


    style.textContent = `

      [data-gh-pulse-basis-controls] {
        margin-bottom: 20px;
        background: #fff;
        border: 1px solid #e8e4d8;
        border-radius: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,.05);
      }

      .gh-pulse-control-inner {
        padding: 16px 20px;
      }

      .gh-control-group {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }

      .gh-control-group:last-of-type {
        margin-bottom: 6px;
      }

      .gh-control-label {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .8px;
        color: #777;
        margin-right: 4px;
      }

      .gh-basis-btn,
      .gh-packing-btn {
        border: 1px solid #e1dccf;
        background: #fff;
        color: #555;
        border-radius: 999px;
        padding: 8px 15px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all .2s ease;
      }

      .gh-basis-btn:hover,
      .gh-packing-btn:hover {
        border-color: #c1a875;
        transform: translateY(-1px);
      }

      .gh-basis-btn.active,
      .gh-packing-btn.active {
        background: #1d1b36;
        color: #fff;
        border-color: #1d1b36;
        box-shadow: 0 3px 10px rgba(0,0,0,.08);
      }

      .gh-pulse-basis-note {
        text-align: center;
        color: #888;
        font-size: 12px;
        line-height: 1.5;
        min-height: 18px;
      }

      .gh-source-line {
        margin-top: 6px;
        color: #888;
        font-size: 11px;
        line-height: 1.4;
      }

      .gh-trade-desk-strip {
        margin-bottom: 24px;
        padding: 16px 18px;
        background: linear-gradient(
          135deg,
          #faf8f0,
          #fff
        );
        border: 1px solid #e5dcc5;
        border-radius: 14px;
      }

      .gh-trade-desk-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .5px;
        color: #80672c;
        margin-bottom: 8px;
      }

      .gh-trade-desk-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0,1fr));
        gap: 12px;
      }

      .gh-desk-metric {
        background: rgba(255,255,255,.8);
        border: 1px solid #eee8da;
        border-radius: 10px;
        padding: 10px 12px;
      }

      .gh-desk-metric-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .5px;
        color: #999;
        margin-bottom: 4px;
      }

      .gh-desk-metric-value {
        font-size: 15px;
        font-weight: 800;
        color: #242238;
      }

      .gh-provenance {
        display: block;
        margin-top: 6px;
        font-size: 10px;
        color: #999;
      }

      .gh-reference {
        color: #80672c;
      }

      .gh-recorded {
        color: #37734b;
      }

      .gh-no-data {
        color: #999;
      }

      .gh-sentiment-line {
        margin-top: 10px;
        font-size: 12px;
        color: #666;
      }

      @media (max-width: 800px) {

        .gh-trade-desk-grid {
          grid-template-columns:
            repeat(2, minmax(0,1fr));
        }

      }

      @media (max-width: 520px) {

        .gh-control-group {
          justify-content: flex-start;
        }

        .gh-trade-desk-grid {
          grid-template-columns: 1fr;
        }

        .gh-control-label {
          width: 100%;
          margin-bottom: 2px;
        }

      }

    `;


    document.head.appendChild(style);

  }


  /* ==========================================================
     26. CONNECT EXISTING V3.2 CONTROLS
     ========================================================== */

  function connectExistingControls() {

    const basisButtons =
      document.querySelectorAll(
        '[data-gh-basis]'
      );


    const packingButtons =
      document.querySelectorAll(
        '[data-gh-packing]'
      );


    basisButtons.forEach(function(btn) {

      btn.addEventListener(
        'click',
        function() {

          const value =
            this.dataset.ghBasis;

          if (
            !BASIS[value]
          ) {

            return;

          }


          state.basis =
            BASIS[value];

          updateControlState();

          renderAll();

        }
      );

    });


    packingButtons.forEach(function(btn) {

      btn.addEventListener(
        'click',
        function() {

          const value =
            this.dataset.ghPacking;

          if (
            !PACKING[value]
          ) {

            return;

          }


          state.packing =
            PACKING[value];

          updateControlState();

          renderAll();

        }
      );

    });

  }


  function updateControlState() {

    document
      .querySelectorAll(
        '[data-gh-basis]'
      )
      .forEach(function(btn) {

        btn.classList.toggle(
          'active',
          btn.dataset.ghBasis ===
          state.basis
        );

      });


    document
      .querySelectorAll(
        '[data-gh-packing]'
      )
      .forEach(function(btn) {

        btn.classList.toggle(
          'active',
          btn.dataset.ghPacking ===
          state.packing
        );

      });


    const note =
      document.getElementById(
        'gh-pulse-basis-note'
      );


    if (!note) {

      return;

    }


    if (
      state.basis ===
      BASIS.FOB_ORIGIN
    ) {

      note.textContent =
        state.packing ===
        PACKING.CUSTOM_NONWOVEN
          ? 'FOB Origin uses recorded supplier FOB. Custom packing is shown only when a specific premium is recorded.'
          : 'FOB Origin = recorded supplier/exporter quotation or Grains Hub FOB observation. No freight is added.';

      return;

    }


    if (
      state.basis ===
      BASIS.CIF_DUBAI
    ) {

      const addon =
        getCurrentAllInAddition();


      if (addon) {

        note.textContent =
          state.packing ===
          PACKING.CUSTOM_NONWOVEN
            ? 'CIF Dubai = recorded CIF where available. Otherwise the Trade Desk may calculate a reference only when all required components are documented.'
            : `CIF Dubai = recorded CIF where available, otherwise Grains Hub Trade Desk reference using the current observed +USD ${formatNumber(addon.value, 2)}/MT all-in addition.`;

      } else {

        note.textContent =
          'CIF Dubai = recorded CIF where available. No logistics reference is currently available for calculation.';

      }

      return;

    }


    note.textContent =
      'Dubai Stock = current local inventory price from the canonical stock feed.';

  }


  /* ==========================================================
     27. TRADE DESK SUMMARY
     ========================================================== */

  function renderTradeDeskSummary() {

    const container =
      document.querySelector(
        '.container'
      );


    if (!container) {

      return;

    }


    let strip =
      document.getElementById(
        'gh-trade-desk-summary'
      );


    if (!strip) {

      strip =
        document.createElement('div');

      strip.id =
        'gh-trade-desk-summary';

      strip.className =
        'gh-trade-desk-strip';

      container.insertBefore(
        strip,
        container.firstElementChild?.nextSibling ||
        container.firstElementChild
      );

    }


    const addon =
      getCurrentAllInAddition();


    const indiaSentiment =
      state.sentiment.find(function(record) {

        return (
          lower(record.origin) ===
          'india'
          ||
          lower(record.market)
            .includes('indian rice')
        );

      });


    const sentiment =
      sentimentLabel(
        (
          indiaSentiment &&
          !lower(
            indiaSentiment.note
          ).includes('initial structure')
        )
          ? indiaSentiment
          : null
      );


    let costValue =
      'Not recorded';


    if (addon) {

      costValue =
        `+USD ${formatNumber(
          addon.value,
          2
        )}/MT`;

    }


    const historyCount =
      state.history.length;


    strip.innerHTML = `

      <div class="gh-trade-desk-title">
        🌾 🌾 GRAINS HUB TRADE DESK
      </div>

      <div class="gh-trade-desk-grid">

        <div class="gh-desk-metric">

          <div class="gh-desk-metric-label">
            Current Cost Reference
          </div>

          <div class="gh-desk-metric-value">
            ${escapeHTML(costValue)}
          </div>

          <span class="gh-provenance">
            25 MT FCL all-in reference
          </span>

        </div>


        <div class="gh-desk-metric">

          <div class="gh-desk-metric-label">
            FOB Observations
          </div>

          <div class="gh-desk-metric-value">
            ${formatNumber(
              historyCount,
              0
            )}
          </div>

          <span class="gh-provenance">
            Recorded market history
          </span>

        </div>


        <div class="gh-desk-metric">

          <div class="gh-desk-metric-label">
            Desk View
          </div>

          <div class="gh-desk-metric-value">
            ${escapeHTML(
              sentiment.icon +
              ' ' +
              sentiment.label
            )}
          </div>

          <span class="gh-provenance">
            Human Trade Desk intelligence
          </span>

        </div>


        <div class="gh-desk-metric">

          <div class="gh-desk-metric-label">
            Price Basis
          </div>

          <div class="gh-desk-metric-value">
            ${escapeHTML(
              basisLabel()
            )}
          </div>

          <span class="gh-provenance">
            ${escapeHTML(
              packingLabel()
            )}
          </span>

        </div>

      </div>

    `;

  }


  /* ==========================================================
     28. FILTERING
     ========================================================== */

  function applyFilters() {

    let result =
      state.products.slice();


    if (
      state.currentFilter &&
      state.currentFilter !==
      'all'
    ) {

      if (
        lower(state.currentFilter) ===
        'booking'
      ) {

        result =
          result.filter(function(product) {

            return (
              product.availability ===
              'BOOKING'
            );

          });

      } else {

        result =
          result.filter(function(product) {

            return (
              lower(product.origin) ===
              lower(state.currentFilter)
            );

          });

      }

    }


    if (
      state.currentSearch
    ) {

      const query =
        normalizeName(
          state.currentSearch
        );


      result =
        result.filter(function(product) {

          const haystack =
            normalizeName(
              [
                product.name,
                product.origin,
                product.supplier,
                product.packaging
              ]
              .filter(Boolean)
              .join(' ')
            );


          return haystack.includes(query);

        });

    }


    if (
      state.sortKey
    ) {

      result.sort(function(a, b) {

        let va =
          sortValue(
            a,
            state.sortKey
          );

        let vb =
          sortValue(
            b,
            state.sortKey
          );


        if (
          typeof va === 'string'
        ) {

          va =
            lower(va);

        }


        if (
          typeof vb === 'string'
        ) {

          vb =
            lower(vb);

        }


        if (
          va === vb
        ) {

          return 0;

        }


        const direction =
          state.sortDirection ===
          'asc'
            ? 1
            : -1;


        return va < vb
          ? -1 * direction
          : 1 * direction;

      });

    }


    return result;

  }


  function sortValue(product, key) {

    if (
      key ===
      'product'
    ) {

      return product.name;

    }


    if (
      key ===
      'supplier'
    ) {

      return supplierDisplay(
        product
      );

    }


    if (
      key ===
      'priceRaw'
    ) {

      const displayed =
        getDisplayedPrice(
          product
        );

      return (
        number(
          displayed.main
        ) ??
        Number.MAX_SAFE_INTEGER
      );

    }


    if (
      key ===
      'trendChange'
    ) {

      const trend =
        calculateTrend(
          product
        );

      return (
        trend.change7d ??
        trend.change24h ??
        -999999
      );

    }


    return '';

  }


  /* ==========================================================
     29. CARD RENDERING
     ========================================================== */

  function renderCards(data) {

    const container =
      document.getElementById(
        'priceCards'
      );


    if (!container) {

      return;

    }


    const top =
      data.slice(
        0,
        CONFIG.MAX_CARDS
      );


    if (!top.length) {

      container.innerHTML = `

        <div
          style="
            grid-column:1/-1;
            text-align:center;
            padding:40px;
            color:#999;
          "
        >
          No products found
          matching your criteria.
        </div>

      `;

      return;

    }


    container.innerHTML =
      top.map(function(product) {

        const price =
          getDisplayedPrice(
            product
          );


        const trend =
          getTrend(product);


        const stock =
          stockDisplay(product);


        const sentiment =
          sentimentLabel(
            sentimentForProduct(
              product
            )
          );


        const badge =
          badgeDisplay(
            product
          );


        const sourceClass =
          price.type ===
          'recorded'
            ? 'gh-recorded'
            : price.available
              ? 'gh-reference'
              : 'gh-no-data';


        return `

          <div
            class="price-card"
            data-origin="${escapeHTML(
              product.origin
            )}"
          >

            <div class="product-header">

              <span class="product-name">
                ${escapeHTML(
                  product.name
                )}
              </span>

              <span class="flag">
                ${getFlag(
                  product.origin
                )}
              </span>

            </div>


            <div class="price">

              ${escapeHTML(
                price.main
              )}

            </div>


            <div
              class="price-sub"
              style="
                text-align:center;
                color:#888;
                font-size:11px;
                margin-top:-3px;
                margin-bottom:7px;
              "
            >

              ${escapeHTML(
                price.sub
              )}

            </div>


            <div class="price-details">

              <span
                class="trend ${
                  trend.className
                }"
              >
                ${escapeHTML(
                  trend.text
                )}
              </span>

              <span
                style="
                  font-size:13px;
                  color:#666;
                "
              >
                ${
                  product.availability ===
                  'BOOKING'
                    ? '📋 Booking'
                    : '📦 ' +
                      escapeHTML(
                        stock.text
                      )
                }
              </span>

            </div>


            <div class="stock-info">

              <span>
                ${escapeHTML(
                  supplierDisplay(
                    product
                  )
                )}
              </span>

              <span class="badge">
                ${escapeHTML(
                  badge
                )}
              </span>

            </div>


            <div
              style="
                text-align:center;
                margin-top:7px;
                font-size:12px;
                color:#777;
              "
            >

              ${escapeHTML(
                packingLabel()
              )}

              &nbsp;

              ${sentiment.icon}

              ${escapeHTML(
                sentiment.label
              )}

            </div>


            <span
              class="gh-provenance ${
                sourceClass
              }"
              style="text-align:center;"
            >

              ${
                price.available
                  ? escapeHTML(
                      price.source ||
                      (
                        state.basis ===
                        BASIS.DUBAI_STOCK
                          ? 'Canonical stock feed'
                          : 'Recorded data'
                      )
                    )
                  : escapeHTML(
                      price.sub
                    )
              }

            </span>


            <a
              href="${escapeHTML(
                whatsappURL(
                  product
                )
              )}"
              class="book-btn"
              target="_blank"
              rel="noopener"
            >

              <i class="fab fa-whatsapp"></i>
              Get Quote

            </a>

          </div>

        `;

      })
      .join('');

  }


  /* ==========================================================
     30. TABLE RENDERING
     ========================================================== */

  function renderTable(data) {

    const tbody =
      document.getElementById(
        'pulse-table'
      );


    if (!tbody) {

      return;

    }


    if (!data.length) {

      tbody.innerHTML = `

        <tr>

          <td
            colspan="6"
            style="
              text-align:center;
              padding:40px;
              color:#999;
            "
          >

            No products found
            matching your criteria.

          </td>

        </tr>

      `;

      return;

    }


    tbody.innerHTML =
      data.map(function(product) {

        const price =
          getDisplayedPrice(
            product
          );


        const trend =
          getTrend(product);


        const stock =
          stockDisplay(product);


        const badge =
          badgeDisplay(
            product
          );


        const sourceClass =
          price.type ===
          'recorded'
            ? 'gh-recorded'
            : price.available
              ? 'gh-reference'
              : 'gh-no-data';


        return `

          <tr
            class="${
              product.availability ===
              'BOOKING'
                ? 'row-booking'
                : 'row-local'
            }"
          >

            <td class="col-product">

              <strong>
                ${escapeHTML(
                  product.name
                )}
              </strong>

              <div
                style="
                  color:#888;
                  font-size:11px;
                  margin-top:3px;
                "
              >

                ${getFlag(
                  product.origin
                )}

                ${escapeHTML(
                  product.origin
                )}

              </div>

            </td>


            <td class="col-price">

              <strong>
                ${escapeHTML(
                  price.main
                )}
              </strong>

              <div
                style="
                  color:#999;
                  font-size:10px;
                  margin-top:3px;
                "
              >

                ${escapeHTML(
                  price.sub
                )}

              </div>

              <span
                class="gh-provenance ${
                  sourceClass
                }"
              >

                ${
                  price.available
                    ? escapeHTML(
                        price.source ||
                        'Recorded data'
                      )
                    : ''
                }

              </span>

            </td>


            <td class="col-trend">

              <span
                class="trend ${
                  trend.className
                }"
              >

                ${escapeHTML(
                  trend.text
                )}

              </span>


              <div
                style="
                  margin-top:5px;
                  font-size:11px;
                  color:#999;
                "
              >

                ${escapeHTML(
                  sentimentLabel(
                    sentimentForProduct(
                      product
                    )
                  ).label
                )}

              </div>

            </td>


            <td class="col-supplier">

              <strong>
                ${escapeHTML(
                  stock.text
                )}
              </strong>

            </td>


            <td class="col-meta">

              <strong>
                ${escapeHTML(
                  badge
                )}
              </strong>

              <div
                style="
                  color:#999;
                  font-size:11px;
                  margin-top:4px;
                "
              >

                ${escapeHTML(
                  packingLabel()
                )}

              </div>

            </td>


            <td class="col-action">

              <a
                href="${escapeHTML(
                  whatsappURL(
                    product
                  )
                )}"
                target="_blank"
                rel="noopener"
                title="Get quote on WhatsApp"
              >

                <i class="fab fa-whatsapp"></i>

              </a>

            </td>

          </tr>

        `;

      })
      .join('');

  }


  /* ==========================================================
     31. MARKET MOOD
     ========================================================== */

  function updateMarketMood(data) {

    const el =
      document.getElementById(
        'market-mood'
      );


    if (!el) {

      return;

    }


    let up = 0;
    let down = 0;


    data.forEach(function(product) {

      const trend =
        calculateTrend(
          product
        );


      const value =
        trend.change7d ??
        trend.change24h;


      if (
        value > 0
      ) {

        up++;

      } else if (
        value < 0
      ) {

        down++;

      }

    });


    const total =
      up + down;


    /*
       No dated observations means
       no market-wide trend claim.
    */

    if (!total) {

      el.textContent =
        'Trade Desk Market Mood: Awaiting dated price observations';

      return;

    }


    const upPct =
      Math.round(
        up /
        total *
        100
      );


    const downPct =
      100 -
      upPct;


    el.textContent =
      `Market Mood: ${upPct}% Up • ${downPct}% Down`;

  }


  /* ==========================================================
     32. LAST UPDATED
     ========================================================== */

  function updateLastUpdated() {

    const el =
      document.getElementById(
        'last-updated'
      );


    if (!el) {

      return;

    }


    if (
      !state.loadedAt
    ) {

      el.textContent =
        'Loading...';

      return;

    }


    const date =
      new Date(
        state.loadedAt
      );


    el.textContent =
      date.toLocaleString(
        undefined,
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit'
        }
      );

  }


  /* ==========================================================
     33. ROW COUNT
     ========================================================== */

  function updateRowCount(count) {

    const el =
      document.getElementById(
        'rowCount'
      );


    if (!el) {

      return;

    }


    el.textContent =
      `${count} product${
        count !== 1
          ? 's'
          : ''
      }`;

  }


  /* ==========================================================
     34. FILTER BUTTONS
     ========================================================== */

  function setupFilters() {

    const buttons =
      document.querySelectorAll(
        '.filter-btn'
      );


    buttons.forEach(function(btn) {

      btn.addEventListener(
        'click',
        function() {

          buttons.forEach(
            function(b) {

              b.classList.remove(
                'active'
              );

            }
          );


          this.classList.add(
            'active'
          );


          state.currentFilter =
            this.dataset.filter ||
            'all';


          renderAll();

        }
      );

    });


    const search =
      document.getElementById(
        'searchInput'
      );


    if (search) {

      search.addEventListener(
        'input',
        function() {

          state.currentSearch =
            this.value || '';

          renderAll();

        }
      );

    }

  }


  /* ==========================================================
     35. SORTING
     ========================================================== */

  function setupSorting() {

    document
      .querySelectorAll(
        '[data-sort]'
      )
      .forEach(function(header) {

        header.style.cursor =
          'pointer';


        header.addEventListener(
          'click',
          function() {

            const key =
              this.dataset.sort;


            if (
              state.sortKey ===
              key
            ) {

              state.sortDirection =
                state.sortDirection ===
                'asc'
                  ? 'desc'
                  : 'asc';

            } else {

              state.sortKey =
                key;

              state.sortDirection =
                'asc';

            }


            renderAll();

          }
        );

      });

  }


  /* ==========================================================
     36. ALLIYA BUTTON
     ========================================================== */

  function setupAlliyaButton() {

    const btn =
      document.getElementById(
        'askAlliyaBtn'
      );


    if (!btn) {

      return;

    }


    btn.addEventListener(
      'click',
      function() {

        if (
          window.Alliya &&
          typeof window.Alliya.open ===
          'function'
        ) {

          window.Alliya.open();

        } else {

          window.open(
            'https://wa.me/' +
            CONFIG.WHATSAPP +
            '?text=' +
            encodeURIComponent(
              'Hi Alliya, I need help with grain prices.'
            ),
            '_blank'
          );

        }

      }
    );

  }


  /* ==========================================================
     37. MAIN RENDER
     ========================================================== */

  function renderAll() {

    const filtered =
      applyFilters();


    renderTradeDeskSummary();

    renderCards(
      filtered
    );

    renderTable(
      filtered
    );

    updateRowCount(
      filtered.length
    );

    updateMarketMood(
      filtered
    );

    updateLastUpdated();

    updateControlState();

  }


  /* ==========================================================
     38. DATA LOAD
     ========================================================== */

  async function loadAll() {

    const tbody =
      document.getElementById(
        'pulse-table'
      );


    if (tbody) {

      tbody.innerHTML = `

        <tr>

          <td
            colspan="6"
            style="
              text-align:center;
              padding:30px;
              color:#a07c3b;
            "
          >

            ⏳ Loading Trade Desk data...

          </td>

        </tr>

      `;

    }


    state.errors = [];


    /*
       Stock is critical.
       History, sentiment and freight
       are intelligence layers.

       We therefore load them independently.
    */

    try {

      state.products =
        await loadStock();

    } catch (error) {

      console.error(
        '[Pulse 3.3] Stock error:',
        error
      );

      state.errors.push(
        'stock'
      );

      state.products = [];

    }


    try {

      state.history =
        await loadHistory();

    } catch (error) {

      console.error(
        '[Pulse 3.3] History error:',
        error
      );

      state.errors.push(
        'history'
      );

      state.history = [];

    }


    try {

      state.sentiment =
        await loadSentiment();

    } catch (error) {

      console.error(
        '[Pulse 3.3] Sentiment error:',
        error
      );

      state.errors.push(
        'sentiment'
      );

      state.sentiment = [];

    }


    try {

      state.freight =
        await loadFreight();

    } catch (error) {

      console.error(
        '[Pulse 3.3] Freight error:',
        error
      );

      state.errors.push(
        'freight'
      );

      state.freight = [];

    }


    state.loadedAt =
      Date.now();


    state.historyLoadedAt =
      Date.now();


    console.log(
      '[Pulse 3.3] Stock:',
      state.products.length
    );


    console.log(
      '[Pulse 3.3] History:',
      state.history.length
    );


    console.log(
      '[Pulse 3.3] Sentiment:',
      state.sentiment.length
    );


    console.log(
      '[Pulse 3.3] Freight:',
      state.freight.length
    );


    if (
      !state.products.length
    ) {

      if (tbody) {

        tbody.innerHTML = `

          <tr>

            <td
              colspan="6"
              style="
                text-align:center;
                padding:40px;
                color:#999;
              "
            >

              Live product data is
              temporarily unavailable.

              <br><br>

              <a
                href="https://wa.me/971585521976"
                target="_blank"
                rel="noopener"
                style="
                  color:#25D366;
                  font-weight:700;
                "
              >
                Contact Trade Desk
              </a>

            </td>

          </tr>

        `;

      }

      return;

    }


    renderAll();

  }


  /* ==========================================================
     39. PUBLIC API
     ========================================================== */

  window.GrainsHubMarketPulse = {

    version:
      CONFIG.VERSION,

    state,

    reload:
      loadAll,

    render:
      renderAll,

    setBasis:
      function(value) {

        if (
          BASIS[value]
        ) {

          state.basis =
            BASIS[value];

          renderAll();

        }

      },

    setPacking:
      function(value) {

        if (
          PACKING[value]
        ) {

          state.packing =
            PACKING[value];

          renderAll();

        }

      },

    getFOB,

    getCIF,

    calculateTrend,

    sentimentForProduct,

    getCurrentAllInAddition

  };


  /* ==========================================================
     40. INITIALIZATION
     ========================================================== */

  function init() {

    console.log(
      '🌾 Market Pulse v3.3 — Lady Stark Trade Desk Intelligence'
    );


    /*
       Make sure the control layer exists.
    */

    createBasisControls();


    /*
       Connect controls created by v3.3.
    */

    connectExistingControls();


    /*
       Existing page filters.
    */

    setupFilters();


    /*
       Existing table sorting.
    */

    setupSorting();


    /*
       Alliya button.
    */

    setupAlliyaButton();


    /*
       Initial state.
    */

    state.basis =
      BASIS.FOB_ORIGIN;

    state.packing =
      PACKING.STANDARD_PP;


    updateControlState();


    /*
       Load data.
    */

    loadAll();


    /*
       Refresh current commercial data.

       This does NOT create fake historical
       observations. It simply re-reads the
       source files.
    */

    setInterval(
      loadAll,
      CONFIG.REFRESH_INTERVAL
    );


    console.log(
      '✅ Market Pulse v3.3 initialized'
    );

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();

  }


})(window, document);
