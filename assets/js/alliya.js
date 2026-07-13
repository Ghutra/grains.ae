(function injectAlliyaCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/alliya.css';
  document.head.appendChild(link);
})();

/* -----------------------------------------
   Alliya v7 Modal + Float Button
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
          <div class="alliya-intro" id="alliyaIntro"></div>
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
   Modal Open / Close + Auto Greeting
----------------------------------------- */
window.openModal = function () {
  const modal = document.getElementById('alliyaModal');
  const intro = document.getElementById('alliyaIntro');
  const replyBox = document.getElementById('alliyaResponse');

  if (modal) modal.style.display = 'block';
  if (intro) {
    intro.innerHTML = `
      <p><strong>Hello!</strong> I’m Alliya, your grain trade assistant at Grains Hub.</p>
      <p>Ask me about stock, suppliers, FCL booking, compliance, or documentation.</p>
    `;
  }
  if (replyBox) {
    replyBox.style.display = 'none';
    replyBox.innerHTML = '';
  }
};

window.closeModal = function () {
  const modal = document.getElementById('alliyaModal');
  if (modal) modal.style.display = 'none';
};

/* -----------------------------------------
   Data URLs
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
  return (str || '').toLowerCase().trim();
}

function similarityScore(a, b) {
  const wordsA = normalize(a).split(/\s+/);
  const wordsB = normalize(b).split(/\s+/);
  let score = 0;
  wordsA.forEach(w => {
    if (wordsB.includes(w)) score += 2;
    else if (wordsB.some(wb => wb.includes(w) || w.includes(wb))) score += 1;
  });
  return score;
}

function findStockMatches(stock, queryTerms) {
  return stock.filter(item => {
    const name = normalize(item.name);
    const origin = normalize(item.origin);
    const packaging = normalize(item.packaging || '');
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

window.applySuggestion = function (text) {
  const input = document.getElementById('alliyaQuery');
  const box = document.getElementById('alliyaSuggestions');
  if (input) input.value = text;
  if (box) box.innerHTML = '';
};

window.showSuggestions = async function () {
  const input = document.getElementById('alliyaQuery');
  const box = document.getElementById('alliyaSuggestions');
  if (!input || !box) return;

  const query = normalize(input.value);
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

    // Stock products
    stock.forEach(item => {
      if (normalize(item.name).includes(query)) {
        suggestions.add(item.name);
      }
    });

    // Supplier names
    suppliers.forEach(s => {
      if (normalize(s.name).includes(query)) {
        suggestions.add(`show ${s.name.toLowerCase()} profile`);
      }
    });

    // Knowledge questions
    knowledge.forEach(k => {
      if (normalize(k.question).includes(query)) {
        suggestions.add(k.question);
      }
    });

    // Smart intents
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

    // Greeting & small talk
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

    // Founder & location
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
    box.innerHTML = '';
  }
};

/* -----------------------------------------
   Hybrid UX Response Builder
----------------------------------------- */
function buildAlliyaResponse(title, summary, sections = []) {
  let html = `
    <div class="alliya-block">
      <h2><strong>${title}</strong></h2>
      <p>${summary}</p>
  `;

  sections.forEach(sec => {
    html += `<h3>${sec.heading}</h3><p>${sec.body}</p>`;
  });

  html += `
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
    </div>
    <hr>
    <p><em>All trade is executed through Ghutra Goods Wholesaler LLC under UAE wholesale regulations.</em></p>
  `;
  return html;
}

/* -----------------------------------------
   Personality Engine
----------------------------------------- */
window.alliyaPersonality = function (query) {
  const q = normalize(query);

  if (["hi", "hello", "hey"].includes(q)) {
    return {
      title: "Hello!",
      summary: "I’m Alliya, your grain trade assistant at Grains Hub. How can I help you today?"
    };
  }

  if (q.includes("who are you") || q.includes("who is alliya")) {
    return {
      title: "About Alliya",
      summary: "I’m Alliya — Dubai’s first AI grain assistant, built for verified grain trade."
    };
  }

  if (q.includes("what is alliya")) {
    return {
      title: "Alliya – AI Assistant",
      summary: "I’m the official AI assistant of Grains Hub, helping with stock, suppliers, FCL, and compliance."
    };
  }

  if (q.includes("how are you")) {
    return {
      title: "I’m doing great!",
      summary: "Always ready to help you with grain trade, stock, suppliers, and shipments."
    };
  }

  if (q.includes("thank")) {
    return {
      title: "You’re welcome!",
      summary: "Happy to help anytime. You can ask me about stock, suppliers, or FCL booking."
    };
  }

  if (q.includes("shahid")) {
    return {
      title: "About Shahid Bashir",
      summary: "Founder of Grains Hub, GhutraTech, and Ghutra Goods Wholesaler LLC, architecting every layer of grains.ae."
    };
  }

  if (q.includes("dubai") || q.includes("al ras") || q.includes("alras")) {
    return {
      title: "Dubai & Al Ras",
      summary: "Grains Hub operates from Al Ras, Deira — Dubai’s historic wholesale grain district."
    };
  }

  return null;
};

/* -----------------------------------------
   Error Recovery Engine
----------------------------------------- */
window.alliyaRecover = function (type, detail = "") {
  switch (type) {
    case "empty":
      return {
        title: "I’m here to help",
        summary: "Please type a question so I can assist you. Try asking about stock, suppliers, FCL, or docs."
      };
    case "network":
      return {
        title: "Connection issue",
        summary: "I couldn’t load live data. You can still browse stock or submit FCL using the links below."
      };
    case "unknown":
      return {
        title: "I’m here to help",
        summary: `I couldn’t find a direct match for "${detail}". Try asking about products, suppliers, FCL, documentation, or market prices.`
      };
    default:
      return {
        title: "Something went wrong",
        summary: "I couldn’t process your request. Please try again or use the stock and FCL links below."
      };
  }
};

/* -----------------------------------------
   Main Engine – Alliya v7
----------------------------------------- */
window.askAlliya = async function () {
  const replyBox = document.getElementById('alliyaResponse');
  const userQueryRaw = document.getElementById('alliyaQuery').value;
  const userQuery = userQueryRaw.trim();

  if (!replyBox) return;

  if (!userQuery) {
    const err = alliyaRecover("empty");
    replyBox.style.display = 'block';
    replyBox.innerHTML = buildAlliyaResponse(err.title, err.summary);
    return;
  }

  replyBox.style.display = 'block';
  replyBox.innerHTML = 'Alliya is checking…';

  const q = normalize(userQuery);
  const terms = q.split(/\s+/).filter(Boolean);

  try {
    const [stock, suppliers, knowledge] = await Promise.all([
      loadStock(),
      loadSuppliers(),
      loadKnowledge()
    ]);

    /* Priority override for Alliya identity */
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

    if (priorityKeywords.some(k => q.includes(k))) {
      const kbMatchExact = knowledge.find(item =>
        normalize(item.question) === q
      );
      if (kbMatchExact) {
        replyBox.innerHTML = buildAlliyaResponse(
          "Your Answer",
          kbMatchExact.answer,
          [{ heading: "Details", body: kbMatchExact.answer }]
        );
        return;
      }
    }

    /* Personality layer */
    const personality = alliyaPersonality(userQuery);
    if (personality) {
      replyBox.innerHTML = buildAlliyaResponse(
        personality.title,
        personality.summary
      );
      return;
    }

    /* Knowledge base – exact + fuzzy */
    let kbMatch = knowledge.find(k =>
      normalize(k.question) === q ||
      normalize(k.question).includes(q) ||
      q.includes(normalize(k.question))
    );

    if (!kbMatch) {
      kbMatch = knowledge.reduce((best, current) => {
        const score = similarityScore(current.question, userQuery);
        return score > (best.score || 0) ? { ...current, score } : best;
      }, { score: 0 });
      if (kbMatch.score < 3) kbMatch = null;
    }

    if (kbMatch) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Your Answer",
        kbMatch.answer,
        [{ heading: "Details", body: kbMatch.answer }]
      );
      return;
    }

    /* Stock match */
    const stockMatches = findStockMatches(stock, terms);
    if (stockMatches.length > 0) {
      const primary = stockMatches[0];
      const supplier = findSupplierForProduct(suppliers, primary.name);

      const isBooking = String(primary.price).toUpperCase().includes('USD');
      const priceRaw = parseFloat(primary.price);
      const sizeKG = parseInt(primary.size);
      const pricePerKg = (!isNaN(priceRaw) && !isNaN(sizeKG))
        ? (priceRaw / sizeKG).toFixed(2)
        : null;

      const originFlag =
        normalize(primary.origin).includes('india') ? '🇮🇳' :
        normalize(primary.origin).includes('pakistan') ? '🇵🇰' :
        normalize(primary.origin).includes('thailand') ? '🇹🇭' : '🌍';

      replyBox.innerHTML = buildAlliyaResponse(
        `${originFlag} ${primary.name}`,
        `${primary.name} is available in live stock.`,
        [
          {
            heading: "Product overview",
            body: `
              <strong>Origin:</strong> ${primary.origin}<br>
              <strong>Packaging:</strong> ${primary.packaging || 'Standard bags'}<br>
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

    /* Supplier match */
    const supplierMatch = suppliers.find(s =>
      normalize(s.name).includes(q)
    );

    if (supplierMatch) {
      replyBox.innerHTML = buildAlliyaResponse(
        `🏅 Verified Supplier: ${supplierMatch.name}`,
        `${supplierMatch.name} is a verified supplier listed on Grains Hub.`,
        [
          {
            heading: "Supplier details",
            body: `
              <strong>Location:</strong> ${supplierMatch.city}, ${supplierMatch.country}<br>
              <strong>Badge:</strong> ${supplierMatch.badge}<br>
              <strong>Products:</strong> ${Array.isArray(supplierMatch.products) ? supplierMatch.products.join(', ') : 'Listed products'}
            `
          }
        ]
      );
      return;
    }

    /* Intent router */
    const intent = q;

    // Supplier Directory
    if (intent.includes("supplier directory") || intent.includes("suppliers")) {
      replyBox.innerHTML = buildAlliyaResponse(
        "Supplier Directory",
        "Browse all verified suppliers listed on Grains Hub.",
        [
          {
            heading: "Open directory",
            body: `<a href="https://grains.ae/suppliers/" target="_blank">View suppliers</a>`
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
            heading: "Book shipment",
            body: `<a href="https://grains.ae/fcl/" target="_blank">Book FCL shipment</a>`
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
            heading: "Download guide",
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
            heading: "Open stock",
            body: `<a href="https://grains.ae/shop" target="_blank">Open stock page</a>`
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

    /* Fallback */
    const errPack = alliyaRecover("unknown", userQuery);
    replyBox.innerHTML = buildAlliyaResponse(
      errPack.title,
      errPack.summary,
      [
        {
          heading: "Try asking about:",
          body: `
            - Products (1121 Sella, IRRI 6, 1509, etc.)<br>
            - Suppliers<br>
            - FCL booking<br>
            - Documentation<br>
            - Compliance<br>
            - Market prices
          `
        }
      ]
    );

  } catch (err) {
    console.warn('Alliya v7 error:', err);
    const errPack = alliyaRecover("network");
    replyBox.innerHTML = buildAlliyaResponse(errPack.title, errPack.summary);
  }
};
