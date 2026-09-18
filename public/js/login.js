// import { loginUser } from './auth.js';
// import { showSuccessOverlay } from './success-animation.js';

// const params = new URLSearchParams(location.search);
// const next = params.get('next') || 'index.html';

// const errorEl = document.getElementById('loginError');
// if (params.get('suspended') === '1') {
//   errorEl.textContent = 'Your account was signed out because it has been suspended. Contact the Foundly office for help.';
//   errorEl.classList.add('show');
// }

// document.getElementById('loginForm').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   errorEl.classList.remove('show');

//   const email = document.getElementById('email').value.trim();
//   const password = document.getElementById('password').value;

//   const btn = document.getElementById('loginBtn');
//   const original = btn.innerHTML;
//   btn.disabled = true;
//   btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

//   try {
//     await loginUser(email, password);
//     await showSuccessOverlay('Welcome back!');
//     window.location.href = `how-it-works.html?next=${encodeURIComponent(next)}`;
//   } catch (err) {
//     errorEl.textContent = err.message || 'Could not log in. Check your email and password.';
//     errorEl.classList.add('show');
//   } finally {
//     btn.disabled = false;
//     btn.innerHTML = original;
//   }
// });


import { loginUser, getCurrentUser } from './auth.js';
import { showSuccessOverlay } from './success-animation.js';

const params = new URLSearchParams(location.search);
const next = params.get('next') || 'index.html';
const arrivedFromConfirmation = params.get('confirmed') === '1';

const errorEl = document.getElementById('loginError');
if (params.get('suspended') === '1') {
  errorEl.textContent = 'Your account was signed out because it has been suspended. Contact the Foundly office for help.';
  errorEl.classList.add('show');
}

// Supabase's "confirm your email" link redirects here with ?confirmed=1
// and, in the same URL, the access/refresh tokens the client needs —
// supabase-js parses those automatically on load and signs the person
// in. If that worked, skip the login form entirely and carry them
// straight into the app; if not (e.g. the link was opened in a
// different browser than the one they registered in), just show a
// friendly note above the form instead.
async function handleEmailConfirmedArrival() {
  if (!arrivedFromConfirmation) return;
  const user = await getCurrentUser();
  if (user) {
    await showSuccessOverlay('Email confirmed! Welcome to Foundly.');
    window.location.href = `how-it-works.html?next=${encodeURIComponent(next)}`;
  } else {
    document.getElementById('loginConfirmedNotice').classList.add('show');
  }
}
handleEmailConfirmedArrival();

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
    await showSuccessOverlay('Welcome back!',4000);
    window.location.href = next;  
  } catch (err) {
    errorEl.textContent = err.message || 'Could not log in. Check your email and password.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});