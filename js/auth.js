// ===== SESIÓN DE USUARIO (header de index.html / producto.html / checkout.html) =====
// Usa el mismo proyecto de Supabase que login.html / login-app.js.
const AUTH_SUPABASE_URL = "https://jkuyzcpupjaitbvfroxc.supabase.co";
const AUTH_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXl6Y3B1cGphaXRidmZyb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzUwMDEsImV4cCI6MjEwMjA1MTAwMX0.L5hMt-CE4dzaEe_GbYpo1OGPTGLQvFkCidb1S8yZRvo";

const { createClient } = supabase;
const authClient = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY);

// Muestra el bloque de "Iniciar sesión" o el de usuario logueado
function actualizarUISesion(session) {
    const loginLink = document.getElementById("login-link");
    const userInfo = document.getElementById("user-info");
    const userName = document.getElementById("user-name");

    // Si el header de esta página no tiene estos elementos, no hacemos nada
    if (!loginLink || !userInfo || !userName) return;

    if (session && session.user) {
        const nombre = session.user.user_metadata?.full_name || session.user.email;
        userName.textContent = nombre;
        loginLink.style.display = "none";
        userInfo.style.display = "flex";
    } else {
        loginLink.style.display = "inline-flex";
        userInfo.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // Estado inicial al cargar la página
    const { data: { session } } = await authClient.auth.getSession();
    actualizarUISesion(session);

    // Botón de cerrar sesión
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await authClient.auth.signOut();
            actualizarUISesion(null);
        });
    }

    // Antes de ir a login.html, guardamos en qué página estaba el usuario
    // (ruta + query string) para poder devolverlo ahí después de loguearse.
    const loginLink = document.getElementById("login-link");
    if (loginLink) {
        loginLink.addEventListener("click", () => {
            const paginaActual = window.location.pathname + window.location.search;
            sessionStorage.setItem("paginaAntesDeLogin", paginaActual);
        });
    }
});

// Reacciona automáticamente si el usuario inicia/cierra sesión en otra pestaña,
// o justo después de loguearse (sin necesidad de recargar la página)
authClient.auth.onAuthStateChange((_event, session) => {
    actualizarUISesion(session);
});