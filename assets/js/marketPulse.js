/* ============================================================
   MARKET PULSE - Grains Hub
   Version: 3.2 — Lady Stark Trade Desk Edition

   PURPOSE
   ------------------------------------------------------------
   • Current Dubai Stock prices
   • FOB Origin prices
   • CIF Dubai reference prices
   • Standard PP / Custom Nonwoven
   • Real historical price movement
   • 24H / 7D / 30D history framework
   • Grains Hub Market Desk sentiment
   • Freight / local-cost intelligence
   • Honest "not available" handling
   • No fake/random trends
   • No fake CIF
   • No hardcoded market claims
   • Preserves existing Pulse HTML/CSS
   ============================================================ */

(function (window, document) {

  'use strict';

  /* ============================================================
     1. CONFIGURATION
     ============================================================ */

  const CONFIG = {

    /* Current commercial source */
    STOCK_URL:
      '/assets/data/stock.json?t=',

    /* Historical observations */
    HISTORY_URL:
      '/assets/data/marketHistory.json?t=',

    /* Human Trade Desk observations */
    SENTIMENT_URL:
      '/assets/data/marketSentiment.json?t=',

    /* Freight + destination cost intelligence */
    FREIGHT_URL:
      '/assets/data/freight.json?t=',

    /* Refresh current market data every 30 minutes */
    REFRESH_INTERVAL:
      30 * 60 * 1000,

    /* Number of market cards shown above table */
    MAX_CARDS:
      6,

    /* Grains Hub WhatsApp */
    WHATSAPP:
      '971585521976',

    /* Initial selector state */
    DEFAULT_BASIS:
      'DUBAI_STOCK',

    DEFAULT_PACKING:
      'STANDARD_PP'
  };


  /* ============================================================
     2. APPLICATION STATE
     ============================================================ */

  const state = {

    /* Current commercial products */
    data: [],

    /* Products after filters */
    filtered: [],

    /* Historical price observations */
    history: [],

    /* Market Desk observations */
    sentiment: [],

    /* Freight intelligence */
    freight: null,

    /* User selections */
    basis:
      CONFIG.DEFAULT_BASIS,

    packing:
      CONFIG.DEFAULT_PACKING,

    filter:
      'all',

    search:
      '',

    sort: {
      key: null,
      dir: 'asc'
    },

    loadedAt:
      null,

    dataTimestamp:
      null
  };


  /* ============================================================
     3. GENERAL HELPERS
     ============================================================ */

  function text(value) {

    return String(
      value === null || value === undefined
        ? ''
        : value
    ).trim();

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


  function money(value, decimals) {

    const n = number(value);

    if (n === null) {
      return null;
    }

    return n.toLocaleString(
      undefined,
      {
        minimumFractionDigits:
          decimals === undefined ? 2 : decimals,

        maximumFractionDigits:
          decimals === undefined ? 2 : decimals
      }
    );

  }


  function escapeHTML(value) {

    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


  function slug(value) {

    return lower(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  }


  function flag(origin) {

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


  function parseDate(value) {

    if (!value) {
      return null;
    }

    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? null
      : d;

  }


  function dateLabel(value) {

    const d = parseDate(value);

    if (!d) {
      return 'Date not recorded';
    }

    return d.toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
    );

  }


  function firstNumber(values) {

    for (const value of values) {

      const n = number(value);

      if (n !== null) {
        return n;
      }

    }

    return null;

  }


  /* ============================================================
     4. JSON LOADING
     ============================================================ */

  async function fetchJSON(url) {

    const response = await fetch(
      url + Date.now(),
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {

      throw new Error(
        `Failed to load ${url}: ${response.status}`
      );

    }

    return response.json();

  }


  function extractRecords(raw) {

    if (Array.isArray(raw)) {
      return raw;
    }

    if (!raw || typeof raw !== 'object') {
      return [];
    }

    if (Array.isArray(raw.records)) {
      return raw.records;
    }

    if (Array.isArray(raw.data)) {
      return raw.data;
    }

    if (Array.isArray(raw.items)) {
      return raw.items;
    }

    return [];

  }


  /* ============================================================
     5. LOAD ALL MARKET DATA
     ============================================================ */

  async function loadPulseData() {

    const cards =
      document.getElementById('priceCards');

    const table =
      document.getElementById('pulse-table');

    if (cards) {

      cards.innerHTML = `
        <div
          style="
            grid-column:1/-1;
            text-align:center;
            padding:35px;
            color:#a07c3b;
          "
        >
          ⏳ Loading Grains Hub Trade Desk data...
        </div>
      `;

    }


    try {

      /* --------------------------------------------------------
         CURRENT STOCK
         Prefer canonical GrainsHubData layer.
         This keeps Shop + Pulse on same commercial source.
         -------------------------------------------------------- */

      let stock;

      if (
        window.GrainsHubData &&
        typeof window.GrainsHubData.load === 'function'
      ) {

        stock =
          await window.GrainsHubData.load(true);

      } else {

        stock =
          await fetchJSON(CONFIG.STOCK_URL);

      }


      /* --------------------------------------------------------
         HISTORY / SENTIMENT / FREIGHT
         These are independent intelligence layers.
         -------------------------------------------------------- */

      const results =
        await Promise.allSettled([

          fetchJSON(CONFIG.HISTORY_URL),

          fetchJSON(CONFIG.SENTIMENT_URL),

          fetchJSON(CONFIG.FREIGHT_URL)

        ]);


      state.history =
        results[0].status === 'fulfilled'
          ? extractRecords(results[0].value)
          : [];


      state.sentiment =
        results[1].status === 'fulfilled'
          ? extractRecords(results[1].value)
          : [];


      state.freight =
        results[2].status === 'fulfilled'
          ? results[2].value
          : null;


      /* Normalize current commercial products */

      state.data =
        normalizeStockArray(stock);


      state.loadedAt =
        new Date();


      state.dataTimestamp =
        findLatestDataDate(
          state.data,
          state.history
        );


      if (!state.data.length) {

        throw new Error(
          'No usable products found'
        );

      }


      /* Render everything */

      applyFiltersAndRender();

      updateLastUpdated();

      updateMarketMood();


      console.log(
        '[Market Pulse 3.2]',
        'Products:',
        state.data.length,
        'History:',
        state.history.length,
        'Sentiment:',
        state.sentiment.length
      );


    } catch (error) {

      console.error(
        '[Market Pulse 3.2]',
        error
      );


      if (cards) {

        cards.innerHTML = `
          <div
            style="
              grid-column:1/-1;
              text-align:center;
              padding:40px;
              color:#777;
            "
          >

            <strong>
              Market data is temporarily unavailable.
            </strong>

            <div
              style="
                margin-top:8px;
                font-size:13px;
              "
            >
              Please refresh or contact the
              Grains Hub Trade Desk.
            </div>

          </div>
        `;

      }


      if (table) {

        table.innerHTML = `
          <tr>
            <td
              colspan="6"
              style="
                text-align:center;
                padding:30px;
                color:#777;
              "
            >
              Live market data is temporarily unavailable.
            </td>
          </tr>
        `;

      }


      const count =
        document.getElementById('rowCount');

      if (count) {
        count.textContent =
          'Data unavailable';
      }


      const mood =
        document.getElementById('market-mood');

      if (mood) {

        mood.textContent =
          'Market Desk: data unavailable';

      }

    }

  }


  /* ============================================================
     6. CURRENT PRODUCT NORMALIZATION
     ============================================================ */

  function normalizeStockArray(raw) {

    const source =
      Array.isArray(raw)
        ? raw
        : extractRecords(raw);


    return source
      .map(normalizeProduct)
      .filter(Boolean);

  }


  function normalizeProduct(item) {

    if (
      !item ||
      typeof item !== 'object'
    ) {
      return null;
    }


    const name =
      text(
        item.name ||
        item.product ||
        item.title
      );


    if (!name) {
      return null;
    }


    const origin =
      text(
        item.origin ||
        item.country ||
        item.sourceCountry
      );


    const supplier =
      text(
        item.supplier ||
        item.supplierName ||
        item.vendor ||
        item.seller
      );


    const supplierTier =
      text(
        item.supplierTier ||
        item.badge ||
        item.tier
      );


    const availability =
      normalizeAvailability(item);


    const packageKg =
      firstNumber([

        item.packageKg,

        item.sizeKg,

        item.weightKg,

        parseWeight(item.size),

        parseWeight(item.packaging)

      ]);


    const rawPrice =
      firstNumber([

        item.price,

        item.spotPriceAEDPerMT,

        item.priceAED

      ]);


    const currency =
      text(

        item.currency ||

        item.priceCurrency ||

        (
          looksUSD(item.price)
            ? 'USD'
            : 'AED'
        )

      ).toUpperCase();


    const priceUnit =
      text(

        item.priceUnit ||

        item.unit ||

        item.priceBasisUnit ||

        ''

      ).toUpperCase();


    const stockBags =
      firstNumber([

        item.stockBags,

        item.bags,

        parseBags(item.stock)

      ]);


    const stockMT =
      firstNumber([

        item.stockMT,

        item.stockQuantityMT,

        item.quantityMT

      ]);


    return {

      raw: item,

      id:
        text(
          item.id ||
          item.productId ||
          slug(name)
        ),

      name,

      origin,

      supplier,

      supplierTier,

      availability,

      packaging:
        text(
          item.packaging ||
          item.packing ||
          item.package ||
          ''
        ),

      packageKg,

      price:
        rawPrice,

      currency,

      priceUnit,

      priceBasis:
        text(

          item.priceBasis ||

          item.basis ||

          (
            availability === 'BOOKING'
              ? 'FOB'
              : 'DUBAI_STOCK'
          )

        ).toUpperCase(),

      pricePerKg:
        firstNumber([

          item.pricePerKg,

          item.kgPrice,

          (
            currency === 'AED' &&
            rawPrice &&
            packageKg
          )
            ? rawPrice / packageKg
            : null

        ]),

      stockBags,

      stockMT,

      rawStock:
        item.stock,

      fobPriceUSD:
        getExplicitFOB(item),

      cifPriceUSD:
        getExplicitCIF(item),

      customPackingPremiumUSD:
        firstNumber([

          item.customPackingPremiumUSD,

          item.customPackingPremium,

          item.packingPremiumUSD

        ]),

      freightUSDPerMT:
        firstNumber([

          item.freightUSDPerMT,

          item.freightPerMT

        ]),

      image:
        text(item.image || ''),

      grainType:
        text(
          item.grainType ||
          item.category ||
          ''
        ),

      crop:
        text(
          item.crop ||
          item.cropYear ||
          ''
        ),

      keywords:
        Array.isArray(item.keywords)
          ? item.keywords
          : [],

      updatedAt:
        item.updatedAt ||
        item.lastUpdated ||
        item.date ||
        null

    };

  }


  function normalizeAvailability(item) {

    const raw =
      lower(

        item.availability ||

        item.status ||

        item.stockStatus ||

        ''

      );


    if (

      raw.includes('booking') ||

      raw.includes('pre-book') ||

      raw.includes('prebook')

    ) {

      return 'BOOKING';

    }


    if (

      raw.includes('out') ||

      raw.includes('unavailable')

    ) {

      return 'OUT_OF_STOCK';

    }


    if (

      raw.includes('in stock') ||

      raw.includes('available')

    ) {

      return 'IN_STOCK';

    }


    /*
     * Legacy compatibility.
     */

    if (

      lower(item.stock).includes('booking') ||

      (
        looksUSD(item.price) &&
        lower(item.stock).includes('booking')
      )

    ) {

      return 'BOOKING';

    }


    return 'IN_STOCK';

  }


  function parseWeight(value) {

    const match =
      text(value).match(
        /(\d+(?:\.\d+)?)\s*kg/i
      );


    return match
      ? Number(match[1])
      : null;

  }


  function parseBags(value) {

    const match =
      text(value).match(
        /([\d,]+(?:\.\d+)?)\s*bags?/i
      );


    return match
      ? Number(
          match[1].replace(/,/g, '')
        )
      : null;

  }


  function looksUSD(value) {

    return /\bUSD\b|\$/i.test(
      text(value)
    );

  }


  /* ============================================================
     7. FOB / CIF EXTRACTION
     ============================================================ */

  function getExplicitFOB(item) {

    const direct =
      firstNumber([

        item.fobPriceUSD,

        item.fobPrice,

        item.priceFOBUSD,

        item.priceFOB

      ]);


    if (direct !== null) {
      return direct;
    }


    if (
      item.prices &&
      typeof item.prices === 'object'
    ) {

      return firstNumber([

        item.prices.FOB,

        item.prices.fob,

        item.prices.fobUSD

      ]);

    }


    if (
      item.fob &&
      typeof item.fob === 'object'
    ) {

      return firstNumber([

        item.fob.price,

        item.fob.priceUSD

      ]);

    }


    return null;

  }


  function getExplicitCIF(item) {

    const direct =
      firstNumber([

        item.cifPriceUSD,

        item.cifPrice,

        item.priceCIFUSD,

        item.priceCIF

      ]);


    if (direct !== null) {
      return direct;
    }


    if (
      item.prices &&
      typeof item.prices === 'object'
    ) {

      return firstNumber([

        item.prices.CIF,

        item.prices.cif,

        item.prices.cifUSD

      ]);

    }


    if (
      item.cif &&
      typeof item.cif === 'object'
    ) {

      return firstNumber([

        item.cif.price,

        item.cif.priceUSD

      ]);

    }


    return null;

  }


  /* ============================================================
     8. HISTORICAL PRODUCT MATCHING
     ============================================================ */

  function historyMatchesProduct(
    record,
    product
  ) {

    const recordName =
      slug(
        record.product ||
        record.name ||
        ''
      );


    const recordId =
      slug(
        record.productId ||
        ''
      );


    const productName =
      slug(product.name);


    const productId =
      slug(product.id);


    return (

      recordName === productName ||

      recordId === productId ||

      recordName.includes(productName) ||

      productName.includes(recordName)

    );

  }


  function getLatestHistoryForProduct(
    product,
    basis
  ) {

    const wantedBasis =
      lower(basis);


    const matches =
      state.history

        .filter(record => {

          const recordBasis =
            lower(

              record.basis ||

              record.priceBasis ||

              ''

            );


          if (
            recordBasis !==
            wantedBasis
          ) {

            return false;

          }


          return historyMatchesProduct(
            record,
            product
          );

        })


        .map(record => ({

          record,

          date:
            parseDate(

              record.quoteDate ||

              record.observedAt ||

              record.date ||

              record.capturedAt

            )

        }))


        .sort((a, b) => {

          const ad =
            a.date
              ? a.date.getTime()
              : 0;

          const bd =
            b.date
              ? b.date.getTime()
              : 0;

          return bd - ad;

        });


    return matches.length
      ? matches[0].record
      : null;

  }


  function currentFOB(product) {

    /*
     * First priority:
     * explicit FOB in current stock data.
     */

    if (
      product.fobPriceUSD !== null
    ) {

      return {

        value:
          product.fobPriceUSD,

        source:
          'Current commercial data',

        confidence:
          'High',

        observedAt:
          product.updatedAt

      };

    }


    /*
     * Second priority:
     * recorded historical FOB.
     */

    const record =
      getLatestHistoryForProduct(
        product,
        'FOB'
      );


    if (record) {

      return {

        value:
          firstNumber([

            record.price,

            record.priceUSD,

            record.fobPriceUSD

          ]),

        source:
          record.source ||
          record.sourceType ||
          'Recorded market history',

        confidence:
          record.confidence ||
          'Recorded',

        observedAt:

          record.quoteDate ||

          record.observedAt ||

          record.date ||

          record.capturedAt

      };

    }


    return null;

  }


  function currentCIF(product) {

    /*
     * First priority:
     * direct CIF quotation.
     */

    if (
      product.cifPriceUSD !== null
    ) {

      return {

        value:
          product.cifPriceUSD,

        source:
          'Current commercial data',

        confidence:
          'High',

        observedAt:
          product.updatedAt,

        calculated:
          false

      };

    }


    /*
     * Second priority:
     * historical CIF observation.
     */

    const record =
      getLatestHistoryForProduct(
        product,
        'CIF'
      );


    if (record) {

      return {

        value:
          firstNumber([

            record.price,

            record.priceUSD,

            record.cifPriceUSD

          ]),

        source:
          record.source ||
          record.sourceType ||
          'Recorded market history',

        confidence:
          record.confidence ||
          'Recorded',

        observedAt:

          record.quoteDate ||

          record.observedAt ||

          record.date ||

          record.capturedAt,

        calculated:
          false

      };

    }


    /*
     * Third priority:
     * calculate a clearly-labelled
     * Grains Hub CURRENT REFERENCE.
     *
     * This is NOT presented as a supplier quote.
     */

    const fob =
      currentFOB(product);


    if (
      !fob ||
      fob.value === null
    ) {

      return null;

    }


    const addOn =
      getCurrentAllInAddOnUSDPerMT();


    if (addOn === null) {

      return null;

    }


    return {

      value:
        fob.value + addOn,

      source:
        'Grains Hub current all-in cost reference',

      confidence:
        'Reference',

      observedAt:
        null,

      calculated:
        true,

      addOnUSDPerMT:
        addOn

    };

  }


  /* ============================================================
     9. CURRENT ALL-IN COST REFERENCE
     ============================================================ */

  function getCurrentAllInAddOnUSDPerMT() {

    if (
      !state.freight ||
      !Array.isArray(
        state.freight.observed_costs
      )
    ) {

      return null;

    }


    const candidates =
      state.freight.observed_costs

        .filter(item =>

          item.status === 'observed' &&

          item.additionalCostUSDPerMT !==
            undefined

        )


        .sort((a, b) => {

          const ad =
            parseDate(a.observedAt);

          const bd =
            parseDate(b.observedAt);

          return (

            (bd
              ? bd.getTime()
              : 0) -

            (ad
              ? ad.getTime()
              : 0)

          );

        });


    if (!candidates.length) {

      return null;

    }


    return number(
      candidates[0]
        .additionalCostUSDPerMT
    );

  }


  /* ============================================================
     10. PRICE DISPLAY
     ============================================================ */

  function getPriceView(product) {

    /* ----------------------------------------------------------
       DUBAI STOCK
       ---------------------------------------------------------- */

    if (
      state.basis ===
      'DUBAI_STOCK'
    ) {

      if (
        product.price === null
      ) {

        return {

          available:
            false,

          text:
            'Price on request',

          sub:
            'Dubai stock price not recorded',

          value:
            null,

          currency:
            product.currency || 'AED'

        };

      }


      return {

        available:
          true,

        text:
          `${product.currency || 'AED'} ` +
          `${money(product.price)}`,

        sub:
          product.priceUnit ||

          product.priceBasis ||

          'Current stock price',

        value:
          product.price,

        currency:
          product.currency || 'AED'

      };

    }


    /* ----------------------------------------------------------
       FOB ORIGIN
       ---------------------------------------------------------- */

    if (
      state.basis === 'FOB'
    ) {

      const fob =
        currentFOB(product);


      if (
        !fob ||
        fob.value === null
      ) {

        return {

          available:
            false,

          text:
            'Price on request',

          sub:
            'FOB price not recorded',

          value:
            null,

          currency:
            'USD'

        };

      }


      return {

        available:
          true,

        text:
          `USD ${money(fob.value)} / MT`,

        sub:
          fob.source +

          (
            fob.observedAt
              ? ` • ${dateLabel(fob.observedAt)}`
              : ''
          ),

        value:
          fob.value,

        currency:
          'USD',

        source:
          fob

      };

    }


    /* ----------------------------------------------------------
       CIF DUBAI
       ---------------------------------------------------------- */

    if (
      state.basis === 'CIF'
    ) {

      const cif =
        currentCIF(product);


      if (
        !cif ||
        cif.value === null
      ) {

        return {

          available:
            false,

          text:
            'Price on request',

          sub:
            'CIF Dubai price not recorded',

          value:
            null,

          currency:
            'USD'

        };

      }


      return {

        available:
          true,

        text:
          `USD ${money(cif.value)} / MT`,

        sub:

          cif.calculated

            ? (
                `Reference: FOB + ` +
                `${money(cif.addOnUSDPerMT)}` +
                ` all-in add-on`
              )

            : (
                `${cif.source}` +

                (
                  cif.observedAt
                    ? ` • ${dateLabel(cif.observedAt)}`
                    : ''
                )
              ),

        value:
          cif.value,

        currency:
          'USD',

        source:
          cif

      };

    }


    return {

      available:
        false,

      text:
        'Price on request',

      sub:
        'Price basis unavailable',

      value:
        null

    };

  }


  /* ============================================================
     11. PACKING
     ============================================================ */

  function getPackingView(product) {

    if (
      state.packing ===
      'STANDARD_PP'
    ) {

      return {

        label:
          'Standard PP',

        note:
          product.packaging ||
          'Standard PP packing',

        premium:
          0

      };

    }


    /*
     * Custom packing.
     *
     * We DO NOT silently add $30.
     * If actual product-specific premium
     * is not recorded, say so.
     */

    const premium =
      product.customPackingPremiumUSD;


    if (
      premium !== null
    ) {

      return {

        label:
          'Custom Nonwoven',

        note:
          `Packing premium +USD ` +
          `${money(premium)} / MT`,

        premium

      };

    }


    return {

      label:
        'Custom Nonwoven',

      note:
        'Premium not recorded — confirm with Trade Desk',

      premium:
        null

    };

  }


  /* ============================================================
     12. HISTORICAL PRICE ENGINE
     ============================================================ */

  function historyForProduct(product) {

    if (
      state.basis !== 'FOB' &&
      state.basis !== 'CIF'
    ) {

      return [];

    }


    const wantedBasis =
      lower(state.basis);


    return state.history

      .filter(record => {

        const basis =
          lower(

            record.basis ||

            record.priceBasis ||

            ''

          );


        if (
          basis !== wantedBasis
        ) {

          return false;

        }


        return historyMatchesProduct(
          record,
          product
        );

      })


      .map(record => ({

        ...record,

        _date:
          parseDate(

            record.quoteDate ||

            record.observedAt ||

            record.date ||

            record.capturedAt

          ),

        _price:
          firstNumber([

            record.price,

            record.priceUSD,

            record.fobPriceUSD,

            record.cifPriceUSD

          ])

      }))


      .filter(record =>

        record._date &&
        record._price !== null

      )


      .sort(
        (a, b) =>
          a._date.getTime() -
          b._date.getTime()
      );

  }


  function getTrend(product) {

    /*
     * Current Dubai stock doesn't yet have
     * a dedicated dated stock-history layer.
     */

    if (
      state.basis ===
      'DUBAI_STOCK'
    ) {

      return {

        change24h:
          null,

        change7d:
          null,

        change30d:
          null,

        label:
          'No trend data',

        className:
          'trend-flat',

        arrow:
          '■'

      };

    }


    const history =
      historyForProduct(product);


    /*
     * Need at least two dated observations.
     */

    if (
      history.length < 2
    ) {

      return {

        change24h:
          null,

        change7d:
          null,

        change30d:
          null,

        label:
          'No trend data',

        className:
          'trend-flat',

        arrow:
          '■'

      };

    }


    const latest =
      history[
        history.length - 1
      ];


    const change24h =
      calculateHistoricalChange(
        latest,
        history,
        1
      );


    const change7d =
      calculateHistoricalChange(
        latest,
        history,
        7
      );


    const change30d =
      calculateHistoricalChange(
        latest,
        history,
        30
      );


    return {

      change24h,

      change7d,

      change30d,

      latestDate:
        latest._date,

      label:
        buildTrendLabel(
          change7d
        ),

      className:
        trendClass(
          change7d
        ),

      arrow:
        trendArrow(
          change7d
        )

    };

  }


  function calculateHistoricalChange(
    latest,
    history,
    days
  ) {

    const target =
      new Date(
        latest._date.getTime()
      );


    target.setDate(
      target.getDate() - days
    );


    let previous =
      null;


    /*
     * Prefer an observation on/before
     * the requested comparison date.
     */

    for (
      let i = history.length - 1;
      i >= 0;
      i--
    ) {

      if (
        history[i]._date <=
        target
      ) {

        previous =
          history[i];

        break;

      }

    }


    /*
     * If no exact historical point exists,
     * use an observation inside the window.
     */

    if (!previous) {

      const earliest =
        new Date(
          latest._date.getTime()
        );


      earliest.setDate(
        earliest.getDate() - days
      );


      const candidates =
        history.filter(
          record =>
            record._date >= earliest &&
            record._date < latest._date
        );


      if (
        candidates.length
      ) {

        previous =
          candidates[0];

      }

    }


    if (
      !previous ||
      previous === latest
    ) {

      return null;

    }


    if (
      previous._price === 0
    ) {

      return null;

    }


    return (

      (
        (
          latest._price -
          previous._price
        ) /
        previous._price
      ) * 100

    );

  }


  function buildTrendLabel(change) {

    if (
      change === null ||
      change === undefined
    ) {

      return 'No trend data';

    }


    if (
      Math.abs(change) < 0.005
    ) {

      return '■ 0.0% / 7D';

    }


    if (
      change > 0
    ) {

      return (
        `▲ +${change.toFixed(1)}% / 7D`
      );

    }


    return (
      `▼ ${change.toFixed(1)}% / 7D`
    );

  }


  function trendClass(change) {

    if (
      change === null ||
      change === undefined
    ) {

      return 'trend-flat';

    }


    if (change > 0) {
      return 'trend-up';
    }


    if (change < 0) {
      return 'trend-down';
    }


    return 'trend-flat';

  }


  function trendArrow(change) {

    if (
      change === null ||
      change === undefined
    ) {

      return '■';

    }


    if (change > 0) {
      return '▲';
    }


    if (change < 0) {
      return '▼';
    }


    return '■';

  }


  /* ============================================================
     13. MARKET SENTIMENT ENGINE
     ============================================================ */

  function sentimentFor(product) {

    const productSlug =
      slug(product.name);


    const originSlug =
      slug(product.origin);


    const matches =
      state.sentiment

        .filter(record => {

          const recordProduct =
            slug(

              record.product ||

              record.productName ||

              ''

            );


          const recordMarket =
            slug(

              record.market ||

              ''

            );


          const recordOrigin =
            slug(

              record.origin ||

              ''

            );


          const productMatch =

            recordProduct &&

            (

              recordProduct ===
                productSlug ||

              recordProduct.includes(
                productSlug
              ) ||

              productSlug.includes(
                recordProduct
              )

            );


          const marketMatch =

            recordMarket &&

            (

              recordMarket ===
                productSlug ||

              recordMarket.includes(
                productSlug
              ) ||

              productSlug.includes(
                recordMarket
              )

            );


          const originMatch =

            recordOrigin &&

            recordOrigin ===
              originSlug;


          return (

            productMatch ||

            marketMatch ||

            originMatch

          );

        })


        .sort((a, b) => {

          const ad =
            parseDate(

              a.observedAt ||

              a.date ||

              a.capturedAt

            );


          const bd =
            parseDate(

              b.observedAt ||

              b.date ||

              b.capturedAt

            );


          return (

            (bd
              ? bd.getTime()
              : 0) -

            (ad
              ? ad.getTime()
              : 0)

          );

        });


    return matches.length
      ? matches[0]
      : null;

  }


  function sentimentLabel(record) {

    if (!record) {
      return 'No desk view';
    }


    const value =
      text(

        record.deskView ||

        record.direction ||

        ''

      );


    if (!value) {
      return 'No desk view';
    }


    return value

      .replace(/_/g, ' ')

      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      );

  }


  function sentimentIcon(record) {

    if (!record) {
      return '—';
    }


    const value =
      lower(

        record.deskView ||

        record.direction ||

        ''

      );


    if (
      value.includes('strong_bull')
    ) {

      return '🟢';

    }


    if (
      value.includes('bull')
    ) {

      return '🟢';

    }


    if (
      value.includes('strong_bear')
    ) {

      return '🔴';

    }


    if (
      value.includes('bear')
    ) {

      return '🔴';

    }


    return '🟡';

  }


  /* ============================================================
     14. FREIGHT INTELLIGENCE
     ============================================================ */

  function freightSummary() {

    if (!state.freight) {
      return null;
    }


    const records =
      Array.isArray(
        state.freight.observed_costs
      )
        ? state.freight.observed_costs
        : [];


    const current =
      records.find(item =>

        item.status === 'observed' &&

        item.additionalCostUSDPerMT !==
          undefined

      );


    if (!current) {
      return null;
    }


    return {

      addOnUSDPerMT:
        number(
          current.additionalCostUSDPerMT
        ),

      status:
        'Current reference',

      note:
        text(current.notes)

    };

  }


  /* ============================================================
     15. FILTERING
     ============================================================ */

  function matchesFilter(product) {

    if (
      state.filter === 'all'
    ) {

      return true;

    }


    if (
      state.filter === 'booking'
    ) {

      return (
        product.availability ===
        'BOOKING'
      );

    }


    return (
      lower(product.origin) ===
      lower(state.filter)
    );

  }


  function matchesSearch(product) {

    if (!state.search) {
      return true;
    }


    const searchable = [

      product.name,

      product.origin,

      product.supplier,

      product.supplierTier,

      product.packaging,

      product.grainType,

      product.crop,

      ...product.keywords

    ]
      .join(' ')
      .toLowerCase();


    return searchable.includes(
      lower(state.search)
    );

  }


  function applyFiltersAndRender() {

    let result =
      state.data.filter(product =>

        matchesFilter(product) &&

        matchesSearch(product)

      );


    if (
      state.sort.key
    ) {

      result =
        result
          .slice()
          .sort(
            (a, b) =>
              compareProducts(
                a,
                b,
                state.sort.key,
                state.sort.dir
              )
          );

    }


    state.filtered =
      result;


    renderCards(result);

    renderTable(result);

    updateRowCount(
      result.length
    );

    updateMarketMood();

  }


  function compareProducts(
    a,
    b,
    key,
    direction
  ) {

    const multiplier =
      direction === 'desc'
        ? -1
        : 1;


    let av;

    let bv;


    if (
      key === 'product'
    ) {

      av =
        lower(a.name);

      bv =
        lower(b.name);

    }


    else if (
      key === 'priceRaw'
    ) {

      av =
        getPriceView(a).value;

      bv =
        getPriceView(b).value;

    }


    else if (
      key === 'trendChange'
    ) {

      av =
        getTrend(a).change7d;

      bv =
        getTrend(b).change7d;

    }


    else if (
      key === 'supplier'
    ) {

      av =
        a.stockMT;

      bv =
        b.stockMT;

    }


    else {

      av =
        lower(a[key]);

      bv =
        lower(b[key]);

    }


    if (
      av === null ||
      av === undefined
    ) {

      return 1;

    }


    if (
      bv === null ||
      bv === undefined
    ) {

      return -1;

    }


    if (av < bv) {
      return -1 * multiplier;
    }


    if (av > bv) {
      return 1 * multiplier;
    }


    return 0;

  }


  /* ============================================================
     16. MARKET CARDS
     ============================================================ */

  function renderCards(data) {

    const container =
      document.getElementById(
        'priceCards'
      );


    if (!container) {
      return;
    }


    const cards =
      data.slice(
        0,
        CONFIG.MAX_CARDS
      );


    if (!cards.length) {

      container.innerHTML = `

        <div
          style="
            grid-column:1/-1;
            text-align:center;
            padding:40px;
            color:#777;
          "
        >
          No products found matching your criteria.
        </div>

      `;

      return;

    }


    container.innerHTML =
      cards
        .map(renderCard)
        .join('');

  }


  function renderCard(product) {

    const price =
      getPriceView(product);


    const trend =
      getTrend(product);


    const sentiment =
      sentimentFor(product);


    const packing =
      getPackingView(product);


    const booking =
      product.availability ===
      'BOOKING';


    let stockText;


    if (booking) {

      stockText =
        '📋 Booking';

    }


    else if (
      product.availability ===
      'OUT_OF_STOCK'
    ) {

      stockText =
        '⛔ Out of Stock';

    }


    else if (
      product.stockMT !== null
    ) {

      stockText =
        `📦 ${money(product.stockMT, 2)} MT`;

    }


    else {

      stockText =
        '📦 Stock on request';

    }


    return `

      <div
        class="price-card"
        data-origin="${escapeHTML(
          product.origin
        )}"
      >

        <div class="product-header">

          <span class="product-name">
            ${escapeHTML(product.name)}
          </span>

          <span class="flag">
            ${flag(product.origin)}
          </span>

        </div>


        <div class="price">
          ${escapeHTML(price.text)}
        </div>


        <div class="price-details">

          <span
            class="trend ${trend.className}"
          >
            ${escapeHTML(trend.label)}
          </span>

          <span
            style="
              font-size:13px;
              color:#666;
            "
          >
            ${escapeHTML(stockText)}
          </span>

        </div>


        <div class="stock-info">

          <span>
            ${escapeHTML(
              product.supplier ||
              'Supplier on request'
            )}
          </span>

          <span class="badge">
            ${escapeHTML(
              product.supplierTier ||
              (
                booking
                  ? 'Pre-Booking'
                  : 'Verified Supplier'
              )
            )}
          </span>

        </div>


        <div
          style="
            margin-top:8px;
            font-size:12px;
            color:#777;
          "
        >

          <span>
            ${escapeHTML(packing.label)}
          </span>

          <span
            style="margin-left:8px;"
          >

            ${
              sentiment
                ? `
                  ${sentimentIcon(sentiment)}
                  ${escapeHTML(
                    sentimentLabel(
                      sentiment
                    )
                  )}
                `
                : ''
            }

          </span>

        </div>


        <div
          style="
            margin-top:5px;
            font-size:11px;
            color:#999;
          "
        >
          ${escapeHTML(price.sub)}
        </div>


        <a
          href="${escapeHTML(
            buildWhatsAppURL(product)
          )}"
          class="book-btn"
          target="_blank"
          rel="noopener"
        >
          <i class="fab fa-whatsapp"></i>
          ${
            booking
              ? 'Request Booking'
              : 'Get Quote'
          }
        </a>

      </div>

    `;

  }


  /* ============================================================
     17. FULL MARKET TABLE
     ============================================================ */

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
              padding:30px;
              color:#777;
            "
          >
            No products found.
          </td>

        </tr>

      `;

      return;

    }


    tbody.innerHTML =
      data
        .map(renderTableRow)
        .join('');

  }


  function renderTableRow(product) {

    const price =
      getPriceView(product);


    const trend =
      getTrend(product);


    const packing =
      getPackingView(product);


    const sentiment =
      sentimentFor(product);


    let stock;


    if (
      product.stockMT !== null
    ) {

      stock =
        `${money(product.stockMT, 2)} MT`;

    }


    else if (
      product.stockBags !== null
    ) {

      stock =
        `${money(product.stockBags, 0)} bags`;

    }


    else if (
      product.availability ===
      'BOOKING'
    ) {

      stock =
        'Booking';

    }


    else {

      stock =
        'On request';

    }


    const supplier =
      product.supplier ||
      product.supplierTier ||
      'Verified supplier';


    const trendDisplay =
      trend.change7d === null
        ? 'No trend data'
        : trend.label;


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
              font-size:11px;
              color:#999;
              margin-top:3px;
            "
          >
            ${flag(product.origin)}
            ${escapeHTML(
              product.origin ||
              'Origin on request'
            )}
          </div>

        </td>


        <td class="col-price">

          <strong>
            ${escapeHTML(
              price.text
            )}
          </strong>

          <div
            style="
              font-size:10px;
              color:#999;
              margin-top:3px;
            "
          >
            ${escapeHTML(
              price.sub
            )}
          </div>

        </td>


        <td class="col-trend">

          <span
            class="trend ${trend.className}"
          >
            ${escapeHTML(
              trendDisplay
            )}
          </span>


          ${
            sentiment
              ? `
                <div
                  style="
                    font-size:10px;
                    color:#777;
                    margin-top:4px;
                  "
                >
                  ${sentimentIcon(
                    sentiment
                  )}

                  ${escapeHTML(
                    sentimentLabel(
                      sentiment
                    )
                  )}
                </div>
              `
              : ''
          }

        </td>


        <td class="col-supplier">

          <strong>
            ${escapeHTML(stock)}
          </strong>


          ${
            product.stockBags !== null
              ? `
                <div
                  style="
                    font-size:10px;
                    color:#999;
                  "
                >
                  ${money(
                    product.stockBags,
                    0
                  )} bags
                </div>
              `
              : ''
          }

        </td>


        <td class="col-meta">

          <span class="meta-verified">
            ${escapeHTML(
              supplier
            )}
          </span>


          <div
            style="
              font-size:10px;
              color:#999;
              margin-top:4px;
            "
          >
            ${escapeHTML(
              packing.label
            )}
          </div>

        </td>


        <td class="col-action">

          <a
            href="${escapeHTML(
              buildWhatsAppURL(product)
            )}"
            class="whatsapp-link"
            target="_blank"
            rel="noopener"
            title="Contact Trade Desk"
          >
            <i class="fab fa-whatsapp"></i>
          </a>

        </td>

      </tr>

    `;

  }


  /* ============================================================
     18. MARKET MOOD
     ============================================================ */

  function updateMarketMood() {

    const element =
      document.getElementById(
        'market-mood'
      );


    if (!element) {
      return;
    }


    const products =
      state.filtered.length
        ? state.filtered
        : state.data;


    const movements =
      products

        .map(
          product =>
            getTrend(product).change7d
        )

        .filter(
          value =>
            value !== null &&
            value !== undefined
        );


    /*
     * No history = honest message.
     */

    if (!movements.length) {

      element.textContent =
        'Market Desk: awaiting sufficient historical observations';

      return;

    }


    const up =
      movements.filter(
        value => value > 0
      ).length;


    const down =
      movements.filter(
        value => value < 0
      ).length;


    const flat =
      movements.filter(
        value => value === 0
      ).length;


    const total =
      up + down + flat;


    const upPct =
      Math.round(
        (up / total) * 100
      );


    const downPct =
      Math.round(
        (down / total) * 100
      );


    element.textContent =
      `Market Mood: ${upPct}% Up • ` +
      `${downPct}% Down • ` +
      `${flat} Flat`;

  }


  /* ============================================================
     19. LAST UPDATED
     ============================================================ */

  function updateLastUpdated() {

    const element =
      document.getElementById(
        'last-updated'
      );


    if (!element) {
      return;
    }


    /*
     * If a real source timestamp exists,
     * show it.
     */

    if (
      state.dataTimestamp
    ) {

      element.textContent =
        dateLabel(
          state.dataTimestamp
        );

      return;

    }


    /*
     * Otherwise don't pretend the current
     * clock is the market observation time.
     */

    if (
      state.loadedAt
    ) {

      element.textContent =
        `${state.loadedAt.toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit'
          }
        )} (data loaded)`;

      return;

    }


    element.textContent =
      'Data timestamp unavailable';

  }


  function findLatestDataDate(
    products,
    history
  ) {

    const dates = [];


    products.forEach(
      product => {

        const d =
          parseDate(
            product.updatedAt
          );


        if (d) {
          dates.push(d);
        }

      }
    );


    history.forEach(
      record => {

        const d =
          parseDate(

            record.quoteDate ||

            record.observedAt ||

            record.date ||

            record.capturedAt

          );


        if (d) {
          dates.push(d);
        }

      }
    );


    if (!dates.length) {
      return null;
    }


    dates.sort(
      (a, b) =>
        b.getTime() -
        a.getTime()
    );


    return dates[0];

  }


  /* ============================================================
     20. BASIS + PACKING CONTROLS
     ============================================================ */

  function injectTradeControls() {

    /*
     * If controls already exist in the HTML,
     * don't create duplicates.
     */

    const existing =
      document.getElementById(
        'pulseTradeControls'
      );


    if (existing) {

      injectControlStyles();

      setupTradeControls();

      syncControlState();

      return;

    }


    const filterBar =
      document.querySelector(
        '.filter-bar'
      );


    if (!filterBar) {

      console.warn(
        '[Pulse 3.2] .filter-bar not found'
      );

      return;

    }


    const panel =
      document.createElement(
        'div'
      );


    panel.id =
      'pulseTradeControls';


    panel.style.cssText = [

      'width:100%',

      'display:flex',

      'flex-wrap:wrap',

      'align-items:center',

      'justify-content:center',

      'gap:14px',

      'margin-bottom:10px',

      'padding:12px 14px',

      'border:1px solid #e8e4d8',

      'border-radius:12px',

      'background:#fdfdf9'

    ].join(';');


    panel.innerHTML = `

      <div
        style="
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        "
      >

        <strong
          style="
            font-size:11px;
            letter-spacing:.08em;
            color:#777;
          "
        >
          PRICE BASIS
        </strong>


        <button
          type="button"
          class="pulse-basis-btn"
          data-basis="FOB"
        >
          FOB Origin
        </button>


        <button
          type="button"
          class="pulse-basis-btn"
          data-basis="CIF"
        >
          CIF Dubai
        </button>


        <button
          type="button"
          class="pulse-basis-btn"
          data-basis="DUBAI_STOCK"
        >
          Dubai Stock
        </button>

      </div>


      <div
        style="
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        "
      >

        <strong
          style="
            font-size:11px;
            letter-spacing:.08em;
            color:#777;
          "
        >
          PACKING
        </strong>


        <button
          type="button"
          class="pulse-packing-btn"
          data-packing="STANDARD_PP"
        >
          Standard PP
        </button>


        <button
          type="button"
          class="pulse-packing-btn"
          data-packing="CUSTOM_NONWOVEN"
        >
          Custom Nonwoven
        </button>

      </div>


      <div
        id="pulseBasisNote"
        style="
          width:100%;
          text-align:center;
          font-size:11px;
          color:#888;
        "
      >
      </div>

    `;


    /*
     * Put the commercial selector ABOVE
     * the existing origin/search filters.
     */

    filterBar.parentNode.insertBefore(
      panel,
      filterBar
    );


    injectControlStyles();

    setupTradeControls();

    syncControlState();

  }


  function injectControlStyles() {

    if (
      document.getElementById(
        'pulse32Styles'
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        'style'
      );


    style.id =
      'pulse32Styles';


    style.textContent = `

      #pulseTradeControls button {

        padding:7px 13px;

        border:1px solid #d9d2c2;

        border-radius:50px;

        background:#fff;

        color:#555;

        font-weight:600;

        font-size:12px;

        cursor:pointer;

        transition:all .2s ease;

        font-family:inherit;

      }


      #pulseTradeControls button:hover {

        transform:translateY(-1px);

        border-color:#c1a875;

      }


      #pulseTradeControls
      button.active {

        background:#1a1a2e;

        color:#fff;

        border-color:#1a1a2e;

      }


      .trend-up {

        color:#14833b !important;

      }


      .trend-down {

        color:#c0392b !important;

      }


      .trend-flat {

        color:#888 !important;

      }

    `;


    document.head.appendChild(
      style
    );

  }


  function setupTradeControls() {

    document
      .querySelectorAll(
        '.pulse-basis-btn'
      )
      .forEach(button => {

        /*
         * Prevent duplicate listeners if
         * initialization happens again.
         */

        if (
          button.dataset.pulseBound ===
          'true'
        ) {

          return;

        }


        button.dataset.pulseBound =
          'true';


        button.addEventListener(
          'click',
          function () {

            state.basis =
              this.dataset.basis ||
              CONFIG.DEFAULT_BASIS;


            syncControlState();

            applyFiltersAndRender();

          }
        );

      });


    document
      .querySelectorAll(
        '.pulse-packing-btn'
      )
      .forEach(button => {

        if (
          button.dataset.pulseBound ===
          'true'
        ) {

          return;

        }


        button.dataset.pulseBound =
          'true';


        button.addEventListener(
          'click',
          function () {

            state.packing =
              this.dataset.packing ||
              CONFIG.DEFAULT_PACKING;


            syncControlState();

            applyFiltersAndRender();

          }
        );

      });

  }


  function syncControlState() {

    document
      .querySelectorAll(
        '.pulse-basis-btn'
      )
      .forEach(button => {

        button.classList.toggle(

          'active',

          button.dataset.basis ===
            state.basis

        );

      });


    document
      .querySelectorAll(
        '.pulse-packing-btn'
      )
      .forEach(button => {

        button.classList.toggle(

          'active',

          button.dataset.packing ===
            state.packing

        );

      });


    const note =
      document.getElementById(
        'pulseBasisNote'
      );


    if (!note) {
      return;
    }


    if (
      state.basis ===
      'DUBAI_STOCK'
    ) {

      note.textContent =
        'Dubai Stock = current Grains Hub inventory price. Currency remains exactly as recorded in stock.json.';

      return;

    }


    if (
      state.basis === 'FOB'
    ) {

      note.textContent =
        'FOB Origin = supplier/exporter quotation or recorded Grains Hub FOB observation. No freight is added.';

      return;

    }


    const freight =
      freightSummary();


    if (freight) {

      note.textContent =
        `CIF Dubai = recorded CIF where available, otherwise a clearly-labelled Grains Hub reference using the current all-in add-on of USD ${money(freight.addOnUSDPerMT)}/MT.`;

    }

    else {

      note.textContent =
        'CIF Dubai = recorded CIF or documented cost calculation. Missing components remain unavailable.';

    }

  }


  /* ============================================================
     21. ORIGIN FILTERS + SEARCH
     ============================================================ */

  function setupFilters() {

    const buttons =
      document.querySelectorAll(
        '.filter-btn'
      );


    buttons.forEach(button => {

      if (
        button.dataset.pulseBound ===
        'true'
      ) {

        return;

      }


      button.dataset.pulseBound =
        'true';


      button.addEventListener(
        'click',
        function () {

          buttons.forEach(
            item =>
              item.classList.remove(
                'active'
              )
          );


          this.classList.add(
            'active'
          );


          state.filter =
            this.dataset.filter ||
            'all';


          applyFiltersAndRender();

        }
      );

    });


    const search =
      document.getElementById(
        'searchInput'
      );


    if (
      search &&
      search.dataset.pulseBound !==
        'true'
    ) {

      search.dataset.pulseBound =
        'true';


      search.addEventListener(
        'input',
        function () {

          state.search =
            this.value.trim();


          applyFiltersAndRender();

        }
      );

    }

  }


  /* ============================================================
     22. TABLE SORTING
     ============================================================ */

  function initSorting() {

    document
      .querySelectorAll(
        '[data-sort]'
      )
      .forEach(header => {

        if (
          header.dataset.pulseBound ===
          'true'
        ) {

          return;

        }


        header.dataset.pulseBound =
          'true';


        header.style.cursor =
          'pointer';


        header.addEventListener(
          'click',
          () => {

            const key =
              header.dataset.sort;


            if (
              state.sort.key ===
              key
            ) {

              state.sort.dir =
                state.sort.dir ===
                'asc'
                  ? 'desc'
                  : 'asc';

            }

            else {

              state.sort.key =
                key;

              state.sort.dir =
                'asc';

            }


            applyFiltersAndRender();

          }
        );

      });

  }


  /* ============================================================
     23. WHATSAPP TRADE DESK
     ============================================================ */

  function buildWhatsAppURL(
    product
  ) {

    const price =
      getPriceView(product);


    const basisLabel =

      state.basis ===
        'DUBAI_STOCK'

        ? 'Dubai Stock'

        : state.basis ===
            'FOB'

          ? 'FOB Origin'

          : 'CIF Dubai';


    const packingLabel =

      state.packing ===
        'STANDARD_PP'

        ? 'Standard PP'

        : 'Custom Nonwoven';


    const message = [

      'Hi Grains Hub Trade Desk,',

      '',

      `Product: ${product.name}`,

      product.origin
        ? `Origin: ${product.origin}`
        : '',

      `Price basis: ${basisLabel}`,

      `Packing: ${packingLabel}`,

      price.available
        ? `Displayed price: ${price.text}`
        : 'Price: Please quote',

      '',

      'Please confirm current availability, final quotation and validity.'

    ]

      .filter(Boolean)

      .join('\n');


    return (

      `https://wa.me/${CONFIG.WHATSAPP}` +

      `?text=${encodeURIComponent(message)}`

    );

  }


  /* ============================================================
     24. ALLIYA BUTTON
     ============================================================ */

  function setupAlliyaButton() {

    const button =
      document.getElementById(
        'askAlliyaBtn'
      );


    if (
      !button ||
      button.dataset.pulseBound ===
        'true'
    ) {

      return;

    }


    button.dataset.pulseBound =
      'true';


    button.addEventListener(
      'click',
      function () {

        if (

          window.Alliya &&

          typeof window.Alliya.open ===
            'function'

        ) {

          window.Alliya.open();

          return;

        }


        window.open(

          `https://wa.me/${CONFIG.WHATSAPP}` +

          '?text=' +

          encodeURIComponent(

            'Hi Alliya, I need help with grain market prices.'

          ),

          '_blank'

        );

      }
    );

  }


  /* ============================================================
     25. PUBLIC API
     ============================================================ */

  window.MarketPulse = {

    version:
      '3.2',

    reload:
      loadPulseData,


    setBasis:
      function (basis) {

        if (

          [
            'FOB',
            'CIF',
            'DUBAI_STOCK'
          ].includes(basis)

        ) {

          state.basis =
            basis;


          syncControlState();

          applyFiltersAndRender();

        }

      },


    setPacking:
      function (packing) {

        if (

          [
            'STANDARD_PP',
            'CUSTOM_NONWOVEN'
          ].includes(packing)

        ) {

          state.packing =
            packing;


          syncControlState();

          applyFiltersAndRender();

        }

      },


    getState:
      function () {

        return {

          version:
            '3.2',

          basis:
            state.basis,

          packing:
            state.packing,

          filter:
            state.filter,

          search:
            state.search,

          products:
            state.data.length,

          historyRecords:
            state.history.length,

          sentimentRecords:
            state.sentiment.length

        };

      }

  };


  /* ============================================================
     26. LEGACY GLOBAL FILTER API
     ============================================================ */

  window.filterPulse =
    function (filter) {

      state.filter =
        filter || 'all';


      document
        .querySelectorAll(
          '.filter-btn'
        )
        .forEach(button => {

          button.classList.toggle(

            'active',

            (
              button.dataset.filter ||
              'all'
            ) === state.filter

          );

        });


      applyFiltersAndRender();

    };


  window.reloadMarketPulse =
    loadPulseData;


  /* ============================================================
     27. INITIALIZATION
     ============================================================ */

  function init() {

    console.log(
      '🌾 Market Pulse v3.2 — Lady Stark Trade Desk Edition'
    );


    /*
     * Commercial selector
     */

    injectTradeControls();


    /*
     * Existing origin filters
     */

    setupFilters();


    /*
     * Existing table sorting
     */

    initSorting();


    /*
     * Existing Alliya button
     */

    setupAlliyaButton();


    /*
     * Load all market layers
     */

    loadPulseData();


    /*
     * Current stock refresh.
     */

    setInterval(
      loadPulseData,
      CONFIG.REFRESH_INTERVAL
    );


    console.log(
      '✅ Market Pulse 3.2 initialized'
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

  }

  else {

    init();

  }


})(window, document);
