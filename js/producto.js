let currentProduct = null;      // La zapatilla con sus colorways e imágenes
let currentColorway = null;     // El ZapatillaColor seleccionado actualmente
let currentVariants = [];       // Variantes (talla/precio/stock) del colorway seleccionado

let selectedSize = null;
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

    document.getElementById("product-title").textContent = "Cargando...";

    try {
        const response = await fetch(`${API_URL}/api/Catalogo/${productId}`);

        if (!response.ok) throw new Error(`Status ${response.status}`);

        currentProduct = await response.json();

        if (!currentProduct.zapatillaColores || currentProduct.zapatillaColores.length === 0) {
            document.getElementById("product-title").textContent = "Este producto no tiene colores cargados.";
            return;
        }

        // Arrancamos mostrando el primer colorway disponible
        await seleccionarColorway(currentProduct.zapatillaColores[0]);

        renderInfoBase();
        renderSelectorDeColores();

    } catch (error) {
        console.error("Error al cargar el producto:", error);
        document.getElementById("product-title").textContent = "No se pudo cargar el producto. Recargá la página.";
    }
}

// Datos que no cambian al elegir un color: nombre, marca, descripción
function renderInfoBase() {
    document.title = currentProduct.nombre;
    document.getElementById("product-title").textContent = currentProduct.nombre;
    document.getElementById("product-category").textContent = currentProduct.marca?.nombre || "Sin marca";
    document.getElementById("product-description").textContent = currentProduct.descripcion;
}

// La fila de miniaturas — una por cada colorway (color) disponible
function renderSelectorDeColores() {
    const colorContainer = document.getElementById("color-options");

    colorContainer.innerHTML = currentProduct.zapatillaColores.map(zc => {
        const esActivo = zc.id === currentColorway.id;
        return `
            <button class="color-btn ${esActivo ? "active" : ""}"
                    style="background-color:${zc.color?.hex || "#ccc"}"
                    title="${zc.color?.nombre || ""}"
                    onclick="selectColorway(${zc.id})"></button>
        `;
    }).join("");
}

// Se llama al clickear una miniatura de color
async function selectColorway(zapatillaColorId) {
    const colorway = currentProduct.zapatillaColores.find(zc => zc.id === zapatillaColorId);
    if (!colorway) return;

    await seleccionarColorway(colorway);
    renderSelectorDeColores(); // redibuja para marcar el nuevo botón como activo
}

// Lógica compartida: cambiar de colorway = cambiar imagen + pedir sus variantes
async function seleccionarColorway(colorway) {
    currentColorway = colorway;
    selectedSize = null;

    renderImagenPrincipal();

    try {
        const response = await fetch(`${API_URL}/api/Catalogo/colorway/${colorway.id}/variantes`);

        if (!response.ok) throw new Error(`Status ${response.status}`);

        currentVariants = await response.json();
        selectedSize = currentVariants[0]?.talla ?? null;
    } catch (error) {
        console.error("Error al cargar variantes del color:", error);
        currentVariants = [];
    }

    renderTallas();
    actualizarPrecioYStock();
}

function renderImagenPrincipal() {
    const imgElement = document.getElementById("main-product-image");
    const imagenes = currentColorway.imagenes;

    if (imagenes && imagenes.length > 0) {
        // Preferimos la marcada como principal; si no hay, la primera disponible
        const principal = imagenes.find(img => img.es_Principal) || imagenes[0];
        imgElement.src = principal.url;
    } else {
        imgElement.src = 'img/placeholder.jpg';
    }

    imgElement.alt = currentProduct.nombre;
}

function renderTallas() {
    const sizeContainer = document.getElementById("size-options");

    if (currentVariants.length === 0) {
        sizeContainer.innerHTML = `<p>Sin talles disponibles para este color.</p>`;
        return;
    }

    sizeContainer.innerHTML = currentVariants.map(v => `
        <button class="size-btn ${v.talla === selectedSize ? "active" : ""}"
                onclick="selectSize(${v.talla}, this)">${v.talla}</button>
    `).join("");
}

function selectSize(size, button) {
    selectedSize = size;
    document.querySelectorAll(".size-btn").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    actualizarPrecioYStock();
}

function actualizarPrecioYStock() {
    const variante = currentVariants.find(v => v.talla === selectedSize);

    const precioElement = document.getElementById("product-price");
    const stockElement = document.getElementById("product-stock");

    if (!variante) {
        precioElement.textContent = "";
        if (stockElement) stockElement.textContent = "";
        return;
    }

    precioElement.textContent = `$${variante.precio}`;
    if (stockElement) {
        stockElement.textContent = `Stock disponible: ${variante.stock}`;
    }
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
    const variante = currentVariants.find(v => v.talla === selectedSize);
    if (!variante) return;

    const imagenes = currentColorway.imagenes;
    const principal = imagenes?.find(img => img.es_Principal) || imagenes?.[0];

    addToCart({
        id: currentProduct.id,
        name: currentProduct.nombre,
        price: variante.precio,
        image: principal?.url || 'img/placeholder.jpg',
        size: selectedSize,
        color: currentColorway.color?.nombre || "",
        quantity: quantity
    });

    openCart();
}