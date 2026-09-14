/* ============================================================
   ALLIYA v9.2.1 - Scoped Gold Procurement Edition
   Preserves the complete Gold Scope UI/animation
   Canonical market-price layer + deterministic procurement matching
   No silent commercial/spec defaults
   ============================================================ */

(function AlliyaV8() {
  'use strict';

  // ============================================================
  // 1. SCOPED CSS (Only affects #alliyaModal and #alliyaFloatBtn)
  // ============================================================
  const ALLIYA_STYLES = `
    /* ============================================================
       ALLIYA v9.2.1 - Scoped Gold Styles
       Only affects elements with #alliyaModal and #alliyaFloatBtn
       ============================================================ */
    
    /* ---- Floating Button (Scoped) ---- */
    #alliyaFloatBtn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 999999;
      background: linear-gradient(135deg, #c49b3f 0%, #e3c46a 30%, #c49b3f 60%, #a8842e 100%);
      background-size: 200% 200%;
      color: #111111;
      padding: 12px 22px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(196, 155, 63, 0.4);
      border: 2px solid #c49b3f;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: alliyaGoldPulse 2.5s ease-in-out infinite;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
    }

    #alliyaFloatBtn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 12px 48px rgba(196, 155, 63, 0.6);
      animation-play-state: paused;
    }

    #alliyaFloatBtn img {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: white;
      padding: 3px;
    }

    @keyframes alliyaGoldPulse {
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

    /* ---- Modal (Scoped) ---- */
    #alliyaModal {
      display: none;
      position: fixed;
      z-index: 999998;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      animation: alliyaModalFadeIn 0.3s ease;
    }

    #alliyaModal.active {
      display: block;
    }

    @keyframes alliyaModalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    #alliyaModal .alliya-modal-content {
      background: #ffffff;
      margin: 40px auto;
      padding: 0;
      border-radius: 16px;
      max-width: 560px;
      width: 92%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(196, 155, 63, 0.2);
      overflow: hidden;
      position: relative;
      max-height: 90vh;
    }

    /* ---- Modal Header (Scoped) ---- */
    #alliyaModal .alliya-modal-header {
      background: linear-gradient(135deg, #c49b3f 0%, #e3c46a 30%, #c49b3f 60%, #a8842e 100%);
      background-size: 200% 200%;
      animation: alliyaGoldPulse 4s ease-in-out infinite;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    #alliyaModal .alliya-modal-header::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 200%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
      animation: alliyaGoldShine 3s ease-in-out infinite;
    }

    @keyframes alliyaGoldShine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    #alliyaModal .alliya-modal-header .alliya-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    #alliyaModal .alliya-modal-header .alliya-header-left img {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: white;
      padding: 4px;
    }

    #alliyaModal .alliya-modal-header .alliya-header-left h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #111111;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #alliyaModal .alliya-modal-header .alliya-close-btn {
      color: #111111;
      font-size: 28px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      z-index: 1;
      line-height: 1;
      opacity: 0.7;
      background: none;
      border: none;
      padding: 0 4px;
    }

    #alliyaModal .alliya-modal-header .alliya-close-btn:hover {
      opacity: 1;
      transform: rotate(90deg);
    }

    /* ---- Modal Body (Scoped) ---- */
    #alliyaModal .alliya-box {
      padding: 20px 24px 24px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #222;
      max-height: 75vh;
      overflow-y: auto;
    }

    #alliyaModal .alliya-box::-webkit-scrollbar {
      width: 4px;
    }
    #alliyaModal .alliya-box::-webkit-scrollbar-thumb {
      background: #c49b3f;
      border-radius: 10px;
    }
    #alliyaModal .alliya-box::-webkit-scrollbar-track {
      background: transparent;
    }

    /* ---- Intro (Scoped) ---- */
    #alliyaModal .alliya-intro {
      padding: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }

    #alliyaModal .alliya-intro p {
      margin: 4px 0;
    }

    #alliyaModal .alliya-intro strong {
      color: #a8842e;
    }

    /* ---- Input (Scoped) ---- */
    #alliyaModal .alliya-input-wrapper {
      position: relative;
      margin: 0 0 10px 0;
    }

    #alliyaModal #alliyaQuery {
      width: 100%;
      padding: 12px 16px;
      border-radius: 10px;
      border: 2px solid #e0e0e0;
      font-size: 14px;
      outline: none;
      transition: all 0.3s ease;
      background: #fafafa;
      color: #222;
      box-sizing: border-box;
      font-family: inherit;
    }

    #alliyaModal #alliyaQuery:focus {
      border-color: #c49b3f;
      box-shadow: 0 0 0 4px rgba(196, 155, 63, 0.12);
      background: #ffffff;
    }

    #alliyaModal #alliyaQuery::placeholder {
      color: #aaa;
    }

    /* ---- Send Button (Scoped) ---- */
    #alliyaModal .alliya-send-btn {
      width: 100%;
      padding: 12px 16px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #c49b3f, #e3c46a);
      color: #111111;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: inherit;
      margin: 0 0 4px 0;
    }

    #alliyaModal .alliya-send-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(196, 155, 63, 0.4);
    }

    #alliyaModal .alliya-send-btn:active {
      transform: scale(0.98);
    }

    /* ---- Suggestions (Scoped) ---- */
    #alliyaModal .alliya-suggestions {
      position: absolute;
      top: 48px;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      z-index: 999999;
      max-height: 200px;
      overflow-y: auto;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      display: none;
    }

    #alliyaModal .alliya-suggestions.show {
      display: block;
    }

    #alliyaModal .alliya-suggestions::-webkit-scrollbar {
      width: 4px;
    }
    #alliyaModal .alliya-suggestions::-webkit-scrollbar-thumb {
      background: #c49b3f;
      border-radius: 10px;
    }

    #alliyaModal .alliya-suggestion-item {
      padding: 10px 14px;
      font-size: 13px;
      cursor: pointer;
      border-bottom: 1px solid #f1f1f1;
      color: #222;
      transition: all 0.2s ease;
    }

    #alliyaModal .alliya-suggestion-item:last-child {
      border-bottom: none;
    }

    #alliyaModal .alliya-suggestion-item:hover {
      background: #f7f4eb;
      padding-left: 18px;
    }

    /* ---- Response (Scoped) ---- */
    #alliyaModal .alliya-reply {
      margin-top: 14px;
      padding: 16px 16px 14px;
      border-radius: 12px;
      border: 1px solid #eee;
      background: #fafafa;
      font-size: 14px;
      line-height: 1.7;
      max-height: 55vh;
      overflow-y: auto;
      display: none;
    }

    #alliyaModal .alliya-reply.show {
      display: block;
    }

    #alliyaModal .alliya-reply::-webkit-scrollbar {
      width: 4px;
    }
    #alliyaModal .alliya-reply::-webkit-scrollbar-thumb {
      background: #c49b3f;
      border-radius: 10px;
    }

    #alliyaModal .alliya-reply .alliya-block h2 {
      font-size: 17px;
      color: #a8842e;
      margin: 0 0 8px 0;
      font-weight: 700;
    }

    #alliyaModal .alliya-reply .alliya-block h3 {
      font-size: 14px;
      color: #c49b3f;
      margin: 14px 0 4px 0;
      font-weight: 600;
    }

    #alliyaModal .alliya-reply .alliya-block p {
      margin: 6px 0;
    }

    #alliyaModal .alliya-reply .alliya-block strong {
      color: #a8842e;
    }

    #alliyaModal .alliya-reply .alliya-block a {
      color: #c49b3f;
      font-weight: 600;
      text-decoration: none;
      border-bottom: 2px solid rgba(196, 155, 63, 0.2);
      padding-bottom: 1px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    #alliyaModal .alliya-reply .alliya-block a:hover {
      color: #a8842e;
      border-bottom-color: #c49b3f;
    }

    #alliyaModal .alliya-reply .alliya-block a[href*="whatsapp"],
    #alliyaModal .alliya-reply .alliya-block a[href*="wa.me"] {
      color: #25D366;
      border-bottom-color: rgba(37, 211, 102, 0.3);
    }

    #alliyaModal .alliya-reply .alliya-block a[href*="mailto"] {
      color: #D44638;
      border-bottom-color: rgba(212, 70, 56, 0.3);
    }

    #alliyaModal .alliya-reply .alliya-block a[href*="tel"] {
      color: #1a73e8;
      border-bottom-color: rgba(26, 115, 232, 0.3);
    }

    #alliyaModal .alliya-reply .alliya-cta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin: 12px 0 8px 0;
    }

    #alliyaModal .alliya-reply .alliya-cta p {
      margin: 0;
      padding: 12px 14px;
      background: rgba(196, 155, 63, 0.08);
      border-radius: 10px;
      border-left: 3px solid #c49b3f;
      font-size: 13px;
    }

    #alliyaModal .alliya-reply .alliya-cta p strong {
      color: #a8842e;
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
    }

    #alliyaModal .alliya-reply hr {
      border: none;
      border-top: 2px solid rgba(196, 155, 63, 0.15);
      margin: 14px 0;
    }

    #alliyaModal .alliya-reply .alliya-footer-note {
      font-size: 12px;
      color: #888;
      text-align: center;
      margin: 10px 0 0 0;
      font-style: italic;
    }

    #alliyaModal .alliya-reply .alliya-loading {
      color: #888;
      font-style: italic;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #alliyaModal .alliya-reply .alliya-loading::after {
      content: '...';
      animation: alliyaDots 1.5s steps(4, end) infinite;
    }

    @keyframes alliyaDots {
      0% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
      100% { content: ''; }
    }


    /* ---- Response reveal / trade-desk rhythm ---- */
    #alliyaModal .alliya-reply.alliya-reveal {
      animation: alliyaReplyReveal 0.42s cubic-bezier(0.22, 1, 0.36, 1);
      transform-origin: top center;
    }

    @keyframes alliyaReplyReveal {
      0% { opacity: 0; transform: translateY(10px) scale(0.985); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    #alliyaModal .alliya-ready-state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 2px 0 10px;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(196, 155, 63, 0.08);
      color: #8f6e20;
      font-size: 11px;
      font-weight: 700;
    }

    #alliyaModal .alliya-ready-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #c49b3f;
      box-shadow: 0 0 0 0 rgba(196,155,63,0.35);
      animation: alliyaReadyPulse 1.8s infinite;
    }

    @keyframes alliyaReadyPulse {
      0% { box-shadow: 0 0 0 0 rgba(196,155,63,0.35); }
      70% { box-shadow: 0 0 0 6px rgba(196,155,63,0); }
      100% { box-shadow: 0 0 0 0 rgba(196,155,63,0); }
    }

    /* ---- Responsive (Scoped) ---- */
    @media (max-width: 640px) {
      #alliyaModal .alliya-modal-content {
        margin: 20px 12px;
        max-width: 100%;
        border-radius: 14px;
      }

      #alliyaModal .alliya-box {
        padding: 16px 16px 20px;
        max-height: 80vh;
      }

      #alliyaModal .alliya-reply {
        max-height: 50vh;
        padding: 12px 14px;
      }

      #alliyaFloatBtn {
        bottom: 16px;
        right: 16px;
        padding: 10px 14px;
        font-size: 13px;
      }

      #alliyaFloatBtn span {
        display: none;
      }

      #alliyaFloatBtn img {
        width: 22px;
        height: 22px;
      }

      #alliyaModal .alliya-modal-header {
        padding: 14px 16px;
      }

      #alliyaModal .alliya-modal-header .alliya-header-left h2 {
        font-size: 16px;
      }

      #alliyaModal .alliya-reply .alliya-cta {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      #alliyaModal .alliya-reply .alliya-cta p {
        padding: 10px 12px;
        font-size: 12px;
      }

      #alliyaModal #alliyaQuery {
        font-size: 13px;
        padding: 10px 14px;
      }

      #alliyaModal .alliya-send-btn {
        font-size: 14px;
        padding: 10px 14px;
      }

      #alliyaModal .alliya-suggestions {
        top: 42px;
        max-height: 160px;
      }
    }

    @media (max-width: 400px) {
      #alliyaModal .alliya-reply .alliya-cta {
        grid-template-columns: 1fr;
      }

      #alliyaModal .alliya-box {
        padding: 12px 12px 16px;
      }

      #alliyaModal .alliya-intro {
        font-size: 13px;
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

    // Remove any elements with Alliya classes
    document.querySelectorAll('.alliya-float, .alliya-modal, .alliya-box, .alliya-suggestion-item, .alliya-reply').forEach(el => {
      if (!el.id || !el.id.startsWith('alliya')) {
        el.remove();
      }
    });

    // Remove any Alliya style tags
    document.querySelectorAll('style').forEach(el => {
      if (el.id === 'alliya-styles' || (el.textContent && el.textContent.includes('alliyaGoldPulse'))) {
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
    console.log('[Alliya] Scoped styles injected');
  }

  // ============================================================
  // 4. INJECT HTML (All classes prefixed with 'alliya-')
  // ============================================================
  function injectHTML() {
    const html = `
      <!-- Alliya Modal -->
      <div id="alliyaModal">
        <div class="alliya-modal-content">
          <div class="alliya-modal-header">
            <div class="alliya-header-left">
              <img src="/assets/img/alliya-icon.ico" alt="Alliya" onerror="this.style.display='none'">
              <h2>Ask Alliya</h2>
            </div>
            <button class="alliya-close-btn" id="alliyaCloseBtn">&times;</button>
          </div>
          <div class="alliya-box">
            <div class="alliya-intro" id="alliyaIntro"></div>
            <div class="alliya-ready-state" id="alliyaReadyState">
              <span class="alliya-ready-dot"></span>
              <span id="alliyaReadyText">Connecting to live trade data…</span>
            </div>
            <div class="alliya-input-wrapper">
              <input type="text" id="alliyaQuery" placeholder="Ask about products, suppliers, FCL, docs..." autocomplete="off">
              <div id="alliyaSuggestions" class="alliya-suggestions"></div>
            </div>
            <button class="alliya-send-btn" id="alliyaSendBtn">✨ Send Question</button>
            <div id="alliyaResponse" class="alliya-reply"></div>
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
    console.log('[Alliya] HTML injected with scoped classes');
  }

  // ============================================================
  // 5. UTILITY FUNCTIONS
  // ============================================================
  function normalize(str) {
    return (str || '').toLowerCase().trim();
  }

  // ============================================================
  // 5a. AUTO-LINKIFY - FIXED (Prevents double-wrapping)
  // ============================================================
  function autoLinkify(text) {
    if (!text) return '';

    // If text already contains HTML anchor tags, return as-is (already linked)
    if (/<a\s+[^>]*>.*?<\/a>/i.test(text)) {
      return text;
    }

    let html = text;

    // 1. WhatsApp links
    html = html.replace(
      /(?:https?:\/\/)?(?:wa\.me|whatsapp\.com)\/([0-9]+)/gi,
      '<a href="https://wa.me/$1" target="_blank" class="whatsapp-link">📱 WhatsApp: $1</a>'
    );

    // 2. Phone numbers
    html = html.replace(
      /(\+?[0-9]{1,4}[-.\s]?)?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g,
      function(match) {
        const clean = match.replace(/[\s\-()]/g, '');
        if (clean.length >= 7) {
          return `<a href="tel:${clean}" class="phone-link">📞 ${match}</a>`;
        }
        return match;
      }
    );

    // 3. Email addresses
    html = html.replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1" class="email-link">✉️ $1</a>'
    );

    // 4. URLs (http, https, www) - skip if already wrapped
    html = html.replace(
      /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi,
      function(match) {
        // Skip if already inside an <a> tag
        const href = match.startsWith('www.') ? 'https://' + match : match;
        const display = match.length > 50 ? match.substring(0, 45) + '...' : match;
        return `<a href="${href}" target="_blank" class="clickable-link">🔗 ${display}</a>`;
      }
    );

    // 5. File paths - clean handling (avoid double-wrapping)
    html = html.replace(
      /(\/[^\s<]+\.(pdf|doc|docx|xls|xlsx|json|csv|txt))/gi,
      function(match) {
        // Check if match is already inside an anchor tag
        if (/<a\s+[^>]*>/.test(html)) {
          return match;
        }
        const filename = match.split('/').pop();
        return `<a href="${match}" target="_blank" class="clickable-link">📄 ${filename}</a>`;
      }
    );

    // 6. Clean up any orphaned target="_blank" or duplicate link text
    html = html.replace(/"" target="_blank"/g, '');
    html = html.replace(/https?:\/\/[^\s"]+(?=\s*["\'])/g, '');

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
  let marketQuoteCache = null;
  let dataReadyPromise = null;

  const MARKET_QUOTE_URL = '/assets/data/indiaMarketQuote_2026-09-14.json';

  async function loadMarketQuotes() {
    if (!marketQuoteCache) {
      const res = await fetch(MARKET_QUOTE_URL + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Market quote HTTP ' + res.status);
      const json = await res.json();
      marketQuoteCache = Array.isArray(json) ? json : (Array.isArray(json.records) ? json.records : []);
    }
    return marketQuoteCache;
  }

  async function preloadAlliyaData() {
    if (dataReadyPromise) return dataReadyPromise;

    dataReadyPromise = (async () => {
      const results = await Promise.allSettled([
        (window.GrainsHubData && window.GrainsHubData.ready)
          ? window.GrainsHubData.ready()
          : Promise.resolve(null),
        loadStock(),
        loadSuppliers(),
        loadKnowledge(),
        loadMarketQuotes()
      ]);

      const failures = results.filter(r => r.status === 'rejected');
      const hasAny =
        !!(window.GrainsHubData && window.GrainsHubData.state &&
            ((window.GrainsHubData.state.products || []).length ||
             (window.GrainsHubData.state.quotes || []).length)) ||
        !!stockCache || !!marketQuoteCache || !!suppliersCache || !!knowledgeCache;

      if (!hasAny && failures.length) {
        throw failures[0].reason || new Error('Alliya data unavailable');
      }

      const readyText = document.getElementById('alliyaReadyText');
      if (readyText) {
        readyText.textContent = 'Live trade data ready';
      }

      return {
        stock: stockCache || [],
        suppliers: suppliersCache || [],
        knowledge: knowledgeCache || [],
        marketQuotes: marketQuoteCache || [],
        failures
      };
    })().catch(err => {
      const readyText = document.getElementById('alliyaReadyText');
      if (readyText) readyText.textContent = 'Trade data connection needs attention';
      throw err;
    });

    return dataReadyPromise;
  }

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
  // 8. BUILD RESPONSE - FIXED (uses updated autoLinkify)
  // ============================================================
  function buildResponse(title, summary, sections = []) {
    const linkedSummary = autoLinkify(summary);
    let html = `<div class="alliya-block"><h2><strong>${title}</strong></h2><p>${linkedSummary}</p>`;

    sections.forEach(sec => {
      const linkedBody = autoLinkify(sec.body);
      html += `<h3>${sec.heading}</h3><p>${linkedBody}</p>`;
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

      (marketQuoteCache || []).forEach(q => {
        const label = `${q.variety} ${q.processing}`;
        if (normalize(label).includes(query)) suggestions.add(label);
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
  function setReply(replyBox, html) {
    if (!replyBox) return;
    replyBox.classList.remove('alliya-reveal');
    void replyBox.offsetWidth;
    replyBox.innerHTML = html;
    replyBox.classList.add('show', 'alliya-reveal');
  }

  function marketQuoteIntent(q) {
    const lower = normalize(q);
    return (
      lower.includes('price') ||
      lower.includes('rate') ||
      lower.includes('quote') ||
      lower.includes('market') ||
      lower.includes('fob') ||
      lower.includes('india price') ||
      lower.includes('today')
    );
  }

  function hasKnownMarketIdentity(q) {
    const s = normalize(q).replace(/[^a-z0-9]+/g, '');
    return [
      'pr1114','pr11','pr14','pr106','pr47','pr26',
      '1121','1509','1718','1847','1885','1401',
      'pusa','sugandha','sharbati','rh10','taj',
      'sonamasoori','ir64'
    ].some(v => s.includes(v));
  }

  function findMarketRows(q) {
    if (window.GrainsHubData && typeof window.GrainsHubData.findMarketQuotes === 'function') {
      return window.GrainsHubData.findMarketQuotes(q);
    }

    const query = normalize(q).replace(/[^a-z0-9]+/g, ' ').trim();
    const compactQ = query.replace(/\s+/g, '');

    return (marketQuoteCache || []).filter(row => {
      const variety = normalize(row.variety).replace(/[^a-z0-9]+/g, '');
      const processing = normalize(row.processing);
      const matchVariety = compactQ.includes(variety) || variety.includes(compactQ);
      const matchProcessing = !(
        query.includes('golden') || query.includes('steam') ||
        query.includes('sella') || query.includes('raw') ||
        query.includes('parboil')
      ) || processing.split(/\s+/).some(x => query.includes(x));
      return matchVariety && matchProcessing;
    });
  }

  function marketQuoteResponse(q, rows) {
    if (!rows || !rows.length) return null;

    const exactProcessing =
      normalize(q).includes('golden') ? 'Golden Sella' :
      normalize(q).includes('lemon') ? 'Lemon Sella' :
      (normalize(q).includes('white sella') || normalize(q).includes('creamy')) ? 'White Sella' :
      normalize(q).includes('parboil') ? 'Parboiled' :
      normalize(q).includes('steam') ? 'Steam' :
      /\bsella\b/i.test(q) ? 'Sella' :
      /\braw\b/i.test(q) ? 'Raw' : null;

    if (!exactProcessing && rows.length > 1) {
      const first = rows[0];
      const list = rows.slice(0, 6).map(r =>
        `• <strong>${r.variety} ${r.processing}</strong> — <strong>USD ${Number(r.priceUSDPerMT).toLocaleString()}</strong> / MT FOB India Port`
      ).join('<br>');

      return buildResponse(
        `🇮🇳 ${first.variety} — India Market`,
        `Latest Amafhh International FOB India Port observation dated <strong>14 September 2026</strong>.`,
        [
          { heading: '💰 Current quote', body: list },
          { heading: '📦 Quote basis', body: '<strong>50 KG White PP Bag</strong> • FOB India Port • COC not included • CIF/freight quoted separately by destination.' },
          { heading: '⚠️ Trade note', body: 'This is an origin-market observation. It is <strong>not</strong> a Dubai CIF price, and Alliya does not add freight to it.' }
        ]
      );
    }

    let row = rows[0];
    if (exactProcessing) {
      const exact = rows.find(r => normalize(r.processing) === normalize(exactProcessing));
      if (exact) row = exact;
    }

    const crop = row.crop ? ` • Crop ${row.crop}` : '';
    const price = Number(row.priceUSDPerMT).toLocaleString(undefined, { maximumFractionDigits: 2 });

    return buildResponse(
      `🇮🇳 ${row.variety} ${row.processing}`,
      `Latest observed supplier quote: <strong>USD ${price} / MT</strong> FOB India Port${crop}.`,
      [
        {
          heading: '💰 Price',
          body: `<strong>USD ${price} / MT</strong><br>Basis: <strong>FOB India Port</strong><br>Packing: <strong>${row.packing || '50 KG White PP Bag'}</strong>`
        },
        {
          heading: '🏢 Source',
          body: `<strong>${row.supplier || 'Supplier quote'}</strong> • ${row.sourceDocument || 'FOB Rice Price Offer – India'} • ${row.quoteDate || '14 September 2026'}`
        },
        {
          heading: '🚢 CIF / freight',
          body: 'Not included in this FOB number. Freight/CIF must be quoted separately for the destination. <strong>No freight is added automatically.</strong>'
        }
      ]
    );
  }

  async function askAlliya() {
    const replyBox = document.getElementById('alliyaResponse');
    const input = document.getElementById('alliyaQuery');
    if (!replyBox || !input) return;

    const userQuery = input.value.trim();
    if (!userQuery) {
      const err = recover('empty');
      setReply(replyBox, buildResponse(err.title, err.summary));
      return;
    }

    // Capture then clear immediately so the next question is ready.
    input.value = '';
    document.getElementById('alliyaSuggestions')?.classList.remove('show');

    replyBox.innerHTML = '<span class="alliya-loading">⏳ Alliya is checking live trade data</span>';
    replyBox.classList.add('show');
    replyBox.classList.remove('alliya-reveal');

    try {
      await preloadAlliyaData();

      const q = normalize(userQuery);

      // Personality first.
      const personality = getPersonality(userQuery);
      if (personality) {
        await new Promise(r => setTimeout(r, 350));
        setReply(replyBox, buildResponse(personality.title, personality.summary));
        input.focus();
        return;
      }

      // Exact market quote layer — never substitute another variety's price.
      if ((marketQuoteIntent(q) || hasKnownMarketIdentity(q)) && (window.GrainsHubData || marketQuoteCache)) {
        const marketRows = findMarketRows(userQuery);
        if (marketRows.length) {
          await new Promise(r => setTimeout(r, 500));
          const html = marketQuoteResponse(userQuery, marketRows);
          if (html) {
            setReply(replyBox, html);
            input.focus();
            return;
          }
        }
      }

      const [stock, suppliers, knowledge] = await Promise.all([
        loadStock(),
        loadSuppliers(),
        loadKnowledge()
      ]);

      // Knowledge.
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
        await new Promise(r => setTimeout(r, 350));
        setReply(
          replyBox,
          buildResponse('✨ Your Answer', kbMatch.answer, [
            { heading: 'Details', body: kbMatch.answer }
          ])
        );
        input.focus();
        return;
      }

      // Live stock.
      const terms = q.split(/\s+/).filter(Boolean);
      const stockMatches = findStockMatches(stock, terms);

      if (stockMatches.length > 0) {
        const primary = stockMatches[0];
        const supplier = findSupplierForProduct(suppliers, primary.name);

        // Commercial basis is read from the record; no freight is added here.
        let priceText = 'Price on request';
        if (window.GrainsHubData && typeof window.GrainsHubData.normalize === 'function') {
          const normalized = window.GrainsHubData.normalize(primary, 0);
          const commercial = window.GrainsHubData.commercialPrice
            ? window.GrainsHubData.commercialPrice(normalized)
            : null;

          if (commercial && commercial.amount !== null) {
            priceText = `${commercial.currency || ''} ${Number(commercial.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} / MT — ${commercial.label}`;
          } else if (primary.price != null) {
            priceText = `${primary.price} / ${primary.size || 'package'}`;
          }
        } else if (primary.price != null) {
          priceText = `${primary.price} / ${primary.size || 'package'}`;
        }

        const originFlag = normalize(primary.origin).includes('india') ? '🇮🇳' :
          normalize(primary.origin).includes('pakistan') ? '🇵🇰' :
          normalize(primary.origin).includes('thailand') ? '🇹🇭' : '🌍';

        await new Promise(r => setTimeout(r, 500));

        setReply(
          replyBox,
          buildResponse(
            `${originFlag} ${primary.name}`,
            `${primary.name} is available in the Grains Hub commercial data.`,
            [
              {
                heading: '📋 Product overview',
                body:
                  `<strong>Origin:</strong> ${primary.origin || 'Not specified'}<br>` +
                  `<strong>Packaging:</strong> ${primary.packaging || 'Not specified'}<br>` +
                  `<strong>Stock:</strong> ${primary.stock || 'Availability on request'}`
              },
              {
                heading: '💰 Pricing',
                body: `<strong>${priceText}</strong>`
              },
              {
                heading: '🏢 Supplier',
                body: supplier
                  ? `${supplier.name} (${supplier.badge || 'Listed supplier'}) – ${supplier.city || ''}, ${supplier.country || ''}`
                  : `${primary.badge || 'Verified Supplier'}`
              }
            ]
          )
        );
        input.focus();
        return;
      }

      // Supplier.
      const supplierMatch = suppliers.find(s => normalize(s.name).includes(q));
      if (supplierMatch) {
        await new Promise(r => setTimeout(r, 350));
        setReply(
          replyBox,
          buildResponse(
            `🏅 Verified Supplier: ${supplierMatch.name}`,
            `${supplierMatch.name} is a verified supplier listed on Grains Hub.`,
            [{
              heading: '📋 Supplier details',
              body:
                `<strong>Location:</strong> ${supplierMatch.city || ''}, ${supplierMatch.country || ''}<br>` +
                `<strong>Badge:</strong> ${supplierMatch.badge || 'Verified'}<br>` +
                `<strong>Products:</strong> ${Array.isArray(supplierMatch.products) ? supplierMatch.products.join(', ') : 'Listed products'}`
            }]
          )
        );
        input.focus();
        return;
      }

      // Intent routing.
      if (q.includes('supplier')) {
        setReply(replyBox, buildResponse(
          '🏢 Supplier Directory',
          'Browse all verified suppliers.',
          [{ heading: '🔗 Open directory', body: '<a href="https://grains.ae/suppliers/" target="_blank">View suppliers</a>' }]
        ));
        input.focus();
        return;
      }

      if (q.includes('market') || q.includes('pulse')) {
        setReply(replyBox, buildResponse(
          '📊 Market Pulse',
          'Market Pulse is the trading view for current origin observations, stock and booking data.',
          [{ heading: '🔗 Open Market Pulse', body: '<a href="https://grains.ae/pulse/index.html" target="_blank">Open Market Pulse</a>' }]
        ));
        input.focus();
        return;
      }

      if (q.includes('fcl') || q.includes('container')) {
        setReply(replyBox, buildResponse(
          '🚢 FCL Booking',
          'Submit your full container load requirement instantly.',
          [{ heading: '🔗 Book shipment', body: '<a href="https://grains.ae/fcl/" target="_blank">Book FCL shipment</a>' }]
        ));
        input.focus();
        return;
      }

      if (q.includes('compliance')) {
        setReply(replyBox, buildResponse(
          '📄 Compliance & Verification',
          'Download the official compliance guide.',
          [{ heading: '🔗 Download guide', body: '<a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank">Compliance Guide</a>' }]
        ));
        input.focus();
        return;
      }

      if (q.includes('stock')) {
        setReply(replyBox, buildResponse(
          '📦 Live Stock',
          'Browse current commercial stock and booking listings.',
          [{ heading: '🔗 Open stock', body: '<a href="https://grains.ae/shop" target="_blank">Open stock page</a>' }]
        ));
        input.focus();
        return;
      }

      if (q.includes('doc') || q.includes('documentation')) {
        setReply(replyBox, buildResponse(
          '📄 Documentation Hub',
          'All official documents are available below.',
          [{
            heading: '📚 Downloads',
            body: [
              '<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank" class="clickable-link">📄 Buyer Pack</a>',
              '<a href="https://grains.ae/docs/supplier-onboarding-pack.pdf" target="_blank" class="clickable-link">📄 Supplier Onboarding Pack</a>',
              '<a href="https://grains.ae/docs/fcl-guide.pdf" target="_blank" class="clickable-link">📄 FCL Guide</a>',
              '<a href="https://grains.ae/docs/compliance-guide.pdf" target="_blank" class="clickable-link">📄 Compliance Guide</a>',
              '<a href="https://grains.ae/docs/market-analysis-2025.pdf" target="_blank" class="clickable-link">📄 Market Analysis 2025</a>'
            ].join('<br>')
          }]
        ));
        input.focus();
        return;
      }

      if (q.includes('buyer pack')) {
        setReply(replyBox, buildResponse(
          '📄 Buyer Pack',
          'Download the official Buyer Pack.',
          [{ heading: '🔗 Download', body: '<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank" class="clickable-link">Buyer Pack</a>' }]
        ));
        input.focus();
        return;
      }

      const err = recover('unknown', userQuery);
      setReply(
        replyBox,
        buildResponse(err.title, err.summary, [{
          heading: '💡 Try asking about:',
          body: '• Products (1121, 1509, PR-106, PR-47, PR-26, etc.)<br>• Exact India market prices<br>• Suppliers<br>• FCL booking<br>• Documentation<br>• Compliance<br>• Market Pulse'
        }])
      );
      input.focus();

    } catch (err) {
      console.error('[Alliya v9.2.1] Error:', err);
      const errPack = recover('network');
      setReply(replyBox, buildResponse(
        errPack.title,
        'I could not complete the live data check. I have not substituted another variety or invented a price. Please try the question again.'
      ));
      input.focus();
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
      intro.innerHTML = `<p><strong>✨ Hello!</strong> I'm Alliya, your grain trade assistant at Grains Hub.</p><p>Ask me about live market prices, stock, suppliers, FCL booking, compliance, or documentation.</p>`;
    }
    const readyText = document.getElementById('alliyaReadyText');
    if (readyText) readyText.textContent = 'Connecting to live trade data…';
    preloadAlliyaData().catch(() => {});
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
    preloadAlliyaData().catch(err => console.warn('[Alliya v9.2.1] Preload:', err));

    console.log('%c✨ Alliya v9.2.1 - Scoped Gold Procurement Edition', 'font-size:20px; font-weight:bold; color:#c49b3f;');
    console.log('%c💡 Click the gold button to open', 'font-size:14px; color:#a8842e;');
    console.log('%c🔗 All links, emails, and phone numbers are clickable!', 'font-size:13px; color:#c49b3f;');
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
    ready: preloadAlliyaData,
    version: '9.2.1'
  };

})();
