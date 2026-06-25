const urlBase = "https://localhost:7049";

let currentProduct = null;
let variants = [];

let selectedSize = null;
let selectedColor = null;
let quantity = 1;

document.addEventListener("DOMContentLoaded", () => {
    loadProduct();

    const input = document.getElementById("quantity");

    if (input) {
        input.addEventListener("change", (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) val = 1;
            quantity = val;
            e.target.value = quantity;
        });
    }
});

async function loadProduct() {
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get("id"));

    if (!productId) {
        window.location.href = "index.html";
        return;
    }

    try {
        // CORRECCIÓN 1: Usamos la ruta exacta que definiste: api/Catalogo/{id}
        const productResponse = await fetch(`${urlBase}/api/Catalogo/${productId}`);
        
        // CORRECCIÓN 2: La ruta correcta según tu controlador es api/Catalogo/variantes/{zapatillaId}
        const variantsResponse = await fetch(`${urlBase}/api/Catalogo/variantes/${productId}`);

        if (!productResponse.ok || !variantsResponse.ok) {
            throw new Error(`Error al obtener datos: ${productResponse.status} / ${variantsResponse.status}`);
        }

        currentProduct = await productResponse.json();
        variants = await variantsResponse.json();

        // ... resto del código igual
        selectedSize = variants[0]?.talla;
        selectedColor = variants[0]?.color?.id;

        renderProductDetail();

    } catch (error) {
        console.error("Error al cargar el producto:", error);
    }
}

function renderProductDetail() {
    document.title = currentProduct.nombre;

    // Lógica para la imagen usando urlBase
    const imgElement = document.getElementById("main-product-image");
    if (currentProduct.imagenes && currentProduct.imagenes.length > 0) {
        imgElement.src = urlBase + currentProduct.imagenes[0].url;
    } else {
        imgElement.src = 'img/placeholder.jpg'; 
    }
    imgElement.alt = currentProduct.nombre;

    document.getElementById("product-title").textContent = currentProduct.nombre;
    document.getElementById("product-category").textContent = currentProduct.marca?.nombre || "Sin marca";
    document.getElementById("product-description").textContent = currentProduct.descripcion;

    const precioMin = Math.min(...variants.map(v => v.precio));
    document.getElementById("product-price").textContent = `$${precioMin}`;

    // Renderizado de tallas
    const tallas = [...new Set(variants.map(v => v.talla))];
    const sizeContainer = document.getElementById("size-options");
    sizeContainer.innerHTML = tallas.map(talla => `
        <button class="size-btn ${talla === selectedSize ? "active" : ""}" 
                onclick="selectSize(${talla}, this)">${talla}</button>
    `).join("");

    // Renderizado de colores
    const colores = [...new Map(variants.map(v => [v.color.id, v.color])).values()];
    const colorContainer = document.getElementById("color-options");
    colorContainer.innerHTML = colores.map(color => `
        <button class="color-btn ${color.id === selectedColor ? "active" : ""}" 
                style="background-color:${color.codigoHex}" 
                onclick="selectColor(${color.id}, this)"></button>
    `).join("");

    actualizarVarianteSeleccionada();
}

function actualizarVarianteSeleccionada() {
    const variante = variants.find(v => v.talla === selectedSize && v.color.id === selectedColor);
    
    if (!variante) return;

    document.getElementById("product-price").textContent = `$${variante.precio}`;

    const stockElement = document.getElementById("product-stock");
    if (stockElement) {
        stockElement.textContent = `Stock disponible: ${variante.stock}`;
    }
}

function selectSize(size, button) {
    selectedSize = size;
    document.querySelectorAll(".size-btn").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    actualizarVarianteSeleccionada();
}

function selectColor(colorId, button) {
    selectedColor = colorId;
    document.querySelectorAll(".color-btn").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    actualizarVarianteSeleccionada();
}

function increaseQty() {
    quantity++;
    document.getElementById("quantity").value = quantity;
}

function decreaseQty() {
    if (quantity > 1) {
        quantity--;
        document.getElementById("quantity").value = quantity;
    }
}

function addToCartFromDetail() {
    const variante = variants.find(v => v.talla === selectedSize && v.color.id === selectedColor);
    if (!variante) return;

    // Asegúrate de que addToCart esté definida en tu archivo app.js
    addToCart(currentProduct.id, selectedSize, selectedColor, quantity);
    openCart();
}