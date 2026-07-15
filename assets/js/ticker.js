/* ============================================================
   TICKER.JS - Universal News Ticker
   Auto-injects ticker on all pages from single JSON source
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Find all ticker containers
  const tickerContainers = document.querySelectorAll('.ticker-container');
  
  if (tickerContainers.length === 0) {
    // If no container, create one after the top banner
    const banner = document.querySelector('.top-banner');
    if (banner) {
      const container = document.createElement('div');
      container.className = 'ticker-container';
      container.style.cssText = `
        background: #f8f5ec;
        padding: 10px 20px;
        border-bottom: 1px solid #e8e4d8;
        overflow: hidden;
        position: relative;
      `;
      container.innerHTML = `
        <div class="ticker-wrapper" style="
          overflow: hidden;
          white-space: nowrap;
          position: relative;
        ">
          <div class="ticker-content" id="tickerContent" style="
            display: inline-block;
            animation: tickerScroll 40s linear infinite;
            padding-right: 60px;
          "></div>
        </div>
        <style>
          @keyframes tickerScroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .ticker-container:hover .ticker-content {
            animation-play-state: paused;
          }
        </style>
      `;
      banner.parentNode.insertBefore(container, banner.nextSibling);
    }
  }

  // Load ticker data
  async function loadTicker() {
    try {
      const response = await fetch('/assets/data/ticker.json?t=' + Date.now(), {
        cache: 'no-cache'
      });
      
      if (!response.ok) throw new Error('Failed to load ticker data');
      
      const data = await response.json();
      const messages = data.messages || [];
      
      if (messages.length === 0) {
        console.warn('No ticker messages found');
        return;
      }

      // Update all ticker containers
      const contentElements = document.querySelectorAll('#tickerContent, .ticker-content');
      
      contentElements.forEach(el => {
        // Build HTML with separator
        const html = messages.map(msg => 
          `<span style="margin: 0 30px;">${msg}</span>`
        ).join('');
        
        el.innerHTML = html;
      });

      console.log('✅ Ticker loaded with ' + messages.length + ' messages');

    } catch (err) {
      console.warn('Ticker load failed:', err);
      // Fallback messages if JSON fails
      const fallbackMessages = [
        '🌾 Grains Hub — Dubai\'s Compliance-First B2B Grain Supplier',
        '📦 Live Stock Updated Daily • Verified Suppliers',
        '🚢 FCL Booking Available • Jebel Ali Ready'
      ];
      
      document.querySelectorAll('#tickerContent, .ticker-content').forEach(el => {
        el.innerHTML = fallbackMessages.map(msg => 
          `<span style="margin: 0 30px;">${msg}</span>`
        ).join('');
      });
    }
  }

  loadTicker();
  // Refresh every 5 minutes
  setInterval(loadTicker, 300000);
});

// Also expose for manual refresh
window.refreshTicker = function() {
  const event = new Event('DOMContentLoaded');
  document.dispatchEvent(event);
};
