const API_URL = "https://apitiendazapatillas-1.onrender.com";

let products = [];

async function cargarProductos() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    try {
        const response = await fetch(`${API_URL}/api/Catalogo`);

        if (!response.ok) throw new Error(`Status ${response.status}`);

        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<p>No se pudieron cargar los productos. Recargá la página.</p>`;
    }
}

cargarProductos();

async function cargarMarcas() {
    try {
        const filters = document.querySelector(".filters");
        if (!filters) return; // no estamos en index.html, no hay nada que hacer acá

        const response = await fetch(`${API_URL}/api/Catalogo/marcas`);

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const marcas = await response.json();

        filters.innerHTML = `
            <button class="filter-btn active" data-id="all">
                Todos
            </button>
        `;

        marcas.forEach(marca => {
            filters.innerHTML += `
                <button class="filter-btn" data-id="${marca.id}">
                    ${marca.nombre}
                </button>
            `;
        });

        agregarEventosFiltro();

    } catch (error) {
        console.error(error);
    }
}

async function filtrarPorMarca(marcaId) {
    try {
        const response = await fetch(`${API_URL}/api/Catalogo/marca/${marcaId}`);

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const zapatillas = await response.json();
        renderProducts(zapatillas);

    } catch (error) {
        console.error(error);
    }
}