// ===== ESTADO DEL PRODUCTO =====
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;
let quantity = 1;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    loadProduct();
});

// ===== CARGAR PRODUCTO =====
function loadProduct() {
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get('id'));
    
    currentProduct = products.find(p => p.id === productId);
    
    if (!currentProduct) {
        window.location.href = 'index.html';
        return;
    }
    
    // Set default selections
    selectedSize = currentProduct.sizes[0];
    selectedColor = currentProduct.colors[0];
    
    renderProductDetail();
    updateWishlistButton();
}

// ===== RENDERIZAR DETALLE =====
function renderProductDetail() {
    // Update page title
    document.title = `${currentProduct.name} - SneakVault`;
    
    // Main image
    document.getElementById('main-product-image').src = currentProduct.images[0];
    document.getElementById('main-product-image').alt = currentProduct.name;
    
    // Thumbnails
    const thumbnailContainer = document.getElementById('thumbnail-gallery');
    thumbnailContainer.innerHTML = currentProduct.images.map((img, index) => `
        <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
            <img src="${img}" alt="${currentProduct.name} - Vista ${index + 1}">
        </div>
    `).join('');
    
    // Product info
    document.getElementById('product-category').textContent = categoryNames[currentProduct.category];
    document.getElementById('product-title').textContent = currentProduct.name;
    document.getElementById('product-price').textContent = `$${currentProduct.price.toFixed(2)}`;
    document.getElementById('product-description').textContent = currentProduct.description;
    document.getElementById('product-reviews').textContent = `(${currentProduct.reviews} reseñas)`;
    
    // Stars
    renderStars();
    
    // Sizes
    const sizeContainer = document.getElementById('size-options');
    sizeContainer.innerHTML = currentProduct.sizes.map(size => `
        <button class="size-btn ${size === selectedSize ? 'active' : ''}" onclick="selectSize('${size}', this)">
            ${size}
        </button>
    `).join('');
    
    // Colors
    const colorContainer = document.getElementById('color-options');
    colorContainer.innerHTML = currentProduct.colors.map(color => `
        <button class="color-btn ${color === selectedColor ? 'active' : ''}" 
                style="background-color: ${color}; ${color === '#ffffff' || color === '#fafafa' ? 'border: 1px solid #333;' : ''}"
                onclick="selectColor('${color}', this)">
        </button>
    `).join('');
}

function renderStars() {
    const starsContainer = document.getElementById('product-stars');
    const fullStars = Math.floor(currentProduct.rating);
    const hasHalfStar = currentProduct.rating % 1 >= 0.5;
    
    let starsHTML = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHTML += `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
            `;
        } else if (i === fullStars && hasHalfStar) {
            starsHTML += `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
            `;
        } else {
            starsHTML += `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
            `;
        }
    }
    
    starsContainer.innerHTML = starsHTML;
}

// ===== SELECCIÓN DE OPCIONES =====
function changeMainImage(src, thumbnail) {
    document.getElementById('main-product-image').src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
}

function selectSize(size, button) {
    selectedSize = size;
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function selectColor(color, button) {
    selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

// ===== CANTIDAD =====
function increaseQty() {
    const input = document.getElementById('quantity');
    if (quantity < 10) {
        quantity++;
        input.value = quantity;
    }
}

function decreaseQty() {
    const input = document.getElementById('quantity');
    if (quantity > 1) {
        quantity--;
        input.value = quantity;
    }
}

// Update quantity from input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('quantity');
    if (input) {
        input.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 10) val = 10;
            quantity = val;
            e.target.value = quantity;
        });
    }
});

// ===== AÑADIR AL CARRITO =====
function addToCartFromDetail() {
    if (!currentProduct || !selectedSize || !selectedColor) return;
    
    addToCart(currentProduct.id, selectedSize, selectedColor, quantity);
    openCart();
}

// ===== LISTA DE DESEOS =====
function toggleWishlistFromDetail() {
    if (!currentProduct) return;
    toggleWishlist(currentProduct.id);
    updateWishlistButton();
}

function updateWishlistButton() {
    const btn = document.getElementById('wishlist-detail-btn');
    if (!btn || !currentProduct) return;
    
    const isInWishlist = wishlist.some(item => item.id === currentProduct.id);
    
    if (isInWishlist) {
        btn.classList.add('active');
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
        `;
        btn.style.background = 'var(--color-accent)';
        btn.style.borderColor = 'var(--color-accent)';
        btn.style.color = 'var(--color-background)';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
        `;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    }
}
