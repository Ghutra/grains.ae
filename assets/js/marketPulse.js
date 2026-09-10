/* ============================================================
   GRAINS HUB — MARKET PULSE v3.1
   LADY STARK EDITION 🐺

   PURPOSE
   ------------------------------------------------------------
   • Uses grainsData.js as canonical commercial data
   • Preserves existing Pulse HTML
   • Preserves existing Pulse CSS classes
   • FOB / CIF / Dubai Stock price basis
   • Standard PP / Custom Nonwoven packing
   • No random market numbers
   • No fabricated supplier / stock / freight information
   • Search, filters and sorting preserved
   ============================================================ */

(function (window, document) {

  'use strict';


  /* ============================================================
     CONFIGURATION
     ============================================================ */

  const CONFIG = {

    refreshMinutes: 30,

    maxCards: 6,

    whatsappNumber: '971585521976',

    currencyAEDUSD: 3.6725

  };


  /* ============================================================
     STATE
     ============================================================ */

  let pulseData = [];

  let filteredData = [];

  let activeOrigin = 'all';

  let searchTerm = '';

  let priceBasis = 'DUBAI_STOCK';

  let packingMode = 'STANDARD_PP';

  let sortKey = null;

  let sortDirection = 1;


  /* ============================================================
     UTILITY
     ============================================================ */

  function text(value) {

    return String(value ?? '').trim();

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


    const cleaned =
      String(value)
        .replace(/,/g, '')
        .replace(/[^\d.-]/g, '');


    const result =
      Number(cleaned);


    return Number.isFinite(result)
      ? result
      : null;

  }


  function formatNumber(
    value,
    decimals = 2
  ) {

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


  function escapeHtml(value) {

    return String(value ?? '')

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }


  function flagForOrigin(origin) {

    const value =
      lower(origin);


    if (value.includes('india')) {

      return '🇮🇳';

    }


    if (value.includes('pakistan')) {

      return '🇵🇰';

    }


    if (value.includes('thailand')) {

      return '🇹🇭';

    }


    if (value.includes('uae')) {

      return '🇦🇪';

    }


    return '🌍';

  }


  /* ============================================================
     PRICE HELPERS
     ============================================================ */

  function getFOB(product) {

    return firstNumber([

      product.fobPriceUSD,

      product.fobUSD,

      product.priceFOBUSD,

      product.priceFOB,

      product.fobPrice

    ]);

  }


  function getFreight(product) {

    return firstNumber([

      product.freightUSD,

      product.freightUSDMt,

      product.freightUSDPerMT,

      product.freight

    ]);

  }


  function getCIF(product) {

    return firstNumber([

      product.cifPriceUSD,

      product.cifUSD,

      product.priceCIFUSD,

      product.priceCIF,

      product.cifPrice

    ]);

  }


  function getDubaiStockPrice(product) {

    /*
      Dubai stock should remain AED.

      We deliberately do NOT convert FOB/CIF into AED here.
      Dubai Stock is a separate commercial basis.
    */

    if (
      product.currency === 'AED' &&
      product.price !== null &&
      product.price !== undefined
    ) {

      return number(product.price);

    }


    return firstNumber([

      product.dubaiStockPriceAED,

      product.stockPriceAED,

      product.priceAED

    ]);

  }


  function firstNumber(values) {

    for (
      const value of values
    ) {

      const n =
        number(value);


      if (n !== null) {

        return n;

      }

    }


    return null;

  }


  function getCustomPackingPremium(product) {

    /*
      The business rule is configurable.

      We NEVER automatically create $30 here.

      Only use a value explicitly supplied
      by the canonical data layer.
    */

    return firstNumber([

      product.customPackingPremiumUSD,

      product.customPackingPremium,

      product.nonwovenPremiumUSD,

      product.packingPremiumUSD

    ]);

  }


  /* ============================================================
     PRICE BASIS
     ============================================================ */

  function calculateDisplayedPrice(product) {

    const customPremium =
      packingMode === 'CUSTOM_NONWOVEN'
        ? getCustomPackingPremium(product)
        : 0;


    /*
      ----------------------------------------------------------
      FOB ORIGIN
      ----------------------------------------------------------
    */

    if (
      priceBasis === 'FOB_ORIGIN'
    ) {

      const fob =
        getFOB(product);


      if (fob === null) {

        return {

          value: null,

          currency: 'USD',

          basis: 'FOB Origin',

          note: 'FOB price not available'

        };

      }


      return {

        value:
          fob + customPremium,

        currency: 'USD',

        basis: 'FOB Origin',

        note:
          customPremium > 0
            ? `Includes +$${formatNumber(customPremium, 0)}/MT custom packing`
            : 'Standard packing'

      };

    }


    /*
      ----------------------------------------------------------
      CIF DUBAI
      ----------------------------------------------------------
    */

    if (
      priceBasis === 'CIF_DUBAI'
    ) {

      const cif =
        getCIF(product);


      if (cif === null) {

        /*
          We can calculate CIF only when both
          FOB and freight are explicitly available.
        */

        const fob =
          getFOB(product);


        const freight =
          getFreight(product);


        if (
          fob !== null &&
          freight !== null
        ) {

          return {

            value:
              fob +
              freight +
              customPremium,

            currency: 'USD',

            basis: 'CIF Dubai',

            note:
              customPremium > 0
                ? `FOB + freight + $${formatNumber(customPremium, 0)}/MT packing`
                : 'FOB + freight'

          };

        }


        return {

          value: null,

          currency: 'USD',

          basis: 'CIF Dubai',

          note:
            'CIF not available'

        };

      }


      return {

        value:
          cif +
          customPremium,

        currency: 'USD',

        basis: 'CIF Dubai',

        note:
          customPremium > 0
            ? `Includes +$${formatNumber(customPremium, 0)}/MT custom packing`
            : 'CIF Dubai'

      };

    }


    /*
      ----------------------------------------------------------
      DUBAI STOCK
      ----------------------------------------------------------
    */

    const stockPrice =
      getDubaiStockPrice(product);


    if (stockPrice === null) {

      return {

        value: null,

        currency: 'AED',

        basis: 'Dubai Stock',

        note:
          'Dubai stock price not available'

      };

    }


    return {

      value: stockPrice,

      currency: 'AED',

      basis: 'Dubai Stock',

      note:
        product.packageKg
          ? `Packed ${formatNumber(product.packageKg, 0)}kg`
          : 'Local stock price'

    };

  }


  /* ============================================================
     PRICE LABEL
     ============================================================ */

  function priceLabel(product) {

    const result =
      calculateDisplayedPrice(product);


    if (result.value === null) {

      return 'Price on request';

    }


    return (
      result.currency +
      ' ' +
      formatNumber(result.value, 2) +
      ' / MT'
    );

  }


  function priceSubLabel(product) {

    const result =
      calculateDisplayedPrice(product);


    const pieces = [];


    /*
      Original commercial basis.
    */

    if (
      priceBasis === 'FOB_ORIGIN'
    ) {

      const fob =
        getFOB(product);


      if (fob !== null) {

        pieces.push(
          `FOB base: $${formatNumber(fob, 2)}/MT`
        );

      }

    }


    if (
      priceBasis === 'CIF_DUBAI'
    ) {

      const fob =
        getFOB(product);


      const freight =
        getFreight(product);


      if (fob !== null) {

        pieces.push(
          `FOB $${formatNumber(fob, 2)}`
        );

      }


      if (freight !== null) {

        pieces.push(
          `Freight $${formatNumber(freight, 2)}`
        );

      }

    }


    /*
      Packing premium.
    */

    if (
      packingMode === 'CUSTOM_NONWOVEN'
    ) {

      const premium =
        getCustomPackingPremium(product);


      if (premium !== null) {

        pieces.push(
          `Custom packing +$${formatNumber(premium, 0)}/MT`
        );

      }

    }


    /*
      If nothing else is available,
      use canonical note.
    */

    if (
      pieces.length === 0 &&
      result.note
    ) {

      pieces.push(
        result.note
      );

    }


    return pieces.join(' • ');

  }


  /* ============================================================
     STOCK
     ============================================================ */

  function stockMT(product) {

    const direct =
      firstNumber([

        product.stockMT,

        product.availableMT,

        product.quantityMT

      ]);


    if (direct !== null) {

      return direct;

    }


    /*
      Canonical layer should normally perform this conversion.

      This fallback exists only for compatibility.
    */

    const bags =
      firstNumber([

        product.stockBags,

        product.quantityBags

      ]);


    const packageKg =
      firstNumber([

        product.packageKg,

        product.packageWeightKg

      ]);


    if (
      bags !== null &&
      packageKg !== null
    ) {

      return (
        bags *
        packageKg /
        1000
      );

    }


    return null;

  }


  function stockLabel(product) {

    if (
      product.availability === 'BOOKING'
    ) {

      return '📋 Booking';

    }


    if (
      product.availability === 'OUT_OF_STOCK'
    ) {

      return '⛔ Out of Stock';

    }


    const mt =
      stockMT(product);


    if (mt !== null) {

      return (
        formatNumber(mt, 2) +
        ' MT'
      );

    }


    return 'Contact';

  }


  /* ============================================================
     AVAILABILITY
     ============================================================ */

  function isBooking(product) {

    if (
      product.availability === 'BOOKING'
    ) {

      return true;

    }


    /*
      Compatibility with older stock records.
    */

    const value =
      lower(
        product.rawStock ||
        product.stock ||
        ''
      );


    return (
      value.includes('booking') ||
      value.includes('pre-book')
    );

  }


  /* ============================================================
     TREND
     ============================================================ */

  function trendValue(product) {

    /*
      IMPORTANT:
      No Math.random().

      If stock.json does not contain a real trend,
      Pulse shows flat / unavailable.
    */

    return firstNumber([

      product.trendChange,

      product.change24h,

      product.dailyChange,

      product.priceChangePercent

    ]);

  }


  function trendHTML(product) {

    const value =
      trendValue(product);


    if (value === null) {

      return `
        <span class="trend-arrow">—</span>
        <span class="trend-value trend-flat">
          No trend data
        </span>
      `;

    }


    if (value > 0) {

      return `
        <span class="trend-arrow">↑</span>
        <span class="trend-value trend-up">
          +${formatNumber(value, 1)}%
        </span>
      `;

    }


    if (value < 0) {

      return `
        <span class="trend-arrow">↓</span>
        <span class="trend-value trend-down">
          ${formatNumber(value, 1)}%
        </span>
      `;

    }


    return `
      <span class="trend-arrow">→</span>
      <span class="trend-value trend-flat">
        0.0%
      </span>
    `;

  }


  function trendClass(product) {

    const value =
      trendValue(product);


    if (value === null) {

      return 'trend-flat';

    }


    if (value > 0) {

      return 'trend-up';

    }


    if (value < 0) {

      return 'trend-down';

    }


    return 'trend-flat';

  }


  /* ============================================================
     NORMALIZE PRODUCT
     ============================================================ */

  function normalizeProduct(product) {

    return {

      ...product,

      product:
        text(
          product.name ||
          product.product ||
          'Unnamed Grain'
        ),

      origin:
        text(
          product.origin ||
          'Unknown'
        ),

      supplier:
        text(
          product.supplier ||
          product.supplierName ||
          product.supplierTier ||
          'Verified Supplier'
        ),

      supplierTier:
        text(
          product.supplierTier ||
          product.badge ||
          'Verified Supplier'
        ),

      packaging:
        text(
          product.packaging ||
          product.package ||
          'Packing on request'
        ),

      availability:
        text(
          product.availability ||
          (
            isBooking(product)
              ? 'BOOKING'
              : 'IN_STOCK'
          )
        ).toUpperCase(),

      keywords:
        Array.isArray(product.keywords)
          ? product.keywords
          : []

    };

  }


  /* ============================================================
     FILTER
     ============================================================ */

  function applyFilters() {

    filteredData =
      pulseData.filter(product => {

        /*
          Origin
        */

        if (
          activeOrigin !== 'all'
        ) {

          if (
            lower(product.origin) !==
            lower(activeOrigin)
          ) {

            return false;

          }

        }


        /*
          Booking
        */

        if (
          activeOrigin === 'booking'
        ) {

          if (!isBooking(product)) {

            return false;

          }

        }


        /*
          Search
        */

        if (searchTerm) {

          const haystack =
            lower([
              product.product,
              product.origin,
              product.supplier,
              product.packaging,
              product.grainType,
              ...product.keywords
            ].join(' '));


          if (
            !haystack.includes(
              lower(searchTerm)
            )
          ) {

            return false;

          }

        }


        return true;

      });


    /*
      Booking is a special filter.
      It must not also be treated as an origin.
    */

    if (
      activeOrigin === 'booking'
    ) {

      filteredData =
        pulseData.filter(product => {

          if (!isBooking(product)) {

            return false;

          }


          if (searchTerm) {

            const haystack =
              lower([
                product.product,
                product.origin,
                product.supplier,
                product.packaging,
                ...product.keywords
              ].join(' '));


            return haystack.includes(
              lower(searchTerm)
            );

          }


          return true;

        });

    }


    sortData();

    renderAll();

  }


  /* ============================================================
     SORT
     ============================================================ */

  function sortData() {

    if (!sortKey) {

      return;

    }


    filteredData.sort(
      (a, b) => {

        let av;

        let bv;


        switch (sortKey) {

          case 'product':

            av =
              lower(a.product);

            bv =
              lower(b.product);

            break;


          case 'priceRaw':

            av =
              calculateDisplayedPrice(a).value;

            bv =
              calculateDisplayedPrice(b).value;

            av =
              av === null
                ? Infinity
                : av;

            bv =
              bv === null
                ? Infinity
                : bv;

            break;


          case 'trendChange':

            av =
              trendValue(a);

            bv =
              trendValue(b);

            av =
              av === null
                ? 0
                : av;

            bv =
              bv === null
                ? 0
                : bv;

            break;


          case 'supplier':

            av =
              stockMT(a);

            bv =
              stockMT(b);

            av =
              av === null
                ? 0
                : av;

            bv =
              bv === null
                ? 0
                : bv;

            break;


          default:

            return 0;

        }


        if (
          typeof av === 'string'
        ) {

          return (
            av.localeCompare(bv) *
            sortDirection
          );

        }


        return (
          (av - bv) *
          sortDirection
        );

      }
    );

  }


  /* ============================================================
     PRICE BASIS CONTROL
     ============================================================ */

  function injectPriceControls() {

    const container =
      document.querySelector(
        '.filter-bar'
      );


    if (!container) {

      console.warn(
        '[Pulse 3.1] Filter bar not found.'
      );

      return;

    }


    if (
      document.getElementById(
        'pulsePricingControls'
      )
    ) {

      return;

    }


    const wrapper =
      document.createElement('div');


    wrapper.id =
      'pulsePricingControls';


    wrapper.style.cssText = `
      width:100%;
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      padding:14px 16px;
      margin-bottom:12px;
      background:#f8f5ec;
      border:1px solid #e8e4d8;
      border-radius:12px;
      box-sizing:border-box;
    `;


    wrapper.innerHTML = `

      <div
        style="
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:8px;
        "
      >

        <strong
          style="
            font-size:11px;
            letter-spacing:.6px;
            color:#777;
            text-transform:uppercase;
            margin-right:4px;
          "
        >
          Price Basis
        </strong>


        <button
          type="button"
          class="pulse-basis-btn"
          data-basis="FOB_ORIGIN"
        >
          FOB Origin
        </button>


        <button
          type="button"
          class="pulse-basis-btn"
          data-basis="CIF_DUBAI"
        >
          CIF Dubai
        </button>


        <button
          type="button"
          class="pulse-basis-btn active"
          data-basis="DUBAI_STOCK"
        >
          Dubai Stock
        </button>

      </div>


      <div
        style="
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:8px;
        "
      >

        <strong
          style="
            font-size:11px;
            letter-spacing:.6px;
            color:#777;
            text-transform:uppercase;
            margin-right:4px;
          "
        >
          Packing
        </strong>


        <button
          type="button"
          class="pulse-packing-btn active"
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

    `;


    /*
      Insert BEFORE existing filter bar contents.
    */

    container.parentNode.insertBefore(
      wrapper,
      container
    );


    addControlStyles();


    /*
      Price buttons
    */

    wrapper
      .querySelectorAll(
        '.pulse-basis-btn'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          function () {

            priceBasis =
              this.dataset.basis;


            wrapper
              .querySelectorAll(
                '.pulse-basis-btn'
              )
              .forEach(btn =>
                btn.classList.remove(
                  'active'
                )
              );


            this.classList.add(
              'active'
            );


            renderAll();

          }
        );

      });


    /*
      Packing buttons
    */

    wrapper
      .querySelectorAll(
        '.pulse-packing-btn'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          function () {

            packingMode =
              this.dataset.packing;


            wrapper
              .querySelectorAll(
                '.pulse-packing-btn'
              )
              .forEach(btn =>
                btn.classList.remove(
                  'active'
                )
              );


            this.classList.add(
              'active'
            );


            renderAll();

          }
        );

      });

  }


  /* ============================================================
     CONTROL STYLES
     ============================================================ */

  function addControlStyles() {

    if (
      document.getElementById(
        'pulse-v31-control-style'
      )
    ) {

      return;

    }


    const style =
      document.createElement('style');


    style.id =
      'pulse-v31-control-style';


    style.textContent = `

      .pulse-basis-btn,
      .pulse-packing-btn {

        padding:8px 14px;

        border:1px solid #d9d2c1;

        border-radius:50px;

        background:#fff;

        color:#666;

        font-family:inherit;

        font-size:12px;

        font-weight:700;

        cursor:pointer;

        transition:all .2s ease;

      }


      .pulse-basis-btn:hover,
      .pulse-packing-btn:hover {

        border-color:#C1A875;

        color:#a07c3b;

      }


      .pulse-basis-btn.active,
      .pulse-packing-btn.active {

        background:#C1A875;

        border-color:#C1A875;

        color:#fff;

      }


      .pulse-price-note {

        font-size:10px;

        color:#999;

        line-height:1.4;

        margin-top:3px;

      }


      .pulse-source-note {

        font-size:10px;

        color:#999;

        margin-top:5px;

      }


      .pulse-no-data {

        color:#999;

        font-size:13px;

      }


      .pulse-booking-label {

        display:inline-block;

        margin-top:4px;

        padding:2px 7px;

        border-radius:10px;

        background:rgba(212,175,55,.15);

        color:#a07c3b;

        font-size:10px;

        font-weight:700;

      }


      @media(max-width:768px){

        #pulsePricingControls {

          align-items:flex-start !important;

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* ============================================================
     PRICE CARDS
     ============================================================ */

  function renderCards() {

    const container =
      document.getElementById(
        'priceCards'
      );


    if (!container) {

      return;

    }


    container.innerHTML = '';


    const cards =
      filteredData.slice(
        0,
        CONFIG.maxCards
      );


    if (!cards.length) {

      container.innerHTML = `

        <div
          class="pulse-no-data"
          style="
            grid-column:1/-1;
            padding:30px;
            text-align:center;
          "
        >
          No market data matches your filters.
        </div>

      `;

      return;

    }


    cards.forEach(product => {

      const price =
        calculateDisplayedPrice(
          product
        );


      const booking =
        isBooking(product);


      const stock =
        stockMT(product);


      const card =
        document.createElement('div');


      card.className =
        'price-card';


      card.innerHTML = `

        <div class="product-header">

          <span class="product-name">

            ${escapeHtml(
              product.product
            )}

          </span>


          <span class="flag">

            ${flagForOrigin(
              product.origin
            )}

          </span>

        </div>


        <div
          style="
            font-size:11px;
            color:#999;
            margin-bottom:5px;
          "
        >

          ${escapeHtml(
            product.origin
          )}

        </div>


        <div class="price">

          ${
            price.value === null

              ? 'Price on request'

              : `
                ${escapeHtml(
                  price.currency
                )}
                ${formatNumber(
                  price.value,
                  2
                )}

                <small>
                  / MT
                </small>
              `
          }

        </div>


        <div class="price-details">

          <span
            class="trend ${trendClass(product)}"
          >

            ${trendHTML(product)}

          </span>

        </div>


        <div class="stock-info">

          <span>

            ${booking
              ? '📋 Booking'
              : stock !== null
                ? `📦 ${formatNumber(stock,2)} MT`
                : '📦 Contact'
            }

          </span>


          <span class="badge">

            ${escapeHtml(
              product.supplierTier
            )}

          </span>

        </div>


        <div class="pulse-price-note">

          ${escapeHtml(
            priceSubLabel(product)
          )}

        </div>


        <a
          class="book-btn"
          href="${escapeHtml(
            whatsappUrl(product)
          )}"
          target="_blank"
          rel="noopener"
        >

          ${
            booking
              ? '📋 Request Booking'
              : '💬 Get Quote'
          }

        </a>

      `;


      container.appendChild(
        card
      );

    });

  }


  /* ============================================================
     MARKET TABLE
     ============================================================ */

  function renderTable() {

    const tbody =
      document.getElementById(
        'pulse-table'
      );


    if (!tbody) {

      return;

    }


    tbody.innerHTML = '';


    if (!filteredData.length) {

      tbody.innerHTML = `

        <tr>

          <td
            colspan="6"
            style="
              text-align:center;
              padding:30px;
              color:#999;
            "
          >

            No market data matches your filters.

          </td>

        </tr>

      `;


      updateRowCount(0);


      return;

    }


    filteredData.forEach(product => {

      const price =
        calculateDisplayedPrice(
          product
        );


      const stock =
        stockMT(product);


      const booking =
        isBooking(product);


      const row =
        document.createElement('tr');


      row.innerHTML = `

        <td class="col-product">

          <strong>

            ${escapeHtml(
              product.product
            )}

          </strong>


          <span class="origin-text">

            ${flagForOrigin(
              product.origin
            )}

            ${escapeHtml(
              product.origin
            )}

          </span>

        </td>


        <td class="col-price">

          <div class="price-main">

            ${
              price.value === null

                ? 'Price on request'

                : `
                  ${escapeHtml(
                    price.currency
                  )}
                  ${formatNumber(
                    price.value,
                    2
                  )}
                  / MT
                `
            }

          </div>


          <div class="price-sub">

            ${escapeHtml(
              priceSubLabel(product)
            )}

          </div>

        </td>


        <td class="col-trend">

          ${trendHTML(product)}

        </td>


        <td class="col-supplier">

          ${
            stock !== null
              ? `
                <strong>
                  ${formatNumber(stock,2)}
                </strong>
                MT
              `
              : 'Contact'
          }


          ${
            booking
              ? `
                <div class="pulse-booking-label">
                  BOOKING
                </div>
              `
              : ''
          }

        </td>


        <td class="col-meta">

          <span class="badge-supplier">

            ${escapeHtml(
              product.supplierTier
            )}

          </span>


          <div
            style="
              margin-top:5px;
              font-size:11px;
              color:#999;
            "
          >

            ${escapeHtml(
              product.supplier
            )}

          </div>

        </td>


        <td class="col-action">

          <a
            class="whatsapp-link"
            href="${escapeHtml(
              whatsappUrl(product)
            )}"
            target="_blank"
            rel="noopener"
            title="Get Quote"
          >

            <i class="fab fa-whatsapp"></i>

          </a>

        </td>

      `;


      tbody.appendChild(
        row
      );

    });


    updateRowCount(
      filteredData.length
    );

  }


  /* ============================================================
     RENDER EVERYTHING
     ============================================================ */

  function renderAll() {

    renderCards();

    renderTable();

    updateMarketMood();

  }


  /* ============================================================
     ROW COUNT
     ============================================================ */

  function updateRowCount(count) {

    const element =
      document.getElementById(
        'rowCount'
      );


    if (!element) {

      return;

    }


    element.textContent =
      `${count} market listing${count !== 1 ? 's' : ''}`;

  }


  /* ============================================================
     MARKET MOOD
     ------------------------------------------------------------
     Only based on REAL trend values.
     ============================================================ */

  function updateMarketMood() {

    const element =
      document.getElementById(
        'market-mood'
      );


    if (!element) {

      return;

    }


    const trends =
      filteredData
        .map(
          product =>
            trendValue(product)
        )
        .filter(
          value =>
            value !== null
        );


    if (!trends.length) {

      element.textContent =
        'Market direction: awaiting verified trend data.';

      return;

    }


    const average =
      trends.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      trends.length;


    if (average > 0.5) {

      element.textContent =
        'Market direction: prices are trending higher in available data.';

      return;

    }


    if (average < -0.5) {

      element.textContent =
        'Market direction: prices are trending lower in available data.';

      return;

    }


    element.textContent =
      'Market direction: broadly stable in available data.';

  }


  /* ============================================================
     WHATSAPP
     ============================================================ */

  function whatsappUrl(product) {

    const price =
      calculateDisplayedPrice(
        product
      );


    const priceText =
      price.value !== null

        ? `${price.currency} ${formatNumber(price.value,2)}/MT`

        : 'Price on request';


    const message =
      `Market Pulse inquiry: ${product.product}` +
      ` | Origin: ${product.origin}` +
      ` | Basis: ${price.basis}` +
      ` | Packing: ${
        packingMode === 'CUSTOM_NONWOVEN'
          ? 'Custom Nonwoven'
          : 'Standard PP'
      }` +
      ` | ${priceText}`;


    return (
      'https://wa.me/' +
      CONFIG.whatsappNumber +
      '?text=' +
      encodeURIComponent(
        message
      )
    );

  }


  /* ============================================================
     LAST UPDATED
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
      Prefer timestamp supplied by canonical data.

      We do not pretend the current browser time
      is the market-data timestamp.
    */

    let timestamp = null;


    for (
      const product of pulseData
    ) {

      const candidate =
        product.updatedAt ||
        product.lastUpdated ||
        product.priceUpdatedAt ||
        product.timestamp ||
        product.dataUpdatedAt;


      if (candidate) {

        timestamp =
          candidate;

        break;

      }

    }


    if (timestamp) {

      const date =
        new Date(timestamp);


      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {

        element.textContent =
          date.toLocaleString(
            undefined,
            {
              dateStyle: 'medium',
              timeStyle: 'short'
            }
          );

        return;

      }

    }


    /*
      If the dataset has no timestamp,
      say so honestly.
    */

    element.textContent =
      'Source timestamp not supplied';

  }


  /* ============================================================
     DATA LOADING
     ============================================================ */

  async function loadPulseData(
    force = true
  ) {

    try {

      if (
        !window.GrainsHubData ||
        typeof window.GrainsHubData.load !== 'function'
      ) {

        throw new Error(
          'GrainsHubData is not available. ' +
          'Load grainsData.js before marketPulse.js.'
        );

      }


      console.log(
        '[Pulse 3.1] Loading canonical market data...'
      );


      const products =
        await window.GrainsHubData.load(
          force
        );


      if (
        !Array.isArray(products)
      ) {

        throw new Error(
          'Canonical data layer returned invalid data.'
        );

      }


      pulseData =
        products
          .filter(
            product =>
              product &&
              (
                product.name ||
                product.product
              )
          )
          .map(
            normalizeProduct
          );


      console.log(
        `[Pulse 3.1] Loaded ${pulseData.length} listings`
      );


      updateLastUpdated();


      applyFilters();


    } catch (error) {

      console.error(
        '[Pulse 3.1] Data load failed:',
        error
      );


      showLoadError();

    }

  }


  /* ============================================================
     LOAD ERROR
     ============================================================ */

  function showLoadError() {

    const cards =
      document.getElementById(
        'priceCards'
      );


    const table =
      document.getElementById(
        'pulse-table'
      );


    if (cards) {

      cards.innerHTML = `

        <div
          style="
            grid-column:1/-1;
            text-align:center;
            padding:35px 20px;
            color:#777;
          "
        >

          <i
            class="fas fa-triangle-exclamation"
            style="
              font-size:28px;
              color:#C1A875;
              margin-bottom:12px;
            "
          ></i>


          <p>
            Market data is temporarily unavailable.
          </p>


          <p
            style="
              font-size:12px;
              color:#999;
            "
          >
            Please refresh or contact the Trade Desk.
          </p>

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
              color:#999;
            "
          >

            Market data temporarily unavailable.

          </td>

        </tr>

      `;

    }


    updateRowCount(0);

  }


  /* ============================================================
     ORIGIN FILTERS
     ============================================================ */

  function setupOriginFilters() {

    const buttons =
      document.querySelectorAll(
        '.filter-btn'
      );


    buttons.forEach(
      button => {

        button.addEventListener(
          'click',
          function () {

            const value =
              this.dataset.filter ||
              'all';


            activeOrigin =
              value;


            buttons.forEach(
              btn =>
                btn.classList.remove(
                  'active'
                )
            );


            this.classList.add(
              'active'
            );


            applyFilters();

          }
        );

      }
    );

  }


  /* ============================================================
     SEARCH
     ============================================================ */

  function setupSearch() {

    const input =
      document.getElementById(
        'searchInput'
      );


    if (!input) {

      return;

    }


    input.addEventListener(
      'input',
      function () {

        searchTerm =
          this.value.trim();


        applyFilters();

      }
    );

  }


  /* ============================================================
     TABLE SORTING
     ============================================================ */

  function setupSorting() {

    const headers =
      document.querySelectorAll(
        '#pulse-table ~ *'
      );


    /*
      Actual sortable headers live in
      the table THEAD, so query globally.
    */

    const sortable =
      document.querySelectorAll(
        'th[data-sort]'
      );


    sortable.forEach(
      header => {

        header.addEventListener(
          'click',
          function () {

            const key =
              this.dataset.sort;


            if (
              sortKey === key
            ) {

              sortDirection *= -1;

            } else {

              sortKey =
                key;

              sortDirection =
                1;

            }


            applyFilters();

          }
        );

      }
    );

  }


  /* ============================================================
     ASK ALLIYA
     ============================================================ */

  function setupAlliyaButton() {

    const button =
      document.getElementById(
        'askAlliyaBtn'
      );


    if (!button) {

      return;

    }


    button.addEventListener(
      'click',
      function () {

        /*
          Existing Alliya implementation
          exposes Alliya.open().
        */

        if (
          window.Alliya &&
          typeof window.Alliya.open === 'function'
        ) {

          window.Alliya.open();

          return;

        }


        /*
          Fallback for older implementations.
        */

        const floating =
          document.getElementById(
            'alliyaFloatBtn'
          );


        if (floating) {

          floating.click();

        }

      }
    );

  }


  /* ============================================================
     AUTO REFRESH
     ============================================================ */

  function setupAutoRefresh() {

    setInterval(
      function () {

        console.log(
          '[Pulse 3.1] Refreshing canonical market data...'
        );


        loadPulseData(true);

      },
      CONFIG.refreshMinutes *
      60 *
      1000
    );

  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.MarketPulse = {

    version: '3.1',

    reload:
      () =>
        loadPulseData(true),

    getData:
      () =>
        pulseData.slice(),

    getFilteredData:
      () =>
        filteredData.slice(),

    getPriceBasis:
      () =>
        priceBasis,

    getPackingMode:
      () =>
        packingMode

  };


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function init() {

    console.log(
      '🌾 Market Pulse v3.1 — Lady Stark Edition'
    );


    /*
      Add FOB / CIF / Dubai Stock controls.
    */

    injectPriceControls();


    /*
      Existing origin filters.
    */

    setupOriginFilters();


    /*
      Existing search.
    */

    setupSearch();


    /*
      Existing table sorting.
    */

    setupSorting();


    /*
      Existing Alliya button.
    */

    setupAlliyaButton();


    /*
      Load canonical data.
    */

    loadPulseData(true);


    /*
      Refresh every 30 minutes.
    */

    setupAutoRefresh();

  }


  /* ============================================================
     DOM READY
     ============================================================ */

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();

  }


})(window, document);
