/* ============================================================
   ALLIYA v8.1 - Clean & Working
   Grains Gold Edition
   ============================================================
   - Removes ALL conflicts with v7
   - Auto-linkify: URLs, WhatsApp, Email, Phone
   - Gold theme with pulse animation
   - Fully responsive
   ============================================================ */

(function AlliyaV8() {
  'use strict';

  // ============================================================
  // 1. REMOVE ANY EXISTING ALLIYA ELEMENTS (Clean Start)
  // ============================================================
  function cleanExisting() {
    // Remove old modal
    const oldModal = document.getElementById('alliyaModal');
    if (oldModal) oldModal.remove();

    // Remove old float button
    const oldFloat = document.getElementById('alliyaFloatBtn');
    if (oldFloat) oldFloat.remove();

    // Remove any duplicate modals with different IDs
    document.querySelectorAll('.modal, #alliyaModal, .alliya-float, #alliyaFloatBtn').forEach(el => {
      if (el.id !== 'alliyaModal' && el.id !== 'alliyaFloatBtn') {
        // Check if it's our elements by content
        if (el.textContent && el.textContent.includes('Ask Alliya')) {
          el.remove();
        }
      }
    });
  }

  // ============================================================
  // 2. INJECT CSS
  // ============================================================
  function injectCSS() {
    // Check if CSS already loaded
    const existing = document.querySelector('link[href="/css/alliya.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/alliya.css';
      document.head.appendChild(link);
      console.log('[Alliya] CSS loaded from /css/alliya.css');
    }
  }

  // ============================================================
  // 3. INJECT HTML
  // ============================================================
  function injectHTML() {
    const modalHTML = `
      <div id="alliyaModal">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-left">
              <img src="/assets/img/alliya-icon.ico" alt="Alliya" onerror="this.src='/alliya-icon.ico'">
              <h2>Ask Alliya</h2>
            </div>
            <span class="close" id="alliyaCloseBtn">&times;</span>
          </div>
          
          <!-- Body -->
          <div class="alliya-box">
            <div class="alliya-intro" id="alliyaIntro"></div>
            
            <!-- Input -->
            <div class="input-wrapper">
              <input type="text" id="alliyaQuery"
                placeholder="Ask about products, suppliers, FCL, docs..."
                autocomplete="off">
              <div id="alliyaSuggestions" class="suggestions"></div>
            </div>
            
            <!-- Send Button -->
            <button class="send-btn" id="alliyaSendBtn">✨ Send Question</button>
            
            <!-- Response -->
            <div id="alliyaResponse" class="reply"></div>
          </div>
        </div>
      </div>
      
      <!-- Floating Button -->
      <div id="alliyaFloatBtn">
        <img src="/assets/img/alliya-icon.ico" alt="Alliya" onerror="this.src='/alliya-icon.ico'">
        <span>Ask Alliya</span>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('[Alliya] HTML injected');
  }

  // ============================================================
  // 4. UTILITY FUNCTIONS
  // ============================================================
  
  function normalize(str) {
    return (str || '').toLowerCase().trim();
  }

  // Auto-linkify - Converts URLs, WhatsApp, Email, Phone to clickable links
  function autoLinkify(text) {
    if (!text) return '';
    
    let html = text;
    
    // 1. WhatsApp: wa.me/1234567890
    html = html.replace(
      /(?:https?:\/\/)?(?:wa\.me|whatsapp\.com)\/([0-9]+)/gi,
      '<a href="https://wa.me/$1" target="_blank">📱 WhatsApp: $1</a>'
    );
    
    // 2. Phone numbers: +971 50 123 4567
    html = html.replace(
      /(\+?[0-9]{1,4}[-.\s]?)?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g,
      (match) => {
        const clean = match.replace(/[\s\-()]/g, '');
        if (clean.length >= 7) {
          return `<a href="tel:${clean}">📞 ${match}</a>`;
        }
        return match;
      }
    );
    
    // 3. Email addresses
    html = html.replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1">✉️ $1</a>'
    );
    
    // 4. URLs (http, https, www)
    html = html.replace(
      /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
      (match) => {
        const href = match.startsWith('www.') ? 'https://' + match : match;
        const display = match.length > 50 ? match.substring(0, 45) + '...' : match;
        return `<a href="${href}" target="_blank">🔗 ${display}</a>`;
      }
    );
    
    // 5. File paths: /docs/file.pdf
    html = html.replace(
      /(\/[^\s<]+\.(pdf|doc|docx|xls|xlsx|json|csv|txt))/gi,
      (match) => {
        const filename = match.split('/').pop();
        return `<a href="${match}" target="_blank">📄 ${filename}</a>`;
      }
    );
    
    return html;
  }

  // ============================================================
  // 5. DATA LOADERS
  // ============================================================
  
  const STOCK_URL = '/assets/data/stock.json';
  const SUPPLIERS_URL = window.location.origin + '/assets/data/suppliers.json';
  const KNOWLEDGE_URL = window.location.origin + '/assets/data/alliya-knowledge.json';
  
  let alliyaStockCache = null;
  let alliyaSuppliersCache = null;
  let alliyaKnowledgeCache = null;
  
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

  // ============================================================
  // 6. HELPERS
  // ============================================================
  
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

  // ============================================================
  // 7. SUGGESTION ENGINE
  // ============================================================
  
  function buildSuggestionItem(text) {
    const safeText = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="alliya-suggestion-item" data-suggestion="${safeText}">
        ${text}
      </div>
    `;
  }
  
  async function showSuggestions() {
    const input = document.getElementById('alliyaQuery');
    const box = document.getElementById('alliyaSuggestions');
    if (!input || !box) return;
    
    const query = normalize(input.value);
    if (!query || query.length < 2) {
      box.innerHTML = '';
      box.classList.remove('show');
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
        "fcl", "stock", "supplier", "market", "pulse", "docs",
        "compliance", "rice", "shahid", "buyer pack"
      ];
      
      intents.forEach(i => {
        if (i.includes(query)) {
          suggestions.add(i);
        }
      });
      
      // Greetings
      const greetings = ["hi", "hello", "hey", "who is alliya", "what is alliya"];
      greetings.forEach(g => {
        if (g.includes(query)) {
          suggestions.add(g);
        }
      });
      
      const list = Array.from(suggestions).slice(0, 8);
      if (list.length === 0) {
        box.innerHTML = '';
        box.classList.remove('show');
        return;
      }
      
      box.innerHTML = list.map(buildSuggestionItem).join('');
      box.classList.add('show');
      
      // Click handler for suggestions
      box.querySelectorAll('.alliya-suggestion-item').forEach(el => {
        el.addEventListener('click', function() {
          const text = this.dataset.suggestion;
          const input = document.getElementById('alliyaQuery');
          if (input) input.value = text;
          box.classList.remove('show');
          setTimeout(() => askAlliya(), 200);
        });
      });
      
    } catch (err) {
      console.warn('Alliya suggestions error:', err);
      box.innerHTML = '';
      box.classList.remove('show');
    }
  }

  // ============================================================
  // 8. RESPONSE BUILDER
  // ============================================================
  
  function buildAlliyaResponse(title, summary, sections = []) {
    const linkedSummary = autoLinkify(summary);
    
    let html = `
      <div class="alliya-block">
        <h2><strong>${title}</strong></h2>
        <p>${linkedSummary}</p>
    `;
    
    sections.forEach(sec => {
      const linkedBody = autoLinkify(sec.body);
      html += `<h3>${sec.heading}</h3><p>${linkedBody}</p>`;
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
      <p class="alliya-footer-note">All trade is executed through Ghutra Goods Wholesaler LLC under UAE wholesale regulations.</p>
    `;
    
    return html;
  }

  // ============================================================
  // 9. PERSONALITY ENGINE
  // ============================================================
  
  function alliyaPersonality(query) {
    const q = normalize(query);
    
    if (["hi", "hello", "hey", "salam"].includes(q)) {
      return {
        title: "✨ Hello!",
        summary: "I'm Alliya, your grain trade assistant at Grains Hub. How can I help you today?"
      };
    }
    
    if (q.includes("who are you") || q.includes("who is alliya")) {
      return {
        title: "✨ About Alliya",
        summary: "I'm Alliya — Dubai's first AI grain assistant, built for verified grain trade."
      };
    }
    
    if (q.includes("what is alliya")) {
      return {
        title: "✨ Alliya – AI Assistant",
        summary: "I'm the official AI assistant of Grains Hub, helping with stock, suppliers, FCL, and compliance."
      };
    }
    
    if (q.includes("how are you")) {
      return {
        title: "✨ I'm doing great!",
        summary: "Always ready to help you with grain trade, stock, suppliers, and shipments."
      };
    }
    
    if (q.includes("thank")) {
      return {
        title: "✨ You're welcome!",
        summary: "Happy to help anytime. You can ask me about stock, suppliers, or FCL booking."
      };
    }
    
    if (q.includes("shahid")) {
      return {
        title: "✨ About Shahid Bashir",
        summary: "Founder of Grains Hub, GhutraTech, and Ghutra Goods Wholesaler LLC."
      };
    }
    
    if (q.includes("dubai") || q.includes("al ras") || q.includes("deira")) {
      return {
        title: "✨ Dubai & Al Ras",
        summary: "Grains Hub operates from Al Ras, Deira — Dubai's historic wholesale grain district."
      };
    }
    
    return null;
  }

  // ============================================================
  // 10. ERROR RECOVERY
  // ============================================================
  
  function alliyaRecover(type, detail = "") {
    switch (type) {
      case "empty":
        return {
          title: "✨ I'm here to help",
          summary: "Please type a question so I can assist you. Try asking about stock, suppliers, FCL, or docs."
        };
      case "network":
        return {
          title: "⚠️ Connection issue",
          summary: "I couldn't load live data. You can still browse stock or submit FCL using the links below."
        };
      case "unknown":
        return {
          title: "✨ I'm here to help",
          summary: `I couldn't find a direct match for "${detail}". Try asking about products, suppliers, FCL, documentation, or market prices.`
        };
      default:
        return {
          title: "⚠️ Something went wrong",
          summary: "I couldn't process your request. Please try again or use the stock and FCL links below."
        };
    }
  }

  // ============================================================
  // 11. MAIN ENGINE
  // ============================================================
  
  async function askAlliya() {
    const replyBox = document.getElementById('alliyaResponse');
    const input = document.getElementById('alliyaQuery');
    if (!replyBox || !input) return;
    
    const userQuery = input.value.trim();
    
    if (!userQuery) {
      const err = alliyaRecover("empty");
      replyBox.innerHTML = buildAlliyaResponse(err.title, err.summary);
      replyBox.classList.add('show');
      return;
    }
    
    // Show loading
    replyBox.innerHTML = '<span class="alliya-loading">⏳ Alliya is checking</span>';
    replyBox.classList.add('show');
    
    const q = normalize(userQuery);
    const terms = q.split(/\s+/).filter(Boolean);
    
    try {
      const [stock, suppliers, knowledge] = await Promise.all([
        loadStock(),
        loadSuppliers(),
        loadKnowledge()
      ]);
      
      /* Personality layer */
      const personality = alliyaPersonality(userQuery);
      if (personality) {
        replyBox.innerHTML = buildAlliyaResponse(personality.title, personality.summary);
        return;
      }
      
      /* Knowledge base */
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
          "✨ Your Answer",
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
              heading: "📋 Product overview",
              body: `
                <strong>Origin:</strong> ${primary.origin}<br>
                <strong>Packaging:</strong> ${primary.packaging || 'Standard bags'}<br>
                <strong>Stock:</strong> ${primary.stock || 'Prompt shipment'}
              `
            },
            {
              heading: "💰 Pricing",
              body: isBooking
                ? `${primary.price} (Booking / FOB or C&F)`
                : `${primary.price} / ${primary.size}kg${pricePerKg ? ` → ${pricePerKg} AED/kg` : ''}`
            },
            {
              heading: "🏢 Supplier",
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
              heading: "📋 Supplier details",
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
      
      if (intent.includes("supplier") || intent.includes("suppliers")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "🏢 Supplier Directory",
          "Browse all verified suppliers listed on Grains Hub.",
          [{ heading: "🔗 Open directory", body: `<a href="https://grains.ae/suppliers/" target="_blank">View suppliers</a>` }]
        );
        return;
      }
      
      if (intent.includes("market") || intent.includes("pulse")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "📊 Market Pulse",
          "Live grain pricing updated every 60 seconds.",
          [{ heading: "🔗 Open Market Pulse", body: `<a href="https://grains.ae/pulse/index.html" target="_blank">Open Market Pulse</a>` }]
        );
        return;
      }
      
      if (intent.includes("fcl") || intent.includes("container")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "🚢 FCL Booking",
          "Submit your full container load requirement instantly.",
          [{ heading: "🔗 Book shipment", body: `<a href="https://grains.ae/fcl/" target="_blank">Book FCL shipment</a>` }]
        );
        return;
      }
      
      if (intent.includes("compliance") || intent.includes("verification")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "📄 Compliance & Verification",
          "Download the official compliance and verification guide.",
          [{ heading: "🔗 Download guide", body: `<a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a>` }]
        );
        return;
      }
      
      if (intent.includes("stock")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "📦 Live Stock",
          "Browse all available AED stock and USD booking options.",
          [{ heading: "🔗 Open stock", body: `<a href="https://grains.ae/shop" target="_blank">Open stock page</a>` }]
        );
        return;
      }
      
      if (intent.includes("docs") || intent.includes("documentation")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "📄 Documentation Hub",
          "All official Grains Hub documents are available below.",
          [{
            heading: "📚 Downloads",
            body: `
              <a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank">Buyer Pack</a><br>
              <a href="https://grains.ae/docs/supplier-onboarding-pack.pdf" target="_blank">Supplier Onboarding Pack</a><br>
              <a href="https://grains.ae/docs/fcl-guide.pdf" target="_blank">FCL Guide</a><br>
              <a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a><br>
              <a href="https://grains.ae/docs/market-analysis-2025.pdf" target="_blank">Market Analysis 2025</a>
            `
          }]
        );
        return;
      }
      
      if (intent.includes("buyer pack")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "📄 Buyer Pack",
          "Download the official Buyer Pack.",
          [{ heading: "🔗 Download", body: `<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank">Buyer Pack</a>` }]
        );
        return;
      }
      
      if (intent.includes("fcl guide")) {
        replyBox.innerHTML = buildAlliyaResponse(
          "📄 FCL Guide",
          "Download the official FCL Booking Guide.",
          [{ heading: "🔗 Download", body: `<a href="https://grains.ae/docs/fcl-guide.pdf" target="_blank">FCL Guide</a>` }]
        );
        return;
      }
      
      /* Fallback */
      const errPack = alliyaRecover("unknown", userQuery);
      replyBox.innerHTML = buildAlliyaResponse(
        errPack.title,
        errPack.summary,
        [{
          heading: "💡 Try asking about:",
          body: "• Products (1121 Sella, IRRI 6, 1509, etc.)<br>• Suppliers<br>• FCL booking<br>• Documentation<br>• Compliance<br>• Market prices"
        }]
      );
      
    } catch (err) {
      console.warn('Alliya v8.1 error:', err);
      const errPack = alliyaRecover("network");
      replyBox.innerHTML = buildAlliyaResponse(errPack.title, errPack.summary);
    }
  }

  // ============================================================
  // 12. SETUP EVENT LISTENERS
  // ============================================================
  
  function setupEventListeners() {
    // Float button
    const floatBtn = document.getElementById('alliyaFloatBtn');
    if (floatBtn) {
      floatBtn.addEventListener('click', openModal);
    }
    
    // Close button
    const closeBtn = document.getElementById('alliyaCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    // Send button
    const sendBtn = document.getElementById('alliyaSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        askAlliya();
      });
    }
    
    // Input - Enter key
    const input = document.getElementById('alliyaQuery');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          askAlliya();
        }
      });
      
      // Suggestions on input
      input.addEventListener('input', function() {
        showSuggestions();
      });
      
      // Close suggestions on blur
      input.addEventListener('blur', function() {
        setTimeout(() => {
          const box = document.getElementById('alliyaSuggestions');
          if (box) box.classList.remove('show');
        }, 300);
      });
    }
    
    // Close modal on backdrop click
    const modal = document.getElementById('alliyaModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal();
        }
      });
    }
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('alliyaModal');
        if (modal && modal.style.display === 'block') {
          closeModal();
        }
      }
    });
    
    console.log('[Alliya] Event listeners set up');
  }

  // ============================================================
  // 13. MODAL CONTROLS
  // ============================================================
  
  function openModal() {
    const modal = document.getElementById('alliyaModal');
    const intro = document.getElementById('alliyaIntro');
    const replyBox = document.getElementById('alliyaResponse');
    
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active');
    }
    
    if (intro) {
      intro.innerHTML = `
        <p><strong>✨ Hello!</strong> I'm Alliya, your grain trade assistant at Grains Hub.</p>
        <p>Ask me about stock, suppliers, FCL booking, compliance, or documentation.</p>
      `;
    }
    
    if (replyBox) {
      replyBox.classList.remove('show');
      replyBox.innerHTML = '';
    }
    
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      const input = document.getElementById('alliyaQuery');
      if (input) input.focus();
    }, 400);
  }
  
  function closeModal() {
    const modal = document.getElementById('alliyaModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  // ============================================================
  // 14. INITIALIZATION
  // ============================================================
  
  function init() {
    // Clean existing Alliya elements
    cleanExisting();
    
    // Inject CSS
    injectCSS();
    
    // Inject HTML
    injectHTML();
    
    // Setup events
    setupEventListeners();
    
    // Open modal on first visit (optional - remove if you want manual open only)
    // setTimeout(openModal, 800);
    
    console.log('%c✨ Alliya v8.1 - Grains Gold Edition Loaded', 'font-size:20px; font-weight:bold; color:#c49b3f;');
    console.log('%c💡 Try asking: "Show me stock" or "Who are your suppliers?"', 'font-size:14px; color:#a8842e;');
    console.log('%c🔗 All links, emails, and phone numbers are now clickable!', 'font-size:13px; color:#c49b3f;');
  }

  // ============================================================
  // 15. START
  // ============================================================
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose functions globally
  window.Alliya = {
    ask: askAlliya,
    open: openModal,
    close: closeModal,
    version: '8.1'
  };

})();
