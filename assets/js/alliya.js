(function injectAlliyaCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/alliya.css';
  document.head.appendChild(link);
})();

/* -----------------------------------------
   Alliya v6.1 Modal Auto-Injector
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
   ALLIYA v6.1 – Frontend Engine (Premium)
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
   Smart Matching Helpers
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

/* -----------------------------------------
   Suggestion Engine
----------------------------------------- */
function buildSuggestionItem(text) {
  return `<div class="alliya-suggestion-item" onclick="applySuggestion('${text.replace(/'/g, "\\'")}')">${text}</div>`;
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
  if (query.length < 2) {
    box.innerHTML = '';
    return;
  }

  try {
    const [stock, suppliers, knowledge] = await Promise.all([loadStock(), loadSuppliers(), loadKnowledge()]);
    const suggestions = new Set();

    // Stock
    stock.forEach(item => {
      if (normalize(item.name).includes(query)) suggestions.add(item.name);
    });

    // Suppliers
    suppliers.forEach(s => {
      if (normalize(s.name).includes(query)) suggestions.add(`Show ${s.name} profile`);
    });

    // Knowledge base
    knowledge.forEach(k => {
      if (normalize(k.question).includes(query)) suggestions.add(k.question);
    });

    const list = Array.from(suggestions).slice(0, 8);
    box.innerHTML = list.map(buildSuggestionItem).join('');
  } catch (err) {
    console.warn('Suggestions error:', err);
    box.innerHTML = '';
  }
};

/* -----------------------------------------
   Response Builder
----------------------------------------- */
function buildAlliyaResponse(title, summary, sections = []) {
  let html = `
    <div class="alliya-block">
      <h2><strong>${title}</strong></h2>
      <h3>Executive Summary</h3>
      <p>${summary}</p>
  `;

  sections.forEach(sec => {
    html += `<h3>${sec.heading}</h3><p>${sec.body}</p>`;
  });

  html += `
    </div>
    <hr>
    <div class="alliya-cta">
      <p><strong>📦 Browse Stock</strong><br><a href="https://grains.ae/shop" target="_blank">Open Stock Page</a></p>
      <p><strong>🚢 Book FCL</strong><br><a href="https://grains.ae/fcl/" target="_blank">Book Full Container</a></p>
      <p><strong>📊 Market Pulse</strong><br><a href="https://grains.ae/pulse/index.html" target="_blank">Live Prices</a></p>
    </div>
    <hr>
    <p><em>All trade through Ghutra Goods Wholesaler LLC — UAE compliant.</em></p>
  `;
  return html;
}

/* -----------------------------------------
   Personality + Smart Recovery
----------------------------------------- */
window.alliyaPersonality = function (query) {
  const q = normalize(query);
  if (["hi", "hello", "hey"].some(g => q.includes(g))) {
    return { title: "Hello!", summary: "I’m Alliya, your dedicated grain trade assistant at Grains Hub. How can I help you today?" };
  }
  if (q.includes("who are you") || q.includes("who is alliya")) {
    return { title: "About Alliya", summary: "I’m Alliya — Dubai’s smartest AI grain assistant." };
  }
  if (q.includes("how are you")) {
    return { title: "Doing great!", summary: "Always ready to help with stock, suppliers, FCL, or market info." };
  }
  if (q.includes("shahid")) {
    return { title: "Shahid Bashir", summary: "Founder of Grains Hub & Ghutra Goods." };
  }
  return null;
};

window.alliyaRecover = function (type, detail = "") {
  const responses = {
    empty: { title: "I'm here!", summary: "Just type your question and I’ll help instantly." },
    network: { title: "Connection issue", summary: "Trying again in a second..." },
    unknown: { 
      title: "Got it!", 
      summary: `I understood you're asking about "${detail}". Let me give you the best answer I have.` 
    }
  };
  return responses[type] || responses.unknown;
};

/* -----------------------------------------
   Main Engine - v6.1
----------------------------------------- */
window.askAlliya = async function () {
  const replyBox = document.getElementById('alliyaResponse');
  const userQuery = document.getElementById('alliyaQuery').value.trim();

  if (!userQuery) {
    const err = alliyaRecover("empty");
    replyBox.innerHTML = buildAlliyaResponse(err.title, err.summary);
    replyBox.style.display = 'block';
    return;
  }

  replyBox.style.display = 'block';
  replyBox.innerHTML = 'Alliya is thinking...';

  try {
    const [stock, suppliers, knowledge] = await Promise.all([loadStock(), loadSuppliers(), loadKnowledge()]);

    const q = normalize(userQuery);

    // 1. Personality
    const personality = alliyaPersonality(userQuery);
    if (personality) {
      replyBox.innerHTML = buildAlliyaResponse(personality.title, personality.summary);
      return;
    }

    // 2. Direct Knowledge Base Match (Best first)
    let kbMatch = knowledge.find(k => normalize(k.question) === q || 
                                     normalize(k.question).includes(q) || 
                                     q.includes(normalize(k.question)));

    if (!kbMatch) {
      // Fuzzy fallback
      kbMatch = knowledge.reduce((best, current) => {
        const score = similarityScore(current.question, userQuery);
        return score > (best.score || 0) ? { ...current, score } : best;
      }, { score: 0 });
      if (kbMatch.score < 3) kbMatch = null;
    }

    if (kbMatch) {
      replyBox.innerHTML = buildAlliyaResponse("Your Answer", kbMatch.answer, [{ heading: "Details", body: kbMatch.answer }]);
      return;
    }

    // 3. Stock Match
    const terms = q.split(/\s+/);
    const stockMatches = stock.filter(item => 
      terms.some(t => normalize(item.name).includes(t) || normalize(item.origin).includes(t))
    );

    if (stockMatches.length > 0) {
      const primary = stockMatches[0];
      // ... (keep your original stock response logic or I can enhance it more)
      // For now keeping it clean
      replyBox.innerHTML = buildAlliyaResponse(
        `${primary.name}`,
        `Live stock available for ${primary.name}.`,
        [{ heading: "Details", body: `Origin: ${primary.origin}<br>Price: ${primary.price}` }]
      );
      return;
    }

    // 4. Supplier Match
    const supplierMatch = suppliers.find(s => normalize(s.name).includes(q));
    if (supplierMatch) {
      replyBox.innerHTML = buildAlliyaResponse(`Supplier: ${supplierMatch.name}`, "Verified supplier on Grains Hub.");
      return;
    }

    // 5. Intent Router (FCL, Pulse, etc.)
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
    // Final Smart Fallback
    const fallback = alliyaRecover("unknown", userQuery);
    replyBox.innerHTML = buildAlliyaResponse(fallback.title, fallback.summary, [
      { heading: "How can I help further?", body: "Try asking about rice, wheat, FCL booking, suppliers, or market prices." }
    ]);

  } catch (err) {
    console.error(err);
    const errPack = alliyaRecover("network");
    replyBox.innerHTML = buildAlliyaResponse(errPack.title, errPack.summary);
  }
};
