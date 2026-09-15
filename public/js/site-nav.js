/* ============================================================
   FOUNDLY — Shared site navigation / auth-state script
   ------------------------------------------------------------
   Every public page includes the same two nav blocks:

     <div id="navAuthLoggedOut"> ... Login / Register links ... </div>
     <div id="navAuthLoggedIn" style="display:none"> ... My Reports / Profile / Logout ... </div>

   This module shows/hides them based on the current session, kicks
   out suspended accounts, and wires up the Logout button.
   ============================================================ */

import { onAuthChanged, logoutUser, getCurrentUser } from "./auth.js";
import { supabase } from "./supabase-init.js";

export async function initSiteNav({ requireAuth = false } = {}) {
  return new Promise((resolve) => {
    onAuthChanged(async (user) => {
      if (user) {
        // Enforce suspension even on an already-open session — if an
        // admin suspends someone mid-session, the next page load signs
        // them out instead of silently letting them keep going.
        try {
          const { data: suspended } = await supabase.rpc('am_i_suspended');
          if (suspended) {
            await logoutUser();
            window.location.href = 'login.html?suspended=1';
            return;
          }
        } catch (_) { /* non-fatal — RLS/network hiccup, don't block the page */ }
      }

      if (!user && requireAuth) {
        const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
        window.location.href = `login.html?next=${next}`;
        return;
      }

      const loggedOutEl = document.getElementById('navAuthLoggedOut');
      const loggedInEl = document.getElementById('navAuthLoggedIn');
      if (loggedOutEl) loggedOutEl.style.display = user ? 'none' : '';
      if (loggedInEl) loggedInEl.style.display = user ? '' : 'none';

      const nameEl = document.getElementById('navUserEmail');
      if (nameEl && user) nameEl.textContent = user.email;

      const logoutBtn = document.getElementById('navLogoutBtn');
      if (logoutBtn && !logoutBtn._wired) {
        logoutBtn._wired = true;
        logoutBtn.addEventListener('click', async () => {
          await logoutUser();
          window.location.href = 'index.html';
        });
      }

      resolve(user);
    });
  });
}

// Convenience export for pages that just need "am I logged in" once,
// without the full nav wiring (e.g. deciding whether to show a
// bookmark button).
export { getCurrentUser };
