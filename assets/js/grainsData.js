/* ================================================================
   GRAINS HUB — grainsData.js v4.0
   LADY STARK — COMMODITY IDENTITY + PRICE INTEGRITY ENGINE

   PURPOSE
   -------
   One canonical commercial data layer for:

      stock.json
          ↓
      Product Identity
          ↓
      Price Interpretation
          ↓
      Quantity
          ↓
      Supplier
          ↓
      Market History
          ↓
      Shop / Pulse / Alliya

   IMPORTANT COMMERCIAL RULES
   --------------------------
   1. stock.json remains the live Grains Hub commercial source.
   2. USD stock prices are treated as CIF Dubai when no explicit
      price basis exists, because current stock pricing already
      contains the logistics add-on.
   3. AED stock prices are treated as Dubai Stock / local sale price.
   4. We NEVER add freight again to an existing CIF stock price.
   5. We NEVER invent a price.
   6. We NEVER infer one rice variety from another.
   7. Origin + variety + processing are mandatory identity dimensions.
   8. India 1121 !== Pakistan 1121.
   9. PR106 Golden Sella !== 1121 Golden Sella.
  ================================================================= */

(function (window) {
  "use strict";

  const VERSION = "4.0";

  /* ================================================================
     1. CONFIGURATION
     ================================================================= */

  const CONFIG = {

    STOCK_URL: "/assets/data/stock.json",

    CACHE_TTL_MS: 5 * 60 * 1000,

    /*
      Current stock.json commercial convention supplied by
      Grains Hub Trade Desk:

      USD stock prices already include approximately +USD 250/MT
      over the underlying FOB reference.

      IMPORTANT:
      This value is NOT automatically added to anything.
      It is only used when deriving a FOB reference from an
      existing CIF stock price.
    */
    STOCK_CIF_ADDON_USD_PER_MT: 250,

    /*
      Do not automatically use the current freight.json +260
      here.

      freight.json is a separate live Trade Desk reference.
      Pulse may use it when calculating a current CIF reference
      from a current FOB observation.
    */
    USE_FREIGHT_FILE_FOR_STOCK: false,

    UNKNOWN: null
  };


  /* ================================================================
     2. COMMERCIAL ENUMS
     ================================================================= */

  const BASIS = {
    FOB_ORIGIN: "FOB_ORIGIN",
    CIF_DUBAI: "CIF_DUBAI",
    DUBAI_STOCK: "DUBAI_STOCK",
    UNKNOWN: "UNKNOWN"
  };

  const PACKING = {
    STANDARD_PP: "STANDARD_PP",
    CUSTOM_NONWOVEN: "CUSTOM_NONWOVEN",
    UNKNOWN: "UNKNOWN"
  };

  const AVAILABILITY = {
    IN_STOCK: "IN_STOCK",
    BOOKING: "BOOKING",
    OUT_OF_STOCK: "OUT_OF_STOCK",
    UNKNOWN: "UNKNOWN"
  };

  const PRICE_STATUS = {
    CONFIRMED: "CONFIRMED",
    OBSERVED: "OBSERVED",
    REFERENCE: "REFERENCE",
    ON_REQUEST: "ON_REQUEST"
  };


  /* ================================================================
     3. INTERNAL STATE
     ================================================================= */

  const state = {
    products: [],
    loadedAt: 0,
    source: null
  };


  /* ================================================================
     4. BASIC HELPERS
     ================================================================= */

  function txt(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }


  function lower(value) {
    return txt(value).toLowerCase();
  }


  function upper(value) {
    return txt(value).toUpperCase();
  }


  function number(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const cleaned = String(value)
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "");

    if (!cleaned) {
      return null;
    }

    const n = Number(cleaned);

    return Number.isFinite(n) ? n : null;
  }


  function firstNumber(obj, keys) {

    for (const key of keys) {

      if (
        Object.prototype.hasOwnProperty.call(obj, key)
      ) {

        const value = number(obj[key]);

        if (value !== null) {
          return value;
        }
      }
    }

    return null;
  }


  function slug(value) {

    return lower(value)
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }


  /* ================================================================
     5. WEIGHT / PACKAGING RECOGNITION
     ================================================================= */

  function parseWeightKg(value) {

    const s = lower(value).replace(/,/g, "");

    if (!s) {
      return null;
    }

    /*
      Examples:

      40kg
      40 kg
      50 KG
      35kg PP
      10x4 = 40kg
      4×10 = 40kg
    */

    const direct = s.match(
      /(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms)\b/
    );

    if (direct) {
      return Number(direct[1]);
    }


    /*
      10x4kg
      4x10kg
      10 × 4
    */

    const multiplication = s.match(
      /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|kgs)?/
    );

    if (multiplication) {

      const a = Number(multiplication[1]);
      const b = Number(multiplication[2]);

      return a * b;
    }

    return null;
  }


  function packageKg(item) {

    return (
      firstNumber(item, [
        "packageKg",
        "packagingKg",
        "bagWeightKg",
        "weightKg"
      ]) ??
      parseWeightKg(item.size) ??
      parseWeightKg(item.packaging) ??
      null
    );
  }


  /* ================================================================
     6. ORIGIN RECOGNITION
     ================================================================= */

  function normalizeOrigin(value) {

    const s = lower(value);

    if (!s) {
      return "";
    }

    if (
      s.includes("india") ||
      s.includes("indian")
    ) {
      return "India";
    }

    if (
      s.includes("pakistan") ||
      s.includes("pakistani")
    ) {
      return "Pakistan";
    }

    if (
      s.includes("thailand") ||
      s.includes("thai")
    ) {
      return "Thailand";
    }

    if (
      s.includes("vietnam") ||
      s.includes("vietnamese")
    ) {
      return "Vietnam";
    }

    if (
      s.includes("usa") ||
      s.includes("united states") ||
      s.includes("america")
    ) {
      return "USA";
    }

    return txt(value);
  }


  /* ================================================================
     7. VARIETY TAXONOMY
     ================================================================= */

  /*
    IMPORTANT:

    The order matters.

    More specific variety identifiers are checked before generic
    terms such as "1121", "1509", "IRRI", etc.
  */

  const INDIA_VARIETIES = [

    "PR11/14",
    "PR106",
    "PR47",
    "PR26",

    "Sona Masoori",

    "IR64",

    "1718",
    "1847",
    "1401",

    "1121",
    "1509",

    "PUSA",
    "Sugandha",
    "Sharbati",
    "Taj",
    "RH10"
  ];


  const PAKISTAN_VARIETIES = [

    "Super Basmati",

    "PK386",
    "PK385",

    "D98",
    "KS282",

    "IRRI 6",
    "IRRI 9",

    "1121",
    "1509"
  ];


  function detectVariety(name, origin) {

    const s = lower(name);

    if (!s) {
      return "";
    }


    /*
      Pakistan-specific first.
    */

    if (origin === "Pakistan") {

      if (/super[\s-]*basmati/.test(s)) {
        return "Super Basmati";
      }

      if (/\bpk[\s-]*386\b/.test(s)) {
        return "PK386";
      }

      if (/\bpk[\s-]*385\b/.test(s)) {
        return "PK385";
      }

      if (/\bd[\s-]*98\b/.test(s)) {
        return "D98";
      }

      if (/\bks[\s-]*282\b/.test(s)) {
        return "KS282";
      }

      if (/\birri[\s-]*6\b/.test(s)) {
        return "IRRI 6";
      }

      if (/\birri[\s-]*9\b/.test(s)) {
        return "IRRI 9";
      }

      if (/\b1121\b/.test(s)) {
        return "1121";
      }

      if (/\b1509\b/.test(s)) {
        return "1509";
      }
    }


    /*
      India-specific.
    */

    if (origin === "India") {

      if (/pr[\s-]*11\s*\/?\s*14/.test(s)) {
        return "PR11/14";
      }

      if (/\bpr[\s-]*106\b/.test(s)) {
        return "PR106";
      }

      if (/\bpr[\s-]*47\b/.test(s)) {
        return "PR47";
      }

      if (/\bpr[\s-]*26\b/.test(s)) {
        return "PR26";
      }

      if (/sona[\s-]*masoori|sona[\s-]*massori/.test(s)) {
        return "Sona Masoori";
      }

      if (/\bir[\s-]*64\b/.test(s)) {
        return "IR64";
      }

      if (/\b1718\b/.test(s)) {
        return "1718";
      }

      if (/\b1847\b/.test(s)) {
        return "1847";
      }

      if (/\b1401\b/.test(s)) {
        return "1401";
      }

      if (/\b1121\b/.test(s)) {
        return "1121";
      }

      if (/\b1509\b/.test(s)) {
        return "1509";
      }

      if (/\bpusa\b/.test(s)) {
        return "PUSA";
      }

      if (/\bsugandha\b/.test(s)) {
        return "Sugandha";
      }

      if (/\bsharbati\b/.test(s)) {
        return "Sharbati";
      }

      if (/\btaj\b/.test(s)) {
        return "Taj";
      }

      if (/\brh[\s-]*10\b/.test(s)) {
        return "RH10";
      }
    }


    /*
      Origin unknown.

      Only recognize unambiguous identifiers.
      Do NOT guess India/Pakistan merely from 1121 or 1509.
    */

    if (!origin) {

      if (/\bpr[\s-]*106\b/.test(s)) {
        return "PR106";
      }

      if (/\bpr[\s-]*47\b/.test(s)) {
        return "PR47";
      }

      if (/\bpr[\s-]*26\b/.test(s)) {
        return "PR26";
      }

      if (/\bpk[\s-]*386\b/.test(s)) {
        return "PK386";
      }

      if (/\bpk[\s-]*385\b/.test(s)) {
        return "PK385";
      }

      if (/\birri[\s-]*6\b/.test(s)) {
        return "IRRI 6";
      }

      if (/\birri[\s-]*9\b/.test(s)) {
        return "IRRI 9";
      }
    }

    return "";
  }


  /* ================================================================
     8. PROCESSING / FORM RECOGNITION
     ================================================================= */

  function normalizeProcessing(value, productName) {

    const s = lower(
      txt(value) + " " + txt(productName)
    );

    if (
      /golden[\s-]*sella/.test(s)
    ) {
      return "Golden Sella";
    }

    if (
      /white[\s-]*\/?[\s-]*creamy[\s-]*sella/.test(s) ||
      /creamy[\s-]*sella/.test(s) ||
      /white[\s-]*sella/.test(s)
    ) {
      return "White / Creamy Sella";
    }

    if (
      /light[\s-]*\/?[\s-]*dark[\s-]*steam/.test(s) ||
      /dark[\s-]*steam/.test(s) ||
      /light[\s-]*steam/.test(s) ||
      /\bsteam\b/.test(s)
    ) {
      return "Light / Dark Steam";
    }

    if (
      /\braw\b/.test(s) ||
      /\bwhite\b/.test(s)
    ) {
      return "Raw / White";
    }

    if (
      /\bparboiled\b/.test(s)
    ) {
      return "Parboiled";
    }

    return "";
  }


  /* ================================================================
     9. GRADE / BROKEN % RECOGNITION
     ================================================================= */

  function detectBrokenPercent(name, item) {

    const explicit = firstNumber(item, [
      "brokenPercent",
      "broken",
      "brokenPct"
    ]);

    if (explicit !== null) {
      return explicit;
    }

    const match = txt(name).match(
      /(?:broken|bk|breakage)[\s:-]*(\d+(?:\.\d+)?)\s*%?/i
    );

    if (match) {
      return Number(match[1]);
    }

    return null;
  }


  /* ================================================================
     10. GRAIN LENGTH
     ================================================================= */

  function detectGrainLength(item, name) {

    const explicit = firstNumber(item, [
      "grainSizeMM",
      "grainLengthMM",
      "lengthMM",
      "grainLength"
    ]);

    if (explicit !== null) {
      return explicit;
    }

    const match = txt(name).match(
      /(\d+(?:\.\d+)?)\s*mm/i
    );

    return match ? Number(match[1]) : null;
  }


  /* ================================================================
     11. CROP YEAR
     ================================================================= */

  function detectCrop(item) {

    const candidates = [
      item.cropYear,
      item.crop,
      item.year,
      item.crop_year
    ];

    for (const value of candidates) {

      const s = txt(value);

      const match = s.match(/\b(20\d{2})\b/);

      if (match) {
        return match[1];
      }
    }

    return "";
  }


  /* ================================================================
     12. CURRENCY
     ================================================================= */

  function detectCurrency(item) {

    const explicit = upper(
      item.currency || item.priceCurrency
    );

    if (explicit === "AED" || explicit === "USD") {
      return explicit;
    }

    const price = upper(item.price);

    if (
      /\bUSD\b/.test(price) ||
      /\$/.test(price)
    ) {
      return "USD";
    }

    if (
      /\bAED\b/.test(price) ||
      /د\.?\s*إ/.test(price)
    ) {
      return "AED";
    }

    return null;
  }


  /* ================================================================
     13. AVAILABILITY
     ================================================================= */

  function detectAvailability(item) {

    const combined = lower(
      [
        item.availability,
        item.status,
        item.stockStatus,
        item.stock
      ]
        .filter(Boolean)
        .join(" ")
    );


    if (
      item.isBooking === true ||
      item.booking === true ||
      /booking|pre[\s-]?booking/.test(combined)
    ) {
      return AVAILABILITY.BOOKING;
    }


    if (
      /out[\s-]?of[\s-]?stock|sold[\s-]?out|unavailable/.test(
        combined
      )
    ) {
      return AVAILABILITY.OUT_OF_STOCK;
    }


    if (
      /available|in[\s-]?stock|ready/.test(combined)
    ) {
      return AVAILABILITY.IN_STOCK;
    }


    if (
      firstNumber(item, [
        "stockQuantityMT",
        "quantityMT",
        "availableMT",
        "stockBags",
        "bagCount",
        "quantityBags"
      ]) !== null
    ) {
      return AVAILABILITY.IN_STOCK;
    }


    if (
      /\bbags?\b|\bmt\b|\btonnes?\b/i.test(
        txt(item.stock)
      )
    ) {
      return AVAILABILITY.IN_STOCK;
    }


    return AVAILABILITY.UNKNOWN;
  }


  /* ================================================================
     14. PRICE UNIT
     ================================================================= */

  function detectPriceUnit(item, currency) {

    const explicit = upper(
      item.priceUnit || item.unit || item.price_unit
    );

    if (
      /MT|TON|TONNE/.test(explicit)
    ) {
      return "MT";
    }

    if (
      /KG/.test(explicit)
    ) {
      return "KG";
    }

    if (
      /BAG|PACKAGE|PACK/.test(explicit)
    ) {
      return "PACKAGE";
    }


    const priceText = upper(item.price);

    if (
      /\/?\s*(MT|TON|TONNE|TONNES)\b/.test(
        priceText
      )
    ) {
      return "MT";
    }

    if (
      /\/?\s*KG\b/.test(priceText)
    ) {
      return "KG";
    }


    /*
      IMPORTANT COMMERCIAL RULE:

      USD stock / booking prices on Grains Hub are commercial
      container/MT pricing.

      AED stock prices are generally package prices when the
      record contains a package size.
    */

    if (currency === "USD") {
      return "MT";
    }

    return "PACKAGE";
  }


  /* ================================================================
     15. PRICE BASIS
     ================================================================= */

  function detectBasis(item, currency, availability) {

    const explicit = upper(
      item.priceBasis ||
      item.basis ||
      item.tradeBasis ||
      item.incoterm ||
      ""
    );


    if (
      /CIF|CFR|C&F/.test(explicit)
    ) {
      return BASIS.CIF_DUBAI;
    }


    if (
      /FOB/.test(explicit)
    ) {
      return BASIS.FOB_ORIGIN;
    }


    if (
      /DUBAI.?STOCK|LOCAL|WAREHOUSE|STOCK/.test(
        explicit
      )
    ) {
      return BASIS.DUBAI_STOCK;
    }


    /*
      Grains Hub LIVE STOCK RULE

      USD stock records are already CIF-inclusive according
      to the current commercial stock convention.
    */

    if (
      currency === "USD" &&
      availability !== AVAILABILITY.OUT_OF_STOCK
    ) {
      return BASIS.CIF_DUBAI;
    }


    /*
      AED local inventory = Dubai stock.
    */

    if (
      currency === "AED"
    ) {
      return BASIS.DUBAI_STOCK;
    }


    return BASIS.UNKNOWN;
  }


  /* ================================================================
     16. SUPPLIER
     ================================================================= */

  function detectSupplier(item) {

    return txt(
      item.supplier ||
      item.supplierName ||
      item.vendor ||
      item.source ||
      ""
    );
  }


  /* ================================================================
     17. STOCK QUANTITY
     ================================================================= */

  function detectStockBags(item) {

    const explicit = firstNumber(item, [
      "stockBags",
      "bagCount",
      "quantityBags",
      "availableBags"
    ]);

    if (explicit !== null) {
      return explicit;
    }


    const match = txt(item.stock).match(
      /([\d,.]+)\s*bags?/i
    );

    return match
      ? number(match[1])
      : null;
  }


  function detectStockMT(item, bagKg) {

    const explicit = firstNumber(item, [
      "stockQuantityMT",
      "quantityMT",
      "availableMT",
      "stockMT"
    ]);

    if (explicit !== null) {
      return explicit;
    }


    const bags = detectStockBags(item);

    if (
      bags !== null &&
      bagKg !== null
    ) {
      return bags * bagKg / 1000;
    }


    const stockMT = txt(item.stock).match(
      /([\d,.]+)\s*(?:mt|tonnes?|tons?)/i
    );

    if (stockMT) {
      return number(stockMT[1]);
    }


    return null;
  }


  /* ================================================================
     18. PRODUCT IDENTITY
     ================================================================= */

  function buildProductIdentity(fields) {

    /*
      This identity intentionally excludes supplier and price.

      Two suppliers can quote the same physical commodity.
    */

    return [
      slug(fields.origin || "unknown"),
      slug(fields.variety || "unknown"),
      slug(fields.crop || "unknown"),
      slug(fields.processing || "unknown"),
      fields.brokenPercent !== null
        ? String(fields.brokenPercent)
        : "unknown",
      fields.grainLengthMM !== null
        ? String(fields.grainLengthMM)
        : "unknown",
      slug(fields.packaging || "unknown")
    ].join("|");
  }


  function buildQuoteIdentity(fields) {

    return [
      fields.productKey,
      slug(fields.supplier || "unknown"),
      slug(fields.basis || "unknown"),
      slug(fields.port || "unknown"),
      fields.currency || "unknown",
      fields.pricePerMT !== null
        ? String(fields.pricePerMT)
        : "unknown"
    ].join("|");
  }


  /* ================================================================
     19. PRICE NORMALIZATION
     ================================================================= */

  function normalizePrice(item, currency, priceUnit, packageKg) {

    const rawPrice = firstNumber(item, [
      "price",
      "currentPrice",
      "spotPrice"
    ]);


    if (rawPrice === null) {

      return {
        raw: null,
        perKg: null,
        perMT: null
      };
    }


    if (priceUnit === "MT") {

      return {
        raw: rawPrice,
        perKg: rawPrice / 1000,
        perMT: rawPrice
      };
    }


    if (priceUnit === "KG") {

      return {
        raw: rawPrice,
        perKg: rawPrice,
        perMT: rawPrice * 1000
      };
    }


    if (
      priceUnit === "PACKAGE" &&
      packageKg !== null
    ) {

      const perKg =
        rawPrice / packageKg;

      return {
        raw: rawPrice,
        perKg,
        perMT: perKg * 1000
      };
    }


    return {
      raw: rawPrice,
      perKg: null,
      perMT: null
    };
  }


  /* ================================================================
     20. PRICE STATUS
     ================================================================= */

  function detectPriceStatus(item, availability) {

    const explicit = upper(
      item.priceStatus ||
      item.statusType ||
      item.sourceStatus ||
      ""
    );


    if (
      explicit.includes("CONFIRMED")
    ) {
      return PRICE_STATUS.CONFIRMED;
    }


    if (
      explicit.includes("OBSERVED")
    ) {
      return PRICE_STATUS.OBSERVED;
    }


    if (
      explicit.includes("REFERENCE")
    ) {
      return PRICE_STATUS.REFERENCE;
    }


    if (
      firstNumber(item, [
        "price",
        "currentPrice",
        "spotPrice"
      ]) === null
    ) {
      return PRICE_STATUS.ON_REQUEST;
    }


    /*
      Live stock price is a commercial listing,
      so treat it as confirmed/available unless
      the source explicitly says otherwise.
    */

    if (
      availability === AVAILABILITY.IN_STOCK ||
      availability === AVAILABILITY.BOOKING
    ) {
      return PRICE_STATUS.CONFIRMED;
    }


    return PRICE_STATUS.OBSERVED;
  }


  /* ================================================================
     21. MAIN NORMALIZER
     ================================================================= */

  function normalize(item, index) {

    const origin =
      normalizeOrigin(
        item.origin ||
        item.country ||
        ""
      );


    const name =
      txt(
        item.name ||
        item.product ||
        item.title ||
        "Unnamed Product"
      );


    const variety =
      txt(
        item.variety ||
        item.varietyName ||
        detectVariety(name, origin)
      );


    const processing =
      txt(
        item.processing ||
        item.form ||
        item.process ||
        normalizeProcessing(
          item.processing ||
          item.form ||
          "",
          name
        )
      );


    const crop =
      detectCrop(item);


    const brokenPercent =
      detectBrokenPercent(
        name,
        item
      );


    const grainLengthMM =
      detectGrainLength(
        item,
        name
      );


    const packaging =
      txt(
        item.packaging ||
        item.pack ||
        item.package ||
        "Unknown"
      );


    const bagKg =
      packageKg(item);


    const currency =
      detectCurrency(item);


    const availability =
      detectAvailability(item);


    const priceUnit =
      detectPriceUnit(
        item,
        currency
      );


    const basis =
      detectBasis(
        item,
        currency,
        availability
      );


    const supplier =
      detectSupplier(item);


    const port =
      txt(
        item.port ||
        item.originPort ||
        item.loadingPort ||
        ""
      );


    const price =
      normalizePrice(
        item,
        currency,
        priceUnit,
        bagKg
      );


    const stockBags =
      detectStockBags(item);


    const stockMT =
      detectStockMT(
        item,
        bagKg
      );


    const priceStatus =
      detectPriceStatus(
        item,
        availability
      );


    const productKey =
      buildProductIdentity({
        origin,
        variety,
        crop,
        processing,
        brokenPercent,
        grainLengthMM,
        packaging
      });


    const product = {

      /* ------------------------------------------------------------
         PRIMARY IDENTITY
         ------------------------------------------------------------ */

      id:
        txt(item.id || item.sku) ||
        `grain-${index}`,

      name,

      origin,

      variety,

      crop,

      processing,

      brokenPercent,

      grainLengthMM,

      grade:
        txt(item.grade),

      packaging,

      packageKg:
        bagKg,

      productKey,


      /* ------------------------------------------------------------
         SUPPLIER
         ------------------------------------------------------------ */

      supplier,

      supplierTier:
        txt(
          item.supplierTier ||
          item.tier ||
          item.badge
        ),


      /* ------------------------------------------------------------
         AVAILABILITY
         ------------------------------------------------------------ */

      availability,

      rawStock:
        item.stock ?? null,

      stockBags,

      stockMT,


      /* ------------------------------------------------------------
         PRICE
         ------------------------------------------------------------ */

      currency,

      priceUnit,

      priceBasis:
        basis,

      price:
        price.raw,

      pricePerKg:
        price.perKg,

      pricePerMT:
        price.perMT,

      priceStatus,


      /* ------------------------------------------------------------
         EXPLICIT COMMERCIAL REFERENCES
         ------------------------------------------------------------ */

      fobUSDPerMT:
        firstNumber(item, [
          "fobUSDPerMT",
          "fobPriceUSDPerMT",
          "fob",
          "fobPrice"
        ]),

      freightUSDPerMT:
        firstNumber(item, [
          "freightUSDPerMT",
          "freightPerMT",
          "oceanFreightUSDPerMT"
        ]),

      cifDubaiUSDPerMT:
        firstNumber(item, [
          "cifDubaiUSDPerMT",
          "cifUSDPerMT",
          "cifPrice"
        ]),

      customNonwovenPremiumUSDPerMT:
        firstNumber(item, [
          "customNonwovenPremiumUSDPerMT",
          "customPackingPremiumUSDPerMT",
          "packingPremiumUSDPerMT"
        ]),


      /* ------------------------------------------------------------
         TREND / DATE
         ------------------------------------------------------------ */

      trend:
        firstNumber(item, [
          "trendChange",
          "trendPercent",
          "dailyChangePercent"
        ]),

      updatedAt:
        item.updatedAt ||
        item.lastUpdated ||
        item.timestamp ||
        null,


      /* ------------------------------------------------------------
         MEDIA / SEARCH
         ------------------------------------------------------------ */

      image:
        txt(
          item.img ||
          item.image ||
          item.imageUrl
        ),

      keywords:
        Array.isArray(item.keywords)
          ? item.keywords
          : [],


      /* ------------------------------------------------------------
         COMMERCIAL FLAGS
         ------------------------------------------------------------ */

      isCIFStockPrice:
        basis === BASIS.CIF_DUBAI &&
        currency === "USD",

      isDubaiStockPrice:
        basis === BASIS.DUBAI_STOCK,

      hasExactVariety:
        Boolean(variety),

      hasOrigin:
        Boolean(origin),

      hasCrop:
        Boolean(crop),

      identityComplete:
        Boolean(
          origin &&
          variety &&
          processing
        ),


      /* ------------------------------------------------------------
         RAW SOURCE
         ------------------------------------------------------------ */

      raw:
        item
    };


    product.quoteKey =
      buildQuoteIdentity(product);


    return product;
  }


  /* ================================================================
     22. LOAD STOCK.JSON
     ================================================================= */

  async function load(force = false) {

    if (
      !force &&
      state.loadedAt &&
      Date.now() - state.loadedAt <
        CONFIG.CACHE_TTL_MS
    ) {
      return state.products.slice();
    }


    const response =
      await fetch(
        CONFIG.STOCK_URL +
        "?_=" +
        Date.now(),
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "stock.json HTTP " +
        response.status
      );
    }


    const json =
      await response.json();


    let raw = [];


    if (Array.isArray(json)) {

      raw = json;

    } else if (
      Array.isArray(json.products)
    ) {

      raw = json.products;

    } else if (
      Array.isArray(json.items)
    ) {

      raw = json.items;

    } else {

      throw new Error(
        "Unsupported stock.json structure"
      );
    }


    state.products =
      raw.map(normalize);


    state.loadedAt =
      Date.now();


    state.source =
      CONFIG.STOCK_URL;


    console.info(
      `🌾 Grains Hub Data Engine v${VERSION}: ` +
      `${state.products.length} records normalized`
    );


    return state.products.slice();
  }


  /* ================================================================
     23. PRODUCT SEARCH
     ================================================================= */

  function searchProducts(query) {

    const q =
      lower(query)
        .replace(/[^\w\s%/-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();


    if (!q) {
      return state.products.slice();
    }


    const tokens =
      q.split(" ").filter(Boolean);


    return state.products
      .map(product => {

        const haystack =
          lower([
            product.name,
            product.origin,
            product.variety,
            product.processing,
            product.crop,
            product.grade,
            product.packaging,
            product.supplier,
            ...(product.keywords || [])
          ].join(" "));


        let score = 0;


        for (const token of tokens) {

          if (haystack.includes(token)) {

            score += 1;

            /*
              Stronger score for exact identity dimensions.
            */

            if (
              lower(product.variety)
                .includes(token)
            ) {
              score += 3;
            }

            if (
              lower(product.origin)
                .includes(token)
            ) {
              score += 2;
            }

            if (
              lower(product.processing)
                .includes(token)
            ) {
              score += 2;
            }
          }
        }


        return {
          product,
          score
        };
      })
      .filter(x => x.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .map(x => x.product);
  }


  /* ================================================================
     24. EXACT PRODUCT MATCH
     ================================================================= */

  function findExactProduct(criteria = {}) {

    return state.products.filter(
      product => {

        if (
          criteria.origin &&
          lower(product.origin) !==
            lower(criteria.origin)
        ) {
          return false;
        }


        if (
          criteria.variety &&
          lower(product.variety) !==
            lower(criteria.variety)
        ) {
          return false;
        }


        if (
          criteria.crop &&
          String(product.crop) !==
            String(criteria.crop)
        ) {
          return false;
        }


        if (
          criteria.processing &&
          lower(product.processing) !==
            lower(criteria.processing)
        ) {
          return false;
        }


        if (
          criteria.productKey &&
          product.productKey !==
            criteria.productKey
        ) {
          return false;
        }


        return true;
      }
    );
  }


  /* ================================================================
     25. FOB / CIF CALCULATIONS
     ================================================================= */

  function deriveFOBFromCIF(product) {

    if (!product) {
      return null;
    }


    /*
      First preference:
      explicit FOB stored in source.
    */

    if (
      product.fobUSDPerMT !== null &&
      product.fobUSDPerMT !== undefined
    ) {
      return product.fobUSDPerMT;
    }


    /*
      If current stock is CIF and the current stock convention
      contains +250 over FOB, derive the reference FOB.
    */

    if (
      product.currency === "USD" &&
      product.priceBasis === BASIS.CIF_DUBAI &&
      product.pricePerMT !== null
    ) {

      return (
        product.pricePerMT -
        CONFIG.STOCK_CIF_ADDON_USD_PER_MT
      );
    }


    return null;
  }


  function deriveCIFFromFOB(product, freightUSDPerMT) {

    if (!product) {
      return null;
    }


    const fob =
      product.fobUSDPerMT;


    if (
      fob === null ||
      fob === undefined
    ) {
      return null;
    }


    if (
      freightUSDPerMT === null ||
      freightUSDPerMT === undefined
    ) {
      return null;
    }


    return (
      fob +
      freightUSDPerMT
    );
  }


  function getCommercialPrice(product) {

    if (!product) {
      return null;
    }


    /*
      EXISTING CIF STOCK PRICE

      Do NOT add freight again.
    */

    if (
      product.priceBasis ===
        BASIS.CIF_DUBAI &&
      product.pricePerMT !== null
    ) {

      return {
        value:
          product.pricePerMT,

        currency:
          product.currency,

        basis:
          BASIS.CIF_DUBAI,

        status:
          product.priceStatus,

        source:
          "stock.json"
      };
    }


    /*
      Existing Dubai stock price.
    */

    if (
      product.priceBasis ===
        BASIS.DUBAI_STOCK &&
      product.price !== null
    ) {

      return {
        value:
          product.price,

        currency:
          product.currency,

        basis:
          BASIS.DUBAI_STOCK,

        status:
          product.priceStatus,

        source:
          "stock.json"
      };
    }


    /*
      Explicit FOB.
    */

    if (
      product.fobUSDPerMT !== null
    ) {

      return {
        value:
          product.fobUSDPerMT,

        currency:
          "USD",

        basis:
          BASIS.FOB_ORIGIN,

        status:
          product.priceStatus,

        source:
          "stock.json"
      };
    }


    return null;
  }


  /* ================================================================
     26. PRICE DISPLAY
     ================================================================= */

  function formatNumber(value, decimals = 2) {

    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "—";
    }


    return Number(value)
      .toLocaleString(
        undefined,
        {
          minimumFractionDigits:
            decimals,
          maximumFractionDigits:
            decimals
        }
      );
  }


  function formatPrice(product) {

    if (!product) {
      return "Price on request";
    }


    if (
      product.price === null ||
      product.price === undefined
    ) {
      return "Price on request";
    }


    if (
      product.priceUnit === "MT"
    ) {

      return (
        `${product.currency || ""} ` +
        `${formatNumber(product.price)}` +
        ` / MT`
      ).trim();
    }


    if (
      product.priceUnit === "KG"
    ) {

      return (
        `${product.currency || ""} ` +
        `${formatNumber(product.price, 4)}` +
        ` / kg`
      ).trim();
    }


    if (
      product.priceUnit === "PACKAGE" &&
      product.packageKg
    ) {

      return (
        `${product.currency || ""} ` +
        `${formatNumber(product.price)}` +
        ` / ${formatNumber(product.packageKg, 0)}kg`
      ).trim();
    }


    return (
      `${product.currency || ""} ` +
      `${formatNumber(product.price)}`
    ).trim();
  }


  function formatMTPrice(product) {

    if (
      !product ||
      product.pricePerMT === null
    ) {
      return "Price on request";
    }


    return (
      `${product.currency || ""} ` +
      `${formatNumber(product.pricePerMT)}` +
      ` / MT`
    ).trim();
  }


  /* ================================================================
     27. PACKING HELPERS
     ================================================================= */

  function detectPackingType(product) {

    if (!product) {
      return PACKING.UNKNOWN;
    }


    const s =
      lower(product.packaging);


    if (
      /nonwoven|non[\s-]?woven/.test(s)
    ) {
      return PACKING.CUSTOM_NONWOVEN;
    }


    if (
      /\bpp\b|polypropylene/.test(s)
    ) {
      return PACKING.STANDARD_PP;
    }


    return PACKING.UNKNOWN;
  }


  function customPackingPrice(product) {

    if (!product) {
      return null;
    }


    const fob =
      product.fobUSDPerMT ??
      deriveFOBFromCIF(product);


    const premium =
      product.customNonwovenPremiumUSDPerMT;


    if (
      fob === null ||
      premium === null
    ) {
      return null;
    }


    return fob + premium;
  }


  /* ================================================================
     28. STOCK / BOOKING FILTERS
     ================================================================= */

  function inStock() {

    return state.products.filter(
      p =>
        p.availability ===
        AVAILABILITY.IN_STOCK
    );
  }


  function booking() {

    return state.products.filter(
      p =>
        p.availability ===
        AVAILABILITY.BOOKING
    );
  }


  function available() {

    return state.products.filter(
      p =>
        p.availability !==
        AVAILABILITY.OUT_OF_STOCK
    );
  }


  /* ================================================================
     29. IDENTITY DIAGNOSTICS
     ================================================================= */

  function identityWarnings(product) {

    const warnings = [];


    if (!product.origin) {
      warnings.push(
        "Origin not identified"
      );
    }


    if (!product.variety) {
      warnings.push(
        "Variety not identified"
      );
    }


    if (!product.processing) {
      warnings.push(
        "Processing/form not identified"
      );
    }


    if (
      product.price !== null &&
      !product.priceBasis
    ) {
      warnings.push(
        "Price basis not identified"
      );
    }


    if (
      product.currency === "USD" &&
      product.price !== null &&
      product.priceBasis !==
        BASIS.CIF_DUBAI &&
      product.priceBasis !==
        BASIS.FOB_ORIGIN
    ) {
      warnings.push(
        "USD price basis requires verification"
      );
    }


    return warnings;
  }


  function isIdentitySafe(product) {

    if (!product) {
      return false;
    }


    return Boolean(
      product.origin &&
      product.variety &&
      product.processing
    );
  }


  /* ================================================================
     30. DATASET SUMMARY
     ================================================================= */

  function summary() {

    const products =
      state.products;


    return {

      version: VERSION,

      total:
        products.length,

      india:
        products.filter(
          p => p.origin === "India"
        ).length,

      pakistan:
        products.filter(
          p => p.origin === "Pakistan"
        ).length,

      thailand:
        products.filter(
          p => p.origin === "Thailand"
        ).length,

      vietnam:
        products.filter(
          p => p.origin === "Vietnam"
        ).length,

      inStock:
        products.filter(
          p =>
            p.availability ===
            AVAILABILITY.IN_STOCK
        ).length,

      booking:
        products.filter(
          p =>
            p.availability ===
            AVAILABILITY.BOOKING
        ).length,

      cif:
        products.filter(
          p =>
            p.priceBasis ===
            BASIS.CIF_DUBAI
        ).length,

      dubaiStock:
        products.filter(
          p =>
            p.priceBasis ===
            BASIS.DUBAI_STOCK
        ).length,

      identityComplete:
        products.filter(
          isIdentitySafe
        ).length,

      identityIncomplete:
        products.filter(
          p => !isIdentitySafe(p)
        ).length
    };
  }


  /* ================================================================
     31. PRICE INTEGRITY TESTS
     ================================================================= */

  function runIntegrityTests() {

    const results = [];


    function test(
      label,
      criteria,
      expectedPrice,
      expectedBasis
    ) {

      const matches =
        findExactProduct(criteria);


      if (!matches.length) {

        results.push({
          label,
          pass: false,
          reason:
            "Product not found"
        });

        return;
      }


      const product =
        matches[0];


      const price =
        product.pricePerMT;


      const pricePass =
        expectedPrice === null ||
        price === expectedPrice;


      const basisPass =
        !expectedBasis ||
        product.priceBasis ===
          expectedBasis;


      results.push({
        label,
        pass:
          pricePass &&
          basisPass,

        productKey:
          product.productKey,

        price,

        basis:
          product.priceBasis
      });
    }


    /*
      These tests protect the exact collision that caused
      the PR106 / 1121 problem.
    */

    test(
      "India PR106 Golden Sella",
      {
        origin: "India",
        variety: "PR106",
        processing:
          "Golden Sella"
      },
      null,
      BASIS.FOB_ORIGIN
    );


    test(
      "India PR47 Golden Sella",
      {
        origin: "India",
        variety: "PR47",
        processing:
          "Golden Sella"
      },
      null,
      BASIS.FOB_ORIGIN
    );


    test(
      "India 1121 Golden Sella",
      {
        origin: "India",
        variety: "1121",
        processing:
          "Golden Sella"
      },
      null,
      BASIS.FOB_ORIGIN
    );


    test(
      "Pakistan 1121",
      {
        origin: "Pakistan",
        variety: "1121"
      },
      null,
      null
    );


    test(
      "Pakistan 1509",
      {
        origin: "Pakistan",
        variety: "1509"
      },
      null,
      null
    );


    return results;
  }


  /* ================================================================
     32. PUBLIC API
     ================================================================= */

  window.GrainsHubData = {

    version: VERSION,

    CONFIG,

    BASIS,

    PACKING,

    AVAILABILITY,

    PRICE_STATUS,


    load,

    normalize,


    all: function () {
      return state.products.slice();
    },


    inStock,

    booking,

    available,


    searchProducts,

    findExactProduct,


    customPackingPrice,

    deriveFOBFromCIF,

    deriveCIFFromFOB,

    getCommercialPrice,


    formatPrice,

    formatMTPrice,

    detectPackingType,


    identityWarnings,

    isIdentitySafe,


    summary,

    runIntegrityTests,


    get state() {

      return {
        loadedAt:
          state.loadedAt,

        source:
          state.source,

        products:
          state.products.slice()
      };
    }
  };


  /* ================================================================
     33. READY EVENT
     ================================================================= */

  window.dispatchEvent(
    new CustomEvent(
      "grainsHubDataReady",
      {
        detail: {
          version: VERSION
        }
      }
    )
  );


  console.info(
    `🌾 Grains Hub Commodity Intelligence Engine v${VERSION} loaded`
  );

})(window);
