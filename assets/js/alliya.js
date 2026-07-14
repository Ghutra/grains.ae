/* ============================================================
   ALLIYA v8.2 - Self-Contained Gold Edition
   No external dependencies - Everything in one file
   ============================================================ */

(function AlliyaV8() {
  'use strict';

  // ============================================================
  // 1. COMPLETE CSS (Self-Contained)
  // ============================================================
  const ALLIYA_STYLES = `
    /* ============================================================
       ALLIYA v8.2 - Complete Styles
       ============================================================ */
    
    /* ---- Floating Button ---- */
    #alliyaFloatBtn {
      position: fixed !important;
      bottom: 30px !important;
      right: 30px !important;
      z-index: 999999 !important;
      background: linear-gradient(135deg, #c49b3f 0%, #e3c46a 30%, #c49b3f 60%, #a8842e 100%) !important;
      background-size: 200% 200% !important;
      color: #111111 !important;
      padding: 12px 22px !important;
      border-radius: 999px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      box-shadow: 0 8px 32px rgba(196, 155, 63, 0.4) !important;
      border: 2px solid #c49b3f !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      animation: goldPulse 2.5s ease-in-out infinite !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      text-decoration: none !important;
      user-select: none !important;
    }

    #alliyaFloatBtn:hover {
      transform: scale(1.08) translateY(-2px) !important;
      box-shadow: 0 12px 48px rgba(196, 155, 63, 0.6) !important;
      animation-play-state: paused !important;
    }

    #alliyaFloatBtn img {
      width: 24px !important;
      height: 24px !important;
      border-radius: 6px !important;
      background: white !important;
      padding: 3px !important;
    }

    @keyframes goldPulse {
      0%, 100% {
        box-shadow: 0 8px 32px rgba(196, 155, 63, 0.3);
        transform: scale(1);
        background-position: 0% 50%;
      }
      25% {
        box-shadow: 0 8px 48px rgba(196, 155, 63, 0.7);
        transform: scale(1.03);
        background-position: 50% 50%;
      }
      50% {
        box-shadow: 0 8px 32px rgba(196, 155, 63, 0.3);
        transform: scale(1);
        background-position: 100% 50%;
      }
      75% {
        box-shadow: 0 8px 48px rgba(196, 155, 63, 0.7);
        transform: scale(1.03);
        background-position: 50% 50%;
      }
    }

    /* ---- Modal ---- */
    #alliyaModal {
      display: none !important;
      position: fixed !important;
      z-index: 999998 !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: auto !important;
      background: rgba(0, 0, 0, 0.5) !important;
      backdrop-filter: blur(4px) !important;
      animation: modalFadeIn 0.3s ease !important;
    }

    #alliyaModal.active {
      display: block !important;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    #alliyaModal .modal-content {
      background: #ffffff !important;
      margin: 40px auto !important;
      padding: 0 !important;
      border-radius: 16px !important;
      max-width: 560px !important;
      width: 92% !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      border: 1px solid rgba(196, 155, 63, 0.2) !important;
      overflow: hidden !important;
      position: relative !important;
      max-height: 90vh !important;
    }

    /* ---- Modal Header ---- */
    #alliyaModal .modal-header {
      background: linear-gradient(135deg, #c49b3f 0%, #e3c46a 30%, #c49b3f 60%, #a8842e 100%) !important;
      background-size: 200% 200% !important;
      animation: goldPulse 4s ease-in-out infinite !important;
      padding: 16px 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      position: relative !important;
      overflow: hidden !important;
    }

    #alliyaModal .modal-header::after {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: -100% !important;
      width: 200% !important;
      height: 100% !important;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent) !important;
      animation: goldShine 3s ease-in-out infinite !important;
    }

    @keyframes goldShine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    #alliyaModal .modal-header .header-left {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      position: relative !important;
      z-index: 1 !important;
    }

    #alliyaModal .modal-header .header-left img {
      width: 28px !important;
      height: 28px !important;
      border-radius: 6px !important;
      background: white !important;
      padding: 4px !important;
    }

    #alliyaModal .modal-header .header-left h2 {
      margin: 0 !important;
      font-size: 18px !important;
      font-weight: 700 !important;
      color: #111111 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }

    #alliyaModal .modal-header .close {
      color: #111111 !important;
      font-size: 28px !important;
      font-weight: 400 !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      position: relative !important;
      z-index: 1 !important;
      line-height: 1 !important;
      opacity: 0.7 !important;
      background: none !important;
      border: none !important;
      padding: 0 4px !important;
    }

    #alliyaModal .modal-header .close:hover {
      opacity: 1 !important;
      transform: rotate(90deg) !important;
    }

    /* ---- Modal Body ---- */
    #alliyaModal .alliya-box {
      padding: 20px 24px 24px !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      color: #222 !important;
      max-height: 75vh !important;
      overflow-y: auto !important;
    }

    #alliyaModal .alliya-box::-webkit-scrollbar {
      width: 4px !important;
    }
    #alliyaModal .alliya-box::-webkit-scrollbar-thumb {
      background: #c49b3f !important;
      border-radius: 10px !important;
    }
    #alliyaModal .alliya-box::-webkit-scrollbar-track {
      background: transparent !important;
    }

    /* ---- Intro ---- */
    #alliyaModal .alliya-intro {
      padding: 0 0 12px 0 !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
      color: #333 !important;
    }

    #alliyaModal .alliya-intro p {
      margin: 4px 0 !important;
    }

    #alliyaModal .alliya-intro strong {
      color: #a8842e !important;
    }

    /* ---- Input ---- */
    #alliyaModal .input-wrapper {
      position: relative !important;
      margin: 0 0 10px 0 !important;
    }

    #alliyaQuery {
      width: 100% !important;
      padding: 12px 16px !important;
      border-radius: 10px !important;
      border: 2px solid #e0e0e0 !important;
      font-size: 14px !important;
      outline: none !important;
      transition: all 0.3s ease !important;
      background: #fafafa !important;
      color: #222 !important;
      box-sizing: border-box !important;
      font-family: inherit !important;
    }

    #alliyaQuery:focus {
      border-color: #c49b3f !important;
      box-shadow: 0 0 0 4px rgba(196, 155, 63, 0.12) !important;
      background: #ffffff !important;
    }

    #alliyaQuery::placeholder {
      color: #aaa !important;
    }

    /* ---- Send Button ---- */
    #alliyaModal .send-btn {
      width: 100% !important;
      padding: 12px 16px !important;
      border-radius: 10px !important;
      border: none !important;
      background: linear-gradient(135deg, #c49b3f, #e3c46a) !important;
      color: #111111 !important;
      font-weight: 700 !important;
      font-size: 15px !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      font-family: inherit !important;
      margin: 0 0 4px 0 !important;
    }

    #alliyaModal .send-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 20px rgba(196, 155, 63, 0.4) !important;
    }

    #alliyaModal .send-btn:active {
      transform: scale(0.98) !important;
    }

    /* ---- Suggestions ---- */
    .suggestions {
      position: absolute !important;
      top: 48px !important;
      left: 0 !important;
      right: 0 !important;
      background: #ffffff !important;
      border: 1px solid #e0e0e0 !important;
      border-radius: 10px !important;
      z-index: 999999 !important;
      max-height: 200px !important;
      overflow-y: auto !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12) !important;
      display: none !important;
    }

    .suggestions.show {
      display: block !important;
    }

    .suggestions::-webkit-scrollbar {
      width: 4px !important;
    }
    .suggestions::-webkit-scrollbar-thumb {
      background: #c49b3f !important;
      border-radius: 10px !important;
    }

    .alliya-suggestion-item {
      padding: 10px 14px !important;
      font-size: 13px !important;
      cursor: pointer !important;
      border-bottom: 1px solid #f1f1f1 !important;
      color: #222 !important;
      transition: all 0.2s ease !important;
    }

    .alliya-suggestion-item:last-child {
      border-bottom: none !important;
    }

    .alliya-suggestion-item:hover {
      background: #f7f4eb !important;
      padding-left: 18px !important;
    }

    /* ---- Response ---- */
    .reply {
      margin-top: 14px !important;
      padding: 16px 16px 14px !important;
      border-radius: 12px !important;
      border: 1px solid #eee !important;
      background: #fafafa !important;
      font-size: 14px !important;
      line-height: 1.7 !important;
      max-height: 55vh !important;
      overflow-y: auto !important;
      display: none !important;
    }

    .reply.show {
      display: block !important;
    }

    .reply::-webkit-scrollbar {
      width: 4px !important;
    }
    .reply::-webkit-scrollbar-thumb {
      background: #c49b3f !important;
      border-radius: 10px !important;
    }

    .reply .alliya-block h2 {
      font-size: 17px !important;
      color: #a8842e !important;
      margin: 0 0 8px 0 !important;
      font-weight: 700 !important;
    }

    .reply .alliya-block h3 {
      font-size: 14px !important;
      color: #c49b3f !important;
      margin: 14px 0 4px 0 !important;
      font-weight: 600 !important;
    }

    .reply .alliya-block p {
      margin: 6px 0 !important;
    }

    .reply .alliya-block strong {
      color: #a8842e !important;
    }

    .reply .alliya-block a {
      color: #c49b3f !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      border-bottom: 2px solid rgba(196, 155, 63, 0.2) !important;
      padding-bottom: 1px !important;
      transition: all 0.2s ease !important;
      cursor: pointer !important;
    }

    .reply .alliya-block a:hover {
      color: #a8842e !important;
      border-bottom-color: #c49b3f !important;
    }

    .reply .alliya-block a[href*="whatsapp"],
    .reply .alliya-block a[href*="wa.me"] {
      color: #25D366 !important;
      border-bottom-color: rgba(37, 211, 102, 0.3) !important;
    }

    .reply .alliya-block a[href*="mailto"] {
      color: #D44638 !important;
      border-bottom-color: rgba(212, 70, 56, 0.3) !important;
    }

    .reply .alliya-block a[href*="tel"] {
      color: #1a73e8 !important;
      border-bottom-color: rgba(26, 115, 232, 0.3) !important;
    }

    .reply .alliya-cta {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
      gap: 10px !important;
      margin: 12px 0 8px 0 !important;
    }

    .reply .alliya-cta p {
      margin: 0 !important;
      padding: 12px 14px !important;
      background: rgba(196, 155, 63, 0.08) !important;
      border-radius: 10px !important;
      border-left: 3px solid #c49b3f !important;
      font-size: 13px !important;
    }

    .reply .alliya-cta p strong {
      color: #a8842e !important;
      display: block !important;
      margin-bottom: 4px !important;
      font-size: 13px !important;
    }

    .reply hr {
      border: none !important;
      border-top: 2px solid rgba(196, 155, 63, 0.15) !important;
      margin: 14px 0 !important;
    }

    .reply .alliya-footer-note {
      font-size: 12px !important;
      color: #888 !important;
      text-align: center !important;
      margin: 10px 0 0 0 !important;
      font-style: italic !important;
    }

    .reply .alliya-loading {
      color: #888 !important;
      font-style: italic !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .reply .alliya-loading::after {
      content: '...' !important;
      animation: dots 1.5s steps(4, end) infinite !important;
    }

    @keyframes dots {
      0% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
      100% { content: ''; }
    }

    /* ---- Responsive ---- */
    @media (max-width: 640px) {
      #alliyaModal .modal-content {
        margin: 20px 12px !important;
        max-width: 100% !important;
        border-radius: 14px !important;
      }

      #alliyaModal .alliya-box {
        padding: 16px 16px 20px !important;
        max-height: 80vh !important;
      }

      .reply {
        max-height: 50vh !important;
        padding: 12px 14px !important;
      }

      #alliyaFloatBtn {
        bottom: 16px !important;
        right: 16px !important;
        padding: 10px 14px !important;
        font-size: 13px !important;
      }

      #alliyaFloatBtn span {
        display: none !important;
      }

      #alliyaFloatBtn img {
        width: 22px !important;
        height: 22px !important;
      }

      #alliyaModal .modal-header {
        padding: 14px 16px !important;
      }

      #alliyaModal .modal-header .header-left h2 {
        font-size: 16px !important;
      }

      .reply .alliya-cta {
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
      }

      .reply .alliya-cta p {
        padding: 10px 12px !important;
        font-size: 12px !important;
      }

      #alliyaQuery {
        font-size: 13px !important;
        padding: 10px 14px !important;
      }

      #alliyaModal .send-btn {
        font-size: 14px !important;
        padding: 10px 14px !important;
      }

      .suggestions {
        top: 42px !important;
        max-height: 160px !important;
      }
    }

    @media (max-width: 400px) {
      .reply .alliya-cta {
        grid-template-columns: 1fr !important;
      }

      #alliyaModal .alliya-box {
        padding: 12px 12px 16px !important;
      }

      #alliyaModal .alliya-intro {
        font-size: 13px !important;
      }
    }
  `;

  // ============================================================
  // 2. REMOVE ALL EXISTING ALLIYA ELEMENTS
  // ============================================================
  function killAllExisting() {
    // Remove by ID
    const ids = ['alliyaModal', 'alliyaFloatBtn', 'alliyaResponse', 'alliyaSuggestions'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    // Remove any elements with .alliya-float, .modal, etc.
    document.querySelectorAll('.alliya-float, .modal, .alliya-box, .alliya-suggestion-item').forEach(el => {
      if (el.id !== 'alliyaModal' && el.id !== 'alliyaFloatBtn') {
        el.remove();
      }
    });

    // Remove any inline styles that might be conflicting
    document.querySelectorAll('style').forEach(el => {
      if (el.textContent && el.textContent.includes('alliya-float')) {
        el.remove();
      }
    });

    console.log('[Alliya] Cleaned up existing elements');
  }

  // ============================================================
  // 3. INJECT CSS
  // ============================================================
  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'alliya-styles';
    styleEl.textContent = ALLIYA_STYLES;
    document.head.appendChild(styleEl);
    console.log('[Alliya] Styles injected');
  }

  // ============================================================
  // 4. INJECT HTML
  // ============================================================
  function injectHTML() {
    const html = `
      <!-- Alliya Modal -->
      <div id="alliyaModal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="header-left">
              <img src="/assets/img/alliya-icon.ico" alt="Alliya" onerror="this.style.display='none'">
              <h2>Ask Alliya</h2>
            </div>
            <button class="close" id="alliyaCloseBtn">&times;</button>
          </div>
          <div class="alliya-box">
            <div class="alliya-intro" id="alliyaIntro"></div>
            <div class="input-wrapper">
              <input type="text" id="alliyaQuery" placeholder="Ask about products, suppliers, FCL, docs..." autocomplete="off">
              <div id="alliyaSuggestions" class="suggestions"></div>
            </div>
            <button class="send-btn" id="alliyaSendBtn">✨ Send Question</button>
            <div id="alliyaResponse" class="reply"></div>
          </div>
        </div>
      </div>

      <!-- Floating Button -->
      <div id="alliyaFloatBtn">
        <img src="/assets/img/alliya-icon.ico" alt="Alliya" onerror="this.style.display='none'">
        <span>Ask Alliya</span>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    console.log('[Alliya] HTML injected');
  }

  // ============================================================
  // 5. UTILITY FUNCTIONS
  // ============================================================
  function normalize(str) {
    return (str || '').toLowerCase().trim();
  }

  function autoLinkify(text) {
    if (!text) return '';
    let html = text;

    // WhatsApp
    html = html.replace(
      /(?:https?:\/\/)?(?:wa\.me|whatsapp\.com)\/([0-9]+)/gi,
      '<a href="https://wa.me/$1" target="_blank">📱 WhatsApp: $1</a>'
    );

    // Phone numbers
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

    // Email
    html = html.replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1">✉️ $1</a>'
    );

    // URLs
    html = html.replace(
      /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
      (match) => {
        const href = match.startsWith('www.') ? 'https://' + match : match;
        const display = match.length > 50 ? match.substring(0, 45) + '...' : match;
        return `<a href="${href}" target="_blank">🔗 ${display}</a>`;
      }
    );

    // File paths
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
  // 6. DATA LOADERS
  // ============================================================
  const STOCK_URL = '/assets/data/stock.json';
  const SUPPLIERS_URL = window.location.origin + '/assets/data/suppliers.json';
  const KNOWLEDGE_URL = window.location.origin + '/assets/data/alliya-knowledge.json';

  let stockCache = null;
  let suppliersCache = null;
  let knowledgeCache = null;

  async function loadStock() {
    if (!stockCache) {
      const res = await fetch(STOCK_URL, { cache: 'no-cache' });
      stockCache = await res.json();
    }
    return stockCache;
  }

  async function loadSuppliers() {
    if (!suppliersCache) {
      const res = await fetch(SUPPLIERS_URL, { cache: 'no-cache' });
      suppliersCache = await res.json();
    }
    return suppliersCache;
  }

  async function loadKnowledge() {
    if (!knowledgeCache) {
      const res = await fetch(KNOWLEDGE_URL, { cache: 'no-cache' });
      knowledgeCache = await res.json();
    }
    return knowledgeCache;
  }

  // ============================================================
  // 7. HELPERS
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
        name.includes(term) || origin.includes(term) || packaging.includes(term)
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
  // 8. BUILD RESPONSE
  // ============================================================
  function buildResponse(title, summary, sections = []) {
    const linkedSummary = autoLinkify(summary);
    let html = `<div class="alliya-block"><h2><strong>${title}</strong></h2><p>${linkedSummary}</p>`;

    sections.forEach(sec => {
      html += `<h3>${sec.heading}</h3><p>${autoLinkify(sec.body)}</p>`;
    });

    html += `
      </div>
      <hr>
      <div class="alliya-cta">
        <p><strong>📦 Browse Stock</strong><br><a href="https://grains.ae/shop" target="_blank">Open stock page</a></p>
        <p><strong>🚢 Book FCL</strong><br><a href="https://grains.ae/fcl/" target="_blank">Book full container</a></p>
        <p><strong>📊 Market Pulse</strong><br><a href="https://grains.ae/pulse/index.html" target="_blank">Open Market Pulse</a></p>
      </div>
      <hr>
      <p class="alliya-footer-note">All trade is executed through Ghutra Goods Wholesaler LLC under UAE wholesale regulations.</p>
    `;
    return html;
  }

  // ============================================================
  // 9. PERSONALITY
  // ============================================================
  function getPersonality(query) {
    const q = normalize(query);

    if (['hi', 'hello', 'hey', 'salam'].includes(q)) {
      return { title: '✨ Hello!', summary: "I'm Alliya, your grain trade assistant at Grains Hub. How can I help you today?" };
    }
    if (q.includes('who are you') || q.includes('who is alliya')) {
      return { title: '✨ About Alliya', summary: "I'm Alliya — Dubai's first AI grain assistant, built for verified grain trade." };
    }
    if (q.includes('what is alliya')) {
      return { title: '✨ Alliya – AI Assistant', summary: "I'm the official AI assistant of Grains Hub, helping with stock, suppliers, FCL, and compliance." };
    }
    if (q.includes('how are you')) {
      return { title: '✨ I\'m doing great!', summary: "Always ready to help you with grain trade." };
    }
    if (q.includes('thank')) {
      return { title: '✨ You\'re welcome!', summary: "Happy to help anytime." };
    }
    if (q.includes('shahid')) {
      return { title: '✨ About Shahid Bashir', summary: "Founder of Grains Hub, GhutraTech, and Ghutra Goods Wholesaler LLC." };
    }
    if (q.includes('dubai') || q.includes('al ras') || q.includes('deira')) {
      return { title: '✨ Dubai & Al Ras', summary: "Grains Hub operates from Al Ras, Deira — Dubai's historic wholesale grain district." };
    }
    return null;
  }

  // ============================================================
  // 10. RECOVER
  // ============================================================
  function recover(type, detail = '') {
    const responses = {
      empty: { title: '✨ I\'m here to help', summary: 'Please type a question so I can assist you.' },
      network: { title: '⚠️ Connection issue', summary: 'I couldn\'t load live data. Please try again.' },
      unknown: { title: '✨ I\'m here to help', summary: `I couldn't find a match for "${detail}". Try asking about stock, suppliers, FCL, or docs.` },
    };
    return responses[type] || responses.unknown;
  }

  // ============================================================
  // 11. SUGGESTIONS
  // ============================================================
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
      const [stock, suppliers, knowledge] = await Promise.all([loadStock(), loadSuppliers(), loadKnowledge()]);
      const suggestions = new Set();

      stock.forEach(item => {
        if (normalize(item.name).includes(query)) suggestions.add(item.name);
      });
      suppliers.forEach(s => {
        if (normalize(s.name).includes(query)) suggestions.add(`show ${s.name.toLowerCase()} profile`);
      });
      knowledge.forEach(k => {
        if (normalize(k.question).includes(query)) suggestions.add(k.question);
      });

      ['fcl', 'stock', 'supplier', 'market', 'pulse', 'docs', 'compliance', 'rice'].forEach(i => {
        if (i.includes(query)) suggestions.add(i);
      });
      ['hi', 'hello', 'hey', 'who is alliya', 'what is alliya'].forEach(g => {
        if (g.includes(query)) suggestions.add(g);
      });

      const list = Array.from(suggestions).slice(0, 8);
      if (list.length === 0) {
        box.innerHTML = '';
        box.classList.remove('show');
        return;
      }

      box.innerHTML = list.map(text =>
        `<div class="alliya-suggestion-item" data-suggestion="${text.replace(/'/g, "\\'").replace(/"/g, '&quot;')}">${text}</div>`
      ).join('');
      box.classList.add('show');

      box.querySelectorAll('.alliya-suggestion-item').forEach(el => {
        el.addEventListener('click', function() {
          const input = document.getElementById('alliyaQuery');
          if (input) input.value = this.dataset.suggestion;
          box.classList.remove('show');
          setTimeout(askAlliya, 200);
        });
      });

    } catch (err) {
      box.innerHTML = '';
      box.classList.remove('show');
    }
  }

  // ============================================================
  // 12. MAIN ENGINE
  // ============================================================
  async function askAlliya() {
    const replyBox = document.getElementById('alliyaResponse');
    const input = document.getElementById('alliyaQuery');
    if (!replyBox || !input) return;

    const userQuery = input.value.trim();
    if (!userQuery) {
      const err = recover('empty');
      replyBox.innerHTML = buildResponse(err.title, err.summary);
      replyBox.classList.add('show');
      return;
    }

    replyBox.innerHTML = '<span class="alliya-loading">⏳ Alliya is checking</span>';
    replyBox.classList.add('show');

    const q = normalize(userQuery);
    const terms = q.split(/\s+/).filter(Boolean);

    try {
      const [stock, suppliers, knowledge] = await Promise.all([loadStock(), loadSuppliers(), loadKnowledge()]);

      // Personality
      const personality = getPersonality(userQuery);
      if (personality) {
        replyBox.innerHTML = buildResponse(personality.title, personality.summary);
        return;
      }

      // Knowledge
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
        replyBox.innerHTML = buildResponse('✨ Your Answer', kbMatch.answer, [{ heading: 'Details', body: kbMatch.answer }]);
        return;
      }

      // Stock
      const stockMatches = findStockMatches(stock, terms);
      if (stockMatches.length > 0) {
        const primary = stockMatches[0];
        const supplier = findSupplierForProduct(suppliers, primary.name);
        const isBooking = String(primary.price).toUpperCase().includes('USD');
        const priceRaw = parseFloat(primary.price);
        const sizeKG = parseInt(primary.size);
        const pricePerKg = (!isNaN(priceRaw) && !isNaN(sizeKG)) ? (priceRaw / sizeKG).toFixed(2) : null;
        const originFlag = normalize(primary.origin).includes('india') ? '🇮🇳' :
          normalize(primary.origin).includes('pakistan') ? '🇵🇰' :
          normalize(primary.origin).includes('thailand') ? '🇹🇭' : '🌍';

        replyBox.innerHTML = buildResponse(
          `${originFlag} ${primary.name}`,
          `${primary.name} is available in live stock.`,
          [
            { heading: '📋 Product overview', body: `<strong>Origin:</strong> ${primary.origin}<br><strong>Packaging:</strong> ${primary.packaging || 'Standard bags'}<br><strong>Stock:</strong> ${primary.stock || 'Prompt shipment'}` },
            { heading: '💰 Pricing', body: isBooking ? `${primary.price} (Booking / FOB or C&F)` : `${primary.price} / ${primary.size}kg${pricePerKg ? ` → ${pricePerKg} AED/kg` : ''}` },
            { heading: '🏢 Supplier', body: supplier ? `${supplier.name} (${supplier.badge}) – ${supplier.city}, ${supplier.country}` : `${primary.badge || 'Verified Supplier'}` }
          ]
        );
        return;
      }

      // Supplier
      const supplierMatch = suppliers.find(s => normalize(s.name).includes(q));
      if (supplierMatch) {
        replyBox.innerHTML = buildResponse(
          `🏅 Verified Supplier: ${supplierMatch.name}`,
          `${supplierMatch.name} is a verified supplier listed on Grains Hub.`,
          [{ heading: '📋 Supplier details', body: `<strong>Location:</strong> ${supplierMatch.city}, ${supplierMatch.country}<br><strong>Badge:</strong> ${supplierMatch.badge}<br><strong>Products:</strong> ${Array.isArray(supplierMatch.products) ? supplierMatch.products.join(', ') : 'Listed products'}` }]
        );
        return;
      }

      // Intent routing
      const intent = q;
      if (intent.includes('supplier')) {
        replyBox.innerHTML = buildResponse('🏢 Supplier Directory', 'Browse all verified suppliers.', [{ heading: '🔗 Open directory', body: '<a href="https://grains.ae/suppliers/" target="_blank">View suppliers</a>' }]);
        return;
      }
      if (intent.includes('market') || intent.includes('pulse')) {
        replyBox.innerHTML = buildResponse('📊 Market Pulse', 'Live grain pricing updated every 60 seconds.', [{ heading: '🔗 Open Market Pulse', body: '<a href="https://grains.ae/pulse/index.html" target="_blank">Open Market Pulse</a>' }]);
        return;
      }
      if (intent.includes('fcl') || intent.includes('container')) {
        replyBox.innerHTML = buildResponse('🚢 FCL Booking', 'Submit your full container load requirement instantly.', [{ heading: '🔗 Book shipment', body: '<a href="https://grains.ae/fcl/" target="_blank">Book FCL shipment</a>' }]);
        return;
      }
      if (intent.includes('compliance')) {
        replyBox.innerHTML = buildResponse('📄 Compliance & Verification', 'Download the official compliance guide.', [{ heading: '🔗 Download guide', body: '<a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a>' }]);
        return;
      }
      if (intent.includes('stock')) {
        replyBox.innerHTML = buildResponse('📦 Live Stock', 'Browse all available stock.', [{ heading: '🔗 Open stock', body: '<a href="https://grains.ae/shop" target="_blank">Open stock page</a>' }]);
        return;
      }
      if (intent.includes('docs') || intent.includes('documentation')) {
        replyBox.innerHTML = buildResponse('📄 Documentation Hub', 'All official documents are available below.', [{
          heading: '📚 Downloads',
          body: '<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank">Buyer Pack</a><br><a href="https://grains.ae/docs/supplier-onboarding-pack.pdf" target="_blank">Supplier Onboarding Pack</a><br><a href="https://grains.ae/docs/fcl-guide.pdf" target="_blank">FCL Guide</a><br><a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a>'
        }]);
        return;
      }
      if (intent.includes('buyer pack')) {
        replyBox.innerHTML = buildResponse('📄 Buyer Pack', 'Download the official Buyer Pack.', [{ heading: '🔗 Download', body: '<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank">Buyer Pack</a>' }]);
        return;
      }

      // Fallback
      const err = recover('unknown', userQuery);
      replyBox.innerHTML = buildResponse(err.title, err.summary, [{
        heading: '💡 Try asking about:',
        body: '• Products (1121 Sella, IRRI 6, 1509, etc.)<br>• Suppliers<br>• FCL booking<br>• Documentation<br>• Compliance<br>• Market prices'
      }]);

    } catch (err) {
      console.error('[Alliya] Error:', err);
      const errPack = recover('network');
      replyBox.innerHTML = buildResponse(errPack.title, errPack.summary);
    }
  }

  // ============================================================
  // 13. MODAL CONTROLS
  // ============================================================
  function openModal() {
    const modal = document.getElementById('alliyaModal');
    const intro = document.getElementById('alliyaIntro');
    const reply = document.getElementById('alliyaResponse');

    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active');
    }
    if (intro) {
      intro.innerHTML = `<p><strong>✨ Hello!</strong> I'm Alliya, your grain trade assistant at Grains Hub.</p><p>Ask me about stock, suppliers, FCL booking, compliance, or documentation.</p>`;
    }
    if (reply) {
      reply.classList.remove('show');
      reply.innerHTML = '';
    }
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('alliyaQuery')?.focus(), 400);
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
  // 14. SETUP EVENT LISTENERS
  // ============================================================
  function setupEvents() {
    // Float button
    document.getElementById('alliyaFloatBtn')?.addEventListener('click', openModal);

    // Close button
    document.getElementById('alliyaCloseBtn')?.addEventListener('click', closeModal);

    // Send button
    document.getElementById('alliyaSendBtn')?.addEventListener('click', askAlliya);

    // Input
    const input = document.getElementById('alliyaQuery');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          askAlliya();
        }
      });
      input.addEventListener('input', showSuggestions);
      input.addEventListener('blur', () => {
        setTimeout(() => document.getElementById('alliyaSuggestions')?.classList.remove('show'), 300);
      });
    }

    // Modal backdrop
    document.getElementById('alliyaModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('alliyaModal');
        if (modal && modal.style.display === 'block') closeModal();
      }
    });

    console.log('[Alliya] Events set up');
  }

  // ============================================================
  // 15. INIT
  // ============================================================
  function init() {
    killAllExisting();
    injectStyles();
    injectHTML();
    setupEvents();

    console.log('%c✨ Alliya v8.2 - Self-Contained Gold Edition', 'font-size:20px; font-weight:bold; color:#c49b3f;');
    console.log('%c💡 Click the gold button to open', 'font-size:14px; color:#a8842e;');
    console.log('%c🔗 All links, emails, and phone numbers are clickable!', 'font-size:13px; color:#c49b3f;');

    // Auto-open on first visit (optional - remove if you don't want this)
    // setTimeout(openModal, 1000);
  }

  // ============================================================
  // 16. START
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globally
  window.Alliya = {
    ask: askAlliya,
    open: openModal,
    close: closeModal,
    version: '8.2'
  };

})();
