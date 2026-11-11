// ============================================================
// MAIN WEBSITE LOGIC
// ============================================================
import { db, auth, ref, onValue, push, set, update, remove,
         signInWithEmailAndPassword, onAuthStateChanged }
  from './firebase-config.js';

// ===== State =====
let products = [];
let gallery = [];
let cart = [];
let users = [];
let currentUser = null;
let userAddress = null;
let categoryList = ['saree', 'dress'];
let currentCategory = 'all';
let currentSearch = '';
let currentFabric = 'all';
let currentMaxPrice = 10000;
let page = 1;
const PAGE_SIZE = 12;
let selectedPayMethod = 'phonepe';
let checkoutItems = [];
let checkoutTotal = 0;
let pendingCheckout = false; // 🔴 नया – चेकआउट के लिए लॉगिन माँग रहे हैं

const UPI_ID = '8999097063@axl';

// ===== Toast =====
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${
    type === 'success' ? 'check-circle' :
    type === 'error' ? 'exclamation-circle' :
    type === 'warning' ? 'exclamation-triangle' :
    'info-circle'
  }"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ===== Storage helpers =====
function loadUsers() {
  try { users = JSON.parse(localStorage.getItem('saree_users') || '[]'); }
  catch { users = []; }
}
function saveUsers() {
  localStorage.setItem('saree_users', JSON.stringify(users));
}
function loadCart() {
  try { cart = JSON.parse(localStorage.getItem('saree_cart') || '[]'); }
  catch { cart = []; }
}
function saveCart() {
  localStorage.setItem('saree_cart', JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  document.getElementById('cartCount').textContent = cart.length;
}

// ===== Auth Pages =====
window.showLogin = () => {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('signupPage').style.display = 'none';
  document.getElementById('addressPage').style.display = 'none';
  document.getElementById('mainStore').style.display = 'none';
  document.getElementById('checkoutPage').style.display = 'none';
};

window.showSignup = () => {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('signupPage').style.display = 'flex';
  document.getElementById('addressPage').style.display = 'none';
  document.getElementById('mainStore').style.display = 'none';
  document.getElementById('checkoutPage').style.display = 'none';
};

window.showAddressPage = () => {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('signupPage').style.display = 'none';
  document.getElementById('addressPage').style.display = 'flex';
  document.getElementById('mainStore').style.display = 'none';
  document.getElementById('checkoutPage').style.display = 'none';
  if (currentUser) {
    document.getElementById('addrName').value = currentUser.name || '';
    document.getElementById('addrMobile').value = currentUser.mobile || '';
  }
};

// 🔴 नया – अगर ग्राहक लॉगिन नहीं करना चाहता, तो सीधे स्टोर पर वापस
window.cancelAuth = () => {
  pendingCheckout = false;
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('signupPage').style.display = 'none';
  document.getElementById('addressPage').style.display = 'none';
  document.getElementById('mainStore').style.display = 'block';
  document.getElementById('checkoutPage').style.display = 'none';
};

function showMainStore() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('signupPage').style.display = 'none';
  document.getElementById('addressPage').style.display = 'none';
  document.getElementById('mainStore').style.display = 'block';
  document.getElementById('checkoutPage').style.display = 'none';
  document.getElementById('userNameDisplay').textContent = currentUser?.name || 'Sign in';
}

// 🔴 नया – हेडर पर "Hello, Sign in" क्लिक करने पर
window.headerAccountClick = () => {
  if (currentUser) {
    // अगर लॉगिन है, तो एड्रेस दिखाओ
    showAddressPage();
  } else {
    // अगर नहीं है, तो लॉगिन दिखाओ
    pendingCheckout = false;
    showLogin();
  }
};

window.goBackToAddress = () => {
  document.getElementById('mainStore').style.display = 'none';
  showAddressPage();
};

window.goBackToStore = () => {
  document.getElementById('checkoutPage').style.display = 'none';
  document.getElementById('mainStore').style.display = 'block';
};

// ===== Login =====
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value.trim();
  const found = users.find(u =>
    (u.mobile === id || u.email === id) && u.password === pw);

  if (found) {
    currentUser = found;
    localStorage.setItem('saree_user', JSON.stringify(found));
    document.getElementById('loginError').style.display = 'none';
    toast(`Welcome back, ${found.name}!`, 'success');

    // 🔴 अगर चेकआउट के लिए आया था, तो आगे बढ़ो
    if (pendingCheckout) {
      if (!userAddress) {
        showAddressPage();
      } else {
        pendingCheckout = false;
        showMainStore();
        setTimeout(() => goToCheckout(), 100);
      }
    } else {
      showMainStore();
    }
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
});

// ===== Signup =====
document.getElementById('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const mobile = document.getElementById('signupMobile').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPassword').value.trim();

  if (pw.length < 6) { toast('Password must be 6+ characters', 'error'); return; }
  if (users.find(u => u.mobile === mobile)) {
    toast('Mobile already registered', 'error'); return;
  }

  const newU = { name, mobile, email: email || mobile, password: pw };
  users.push(newU);
  saveUsers();
  currentUser = newU;
  localStorage.setItem('saree_user', JSON.stringify(newU));
  toast(`Welcome, ${name}!`, 'success');

  // 🔴 अगर चेकआउट के लिए आया था, तो एड्रेस माँगो
  if (pendingCheckout) {
    showAddressPage();
  } else {
    showMainStore();
  }
});

// ===== Address =====
document.getElementById('addressForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const addr = {
    name: document.getElementById('addrName').value.trim(),
    mobile: document.getElementById('addrMobile').value.trim(),
    line1: document.getElementById('addrLine1').value.trim(),
    line2: document.getElementById('addrLine2').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    pincode: document.getElementById('addrPincode').value.trim(),
    state: document.getElementById('addrState').value,
  };
  if (!addr.name || !addr.mobile || !addr.line1 || !addr.city || !addr.pincode || !addr.state) {
    toast('Please fill all required fields', 'error'); return;
  }
  userAddress = addr;
  localStorage.setItem('saree_address', JSON.stringify(addr));
  toast('Address saved', 'success');

  // 🔴 अगर चेकआउट के लिए आया था, तो सीधे चेकआउट पर
  if (pendingCheckout) {
    pendingCheckout = false;
    showMainStore();
    setTimeout(() => goToCheckout(), 100);
  } else {
    showMainStore();
  }
});

// ===== Load products from Firebase =====
function loadProductsFromFirebase() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    grid.innerHTML += `<div class="skeleton-card">
      <div class="skeleton" style="height:180px;margin-bottom:12px"></div>
      <div class="skeleton" style="height:14px;width:80%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:20px;width:40%"></div>
    </div>`;
  }

  onValue(ref(db, 'products'), (snap) => {
    const data = snap.val() || {};
    products = Object.keys(data).map(k => ({ id: k, ...data[k] }));
    renderProducts(true);
  });

  onValue(ref(db, 'settings'), (snap) => {
    const s = snap.val() || {};
    if (s.categories && Array.isArray(s.categories)) {
      categoryList = s.categories;
      renderCategoryTabs();
    }
    if (s.websiteName) {
      document.getElementById('brandHeader').innerHTML =
        `<i class="fas fa-store"></i> ${s.websiteName}<span>Store</span>`;
    }
  });
}

// ===== Render products =====
function renderProducts(reset = true) {
  if (reset) page = 1;

  let filtered = products.filter(p => {
    if (currentCategory !== 'all' && p.category !== currentCategory) return false;
    if (currentFabric !== 'all' && p.fabric !== currentFabric) return false;
    if (p.price > currentMaxPrice) return false;
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      const hay = `${p.name} ${p.category} ${p.fabric}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const end = page * PAGE_SIZE;
  const visible = filtered.slice(0, end);
  const grid = document.getElementById('productGrid');

  if (visible.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <i class="fas fa-search"></i>
      <p>No products found</p>
      <small>Try changing filters or search</small>
    </div>`;
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  grid.innerHTML = visible.map(createCard).join('');
  bindCardEvents();

  const wrap = document.getElementById('loadMoreWrap');
  if (end < filtered.length) wrap.style.display = 'block';
  else wrap.style.display = 'none';
}

window.loadMore = () => {
  page++;
  renderProducts(false);
};

function createCard(p) {
  const disc = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const stars = (p.rating || 4.5).toFixed(1);
  const deliveryDate = getDeliveryDate(p.deliveryDays || 3);
  const catLabel = (p.category || '').charAt(0).toUpperCase() + (p.category || '').slice(1);

  let colorHtml = '';
  if (p.colors && p.colors.length) {
    colorHtml = '<div class="color-variants">' + p.colors.map((c, i) => {
      const img = (p.colorImages && p.colorImages[i]) ? p.colorImages[i] : p.imageUrl;
      return `<button class="color-dot ${i === 0 ? 'active' : ''}"
                data-pid="${p.id}" data-cidx="${i}" title="${c}">
                <img src="${img}" alt="${c}" onerror="this.src='https://via.placeholder.com/30'" />
              </button>`;
    }).join('') + '</div>';
  }

  return `<div class="product-card" data-id="${p.id}">
    <div class="image-wrap">
      <span class="badge">${disc}% OFF</span>
      <img src="${p.imageUrl || 'https://via.placeholder.com/300'}" alt="${p.name}"
           onerror="this.src='https://via.placeholder.com/300'" loading="lazy" />
    </div>
    <div class="info">
      <div class="prod-name">${p.name}</div>
      <div class="rating-row">
        <span class="rating-pill">${stars} <i class="fas fa-star"></i></span>
        <span class="rating-count">(${p.reviews || 0})</span>
      </div>
      <div class="price-row">
        <span class="price-current">₹${p.price}</span>
        <span class="price-mrp">₹${p.mrp}</span>
        <span class="price-discount">${disc}% off</span>
      </div>
      <div class="meta">${p.category === 'dress' && p.sizes?.length ? 'Sizes: ' + p.sizes.join(', ') : p.fabric}</div>
      <div class="delivery-info">Free delivery by <b>${deliveryDate}</b></div>
      ${colorHtml}
    </div>
    <div class="card-actions">
      <button class="btn-card-cart" data-id="${p.id}"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
      <button class="btn-card-secondary" data-detail="${p.id}"><i class="fas fa-eye"></i> View Details</button>
    </div>
  </div>`;
}

function bindCardEvents() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openDetail(card.dataset.id);
    });
  });
  document.querySelectorAll('.btn-card-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
    });
  });
  document.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail(btn.dataset.detail);
    });
  });
  document.querySelectorAll('.color-dot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.product-card');
      const img = card.querySelector('.image-wrap img');
      const pid = btn.dataset.pid;
      const cidx = parseInt(btn.dataset.cidx);
      const prod = products.find(p => p.id === pid);
      if (prod && prod.colorImages && prod.colorImages[cidx]) {
        img.src = prod.colorImages[cidx];
      }
      card.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function getDeliveryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ===== Category tabs =====
function renderCategoryTabs() {
  const t = document.getElementById('categoryTabs');
  let html = `<button class="cat-link ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">
                <i class="fas fa-th-large"></i> All</button>`;
  categoryList.forEach(c => {
    html += `<button class="cat-link ${currentCategory === c ? 'active' : ''}" data-cat="${c}">
              <i class="fas fa-tag"></i> ${c.charAt(0).toUpperCase() + c.slice(1)}</button>`;
  });
  t.innerHTML = html;
  t.querySelectorAll('.cat-link').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderCategoryTabs();
      renderProducts(true);
    });
  });
}

// ===== Search =====
document.getElementById('globalSearch').addEventListener('input', (e) => {
  currentSearch = e.target.value.trim();
  renderProducts(true);
});

// ===== Filters =====
document.getElementById('filterFabric').addEventListener('change', (e) => {
  currentFabric = e.target.value;
  renderProducts(true);
});

document.getElementById('priceRange').addEventListener('input', (e) => {
  currentMaxPrice = parseInt(e.target.value);
  document.getElementById('priceLabel').textContent = '₹' + currentMaxPrice;
  renderProducts(true);
});

// ===== Cart =====
window.openCart = () => {
  document.getElementById('cartModal').classList.add('active');
  renderCart();
};

window.closeCart = () => {
  document.getElementById('cartModal').classList.remove('active');
};

function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  cart.push({ ...p, selectedSize: '', selectedColor: '' });
  saveCart();
  toast(`${p.name} added to cart`, 'success');
}

function renderCart() {
  const wrap = document.getElementById('cartItemsList');
  if (cart.length === 0) {
    wrap.innerHTML = `<div class="empty-state">
      <i class="fas fa-shopping-cart"></i>
      <p>Your cart is empty</p>
    </div>`;
    return;
  }
  const grouped = {};
  cart.forEach(item => {
    const k = item.id + '|' + (item.selectedSize || '');
    if (grouped[k]) grouped[k].qty++;
    else grouped[k] = { ...item, qty: 1 };
  });
  const items = Object.values(grouped);
  let total = 0;
  let html = '';
  items.forEach((item, i) => {
    const sub = item.price * item.qty;
    total += sub;
    html += `<div class="cart-item">
      <img src="${item.imageUrl}" onerror="this.src='https://via.placeholder.com/60'" />
      <div class="det">
        <div class="name">${item.name}</div>
        <div class="meta">${item.selectedSize ? 'Size: ' + item.selectedSize : item.fabric}</div>
        <div class="price">₹${item.price} × ${item.qty} = ₹${sub}</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
        <button class="remove-btn" onclick="removeCart(${i})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  });
  html += `<div class="cart-total-row"><span>Total</span><span>₹${total}</span></div>
    <div class="cart-actions">
      <button class="btn btn-outline" onclick="clearCart()">Clear</button>
      <button class="btn btn-orange" onclick="goToCheckout()">Checkout</button>
    </div>`;
  wrap.innerHTML = html;
}

window.changeQty = (i, delta) => { renderCart(); };

window.removeCart = (i) => {
  cart.splice(i, 1);
  saveCart();
  renderCart();
};

window.clearCart = () => {
  if (!confirm('Clear cart?')) return;
  cart = [];
  saveCart();
  renderCart();
};

// ===== Checkout =====
// 🔴 सबसे ज़रूरी बदलाव – यहाँ लॉगिन माँगें
window.goToCheckout = () => {
  if (cart.length === 0) { toast('Cart is empty', 'warning'); return; }

  // अगर लॉगिन नहीं है → पहले लॉगिन माँगो
  if (!currentUser) {
    closeCart();
    document.getElementById('mainStore').style.display = 'none';
    document.getElementById('checkoutPage').style.display = 'none';
    document.getElementById('addressPage').style.display = 'none';
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    pendingCheckout = true;
    toast('Please login to continue', 'info');
    return;
  }

  // अगर लॉगिन है पर एड्रेस नहीं है → एड्रेस माँगो
  if (!userAddress) {
    closeCart();
    document.getElementById('mainStore').style.display = 'none';
    pendingCheckout = true;
    showAddressPage();
    toast('Please add delivery address', 'info');
    return;
  }

  // सब ठीक है → चेकआउट पर जाओ
  closeCart();
  document.getElementById('mainStore').style.display = 'none';
  document.getElementById('checkoutPage').style.display = 'block';
  renderCheckout();
};

function renderCheckout() {
  if (userAddress) {
    document.getElementById('ckName').textContent = userAddress.name;
    document.getElementById('ckAddr').textContent =
      `${userAddress.line1}, ${userAddress.city}, ${userAddress.state} - ${userAddress.pincode}`;
  }
  const grouped = {};
  cart.forEach(item => {
    const k = item.id + '|' + (item.selectedSize || '');
    if (grouped[k]) grouped[k].qty++;
    else grouped[k] = { ...item, qty: 1 };
  });
  checkoutItems = Object.values(grouped);
  let total = 0, count = 0;
  checkoutItems.forEach(i => { total += i.price * i.qty; count += i.qty; });
  checkoutTotal = total;

  document.getElementById('orderSummary').innerHTML = `
    <div class="summary-row"><span>Subtotal (${count} items)</span><span>₹${total}</span></div>
    <div class="summary-row"><span>Delivery</span><span class="free">FREE</span></div>
    <div class="summary-row total"><span>Total</span><span class="v">₹${total}</span></div>`;
  document.getElementById('confirmAmt').textContent = '₹' + total;
}

window.selectPayment = (el, method) => {
  document.querySelectorAll('.payment-option').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayMethod = method;
};

window.showConfirm = () => {
  const names = { phonepe: 'PhonePe', gpay: 'Google Pay', paytm: 'Paytm',
                  visa: 'Visa', mastercard: 'Mastercard', rupay: 'RuPay' };
  document.getElementById('confirmMethod').textContent = names[selectedPayMethod] || 'UPI';
  document.getElementById('confirmModal').classList.add('active');
};

window.closeConfirm = () => {
  document.getElementById('confirmModal').classList.remove('active');
};

window.processPayment = () => {
  closeConfirm();
  if (['visa', 'mastercard', 'rupay'].includes(selectedPayMethod)) {
    toast('Card payment (demo)', 'success');
    return;
  }
  const upi = `upi://pay?pa=${UPI_ID}&pn=SareeStore&am=${checkoutTotal}&cu=INR&tn=Order`;
  toast('Redirecting to UPI...', 'info');
  setTimeout(() => window.location.href = upi, 400);
};

window.changeAddress = () => {
  document.getElementById('checkoutPage').style.display = 'none';
  pendingCheckout = true;
  showAddressPage();
};

// ===== Detail =====
window.openDetail = (id) => {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const disc = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const stars = (p.rating || 4.5).toFixed(1);
  const deliveryDate = getDeliveryDate(p.deliveryDays || 3);
  const mainImg = (p.colorImages && p.colorImages[0]) || p.imageUrl;

  let sizesHtml = '';
  if (p.category === 'dress' && p.sizes?.length) {
    sizesHtml = `<div style="margin:10px 0"><label style="font-weight:600;font-size:13px">Select Size</label>
      <div class="size-chips">${p.sizes.map((s, i) => `<button class="size-chip ${i === 0 ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}</div></div>`;
  }

  let colorsHtml = '';
  if (p.colors?.length) {
    colorsHtml = `<div style="margin:10px 0"><label style="font-weight:600;font-size:13px">Color</label>
      <div class="size-chips">${p.colors.map((c, i) => `<button class="size-chip ${i === 0 ? 'active' : ''}" data-color="${c}" data-cidx="${i}">${c}</button>`).join('')}</div></div>`;
  }

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-grid">
      <div class="detail-img-wrap">
        <img src="${mainImg}" alt="${p.name}" id="detailMainImg" onerror="this.src='https://via.placeholder.com/400'" />
      </div>
      <div class="detail-info">
        <h2>${p.name}</h2>
        <div class="sub-line">${p.category} | ${p.fabric}</div>
        <div class="rating-row">
          <span class="rating-pill">${stars} <i class="fas fa-star"></i></span>
          <span class="rating-count">${p.reviews || 0} reviews</span>
        </div>
        <div class="price-big">
          ₹${p.price}
          <span class="mrp">₹${p.mrp}</span>
          <span class="off">${disc}% off</span>
        </div>
        <div class="delivery-info">Free delivery by <b>${deliveryDate}</b></div>
        ${sizesHtml}
        ${colorsHtml}
        <div class="detail-actions">
          <button class="btn btn-orange" onclick="addToCartDetail('${p.id}')">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <button class="btn btn-primary" onclick="buyNow('${p.id}')">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('detailModal').classList.add('active');

  document.querySelectorAll('.size-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.size-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
};

window.closeDetail = () => {
  document.getElementById('detailModal').classList.remove('active');
};

window.addToCartDetail = (id) => {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const size = document.querySelector('.size-chip[data-size].active')?.dataset.size || '';
  const color = document.querySelector('.size-chip[data-color].active')?.dataset.color || '';
  cart.push({ ...p, selectedSize: size, selectedColor: color });
  saveCart();
  toast(`${p.name} added to cart`, 'success');
  closeDetail();
};

window.buyNow = (id) => {
  addToCartDetail(id);
  closeDetail();
  // 🔴 यहाँ भी चेकआउट लॉजिक – अगर लॉगिन नहीं है तो माँगेगा
  goToCheckout();
};

// ===== Init =====
function init() {
  loadUsers();
  loadCart();

  // 🔴 शुरुआत में सीधे प्रोडक्ट दिखाओ
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('signupPage').style.display = 'none';
  document.getElementById('addressPage').style.display = 'none';
  document.getElementById('mainStore').style.display = 'block';
  document.getElementById('checkoutPage').style.display = 'none';

  // अगर पहले से लॉगिन है, तो नाम दिखाओ
  try {
    const u = JSON.parse(localStorage.getItem('saree_user') || 'null');
    const a = JSON.parse(localStorage.getItem('saree_address') || 'null');
    if (u) {
      currentUser = u;
      document.getElementById('userNameDisplay').textContent = u.name;
    }
    if (a) userAddress = a;
  } catch {}

  loadProductsFromFirebase();
  updateCartCount();
}

// Close modals on backdrop
document.getElementById('cartModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCart();
});
document.getElementById('detailModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDetail();
});
document.getElementById('confirmModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeConfirm();
});

init();