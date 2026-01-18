/* -----------------------------------------
   ALLIYA MODAL
----------------------------------------- */
window.openModal = function () {
  document.getElementById('alliyaModal').classList.add('active');
  document.getElementById('alliyaQuery').focus();
};

window.closeModal = function () {
  document.getElementById('alliyaModal').classList.remove('active');
  document.getElementById('alliyaResponse').style.display = 'none';
  document.getElementById('suggestions').innerHTML = '';
};

window.onclick = (e) => { 
  if (e.target.classList.contains('modal')) closeModal(); 
};

/* -----------------------------------------
   SUGGESTIONS
----------------------------------------- */
const suggestionsList = [
  '1121 price', 'irri 6 stock', '1509 sella',
  'golden sella', 'fcl india', 'thai rice', 'booking'
];

window.showSuggestions = function (val) {
  const box = document.getElementById('suggestions');
  box.innerHTML = '';
  if (val.length < 2) return;

  suggestionsList
    .filter(s => s.toLowerCase().includes(val.toLowerCase()))
    .slice(0, 5)
    .forEach(s => {
      const div = document.createElement('div');
      div.textContent = s;
      div.onclick = () => {
        document.getElementById('alliyaQuery').value = s;
        box.innerHTML = '';
        askAlliya();
      };
      box.appendChild(div);
    });
};

/* -----------------------------------------
   ALLIYA ENGINE (Firestore + Render)
   Vertex AI disabled until ready
----------------------------------------- */
window.askAlliya = async function () {
  const userQuery = document.getElementById('alliyaQuery').value.trim().toLowerCase();
  if (!userQuery) return;

  const replyBox = document.getElementById('alliyaResponse');
  replyBox.style.display = 'block';
  replyBox.innerHTML = 'Alliya is checking live stock…';

  const terms = userQuery.split(' ').map(w => w.trim().toLowerCase()).filter(Boolean);
  let found = false;

  /* 1. Firestore direct match */
  try {
    const stockRef = window.collection(window.db, 'products');
    const q = window.query(stockRef, window.where('keywords', 'array-contains-any', terms));
    const snapshot = await window.getDocs(q);

    if (!snapshot.empty) {
      const item = snapshot.docs[0].data();
      replyBox.innerHTML = `
        <strong>Live from Firestore</strong><br>
        ${item.name} → ${item.price}<br>
        Stock: ${item.stock} bags<br><br>
        <a href="https://wa.me/971585521976?text=Hi%20Alliya%20-%20I%20want%20${encodeURIComponent(item.name)}"
           class="btn-whatsapp">
           Book via WhatsApp
        </a>`;
      found = true;
    }
  } catch (err) {
    console.warn("Firestore query failed:", err);
  }

  /* 2. Fuzzy scan */
  if (!found) {
    try {
      const allDocs = await window.getDocs(window.collection(window.db, 'products'));
      allDocs.forEach(doc => {
        const data = doc.data();
        const keywords = Array.isArray(data.keywords)
          ? data.keywords.map(k => k.toLowerCase())
          : [];
        if (terms.some(term => keywords.includes(term))) {
          replyBox.innerHTML = `
            <strong>Matched via Fuzzy Scan</strong><br>
            ${data.name} → ${data.price}<br>
            Stock: ${data.stock} bags<br><br>
            <a href="https://wa.me/971585521976?text=Hi%20Alliya%20-%20I%20want%20${encodeURIComponent(data.name)}"
               class="btn-whatsapp">
               Book via WhatsApp
            </a>`;
          found = true;
        }
      });
    } catch (err) {
      console.warn("Fuzzy scan failed:", err);
    }
  }

  /* 3. Render backend fallback */
  if (!found) {
    try {
      const res = await fetch(
        `https://grains-backend.onrender.com/api/alliya?q=${encodeURIComponent(userQuery)}`,
        { cache: 'no-cache' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          replyBox.innerHTML = data.reply;
          found = true;
        }
      }
    } catch (err) {
      console.warn("Render backend failed:", err);
    }
  }

  /* 4. Final fallback */
  if (!found) {
    replyBox.innerHTML = `
      Yes, <strong>${userQuery}</strong> is available today!<br><br>
      <a href="https://wa.me/971585521976?text=Alliya%20-%20${encodeURIComponent(userQuery)}"
         class="btn-whatsapp">
         WhatsApp Me Now
      </a>`;
  }
};
