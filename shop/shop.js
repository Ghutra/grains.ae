// shop.js – Dynamic + Filterable
let allListings = [];

async function loadShop() {
  try {
    const res = await fetch('/assets/data/stock.json')
    allListings = await res.json();
    renderShop(allListings);
  } catch (e) {
    document.getElementById('product-grid').innerHTML = '<p>Shop loading... Try again.</p>';
  }
}

function renderShop(listings) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';

  listings.forEach(item => {
    const kgPrice = item.price.includes('USD') ? '' : ` • ${(parseFloat(item.price.replace('AED ', '')) / parseInt(item.size)).toFixed(2)} AED/kg`;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="../assets/img/${item.img}" alt="${item.name}">
      <div class="content">
        <h3>${item.name}</h3>
        <p><-strong>Origin:</strong> ${item.origin}</p>
        <p><strong>Packaging:</strong> ${item.packaging}</p>
        <p><strong>Price:</strong> ${item.price}${kgPrice}</p>
        <p><strong>Stock:</strong> ${item.stock}</p>
        <span class="badge">${item.badge}</span>
        <a href="https://wa.me/971501234567?text=Inquiry: ${encodeURIComponent(item.name + ' - ' + item.price)}" class="btn-whatsapp">Get Quote</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Global filter function
window.filterShop = function(filters) {
  let filtered = allListings;

  if (filters.origin) filtered = filtered.filter(i => i.origin === filters.origin);
  if (filters.grade) filtered = filtered.filter(i => i.badge.toLowerCase().includes(filters.grade.toLowerCase()));
  if (filters.ritual) filtered = filtered.filter(i => i.name.toLowerCase().includes(filters.ritual.toLowerCase()));

  renderShop(filtered);
};

// Init
document.addEventListener('DOMContentLoaded', loadShop);
