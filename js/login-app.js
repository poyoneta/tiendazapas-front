const SUPABASE_URL = "https://jkuyzcpupjaitbvfroxc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXl6Y3B1cGphaXRidmZyb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzUwMDEsImV4cCI6MjEwMjA1MTAwMX0.L5hMt-CE4dzaEe_GbYpo1OGPTGLQvFkCidb1S8yZRvo";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const form = document.getElementById("form-auth");
const mensaje = document.getElementById("mensaje");
const titulo = document.getElementById("titulo");
const botonSubmit = document.getElementById("boton-submit");
const tarjeta = document.getElementById("tarjeta-auth");
const campoNombre = document.getElementById("campo-nombre");
const inputNombre = document.getElementById("nombre");
const textoCambio = document.getElementById("texto-cambio");
const textoCambioPregunta = document.getElementById("texto-cambio-pregunta");
const linkCambio = document.getElementById("link-cambio");
const botonGoogle = document.getElementById("boton-google");

let modoRegistro = false; // false = login, true = registro

// Dispara la animación de "cambio notorio" (pulso + entrada suave) sin
// acumular listeners ni recrear elementos del DOM.
function animarCambioDeModo() {
  const elementos = [tarjeta, titulo, textoCambio, botonSubmit];
  elementos.forEach((el) => el.classList.remove("destacar"));
  // Forzar reflow para poder re-disparar la animación si se hace click rápido
  void tarjeta.offsetWidth;
  elementos.forEach((el) => el.classList.add("destacar"));
}

// Cambiar entre modo Login y modo Registro
linkCambio.addEventListener("click", (e) => {
  e.preventDefault();
  modoRegistro = !modoRegistro;

  if (modoRegistro) {
    titulo.textContent = "Crear Cuenta";
    botonSubmit.textContent = "Registrarme";
    textoCambioPregunta.textContent = "¿Ya tenés cuenta?";
    linkCambio.textContent = "Iniciar sesión";
    campoNombre.classList.remove("oculto");
    inputNombre.required = true;
    tarjeta.classList.add("modo-registro");
  } else {
    titulo.textContent = "Iniciar Sesión";
    botonSubmit.textContent = "Ingresar";
    textoCambioPregunta.textContent = "¿No tenés cuenta?";
    linkCambio.textContent = "Registrate";
    campoNombre.classList.add("oculto");
    inputNombre.required = false;
    inputNombre.value = "";
    tarjeta.classList.remove("modo-registro");
  }

  mostrarMensaje("", null);
  animarCambioDeModo();
});

// Muestra un mensaje de éxito o error usando clases (en vez de estilos inline)
function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.classList.remove("exito", "error");
  if (tipo) mensaje.classList.add(tipo);
}

// Enviar el formulario (login o registro según el modo)
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // El form tiene novalidate, así que validamos acá antes de llamar a Supabase
  if (!email || !password) {
    mostrarMensaje("Completá tu email y tu contraseña.", "error");
    return;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    mostrarMensaje("Ingresá un email válido.", "error");
    return;
  }

  if (modoRegistro) {
    const nombre = inputNombre.value.trim();

    if (!nombre) {
      mostrarMensaje("Completá tu nombre.", "error");
      return;
    }

    if (password.length < 6) {
      mostrarMensaje("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nombre },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        mostrarMensaje("Ese email ya tiene una cuenta. Iniciá sesión en su lugar.", "error");
      } else {
        mostrarMensaje("Error: " + error.message, "error");
      }
      return;
    }

    // Por seguridad (evitar que se pueda "adivinar" qué emails existen),
    // Supabase no siempre devuelve error si el email ya está registrado:
    // en su lugar responde éxito pero con un user.identities vacío.
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      mostrarMensaje("Ese email ya tiene una cuenta. Iniciá sesión en su lugar.", "error");
      return;
    }

    mostrarMensaje("¡Cuenta creada! Revisá tu email para confirmarla o iniciá sesión.", "exito");
  } else {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      mostrarMensaje("Error: " + error.message, "error");
      return;
    }

    mostrarMensaje("¡Bienvenido!", "exito");
    console.log("Sesión iniciada:", data);

    // Pequeña pausa para que se alcance a ver el mensaje antes de redirigir
    setTimeout(() => {
      window.location.href = "index.html";
    }, 900);
  }
});

// Login con Google
botonGoogle.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
  });

  if (error) {
    mostrarMensaje("Error: " + error.message, "error");
  }
});