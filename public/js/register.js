// import { registerUser } from './auth.js';
// import { showSuccessOverlay } from './success-animation.js';

// const params = new URLSearchParams(location.search);
// const next = params.get('next') || 'index.html';

// document.getElementById('registerForm').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const errorEl = document.getElementById('registerError');
//   const successEl = document.getElementById('registerSuccess');
//   errorEl.classList.remove('show');
//   successEl.classList.remove('show');

//   const fullName = document.getElementById('fullName').value.trim();
//   const email = document.getElementById('email').value.trim();
//   const phone = document.getElementById('phone').value.trim();
//   const password = document.getElementById('password').value;
//   const confirmPassword = document.getElementById('confirmPassword').value;

//   if (password !== confirmPassword) {
//     errorEl.textContent = 'Passwords do not match.';
//     errorEl.classList.add('show');
//     return;
//   }

//   const btn = document.getElementById('registerBtn');
//   const original = btn.innerHTML;
//   btn.disabled = true;
//   btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

//   try {
//     const data = await registerUser({ email, password, fullName, phone });
//     if (data.session) {
//       // Email confirmation is off — the user is signed in immediately.
//       await showSuccessOverlay('Account created!');
//       window.location.href = `how-it-works.html?next=${encodeURIComponent(next)}`;
//     } else {
//       successEl.textContent = 'Account created! Check your email to confirm it, then log in.';
//       successEl.classList.add('show');
//       document.getElementById('registerForm').reset();
//     }
//   } catch (err) {
//     errorEl.textContent = err.message || 'Could not create your account. Please try again.';
//     errorEl.classList.add('show');
//   } finally {
//     btn.disabled = false;
//     btn.innerHTML = original;
//   }
// });


import { registerUser } from './auth.js';
import { showSuccessOverlay } from './success-animation.js';

const params = new URLSearchParams(location.search);
const next = params.get('next') || 'index.html';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('registerBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

  try {
    const data = await registerUser({ email, password, fullName, phone });
    const welcomeMessage = fullName ? `Welcome, ${fullName}!` : 'Welcome to Foundly!';

    if (data.session) {
      // Email confirmation is off — the user is signed in immediately.
      await showSuccessOverlay(welcomeMessage);
      window.location.href = `how-it-works.html?next=${encodeURIComponent(next)}`;
    } else {
      // Email confirmation is required before they can log in.
      await showSuccessOverlay(welcomeMessage);
      successEl.textContent = 'Account created! Check your email to confirm it, then log in.';
      successEl.classList.add('show');
      document.getElementById('registerForm').reset();
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Could not create your account. Please try again.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});