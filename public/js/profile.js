import { getMyProfile, updateMyProfile, updateMyPassword, logoutUser } from './auth.js';
import { initSiteNav } from './site-nav.js';
import { showSuccessOverlay } from './success-animation.js';

async function loadProfile() {
  const profile = await getMyProfile();
  if (!profile) return;
  document.getElementById('profileEmail').value = profile.email || '';
  document.getElementById('profileFullName').value = profile.full_name || '';
  document.getElementById('profilePhone').value = profile.phone || '';

  const initial = (profile.full_name || profile.email || '?').trim().charAt(0).toUpperCase();
  document.getElementById('profileAvatar').innerHTML = initial ? initial : '<i class="fas fa-user"></i>';
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('profileError');
  const successEl = document.getElementById('profileSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  const btn = document.getElementById('profileSaveBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    await updateMyProfile({
      fullName: document.getElementById('profileFullName').value,
      phone: document.getElementById('profilePhone').value
    });
    successEl.textContent = 'Profile updated!';
    successEl.classList.add('show');
    showSuccessOverlay('Profile updated!');
    await loadProfile();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not save your profile.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('passwordError');
  const successEl = document.getElementById('passwordSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  const password = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmNewPassword').value;
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('passwordSaveBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  try {
    await updateMyPassword(password);
    successEl.textContent = 'Password updated!';
    successEl.classList.add('show');
    showSuccessOverlay('Password updated!');
    document.getElementById('passwordForm').reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not update your password.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

document.getElementById('navLogoutBtn')?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'index.html';
});

document.addEventListener('DOMContentLoaded', async () => {
  await initSiteNav({ requireAuth: true });
  await loadProfile();
});
