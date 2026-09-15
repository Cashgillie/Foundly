// /* ============================================================
//    FOUNDLY — Auth layer (Supabase Authentication)
//    ------------------------------------------------------------
//    Every page that needs to know "who's logged in?" imports from
//    here. Keeping it in one file means the suspended-account check
//    and the admin check are both applied consistently everywhere.
//    ============================================================ */

// import { supabase } from "./supabase-init.js";

// // ─── REGISTER / LOGIN / LOGOUT ─────────────────────────────────
// export async function registerUser({ email, password, fullName, phone }) {
//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password,
//     options: { data: { full_name: fullName || null, phone: phone || null } }
//   });
//   if (error) throw error;
//   return data;
// }

// export async function loginUser(email, password) {
//   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//   if (error) throw error;

//   // Kick suspended accounts straight back out — don't let them keep a
//   // live session just because their password still works.
//   const { data: suspended } = await supabase.rpc('am_i_suspended');
//   if (suspended) {
//     await supabase.auth.signOut();
//     const err = new Error('Your account has been suspended. Please contact the Foundly office for help.');
//     err.suspended = true;
//     throw err;
//   }
//   return data;
// }

// export function logoutUser() {
//   return supabase.auth.signOut();
// }

// export function onAuthChanged(cb) {
//   supabase.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
//   const { data } = supabase.auth.onAuthStateChange((_event, session) => {
//     cb(session?.user ?? null);
//   });
//   return () => data.subscription.unsubscribe();
// }

// export async function getCurrentUser() {
//   const { data } = await supabase.auth.getUser();
//   return data.user ?? null;
// }

// // ─── PASSWORD RESET ─────────────────────────────────────────────
// export async function sendPasswordReset(email) {
//   const redirectTo = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}reset-password.html`;
//   const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
//   if (error) throw error;
//   return { success: true };
// }

// // Used on reset-password.html once the user arrives via the emailed
// // link (Supabase puts them into a temporary recovery session).
// export async function updateMyPassword(newPassword) {
//   const { error } = await supabase.auth.updateUser({ password: newPassword });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── PROFILE ─────────────────────────────────────────────────────
// export async function getMyProfile() {
//   const user = await getCurrentUser();
//   if (!user) return null;
//   const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
//   if (error) throw error;
//   return data;
// }

// export async function updateMyProfile({ fullName, phone }) {
//   const { error } = await supabase.rpc('update_my_profile', { p_full_name: fullName, p_phone: phone });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── ADMIN CHECK (unchanged behaviour from before) ─────────────
// export async function isCurrentUserAdmin(user) {
//   if (!user) return false;
//   const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
//   if (error) return false;
//   return !!data;
// }

// // ─── ROUTE GUARDS ────────────────────────────────────────────────
// // Call at the top of any page that requires a logged-in user. Redirects
// // to login.html (preserving where they were headed) if not signed in.
// export async function requireLogin() {
//   const user = await getCurrentUser();
//   if (!user) {
//     const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
//     window.location.href = `login.html?next=${next}`;
//     return null;
//   }
//   return user;
// }


/* ============================================================
   FOUNDLY — Auth layer (Supabase Authentication)
   ------------------------------------------------------------
   Every page that needs to know "who's logged in?" imports from
   here. Keeping it in one file means the suspended-account check
   and the admin check are both applied consistently everywhere.
   ============================================================ */

import { supabase } from "./supabase-init.js";

// ─── REGISTER / LOGIN / LOGOUT ─────────────────────────────────
export async function registerUser({ email, password, fullName, phone }) {
  // Tells Supabase exactly where the "confirm your email" link should
  // land — otherwise it falls back to whatever Site URL is set in the
  // dashboard (often a stale default), which is why that link can end
  // up at a blank/wrong localhost address. This URL must also be added
  // to Authentication → URL Configuration → Redirect URLs in the
  // Supabase dashboard, or Supabase will ignore it and fall back anyway.
  const emailRedirectTo = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}login.html?confirmed=1`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || null, phone: phone || null }, emailRedirectTo }
  });
  if (error) throw error;
  return data;
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Kick suspended accounts straight back out — don't let them keep a
  // live session just because their password still works.
  const { data: suspended } = await supabase.rpc('am_i_suspended');
  if (suspended) {
    await supabase.auth.signOut();
    const err = new Error('Your account has been suspended. Please contact the Foundly office for help.');
    err.suspended = true;
    throw err;
  }
  return data;
}

export function logoutUser() {
  return supabase.auth.signOut();
}

export function onAuthChanged(cb) {
  supabase.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// ─── PASSWORD RESET ─────────────────────────────────────────────
export async function sendPasswordReset(email) {
  const redirectTo = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}reset-password.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return { success: true };
}

// Used on reset-password.html once the user arrives via the emailed
// link (Supabase puts them into a temporary recovery session).
export async function updateMyPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return { success: true };
}

// ─── PROFILE ─────────────────────────────────────────────────────
export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile({ fullName, phone }) {
  const { error } = await supabase.rpc('update_my_profile', { p_full_name: fullName, p_phone: phone });
  if (error) throw error;
  return { success: true };
}

// ─── ADMIN CHECK (unchanged behaviour from before) ─────────────
export async function isCurrentUserAdmin(user) {
  if (!user) return false;
  const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) return false;
  return !!data;
}

// ─── ROUTE GUARDS ────────────────────────────────────────────────
// Call at the top of any page that requires a logged-in user. Redirects
// to login.html (preserving where they were headed) if not signed in.
export async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    window.location.href = `login.html?next=${next}`;
    return null;
  }
  return user;
}