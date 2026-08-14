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

        // Arrancamos mostrando el colorway con foto principal (igual criterio
        // que usa el index para elegir la miniatura de la tarjeta) — si ninguno
        // tiene foto marcada como principal, caemos al primero que tenga alguna imagen.
        const colorwayInicial = elegirColorwayInicial(currentProduct.zapatillaColores);
        await seleccionarColorway(colorwayInicial);

        renderInfoBase();
        renderSelectorDeColores();

    } catch (error) {
        console.error("Error al cargar el producto:", error);
        document.getElementById("product-title").textContent = "No se pudo cargar el producto. Recargá la página.";
    }
}

// Mismo criterio que obtenerImagenPrincipal() en app.js: preferimos el colorway
// que tenga una imagen marcada Es_Principal; si ninguno la tiene, el primero
// que tenga alguna imagen; si ninguno tiene fotos, el primero de la lista.
function elegirColorwayInicial(colorways) {
    const conPrincipal = colorways.find(zc =>
        (zc.imagenes || []).some(img => img.es_Principal)
    );
    if (conPrincipal) return conPrincipal;

    const conAlgunaImagen = colorways.find(zc => (zc.imagenes || []).length > 0);
    if (conAlgunaImagen) return conAlgunaImagen;

    return colorways[0];
}

// Datos que no cambian al elegir un color: marca, descripción
function renderInfoBase() {
    document.getElementById("product-category").textContent = currentProduct.marca?.nombre || "Sin marca";
    document.getElementById("product-description").textContent = currentProduct.descripcion;
}

// Título + <title> de la pestaña — SÍ cambia según el color elegido
// (ej: "Air Force 1" + "Negra" -> "Air Force 1 Negra")
function renderTitulo() {
    const nombreCompleto = currentColorway.color?.nombre
        ? `${currentProduct.nombre} ${currentColorway.color.nombre}`
        : currentProduct.nombre;

    document.title = nombreCompleto;
    document.getElementById("product-title").textContent = nombreCompleto;
}

// La fila de miniaturas — una por cada colorway (color) disponible,
// mostrando la foto de ESE color en vez de un círculo sólido
function renderSelectorDeColores() {
    const colorContainer = document.getElementById("color-options");

    colorContainer.innerHTML = currentProduct.zapatillaColores.map(zc => {
        const esActivo = zc.id === currentColorway.id;
        const imagenes = zc.imagenes || [];
        const principal = imagenes.find(img => img.es_Principal) || imagenes[0];
        const thumbUrl = principal?.url || 'img/placeholder.jpg';

        return `
            <button class="thumbnail ${esActivo ? "active" : ""}"
                    title="${zc.color?.nombre || ""}"
                    onclick="selectColorway(${zc.id})">
                <img src="${thumbUrl}" alt="${zc.color?.nombre || ""}">
            </button>
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

    renderTitulo();
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
    const imagenes = currentColorway.imagenes || [];

    // Foto que se muestra grande al entrar (o al cambiar de color): la
    // marcada como principal, o si no hay ninguna, la primera de la lista.
    const principal = imagenes.find(img => img.es_Principal) || imagenes[0];
    mostrarImagenGrande(principal?.url);

    renderGaleriaDeImagenes(imagenes, principal);
}

// Cambia la foto grande — se usa tanto al elegir color como al clickear
// una miniatura de la galería de fotos del color actual
function mostrarImagenGrande(url) {
    const imgElement = document.getElementById("main-product-image");
    imgElement.src = url || 'img/placeholder.jpg';
    imgElement.alt = currentProduct.nombre;
}

// Fila de miniaturas con TODAS las fotos del colorway actual (no cambia
// de color, solo cambia cuál de esas fotos se ve grande). Si el color
// tiene 0 o 1 fotos, no tiene sentido mostrar la galería.
function renderGaleriaDeImagenes(imagenes, imagenActiva) {
    const galeria = document.getElementById("image-gallery");
    if (!galeria) return; // por si el HTML todavía no tiene el contenedor

    if (!imagenes || imagenes.length <= 1) {
        galeria.innerHTML = "";
        return;
    }

    galeria.innerHTML = imagenes.map(img => {
        const esActiva = imagenActiva && img.id === imagenActiva.id;
        return `
            <button class="thumbnail ${esActiva ? "active" : ""}"
                    onclick="mostrarImagenGrande('${img.url}'); marcarImagenActiva(this)">
                <img src="${img.url}" alt="${currentProduct.nombre}">
            </button>
        `;
    }).join("");
}

function marcarImagenActiva(button) {
    document.querySelectorAll("#image-gallery .thumbnail").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
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

    const nombreConColor = currentColorway.color?.nombre
        ? `${currentProduct.nombre} ${currentColorway.color.nombre}`
        : currentProduct.nombre;

    addToCart({
        id: currentProduct.id,
        name: nombreConColor,
        price: variante.precio,
        image: principal?.url || 'img/placeholder.jpg',
        size: selectedSize,
        color: currentColorway.color?.nombre || "",
        quantity: quantity
    });

    openCart();
}