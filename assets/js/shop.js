/* ============================================================
   SHOP.JS - Grains Hub
   Dynamic product grid with filtering
   Version: 2.0
   ============================================================ */

let allListings = [];
let currentFilters = { origin: '', tier: '', type: '' };

// ============================================================
// 1. LOAD PRODUCTS
// ============================================================
async function loadShop() {
  const grid = document.getElementById('productGrid');

  try {
    // Try Firestore first
    if (window.db && window.collection && window.getDocs) {
      const productsRef = window.collection(window.db, 'products');
      const snapshot = await window.getDocs(productsRef);

      if (!snapshot.empty) {
        allListings = [];
        snapshot.forEach(doc => {
          const item = doc.data();
          allListings.push({
            id: doc.id,
            name: item.name || 'Unnamed Product',
            origin: item.origin || 'Unknown',
            packaging: item.packaging || 'Standard',
            price: item.price || 'Contact',
            size: item.size || 'N/A',
            stock: item.stock || 'Available',
            badge: item.badge || 'Verified Supplier',
            img: item.imageName || 'placeholder.jpg',
            keywords: item.keywords || []
          });
        });
        renderShop(allListings);
        updateCount(allListings.length);
        return;
      }
    }

    // Fallback: Load from stock.json
    const res = await fetch('/assets/data/stock.json?t=' + Date.now());
    if (!res.ok) throw new Error('Failed to load stock data');
    const data = await res.json();

    allListings = data.map(item => ({
      name: item.name || 'Unnamed Product',
      origin: item.origin || 'Unknown',
      packaging: item.packaging || 'Standard',
      price: item.price || 'Contact',
      size: item.size || 'N/A',
      stock: item.stock || 'Available',
      badge: item.badge || 'Verified Supplier',
      img: item.img || 'placeholder.jpg',
      keywords: []
    }));

    renderShop(allListings);
    updateCount(allListings.length);

  } catch (err) {
    console.error('Shop load error:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#e74c3c;margin-bottom:12px;display:block;"></i>
        <p>Unable to load products. Please try again.</p>
        <p class="suggestion">Contact us directly on <a href="https://wa.me/971585521976" style="color:#25D366;font-weight:600;">WhatsApp</a></p>
      </div>
    `;
  }
}

// ============================================================
// 2. RENDER SHOP
// ============================================================
function renderShop(listings) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  if (!listings || listings.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search" style="font-size:2rem;color:#C1A875;margin-bottom:12px;display:block;"></i>
        <p>No products match your filters.</p>
        <p class="suggestion">Try adjusting your filters or <a href="https://wa.me/971585521976" style="color:#25D366;font-weight:600;">contact us</a> for custom sourcing.</p>
      </div>
    `;
    return;
  }

  listings.forEach(item => {
    const isBooking = item.stock.toLowerCase().includes('booking');
    const isUsd = item.price.includes('USD');
    const priceDisplay = item.price;
    const kgPrice = !isUsd && item.size !== 'N/A' && !isNaN(parseFloat(item.price.replace(/[^0-9.]/g, ''))) && !isNaN(parseInt(item.size))
      ? (parseFloat(item.price.replace(/[^0-9.]/g, '')) / parseInt(item.size)).toFixed(2)
      : null;

    // Badge class
    let badgeClass = 'verified';
    if (item.badge.toLowerCase().includes('peer')) badgeClass = 'peer';
    if (item.badge.toLowerCase().includes('pre-booking')) badgeClass = 'booking';

    // Stock status
    const stockStatus = isBooking ? 'booking' : 'in-stock';
    const stockText = isBooking ? '📋 Booking' : '✅ In Stock';

    // Image fallback
    const imgSrc = `/assets/img/${item.img}`;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.origin = item.origin;
    card.dataset.badge = item.badge;
    card.dataset.type = item.name.toLowerCase();

    card.innerHTML = `
      <div class="image-wrapper">
        <img src="${imgSrc}" alt="${item.name}" loading="lazy" onerror="this.src='/assets/img/placeholder.jpg'">
        <span class="badge-top ${badgeClass}">${item.badge}</span>
      </div>
      <div class="content">
        <h3>${item.name}</h3>
        <div class="meta">
          <span><i class="fas fa-map-marker-alt"></i> ${item.origin}</span>
          <span><i class="fas fa-box"></i> ${item.packaging}</span>
        </div>
        <div class="price-row">
          <span class="price">${priceDisplay} <small>/${item.size}</small></span>
          ${kgPrice ? `<span class="kg-price">${kgPrice} AED/kg</span>` : ''}
        </div>
        <div class="stock-info">
          <span class="${stockStatus}">${stockText}</span>
          <span style="margin-left:12px;color:#999;">${item.stock}</span>
        </div>
        <a href="https://wa.me/971585521976?text=${encodeURIComponent('Inquiry: ' + item.name + ' - ' + item.price)}" 
           class="btn-whatsapp" target="_blank">
          <i class="fab fa-whatsapp"></i> Get Quote
        </a>
      </div>
    `;

    grid.appendChild(card);
  });

  updateCount(listings.length);
}

// ============================================================
// 3. FILTER PRODUCTS
// ============================================================
function filterProducts() {
  const origin = document.getElementById('filterOrigin').value;
  const tier = document.getElementById('filterTier').value;
  const type = document.getElementById('filterType').value;

  currentFilters = { origin, tier, type };

  let filtered = allListings;

  if (origin) {
    filtered = filtered.filter(item => item.origin === origin);
  }

  if (tier) {
    filtered = filtered.filter(item => item.badge.toLowerCase().includes(tier.toLowerCase()));
  }

  if (type) {
    filtered = filtered.filter(item => item.name.toLowerCase().includes(type.toLowerCase()));
  }

  renderShop(filtered);
}

// ============================================================
// 4. UPDATE COUNT
// ============================================================
function updateCount(count) {
  const el = document.getElementById('productCount');
  if (el) {
    el.textContent = count + ' product' + (count !== 1 ? 's' : '') + ' available';
  }
}

// ============================================================
// 5. RESET FILTERS
// ============================================================
function resetFilters() {
  document.getElementById('filterOrigin').value = '';
  document.getElementById('filterTier').value = '';
  document.getElementById('filterType').value = '';
  filterProducts();
}

// ============================================================
// 6. INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  // Load products
  loadShop();

  // Filter on change
  document.getElementById('filterOrigin').addEventListener('change', filterProducts);
  document.getElementById('filterTier').addEventListener('change', filterProducts);
  document.getElementById('filterType').addEventListener('change', filterProducts);

  // Reset button
  document.getElementById('resetFilters').addEventListener('click', resetFilters);

  console.log('✅ Shop v2.0 loaded');
});

// ============================================================
// 7. EXPOSE FOR GLOBAL USE
// ============================================================
window.filterShop = filterProducts;
window.resetShopFilters = resetFilters;
window.loadShop = loadShop;
