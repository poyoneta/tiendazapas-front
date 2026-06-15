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