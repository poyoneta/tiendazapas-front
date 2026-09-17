// Credenciales de Supabase
const AUTH_SUPABASE_URL = "https://jkuyzcpupjaitbvfroxc.supabase.co";
const AUTH_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXl6Y3B1cGphaXRidmZyb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzUwMDEsImV4cCI6MjEwMjA1MTAwMX0.L5hMt-CE4dzaEe_GbYpo1OGPTGLQvFkCidb1S8yZRvo";

// Inicialización del cliente de Supabase
const supabaseClient = window.supabase.createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loading-screen');
    const adminDashboard = document.getElementById('admin-dashboard');

    try {
        // 1. Verificar si hay sesión activa
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            alert('Debes iniciar sesión primero.');
            window.location.href = 'login.html';
            return;
        }

        // 2. Consultar el rol en la tabla profiles
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Error de consulta en profiles:', profileError);
            alert('Error al verificar tu perfil: ' + profileError.message);
            return;
        }

        if (!profile || profile.role !== 'admin') {
            alert('Acceso denegado: Tu usuario no tiene rol de administrador.');
            window.location.href = 'index.html';
            return;
        }

        // 3. Si es admin, mostrar el panel
        loadingScreen.style.display = 'none';
        adminDashboard.style.display = 'block';

        // Cargar los datos iniciales
        await loadMarcas();
        await loadZapatillas();

    } catch (err) {
        console.error('Error inesperado:', err);
        if (loadingScreen) {
            loadingScreen.innerHTML = `<h2 style="color: red;">Error: ${err.message || 'Revisá la consola para más detalles.'}</h2>`;
        }
    }

    // Listener para cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Listener para el formulario de guardar zapatilla
    const zapatillaForm = document.getElementById('zapatilla-form');
    if (zapatillaForm) {
        zapatillaForm.addEventListener('submit', handleSaveZapatilla);
    }

    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }
});

// Cargar opciones de marcas en el select
async function loadMarcas() {
    const { data: marcas, error } = await supabaseClient.from('Marcas').select('*');
    if (error) return console.error('Error al cargar marcas:', error);
    
    const select = document.getElementById('marca-select');
    if (!select || !marcas) return;
    
    select.innerHTML = '<option value="">Seleccionar Marca</option>';
    marcas.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
    });
}

// Cargar Lista de Zapatillas con sus Variantes
async function loadZapatillas() {
    const { data: zapatillas, error } = await supabaseClient
        .from('Zapatillas')
        .select(`
            id, nombre, precio, precio_oferta, descripcion, marca_id,
            Variantes ( id, talle, stock, Colores ( nombre ) )
        `);

    if (error) {
        console.error('Error al cargar zapatillas:', error);
        return;
    }

    const tbody = document.getElementById('zapatillas-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    zapatillas?.forEach(zap => {
        const variantesHTML = zap.Variantes?.map(v => 
            `<li>Talle ${v.talle} - ${v.Colores?.nombre || 'S/C'} (Stock: ${v.stock}) 
                <button onclick="deleteVariante('${v.id}')" style="color:red; border:none; background:none; cursor:pointer;">✕</button>
            </li>`
        ).join('') || 'Sin variantes';

        tbody.innerHTML += `
            <tr>
                <td>${zap.id}</td>
                <td><strong>${zap.nombre}</strong></td>
                <td>$${zap.precio}</td>
                <td>${zap.precio_oferta ? `$${zap.precio_oferta}` : '-'}</td>
                <td>
                    <ul style="margin:0; padding-left:15px;">${variantesHTML}</ul>
                    <button onclick="addVarianteModal('${zap.id}')" style="margin-top:5px; font-size:12px;">+ Agregar Variante</button>
                </td>
                <td>
                    <button onclick="editZapatilla('${zap.id}', '${zap.nombre}', ${zap.precio}, ${zap.precio_oferta || 'null'}, '${zap.marca_id}')">Editar</button>
                    <button onclick="deleteZapatilla('${zap.id}')" style="color:red;">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

// Crear o Editar Zapatilla
async function handleSaveZapatilla(e) {
    e.preventDefault();

    const id = document.getElementById('zapatilla-id').value;
    const nombre = document.getElementById('nombre').value;
    const precio = parseFloat(document.getElementById('precio').value);
    const precio_oferta = document.getElementById('precio-oferta').value ? parseFloat(document.getElementById('precio-oferta').value) : null;
    const marca_id = document.getElementById('marca-select').value;
    const descripcion = document.getElementById('descripcion').value;

    const payload = { nombre, precio, precio_oferta, marca_id, descripcion };

    if (id) {
        await supabaseClient.from('Zapatillas').update(payload).eq('id', id);
    } else {
        await supabaseClient.from('Zapatillas').insert([payload]);
    }

    resetForm();
    await loadZapatillas();
}

// Cargar datos en el formulario para editar
function editZapatilla(id, nombre, precio, precioOferta, marcaId) {
    document.getElementById('zapatilla-id').value = id;
    document.getElementById('nombre').value = nombre;
    document.getElementById('precio').value = precio;
    document.getElementById('precio-oferta').value = precioOferta !== null ? precioOferta : '';
    document.getElementById('marca-select').value = marcaId;
    
    document.getElementById('form-title').innerText = 'Editar Zapatilla (Ajustar Precio / Oferta)';
    document.getElementById('save-btn').innerText = 'Actualizar Zapatilla';
    document.getElementById('cancel-btn').style.display = 'inline-block';
}

function resetForm() {
    const form = document.getElementById('zapatilla-form');
    if (form) form.reset();
    document.getElementById('zapatilla-id').value = '';
    document.getElementById('form-title').innerText = 'Agregar Nueva Zapatilla';
    document.getElementById('save-btn').innerText = 'Guardar Zapatilla';
    document.getElementById('cancel-btn').style.display = 'none';
}

// Eliminar Zapatilla
async function deleteZapatilla(id) {
    if (confirm('¿Eliminar esta zapatilla?')) {
        await supabaseClient.from('Zapatillas').delete().eq('id', id);
        await loadZapatillas();
    }
}

// Agregar Variante
async function addVarianteModal(zapatillaId) {
    const talle = prompt('Ingrese el Talle (ej: 40, 41, 42):');
    if (!talle) return;

    const stock = prompt('Ingrese la cantidad de Stock:', '1');

    if (talle && stock) {
        await supabaseClient.from('Variantes').insert([{
            zapatilla_id: zapatillaId,
            talle: talle,
            stock: parseInt(stock)
        }]);
        await loadZapatillas();
    }
}

// Eliminar Variante
async function deleteVariante(varianteId) {
    if (confirm('¿Eliminar esta variante?')) {
        await supabaseClient.from('Variantes').delete().eq('id', varianteId);
        await loadZapatillas();
    }
}