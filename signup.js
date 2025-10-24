(async function() {
  // Carga GoTrue JS
  await loadScript("https://cdn.jsdelivr.net/npm/gotrue-js@1/dist/gotrue.min.js");

  const auth = new window.GoTrue({
    APIUrl: `${window.location.origin}/.netlify/identity`,
    audience: "",
    setCookie: true
  });

  const form   = document.getElementById('signupForm');
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const errEl   = document.getElementById('signupError');
  const btn     = document.getElementById('signupBtn');

  // Evita doble envío
  let busy = false;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;

    errEl.textContent = "";

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    // Comprueba dominio
    if (!email.endsWith('@colprovidencia.cl')) {
      errEl.textContent = "Solo se permiten correos @colprovidencia.cl";
      return;
    }

    // Reglas mínimas de contraseña (puedes ajustarlas)
    if (password.length < 6) {
      errEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }

    // Bloquea UI
    setBusy(true);

    try {
      // Registro (envía correo de confirmación)
      await auth.signup(email, password);

      alert("✅ Registro exitoso. Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
      window.location.href = '/login.html';
    } catch (err) {
      // Mensajes más claros si el usuario ya existe o falta confirmación
      const msg = (err?.json?.error_description || err?.message || String(err)).toLowerCase();

      if (msg.includes('user already exists')) {
        errEl.textContent = "Este correo ya está registrado. Revisa tu correo para confirmar la cuenta o intenta iniciar sesión.";
      } else if (msg.includes('confirmation') || msg.includes('confirm')) {
        errEl.textContent = "Cuenta creada. Por favor, confirma el correo antes de iniciar sesión.";
      } else {
        errEl.textContent = "Error al crear la cuenta: " + (err?.message || String(err));
      }
    } finally {
      setBusy(false);
    }
  });

  function setBusy(state) {
    busy = state;
    if (btn) {
      btn.disabled = state;
      btn.textContent = state ? "Creando..." : "Crear cuenta";
    }
    emailEl.disabled = state;
    passEl.disabled  = state;
  }

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
