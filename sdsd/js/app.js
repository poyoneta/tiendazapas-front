// ===== ESTADO DE LA APLICACIÓN =====
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateWishlistCount();
    renderProducts();
    setupFilters();
});

// ===== RENDERIZAR PRODUCTOS =====
function renderProducts(filter = 'all') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const filteredProducts = filter === 'all' 
        ? products 
        : products.filter(p => p.category === filter);

    grid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const isInWishlist = wishlist.some(item => item.id === product.id);
    
    return `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                <a href="producto.html?id=${product.id}">
                    <img src="${product.images[0]}" alt="${product.name}">
                </a>
                ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                <div class="product-actions-overlay">
                    <button class="action-btn ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist(${product.id})" title="Añadir a favoritos">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                        </svg>
                    </button>
                    <button class="action-btn" onclick="quickAddToCart(${product.id})" title="Añadir al carrito">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="product-content">
                <span class="product-category">${categoryNames[product.category]}</span>
                <h3 class="product-name">
                    <a href="producto.html?id=${product.id}">${product.name}</a>
                </h3>
                <p class="product-price">
                    $${product.price.toFixed(2)}
                    ${product.oldPrice ? `<span class="product-price-old">$${product.oldPrice.toFixed(2)}</span>` : ''}
                </p>
            </div>
        </div>
    `;
}

// ===== FILTROS =====
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(btn.dataset.filter);
        });
    });
}

// ===== CARRITO =====
function quickAddToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            size: product.sizes[0],
            color: product.colors[0],
            quantity: 1
        });
    }
    
    saveCart();
    updateCartCount();
    showToast('Producto añadido al carrito');
    openCart();
}

function addToCart(productId, size, color, quantity) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => 
        item.id === productId && 
        item.size === size && 
        item.color === color
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            size: size,
            color: color,
            quantity: quantity
        });
    }
    
    saveCart();
    updateCartCount();
    showToast('Producto añadido al carrito');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartCount();
    renderCartItems();
}

function updateCartItemQuantity(index, change) {
    const newQty = cart[index].quantity + change;
    
    if (newQty <= 0) {
        removeFromCart(index);
    } else if (newQty <= 10) {
        cart[index].quantity = newQty;
        saveCart();
        renderCartItems();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const footer = document.getElementById('cart-footer');
    const totalEl = document.getElementById('cart-total-amount');
    
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                </svg>
                <p>Tu carrito está vacío</p>
                <a href="index.html#productos" class="btn btn-primary btn-small" onclick="closeCart()">Ver productos</a>
            </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="item-details">
                <p class="item-name">${item.name}</p>
                <p class="item-info">Talla: ${item.size}</p>
                <p class="item-price">$${(item.price * item.quantity).toFixed(2)}</p>
                <div class="item-actions">
                    <div class="qty-control">
                        <button onclick="updateCartItemQuantity(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartItemQuantity(${index}, 1)">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    if (totalEl) totalEl.textContent = `$${getCartTotal().toFixed(2)}`;
}

// ===== LISTA DE DESEOS =====
function toggleWishlist(productId) {
    const index = wishlist.findIndex(item => item.id === productId);
    
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Eliminado de favoritos');
    } else {
        const product = products.find(p => p.id === productId);
        if (product) {
            wishlist.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images[0],
                category: product.category
            });
            showToast('Añadido a favoritos');
        }
    }
    
    saveWishlist();
    updateWishlistCount();
    renderProducts(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
    renderWishlistItems();
}

function removeFromWishlist(productId) {
    const index = wishlist.findIndex(item => item.id === productId);
    if (index > -1) {
        wishlist.splice(index, 1);
        saveWishlist();
        updateWishlistCount();
        renderWishlistItems();
        renderProducts(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
    }
}

function moveToCart(productId) {
    const item = wishlist.find(i => i.id === productId);
    if (item) {
        quickAddToCart(productId);
        removeFromWishlist(productId);
    }
}

function saveWishlist() {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

function updateWishlistCount() {
    document.querySelectorAll('#wishlist-count').forEach(el => el.textContent = wishlist.length);
}

function renderWishlistItems() {
    const container = document.getElementById('wishlist-items');
    if (!container) return;

    if (wishlist.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                <p>Tu lista de deseos está vacía</p>
                <a href="index.html#productos" class="btn btn-primary btn-small" onclick="closeWishlist()">Ver productos</a>
            </div>
        `;
        return;
    }

    container.innerHTML = wishlist.map(item => `
        <div class="wishlist-item">
            <div class="item-image">
                <a href="producto.html?id=${item.id}">
                    <img src="${item.image}" alt="${item.name}">
                </a>
            </div>
            <div class="item-details">
                <p class="item-name">${item.name}</p>
                <p class="item-info">${categoryNames[item.category]}</p>
                <p class="item-price">$${item.price.toFixed(2)}</p>
                <div class="item-actions">
                    <button class="btn btn-primary btn-small" onclick="moveToCart(${item.id})">
                        Añadir al carrito
                    </button>
                    <button class="remove-btn" onclick="removeFromWishlist(${item.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== SIDEBAR CONTROLS =====
function openCart() {
    renderCartItems();
    document.getElementById('cart-sidebar').classList.add('active');
    document.getElementById('sidebar-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cart-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function openWishlist() {
    renderWishlistItems();
    document.getElementById('wishlist-sidebar').classList.add('active');
    document.getElementById('sidebar-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeWishlist() {
    document.getElementById('wishlist-sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function closeSidebars() {
    closeCart();
    closeWishlist();
}

// ===== CHECKOUT =====
function goToCheckout() {
    if (cart.length === 0) {
        showToast('El carrito está vacío');
        return;
    }
    window.location.href = 'checkout.html';
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
        </svg>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('active');
    });

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
