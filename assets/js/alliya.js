/**
 * ALLIYA v8.1 - GRAINS GOLD THEME + DEBUG
 * Simplified for immediate testing
 */
(function AlliyaV8() {
  'use strict';

  const CONFIG = {
    BASE_URL: window.location.origin,
    DATA: {
      STOCK: '/assets/data/stock.json',
      SUPPLIERS: '/assets/data/suppliers.json',
      KNOWLEDGE: '/assets/data/alliya-knowledge.json',
    },
  };

  const State = {
    cache: { stock: null, suppliers: null, knowledge: null },
  };

  const Utils = {
    normalize: (str) => (str || '').toLowerCase().trim(),
    sanitize: (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    timestamp: () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };

  const DataLoader = {
    async fetchJSON(url, cacheKey) {
      if (State.cache[cacheKey]) return State.cache[cacheKey];
      try {
        const res = await fetch(`${CONFIG.BASE_URL}${url}`, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        State.cache[cacheKey] = data;
        console.log(`[Alliya] Loaded ${cacheKey}:`, data);
        return data;
      } catch (err) {
        console.error(`[Alliya] Failed to load ${cacheKey}:`, err);
        return null;
      }
    },
    loadStock: () => DataLoader.fetchJSON(CONFIG.DATA.STOCK, 'stock'),
    loadSuppliers: () => DataLoader.fetchJSON(CONFIG.DATA.SUPPLIERS, 'suppliers'),
    loadKnowledge: () => DataLoader.fetchJSON(CONFIG.DATA.KNOWLEDGE, 'knowledge'),
  };

  // ==== SIMPLIFIED RESPONSE BUILDER ====
  function buildResponse(title, summary, sections = [], actions = []) {
    let html = `
      <div class="alliya-bubble">
        <div class="alliya-bubble-header">
          <span class="alliya-icon">🤖</span>
          <span class="alliya-title">${Utils.sanitize(title)}</span>
          <span class="alliya-time">${Utils.timestamp()}</span>
        </div>
        <div class="alliya-bubble-body">
          <p>${Utils.sanitize(summary)}</p>
    `;
    sections.forEach(sec => {
      html += `<div class="alliya-section"><h4>${Utils.sanitize(sec.heading)}</h4><p>${Utils.sanitize(sec.body)}</p></div>`;
    });
    if (actions.length) {
      html += `<div class="alliya-actions">`;
      actions.forEach(a => {
        html += `<button class="alliya-action-btn" onclick="window.Alliya.ask('${Utils.sanitize(a)}')">${Utils.sanitize(a)}</button>`;
      });
      html += `</div>`;
    }
    html += `</div></div>`;
    return html;
  }

  // ==== MAIN ENGINE ====
  const Engine = {
    async process(query) {
      console.log('[Alliya] Processing:', query);
      
      const body = document.getElementById('alliyaBody');
      if (!body) return;

      // Show user message
      body.insertAdjacentHTML('beforeend', `
        <div class="alliya-bubble user">
          <div class="alliya-bubble-header">
            <span class="alliya-icon">👤</span>
            <span class="alliya-title">You</span>
            <span class="alliya-time">${Utils.timestamp()}</span>
          </div>
          <div class="alliya-bubble-body"><p>${Utils.sanitize(query)}</p></div>
        </div>
      `);

      // Show typing
      document.getElementById('alliyaTyping').style.display = 'flex';
      body.scrollTop = body.scrollHeight;

      try {
        // Load data
        const [stock, suppliers, knowledge] = await Promise.all([
          DataLoader.loadStock(),
          DataLoader.loadSuppliers(),
          DataLoader.loadKnowledge(),
        ]);

        console.log('[Alliya] Data loaded:', { stock: !!stock, suppliers: !!suppliers, knowledge: !!knowledge });

        await new Promise(r => setTimeout(r, 600)); // Simulate thinking

        // ===== SIMPLE RESPONSE LOGIC =====
        const q = Utils.normalize(query);
        let response = null;

        // 1. Greetings
        if (['hi', 'hello', 'hey', 'salam', 'assalamualikum'].some(g => q.includes(g))) {
          response = {
            title: '👋 Hello!',
            summary: `I'm Alliya, your AI grain assistant at Grains Hub. How can I help?`,
            sections: [{ heading: '💡 Try asking:', body: '• Show me stock\n• Who are your suppliers?\n• How to book FCL?' }],
            actions: ['Show me stock', 'Who are your suppliers?', 'How to book FCL?']
          };
        }

        // 2. About Alliya
        else if (q.includes('who') && q.includes('alliya') || q.includes('what is alliya')) {
          response = {
            title: '🤖 About Alliya',
            summary: 'I\'m Dubai\'s first AI grain assistant, built by Shahid Bashir for Grains Hub.',
            sections: [
              { heading: '📍 Location', body: 'Al Ras, Deira — Dubai\'s historic wholesale grain district.' },
              { heading: '💡 Purpose', body: 'To simplify grain trade with instant stock, supplier, and FCL info.' }
            ]
          };
        }

        // 3. Stock
        else if (q.includes('stock') || q.includes('product') || q.includes('rice') || q.includes('grain')) {
          if (stock && stock.length > 0) {
            const items = stock.slice(0, 3).map(item => 
              `• **${item.name}** — ${item.origin} | ${item.price} AED/${item.size}kg`
            ).join('\n');
            response = {
              title: '📦 Available Stock',
              summary: `Here are some products from our inventory:`,
              sections: [{ heading: 'Products', body: items }],
              actions: ['View all stock', 'Book FCL']
            };
          } else {
            response = {
              title: '📦 Stock Unavailable',
              summary: 'I couldn\'t load stock data. Please try again or visit the shop page.',
              actions: ['Open shop']
            };
          }
        }

        // 4. Suppliers
        else if (q.includes('supplier') || q.includes('vendor') || q.includes('partner')) {
          if (suppliers && suppliers.length > 0) {
            const items = suppliers.map(s => 
              `• **${s.name}** — ${s.city}, ${s.country} (${s.badge || 'Verified'})`
            ).join('\n');
            response = {
              title: '🏢 Verified Suppliers',
              summary: `Our trusted partners:`,
              sections: [{ heading: 'Suppliers', body: items }],
              actions: ['Contact a supplier']
            };
          } else {
            response = {
              title: '🏢 Suppliers Unavailable',
              summary: 'I couldn\'t load supplier data. Please try again.',
            };
          }
        }

        // 5. FCL
        else if (q.includes('fcl') || q.includes('container') || q.includes('shipment') || q.includes('ship')) {
          response = {
            title: '🚢 FCL Booking',
            summary: 'Book your full container load shipment:',
            sections: [
              { heading: '📋 Process', body: '1. Choose commodity\n2. Select container (20ft/40ft)\n3. Submit booking' },
              { heading: '📄 Documents', body: 'Invoice • Packing List • Bill of Lading • Certificate of Origin' }
            ],
            actions: ['Book FCL now', 'Download FCL guide']
          };
        }

        // 6. Documentation
        else if (q.includes('doc') || q.includes('guide') || q.includes('pack') || q.includes('compliance')) {
          response = {
            title: '📄 Documentation Hub',
            summary: 'Access all official documents:',
            sections: [
              { heading: '📚 Available', body: '• [Buyer Pack](/docs/buyer-pack.pdf)\n• [Supplier Pack](/docs/supplier-onboarding-pack.pdf)\n• [FCL Guide](/docs/fcl-guide.pdf)\n• [Compliance Guide](/docs/compliance-guide.pdf)' }
            ],
            actions: ['Download compliance guide', 'Download buyer pack']
          };
        }

        // 7. Market
        else if (q.includes('market') || q.includes('price') || q.includes('pulse') || q.includes('trend')) {
          response = {
            title: '📊 Market Pulse',
            summary: 'Live market updates:',
            sections: [
              { heading: '📈 Latest Trends', body: '• Rice: Stable demand\n• Wheat: Slight upward trend\n• Corn: Seasonal fluctuation' }
            ],
            actions: ['Open Market Pulse']
          };
        }

        // 8. Help / Fallback
        else {
          response = {
            title: '🤔 Let me help you',
            summary: `I didn't quite understand "${query}". Here's what I can do:`,
            sections: [
              { heading: '🔍 Try asking about:', body: '• **Stock** — "Show me rice stock"\n• **Suppliers** — "Who are your suppliers?"\n• **FCL** — "How to book FCL?"\n• **Docs** — "Download compliance guide"\n• **Market** — "What are current prices?"' }
            ],
            actions: ['Show me stock', 'Who are your suppliers?', 'How to book FCL?']
          };
        }

        // Render response
        document.getElementById('alliyaTyping').style.display = 'none';
        const html = buildResponse(response.title, response.summary, response.sections || [], response.actions || []);
        body.insertAdjacentHTML('beforeend', html);
        body.scrollTop = body.scrollHeight;

        // Clear input
        document.getElementById('alliyaInput').value = '';

      } catch (err) {
        console.error('[Alliya] Error:', err);
        document.getElementById('alliyaTyping').style.display = 'none';
        const html = buildResponse(
          '⚠️ Oops!',
          'Something went wrong. Please check the console (F12) for details.',
          [{ heading: 'Error', body: err.message || 'Unknown error' }]
        );
        body.insertAdjacentHTML('beforeend', html);
        body.scrollTop = body.scrollHeight;
      }
    }
  };

  // ===== UI =====
  const UI = {
    injectStyles() {
      const styles = `
        :root {
          --alliya-primary: #D4AF37;
          --alliya-primary-dark: #B8960F;
          --alliya-gold-gradient: linear-gradient(135deg, #D4AF37 0%, #F5E56B 30%, #D4AF37 60%, #B8960F 100%);
          --alliya-bg: #ffffff;
          --alliya-text: #333333;
          --alliya-shadow: 0 10px 40px rgba(212, 175, 55, 0.25);
        }

        #alliyaFloatBtn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: var(--alliya-gold-gradient);
          background-size: 200% 200%;
          color: #1a1a2e;
          border: 2px solid #D4AF37;
          border-radius: 50px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.4);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 9999;
          animation: alliyaGoldPulse 2s ease-in-out infinite;
          transition: 0.3s;
        }

        #alliyaFloatBtn:hover {
          transform: scale(1.08);
          box-shadow: 0 12px 48px rgba(212, 175, 55, 0.6);
          animation-play-state: paused;
        }

        #alliyaFloatBtn img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          padding: 3px;
        }

        @keyframes alliyaGoldPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(212, 175, 55, 0.3); transform: scale(1); background-position: 0% 50%; }
          25% { box-shadow: 0 8px 48px rgba(212, 175, 55, 0.7); transform: scale(1.03); background-position: 50% 50%; }
          50% { box-shadow: 0 8px 32px rgba(212, 175, 55, 0.3); transform: scale(1); background-position: 100% 50%; }
          75% { box-shadow: 0 8px 48px rgba(212, 175, 55, 0.7); transform: scale(1.03); background-position: 50% 50%; }
        }

        .alliya-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: 10000;
          padding: 20px;
          animation: alliyaFadeIn 0.3s ease;
        }

        @keyframes alliyaFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .alliya-modal-content {
          max-width: 700px;
          width: 100%;
          height: 85vh;
          max-height: 700px;
          margin: 40px auto;
          background: var(--alliya-bg);
          border-radius: 16px;
          box-shadow: var(--alliya-shadow);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .alliya-header {
          padding: 16px 20px;
          background: var(--alliya-gold-gradient);
          background-size: 200% 200%;
          animation: alliyaGoldPulse 4s ease-in-out infinite;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .alliya-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alliya-header-left img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          padding: 4px;
        }

        .alliya-header-left h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .alliya-header-actions button {
          background: rgba(26, 26, 46, 0.15);
          border: none;
          color: #1a1a2e;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          transition: 0.3s;
        }

        .alliya-header-actions button:hover {
          background: rgba(26, 26, 46, 0.3);
        }

        .alliya-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--alliya-bg);
        }

        .alliya-body::-webkit-scrollbar {
          width: 5px;
        }
        .alliya-body::-webkit-scrollbar-thumb {
          background: #D4AF37;
          border-radius: 10px;
        }

        .alliya-bubble {
          max-width: 85%;
          padding: 14px 18px;
          border-radius: 16px;
          animation: alliyaSlideIn 0.3s ease;
          align-self: flex-start;
          background: #f5f5f5;
          color: var(--alliya-text);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .alliya-bubble.user {
          align-self: flex-end;
          background: #FDF8E7;
        }

        @keyframes alliyaSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .alliya-bubble-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          opacity: 0.7;
        }

        .alliya-bubble-header .alliya-title {
          font-weight: 600;
        }

        .alliya-bubble-header .alliya-time {
          margin-left: auto;
          font-size: 11px;
        }

        .alliya-bubble-body {
          line-height: 1.6;
        }
        .alliya-bubble-body p { margin: 0 0 8px 0; }
        .alliya-bubble-body h4 { margin: 12px 0 6px 0; font-size: 14px; color: #D4AF37; }

        .alliya-section {
          margin: 10px 0;
          padding: 10px 12px;
          background: rgba(0,0,0,0.03);
          border-radius: 10px;
        }

        .alliya-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .alliya-action-btn {
          background: var(--alliya-gold-gradient);
          background-size: 200% 200%;
          color: #1a1a2e;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }

        .alliya-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.5);
        }

        .alliya-typing {
          display: none;
          align-self: flex-start;
          padding: 12px 18px;
          background: #f5f5f5;
          border-radius: 16px;
        }

        .alliya-typing span {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #999;
          margin: 0 2px;
          animation: alliyaTyping 1.4s infinite both;
        }
        .alliya-typing span:nth-child(2) { animation-delay: 0.2s; }
        .alliya-typing span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes alliyaTyping {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        .alliya-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(0,0,0,0.08);
          display: flex;
          gap: 10px;
          flex-shrink: 0;
          background: var(--alliya-bg);
        }

        .alliya-footer input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid rgba(0,0,0,0.1);
          border-radius: 25px;
          font-size: 14px;
          outline: none;
          transition: 0.3s;
          color: var(--alliya-text);
          background: transparent;
        }

        .alliya-footer input:focus {
          border-color: #D4AF37;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
        }

        .alliya-footer button {
          background: var(--alliya-gold-gradient);
          background-size: 200% 200%;
          color: #1a1a2e;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alliya-footer button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.5);
        }

        @media (max-width: 600px) {
          .alliya-modal-content { height: 95vh; max-height: none; margin: 0; border-radius: 0; }
          #alliyaFloatBtn { bottom: 16px; right: 16px; padding: 12px 16px; font-size: 14px; }
          #alliyaFloatBtn span { display: none; }
          .alliya-bubble { max-width: 92%; }
        }
      `;
      const style = document.createElement('style');
      style.textContent = styles;
      document.head.appendChild(style);
    },

    injectHTML() {
      const html = `
        <div id="alliyaModal" class="alliya-modal">
          <div class="alliya-modal-content">
            <div class="alliya-header">
              <div class="alliya-header-left">
                <img src="/assets/img/alliya-icon.ico" alt="Alliya">
                <h2>Ask Alliya</h2>
              </div>
              <div class="alliya-header-actions">
                <button onclick="window.Alliya.closeModal()">✕</button>
              </div>
            </div>
            <div id="alliyaBody" class="alliya-body">
              <div class="alliya-bubble">
                <div class="alliya-bubble-header">
                  <span class="alliya-icon">👋</span>
                  <span class="alliya-title">Welcome</span>
                  <span class="alliya-time">${Utils.timestamp()}</span>
                </div>
                <div class="alliya-bubble-body">
                  <p>Hello! I'm <strong>Alliya</strong>, your AI grain assistant.</p>
                  <p>Ask me about stock, suppliers, FCL, or documentation.</p>
                </div>
              </div>
            </div>
            <div id="alliyaTyping" class="alliya-typing">
              <span></span><span></span><span></span>
            </div>
            <div class="alliya-footer">
              <input id="alliyaInput" type="text" placeholder="Ask me anything..." autocomplete="off">
              <button id="alliyaSendBtn">➤</button>
            </div>
          </div>
        </div>
        <button id="alliyaFloatBtn" onclick="window.Alliya.openModal()">
          <img src="/assets/img/alliya-icon.ico" alt="Alliya">
          <span>Ask Alliya</span>
        </button>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
    },

    setupListeners() {
      const input = document.getElementById('alliyaInput');
      const sendBtn = document.getElementById('alliyaSendBtn');
      
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.Alliya.ask(input.value);
        }
      });
      
      sendBtn?.addEventListener('click', () => {
        window.Alliya.ask(input?.value || '');
      });

      document.getElementById('alliyaModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) window.Alliya.closeModal();
      });
    },

    openModal() {
      document.getElementById('alliyaModal').style.display = 'block';
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('alliyaInput').focus(), 300);
    },

    closeModal() {
      document.getElementById('alliyaModal').style.display = 'none';
      document.body.style.overflow = '';
    },
  };

  // ===== PUBLIC API =====
  window.Alliya = {
    ask: (query) => {
      if (!query || !query.trim()) return;
      Engine.process(query.trim());
    },
    openModal: UI.openModal,
    closeModal: UI.closeModal,
  };

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', () => {
    UI.injectStyles();
    UI.injectHTML();
    UI.setupListeners();
    console.log('%c🤖 Alliya v8.1 (Gold Edition) Loaded', 'font-size:18px; font-weight:bold; color:#D4AF37;');
    console.log('%c💡 Try asking: "Show me stock"', 'font-size:12px; color:#D4AF37;');
  });

})();
