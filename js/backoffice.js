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
    document.getElementById("imagen-zapatilla").addEventListener("change", (e) => cargarColorwaysEnSelect(e.target.value, "imagen-colorway"));
    document.getElementById("eliminar-var-zapatilla").addEventListener("change", (e) => cargarColorwaysEnSelect(e.target.value, "eliminar-var-colorway"));
    document.getElementById("eliminar-var-colorway").addEventListener("change", (e) => cargarVariantesEnSelect(e.target.value, "eliminar-variante"));

    cargarMarcas();
    cargarColores();
    cargarZapatillas();
    wireFormMarca();
    wireFormColor();
    wireFormZapatilla();
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
    try {
        COLORES = await api("/api/Catalogo/colores");

        const filas = COLORES.map(c => `
            <tr>
                <td>#${c.id}</td>
                <td><span class="swatch" style="background:${colorCss(c.hex)}"></span>${esc(c.nombre)}</td>
                <td>${esc(c.hex) || "-"}</td>
            </tr>
        `).join("") || `<tr><td colspan="3">Todavía no hay colores creados.</td></tr>`;

        refrescarColoresEnBuilder();
        document.getElementById("tabla-colores").innerHTML = filas;
    } catch (e) {
        console.error("Error cargando colores:", e);
    }
}

async function cargarZapatillas() {
    try {
        ZAPATILLAS = await api("/api/Catalogo");

        const opciones = ZAPATILLAS.map(z => ({ value: z.id, label: `${z.marca?.nombre ?? "?"} - ${z.nombre}` }));

        ["imagen-zapatilla", "eliminar-zapatilla", "eliminar-var-zapatilla"]
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
            mostrarMensaje("msg-color", `Color creado con Id ${creado?.id ?? "?"}. Ya podés elegirlo al crear una zapatilla.`, "exito");
            e.target.reset();
            cargarColores();
        } catch (err) {
            mostrarMensaje("msg-color", "Error: " + err.message, "error");
        }
    });
}

// ===== FORM: ZAPATILLA COMPLETA (datos + colores + talles + fotos) =====
function opcionesColorHtml(seleccionado) {
    return `<option value="">Elegí un color</option>` + COLORES.map(c =>
        `<option value="${c.id}"${String(c.id) === String(seleccionado) ? " selected" : ""}>#${c.id} - ${esc(c.nombre)}${c.hex ? " (" + esc(c.hex) + ")" : ""}</option>`
    ).join("");
}

// Cuando se carga/recarga la lista de colores, actualiza los desplegables ya dibujados
function refrescarColoresEnBuilder() {
    document.querySelectorAll("#colorways-builder .bc-color").forEach(sel => {
        const actual = sel.value;
        sel.innerHTML = opcionesColorHtml(actual);
    });
}

function renumerarBloques() {
    const bloques = document.querySelectorAll("#colorways-builder .bloque-color");
    bloques.forEach((b, i) => {
        b.querySelector(".bc-num").textContent = i + 1;
        b.querySelector(".quitar-color").style.display = bloques.length > 1 ? "inline-block" : "none";
    });
}

const TALLES_DISPONIBLES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

// Agrega (o quita) la fila de precio/stock de un talle elegido, manteniendo el orden por talle
function alternarTalle(bloque, talla, activo) {
    const cont = bloque.querySelector(".talles");
    const existente = cont.querySelector(`.fila-talle[data-talla="${talla}"]`);

    if (!activo) { if (existente) existente.remove(); }
    else if (!existente) {
        const fila = document.createElement("div");
        fila.className = "fila-talle";
        fila.dataset.talla = talla;
        fila.innerHTML = `
            <span class="t-etiqueta">Talle ${talla}</span>
            <input type="number" class="t-precio" placeholder="Precio" step="0.01" min="0" value="${bloque.querySelector(".m-precio").value}">
            <input type="number" class="t-stock" placeholder="Stock" min="0" value="${bloque.querySelector(".m-stock").value}">
        `;
        // Insertar en orden
        const siguiente = [...cont.querySelectorAll(".fila-talle")].find(f => Number(f.dataset.talla) > talla);
        cont.insertBefore(fila, siguiente || null);
    }

    bloque.querySelector(".cabecera-talles").style.display = cont.children.length ? "grid" : "none";
    bloque.querySelector(".masivo").style.display = cont.children.length ? "flex" : "none";
    const n = cont.children.length;
    bloque.querySelector(".resumen-talles").textContent = n ? `${n} talle(s) seleccionado(s)` : "Todavía no elegiste ningún talle";
}

function agregarBloqueColor() {
    const cont = document.getElementById("colorways-builder");
    const bloque = document.createElement("div");
    bloque.className = "bloque-color";
    bloque.innerHTML = `
        <div class="bloque-head">
            <strong>Color <span class="bc-num"></span></strong>
            <button type="button" class="btn chico secundario quitar-color">Quitar este color</button>
        </div>
        <div class="campo">
            <label>Color</label>
            <select class="bc-color">${opcionesColorHtml("")}</select>
        </div>
        <div class="campo">
            <label>Talles (tocá los que quieras, podés elegir varios)</label>
            <div class="chips-talles">
                ${TALLES_DISPONIBLES.map(t => `<button type="button" class="chip-talle" data-talla="${t}">${t}</button>`).join("")}
            </div>
            <div class="acciones-chips">
                <button type="button" class="btn chico secundario sel-todos">Seleccionar todos</button>
                <button type="button" class="btn chico secundario sel-ninguno">Limpiar</button>
                <span class="resumen-talles">Todavía no elegiste ningún talle</span>
            </div>
            <div class="masivo" style="display:none;">
                <span>Para todos los elegidos:</span>
                <input type="number" class="m-precio" placeholder="Precio" step="0.01" min="0">
                <input type="number" class="m-stock" placeholder="Stock" min="0">
                <button type="button" class="btn chico secundario aplicar-masivo">Aplicar a todos</button>
            </div>
            <div class="cabecera-talles" style="display:none;"><span>Talle</span><span>Precio</span><span>Stock</span></div>
            <div class="talles"></div>
        </div>
        <div class="campo">
            <label>Fotos (la primera es la principal)</label>
            <input type="file" class="bc-fotos" accept="image/*" multiple>
            <div class="previews"></div>
        </div>
    `;

    bloque.querySelectorAll(".chip-talle").forEach(chip => {
        chip.addEventListener("click", () => {
            const activo = !chip.classList.contains("activo");
            chip.classList.toggle("activo", activo);
            alternarTalle(bloque, Number(chip.dataset.talla), activo);
        });
    });
    bloque.querySelector(".sel-todos").addEventListener("click", () => {
        bloque.querySelectorAll(".chip-talle").forEach(chip => {
            chip.classList.add("activo");
            alternarTalle(bloque, Number(chip.dataset.talla), true);
        });
    });
    bloque.querySelector(".sel-ninguno").addEventListener("click", () => {
        bloque.querySelectorAll(".chip-talle").forEach(chip => {
            chip.classList.remove("activo");
            alternarTalle(bloque, Number(chip.dataset.talla), false);
        });
    });
    bloque.querySelector(".aplicar-masivo").addEventListener("click", () => {
        const precio = bloque.querySelector(".m-precio").value;
        const stock = bloque.querySelector(".m-stock").value;
        bloque.querySelectorAll(".fila-talle").forEach(f => {
            if (precio !== "") f.querySelector(".t-precio").value = precio;
            if (stock !== "") f.querySelector(".t-stock").value = stock;
        });
    });
    bloque.querySelector(".quitar-color").addEventListener("click", () => { bloque.remove(); renumerarBloques(); });
    bloque.querySelector(".bc-fotos").addEventListener("change", (e) => {
        const prev = bloque.querySelector(".previews");
        prev.innerHTML = [...e.target.files].map((f, i) =>
            `<div class="preview"><img src="${URL.createObjectURL(f)}" alt=""><span>${i === 0 ? "Principal" : i + 1}</span></div>`
        ).join("");
    });

    cont.appendChild(bloque);
    renumerarBloques();
}

// Lee y valida lo que cargó el admin. Devuelve { colorways } o lanza Error con el motivo.
function leerColorways() {
    const bloques = [...document.querySelectorAll("#colorways-builder .bloque-color")];
    if (bloques.length === 0) throw new Error("Agregá al menos un color.");

    const usados = new Set();
    return bloques.map((b, i) => {
        const n = i + 1;
        const colorId = Number(b.querySelector(".bc-color").value);
        if (!colorId) throw new Error(`Color ${n}: elegí un color.`);
        if (usados.has(colorId)) throw new Error(`Color ${n}: ese color ya está en otro bloque.`);
        usados.add(colorId);

        const variantes = [...b.querySelectorAll(".fila-talle")].map(f => {
            const talla = Number(f.dataset.talla);
            const precio = f.querySelector(".t-precio").value;
            const stock = f.querySelector(".t-stock").value;
            if (precio === "" || stock === "") throw new Error(`Color ${n}: completá precio y stock del talle ${talla}.`);
            if (Number(precio) < 0 || Number(stock) < 0) throw new Error(`Color ${n}: el precio y el stock no pueden ser negativos.`);
            return { talla, precio: Number(precio), stock: Number(stock) };
        });
        if (variantes.length === 0) throw new Error(`Color ${n}: elegí al menos un talle.`);

        return { colorId, variantes, fotos: [...b.querySelector(".bc-fotos").files] };
    });
}

function wireFormZapatilla() {
    agregarBloqueColor();
    document.getElementById("btn-agregar-color").addEventListener("click", agregarBloqueColor);

    document.getElementById("form-zapatilla").addEventListener("submit", async (e) => {
        e.preventDefault();

        const marcaId = Number(document.getElementById("zapatilla-marca").value);
        const nombre = document.getElementById("zapatilla-nombre").value.trim();
        const descripcion = document.getElementById("zapatilla-descripcion").value.trim();
        if (!marcaId) { mostrarMensaje("msg-zapatilla", "Elegí una marca.", "error"); return; }

        let colorways;
        try { colorways = leerColorways(); }
        catch (err) { mostrarMensaje("msg-zapatilla", err.message, "error"); return; }

        const boton = document.getElementById("btn-crear-zapatilla");
        const lista = document.getElementById("progreso-zapatilla");
        lista.innerHTML = "";
        const paso = (texto) => {
            const li = document.createElement("li");
            li.textContent = texto;
            lista.appendChild(li);
        };
        const jsonPost = (path, datos) => api(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
        });

        boton.disabled = true;
        mostrarMensaje("msg-zapatilla", "Creando… no cierres esta página.", "exito");

        let zapatillaId = null;
        try {
            const zapatilla = await jsonPost("/api/Admin/zapatillas", { marcaId, nombre, descripcion });
            zapatillaId = zapatilla.id;
            paso(`✔ Zapatilla creada (#${zapatillaId})`);

            for (const cw of colorways) {
                const nombreColor = COLORES.find(c => c.id === cw.colorId)?.nombre ?? `color ${cw.colorId}`;

                const colorway = await jsonPost("/api/Admin/colorways", { zapatillaId, colorId: cw.colorId });
                paso(`✔ Color ${nombreColor} agregado`);

                for (const v of cw.variantes) {
                    await jsonPost("/api/Admin/variantes", { zapatillaColorId: colorway.id, ...v });
                }
                paso(`✔ ${cw.variantes.length} talle(s) cargados en ${nombreColor}`);

                for (let i = 0; i < cw.fotos.length; i++) {
                    const fd = new FormData();
                    fd.append("Archivo", cw.fotos[i]);
                    fd.append("Orden", i + 1);
                    fd.append("Es_Principal", i === 0);
                    fd.append("ZapatillaColorId", colorway.id);
                    await api("/api/Admin/subir-imagen", { method: "POST", body: fd });
                }
                if (cw.fotos.length) paso(`✔ ${cw.fotos.length} foto(s) subidas en ${nombreColor}`);
            }

            mostrarMensaje("msg-zapatilla", `¡Listo! "${nombre}" se creó completa con ${colorways.length} color(es).`, "exito");
            e.target.reset();
            document.getElementById("colorways-builder").innerHTML = "";
            agregarBloqueColor();
            detalleCache = {};
            cargarZapatillas();
            cargarInventario();
        } catch (err) {
            // Si algo falló a mitad de camino, borramos lo que quedó a medias para no dejar una zapatilla rota
            let extra = "";
            if (zapatillaId) {
                try {
                    await api(`/api/Admin/zapatillas/${zapatillaId}`, { method: "DELETE" });
                    extra = " Se deshizo lo que se había creado; podés corregir y volver a intentar.";
                } catch {
                    extra = ` Quedó una zapatilla incompleta (#${zapatillaId}); eliminala desde la pestaña Eliminar.`;
                }
            }
            mostrarMensaje("msg-zapatilla", "Error: " + err.message + extra, "error");
            cargarZapatillas();
        } finally {
            boton.disabled = false;
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
    document.getElementById("btn-refrescar-stock").addEventListener("click", cargarInventario);
    cargarInventario();
}

// Texto plano "Marca - Nombre" de la zapatilla de una variante (sirve para ordenar)
function textoZapatilla(v) {
    const z = v.zapatillaColor?.zapatilla;
    if (!z) return "";
    return (z.marca?.nombre ? z.marca.nombre + " - " : "") + z.nombre;
}

// Lo mismo, escapado para meterlo en el HTML
function nombreZapatilla(v) {
    return esc(textoZapatilla(v)) || "-";
}

// Orden: por zapatilla, después color, después talle
function ordenarVariantes(lista) {
    return [...lista].sort((a, b) =>
        textoZapatilla(a).localeCompare(textoZapatilla(b), "es") ||
        (a.zapatillaColor?.color?.nombre ?? "").localeCompare(b.zapatillaColor?.color?.nombre ?? "", "es") ||
        a.talla - b.talla
    );
}

// Carga las dos tablas por separado: si una falla, la otra sigue funcionando
async function cargarInventario() {
    await Promise.all([
        cargarTablaInventario("/api/Inventario/stock-bajo", "tabla-stock-bajo", "No hay variantes con stock bajo. 🎉"),
        cargarTablaInventario("/api/Inventario/todas", "tabla-stock-todo", "Todavía no hay variantes cargadas."),
    ]);
}

async function cargarTablaInventario(ruta, tbodyId, mensajeVacio) {
    try {
        const variantes = await api(ruta);
        renderTablaInventario(tbodyId, variantes, mensajeVacio);
    } catch (e) {
        console.error("Error cargando " + ruta + ":", e);
        document.getElementById(tbodyId).innerHTML =
            `<tr><td colspan="6">No se pudo cargar esta lista.</td></tr>`;
    }
}

function renderTablaInventario(tbodyId, variantes, mensajeVacio) {
    const tbody = document.getElementById(tbodyId);

    tbody.innerHTML = ordenarVariantes(variantes).map(v => `
        <tr data-id="${v.id}">
            <td>${v.id}</td>
            <td>${nombreZapatilla(v)}</td>
            <td>${esc(v.zapatillaColor?.color?.nombre ?? "-")}</td>
            <td>${v.talla}</td>
            <td class="${v.stock < 5 ? "stock-bajo" : ""}">${v.stock}</td>
            <td>
                <input type="number" style="width:70px;display:inline-block;" value="${v.stock}" class="input-nuevo-stock">
                <button class="btn chico secundario" type="button">Guardar</button>
            </td>
        </tr>
    `).join("") || `<tr><td colspan="6">${mensajeVacio}</td></tr>`;

    tbody.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", async () => {
            const fila = btn.closest("tr");
            const id = fila.dataset.id;
            const nuevoStock = fila.querySelector(".input-nuevo-stock").value;
            try {
                await api(`/api/Inventario/stock/${id}?nuevoStock=${nuevoStock}`, { method: "PUT" });
                cargarInventario(); // refresca las dos tablas
            } catch (err) {
                alert("Error actualizando stock: " + err.message);
            }
        });
    });
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