// firebase-init.js
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { 
  getFirestore, collection, getDocs, query, where, doc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBz2Ha_cj42LI-Dh4VYkEOOsROt2WE9fDU",
  authDomain: "grains-hub.firebaseapp.com",
  projectId: "grains-hub",
  storageBucket: "grains-hub.firebasestorage.app",
  messagingSenderId: "783882873254",
  appId: "1:783882873254:web:ba93eaaff5eca25cd6c767",
  measurementId: "G-RHYCMRHS1Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Expose globally
window.db = db;
window.collection = collection;
window.getDocs = getDocs;
window.query = query;
window.where = where;
window.doc = doc;
window.onSnapshot = onSnapshot;
