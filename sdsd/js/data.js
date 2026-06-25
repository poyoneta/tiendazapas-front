let products = [];

async function cargarProductos() {
    try {
        const response = await fetch(
            "https://localhost:7049/api/Catalogo"
        );

        products = await response.json();
        

        console.log(products);

        renderProducts();

    } catch (error) {
        console.error(error);
    }
}

cargarProductos();

async function cargarVariantes(id) {
    try {
        const response = await fetch(
            `https://localhost:7049/api/Catalogo/${id}/variantes`
        );

        const variantes = await response.json();

        console.log(variantes);

        return variantes;

    } catch (error) {
        console.error(error);
    }
}
async function cargarMarcas() {
    try {
        const response = await fetch(
            "https://localhost:7049/api/Catalogo/marcas"
        );

        const marcas = await response.json();

        const filters = document.querySelector(".filters");

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

        const response = await fetch(
            `https://localhost:7049/api/Catalogo/marca/${marcaId}`
        );

        const zapatillas = await response.json();

        renderProducts(zapatillas);

    } catch (error) {
        console.error(error);
    }
}