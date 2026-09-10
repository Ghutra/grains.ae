/* ============================================================
   GRAINS HUB SHOP v3.1
   LADY STARK — Canonical Data Layer Edition

   PURPOSE
   ------------------------------------------------------------
   • Uses grainsData.js as the single commercial data source
   • Preserves the EXISTING Shop HTML/CSS
   • Preserves existing filter IDs
   • Handles package pricing correctly
   • Handles bag → MT stock conversion from canonical data
   • Handles Booking / In Stock / Out of Stock
   • No fabricated commercial data
   ============================================================ */

(function (window, document) {

  'use strict';

  const WA_NUMBER = '971585521976';

  let allListings = [];

  let currentFilters = {
    origin: '',
    tier: '',
    type: ''
  };


  /* ============================================================
     HELPERS
     ============================================================ */

  function esc(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


  function txt(value) {

    return String(value ?? '').trim();

  }


  function low(value) {

    return txt(value).toLowerCase();

  }


  function num(value, decimals = 2) {

    const n = Number(value);

    if (!Number.isFinite(n)) {
      return null;
    }

    return n.toLocaleString(undefined, {
      maximumFractionDigits: decimals
    });

  }


  /* ============================================================
     IMAGE HANDLING
     ============================================================ */

  function imageSrc(image) {

    const img = txt(image);

    if (!img) {
      return '/assets/img/placeholder.jpg';
    }

    /*
      Keep absolute URLs untouched.
    */

    if (
      /^(https?:)?\/\//i.test(img) ||
      img.startsWith('/')
    ) {

      return img;

    }

    /*
      Existing Grains Hub product images
      are stored under /assets/img/
    */

    return '/assets/img/' +
      img
        .replace(/^assets\/img\//i, '')
        .replace(/^\/+/, '');

  }


  /* ============================================================
     SUPPLIER BADGE
     ============================================================ */

  function badge(product) {

    if (product.supplierTier) {

      return product.supplierTier;

    }

    if (product.availability === 'BOOKING') {

      return 'Pre-Booking';

    }

    return 'Verified Supplier';

  }


  function badgeClass(product) {

    const b = low(badge(product));

    if (b.includes('peer')) {

      return 'peer';

    }

    if (
      b.includes('pre-book') ||
      product.availability === 'BOOKING'
    ) {

      return 'booking';

    }

    return 'verified';

  }


  /* ============================================================
     GRAIN TYPE SEARCH
     ============================================================ */

  function typeText(product) {

    return low([
      product.grainType,
      product.name,
      ...(Array.isArray(product.keywords)
        ? product.keywords
        : [])
    ].join(' '));

  }


  /* ============================================================
     PRICE
     ============================================================ */

  function price(product) {

    if (
      product.price === null ||
      product.price === undefined
    ) {

      return 'Price on request';

    }

    /*
      Prefer canonical formatter.
    */

    if (
      window.GrainsHubData &&
      typeof window.GrainsHubData.formatPrice === 'function'
    ) {

      return window.GrainsHubData.formatPrice(product);

    }

    /*
      Safe fallback.
    */

    const formatted = num(product.price, 2);

    if (!formatted) {

      return 'Price on request';

    }

    return `${product.currency || ''} ${formatted}`;

  }


  /* ============================================================
     AED / KG
     ============================================================ */

  function kgPrice(product) {

    if (
      product.currency === 'AED' &&
      product.pricePerKg !== null &&
      product.pricePerKg !== undefined &&
      Number.isFinite(Number(product.pricePerKg))
    ) {

      return `${num(product.pricePerKg, 2)} AED/kg`;

    }

    return '';

  }


  /* ============================================================
     STOCK STATUS
     ============================================================ */

  function stockText(product) {

    if (product.availability === 'BOOKING') {

      return '📋 Booking';

    }


    if (product.availability === 'OUT_OF_STOCK') {

      return '⛔ Out of Stock';

    }


    if (
      product.stockMT !== null &&
      product.stockMT !== undefined &&
      Number.isFinite(Number(product.stockMT))
    ) {

      return `✅ ${num(product.stockMT, 2)} MT available`;

    }


    if (
      product.rawStock !== null &&
      product.rawStock !== undefined &&
      txt(product.rawStock)
    ) {

      return '✅ In Stock';

    }


    return 'ℹ️ Contact';

  }


  /* ============================================================
     STOCK DETAIL
     ============================================================ */

  function stockDetail(product) {

    if (product.availability === 'BOOKING') {

      return 'Pre-booking / shipment request';

    }

    const parts = [];


    if (
      product.stockBags !== null &&
      product.stockBags !== undefined &&
      Number.isFinite(Number(product.stockBags))
    ) {

      parts.push(
        `${num(product.stockBags, 0)} bags`
      );

    }


    if (
      product.stockMT !== null &&
      product.stockMT !== undefined &&
      Number.isFinite(Number(product.stockMT))
    ) {

      parts.push(
        `${num(product.stockMT, 2)} MT`
      );

    }


    if (parts.length) {

      return parts.join(' • ');

    }


    return txt(product.rawStock);

  }


  /* ============================================================
     WHATSAPP
     ============================================================ */

  function whatsappUrl(product) {

    const message =
      `Inquiry: ${product.name}` +
      (
        product.origin
          ? ` | Origin: ${product.origin}`
          : ''
      ) +
      (
        price(product)
          ? ` | ${price(product)}`
          : ''
      );


    return (
      'https://wa.me/' +
      WA_NUMBER +
      '?text=' +
      encodeURIComponent(message)
    );

  }


  /* ============================================================
     LOAD SHOP
     ============================================================ */

  async function loadShop(force = true) {

    const grid =
      document.getElementById('productGrid');


    if (!grid) {

      console.error(
        '[Shop 3.1] #productGrid not found.'
      );

      return;

    }


    /*
      Keep existing loading UI.
    */

    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading verified grains...</p>
      </div>
    `;


    try {

      /*
        IMPORTANT:
        grainsData.js MUST load before shop.js.
      */

      if (
        !window.GrainsHubData ||
        typeof window.GrainsHubData.load !== 'function'
      ) {

        throw new Error(
          'GrainsHubData is not available. ' +
          'Load grainsData.js before shop.js.'
        );

      }


      console.log(
        '[Shop 3.1] Loading canonical stock data...'
      );


      const products =
        await window.GrainsHubData.load(force);


      if (!Array.isArray(products)) {

        throw new Error(
          'Canonical data layer returned invalid product data.'
        );

      }


      allListings =
        products.filter(
          product =>
            product &&
            product.name
        );


      console.log(
        `[Shop 3.1] Loaded ${allListings.length} products from stock.json`
      );


      renderShop(allListings);


      updateCount(allListings.length);


      exposeGlobals();


    } catch (error) {

      console.error(
        '[Shop 3.1] Load error:',
        error
      );


      grid.innerHTML = `
        <div class="empty-state">

          <i
            class="fas fa-exclamation-triangle"
            style="
              font-size:2rem;
              color:#e74c3c;
              margin-bottom:12px;
              display:block;
            "
          ></i>

          <p>
            Live product data is temporarily unavailable.
          </p>

          <p class="suggestion">

            <a
              href="https://wa.me/971585521976"
              style="
                color:#25D366;
                font-weight:600;
                text-decoration:none;
              "
              target="_blank"
              rel="noopener"
            >
              Contact the Trade Desk on WhatsApp
            </a>

          </p>

        </div>
      `;


      updateCount(0);

    }

  }


  /* ============================================================
     RENDER SHOP
     ------------------------------------------------------------
     IMPORTANT:
     These classes match the EXISTING Shop CSS.
     ============================================================ */

  function renderShop(listings) {

    const grid =
      document.getElementById('productGrid');


    if (!grid) {

      return;

    }


    grid.innerHTML = '';


    if (!Array.isArray(listings) || listings.length === 0) {

      grid.innerHTML = `
        <div class="empty-state">

          <i
            class="fas fa-search"
            style="
              font-size:2rem;
              color:#C1A875;
              margin-bottom:12px;
              display:block;
            "
          ></i>

          <p>
            No products match your filters.
          </p>

          <p class="suggestion">

            Try adjusting your filters or

            <a
              href="https://wa.me/971585521976"
              style="
                color:#25D366;
                font-weight:600;
                text-decoration:none;
              "
              target="_blank"
              rel="noopener"
            >
              contact us
            </a>

            for custom sourcing.

          </p>

        </div>
      `;


      updateCount(0);

      return;

    }


    listings.forEach(product => {

      const booking =
        product.availability === 'BOOKING';


      const stock =
        stockDetail(product);


      const card =
        document.createElement('div');


      /*
        Existing Shop CSS.
      */

      card.className =
        'product-card';


      /*
        Preserve useful data attributes.
      */

      card.dataset.origin =
        product.origin || '';


      card.dataset.badge =
        badge(product);


      card.dataset.type =
        typeText(product);


      card.innerHTML = `

        <div class="image-wrapper">

          <img
            src="${esc(imageSrc(product.image))}"
            alt="${esc(product.name)}"
            loading="lazy"
            onerror="
              this.onerror=null;
              this.src='/assets/img/placeholder.jpg';
            "
          >

          <span
            class="badge-top ${esc(badgeClass(product))}"
          >
            ${esc(badge(product))}
          </span>

        </div>


        <div class="content">

          <h3>
            ${esc(product.name)}
          </h3>


          <div class="meta">

            <span>

              <i class="fas fa-map-marker-alt"></i>

              ${esc(
                product.origin ||
                'Origin on request'
              )}

            </span>


            <span>

              <i class="fas fa-box"></i>

              ${esc(
                product.packaging ||
                'Packing on request'
              )}

            </span>

          </div>


          <div class="price-row">

            <span class="price">

              ${esc(price(product))}

            </span>


            ${
              kgPrice(product)
                ? `
                  <span class="kg-price">
                    ${esc(kgPrice(product))}
                  </span>
                `
                : ''
            }

          </div>


          <div class="stock-info">

            <span
              class="${
                booking
                  ? 'booking'
                  : 'in-stock'
              }"
            >

              ${esc(stockText(product))}

            </span>


            ${
              stock
                ? `
                  <span
                    style="
                      margin-left:12px;
                      color:#999;
                    "
                  >
                    ${esc(stock)}
                  </span>
                `
                : ''
            }

          </div>


          <a
            href="${esc(whatsappUrl(product))}"
            class="btn-whatsapp"
            target="_blank"
            rel="noopener"
          >

            <i class="fab fa-whatsapp"></i>

            Get Quote

          </a>

        </div>

      `;


      grid.appendChild(card);

    });


    updateCount(listings.length);

  }


  /* ============================================================
     FILTERS
     ------------------------------------------------------------
     THESE ARE YOUR REAL EXISTING HTML IDs:
       filterOrigin
       filterTier
       filterType
     ============================================================ */

  function filterProducts() {

    const originElement =
      document.getElementById('filterOrigin');


    const tierElement =
      document.getElementById('filterTier');


    const typeElement =
      document.getElementById('filterType');


    const origin =
      originElement
        ? originElement.value
        : '';


    const tier =
      tierElement
        ? tierElement.value
        : '';


    const type =
      typeElement
        ? typeElement.value
        : '';


    currentFilters = {

      origin,
      tier,
      type

    };


    let filtered =
      allListings.slice();


    /* Origin */

    if (origin) {

      filtered =
        filtered.filter(
          product =>
            low(product.origin) ===
            low(origin)
        );

    }


    /* Supplier Tier */

    if (tier) {

      filtered =
        filtered.filter(
          product =>
            low(badge(product))
              .includes(low(tier))
        );

    }


    /* Grain Type */

    if (type) {

      filtered =
        filtered.filter(
          product =>
            typeText(product)
              .includes(low(type))
        );

    }


    console.log(
      `[Shop 3.1] Filters → ` +
      `origin="${origin}" ` +
      `tier="${tier}" ` +
      `type="${type}" ` +
      `→ ${filtered.length} products`
    );


    renderShop(filtered);

  }


  /* ============================================================
     COUNT
     ============================================================ */

  function updateCount(count) {

    const element =
      document.getElementById('productCount');


    if (!element) {

      return;

    }


    element.textContent =
      `${count} product${count !== 1 ? 's' : ''} available`;

  }


  /* ============================================================
     RESET FILTERS
     ============================================================ */

  function resetFilters() {

    const origin =
      document.getElementById('filterOrigin');


    const tier =
      document.getElementById('filterTier');


    const type =
      document.getElementById('filterType');


    if (origin) {

      origin.value = '';

    }


    if (tier) {

      tier.value = '';

    }


    if (type) {

      type.value = '';

    }


    currentFilters = {

      origin: '',
      tier: '',
      type: ''

    };


    renderShop(allListings);


    updateCount(
      allListings.length
    );

  }


  /* ============================================================
     GLOBAL FUNCTIONS
     ============================================================ */

  function exposeGlobals() {

    window.filterShop =
      filterProducts;


    window.resetShopFilters =
      resetFilters;


    window.loadShop =
      loadShop;


    /*
      Getter prevents stale array reference.
    */

    try {

      Object.defineProperty(
        window,
        'allListings',
        {
          configurable: true,

          get: function () {

            return allListings.slice();

          }

        }
      );

    } catch (error) {

      console.warn(
        '[Shop 3.1] Could not expose allListings:',
        error
      );

    }

  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  function init() {

    console.log(
      '[Shop 3.1] Initializing Shop...'
    );


    /*
      Existing filter IDs.
    */

    const origin =
      document.getElementById('filterOrigin');


    const tier =
      document.getElementById('filterTier');


    const type =
      document.getElementById('filterType');


    const reset =
      document.getElementById('resetFilters');


    if (origin) {

      origin.addEventListener(
        'change',
        filterProducts
      );

    }


    if (tier) {

      tier.addEventListener(
        'change',
        filterProducts
      );

    }


    if (type) {

      type.addEventListener(
        'change',
        filterProducts
      );

    }


    if (reset) {

      reset.addEventListener(
        'click',
        resetFilters
      );

    }


    exposeGlobals();


    loadShop(true);

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
