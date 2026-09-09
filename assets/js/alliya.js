/* ============================================================
   ALLIYA v9.0-web - Procurement Matcher (No Gemini)
   Backports Android v9 ranking/extraction logic to JavaScript.
   No AI, no external keys - pure deterministic matching.
   ============================================================ */

(function AlliyaV9() {
  'use strict';

  // ============================================================
  // 1. SCOPED CSS (Unchanged from v8.4 - kept your styling)
  // ============================================================
  const ALLIYA_STYLES = `
    /* ---- Your existing CSS (identical to v8.4) ---- */
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
      0%, 100% { box-shadow: 0 8px 32px rgba(196, 155, 63, 0.3); transform: scale(1); background-position: 0% 50%; }
      25% { box-shadow: 0 8px 48px rgba(196, 155, 63, 0.7); transform: scale(1.03); background-position: 50% 50%; }
      50% { box-shadow: 0 8px 32px rgba(196, 155, 63, 0.3); transform: scale(1); background-position: 100% 50%; }
      75% { box-shadow: 0 8px 48px rgba(196, 155, 63, 0.7); transform: scale(1.03); background-position: 50% 50%; }
    }

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
    #alliyaModal.active { display: block; }
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

    #alliyaModal .alliya-box {
      padding: 20px 24px 24px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #222;
      max-height: 75vh;
      overflow-y: auto;
    }
    #alliyaModal .alliya-box::-webkit-scrollbar { width: 4px; }
    #alliyaModal .alliya-box::-webkit-scrollbar-thumb { background: #c49b3f; border-radius: 10px; }
    #alliyaModal .alliya-box::-webkit-scrollbar-track { background: transparent; }

    #alliyaModal .alliya-intro {
      padding: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    #alliyaModal .alliya-intro p { margin: 4px 0; }
    #alliyaModal .alliya-intro strong { color: #a8842e; }

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
    #alliyaModal #alliyaQuery::placeholder { color: #aaa; }

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
    #alliyaModal .alliya-send-btn:active { transform: scale(0.98); }

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
    #alliyaModal .alliya-suggestions.show { display: block; }
    #alliyaModal .alliya-suggestions::-webkit-scrollbar { width: 4px; }
    #alliyaModal .alliya-suggestions::-webkit-scrollbar-thumb { background: #c49b3f; border-radius: 10px; }

    #alliyaModal .alliya-suggestion-item {
      padding: 10px 14px;
      font-size: 13px;
      cursor: pointer;
      border-bottom: 1px solid #f1f1f1;
      color: #222;
      transition: all 0.2s ease;
    }
    #alliyaModal .alliya-suggestion-item:last-child { border-bottom: none; }
    #alliyaModal .alliya-suggestion-item:hover {
      background: #f7f4eb;
      padding-left: 18px;
    }

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
    #alliyaModal .alliya-reply.show { display: block; }
    #alliyaModal .alliya-reply::-webkit-scrollbar { width: 4px; }
    #alliyaModal .alliya-reply::-webkit-scrollbar-thumb { background: #c49b3f; border-radius: 10px; }

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
    #alliyaModal .alliya-reply .alliya-block p { margin: 6px 0; }
    #alliyaModal .alliya-reply .alliya-block strong { color: #a8842e; }
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

    @media (max-width: 640px) {
      #alliyaModal .alliya-modal-content { margin: 20px 12px; max-width: 100%; border-radius: 14px; }
      #alliyaModal .alliya-box { padding: 16px 16px 20px; max-height: 80vh; }
      #alliyaModal .alliya-reply { max-height: 50vh; padding: 12px 14px; }
      #alliyaFloatBtn { bottom: 16px; right: 16px; padding: 10px 14px; font-size: 13px; }
      #alliyaFloatBtn span { display: none; }
      #alliyaFloatBtn img { width: 22px; height: 22px; }
      #alliyaModal .alliya-modal-header { padding: 14px 16px; }
      #alliyaModal .alliya-modal-header .alliya-header-left h2 { font-size: 16px; }
      #alliyaModal .alliya-reply .alliya-cta { grid-template-columns: 1fr 1fr; gap: 8px; }
      #alliyaModal .alliya-reply .alliya-cta p { padding: 10px 12px; font-size: 12px; }
      #alliyaModal #alliyaQuery { font-size: 13px; padding: 10px 14px; }
      #alliyaModal .alliya-send-btn { font-size: 14px; padding: 10px 14px; }
      #alliyaModal .alliya-suggestions { top: 42px; max-height: 160px; }
    }
    @media (max-width: 400px) {
      #alliyaModal .alliya-reply .alliya-cta { grid-template-columns: 1fr; }
      #alliyaModal .alliya-box { padding: 12px 12px 16px; }
      #alliyaModal .alliya-intro { font-size: 13px; }
    }
  `;

  // ============================================================
  // 2. CLEANUP, INJECTION, UTILITIES (IDENTICAL TO v8.4)
  // ============================================================
  function killAllExisting() {
    ['alliyaModal', 'alliyaFloatBtn', 'alliyaResponse', 'alliyaSuggestions'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('.alliya-float, .alliya-modal, .alliya-box, .alliya-suggestion-item, .alliya-reply').forEach(el => {
      if (!el.id || !el.id.startsWith('alliya')) el.remove();
    });
    document.querySelectorAll('style').forEach(el => {
      if (el.id === 'alliya-styles' || (el.textContent && el.textContent.includes('alliyaGoldPulse'))) el.remove();
    });
  }

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'alliya-styles';
    styleEl.textContent = ALLIYA_STYLES;
    document.head.appendChild(styleEl);
  }

  function injectHTML() {
    const html = `
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
            <div class="alliya-input-wrapper">
              <input type="text" id="alliyaQuery" placeholder="Ask about products, suppliers, FCL, docs..." autocomplete="off">
              <div id="alliyaSuggestions" class="alliya-suggestions"></div>
            </div>
            <button class="alliya-send-btn" id="alliyaSendBtn">✨ Send Question</button>
            <div id="alliyaResponse" class="alliya-reply"></div>
          </div>
        </div>
      </div>
      <div id="alliyaFloatBtn">
        <img src="/assets/img/alliya-icon.ico" alt="Alliya" onerror="this.style.display='none'">
        <span>Ask Alliya</span>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function normalize(str) { return (str || '').toLowerCase().trim(); }

  // ============================================================
  // 3. AUTO-LINKIFY (UNCHANGED – EXCELLENT AS IS)
  // ============================================================
  function autoLinkify(text) {
    if (!text) return '';
    if (/<a\s+[^>]*>.*?<\/a>/i.test(text)) return text;
    let html = text;
    html = html.replace(
      /(?:https?:\/\/)?(?:wa\.me|whatsapp\.com)\/([0-9]+)/gi,
      '<a href="https://wa.me/$1" target="_blank" class="whatsapp-link">📱 WhatsApp: $1</a>'
    );
    html = html.replace(
      /(\+?[0-9]{1,4}[-.\s]?)?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g,
      function(match) {
        const clean = match.replace(/[\s\-()]/g, '');
        if (clean.length >= 7) return `<a href="tel:${clean}" class="phone-link">📞 ${match}</a>`;
        return match;
      }
    );
    html = html.replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1" class="email-link">✉️ $1</a>'
    );
    html = html.replace(
      /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi,
      function(match) {
        const href = match.startsWith('www.') ? 'https://' + match : match;
        const display = match.length > 50 ? match.substring(0, 45) + '...' : match;
        return `<a href="${href}" target="_blank" class="clickable-link">🔗 ${display}</a>`;
      }
    );
    html = html.replace(
      /(\/[^\s<]+\.(pdf|doc|docx|xls|xlsx|json|csv|txt))/gi,
      function(match) {
        if (/<a\s+[^>]*>/.test(html)) return match;
        const filename = match.split('/').pop();
        return `<a href="${match}" target="_blank" class="clickable-link">📄 ${filename}</a>`;
      }
    );
    html = html.replace(/"" target="_blank"/g, '');
    html = html.replace(/https?:\/\/[^\s"]+(?=\s*["\'])/g, '');
    return html;
  }

  // ============================================================
  // 4. DATA LOADERS (UNCHANGED)
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
  // 5. UTILITIES (Enhanced)
  // ============================================================
  function formatNumber(value) {
    if (typeof value !== 'number') return String(value);
    if (Math.abs(value - Math.round(value)) < 0.0001) return String(Math.round(value));
    return String(Number(value.toFixed(2)));
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

  // ============================================================
  // 6. CORE PROCUREMENT LOGIC (Ported from Android v9)
  // ============================================================
  function extractRequirement(prompt) {
    const p = prompt.toLowerCase();
    const result = {
      commodity: null,
      variety: null,
      origin: null,
      quantityMT: null,
      maxBrokenPercent: null,
      minPurityPercent: null,
      maxMoisturePercent: null,
      deliveryLocation: null,
      packaging: null,
      comparisonRequested: false,
      priceRequested: false,
      stockRequested: false,
      rfqRequested: false
    };

    // Quantity
    const qtyMatch = p.match(/(\d+(?:\.\d+)?)\s*(mt|m\.t\.|metric\s+tons?|tons?|tonnes?)\b/);
    if (qtyMatch) result.quantityMT = parseFloat(qtyMatch[1]);

    // Broken %
    const brokenMatch = p.match(/(?:broken|breakage)\s*(?:below|under|less\s+than|<=?)?\s*(\d+(?:\.\d+)?)\s*%/);
    if (brokenMatch) result.maxBrokenPercent = parseFloat(brokenMatch[1]);

    // Purity %
    const purityMatch = p.match(/(?:purity)\s*(?:above|over|at\s+least|>=?)?\s*(\d+(?:\.\d+)?)\s*%/);
    if (purityMatch) result.minPurityPercent = parseFloat(purityMatch[1]);

    // Moisture %
    const moistureMatch = p.match(/(?:moisture)\s*(?:below|under|less\s+than|<=?)?\s*(\d+(?:\.\d+)?)\s*%/);
    if (moistureMatch) result.maxMoisturePercent = parseFloat(moistureMatch[1]);

    // Origin
    if (p.includes('pakistan') || p.includes('pakistani')) result.origin = 'Pakistan';
    else if (p.includes('india') || p.includes('indian')) result.origin = 'India';
    else if (p.includes('thailand') || p.includes('thai')) result.origin = 'Thailand';
    else if (p.includes('australia') || p.includes('australian')) result.origin = 'Australia';
    else if (p.includes('canada') || p.includes('canadian')) result.origin = 'Canada';

    // Variety
    if (p.includes('1121')) result.variety = '1121';
    else if (p.includes('1509')) result.variety = '1509';
    else if (p.includes('irri 6') || p.includes('irri6')) result.variety = 'Irri 6';
    else if (p.includes('sona masoori') || p.includes('sona massori')) result.variety = 'Sona Masoori';
    else if (p.includes('chickpea') || p.includes('kabuli')) result.variety = 'Chickpeas';
    else if (p.includes('lentil') || p.includes('masoor')) result.variety = 'Lentils';
    else if (p.includes('milling wheat')) result.variety = 'Milling Wheat';
    else if (p.includes('maize') || p.includes('corn')) result.variety = 'Maize';

    // Commodity
    if (p.includes('rice') || p.includes('basmati') || p.includes('sella') || p.includes('irri') || p.includes('sona')) result.commodity = 'Rice';
    else if (p.includes('wheat') || p.includes('flour')) result.commodity = 'Wheat';
    else if (p.includes('chickpea') || p.includes('kabuli') || p.includes('lentil') || p.includes('masoor') || p.includes('pulse')) result.commodity = 'Pulses';
    else if (p.includes('maize') || p.includes('corn')) result.commodity = 'Maize';

    // Delivery
    const deliveryMatch = prompt.match(/(?:delivered\s+to|delivery\s+to|deliver\s+to|destination)\s+([a-zA-Z][a-zA-Z\s-]{2,30})/i);
    if (deliveryMatch) result.deliveryLocation = deliveryMatch[1].trim();

    // Packaging
    if (p.includes('jumbo bag') || p.includes('jumbo bags')) result.packaging = 'Jumbo Bag';
    else if (p.includes('50kg') || p.includes('50 kg')) result.packaging = '50kg';
    else if (p.includes('40kg') || p.includes('40 kg')) result.packaging = '40kg';
    else if (p.includes('35kg') || p.includes('35 kg')) result.packaging = '35kg';
    else if (p.includes('25kg') || p.includes('25 kg')) result.packaging = '25kg';

    // Booleans
    result.comparisonRequested = p.includes('compare') || p.includes('versus') || /\bvs\.?\b/.test(p);
    result.priceRequested = p.includes('price') || p.includes('rate') || p.includes('cost') || p.includes('quote') || p.includes('quotation');
    result.stockRequested = p.includes('stock') || p.includes('available') || p.includes('inventory');
    result.rfqRequested = p.includes('rfq') || p.includes('quotation') || p.includes('quote') || p.includes('buy') || p.includes('order');

    return result;
  }

  function rankProducts(requirement, products) {
    const results = [];

    products.forEach(product => {
      let score = 0;
      const reasons = [];
      const productText = (product.name + ' ' + (product.variety || '') + ' ' + (product.origin || '') + ' ' + (product.id || '')).toLowerCase();

      // Commodity match
      if (requirement.commodity) {
        const match = productText.includes(requirement.commodity.toLowerCase());
        if (match) { score += 35; reasons.push(requirement.commodity); }
        else score -= 25;
      }

      // Variety match
      if (requirement.variety) {
        const match = productText.includes(requirement.variety.toLowerCase());
        if (match) { score += 35; reasons.push(requirement.variety); }
        else score -= 15;
      }

      // Origin match
      if (requirement.origin) {
        const match = (product.origin || '').toLowerCase() === requirement.origin.toLowerCase();
        if (match) { score += 30; reasons.push(requirement.origin); }
        else score -= 12;
      }

      // Broken %
      const broken = parseFloat(product.brokenPercent) || parseFloat(product.broken) || 0;
      if (requirement.maxBrokenPercent !== null) {
        if (broken <= requirement.maxBrokenPercent) { score += 15; reasons.push('broken ≤ ' + formatNumber(requirement.maxBrokenPercent) + '%'); }
        else score -= 25;
      }

      // Purity %
      const purity = parseFloat(product.purityPercent) || parseFloat(product.purity) || 0;
      if (requirement.minPurityPercent !== null) {
        if (purity >= requirement.minPurityPercent) { score += 15; reasons.push('purity ≥ ' + formatNumber(requirement.minPurityPercent) + '%'); }
        else score -= 20;
      }

      // Moisture %
      const moisture = parseFloat(product.moisturePercent) || parseFloat(product.moisture) || 0;
      if (requirement.maxMoisturePercent !== null) {
        if (moisture <= requirement.maxMoisturePercent) { score += 15; reasons.push('moisture ≤ ' + formatNumber(requirement.maxMoisturePercent) + '%'); }
        else score -= 20;
      }

      // Stock quantity vs requested
      const stockQty = parseFloat(product.stock) || parseFloat(product.stockQuantityMT) || 0;
      if (requirement.quantityMT !== null) {
        if (stockQty >= requirement.quantityMT) { score += 20; reasons.push('stock covers ' + formatNumber(requirement.quantityMT) + ' MT'); }
        else if (stockQty > 0) { score += 3; reasons.push('partial stock only'); }
        else score -= 20;
      }

      // Bonus for ready stock
      if (stockQty > 0) score += 5;

      if (score >= 15) {
        results.push({
          product: product,
          score: score,
          reasons: reasons
        });
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  function volumeDiscountText(quantityMT) {
    if (quantityMT >= 300) return 'Estimated volume tier: **8.5% discount** at 300+ MT, before applicable delivery/VAT calculation.';
    if (quantityMT >= 100) return 'Estimated volume tier: **6% discount** at 100–299 MT, before applicable delivery/VAT calculation.';
    if (quantityMT >= 25) return 'Estimated volume tier: **3% discount** at 25–99 MT, before applicable delivery/VAT calculation.';
    return 'Volume tier: below the first **25 MT** discount threshold.';
  }

  function buildProcurementResponse(requirement, candidates) {
    if (!candidates || candidates.length === 0) return null;

    const top = candidates[0];
    const product = top.product;
    const requestedQty = requirement.quantityMT;
    const stockQty = parseFloat(product.stock) || parseFloat(product.stockQuantityMT) || 0;

    let stockStatus = '';
    if (requestedQty === null) {
      stockStatus = 'Ready stock: **' + formatNumber(stockQty) + ' MT**';
    } else if (stockQty >= requestedQty) {
      stockStatus = 'Stock check: **' + formatNumber(requestedQty) + ' MT available** against your request';
    } else {
      stockStatus = 'Stock check: only **' + formatNumber(stockQty) + ' MT available** against your requested **' + formatNumber(requestedQty) + ' MT**';
    }

    const price = parseFloat(product.price) || parseFloat(product.spotPriceAEDPerMT) || 0;
    const priceStr = price > 0 ? 'AED ' + formatNumber(price) + ' / MT' : 'Contact trade desk';

    const delivery = requirement.deliveryLocation ? '\n• Delivery destination: **' + requirement.deliveryLocation + '**' : '';

    const alternatives = candidates.slice(1, 3).map(c => {
      const altPrice = parseFloat(c.product.price) || parseFloat(c.product.spotPriceAEDPerMT) || 0;
      const altStock = parseFloat(c.product.stock) || parseFloat(c.product.stockQuantityMT) || 0;
      return '• **' + c.product.name + '** — ' + (altPrice > 0 ? 'AED ' + formatNumber(altPrice) + '/MT' : 'price on request') + ', ' + (c.product.origin || '') + ', ' + formatNumber(altStock) + ' MT stock';
    }).join('\n');

    let comparisonText = alternatives ? '\n\n**Other matching options**\n' + alternatives : '';

    const volText = requestedQty !== null ? volumeDiscountText(requestedQty) : 'Tell me the quantity in MT and I can take this into the RFQ calculation.';

    return `
🌾 **Alliya Procurement Match**

I matched your requirement against the current Grains Hub product data.

**Recommended:** ${product.name}
• Origin: **${product.origin || 'N/A'}**
• Spot price: **${priceStr}**
• Purity: **${formatNumber(parseFloat(product.purityPercent) || parseFloat(product.purity) || 0)}%**
• Moisture: **${formatNumber(parseFloat(product.moisturePercent) || parseFloat(product.moisture) || 0)}%**
• Broken: **${formatNumber(parseFloat(product.brokenPercent) || parseFloat(product.broken) || 0)}%**
• Available stock: **${formatNumber(stockQty)} MT**
${delivery}
• Match basis: ${top.reasons.join(', ')}

${stockStatus}

${volText}

${comparisonText}

⚠️ Commercial note: the figures above are based on the current Grains Hub application data. Final quotation, availability and delivery terms should be confirmed by the trade desk before execution.
    `.trim();
  }

  // ============================================================
  // 7. PERSONALITY (UNCHANGED)
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
  // 8. BUILD RESPONSE (WRAPPER WITH AUTO-LINKIFY)
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
  // 9. RECOVER (UNCHANGED)
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
  // 10. SUGGESTIONS (UNCHANGED)
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
  // 11. MAIN ENGINE (ENHANCED with Procurement Logic)
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

    try {
      const [stock, suppliers, knowledge] = await Promise.all([loadStock(), loadSuppliers(), loadKnowledge()]);

      // 1. Personality
      const personality = getPersonality(userQuery);
      if (personality) {
        replyBox.innerHTML = buildResponse(personality.title, personality.summary);
        return;
      }

      // 2. Knowledge Base
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

      // 3. NEW: Procurement Extraction & Ranking (Ported from Android v9)
      const requirement = extractRequirement(userQuery);
      const mappedStock = stock.map(item => ({
        ...item,
        // Normalise fields to match Android's GrainProduct expectations
        brokenPercent: parseFloat(item.brokenPercent) || parseFloat(item.broken) || 2,
        purityPercent: parseFloat(item.purityPercent) || parseFloat(item.purity) || 95,
        moisturePercent: parseFloat(item.moisturePercent) || parseFloat(item.moisture) || 12,
        stockQuantityMT: parseFloat(item.stock) || parseFloat(item.stockQuantityMT) || 0,
        spotPriceAEDPerMT: parseFloat(item.price) || parseFloat(item.spotPriceAEDPerMT) || 0,
        origin: item.origin || 'Various',
        variety: item.variety || '',
        minOrderMT: parseFloat(item.minOrderMT) || parseFloat(item.minOrder) || 1
      }));

      const candidates = rankProducts(requirement, mappedStock);

      // If we have a strong procurement match (score >= 15)
      if (candidates.length > 0) {
        const procurementReply = buildProcurementResponse(requirement, candidates);
        if (procurementReply) {
          // Wrap the procurement reply in the standard buildResponse layout
          replyBox.innerHTML = buildResponse('🌾 Procurement Match', procurementReply);
          return;
        }
      }

      // 4. Fallback: Supplier match (if no stock rank hit)
      const supplierMatch = suppliers.find(s => normalize(s.name).includes(q));
      if (supplierMatch) {
        replyBox.innerHTML = buildResponse(
          `🏅 Verified Supplier: ${supplierMatch.name}`,
          `${supplierMatch.name} is a verified supplier listed on Grains Hub.`,
          [{ heading: '📋 Supplier details', body: `<strong>Location:</strong> ${supplierMatch.city}, ${supplierMatch.country}<br><strong>Badge:</strong> ${supplierMatch.badge}<br><strong>Products:</strong> ${Array.isArray(supplierMatch.products) ? supplierMatch.products.join(', ') : 'Listed products'}` }]
        );
        return;
      }

      // 5. Intent fallback
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
      if (intent.includes('doc') || intent.includes('documentation')) {
        replyBox.innerHTML = buildResponse(
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
        );
        return;
      }
      if (intent.includes('buyer pack')) {
        replyBox.innerHTML = buildResponse('📄 Buyer Pack', 'Download the official Buyer Pack.', [{ heading: '🔗 Download', body: '<a href="https://grains.ae/docs/buyer-pack.pdf" target="_blank" class="clickable-link">Buyer Pack</a>' }]);
        return;
      }

      // 6. Generic fallback
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
  // 12. MODAL CONTROLS (UNCHANGED)
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
  // 13. SETUP EVENTS (UNCHANGED)
  // ============================================================
  function setupEvents() {
    document.getElementById('alliyaFloatBtn')?.addEventListener('click', openModal);
    document.getElementById('alliyaCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('alliyaSendBtn')?.addEventListener('click', askAlliya);

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

    document.getElementById('alliyaModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('alliyaModal');
        if (modal && modal.style.display === 'block') closeModal();
      }
    });
  }

  // ============================================================
  // 14. INIT
  // ============================================================
  function init() {
    killAllExisting();
    injectStyles();
    injectHTML();
    setupEvents();

    console.log('%c✨ Alliya v9.0-web - Procurement Matcher (No Gemini)', 'font-size:20px; font-weight:bold; color:#c49b3f;');
    console.log('%c🧠 Ported Android v9 extraction & ranking logic to JS', 'font-size:14px; color:#a8842e;');
    console.log('%c🔗 All links, emails, and phone numbers are clickable!', 'font-size:13px; color:#c49b3f;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Alliya = {
    ask: askAlliya,
    open: openModal,
    close: closeModal,
    version: '9.0-web'
  };

})();
