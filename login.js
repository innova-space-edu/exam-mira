/*
 * Login logic for Innova Space Education 2025 platform.
 *
 * This script handles the authentication flow on login.html. For the purposes
 * of this demo, credentials are hardcoded. In a real application you would
 * replace this with a secure authentication mechanism (e.g. OAuth or your
 * own backend). Successful login stores a flag in sessionStorage and
 * redirects the user to the teacher dashboard where exams can be created.
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorElem = document.getElementById('loginError');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Demo credentials (replace with your own authentication logic)
    const validEmail = 'docente@example.com';
    const validPassword = 'clave123';

    if (email === validEmail && password === validPassword) {
      // Store session flag and redirect to exam creation
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = 'teacher.html';
    } else {
      errorElem.textContent = 'Credenciales inválidas. Intente nuevamente.';
    }
  });
});