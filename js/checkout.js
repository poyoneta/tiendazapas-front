// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    renderCheckoutItems();
    setupShippingListeners();
    setupInputFormatting();
});

// ===== RENDERIZAR ITEMS DEL CHECKOUT =====
function renderCheckoutItems() {
    const container = document.getElementById('checkout-items');
    
    if (cart.length === 0) {
        window.location.href = 'index.html';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="order-item">
            <div class="order-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="order-item-details">
                <p class="order-item-name">${item.name}</p>
                <p class="order-item-info">Talla: ${item.size} | Cantidad: ${item.quantity}</p>
            </div>
            <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    updateTotals();
}

// ===== CALCULAR TOTALES =====
function updateTotals() {
    const subtotal = getCartTotal();
    const shipping = getShippingCost();
    const tax = subtotal * 0.16; // 16% IVA
    const total = subtotal + shipping + tax;
    
    document.getElementById('checkout-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('checkout-shipping').textContent = `$${shipping.toFixed(2)}`;
    document.getElementById('checkout-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;
}

function getShippingCost() {
    const selectedShipping = document.querySelector('input[name="shipping"]:checked');
    if (!selectedShipping) return 9.99;
    
    switch (selectedShipping.value) {
        case 'express': return 19.99;
        case 'overnight': return 29.99;
        default: return 9.99;
    }
}

// ===== LISTENERS DE ENVÍO =====
function setupShippingListeners() {
    const shippingInputs = document.querySelectorAll('input[name="shipping"]');
    shippingInputs.forEach(input => {
        input.addEventListener('change', updateTotals);
    });
}

// ===== FORMATEO DE INPUTS =====
function setupInputFormatting() {
    // Card number formatting
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formatted = '';
            for (let i = 0; i < value.length && i < 16; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += value[i];
            }
            e.target.value = formatted;
        });
    }
    
    // Expiry date formatting
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // CVV - numbers only
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }
    
    // Phone formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d+\-\s()]/g, '');
            e.target.value = value;
        });
    }
}

// ===== PROCESAR CHECKOUT =====
function processCheckout(event) {
    event.preventDefault();
    
    // Validate form
    const form = document.getElementById('checkout-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Simulate processing
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Procesando...
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .spinner {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
    
    // Simulate API call
    setTimeout(() => {
        // Generate order number
        const orderNumber = 'SV-' + Date.now().toString().slice(-6);
        document.getElementById('order-number').textContent = '#' + orderNumber;
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartCount();
        
        // Show confirmation modal
        document.getElementById('confirmation-modal').classList.add('active');
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
            Confirmar Pedido
        `;
    }, 2000);
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Don't close, redirect instead
                window.location.href = 'index.html';
            }
        });
    }
});
