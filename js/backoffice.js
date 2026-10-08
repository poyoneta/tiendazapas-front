// ===== CONFIG =====
const SUPABASE_URL = "https://jkuyzcpupjaitbvfroxc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXl6Y3B1cGphaXRidmZyb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzUwMDEsImV4cCI6MjEwMjA1MTAwMX0.L5hMt-CE4dzaEe_GbYpo1OGPTGLQvFkCidb1S8yZRvo";
const API_URL = "https://apitiendazapatillas-1.onrender.com";
const ROL_ADMIN = "Admin";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado en memoria para no repetir pedidos
let ZAPATILLAS = [];    // catálogo simplificado (con marca)
let MARCAS = [];
let COLORES = [];       // colores existentes en la base (Id + nombre + hex)
let detalleCache = {};  // zapatillaId -> detalle con colorways/imagenes

// Misma lógica que auth.js: 2 consultas simples en vez de un "embed" profiles->roles.
async function esUsuarioAdmin(session) {
    const { data: perfil, error: errorPerfil } = await supabaseClient
        .from("profiles")
        .select("rol_id")
        .eq("id", session.user.id)
        .maybeSingle();

    if (errorPerfil) throw new Error("Error leyendo profiles: " + errorPerfil.message);
    if (!perfil || !perfil.rol_id) return false;

    const { data: rol, error: errorRol } = await supabaseClient
        .from("roles")
        .select("nombre")
        .eq("id", perfil.rol_id)
        .maybeSingle();

    if (errorRol) throw new Error("Error leyendo roles: " + errorRol.message);
    return rol?.nombre === ROL_ADMIN;
}

// ===== GUARD DE ACCESO =====
(async function protegerBackoffice() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            window.location.href = "login.html";
            return;
        }

        const esAdmin = await esUsuarioAdmin(session);

        if (!esAdmin) {
            alert("No tenés permisos para acceder al backoffice.");
            window.location.href = "index.html";
            return;
        }

        document.getElementById("admin-nombre").textContent =
            session.user.user_metadata?.full_name || session.user.email;
        document.getElementById("cargando").style.display = "none";
        document.getElementById("app").style.display = "block";

        document.getElementById("cerrar-sesion").addEventListener("click", async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
        });

        inicializarPanel();
    } catch (e) {
        console.error("Error verificando acceso al backoffice:", e);
        document.getElementById("cargando").textContent =
            "No se pudo verificar tu acceso. Abrí la consola (F12) para ver el detalle del error.";
    }
})();

// ===== NAVEGACIÓN ENTRE SECCIONES =====
function inicializarPanel() {
    document.querySelectorAll("nav.sidebar button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("nav.sidebar button").forEach((b) => b.classList.remove("activo"));
            document.querySelectorAll(".seccion").forEach((s) => s.classList.remove("activa"));
            btn.classList.add("activo");
            document.getElementById("seccion-" + btn.dataset.seccion).classList.add("activa");
        });
    });

    // Listeners "en cascada" entre selects: se atan UNA sola vez acá
    document.getElementById("colorway-zapatilla").addEventListener("change", (e) => actualizarTablaColorways(e.target.value));
    document.getElementById("variante-zapatilla").addEventListener("change", (e) => cargarColorwaysEnSelect(e.target.value, "variante-colorway"));
    document.getElementById("imagen-zapatilla").addEventListener("change", (e) => cargarColorwaysEnSelect(e.target.value, "imagen-colorway"));
    document.getElementById("eliminar-var-zapatilla").addEventListener("change", (e) => cargarColorwaysEnSelect(e.target.value, "eliminar-var-colorway"));
    document.getElementById("eliminar-var-colorway").addEventListener("change", (e) => cargarVariantesEnSelect(e.target.value, "eliminar-variante"));

    cargarMarcas();
    cargarColores();
    cargarZapatillas();
    wireFormMarca();
    wireFormColor();
    wireFormZapatilla();
    wireFormColorway();
    wireFormVariante();
    wireFormImagen();
    wireInventario();
    wireEliminar();
}

// ===== HELPERS =====
function mostrarMensaje(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.classList.remove("exito", "error");
    el.classList.add(tipo);
}

function llenarSelect(select, items, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>` +
        items.map((it) => `<option value="${it.value}">${it.label}</option>`).join("");
}

async function api(path, options = {}) {
    const resp = await fetch(`${API_URL}${path}`, options);
    if (!resp.ok) {
        const texto = await resp.text().catch(() => "");
        throw new Error(texto || `Error ${resp.status}`);
    }
    const tipo = resp.headers.get("content-type") || "";
    return tipo.includes("application/json") ? resp.json() : null;
}

// Escapa texto antes de meterlo con innerHTML
function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Devuelve un color CSS válido a partir del hex guardado (con o sin "#"); si no es válido, gris.
function colorCss(hex) {
    const h = String(hex ?? "").trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(h)) return h;
    if (/^[0-9a-fA-F]{3,8}$/.test(h)) return "#" + h;
    return "#333";
}

// ===== CARGA DE DATOS BASE =====
async function cargarMarcas() {
    try {
        MARCAS = await api("/api/Catalogo/marcas");
        llenarSelect(document.getElementById("zapatilla-marca"), MARCAS.map(m => ({ value: m.id, label: m.nombre })), "Elegí una marca");
        document.getElementById("tabla-marcas").innerHTML = MARCAS.map(m => `
            <tr><td>${m.id}</td><td>${m.nombre}</td><td>${m.logoUrl ? `<a href="${m.logoUrl}" target="_blank">ver</a>` : "-"}</td></tr>
        `).join("");
    } catch (e) {
        console.error("Error cargando marcas:", e);
    }
}

async function cargarColores() {
    const select = document.getElementById("colorway-color");
    try {
        COLORES = await api("/api/Catalogo/colores");

        llenarSelect(select, COLORES.map(c => ({
            value: c.id,
            label: `#${c.id} - ${esc(c.nombre)}${c.hex ? " (" + esc(c.hex) + ")" : ""}`
        })), "Elegí un color");

        const filas = COLORES.map(c => `
            <tr>
                <td>#${c.id}</td>
                <td><span class="swatch" style="background:${colorCss(c.hex)}"></span>${esc(c.nombre)}</td>
                <td>${esc(c.hex) || "-"}</td>
            </tr>
        `).join("") || `<tr><td colspan="3">Todavía no hay colores creados.</td></tr>`;

        document.getElementById("tabla-colores").innerHTML = filas;
        document.getElementById("tabla-colores-colorway").innerHTML = filas;
    } catch (e) {
        console.error("Error cargando colores:", e);
        llenarSelect(select, [], "No se pudo cargar la lista de colores");
    }
}

async function cargarZapatillas() {
    try {
        ZAPATILLAS = await api("/api/Catalogo");

        const opciones = ZAPATILLAS.map(z => ({ value: z.id, label: `${z.marca?.nombre ?? "?"} - ${z.nombre}` }));

        ["colorway-zapatilla", "variante-zapatilla", "imagen-zapatilla", "eliminar-zapatilla", "eliminar-var-zapatilla"]
            .forEach(id => llenarSelect(document.getElementById(id), opciones, "Elegí una zapatilla"));

        document.getElementById("tabla-zapatillas").innerHTML = ZAPATILLAS.map(z => `
            <tr><td>${z.id}</td><td>${z.marca?.nombre ?? "-"}</td><td>${z.nombre}</td></tr>
        `).join("");
    } catch (e) {
        console.error("Error cargando zapatillas:", e);
    }
}

async function obtenerDetalle(zapatillaId) {
    if (!zapatillaId) return null;
    if (detalleCache[zapatillaId]) return detalleCache[zapatillaId];
    const detalle = await api(`/api/Catalogo/${zapatillaId}`);
    detalleCache[zapatillaId] = detalle;
    return detalle;
}

async function cargarColorwaysEnSelect(zapatillaId, selectId) {
    const select = document.getElementById(selectId);
    if (!zapatillaId) { llenarSelect(select, [], "Elegí primero una zapatilla"); return; }
    try {
        const detalle = await obtenerDetalle(zapatillaId);
        const opciones = (detalle?.zapatillaColores ?? []).map(zc => ({
            value: zc.id,
            label: `#${zc.id} - ${zc.color?.nombre ?? "color " + zc.colorId}`
        }));
        llenarSelect(select, opciones, "Elegí un colorway");
    } catch (e) {
        console.error("Error cargando colorways:", e);
    }
}

async function actualizarTablaColorways(zapatillaId) {
    const tbody = document.getElementById("tabla-colorways");
    if (!zapatillaId) { tbody.innerHTML = ""; return; }
    try {
        const detalle = await obtenerDetalle(zapatillaId);
        tbody.innerHTML = (detalle?.zapatillaColores ?? []).map(zc => `
            <tr>
                <td>#${zc.id}</td>
                <td><span class="swatch" style="background:${colorCss(zc.color?.hex)}"></span>${esc(zc.color?.nombre ?? "-")}</td>
                <td>${(zc.imagenes ?? []).length} foto(s)</td>
            </tr>
        `).join("") || `<tr><td colspan="3">Esta zapatilla todavía no tiene colorways.</td></tr>`;
    } catch (e) {
        console.error("Error cargando colorways:", e);
    }
}

async function cargarVariantesEnSelect(zapatillaColorId, selectId) {
    const select = document.getElementById(selectId);
    if (!zapatillaColorId) { llenarSelect(select, [], "Elegí primero un colorway"); return; }
    try {
        const variantes = await api(`/api/Catalogo/colorway/${zapatillaColorId}/variantes`);
        llenarSelect(select, variantes.map(v => ({
            value: v.id,
            label: `Talla ${v.talla} - $${v.precio} - stock ${v.stock}`
        })), "Elegí una variante");
    } catch (e) {
        console.error("Error cargando variantes:", e);
    }
}

// ===== FORM: MARCA =====
function wireFormMarca() {
    document.getElementById("form-marca").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombre = document.getElementById("marca-nombre").value.trim();
        const logoUrl = document.getElementById("marca-logo").value.trim();
        try {
            await api("/api/Admin/marcas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, logoUrl }),
            });
            mostrarMensaje("msg-marca", "Marca creada correctamente.", "exito");
            e.target.reset();
            cargarMarcas();
        } catch (err) {
            mostrarMensaje("msg-marca", "Error: " + err.message, "error");
        }
    });
}

// ===== FORM: COLOR =====
function wireFormColor() {
    document.getElementById("form-color").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombre = document.getElementById("color-nombre").value.trim();
        const hex = document.getElementById("color-hex").value.trim();
        try {
            const creado = await api("/api/Admin/colores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, hex }),
            });
            mostrarMensaje("msg-color", `Color creado con Id ${creado?.id ?? "?"}. Ya aparece en la lista de Colorways.`, "exito");
            e.target.reset();
            cargarColores();
        } catch (err) {
            mostrarMensaje("msg-color", "Error: " + err.message, "error");
        }
    });
}

// ===== FORM: ZAPATILLA =====
function wireFormZapatilla() {
    document.getElementById("form-zapatilla").addEventListener("submit", async (e) => {
        e.preventDefault();
        const marcaId = Number(document.getElementById("zapatilla-marca").value);
        const nombre = document.getElementById("zapatilla-nombre").value.trim();
        const descripcion = document.getElementById("zapatilla-descripcion").value.trim();
        if (!marcaId) { mostrarMensaje("msg-zapatilla", "Elegí una marca.", "error"); return; }
        try {
            await api("/api/Admin/zapatillas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ marcaId, nombre, descripcion }),
            });
            mostrarMensaje("msg-zapatilla", "Zapatilla creada correctamente.", "exito");
            e.target.reset();
            cargarZapatillas();
        } catch (err) {
            mostrarMensaje("msg-zapatilla", "Error: " + err.message, "error");
        }
    });
}

// ===== FORM: COLORWAY =====
function wireFormColorway() {
    document.getElementById("form-colorway").addEventListener("submit", async (e) => {
        e.preventDefault();
        const zapatillaId = Number(document.getElementById("colorway-zapatilla").value);
        const colorId = Number(document.getElementById("colorway-color").value);
        if (!zapatillaId) { mostrarMensaje("msg-colorway", "Elegí una zapatilla.", "error"); return; }
        if (!colorId) { mostrarMensaje("msg-colorway", "Elegí un color.", "error"); return; }
        try {
            await api("/api/Admin/colorways", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ zapatillaId, colorId }),
            });
            mostrarMensaje("msg-colorway", "Colorway creado correctamente.", "exito");
            e.target.reset();
            delete detalleCache[zapatillaId];
            document.getElementById("colorway-zapatilla").value = zapatillaId;
            actualizarTablaColorways(zapatillaId);
        } catch (err) {
            mostrarMensaje("msg-colorway", "Error: " + err.message, "error");
        }
    });
}

// ===== FORM: VARIANTE =====
function wireFormVariante() {
    document.getElementById("form-variante").addEventListener("submit", async (e) => {
        e.preventDefault();
        const zapatillaColorId = Number(document.getElementById("variante-colorway").value);
        const talla = Number(document.getElementById("variante-talla").value);
        const precio = Number(document.getElementById("variante-precio").value);
        const stock = Number(document.getElementById("variante-stock").value);
        if (!zapatillaColorId) { mostrarMensaje("msg-variante", "Elegí un colorway.", "error"); return; }
        try {
            await api("/api/Admin/variantes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ zapatillaColorId, talla, precio, stock }),
            });
            mostrarMensaje("msg-variante", "Variante creada correctamente.", "exito");
            e.target.reset();
        } catch (err) {
            mostrarMensaje("msg-variante", "Error: " + err.message, "error");
        }
    });
}

// ===== FORM: IMAGEN =====
function wireFormImagen() {
    document.getElementById("form-imagen").addEventListener("submit", async (e) => {
        e.preventDefault();
        const zapatillaId = document.getElementById("imagen-zapatilla").value;
        const zapatillaColorId = document.getElementById("imagen-colorway").value;
        const archivo = document.getElementById("imagen-archivo").files[0];
        const orden = document.getElementById("imagen-orden").value || 1;
        const esPrincipal = document.getElementById("imagen-principal").checked;

        if (!zapatillaColorId) { mostrarMensaje("msg-imagen", "Elegí un colorway.", "error"); return; }
        if (!archivo) { mostrarMensaje("msg-imagen", "Elegí un archivo de imagen.", "error"); return; }

        const formData = new FormData();
        formData.append("Archivo", archivo);
        formData.append("Orden", orden);
        formData.append("Es_Principal", esPrincipal);
        formData.append("ZapatillaColorId", zapatillaColorId);

        try {
            await api("/api/Admin/subir-imagen", { method: "POST", body: formData });
            mostrarMensaje("msg-imagen", "Imagen subida correctamente.", "exito");
            e.target.reset();
            delete detalleCache[zapatillaId];
        } catch (err) {
            mostrarMensaje("msg-imagen", "Error: " + err.message, "error");
        }
    });
}

// ===== INVENTARIO =====
function wireInventario() {
    document.getElementById("btn-refrescar-stock").addEventListener("click", cargarStockBajo);
    cargarStockBajo();
}

async function cargarStockBajo() {
    try {
        const variantes = await api("/api/Inventario/stock-bajo");
        document.getElementById("tabla-stock-bajo").innerHTML = variantes.map(v => `
            <tr data-id="${v.id}">
                <td>${v.id}</td>
                <td>${v.zapatillaColor?.color?.nombre ?? "-"}</td>
                <td>${v.talla}</td>
                <td class="stock-bajo">${v.stock}</td>
                <td>
                    <input type="number" style="width:70px;display:inline-block;" value="${v.stock}" class="input-nuevo-stock">
                    <button class="btn chico secundario" type="button">Guardar</button>
                </td>
            </tr>
        `).join("") || `<tr><td colspan="5">No hay variantes con stock bajo. 🎉</td></tr>`;

        document.querySelectorAll("#tabla-stock-bajo button").forEach(btn => {
            btn.addEventListener("click", async () => {
                const fila = btn.closest("tr");
                const id = fila.dataset.id;
                const nuevoStock = fila.querySelector(".input-nuevo-stock").value;
                try {
                    await api(`/api/Inventario/stock/${id}?nuevoStock=${nuevoStock}`, { method: "PUT" });
                    cargarStockBajo();
                } catch (err) {
                    alert("Error actualizando stock: " + err.message);
                }
            });
        });
    } catch (e) {
        console.error("Error cargando stock bajo:", e);
    }
}

// ===== ELIMINAR =====
function wireEliminar() {
    document.getElementById("btn-eliminar-zapatilla").addEventListener("click", async () => {
        const id = document.getElementById("eliminar-zapatilla").value;
        if (!id) { mostrarMensaje("msg-eliminar-zapatilla", "Elegí una zapatilla.", "error"); return; }
        if (!confirm("¿Seguro que querés eliminar esta zapatilla? Se borran también sus colorways, variantes e imágenes.")) return;
        try {
            await api(`/api/Admin/zapatillas/${id}`, { method: "DELETE" });
            mostrarMensaje("msg-eliminar-zapatilla", "Zapatilla eliminada.", "exito");
            delete detalleCache[id];
            cargarZapatillas();
        } catch (err) {
            mostrarMensaje("msg-eliminar-zapatilla", "Error: " + err.message, "error");
        }
    });

    document.getElementById("btn-eliminar-variante").addEventListener("click", async () => {
        const id = document.getElementById("eliminar-variante").value;
        if (!id) { mostrarMensaje("msg-eliminar-variante", "Elegí una variante.", "error"); return; }
        if (!confirm("¿Seguro que querés eliminar esta variante (talle)?")) return;
        try {
            await api(`/api/Admin/variantes/${id}`, { method: "DELETE" });
            mostrarMensaje("msg-eliminar-variante", "Variante eliminada.", "exito");
            const colorwayId = document.getElementById("eliminar-var-colorway").value;
            cargarVariantesEnSelect(colorwayId, "eliminar-variante");
        } catch (err) {
            mostrarMensaje("msg-eliminar-variante", "Error: " + err.message, "error");
        }
    });
}