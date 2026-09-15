import { sendPasswordReset } from './auth.js';
import { showSuccessOverlay } from './success-animation.js';

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('formError');
  const successEl = document.getElementById('formSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  const email = document.getElementById('email').value.trim();
  const btn = document.getElementById('submitBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    await sendPasswordReset(email);
    await showSuccessOverlay('Reset link sent!');
    successEl.textContent = "If that email has an account, we've sent a reset link. Check your inbox.";
    successEl.classList.add('show');
    document.getElementById('forgotForm').reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not send reset email. Please try again.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});
