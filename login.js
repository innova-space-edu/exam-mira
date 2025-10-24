/*
 * Login logic for Innova Space Education 2025 platform.
 *
 * This script handles the authentication flow on login.html. For the purposes
 * of this demo, credentials are hardcoded. In a real application you would
 * replace this with a secure authentication mechanism (e.g. OAuth or your
 * own backend). Successful login stores a flag in sessionStorage and
 * redirects the user to the teacher dashboard where exams can be created.
 *
 * ACTUALIZACIÓN: se integra Netlify Identity (GoTrue). Si Identity está activo
 * en el sitio, se usará autenticación real con email/contraseña. Si no está
 * activo, se mantiene el fallback de demo (credenciales hardcodeadas).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const errorElem = document.getElementById('loginError');
  if (!loginForm) return;

  // Carga GoTrue (cliente de Netlify Identity)
  await loadScript("https://cdn.jsdelivr.net/npm/gotrue-js@1/dist/gotrue.min.js");

  // Inicializa cliente contra tu sitio Netlify
  const auth = new window.GoTrue({
    APIUrl: `${window.location.origin}/.netlify/identity`,
    audience: "",
    setCookie: true
  });

  // Si ya hay sesión, entra directo al panel
  try {
    if (auth.currentUser()) {
      window.location.href = "/teacher.html";
      return;
    }
  } catch (_) {}

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorElem.textContent = "";

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // ===========
    //  PRIMERO: intentar login real con Netlify Identity (GoTrue)
    // ===========
    try {
      // Si Identity está activo y el usuario existe, esto funcionará:
      await auth.login(email, password, true); // remember = true
      // Opcional: sessionStorage flag para compatibilidad con tu comentario original
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = '/teacher.html';
      return;
    } catch (e1) {
      // Si falla Identity, pasamos al fallback de demo (manteniendo tu lógica)
    }

    // ===========
    //  FALLBACK DEMO (tu código original con hardcode)
    // ===========
    const validEmail = 'docente@example.com';
    const validPassword = 'clave123';

    if (email === validEmail && password === validPassword) {
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = 'teacher.html';
    } else {
      errorElem.textContent = 'Credenciales inválidas. Intente nuevamente.';
    }
  });

  // util para cargar script externo
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  }
});
