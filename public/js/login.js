import { loginUser } from './auth.js';
import { showSuccessOverlay } from './success-animation.js';

const params = new URLSearchParams(location.search);
const next = params.get('next') || 'index.html';

const errorEl = document.getElementById('loginError');
if (params.get('suspended') === '1') {
  errorEl.textContent = 'Your account was signed out because it has been suspended. Contact the Foundly office for help.';
  errorEl.classList.add('show');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.remove('show');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const btn = document.getElementById('loginBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    await loginUser(email, password);
    await showSuccessOverlay('Welcome back!');
    window.location.href = `how-it-works.html?next=${encodeURIComponent(next)}`;
  } catch (err) {
    errorEl.textContent = err.message || 'Could not log in. Check your email and password.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});
