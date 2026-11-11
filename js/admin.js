// ============================================================
// ADMIN PANEL LOGIC
// ============================================================
import { db, auth, ref, onValue, push, set, update, remove,
         signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from './firebase-config.js';

let products = [];
let gallery = [];
let categories = ['saree', 'dress'];
let settings = { websiteName: 'SareeStore', upi: '8999097063@axl' };
let currentAdmin = null;

// ===== Toast =====
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${
    type === 'success' ? 'check-circle' :
    type === 'error' ? 'exclamation-circle' :
    'info-circle'
  }"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ===== Auth =====
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const pw = document.getElementById('adminPass').value.trim();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    currentAdmin = cred.user;
    document.getElementById('adminErr').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminApp').classList.add('active');
    document.getElementById('adminAv').textContent = email.charAt(0).toUpperCase();
    document.getElementById('adminName').textContent = email.split('@')[0];
    document.getElementById('greetName').textContent = email.split('@')[0];
    loadAllData();
    toast('Welcome to Admin Panel', 'success');
  } catch (err) {
    document.getElementById('adminErr').style.display = 'block';
    document.getElementById('adminErr').textContent = err.message;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentAdmin = user;
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminApp').classList.add('active');
    loadAllData();
  } else {
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminApp').classList.remove('active');
  }
});

window.logout = async () => {
  await signOut(auth);
  location.reload();
};

// ===== Navigation =====
document.querySelectorAll('.side-link[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    const page = btn.dataset.page;
    const el = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
    if (el) el.style.display = 'block';
  });
});

// ===== Load data =====
function loadAllData() {
  onValue(ref(db, 'products'), (snap) => {
    const data = snap.val() || {};
    products = Object.keys(data).map(k => ({ id: k, ...data[k] }));
    renderProductsTable();
    document.getElementById('statProducts').textContent = products.length;
  });
  onValue(ref(db, 'gallery'), (snap) => {
    const data = snap.val() || {};
    gallery = Object.keys(data).map(k => ({ id: k, ...data[k] }));
    renderGalleryGrid();
    document.getElementById('statGallery').textContent = gallery.length;
  });
  onValue(ref(db, 'categories'), (snap) => {
    const data = snap.val();
    if (data) categories = data;
    renderCategoriesList();
    renderCategoryFilter();
    document.getElementById('statCategories').textContent = categories.length;
  });
  onValue(ref(db, 'settings'), (snap) => {
    const data = snap.val();
    if (data) {
      settings = data;
      document.getElementById('setWebsiteName').value = settings.websiteName || '';
      document.getElementById('setUpi').value = settings.upi || '';
    }
  });
}

// ===== Products table =====
function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  const search = document.getElementById('adminSearch')?.value?.toLowerCase() || '';
  const catFilter = document.getElementById('prodCatFilter')?.value || 'all';

  let list = products.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search) {
      const h = `${p.name} ${p.category}`.toLowerCase();
      if (!h.includes(search)) return false;
    }
    return true;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><i class="fas fa-inbox"></i>No products</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const disc = Math.round(((p.mrp - p.price) / p.mrp) * 100);
    return `<tr>
      <td>
        <div class="prod-cell">
          <img src="${p.imageUrl}" onerror="this.src='https://via.placeholder.com/44'" />
          <div>
            <div class="pname">${p.name}</div>
            <div class="pcat">${disc}% off</div>
          </div>
        </div>
      </td>
      <td>₹${p.price}</td>
      <td>₹${p.mrp}</td>
      <td>${p.category}</td>
      <td>In stock</td>
      <td>
        <div class="table-actions">
          <button class="tbl-btn edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="tbl-btn delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ===== Open product modal =====
window.openProductModal = (product = null) => {
  document.getElementById('productForm').reset();
  document.getElementById('pfId').value = '';
  document.getElementById('prodModalTitle').textContent = product ? 'Edit Product' : 'Add Product';

  const catSelect = document.getElementById('pfCategory');
  catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');

  if (product) {
    document.getElementById('pfId').value = product.id;
    document.getElementById('pfName').value = product.name;
    document.getElementById('pfCategory').value = product.category;
    document.getElementById('pfFabric').value = product.fabric || 'silk';
    document.getElementById('pfPrice').value = product.price;
    document.getElementById('pfMrp').value = product.mrp;
    document.getElementById('pfSizes').value = (product.sizes || []).join(',');
    document.getElementById('pfColors').value = (product.colors || []).join(',');
    document.getElementById('pfImageUrl').value = product.imageUrl || '';
    document.getElementById('pfColorUrls').value = (product.colorImages || []).join(', ');
    document.getElementById('pfDelivery').value = product.deliveryDays || 3;
    const t = document.getElementById('pf3dToggle');
    t.classList.toggle('active', product.enable3d !== false);
  }
  document.getElementById('productModal').classList.add('active');
};

window.closeProductModal = () => {
  document.getElementById('productModal').classList.remove('active');
};

// ===== Save product =====
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('pfId').value;
  const data = {
    name: document.getElementById('pfName').value.trim(),
    category: document.getElementById('pfCategory').value,
    fabric: document.getElementById('pfFabric').value,
    price: parseInt(document.getElementById('pfPrice').value),
    mrp: parseInt(document.getElementById('pfMrp').value),
    sizes: document.getElementById('pfSizes').value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    colors: document.getElementById('pfColors').value.split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: document.getElementById('pfImageUrl').value.trim(),
    colorImages: document.getElementById('pfColorUrls').value.split(',').map(s => s.trim()).filter(Boolean),
    deliveryDays: parseInt(document.getElementById('pfDelivery').value) || 3,
    enable3d: document.getElementById('pf3dToggle').classList.contains('active'),
    rating: 4.5,
    reviews: Math.floor(Math.random() * 200),
    updatedAt: Date.now(),
  };

  try {
    if (id) {
      await update(ref(db, 'products/' + id), data);
      toast('Product updated', 'success');
    } else {
      data.createdAt = Date.now();
      await push(ref(db, 'products'), data);
      toast('Product added', 'success');
    }
    closeProductModal();
  } catch (err) {
    toast(err.message, 'error');
  }
});

window.editProduct = (id) => {
  const p = products.find(x => x.id === id);
  if (p) openProductModal(p);
};

window.deleteProduct = async (id) => {
  if (!confirm('Delete this product?')) return;
  await remove(ref(db, 'products/' + id));
  toast('Product deleted', 'warning');
};

// ===== Gallery =====
window.openGalleryModal = () => {
  document.getElementById('galleryForm').reset();
  document.getElementById('galleryModal').classList.add('active');
};

window.closeGalleryModal = () => {
  document.getElementById('galleryModal').classList.remove('active');
};

document.getElementById('galleryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await push(ref(db, 'gallery'), {
    url: document.getElementById('gUrl').value.trim(),
    caption: document.getElementById('gCaption').value.trim() || 'Gallery',
    createdAt: Date.now(),
  });
  toast('Image added', 'success');
  closeGalleryModal();
});

function renderGalleryGrid() {
  const grid = document.getElementById('galleryGrid');
  if (gallery.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="fas fa-images"></i><p>No gallery images</p></div>`;
    return;
  }
  grid.innerHTML = gallery.map(g => `
    <div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0">
      <img src="${g.url}" style="width:100%;height:150px;object-fit:cover" onerror="this.src='https://via.placeholder.com/180x150'" />
      <div style="padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.caption}</div>
        <button onclick="deleteGallery('${g.id}')" style="background:#fee;border:none;color:#d32f2f;padding:4px 8px;border-radius:4px;cursor:pointer">
          <i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

window.deleteGallery = async (id) => {
  if (!confirm('Delete this image?')) return;
  await remove(ref(db, 'gallery/' + id));
  toast('Image deleted', 'warning');
};

// ===== Categories =====
function renderCategoriesList() {
  const list = document.getElementById('catList');
  list.innerHTML = categories.map(c => `
    <div style="display:inline-flex;align-items:center;gap:8px;background:#fff;padding:6px 12px;border-radius:6px;border:1px solid #e0e0e0">
      <i class="fas fa-tag" style="color:#2874f0;font-size:11px"></i>
      <span style="font-size:13px;font-weight:600">${c}</span>
      <button onclick="deleteCategory('${c}')" style="background:none;border:none;color:#d32f2f;cursor:pointer">
        <i class="fas fa-times" style="font-size:11px"></i></button>
    </div>`).join('');
}

function renderCategoryFilter() {
  const sel = document.getElementById('prodCatFilter');
  sel.innerHTML = '<option value="all">All Categories</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

window.addCategory = async () => {
  const name = document.getElementById('newCatInput').value.trim().toLowerCase();
  if (!name) { toast('Enter category name', 'warning'); return; }
  if (categories.includes(name)) { toast('Already exists', 'warning'); return; }
  categories.push(name);
  await set(ref(db, 'categories'), categories);
  document.getElementById('newCatInput').value = '';
  toast('Category added', 'success');
};

window.deleteCategory = async (name) => {
  if (!confirm(`Delete category "${name}"?`)) return;
  categories = categories.filter(c => c !== name);
  await set(ref(db, 'categories'), categories);
  toast('Category deleted', 'warning');
};

// ===== Settings =====
window.saveSettings = async () => {
  const data = {
    websiteName: document.getElementById('setWebsiteName').value.trim() || 'SareeStore',
    upi: document.getElementById('setUpi').value.trim() || '',
  };
  await update(ref(db, 'settings'), data);
  toast('Settings saved', 'success');
};

// ===== Search events =====
document.getElementById('adminSearch').addEventListener('input', renderProductsTable);
document.getElementById('prodCatFilter')?.addEventListener('change', renderProductsTable);

// ===== Modal backdrop =====
document.getElementById('productModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeProductModal();
});
document.getElementById('galleryModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeGalleryModal();
});