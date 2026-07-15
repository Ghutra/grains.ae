/* ============================================================
   SHOP.JS - Grains Hub
   Dynamic product grid with filtering
   Version: 2.1 - Fixed loading from stock.json
   ============================================================ */

let allListings = [];
let currentFilters = { origin: '', tier: '', type: '' };

// ============================================================
// 1. LOAD PRODUCTS - Priority: stock.json first
// ============================================================
async function loadShop() {
  const grid = document.getElementById('productGrid');
  
  // Show loading state
  grid.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading verified grains...</p>
    </div>
  `;

  try {
    // TRY 1: Load from stock.json (Primary source)
    console.log('📦 Loading from stock.json...');
    const stockRes = await fetch('/assets/data/stock.json?t=' + Date.now());
    
    if (stockRes.ok) {
      const data = await stockRes.json();
      
      if (data && data.length > 0) {
        allListings = data.map(item => ({
          name: item.name || 'Unnamed Product',
          origin: item.origin || 'Unknown',
          packaging: item.packaging || 'Standard',
          price: item.price || 'Contact',
          size: item.size || 'N/A',
          stock: item.stock || 'Available',
          badge: item.badge || 'Verified Supplier',
          img: item.img || 'placeholder.jpg',
          keywords: item.keywords || []
        }));
        
        console.log('✅ Loaded ' + allListings.length + ' products from stock.json');
        renderShop(allListings);
        updateCount(allListings.length);
        return;
      }
    }

    // TRY 2: Fallback to Firestore
    console.log('📦 stock.json failed, trying Firestore...');
    if (window.db && window.collection && window.getDocs) {
      try {
        const productsRef = window.collection(window.db, 'products');
        const snapshot = await window.getDocs(productsRef);
        
        if (!snapshot.empty) {
          allListings = [];
          snapshot.forEach(doc => {
            const item = doc.data();
            allListings.push({
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
          
          console.log('✅ Loaded ' + allListings.length + ' products from Firestore');
          renderShop(allListings);
          updateCount(allListings.length);
          return;
        }
      } catch (firestoreErr) {
        console.warn('Firestore error:', firestoreErr);
      }
    }

    // TRY 3: Hardcoded fallback products
    console.log('📦 Using hardcoded fallback products...');
    allListings = [
      {
        name: '1121 Sella Basmati Rice',
        origin: 'India',
        packaging: '4×10 = 40kg Nonwoven',
        price: '160 AED',
        size: '40kg',
        stock: '1350 bags',
        badge: 'Verified Supplier',
        img: 'basmati-india.jpg'
      },
      {
        name: 'Irri 6 White Rice Broken 5%',
        origin: 'Pakistan',
        packaging: '35kg PP Bags',
        price: '56 AED',
        size: '35kg',
        stock: '3000 bags',
        badge: 'Verified Supplier',
        img: 'irri6-5.jpg'
      },
      {
        name: '1509 Creamy Sella Rice',
        origin: 'India',
        packaging: '10×4 = 40kg Nonwoven',
        price: '1100 USD',
        size: '40kg',
        stock: 'Booking only',
        badge: 'Pre-Booking',
        img: '1509-creamy.jpg'
      },
      {
        name: 'Sona Massori',
        origin: 'India',
        packaging: '18kg Nonwoven',
        price: '48 AED',
        size: '18kg',
        stock: '1350 bags',
        badge: 'Verified Supplier',
        img: 'sona-massori.jpg'
      },
      {
        name: '1121 Sella Basmati Rice',
        origin: 'Pakistan',
        packaging: '4×10 = 40kg Nonwoven',
        price: '230 AED',
        size: '40kg',
        stock: '1350 bags',
        badge: 'Verified Supplier',
        img: 'basmati-pak.jpg'
      },
      {
        name: 'Golden Sella Basmati Rice',
        origin: 'India',
        packaging: '4×10 = 40kg Nonwoven',
        price: '160 AED',
        size: '40kg',
        stock: '1350 bags',
        badge: 'Peer Rated',
        img: 'golden-sella.jpg'
      }
    ];

    console.log('✅ Using ' + allListings.length + ' fallback products');
    renderShop(allListings);
    updateCount(allListings.length);

  } catch (err) {
    console.error('❌ Shop load error:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#e74c3c;margin-bottom:12px;display:block;"></i>
        <p>Unable to load products. Please try again.</p>
        <p class="suggestion">
          <a href="https://wa.me/971585521976" style="color:#25D366;font-weight:600;text-decoration:none;">
            <i class="fab fa-whatsapp"></i> Contact us on WhatsApp
          </a>
          for custom sourcing
        </p>
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
        <p class="suggestion">Try adjusting your filters or <a href="https://wa.me/971585521976" style="color:#25D366;font-weight:600;text-decoration:none;">contact us</a> for custom sourcing.</p>
      </div>
    `;
    return;
  }

  listings.forEach(item => {
    const isBooking = String(item.stock).toLowerCase().includes('booking');
    const isUsd = String(item.price).toUpperCase().includes('USD');
    const priceDisplay = item.price;
    
    // Calculate kg price
    let kgPrice = null;
    if (!isUsd && item.size !== 'N/A' && !isNaN(parseFloat(String(item.price).replace(/[^0-9.]/g, ''))) && !isNaN(parseInt(item.size))) {
      const priceNum = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
      const sizeNum = parseInt(item.size);
      if (priceNum > 0 && sizeNum > 0) {
        kgPrice = (priceNum / sizeNum).toFixed(2);
      }
    }

    // Badge class
    let badgeClass = 'verified';
    const badgeLower = String(item.badge).toLowerCase();
    if (badgeLower.includes('peer')) badgeClass = 'peer';
    if (badgeLower.includes('pre-booking') || badgeLower.includes('booking')) badgeClass = 'booking';

    // Stock status
    const stockText = isBooking ? '📋 Booking' : '✅ In Stock';
    const stockStatus = isBooking ? 'booking' : 'in-stock';

    // Image
    const imgSrc = item.img ? `/assets/img/${item.img}` : '/assets/img/placeholder.jpg';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.origin = item.origin;
    card.dataset.badge = item.badge;
    card.dataset.type = String(item.name).toLowerCase();

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
    filtered = filtered.filter(item => String(item.origin) === origin);
  }

  if (tier) {
    filtered = filtered.filter(item => String(item.badge).toLowerCase().includes(tier.toLowerCase()));
  }

  if (type) {
    filtered = filtered.filter(item => String(item.name).toLowerCase().includes(type.toLowerCase()));
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
  console.log('🚀 Shop v2.1 initializing...');
  
  // Load products
  loadShop();

  // Filter on change
  const originFilter = document.getElementById('filterOrigin');
  const tierFilter = document.getElementById('filterTier');
  const typeFilter = document.getElementById('filterType');

  if (originFilter) originFilter.addEventListener('change', filterProducts);
  if (tierFilter) tierFilter.addEventListener('change', filterProducts);
  if (typeFilter) typeFilter.addEventListener('change', filterProducts);

  // Reset button
  const resetBtn = document.getElementById('resetFilters');
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  console.log('✅ Shop v2.1 ready');
});

// ============================================================
// 7. EXPOSE FOR GLOBAL USE
// ============================================================
window.filterShop = filterProducts;
window.resetShopFilters = resetFilters;
window.loadShop = loadShop;
window.allListings = allListings;
