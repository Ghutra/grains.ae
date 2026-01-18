// shop.js – Premium, modular, stock.json-powered (for now)

let allListings = [];

/* -----------------------------------------
   LOAD SHOP DATA (FROM stock.json FOR NOW)
----------------------------------------- */
async function loadShop() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  try {
    grid.innerHTML = '<p class="shop-loading">Loading shop…</p>';

    const res = await fetch('/assets/data/stock.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load stock.json');

    const data = await res.json();

    // Normalize into a consistent internal structure
    allListings = data.map(item => ({
      name: item.name,
      origin: item.origin || '',
      packaging: item.packaging || item.size || '',
      price: item.price,
      size: item.size || '',
      stock: item.stock || '',
      badge: item.badge || '',
      img: item.img || item.imageName || normalizeName(item.name) + '.jpg'
    }));

    renderShop(allListings);
  } catch (e) {
    console.error('Shop load error:', e);
    grid.innerHTML = '<p class="shop-error">Shop loading... Try again.</p>';
  }
}

/* -----------------------------------------
   RENDER SHOP GRID
----------------------------------------- */
function renderShop(listings) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!listings.length) {
    grid.innerHTML = '<p class="shop-empty">No products found.</p>';
    return;
  }

  listings.forEach(item => {
    const kgPrice =
      item.price && item.price.includes('AED') && item.size
        ? ` • ${(parseFloat(item.price.replace('AED', '').replace('/ MT', '').trim()) / parseInt(item.size)).toFixed(2)} AED/kg`
        : '';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="../assets/img/${item.img}" alt="${item.name}"
           onerror="this.onerror=null;this.src='../assets/img/placeholder.jpg';">
      <div class="content">
        <h3>${item.name}</h3>
        <p><strong>Origin:</strong> ${item.origin}</p>
        <p><strong>Packaging:</strong> ${item.packaging}</p>
        <p><strong>Price:</strong> ${item.price}${kgPrice}</p>
        <p><strong>Stock:</strong> ${item.stock}</p>
        ${item.badge ? `<span class="badge">${item.badge}</span>` : ''}
        <a href="https://wa.me/971501234567?text=Inquiry: ${encodeURIComponent(item.name + ' - ' + item.price)}"
           class="btn-whatsapp">
           Get Quote
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* -----------------------------------------
   FILTERS (GLOBAL)
----------------------------------------- */
window.filterShop = function (filters) {
  let filtered = [...allListings];

  if (filters.origin) {
    filtered = filtered.filter(i => i.origin.toLowerCase() === filters.origin.toLowerCase());
  }

  if (filters.grade) {
    filtered = filtered.filter(i =>
      (i.badge || '').toLowerCase().includes(filters.grade.toLowerCase())
    );
  }

  if (filters.ritual) {
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(filters.ritual.toLowerCase())
    );
  }

  renderShop(filtered);
};

/* -----------------------------------------
   HELPERS
----------------------------------------- */
function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

/* -----------------------------------------
   INIT
----------------------------------------- */
document.addEventListener('DOMContentLoaded', loadShop);
