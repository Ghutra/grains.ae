/**
 * ========================================================
 * ALLIYA v8.0 - Advanced AI Grains Assistant
 * ========================================================
 * Features:
 * - NLP with synonym matching & typo tolerance
 * - Session context memory
 * - Rich UI with markdown & typing indicators
 * - Voice input (Speech-to-Text)
 * - Multi-language support (EN/AR/HI/UR)
 * - Analytics tracking
 * - Dark mode compatible
 * - Offline-ready with caching
 * ========================================================
 */

(function AlliyaV8() {
  'use strict';

  // ========================================================
  // CONFIGURATION
  // ========================================================
  const CONFIG = {
    BASE_URL: window.location.origin,
    DATA: {
      STOCK: '/assets/data/stock.json',
      SUPPLIERS: '/assets/data/suppliers.json',
      KNOWLEDGE: '/assets/data/alliya-knowledge.json',
      SYNONYMS: '/assets/data/synonyms.json', // New! Create this
    },
    UI: {
      TYPING_DELAY: 400, // ms per character
      SUGGESTION_LIMIT: 8,
      MAX_HISTORY: 10,
    },
    ANALYTICS: {
      ENABLED: true,
      ENDPOINT: '/api/log', // Optional: GitHub Issues or Google Forms
    },
    LANGUAGES: {
      SUPPORTED: ['en', 'ar', 'hi', 'ur'],
      DEFAULT: 'en',
    },
  };

  // ========================================================
  // STATE MANAGEMENT
  // ========================================================
  const State = {
    sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    conversation: [],
    currentQuery: '',
    isProcessing: false,
    context: {
      lastIntent: null,
      lastProduct: null,
      lastSupplier: null,
    },
    cache: {
      stock: null,
      suppliers: null,
      knowledge: null,
      synonyms: null,
    },
    preferences: {
      darkMode: localStorage.getItem('alliya-dark') === 'true',
      language: localStorage.getItem('alliya-lang') || 'en',
    },
  };

  // ========================================================
  // UTILITY FUNCTIONS
  // ========================================================
  const Utils = {
    // Normalize text for comparison
    normalize: (str) => (str || '').toLowerCase().trim().replace(/\s+/g, ' '),

    // Levenshtein distance (typo tolerance)
    levenshteinDistance: (a, b) => {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          const cost = a[j - 1] === b[i - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[b.length][a.length];
    },

    // Fuzzy match with typo tolerance
    fuzzyMatch: (query, target, threshold = 2) => {
      const q = Utils.normalize(query);
      const t = Utils.normalize(target);
      if (q === t) return true;
      const distance = Utils.levenshteinDistance(q, t);
      const maxLength = Math.max(q.length, t.length);
      return maxLength > 0 && distance / maxLength <= (threshold / 10);
    },

    // Detect language
    detectLanguage: (text) => {
      const patterns = {
        ar: /[\u0600-\u06FF]/,
        hi: /[\u0900-\u097F]/,
        ur: /[\u0600-\u06FF]|[\u0900-\u097F]/,
      };
      for (const [lang, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) return lang;
      }
      return 'en';
    },

    // Generate unique ID
    uid: () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9),

    // Debounce
    debounce: (fn, delay = 300) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    },

    // HTML Sanitization (prevent XSS)
    sanitize: (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    // Format timestamp
    timestamp: () => {
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    },

    // Markdown-like formatting
    formatMessage: (text) => {
      let html = Utils.sanitize(text);
      // Bold: **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic: *text* -> <em>text</em>
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Links: [text](url) -> <a href="url" target="_blank">text</a>
      html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
      // Line breaks
      html = html.replace(/\n/g, '<br>');
      return html;
    },

    // Get greeting based on time
    getTimeGreeting: () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning 🌅';
      if (hour < 17) return 'Good afternoon ☀️';
      if (hour < 21) return 'Good evening 🌆';
      return 'Good night 🌙';
    },
  };

  // ========================================================
  // DATA LOADERS
  // ========================================================
  const DataLoader = {
    async fetchJSON(url, cacheKey) {
      if (State.cache[cacheKey]) return State.cache[cacheKey];
      try {
        const res = await fetch(`${CONFIG.BASE_URL}${url}`, {
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        State.cache[cacheKey] = data;
        return data;
      } catch (err) {
        console.error(`[Alliya] Failed to load ${cacheKey}:`, err);
        return null;
      }
    },

    loadStock: () => DataLoader.fetchJSON(CONFIG.DATA.STOCK, 'stock'),
    loadSuppliers: () => DataLoader.fetchJSON(CONFIG.DATA.SUPPLIERS, 'suppliers'),
    loadKnowledge: () => DataLoader.fetchJSON(CONFIG.DATA.KNOWLEDGE, 'knowledge'),
    loadSynonyms: () => DataLoader.fetchJSON(CONFIG.DATA.SYNONYMS, 'synonyms'),
  };

  // ========================================================
  // NLP ENGINE
  // ========================================================
  const NLP = {
    // Expand query with synonyms
    expandQuery: async (query) => {
      const synonyms = await DataLoader.loadSynonyms();
      if (!synonyms) return [query];

      const expanded = [query];
      const words = Utils.normalize(query).split(/\s+/);

      words.forEach((word) => {
        for (const [key, values] of Object.entries(synonyms)) {
          if (word === key || (values && values.includes(word))) {
            expanded.push(key);
            if (values) expanded.push(...values);
          }
        }
      });

      return [...new Set(expanded)];
    },

    // Intent classification
    classifyIntent: (query) => {
      const q = Utils.normalize(query);
      const intents = {
        GREETING: ['hi', 'hello', 'hey', 'howdy', 'greetings', 'assalamualikum', 'salam'],
        STOCK: ['stock', 'inventory', 'available', 'price', 'cost', 'rate', 'kg'],
        SUPPLIER: ['supplier', 'vendor', 'seller', 'distributor', 'company', 'firm'],
        FCL: ['fcl', 'container', 'shipment', 'shipping', 'freight', 'logistics'],
        MARKET: ['market', 'pulse', 'price', 'trend', 'analysis', 'forecast'],
        DOCS: ['document', 'form', 'pack', 'guide', 'manual', 'policy', 'compliance'],
        IDENTITY: ['alliya', 'who are you', 'what is alliya', 'tell me about alliya'],
        SHIPPING: ['delivery', 'lead time', 'eta', 'transit', 'port'],
        PAYMENT: ['payment', 'letter of credit', 'lc', 'tdp', 'terms'],
        QUALITY: ['quality', 'specification', 'grade', 'standard', 'moisture'],
        HELP: ['help', 'support', 'guide', 'how to', 'what can you do'],
        EXIT: ['bye', 'goodbye', 'exit', 'quit', 'thanks', 'thank you'],
      };

      for (const [intent, keywords] of Object.entries(intents)) {
        if (keywords.some(k => q.includes(k))) return intent;
      }
      return 'UNKNOWN';
    },

    // Extract entities from query
    extractEntities: (query) => {
      const q = Utils.normalize(query);
      const entities = {
        product: null,
        origin: null,
        quantity: null,
        packaging: null,
      };

      // Product patterns (e.g., "1121", "IRRI-6", "Basmati")
      const productPatterns = /\b(1121|1509|irri[- ]?6|basmati|sella|parboiled|white|brown)\b/i;
      const productMatch = q.match(productPatterns);
      if (productMatch) entities.product = productMatch[0];

      // Origin patterns
      const originPatterns = /\b(india|pakistan|thailand|vietnam|myanmar|australia|usa|uae)\b/i;
      const originMatch = q.match(originPatterns);
      if (originMatch) entities.origin = originMatch[0];

      // Quantity patterns
      const quantityPatterns = /(\d+)\s*(kg|ton|mt|container|fcl)/i;
      const quantityMatch = q.match(quantityPatterns);
      if (quantityMatch) {
        entities.quantity = {
          value: parseInt(quantityMatch[1]),
          unit: quantityMatch[2].toUpperCase(),
        };
      }

      return entities;
    },
  };

  // ========================================================
  // RESPONSE BUILDER
  // ========================================================
  const ResponseBuilder = {
    // Build rich HTML response
    build: (data) => {
      const { title, summary, sections = [], actions = [], metadata = {} } = data;

      let html = `
        <div class="alliya-bubble alliya-${metadata.type || 'info'}">
          <div class="alliya-bubble-header">
            <span class="alliya-icon">${metadata.icon || '🤖'}</span>
            <span class="alliya-title">${Utils.sanitize(title)}</span>
            <span class="alliya-time">${Utils.timestamp()}</span>
          </div>
          <div class="alliya-bubble-body">
            <p>${Utils.formatMessage(summary)}</p>
      `;

      sections.forEach((sec) => {
        html += `
          <div class="alliya-section">
            <h4>${Utils.sanitize(sec.heading)}</h4>
            <div>${Utils.formatMessage(sec.body)}</div>
          </div>
        `;
      });

      if (actions.length > 0) {
        html += `<div class="alliya-actions">`;
        actions.forEach((action) => {
          html += `
            <button class="alliya-action-btn" 
                    onclick="window.Alliya.handleAction('${action.id}', '${Utils.sanitize(action.label)}')">
              ${action.icon || '🔗'} ${Utils.sanitize(action.label)}
            </button>
          `;
        });
        html += `</div>`;
      }

      html += `
          </div>
          <div class="alliya-bubble-footer">
            <span class="alliya-feedback">
              <button onclick="window.Alliya.rateMessage('helpful')" title="Helpful">👍</button>
              <button onclick="window.Alliya.rateMessage('unhelpful')" title="Unhelpful">👎</button>
            </span>
          </div>
        </div>
      `;

      return html;
    },

    // Quick replies
    quickReplies: (options) => {
      return `
        <div class="alliya-quick-replies">
          ${options.map(opt => `
            <button class="alliya-quick-btn" 
                    onclick="window.Alliya.ask('${Utils.sanitize(opt)}')">
              ${Utils.sanitize(opt)}
            </button>
          `).join('')}
        </div>
      `;
    },
  };

  // ========================================================
  // MAIN ENGINE
  // ========================================================
  const Engine = {
    // Process user query
    process: async (query) => {
      if (State.isProcessing) return;
      State.isProcessing = true;
      State.currentQuery = query;

      // Show typing indicator
      UI.showTyping();

      try {
        // Detect language
        const lang = Utils.detectLanguage(query);
        State.preferences.language = lang;

        // Get expanded query (with synonyms)
        const expandedQueries = await NLP.expandQuery(query);

        // Classify intent
        const intent = NLP.classifyIntent(query);

        // Extract entities
        const entities = NLP.extractEntities(query);

        // Update context
        State.context.lastIntent = intent;

        // Load data
        const [stock, suppliers, knowledge] = await Promise.all([
          DataLoader.loadStock(),
          DataLoader.loadSuppliers(),
          DataLoader.loadKnowledge(),
        ]);

        // Build response based on intent
        let response = null;

        // 1. Check knowledge base first (exact + fuzzy)
        response = await Engine.searchKnowledge(query, knowledge, expandedQueries);
        if (response) {
          UI.renderResponse(response);
          Engine.logAnalytics(query, 'knowledge', response);
          State.isProcessing = false;
          return;
        }

        // 2. Check personality (greetings, identity)
        response = Engine.getPersonality(query);
        if (response) {
          UI.renderResponse(response);
          Engine.logAnalytics(query, 'personality', response);
          State.isProcessing = false;
          return;
        }

        // 3. Route by intent
        switch (intent) {
          case 'STOCK':
            response = await Engine.handleStock(query, stock, suppliers, entities);
            break;
          case 'SUPPLIER':
            response = await Engine.handleSupplier(query, suppliers, entities);
            break;
          case 'FCL':
            response = Engine.handleFCL(query);
            break;
          case 'MARKET':
            response = Engine.handleMarket(query);
            break;
          case 'DOCS':
            response = Engine.handleDocs(query);
            break;
          case 'IDENTITY':
            response = Engine.getIdentity(query);
            break;
          case 'HELP':
            response = Engine.handleHelp(query);
            break;
          case 'EXIT':
            response = Engine.handleExit(query);
            break;
          default:
            response = Engine.handleFallback(query);
        }

        UI.renderResponse(response);
        Engine.logAnalytics(query, intent, response);

      } catch (err) {
        console.error('[Alliya] Processing error:', err);
        UI.renderResponse(Engine.handleError(err));
      }

      State.isProcessing = false;
    },

    // Search knowledge base with fuzzy matching
    searchKnowledge: async (query, knowledge, expandedQueries) => {
      if (!knowledge || knowledge.length === 0) return null;

      // Exact match
      const exactMatch = knowledge.find(k =>
        Utils.normalize(k.question) === Utils.normalize(query)
      );
      if (exactMatch) {
        return {
          title: '📚 Knowledge Base',
          summary: exactMatch.answer,
          sections: [{ heading: 'Details', body: exactMatch.answer }],
          metadata: { type: 'knowledge', icon: '📖' },
        };
      }

      // Fuzzy match against expanded queries
      let bestMatch = null;
      let bestScore = 0;

      for (const expanded of expandedQueries) {
        for (const k of knowledge) {
          const score = Utils.fuzzyMatch(expanded, k.question, 3) ? 5 : 0;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = k;
          }
        }
      }

      if (bestMatch && bestScore > 0) {
        return {
          title: '📚 Knowledge Base',
          summary: bestMatch.answer,
          sections: [{ heading: 'Details', body: bestMatch.answer }],
          metadata: { type: 'knowledge', icon: '📖' },
        };
      }

      return null;
    },

    // Personality responses
    getPersonality: (query) => {
      const q = Utils.normalize(query);
      const greetings = ['hi', 'hello', 'hey', 'howdy', 'salam', 'assalamualikum'];
      const thanks = ['thanks', 'thank you', 'thx', 'tks'];

      if (greetings.some(g => q.includes(g))) {
        return {
          title: `${Utils.getTimeGreeting()}! 👋`,
          summary: "I'm **Alliya**, your AI grain trade assistant at Grains Hub. How can I help you today?",
          actions: [
            { id: 'help', label: 'What can you do?', icon: '❓' },
            { id: 'stock', label: 'Check Stock', icon: '📦' },
            { id: 'fcl', label: 'Book FCL', icon: '🚢' },
          ],
          sections: [
            {
              heading: '💡 Try asking:',
              body: '• "Show me available rice stock"\n• "Who are your top suppliers?"\n• "How to book an FCL?"\n• "Download compliance guide"'
            }
          ],
          metadata: { type: 'greeting', icon: '👋' },
        };
      }

      if (thanks.some(t => q.includes(t))) {
        return {
          title: 'You\'re welcome! 😊',
          summary: "I'm glad I could help. Is there anything else you'd like to know?",
          actions: [
            { id: 'stock', label: 'Check Stock', icon: '📦' },
            { id: 'help', label: 'Get Help', icon: '❓' },
          ],
          metadata: { type: 'thanks', icon: '🙏' },
        };
      }

      return null;
    },

    // Stock handler
    handleStock: async (query, stock, suppliers, entities) => {
      if (!stock || stock.length === 0) {
        return {
          title: '📦 Stock Unavailable',
          summary: 'I couldn\'t load the stock data at this moment. Please try again later.',
          metadata: { type: 'error', icon: '⚠️' },
        };
      }

      // Find matching products
      let matches = stock;
      const q = Utils.normalize(query);

      if (entities.product) {
        matches = stock.filter(item =>
          Utils.normalize(item.name).includes(Utils.normalize(entities.product))
        );
      } else {
        // Fuzzy match across all fields
        matches = stock.filter(item => {
          const searchable = `${item.name} ${item.origin} ${item.packaging || ''}`;
          return Utils.fuzzyMatch(q, searchable, 3);
        });
      }

      if (matches.length === 0) {
        return {
          title: '📦 No Stock Found',
          summary: `I couldn't find "${query}" in our current inventory.`,
          sections: [
            {
              heading: '💡 Try:',
              body: '• "Show all rice stock"\n• "1121 Sella price"\n• "IRRI-6 stock"'
            }
          ],
          actions: [
            { id: 'stock_all', label: 'View All Stock', icon: '📋' },
          ],
          metadata: { type: 'warning', icon: '🔍' },
        };
      }

      // Build response with top 3 matches
      const topMatches = matches.slice(0, 3);
      const sections = topMatches.map(item => {
        const supplier = suppliers?.find(s =>
          s.products?.some(p => Utils.normalize(p).includes(Utils.normalize(item.name)))
        );

        const isBooking = String(item.price).toUpperCase().includes('USD');
        const priceRaw = parseFloat(item.price);
        const sizeKG = parseInt(item.size);
        const pricePerKg = (!isNaN(priceRaw) && !isNaN(sizeKG) && sizeKG > 0)
          ? (priceRaw / sizeKG).toFixed(2)
          : null;

        return {
          heading: `🏷️ ${item.name}`,
          body: `
            <strong>Origin:</strong> ${item.origin || 'N/A'}
            <br><strong>Packaging:</strong> ${item.packaging || 'Standard'}
            <br><strong>Stock:</strong> ${item.stock || 'Prompt shipment'}
            <br><strong>Price:</strong> ${isBooking ? item.price : `${item.price} / ${item.size}kg${pricePerKg ? ` → ${pricePerKg} AED/kg` : ''}`}
            <br><strong>Supplier:</strong> ${supplier ? `${supplier.name} (${supplier.badge})` : 'Verified Supplier'}
          `
        };
      });

      return {
        title: `📦 ${matches.length} Product${matches.length > 1 ? 's' : ''} Found`,
        summary: `Here are the top matches for "${query}"`,
        sections: sections,
        actions: [
          { id: 'stock_all', label: 'View All Stock', icon: '📋' },
          { id: 'fcl', label: 'Book FCL', icon: '🚢' },
        ],
        metadata: { type: 'stock', icon: '📦' },
      };
    },

    // Supplier handler
    handleSupplier: async (query, suppliers, entities) => {
      if (!suppliers || suppliers.length === 0) {
        return {
          title: '🏢 Supplier Unavailable',
          summary: 'I couldn\'t load the supplier directory. Please try again.',
          metadata: { type: 'error', icon: '⚠️' },
        };
      }

      const q = Utils.normalize(query);
      let matches = suppliers;

      if (entities.product) {
        matches = suppliers.filter(s =>
          s.products?.some(p => Utils.normalize(p).includes(Utils.normalize(entities.product)))
        );
      } else {
        matches = suppliers.filter(s => {
          const searchable = `${s.name} ${s.city} ${s.country} ${s.products?.join(' ') || ''}`;
          return Utils.fuzzyMatch(q, searchable, 3);
        });
      }

      if (matches.length === 0) {
        return {
          title: '🏢 No Suppliers Found',
          summary: `I couldn't find a supplier matching "${query}"`,
          actions: [
            { id: 'suppliers_all', label: 'View All Suppliers', icon: '📋' },
          ],
          metadata: { type: 'warning', icon: '🔍' },
        };
      }

      const topMatches = matches.slice(0, 3);
      const sections = topMatches.map(s => ({
        heading: `🏅 ${s.name}`,
        body: `
          <strong>Location:</strong> ${s.city}, ${s.country}
          <br><strong>Badge:</strong> ${s.badge || 'Verified'}
          <br><strong>Products:</strong> ${s.products?.join(', ') || 'Listed products'}
          <br><strong>Contact:</strong> ${s.contact || 'Available on request'}
        `
      }));

      return {
        title: `🏢 ${matches.length} Supplier${matches.length > 1 ? 's' : ''} Found`,
        summary: `Here are the top matching suppliers for "${query}"`,
        sections: sections,
        actions: [
          { id: 'suppliers_all', label: 'View All Suppliers', icon: '📋' },
        ],
        metadata: { type: 'supplier', icon: '🏢' },
      };
    },

    // FCL handler
    handleFCL: (query) => {
      return {
        title: '🚢 FCL Booking',
        summary: 'Book your full container load shipment instantly.',
        sections: [
          {
            heading: '📋 FCL Process',
            body: `
              1. **Select commodity** from our stock
              2. **Choose container size** (20ft/40ft)
              3. **Specify port** of loading/discharge
              4. **Submit booking** for verification
            `
          },
          {
            heading: '📄 Documents Required',
            body: '• Commercial Invoice\n• Packing List\n• Bill of Lading\n• Certificate of Origin\n• Phytosanitary Certificate'
          }
        ],
        actions: [
          { id: 'fcl_form', label: 'Book FCL Now', icon: '📝' },
          { id: 'docs_fcl', label: 'Download FCL Guide', icon: '📄' },
        ],
        metadata: { type: 'fcl', icon: '🚢' },
      };
    },

    // Market handler
    handleMarket: (query) => {
      return {
        title: '📊 Market Pulse',
        summary: 'Live grain market updates and price trends.',
        sections: [
          {
            heading: '📈 Latest Trends',
            body: '• **Rice (Basmati):** Stable demand\n• **Wheat:** Slight upward trend\n• **Corn:** Seasonal fluctuation'
          },
          {
            heading: '🔗 Quick Links',
            body: '• [View Live Prices](/pulse/index.html)\n• [Download Analysis Report](/docs/market-analysis-2025.pdf)'
          }
        ],
        actions: [
          { id: 'market_pulse', label: 'Open Market Pulse', icon: '📊' },
        ],
        metadata: { type: 'market', icon: '📊' },
      };
    },

    // Docs handler
    handleDocs: (query) => {
      const docs = [
        { name: 'Buyer Pack', id: 'docs_buyer' },
        { name: 'Supplier Onboarding Pack', id: 'docs_supplier' },
        { name: 'FCL Guide', id: 'docs_fcl' },
        { name: 'Compliance Guide', id: 'docs_compliance' },
        { name: 'Market Analysis 2025', id: 'docs_market' },
      ];

      return {
        title: '📄 Documentation Hub',
        summary: 'Access all official Grains Hub documents.',
        sections: [
          {
            heading: '📚 Available Documents',
            body: docs.map(d => `• **[${d.name}](/${d.id}.pdf)**`).join('\n')
          }
        ],
        actions: docs.map(d => ({
          id: d.id,
          label: d.name,
          icon: '📄'
        })),
        metadata: { type: 'docs', icon: '📄' },
      };
    },

    // Help handler
    handleHelp: (query) => {
      return {
        title: '❓ How Can I Help You?',
        summary: 'I\'m Alliya, your AI assistant for grain trade at Grains Hub.',
        sections: [
          {
            heading: '🔍 What I Can Do:',
            body: `
              • **Check Stock** — "Show me 1121 Sella price"
              • **Find Suppliers** — "Who supplies IRRI-6?"
              • **Book FCL** — "How to book a container?"
              • **Market Updates** — "What are current prices?"
              • **Documentation** — "Download compliance guide"
              • **Trade Info** — "What is the payment process?"
            `
          }
        ],
        actions: [
          { id: 'help_examples', label: 'Show Examples', icon: '💡' },
        ],
        metadata: { type: 'help', icon: '❓' },
      };
    },

    // Exit handler
    handleExit: (query) => {
      return {
        title: '👋 Goodbye!',
        summary: "Thanks for chatting with me. Here are some quick links for your future visits:",
        sections: [
          {
            heading: '📌 Quick Access',
            body: '• **[Stock](/shop)**\n• **[FCL Booking](/fcl/)**\n• **[Market Pulse](/pulse/index.html)**'
          }
        ],
        metadata: { type: 'exit', icon: '👋' },
      };
    },

    // Identity handler
    getIdentity: (query) => {
      return {
        title: '🤖 About Alliya',
        summary: 'I\'m **Alliya** — Dubai\'s first AI grain assistant, built for verified grain trade.',
        sections: [
          {
            heading: '🏗️ Built By',
            body: '**Shahid Bashir** — Founder of Grains Hub, GhutraTech, and Ghutra Goods Wholesaler LLC.'
          },
          {
            heading: '📍 Location',
            body: 'Al Ras, Deira — Dubai\'s historic wholesale grain district.'
          },
          {
            heading: '💡 Purpose',
            body: 'To simplify grain trade by providing instant access to stock, suppliers, FCL, and compliance information.'
          }
        ],
        metadata: { type: 'identity', icon: '🤖' },
      };
    },

    // Fallback handler
    handleFallback: (query) => {
      return {
        title: '🤔 I\'m Not Sure I Understand',
        summary: `I couldn't find a direct match for "${query}"`,
        sections: [
          {
            heading: '💡 Try These Instead:',
            body: '• **"Show me rice stock"**\n• **"Who are your suppliers?"**\n• **"How to book FCL?"**\n• **"Download compliance guide"**'
          }
        ],
        actions: [
          { id: 'help', label: 'Show All Features', icon: '❓' },
          { id: 'stock_all', label: 'View Stock', icon: '📦' },
        ],
        metadata: { type: 'fallback', icon: '🤔' },
      };
    },

    // Error handler
    handleError: (err) => {
      return {
        title: '⚠️ Oops! Something Went Wrong',
        summary: err.message || 'An unexpected error occurred. Please try again.',
        sections: [
          {
            heading: '🔄 What to do:',
            body: '1. Refresh the page\n2. Check your internet connection\n3. Try a different question'
          }
        ],
        actions: [
          { id: 'retry', label: 'Retry', icon: '🔄' },
        ],
        metadata: { type: 'error', icon: '⚠️' },
      };
    },

    // Analytics logging
    logAnalytics: (query, intent, response) => {
      if (!CONFIG.ANALYTICS.ENABLED) return;

      const log = {
        sessionId: State.sessionId,
        timestamp: new Date().toISOString(),
        query: query,
        intent: intent,
        responseTitle: response?.title || 'N/A',
        language: Utils.detectLanguage(query),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Send to analytics endpoint (optional)
      if (CONFIG.ANALYTICS.ENDPOINT) {
        try {
          fetch(CONFIG.ANALYTICS.ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log),
          }).catch(() => {});
        } catch (_) {}
      }

      // Store in localStorage for internal analytics
      const history = JSON.parse(localStorage.getItem('alliya-analytics') || '[]');
      history.push(log);
      if (history.length > 100) history.shift(); // Keep last 100
      localStorage.setItem('alliya-analytics', JSON.stringify(history));
    },

    // Action handler (for buttons)
    handleAction: (actionId, label) => {
      const actions = {
        'help': 'What can you do?',
        'stock': 'Show me all stock',
        'stock_all': 'Show me all stock',
        'fcl': 'How to book FCL?',
        'fcl_form': 'Open FCL booking page',
        'market_pulse': 'Show market pulse',
        'suppliers_all': 'Show all suppliers',
        'docs_buyer': 'Download buyer pack',
        'docs_supplier': 'Download supplier pack',
        'docs_fcl': 'Download FCL guide',
        'docs_compliance': 'Download compliance guide',
        'docs_market': 'Download market analysis',
        'retry': State.currentQuery || 'help',
        'help_examples': 'Show me what you can do',
      };

      const query = actions[actionId] || label || 'help';
      Engine.process(query);
    },

    // Rate message
    rateMessage: (rating) => {
      // Simple feedback tracking
      const feedback = JSON.parse(localStorage.getItem('alliya-feedback') || '[]');
      feedback.push({
        timestamp: new Date().toISOString(),
        rating: rating,
        query: State.currentQuery,
        sessionId: State.sessionId,
      });
      localStorage.setItem('alliya-feedback', JSON.stringify(feedback));

      UI.showToast(`Thanks for your feedback! ${rating === 'helpful' ? '🙂' : '😞'}`);
    },
  };

  // ========================================================
  // UI ENGINE
  // ========================================================
  const UI = {
    init: () => {
      // Inject CSS
      UI.injectStyles();

      // Inject HTML
      UI.injectHTML();

      // Setup event listeners
      UI.setupListeners();

      // Apply preferences
      if (State.preferences.darkMode) {
        document.documentElement.classList.add('alliya-dark');
      }

      // Auto-open on first visit? (Optional)
      // setTimeout(() => UI.openModal(), 2000);
    },

    injectStyles: () => {
      const styles = `
        /* ========================================================
           ALLIYA v8 - Complete Styles
           ======================================================== */
        :root {
          --alliya-primary: #1a73e8;
          --alliya-primary-dark: #1557b0;
          --alliya-bg: #ffffff;
          --alliya-bg-dark: #1a1a2e;
          --alliya-text: #333333;
          --alliya-text-dark: #e0e0e0;
          --alliya-bubble-user: #e3f2fd;
          --alliya-bubble-ai: #f5f5f5;
          --alliya-bubble-user-dark: #1a237e;
          --alliya-bubble-ai-dark: #2d2d44;
          --alliya-shadow: 0 10px 40px rgba(0,0,0,0.15);
          --alliya-radius: 16px;
          --alliya-transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Dark Mode */
        .alliya-dark {
          --alliya-bg: #1a1a2e;
          --alliya-text: #e0e0e0;
          --alliya-bubble-user: #1a237e;
          --alliya-bubble-ai: #2d2d44;
        }

        /* Float Button */
        #alliyaFloatBtn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: linear-gradient(135deg, #1a73e8, #0d47a1);
          color: white;
          border: none;
          border-radius: 50px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: var(--alliya-shadow);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 9999;
          transition: var(--alliya-transition);
          animation: alliyaPulse 2s infinite;
        }

        #alliyaFloatBtn:hover {
          transform: scale(1.05);
          box-shadow: 0 15px 50px rgba(26, 115, 232, 0.4);
        }

        #alliyaFloatBtn img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }

        @keyframes alliyaPulse {
          0%, 100% { box-shadow: 0 10px 40px rgba(26, 115, 232, 0.3); }
          50% { box-shadow: 0 10px 60px rgba(26, 115, 232, 0.6); }
        }

        /* Modal */
        .alliya-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: 10000;
          animation: alliyaFadeIn 0.3s ease;
          padding: 20px;
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
          border-radius: var(--alliya-radius);
          box-shadow: var(--alliya-shadow);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Header */
        .alliya-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #1a73e8, #0d47a1);
          color: white;
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
        }

        .alliya-header-left .status {
          font-size: 12px;
          opacity: 0.8;
          display: block;
        }

        .alliya-header-actions {
          display: flex;
          gap: 8px;
        }

        .alliya-header-actions button {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          transition: var(--alliya-transition);
        }

        .alliya-header-actions button:hover {
          background: rgba(255,255,255,0.3);
        }

        /* Chat Body */
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

        .alliya-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .alliya-body::-webkit-scrollbar-thumb {
          background: #1a73e8;
          border-radius: 10px;
        }

        /* Messages */
        .alliya-bubble {
          max-width: 85%;
          padding: 14px 18px;
          border-radius: var(--alliya-radius);
          animation: alliyaSlideIn 0.3s ease;
          align-self: flex-start;
          background: var(--alliya-bubble-ai);
          color: var(--alliya-text);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .alliya-bubble.user {
          align-self: flex-end;
          background: var(--alliya-bubble-user);
          color: var(--alliya-text);
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

        .alliya-bubble-header .alliya-icon {
          font-size: 18px;
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

        .alliya-bubble-body p {
          margin: 0 0 8px 0;
        }

        .alliya-bubble-body h4 {
          margin: 12px 0 6px 0;
          font-size: 14px;
          color: var(--alliya-primary);
        }

        .alliya-bubble-body a {
          color: var(--alliya-primary);
          text-decoration: none;
        }

        .alliya-bubble-body a:hover {
          text-decoration: underline;
        }

        .alliya-section {
          margin: 10px 0;
          padding: 10px 12px;
          background: rgba(0,0,0,0.03);
          border-radius: 10px;
        }

        .alliya-dark .alliya-section {
          background: rgba(255,255,255,0.05);
        }

        /* Actions / Quick Replies */
        .alliya-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .alliya-action-btn {
          background: var(--alliya-primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: var(--alliya-transition);
          font-weight: 500;
        }

        .alliya-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(26, 115, 232, 0.4);
        }

        .alliya-quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .alliya-quick-btn {
          background: transparent;
          border: 2px solid var(--alliya-primary);
          color: var(--alliya-primary);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: var(--alliya-transition);
        }

        .alliya-quick-btn:hover {
          background: var(--alliya-primary);
          color: white;
        }

        /* Typing Indicator */
        .alliya-typing {
          display: none;
          align-self: flex-start;
          padding: 12px 18px;
          background: var(--alliya-bubble-ai);
          border-radius: var(--alliya-radius);
        }

        .alliya-typing span {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--alliya-text);
          margin: 0 2px;
          animation: alliyaTyping 1.4s infinite both;
        }

        .alliya-typing span:nth-child(2) { animation-delay: 0.2s; }
        .alliya-typing span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes alliyaTyping {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Footer / Input */
        .alliya-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(0,0,0,0.08);
          display: flex;
          gap: 10px;
          flex-shrink: 0;
          background: var(--alliya-bg);
        }

        .alliya-dark .alliya-footer {
          border-top-color: rgba(255,255,255,0.08);
        }

        .alliya-footer input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid rgba(0,0,0,0.1);
          border-radius: 25px;
          font-size: 14px;
          outline: none;
          transition: var(--alliya-transition);
          background: transparent;
          color: var(--alliya-text);
        }

        .alliya-footer input:focus {
          border-color: var(--alliya-primary);
          box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2);
        }

        .alliya-footer input::placeholder {
          color: #999;
        }

        .alliya-footer .input-actions {
          display: flex;
          gap: 6px;
        }

        .alliya-footer button {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: var(--alliya-primary);
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: var(--alliya-transition);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alliya-footer button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(26, 115, 232, 0.4);
        }

        .alliya-footer button.voice-btn {
          background: transparent;
          color: var(--alliya-primary);
          font-size: 22px;
        }

        .alliya-footer button.voice-btn.recording {
          color: #e53935;
          animation: alliyaPulse 1s infinite;
        }

        /* Suggestions */
        .alliya-suggestions {
          position: absolute;
          bottom: 70px;
          left: 20px;
          right: 20px;
          background: var(--alliya-bg);
          border-radius: 12px;
          box-shadow: var(--alliya-shadow);
          max-height: 200px;
          overflow-y: auto;
          display: none;
          z-index: 10;
        }

        .alliya-suggestions.show {
          display: block;
        }

        .alliya-suggestion-item {
          padding: 10px 16px;
          cursor: pointer;
          transition: var(--alliya-transition);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          font-size: 14px;
          color: var(--alliya-text);
        }

        .alliya-suggestion-item:hover {
          background: rgba(26, 115, 232, 0.08);
        }

        /* Toast */
        .alliya-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 10px 24px;
          border-radius: 30px;
          font-size: 14px;
          z-index: 99999;
          animation: alliyaSlideUp 0.3s ease;
          box-shadow: var(--alliya-shadow);
        }

        @keyframes alliyaSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Responsive */
        @media (max-width: 600px) {
          .alliya-modal-content {
            height: 95vh;
            max-height: none;
            margin: 0;
            border-radius: 0;
          }

          #alliyaFloatBtn {
            bottom: 16px;
            right: 16px;
            padding: 12px 16px;
            font-size: 14px;
          }

          #alliyaFloatBtn span {
            display: none;
          }

          .alliya-bubble {
            max-width: 92%;
          }
        }
      `;

      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    },

    injectHTML: () => {
      const html = `
        <!-- Alliya Modal -->
        <div id="alliyaModal" class="alliya-modal">
          <div class="alliya-modal-content">
            <!-- Header -->
            <div class="alliya-header">
              <div class="alliya-header-left">
                <img src="/assets/img/alliya-icon.ico" alt="Alliya">
                <div>
                  <h2>Ask Alliya</h2>
                  <span class="status">● Online</span>
                </div>
              </div>
              <div class="alliya-header-actions">
                <button onclick="window.Alliya.clearChat()" title="Clear chat">🗑️</button>
                <button onclick="window.Alliya.toggleDarkMode()" title="Toggle dark mode">🌙</button>
                <button onclick="window.Alliya.closeModal()" title="Close">✕</button>
              </div>
            </div>

            <!-- Chat Body -->
            <div id="alliyaBody" class="alliya-body">
              <!-- Messages appear here -->
              <div class="alliya-bubble">
                <div class="alliya-bubble-header">
                  <span class="alliya-icon">👋</span>
                  <span class="alliya-title">Welcome to Grains Hub</span>
                  <span class="alliya-time">${Utils.timestamp()}</span>
                </div>
                <div class="alliya-bubble-body">
                  <p>Hello! I'm <strong>Alliya</strong>, your AI grain trade assistant.</p>
                  <p>Ask me about stock, suppliers, FCL, documentation, or market prices.</p>
                </div>
                <div class="alliya-quick-replies">
                  <button class="alliya-quick-btn" onclick="window.Alliya.ask('Show me stock')">📦 View Stock</button>
                  <button class="alliya-quick-btn" onclick="window.Alliya.ask('Who are your suppliers?')">🏢 Suppliers</button>
                  <button class="alliya-quick-btn" onclick="window.Alliya.ask('How to book FCL?')">🚢 Book FCL</button>
                  <button class="alliya-quick-btn" onclick="window.Alliya.ask('Download compliance guide')">📄 Documents</button>
                </div>
              </div>
            </div>

            <!-- Typing Indicator -->
            <div id="alliyaTyping" class="alliya-typing">
              <span></span><span></span><span></span>
            </div>

            <!-- Suggestions -->
            <div id="alliyaSuggestions" class="alliya-suggestions"></div>

            <!-- Footer -->
            <div class="alliya-footer">
              <input id="alliyaInput" type="text" placeholder="Ask me anything..." autocomplete="off">
              <div class="input-actions">
                <button id="alliyaVoiceBtn" class="voice-btn" title="Voice input">🎤</button>
                <button id="alliyaSendBtn" title="Send">➤</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Float Button -->
        <button id="alliyaFloatBtn" onclick="window.Alliya.openModal()">
          <img src="/assets/img/alliya-icon.ico" alt="Alliya">
          <span>Ask Alliya</span>
        </button>
      `;

      document.body.insertAdjacentHTML('beforeend', html);
    },

    setupListeners: () => {
      const input = document.getElementById('alliyaInput');
      const sendBtn = document.getElementById('alliyaSendBtn');
      const voiceBtn = document.getElementById('alliyaVoiceBtn');
      const suggestions = document.getElementById('alliyaSuggestions');
      const body = document.getElementById('alliyaBody');

      // Send on Enter
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.Alliya.ask(input.value);
        }
      });

      // Send button
      sendBtn?.addEventListener('click', () => {
        window.Alliya.ask(input?.value || '');
      });

      // Voice input
      voiceBtn?.addEventListener('click', () => {
        window.Alliya.startVoiceInput();
      });

      // Input suggestions with debounce
      const debouncedSuggest = Utils.debounce(window.Alliya.showSuggestions, 300);
      input?.addEventListener('input', debouncedSuggest);

      // Close suggestions on blur
      input?.addEventListener('blur', () => {
        setTimeout(() => {
          suggestions?.classList.remove('show');
        }, 200);
      });

      // Close modal on outside click
      document.getElementById('alliyaModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          window.Alliya.closeModal();
        }
      });

      // Keyboard shortcut: Ctrl+Shift+A to toggle
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          const modal = document.getElementById('alliyaModal');
          if (modal?.style.display === 'block') {
            window.Alliya.closeModal();
          } else {
            window.Alliya.openModal();
          }
        }
      });
    },

    renderResponse: (response) => {
      UI.hideTyping();
      const body = document.getElementById('alliyaBody');
      if (!body) return;

      const html = ResponseBuilder.build(response);
      body.insertAdjacentHTML('beforeend', html);
      body.scrollTop = body.scrollHeight;

      // Clear input
      const input = document.getElementById('alliyaInput');
      if (input) input.value = '';

      // Hide suggestions
      document.getElementById('alliyaSuggestions')?.classList.remove('show');

      // Save conversation
      State.conversation.push({
        role: 'user',
        query: State.currentQuery,
        response: response,
        timestamp: new Date().toISOString(),
      });
      if (State.conversation.length > CONFIG.UI.MAX_HISTORY) {
        State.conversation.shift();
      }
    },

    renderUserMessage: (query) => {
      const body = document.getElementById('alliyaBody');
      if (!body) return;

      const html = `
        <div class="alliya-bubble user">
          <div class="alliya-bubble-header">
            <span class="alliya-icon">👤</span>
            <span class="alliya-title">You</span>
            <span class="alliya-time">${Utils.timestamp()}</span>
          </div>
          <div class="alliya-bubble-body">
            <p>${Utils.sanitize(query)}</p>
          </div>
        </div>
      `;

      body.insertAdjacentHTML('beforeend', html);
      body.scrollTop = body.scrollHeight;
    },

    showTyping: () => {
      document.getElementById('alliyaTyping').style.display = 'flex';
    },

    hideTyping: () => {
      document.getElementById('alliyaTyping').style.display = 'none';
    },

    openModal: () => {
      const modal = document.getElementById('alliyaModal');
      if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
          document.getElementById('alliyaInput')?.focus();
        }, 300);
      }
    },

    closeModal: () => {
      const modal = document.getElementById('alliyaModal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    },

    clearChat: () => {
      const body = document.getElementById('alliyaBody');
      if (body) {
        body.innerHTML = '';
        State.conversation = [];
        // Re-add welcome message
        UI.renderResponse({
          title: '👋 Chat Cleared',
          summary: 'How can I help you today?',
          metadata: { type: 'info', icon: '👋' },
        });
      }
    },

    toggleDarkMode: () => {
      State.preferences.darkMode = !State.preferences.darkMode;
      localStorage.setItem('alliya-dark', State.preferences.darkMode);
      document.documentElement.classList.toggle('alliya-dark');
      UI.showToast(State.preferences.darkMode ? '🌙 Dark mode enabled' : '☀️ Light mode enabled');
    },

    showToast: (message) => {
      const existing = document.querySelector('.alliya-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'alliya-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    showSuggestions: async () => {
      const input = document.getElementById('alliyaInput');
      const box = document.getElementById('alliyaSuggestions');
      if (!input || !box) return;

      const query = input.value.trim();
      if (query.length < 2) {
        box.classList.remove('show');
        return;
      }

      const q = Utils.normalize(query);

      try {
        const [stock, knowledge] = await Promise.all([
          DataLoader.loadStock(),
          DataLoader.loadKnowledge(),
        ]);

        const suggestions = new Set();

        // Stock suggestions
        stock?.forEach(item => {
          if (Utils.normalize(item.name).includes(q)) {
            suggestions.add(item.name);
          }
        });

        // Knowledge suggestions
        knowledge?.forEach(k => {
          if (Utils.normalize(k.question).includes(q)) {
            suggestions.add(k.question);
          }
        });

        // Common intents
        const intents = [
          'Show me all stock',
          'Who are your suppliers?',
          'How to book FCL?',
          'Download compliance guide',
          'What are current market prices?',
          'Tell me about Alliya',
        ];

        intents.forEach(i => {
          if (Utils.normalize(i).includes(q)) {
            suggestions.add(i);
          }
        });

        const list = Array.from(suggestions).slice(0, CONFIG.UI.SUGGESTION_LIMIT);

        if (list.length === 0) {
          box.classList.remove('show');
          return;
        }

        box.innerHTML = list.map(text => `
          <div class="alliya-suggestion-item" 
               onclick="window.Alliya.ask('${Utils.sanitize(text).replace(/'/g, "\\'")}')">
            ${Utils.sanitize(text)}
          </div>
        `).join('');

        box.classList.add('show');

      } catch (err) {
        console.warn('[Alliya] Suggestion error:', err);
        box.classList.remove('show');
      }
    },
  };

  // ========================================================
  // VOICE INPUT
  // ========================================================
  const Voice = {
    recognition: null,
    isRecording: false,

    init: () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        document.getElementById('alliyaVoiceBtn')?.remove();
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      Voice.recognition = new SpeechRecognition();
      Voice.recognition.lang = 'en-US';
      Voice.recognition.continuous = false;
      Voice.recognition.interimResults = true;

      Voice.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const input = document.getElementById('alliyaInput');
        if (input) input.value = transcript;
      };

      Voice.recognition.onend = () => {
        Voice.isRecording = false;
        const btn = document.getElementById('alliyaVoiceBtn');
        if (btn) btn.classList.remove('recording');
        // Auto-submit after voice input
        const input = document.getElementById('alliyaInput');
        if (input?.value.trim()) {
          setTimeout(() => window.Alliya.ask(input.value), 500);
        }
      };

      Voice.recognition.onerror = (event) => {
        console.warn('[Alliya] Voice error:', event.error);
        Voice.isRecording = false;
        const btn = document.getElementById('alliyaVoiceBtn');
        if (btn) btn.classList.remove('recording');
        UI.showToast('⚠️ Voice input failed. Please type your question.');
      };
    },

    toggle: () => {
      if (!Voice.recognition) return;

      if (Voice.isRecording) {
        Voice.recognition.stop();
        Voice.isRecording = false;
        const btn = document.getElementById('alliyaVoiceBtn');
        if (btn) btn.classList.remove('recording');
        return;
      }

      try {
        Voice.recognition.start();
        Voice.isRecording = true;
        const btn = document.getElementById('alliyaVoiceBtn');
        if (btn) btn.classList.add('recording');
        UI.showToast('🎤 Listening... Speak your question.');
      } catch (err) {
        console.warn('[Alliya] Voice start error:', err);
        UI.showToast('⚠️ Please allow microphone access.');
      }
    },
  };

  // ========================================================
  // EXPOSE PUBLIC API
  // ========================================================
  window.Alliya = {
    // Core
    ask: (query) => {
      if (!query || !query.trim()) {
        UI.showToast('Please ask a question.');
        return;
      }
      UI.renderUserMessage(query.trim());
      Engine.process(query.trim());
    },

    // Modal controls
    openModal: UI.openModal,
    closeModal: UI.closeModal,
    toggleModal: () => {
      const modal = document.getElementById('alliyaModal');
      if (modal?.style.display === 'block') {
        UI.closeModal();
      } else {
        UI.openModal();
      }
    },

    // Chat controls
    clearChat: UI.clearChat,
    toggleDarkMode: UI.toggleDarkMode,

    // Voice
    startVoiceInput: Voice.toggle,

    // Suggestions
    showSuggestions: UI.showSuggestions,

    // Actions
    handleAction: Engine.handleAction,
    rateMessage: Engine.rateMessage,

    // Get state
    getState: () => ({ ...State }),
    getConversation: () => [...State.conversation],

    // Export chat
    exportChat: () => {
      const data = {
        sessionId: State.sessionId,
        exportedAt: new Date().toISOString(),
        conversation: State.conversation,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alliya-chat-${State.sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.showToast('📥 Chat exported successfully!');
    },
  };

  // ========================================================
  // INITIALIZE
  // ========================================================
  document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    Voice.init();

    console.log(`%c🤖 Alliya v8.0 loaded`, 'font-size:20px; font-weight:bold; color:#1a73e8;');
    console.log(`%cSession: ${State.sessionId}`, 'font-size:12px; color:#666;');
    console.log(`%c🔍 Try typing "Help" to get started`, 'font-size:12px; color:#1a73e8;');

    // Check for data availability
    Promise.all([
      DataLoader.loadStock(),
      DataLoader.loadSuppliers(),
      DataLoader.loadKnowledge(),
    ]).then(([stock, suppliers, knowledge]) => {
      console.log(`%c✅ Data loaded: ${stock?.length || 0} products, ${suppliers?.length || 0} suppliers, ${knowledge?.length || 0} knowledge items`, 'font-size:12px; color:green;');
    }).catch(err => {
      console.warn('%c⚠️ Some data failed to load. Check your JSON files.', 'font-size:12px; color:orange;');
    });
  });

})();
