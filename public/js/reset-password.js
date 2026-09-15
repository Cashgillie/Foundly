import { updateMyPassword } from './auth.js';
import { showSuccessOverlay } from './success-animation.js';

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('formError');
  const successEl = document.getElementById('formSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('submitBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  try {
    await updateMyPassword(password);
    await showSuccessOverlay('Password updated!');
    successEl.textContent = 'Password updated! Redirecting you to log in...';
    successEl.classList.add('show');
    setTimeout(() => { window.location.href = 'login.html'; }, 600);
  } catch (err) {
    errorEl.textContent = err.message || 'Could not update your password. The reset link may have expired — request a new one.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});
