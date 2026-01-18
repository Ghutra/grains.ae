// stock.js – Homepage stock preview (premium, modular, stock.json-powered)

/* -----------------------------------------
   LOAD HOMEPAGE STOCK PREVIEW
----------------------------------------- */
document.addEventListener('DOMContentLoaded', loadHomepageStock);

async function loadHomepageStock() {
  const grid = document.getElementById('stock-grid');
  if (!grid) return; // If page doesn't have stock-grid, skip

  try {
    grid.innerHTML = '<p class="stock-loading">Loading stock…</p>';

    const res = await fetch('/assets/data/stock.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load stock.json');

    const data = await res.json();

    // Show only first 6 items
    const previewItems = data.slice(0, 6);

    grid.innerHTML = '';

    previewItems.forEach(item => {
      const imagePath = item.imageName || normalizeName(item.name) + '.jpg';

      const a = document.createElement('a');
      a.href = '/shop';
      a.className = 'stock-item';

      a.innerHTML = `
        <img src="/assets/img/${imagePath}" alt="${item.name}"
             onerror="this.onerror=null;this.src='/assets/img/placeholder.jpg';">

        <div>
          <h4>${item.name}</h4>
          <p><strong>Price:</strong> ${item.price}</p>
          <p><strong>Stock:</strong> ${item.stock}</p>
        </div>
      `;

      grid.appendChild(a);
    });

  } catch (err) {
    console.error('Homepage stock load error:', err);
    grid.innerHTML = `
      <p class="stock-error">
        Stock will be back in a second — refreshing…
      </p>
    `;
  }
}

/* -----------------------------------------
   HELPERS
----------------------------------------- */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}
