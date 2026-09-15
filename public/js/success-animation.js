/* ============================================================
   FOUNDLY — Success animation overlay
   ------------------------------------------------------------
   A small animated checkmark + message shown briefly after a
   positive action (account created, logged in, password updated,
   item reported...). Keeps otherwise-plain form flows feeling alive.
   ============================================================ */

let overlayEl = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.className = 'success-overlay';
  overlayEl.innerHTML = `
    <div class="success-overlay-card">
      <svg class="success-checkmark" viewBox="0 0 80 80">
        <circle class="check-circle" cx="40" cy="40" r="34"></circle>
        <path class="check-mark" d="M24 41 L35 52 L57 29"></path>
      </svg>
      <p id="successOverlayMessage"></p>
    </div>`;
  document.body.appendChild(overlayEl);
  return overlayEl;
}

/**
 * Shows the success overlay for `duration` ms, then resolves.
 * Usage: await showSuccessOverlay('Welcome back!');
 */
export function showSuccessOverlay(message, duration = 1300) {
  const el = ensureOverlay();
  el.querySelector('#successOverlayMessage').textContent = message;

  // Restart the SVG stroke animations each time it's shown.
  el.querySelectorAll('.check-circle, .check-mark').forEach(node => {
    node.style.animation = 'none';
    // eslint-disable-next-line no-unused-expressions
    node.offsetHeight; // force reflow
    node.style.animation = '';
  });

  el.classList.add('show');
  return new Promise(resolve => {
    setTimeout(() => {
      el.classList.remove('show');
      resolve();
    }, duration);
  });
}
