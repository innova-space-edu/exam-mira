(async function() {
  // Carga GoTrue JS
  await loadScript("https://cdn.jsdelivr.net/npm/gotrue-js@1/dist/gotrue.min.js");
  const auth = new window.GoTrue({
    APIUrl: `${window.location.origin}/.netlify/identity`,
    audience: "",
    setCookie: true
  });

  const form = document.getElementById('signupForm');
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const errEl  = document.getElementById('signupError');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = "";

    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value.trim();

    // Comprueba dominio
    if (!email.endsWith('@colprovidencia.cl')) {
      errEl.textContent = "Solo se permiten correos @colprovidencia.cl";
      return;
    }

    try {
      await auth.signup(email, password);
      alert("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
      window.location.href = '/login.html';
    } catch (err) {
      errEl.textContent = "Error al crear la cuenta: " + (err?.message || err);
    }
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  }
})();
