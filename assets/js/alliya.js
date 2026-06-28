/* -----------------------------------------
   ALLIYA v5.0 – Frontend Engine
   - Uses stock.json + suppliers.json
   - No backend dependency
----------------------------------------- */

const STOCK_URL = '/assets/data/stock.json';
const SUPPLIERS_URL = '/assets/data/suppliers.json';

let alliyaStockCache = null;
let alliyaSuppliersCache = null;

async function loadStock() {
  if (!alliyaStockCache) {
    const res = await fetch(STOCK_URL, { cache: 'no-cache' });
    alliyaStockCache = await res.json();
  }
  return alliyaStockCache;
}

async function loadSuppliers() {
  if (!alliyaSuppliersCache) {
    const res = await fetch(SUPPLIERS_URL, { cache: 'no-cache' });
    alliyaSuppliersCache = await res.json();
  }
  return alliyaSuppliersCache;
}

function normalize(str) {
  return (str || '').toLowerCase();
}

function findStockMatches(stock, queryTerms) {
  return stock.filter(item => {
    const name = normalize(item.name);
    const origin = normalize(item.origin);
    const packaging = normalize(item.packaging);

    return queryTerms.some(term =>
      name.includes(term) ||
      origin.includes(term) ||
      packaging.includes(term)
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

function buildAlliyaResponseHTML(match, supplier) {
  const isBooking = match.price.toUpperCase().includes('USD');
  const priceRaw = parseFloat(match.price);
  const sizeKG = parseInt(match.size);
  const pricePerKg = (!isNaN(priceRaw) && !isNaN(sizeKG))
    ? (priceRaw / sizeKG).toFixed(2)
    : null;

  const originFlag =
    match.origin.toLowerCase().includes('india') ? '🇮🇳' :
    match.origin.toLowerCase().includes('pakistan') ? '🇵🇰' :
    match.origin.toLowerCase().includes('thailand') ? '🇹🇭' : '🌍';

  const supplierLine = supplier
    ? `${supplier.name} (${supplier.badge || 'Verified'}) – ${supplier.city}, ${supplier.country}`
    : `${match.badge || 'Verified Supplier'}`;

  const stockLine = match.stock || 'Prompt shipment';

  const priceLine = isBooking
    ? `${match.price} (Booking / FOB or C&F)`
    : `${match.price} / ${match.size}${pricePerKg ? ` → ${pricePerKg} AED/kg` : ''}`;

  return `
    <div class="alliya-block">
      <h3>${originFlag} ${match.name}</h3>
      <p><strong>Origin:</strong> ${match.origin}</p>
      <p><strong>Packaging:</strong> ${match.packaging}</p>
      <p><strong>Price:</strong> ${priceLine}</p>
      <p><strong>Stock:</strong> ${stockLine}</p>
      <p><strong>Supplier:</strong> ${supplierLine}</p>
    </div>

    <hr>

    <div class="alliya-cta">
      <p><strong>📦 Available Stock</strong><br>
        <a href="https://grains.ae/shop" target="_blank">View stock page</a>
      </p>

      <p><strong>🚢 FCL Booking (Recommended)</strong><br>
        <a href="https://grains.ae/fcl/" target="_blank">Book FCL shipment</a>
      </p>

      <p><strong>📊 Market Pulse</strong><br>
        <a href="https://grains.ae/pulse/test" target="_blank">Open live Market Pulse</a>
      </p>

      <p><strong>🤖 More Assistance</strong><br>
        <a href="https://grains.ae/alliya" target="_blank">Continue with Alliya</a>
      </p>

      <p><strong>📞 WhatsApp (Last Option)</strong><br>
        <a href="https://wa.me/971585521976?text=Inquiry%20about%20${encodeURIComponent(match.name)}"
           target="_blank">Contact Grains Hub on WhatsApp</a>
      </p>
    </div>
  `;
}

/* -----------------------------------------
   Hook into existing askAlliya()
----------------------------------------- */
window.askAlliya = async function () {
  const userQuery = document.getElementById('alliyaQuery').value.trim().toLowerCase();
  if (!userQuery) return;

  const replyBox = document.getElementById('alliyaResponse');
  replyBox.style.display = 'block';
  replyBox.innerHTML = 'Alliya is checking live stock…';

  const terms = userQuery.split(' ')
    .map(w => w.trim().toLowerCase())
    .filter(Boolean);

  try {
    const [stock, suppliers] = await Promise.all([
      loadStock(),
      loadSuppliers()
    ]);

    const matches = findStockMatches(stock, terms);

    if (matches.length > 0) {
      const primary = matches[0];
      const supplier = findSupplierForProduct(suppliers, primary.name);
      replyBox.innerHTML = buildAlliyaResponseHTML(primary, supplier);
      return;
    }

    // If no stock match, fallback to generic guidance
    replyBox.innerHTML = `
      I couldn’t find a direct match for <strong>${userQuery}</strong> in live stock.<br><br>
      <a href="https://grains.ae/shop" target="_blank">Browse all stock</a><br>
      <a href="https://grains.ae/fcl/" target="_blank">Submit FCL requirement</a><br>
      <a href="https://grains.ae/pulse/test" target="_blank">Check Market Pulse</a><br><br>
      Or, as a last option:<br>
      <a href="https://wa.me/971585521976?text=Alliya%20-%20${encodeURIComponent(userQuery)}"
         target="_blank">WhatsApp Grains Hub</a>
    `;
  } catch (err) {
    console.warn('Alliya v5.0 error:', err);
    replyBox.innerHTML = `
      There was a connection issue while checking live stock.<br><br>
      <a href="https://grains.ae/shop" target="_blank">Browse stock</a><br>
      <a href="https://grains.ae/fcl/" target="_blank">Submit FCL requirement</a>
    `;
  }
};
