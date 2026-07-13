(function injectAlliyaCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/alliya.css';
  document.head.appendChild(link);
})();

/* -----------------------------------------
   Alliya v6 Modal Auto-Injector
----------------------------------------- */

(function injectAlliyaModal() {
  const modalHTML = `
    <div id="alliyaModal" class="modal">
      <div class="modal-content">
        <span class="close" onclick="closeModal()">&times;</span>

        <div class="alliya-box">
          <h2>
            <img src="/assets/img/alliya-icon.ico" width="26">
            Ask Alliya
          </h2>

          <div style="position:relative;">
            <input type="text" id="alliyaQuery"
              placeholder="Ask about products, suppliers, FCL, docs..."
              oninput="showSuggestions()"
              autocomplete="off">
            <div id="alliyaSuggestions" class="suggestions"></div>
          </div>

          <button onclick="askAlliya()">Send Question</button>

          <div id="alliyaResponse" class="reply"></div>
        </div>
      </div>
    </div>

    <div id="alliyaFloatBtn" class="alliya-float" onclick="openModal()">
      <img src="/assets/img/alliya-icon.ico" width="26">
      Ask Alliya
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
})();

/* -----------------------------------------
   ALLIYA v6.0 – Frontend Engine (Premium)
   - Uses stock.json + suppliers.json + alliya-knowledge.json
   - Premium Ghutra-grade response builder
   - No backend dependency
----------------------------------------- */

const STOCK_URL = '/assets/data/stock.json';
const SUPPLIERS_URL = window.location.origin + '/assets/data/suppliers.json';
const KNOWLEDGE_URL = window.location.origin + '/assets/data/alliya-knowledge.json';

let alliyaStockCache = null;
let alliyaSuppliersCache = null;
let alliyaKnowledgeCache = null;

/* -----------------------------------------
   Loaders
----------------------------------------- */

async function loadStock() {
  if (!alliyaStockCache) {
    const res = await fetch(STOCK_URL, { cache: 'no-cache' });
    alliyaStockCache = await res.json();
  }
  return alliyaStockCache;
}

async function loadSuppliers() {
  if (!alliyaSuppliersCache) {
    const res = await fetch(SUPPLIERS_URL, { cache: 'no-cache' });
    alliyaSuppliersCache = await res.json();
  }
  return alliyaSuppliersCache;
}

async function loadKnowledge() {
  if (!alliyaKnowledgeCache) {
    const res = await fetch(KNOWLEDGE_URL, { cache: 'no-cache' });
    alliyaKnowledgeCache = await res.json();
  }
  return alliyaKnowledgeCache;
}

/* -----------------------------------------
   Helpers
----------------------------------------- */

function normalize(str) {
  return (str || '').toLowerCase();
}

function findStockMatches(stock, queryTerms) {
  return stock.filter(item => {
    const name = normalize(item.name);
    const origin = normalize(item.origin);
    const packaging = normalize(item.packaging);

    return queryTerms.some(term =>
      name.includes(term) ||
      origin.includes(term) ||
      packaging.includes(term)
    );
  });
}

function findSupplierForProduct(suppliers, productName) {
  const q = normalize(productName);
  return suppliers.find(s => {
    const products = Array.isArray(s.products) ? s.products : [];
    return products.some(p => normalize(p).includes(q));
  }) || null;
}

/* -----------------------------------------
   Suggestion Engine
----------------------------------------- */

function buildSuggestionItem(text) {
  return `
    <div class="alliya-suggestion-item"
         onclick="applySuggestion('${text.replace(/'/g, "\\'")}')">
      ${text}
    </div>
  `;
}

/* -----------------------------------------
   Suggestion Apply Handler
----------------------------------------- */
window.applySuggestion = function (text) {
  const input = document.getElementById('alliyaQuery');
  const box = document.getElementById('alliyaSuggestions');

  if (input) input.value = text;
  if (box) box.innerHTML = '';
};

/* -----------------------------------------
   Suggestion Engine Main
----------------------------------------- */
window.showSuggestions = async function () {
  const input = document.getElementById('alliyaQuery');
  const box = document.getElementById('alliyaSuggestions');

  if (!input || !box) return;

  const query = (input.value || '').toLowerCase().trim();

  if (!query || query.length < 2) {
    box.innerHTML = '';
    return;
  }

  try {
    const [stock, suppliers, knowledge] = await Promise.all([
      loadStock(),
      loadSuppliers(),
      loadKnowledge()
    ]);

    const suggestions = new Set();

    /* Stock products */
    stock.forEach(item => {
      if (item.name.toLowerCase().includes(query)) {
        suggestions.add(item.name);
      }
    });

    /* Supplier names */
    suppliers.forEach(s => {
      if (s.name.toLowerCase().includes(query)) {
        suggestions.add(`show ${s.name.toLowerCase()} profile`);
      }
    });

    /* Knowledge questions */
    knowledge.forEach(k => {
      if (k.question.toLowerCase().includes(query)) {
        suggestions.add(k.question);
      }
    });

    /* Smart intents */
    const intents = [
      "fcl",
      "stock",
      "supplier",
      "market",
      "pulse",
      "docs",
      "documentation",
      "compliance",
      "grains",
      "dubai",
      "alras",
      "al ras",
      "ghutra",
      "rice",
      "shahid",
      "grains hub",
      "fcl booking",
      "book fcl",
      "open fcl page",
      "open stock page",
      "open supplier directory",
      "open market pulse",
      "download buyer pack",
      "download supplier onboarding pack",
      "download fcl guide",
      "download compliance guide",
      "download market analysis report",
      "open documentation page"
    ];

    intents.forEach(i => {
      if (i.includes(query)) {
        suggestions.add(i);
      }
    });

    /* Greeting & Small‑Talk Suggestions */
    const greetingIntents = [
      "hi",
      "hello",
      "hey",
      "how are you",
      "who are you",
      "who is alliya",
      "what is alliya",
      "tell me about alliya",
      "alliya assistant",
      "alliya info",
      "thank you",
      "thanks"
    ];

    greetingIntents.forEach(g => {
      if (g.includes(query)) {
        suggestions.add(g);
      }
    });

    /* Founder & Location Suggestions */
    const identityIntents = [
      "shahid",
      "founder",
      "ghutra",
      "ghutra tech",
      "ghutra goods",
      "grains hub",
      "grains",
      "dubai",
      "al ras",
      "alras",
      "deira"
    ];

    identityIntents.forEach(i => {
      if (i.includes(query)) {
        suggestions.add(i);
      }
    });

    const list = Array.from(suggestions).slice(0, 8);

    if (list.length === 0) {
      box.innerHTML = '';
      return;
    }

    box.innerHTML = list.map(buildSuggestionItem).join('');

  } catch (err) {
    console.warn('Alliya suggestions error:', err);
    if (box) box.innerHTML = '';
  }
};

/* -----------------------------------------
   ALLIYA v6.0 – Premium Response Builder
----------------------------------------- */

function buildAlliyaResponse(title, summary, sections) {
  return `
    <div class="alliya-block">
      <h2><strong>${title}</strong></h2>

      <h3>Executive Summary</h3>
      <p>${summary}</p>

      ${sections.map(section => `
        <h3>${section.heading}</h3>
        <p>${section.body}</p>
      `).join('')}
    </div>

    <hr>

    <div class="alliya-cta">
      <p><strong>📦 Browse Stock</strong><br>
        <a href="https://grains.ae/shop" target="_blank">Open stock page</a>
      </p>

      <p><strong>🚢 Book FCL Shipment</strong><br>
        <a href="https://grains.ae/fcl/" target="_blank">Book full container</a>
      </p>

      <p><strong>📊 Market Pulse</strong><br>
        <a href="https://grains.ae/pulse/index.html" target="_blank">Open live Market Pulse</a>
      </p>

      <p><strong>🤖 Alliya Assistant</strong><br>
        <a href="https://grains.ae/blog/alliya-dubais-first-ai-grain-assistant.html" target="_blank">Learn more</a>
      </p>
    </div>

    <hr>

    <p><em>All trade is executed through Ghutra Goods Wholesaler LLC under UAE wholesale regulations.</em></p>
  `;
}

/* -----------------------------------------
   ALLIYA v6.0 – Personality Engine
----------------------------------------- */

window.alliyaPersonality = function (query) {
  const q = query.toLowerCase();

  // Greeting responses
  if (["hi", "hello", "hey"].includes(q)) {
    return {
      title: "Hello!",
      summary: "I’m Alliya, your grain trade assistant.",
      details: "How can I help you today?"
    };
  }

  // Identity responses
  if (q.includes("who are you") || q.includes("who is alliya")) {
    return {
      title: "About Alliya",
      summary: "I’m Alliya — Dubai’s first AI grain assistant.",
      details: "I help you check stock, suppliers, FCL booking, compliance, and documentation."
    };
  }

  if (q.includes("what is alliya")) {
    return {
      title: "Alliya – AI Assistant",
      summary: "Alliya is the official AI assistant of Grains Hub.",
      details: "I provide instant answers about products, suppliers, FCL shipments, compliance, and market intelligence."
    };
  }

  // Small talk
  if (q.includes("how are you")) {
    return {
      title: "I’m doing great!",
      summary: "Ready to help you with anything related to grain trade.",
      details: "Ask me about stock, suppliers, FCL booking, compliance, or documentation."
    };
  }

  if (q.includes("thank")) {
    return {
      title: "You’re welcome!",
      summary: "Happy to help anytime.",
      details: "Let me know if you want to check stock, suppliers, or book FCL."
    };
  }

  // Founder identity
  if (q.includes("shahid")) {
    return {
      title: "About Shahid Bashir",
      summary: "Founder of Grains Hub, GhutraTech, and Ghutra Goods Wholesaler LLC.",
      details: "He architects and manages every technical and operational layer of grains.ae."
    };
  }

  // Location identity
  if (q.includes("dubai") || q.includes("al ras") || q.includes("alras")) {
    return {
      title: "Dubai & Al Ras",
      summary: "Grains Hub operates from Al Ras, Deira — Dubai’s historic grain trading district.",
      details: "This location gives direct access to suppliers, buyers, and logistics networks."
    };
  }

  return null;
};

/* -----------------------------------------
   ALLIYA v6.0 – Error Recovery Engine
----------------------------------------- */

window.alliyaRecover = function (type, detail = "") {
  switch (type) {

    case "empty":
      return {
        title: "I’m here to help",
        summary: "Please type something so I can assist you.",
        details: "Try asking about products, suppliers, FCL booking, compliance, or documentation."
      };

    case "network":
      return {
        title: "Connection Issue",
        summary: "I couldn’t load live stock or supplier data.",
        details: `
          This may be due to a temporary network issue.<br><br>
          - Try again in a moment<br>
          - Or browse stock directly: <a href="https://grains.ae/shop" target="_blank">Open Stock Page</a><br>
          - Or submit FCL: <a href="https://grains.ae/fcl/" target="_blank">Book FCL Shipment</a>
        `
      };

    case "json":
      return {
        title: "Data Loading Issue",
        summary: "Some datasets could not be loaded (stock, suppliers, or knowledge).",
        details: `
          This usually happens if:<br>
          - JSON file has a missing comma<br>
          - JSON file has a broken bracket<br>
          - JSON file is not valid<br><br>
          Please verify your JSON files in /assets/data/.
        `
      };

    case "unknown":
      return {
        title: "I’m here to help",
        summary: `I couldn’t find a direct match for "${detail}".`,
        details: `
          Try asking about:<br>
          - Products<br>
          - Suppliers<br>
          - FCL booking<br>
          - Documentation<br>
          - Compliance<br>
          - Market prices<br><br>
          You can also browse stock directly:<br>
          <a href="https://grains.ae/shop" target="_blank">Open Stock Page</a>
        `
      };

    default:
      return {
        title: "Something went wrong",
        summary: "I couldn’t process your request.",
        details: `
          Please try again.<br><br>
          If the issue continues, browse stock:<br>
          <a href="https://grains.ae/shop" target="_blank">Open Stock Page</a>
        `
      };
  }
};

/* -----------------------------------------
   ALLIYA v6.0 – Main Engine
----------------------------------------- */

window.askAlliya = async function () {
  const replyBox = document.getElementById('alliyaResponse');
  const userQuery = document.getElementById('alliyaQuery').value.trim().toLowerCase();

  if (!userQuery) {
    const err = alliyaRecover("empty");
    replyBox.style.display = 'block';
    replyBox.innerHTML = buildAlliyaResponse(
      err.title,
      err.summary,
      [{ heading: "Details", body: err.details }]
    );
    return;
  }

  replyBox.style.display = 'block';
  replyBox.innerHTML = 'Alliya is checking live stock…';

  const terms = userQuery.split(' ')
    .map(w => w.trim().toLowerCase())
    .filter(Boolean);

  try {
    const [stock, suppliers, knowledge] = await Promise.all([
      loadStock(),
      loadSuppliers(),
      loadKnowledge()
    ]);

    /* -----------------------------------------
       PRIORITY OVERRIDE
    ----------------------------------------- */
    const priorityKeywords = [
      "hi",
      "hello",
      "hey",
      "alliya",
      "what is alliya",
      "who is alliya",
      "tell me about alliya",
      "how alliya works",
      "who are you",
      "alliya assistant",
      "alliya info"
    ];

    if (priorityKeywords.some(k => userQuery.includes(k))) {
      const kbMatch = knowledge.find(item =>
        userQuery.includes(item.question.toLowerCase())
      );

      if (kbMatch) {
        replyBox.innerHTML = buildAlliyaResponse(
          "Your Answer",
          kbMatch.answer,
          [
            {
              heading: "Details",
              body: kbMatch.answer
            }
          ]
        );
        return;
      }
    }

    /* Personality Engine Check */
    const personality = alliyaPersonality(userQuery);
    if (personality) {
      replyBox.innerHTML = buildAlliyaResponse(
        personality.title,
        personality.summary,
        [
          {
            heading: "Details",
            body: personality.details
          }
        ]
      );
      return;
    }

    /* -----------------------------------------
       1. Stock Match
    ----------------------------------------- */
    const matches = findStockMatches(stock, terms);

    if (matches.length > 0) {
      const primary = matches[0];
      const supplier = findSupplierForProduct(suppliers, primary.name);

      const isBooking = primary.price.toUpperCase().includes('USD');
      const priceRaw = parseFloat(primary.price);
      const sizeKG = parseInt(primary.size);
      const pricePerKg = (!isNaN(priceRaw) && !isNaN(sizeKG))
        ? (priceRaw / sizeKG).toFixed(2)
        : null;

      const originFlag =
        primary.origin.toLowerCase().includes('india') ? '🇮🇳' :
        primary.origin.toLowerCase().includes('pakistan') ? '🇵🇰' :
        primary.origin.toLowerCase().includes('thailand') ? '🇹🇭' : '🌍';

      replyBox.innerHTML = buildAlliyaResponse(
        `${originFlag} ${primary.name}`,
        `${primary.name} is available in live stock. Below is a complete breakdown including origin, packaging, pricing, supplier, and booking options.`,
        [
          {
            heading: "Product Overview",
            body: `
              <strong>Origin:</strong> ${primary.origin}<br>
              <strong>Packaging:</strong> ${primary.packaging}<br>
              <strong>Stock:</strong> ${primary.stock || 'Prompt shipment'}
            `
          },
          {
            heading: "Pricing",
            body: isBooking
              ? `${primary.price} (Booking / FOB or C&F)`
              : `${primary.price} / ${primary.size}${pricePerKg ? ` → ${pricePerKg} AED/kg` : ''}`
          },
          {
            heading: "Supplier",
            body: supplier
              ? `${supplier.name} (${supplier.badge}) – ${supplier.city}, ${supplier.country}`
              : `${primary.badge || 'Verified Supplier'}`
          }
        ]
      );
      return;
    }

    /* -----------------------------------------
       2. Supplier Match
    ----------------------------------------- */
    const supplierMatch = suppliers.find(s =>
      normalize(s.name).includes(normalize(userQuery))
    );

    if (supplierMatch) {
      replyBox.innerHTML = buildAlliyaResponse(
        `🏅 Verified Supplier: ${supplierMatch.name}`,
        `${supplierMatch.name} is a verified supplier listed on Grains Hub.`,
        [
          {
            heading: "Supplier Details",
            body: `
              <strong>Location:</strong> ${supplierMatch.city}, ${supplierMatch.country}<br>
              <strong>Badge:</strong> ${supplierMatch.badge}<br>
              <strong>Products:</strong> ${supplierMatch.products.join(', ')}
            `
          }
        ]
      );
      return;
    }

    /* -----------------------------------------
       3. Knowledge Base Match
    ----------------------------------------- */
    const kbMatch = knowledge.find(item => {
      const q = item.question.toLowerCase();
      return userQuery === q || userQuery.includes(q) || q.includes(userQuery);
    });

    if (kbMatch) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Your Answer",
        kbMatch.answer,
        [
          {
            heading: "Details",
            body: kbMatch.answer
          }
        ]
      );
      return;
    }

    /* -----------------------------------------
       4. Intent Router (Instant Actions)
    ----------------------------------------- */

    const intent = userQuery.toLowerCase();

    // Supplier Directory
    if (intent.includes("supplier directory") || intent.includes("suppliers")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Supplier Directory",
        "Browse all verified suppliers listed on Grains Hub.",
        [
          {
            heading: "Open Directory",
            body: `<a href="https://grains.ae/suppliers/" target="_blank">View Suppliers</a>`
          }
        ]
      );
      return;
    }

    // Market Pulse
    if (intent.includes("market pulse") || intent.includes("pulse") || intent.includes("market")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Market Pulse",
        "Live grain pricing updated every 60 seconds.",
        [
          {
            heading: "Open Market Pulse",
            body: `<a href="https://grains.ae/pulse/index.html" target="_blank">Open Market Pulse</a>`
          }
        ]
      );
      return;
    }

    // FCL Booking
    if (intent.includes("fcl") || intent.includes("book fcl") || intent.includes("fcl booking")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "FCL Booking",
        "Submit your full container load requirement instantly.",
        [
          {
            heading: "Book Shipment",
            body: `<a href="https://grains.ae/fcl/" target="_blank">Book FCL Shipment</a>`
          }
        ]
      );
      return;
    }

    // Compliance
    if (intent.includes("compliance") || intent.includes("verification")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Compliance & Verification",
        "Download the official compliance and verification guide.",
        [
          {
            heading: "Download Guide",
            body: `<a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a>`
          }
        ]
      );
      return;
    }

    // Stock Page
    if (intent.includes("stock") || intent.includes("open stock page")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Live Stock",
        "Browse all available AED stock and USD booking options.",
        [
          {
            heading: "Open Stock",
            body: `<a href="https://grains.ae/shop" target="_blank">Open Stock Page</a>`
          }
        ]
      );
      return;
    }

    // Documentation Hub
    if (intent.includes("documentation") || intent.includes("docs") || intent.includes("documents")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Documentation Hub",
        "All official Grains Hub documents are available below.",
        [
          {
            heading: "Downloads",
            body: `
              <a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank">Buyer Pack</a><br>
              <a href="https://grains.ae/docs/supplier-onboarding-pack.pdf" target="_blank">Supplier Onboarding Pack</a><br>
              <a href="https://grains.ae/docs/fcl-guide.pdf" target="_blank">FCL Guide</a><br>
              <a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a><br>
              <a href="https://grains.ae/docs/market-analysis-2025.pdf" target="_blank">Market Analysis 2025</a>
            `
          }
        ]
      );
      return;
    }

    // Download Packs
    if (intent.includes("buyer pack")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Buyer Pack",
        "Download the official Buyer Pack.",
        [
          {
            heading: "Download",
            body: `<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank">Buyer Pack</a>`
          }
        ]
      );
      return;
    }

    if (intent.includes("supplier onboarding pack") || intent.includes("supplier pack")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Supplier Onboarding Pack",
        "Download the Supplier Onboarding Pack.",
        [
          {
            heading: "Download",
            body: `<a href="https://grains.ae/docs/supplier-onboarding-pack.pdf" target="_blank">Supplier Onboarding Pack</a>`
          }
        ]
      );
      return;
    }

    if (intent.includes("fcl guide")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "FCL Guide",
        "Download the official FCL Booking Guide.",
        [
          {
            heading: "Download",
            body: `<a href="https://grains.ae/docs/fcl-guide.pdf" target="_blank">FCL Guide</a>`
          }
        ]
      );
      return;
    }

    if (intent.includes("market analysis")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Market Analysis Report",
        "Download the Market Analysis Report 2025.",
        [
          {
            heading: "Download",
            body: `<a href="https://grains.ae/docs/market-analysis-2025.pdf" target="_blank">Market Analysis 2025</a>`
          }
        ]
      );
      return;
    }

    /* -----------------------------------------
       5. Fallback (Unknown Query)
    ----------------------------------------- */
    const errPack = alliyaRecover("unknown", userQuery);
    replyBox.innerHTML = buildAlliyaResponse(
      errPack.title,
      errPack.summary,
      [{ heading: "Details", body: errPack.details }]
    );
    return;

  } catch (err) {
    console.warn('Alliya v6.0 error:', err);

    const errPack = alliyaRecover("network");
    replyBox.innerHTML = buildAlliyaResponse(
      errPack.title,
      errPack.summary,
      [{ heading: "Details", body: errPack.details }]
    );
  }
};
