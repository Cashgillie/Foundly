// /* ============================================================
//    FOUNDLY — Data layer (Supabase-backed)
//    ------------------------------------------------------------
//    Reads go through the RPC functions in
//    supabase/migrations/0003_accounts_and_workflow.sql so that the
//    `contact` column is never handed to anyone but the report's
//    owner or an admin. All writes go through SECURITY DEFINER
//    functions too — see that migration for the full picture.

//    Photos have been removed: every item is represented by a
//    category icon instead (see ICON_MAP below), so there is no
//    upload/storage code left in this file any more.
//    ============================================================ */

// import { supabase } from "./supabase-init.js";
// import {
//   EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY,
//   EMAILJS_TEMPLATE_ID, EMAILJS_LOST_REPORT_TEMPLATE_ID,
//   EMAILJS_IDENTIFY_TEMPLATE_ID, EMAILJS_FINDER_TEMPLATE_ID
// } from "./emailjs-config.js";

// // ─── CATEGORY ICONS ───────────────────────────────────────────
// const ICON_MAP = {
//   phones: 'mobile-alt', pets: 'paw', wallets: 'wallet', keys: 'key',
//   bags: 'bag-shopping', electronics: 'laptop', jewelry: 'gem',
//   id: 'id-card', other: 'question-circle'
// };
// export function getCategoryIcon(cat) { return ICON_MAP[cat] || 'tag'; }

// export const CATEGORIES = [
//   { value: 'electronics', label: 'Electronics' },
//   { value: 'id',          label: 'ID Cards' },
//   { value: 'bags',        label: 'Bags & Luggage' },
//   { value: 'keys',        label: 'Keys' },
//   { value: 'phones',      label: 'Phones' },
//   { value: 'wallets',     label: 'Wallets & Purses' },
//   { value: 'jewelry',     label: 'Jewelry' },
//   { value: 'pets',        label: 'Pets' },
//   { value: 'other',       label: 'Other' }
// ];

// // ─── PUBLIC READS (contact never included) ─────────────────────
// export async function listPublicReports({ type } = {}) {
//   const { data, error } = await supabase.rpc('list_public_reports', { p_type: type || null });
//   if (error) throw error;
//   return data || [];
// }

// export async function getPublicReport(id) {
//   const { data, error } = await supabase.rpc('get_public_report', { p_id: id });
//   if (error) throw error;
//   return Array.isArray(data) ? (data[0] || null) : data;
// }

// export function filterAndSort(items, { category, searchTerm, sort } = {}) {
//   let out = [...items];
//   if (category) out = out.filter(i => i.category === category);
//   if (searchTerm) {
//     const term = searchTerm.toLowerCase().trim();
//     out = out.filter(i =>
//       (i.title || '').toLowerCase().includes(term) ||
//       (i.description || '').toLowerCase().includes(term) ||
//       (i.location || '').toLowerCase().includes(term)
//     );
//   }
//   const ts = (i) => i.createdAt ? new Date(i.createdAt).getTime() : (i.created_at ? new Date(i.created_at).getTime() : 0);
//   if (sort === 'oldest') out.sort((a, b) => ts(a) - ts(b));
//   else if (sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title));
//   else if (sort === 'za') out.sort((a, b) => b.title.localeCompare(a.title));
//   else out.sort((a, b) => ts(b) - ts(a)); // newest first (default)
//   return out;
// }

// // The RPCs above return snake_case columns (created_at, etc) since
// // they're plain `returns table(...)` functions, not the aliased
// // select the old direct-table reads used. Normalize once here so the
// // rest of the app can keep using the original camelCase field names.
// export function normalizeReport(row) {
//   if (!row) return row;
//   return {
//     id: row.id,
//     type: row.type,
//     category: row.category,
//     title: row.title,
//     description: row.description,
//     location: row.location,
//     contact: row.contact ?? null,
//     status: row.status,
//     createdAt: row.created_at ?? row.createdAt,
//     updatedAt: row.updated_at ?? row.updatedAt,
//     resolvedAt: row.resolved_at ?? row.resolvedAt,
//     deletedAt: row.deleted_at ?? row.deletedAt,
//     matchedReportId: row.matched_report_id ?? row.matchedReportId ?? null,
//     identifyEmailSentAt: row.identify_email_sent_at ?? row.identifyEmailSentAt ?? null
//   };
// }
// export function normalizeReports(rows) { return (rows || []).map(normalizeReport); }

// // ─── OWNER READS/WRITES ("My Reports") ─────────────────────────
// export async function listMyReports() {
//   const { data, error } = await supabase.rpc('list_my_reports');
//   if (error) throw error;
//   return normalizeReports(data);
// }

// export async function createLostReport({ category, title, description, location, contact }) {
//   const { data, error } = await supabase.rpc('create_report', {
//     p_category: category, p_title: title, p_description: description,
//     p_location: location, p_contact: contact
//   });
//   if (error) throw error;
//   const row = Array.isArray(data) ? data[0] : data;
//   return { id: row.id, editToken: row.edit_token };
// }

// export async function ownerUpdateReport(id, updates) {
//   const { error } = await supabase.rpc('owner_update_report', { p_id: id, p_updates: updates });
//   if (error) throw error;
//   return { success: true };
// }
// export async function ownerResolveReport(id) {
//   const { error } = await supabase.rpc('owner_resolve_report', { p_id: id });
//   if (error) throw error;
//   return { success: true };
// }
// export async function ownerDeleteReport(id) {
//   const { error } = await supabase.rpc('owner_delete_report', { p_id: id });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── TOKEN-GATED SELF-SERVICE (edit.html) ──────────────────────
// // Requires the exact edit token — that's what proves the caller is
// // allowed to see (and edit) the contact field for this report.
// export async function fetchReportByToken(id, token) {
//   const { data, error } = await supabase.rpc('get_report_by_token', { p_id: id, p_token: token });
//   if (error) throw error;
//   const row = Array.isArray(data) ? (data[0] || null) : data;
//   return normalizeReport(row);
// }

// export async function updateReportByToken(id, token, updates) {
//   const { error } = await supabase.rpc('update_report_by_token', { p_id: id, p_token: token, p_updates: updates });
//   if (error) throw error;
//   return { success: true };
// }
// export async function resolveReportByToken(id, token) {
//   const { error } = await supabase.rpc('resolve_report_by_token', { p_id: id, p_token: token });
//   if (error) throw error;
//   return { success: true };
// }
// export async function deleteReportByToken(id, token) {
//   const { error } = await supabase.rpc('delete_report_by_token', { p_id: id, p_token: token });
//   if (error) throw error;
//   return { success: true };
// }

// export function buildEditLink(id, token) {
//   return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}edit.html?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
// }

// // ─── BOOKMARKS (self-scoped table, direct RLS-protected access) ─
// export async function listMyBookmarkIds() {
//   const { data, error } = await supabase.from('bookmarks').select('report_id');
//   if (error) throw error;
//   return (data || []).map(r => r.report_id);
// }

// export async function listMyBookmarkedItems() {
//   const ids = await listMyBookmarkIds();
//   if (ids.length === 0) return [];
//   const results = await Promise.all(ids.map(id => getPublicReport(id)));
//   return normalizeReports(results.filter(Boolean).filter(i => i.status !== 'deleted'));
// }

// export async function isBookmarked(reportId) {
//   const { data, error } = await supabase.from('bookmarks').select('report_id').eq('report_id', reportId).maybeSingle();
//   if (error) throw error;
//   return !!data;
// }

// export async function addBookmark(reportId) {
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error('Please log in to bookmark items.');
//   const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, report_id: reportId });
//   if (error) throw error;
// }

// export async function removeBookmark(reportId) {
//   const { error } = await supabase.from('bookmarks').delete().eq('report_id', reportId);
//   if (error) throw error;
// }

// // ─── SUSPICIOUS POST REPORTS ────────────────────────────────────
// export async function reportSuspiciousPost({ reportId, reason, details, reporterContact }) {
//   const { error } = await supabase.rpc('report_suspicious_post', {
//     p_report_id: reportId, p_reason: reason, p_details: details || null, p_reporter_contact: reporterContact || null
//   });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── ADMIN READS (all statuses + contact — RLS restricts to admins) ─
// const REPORT_COLUMNS = `
//   id, type, category, title, description, location, contact,
//   imageUrl:image_url, status,
//   createdAt:created_at, updatedAt:updated_at, resolvedAt:resolved_at,
//   deletedAt:deleted_at, matchedReportId:matched_report_id,
//   identifyEmailSentAt:identify_email_sent_at
// `;

// export async function fetchAllReportsAdmin() {
//   const { data, error } = await supabase.from('reports').select(REPORT_COLUMNS).order('created_at', { ascending: false });
//   if (error) throw error;
//   return data;
// }

// export function computeStats(items) {
//   return {
//     total: items.length,
//     active: items.filter(i => i.status === 'active').length,
//     lost: items.filter(i => i.type === 'lost').length,
//     found: items.filter(i => i.type === 'found').length,
//     deleted: items.filter(i => i.status === 'deleted').length,
//     resolved: items.filter(i => i.status === 'resolved').length
//   };
// }

// export async function adminGetStats() {
//   const { data, error } = await supabase.rpc('admin_get_stats');
//   if (error) throw error;
//   const row = Array.isArray(data) ? data[0] : data;
//   return row || { total_users: 0, total_reports: 0, lost_reports: 0, found_reports: 0, resolved_reports: 0 };
// }

// // ─── ADMIN WRITES ────────────────────────────────────────────────
// export async function adminSetStatus(id, status) {
//   const { error } = await supabase.rpc('admin_set_status', { p_id: id, p_status: status });
//   if (error) throw error;
//   return { success: true };
// }
// export async function adminUpdateReport(id, updates) {
//   const { error } = await supabase.rpc('admin_update_report', { p_id: id, p_updates: updates });
//   if (error) throw error;
//   return { success: true };
// }
// export async function adminCreateReport(fields) {
//   const { data, error } = await supabase.rpc('admin_create_report', {
//     p_type: fields.type, p_category: fields.category, p_title: fields.title,
//     p_description: fields.description, p_location: fields.location,
//     p_contact: fields.contact || null, p_status: fields.status || 'active'
//   });
//   if (error) throw error;
//   const row = Array.isArray(data) ? data[0] : data;
//   return { id: row.id, editToken: row.edit_token };
// }
// export async function adminDeletePermanently(id) {
//   const { error } = await supabase.rpc('admin_delete_permanently', { p_id: id });
//   if (error) throw error;
//   return { success: true };
// }
// export async function adminSetMatch(id, matchedId) {
//   const { error } = await supabase.rpc('admin_set_match', { p_id: id, p_matched_id: matchedId });
//   if (error) throw error;
//   return { success: true };
// }
// export async function adminMarkIdentifySent(id) {
//   const { error } = await supabase.rpc('admin_mark_identify_sent', { p_id: id });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── ADMIN: suspicious reports ──────────────────────────────────
// export async function adminListSuspiciousReports() {
//   const { data, error } = await supabase.rpc('admin_list_suspicious_reports');
//   if (error) throw error;
//   return data || [];
// }
// export async function adminUpdateSuspiciousStatus(id, status) {
//   const { error } = await supabase.rpc('admin_update_suspicious_status', { p_id: id, p_status: status });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── ADMIN: user management ──────────────────────────────────────
// export async function adminListUsers() {
//   const { data, error } = await supabase.rpc('admin_list_users');
//   if (error) throw error;
//   return data || [];
// }
// export async function adminGetUserReports(userId) {
//   const { data, error } = await supabase.rpc('admin_get_user_reports', { p_user_id: userId });
//   if (error) throw error;
//   return data || [];
// }
// export async function adminSuspendUser(userId) {
//   const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: userId });
//   if (error) throw error;
//   return { success: true };
// }
// export async function adminReactivateUser(userId) {
//   const { error } = await supabase.rpc('admin_reactivate_user', { p_user_id: userId });
//   if (error) throw error;
//   return { success: true };
// }
// export async function adminDeleteUserAccount(userId) {
//   const { error } = await supabase.rpc('admin_delete_user_account', { p_user_id: userId });
//   if (error) throw error;
//   return { success: true };
// }

// // ─── EMAIL (EmailJS — client-side, no backend) ──────────────────
// let emailjsInitialized = false;
// async function getEmailjs() {
//   const { default: emailjs } = await import("https://esm.sh/@emailjs/browser@4");
//   if (!emailjsInitialized) {
//     emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
//     emailjsInitialized = true;
//   }
//   return emailjs;
// }
// function isConfigured(templateId) {
//   return EMAILJS_SERVICE_ID && !EMAILJS_SERVICE_ID.startsWith('YOUR_')
//       && templateId && !templateId.startsWith('YOUR_')
//       && EMAILJS_PUBLIC_KEY && !EMAILJS_PUBLIC_KEY.startsWith('YOUR_');
// }
// async function sendViaTemplate(templateId, params, label) {
//   if (!isConfigured(templateId)) {
//     console.warn(`EmailJS template for "${label}" is not configured (see js/emailjs-config.js) — skipping email.`);
//     return { sent: false, reason: 'not_configured' };
//   }
//   try {
//     const emailjs = await getEmailjs();
//     await emailjs.send(EMAILJS_SERVICE_ID, templateId, params);
//     return { sent: true };
//   } catch (err) {
//     console.error(`Failed to send "${label}" email:`, err);
//     return { sent: false, reason: err?.message || 'unknown_error' };
//   }
// }

// // Sent the moment a lost report is created — includes the edit link.
// export async function sendLostReportEmail(item, editLink) {
//   return sendViaTemplate(EMAILJS_LOST_REPORT_TEMPLATE_ID, {
//     to_email: item.contact, item_title: item.title, item_type: 'lost',
//     item_category: item.category, item_location: item.location, edit_link: editLink
//   }, 'lost report confirmation');
// }

// // Sent to the report owner once an admin marks it Resolved.
// export async function sendResolutionNotification(item) {
//   return sendViaTemplate(EMAILJS_TEMPLATE_ID, {
//     to_email: item.contact, item_title: item.title, item_type: item.type,
//     item_category: item.category, item_location: item.location
//   }, 'resolution notification');
// }

// // Sent by an admin: "please come to the office to identify your item".
// export async function sendIdentifyEmail(item) {
//   return sendViaTemplate(EMAILJS_IDENTIFY_TEMPLATE_ID, {
//     to_email: item.contact, item_title: item.title,
//     item_category: item.category, item_location: item.location
//   }, 'come-identify invitation');
// }

// // Sent to the finder (if we have their contact) once the handover is
// // confirmed and both reports are resolved.
// export async function sendFinderThankYouEmail(foundItem) {
//   if (!foundItem?.contact) return { sent: false, reason: 'no_finder_contact' };
//   return sendViaTemplate(EMAILJS_FINDER_TEMPLATE_ID, {
//     to_email: foundItem.contact, item_title: foundItem.title,
//     item_category: foundItem.category, item_location: foundItem.location
//   }, 'finder thank-you');
// }

// // ─── SHARED UI: formatting ──────────────────────────────────────
// export function formatDate(item) {
//   if (!item.createdAt) return '—';
//   return new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// }
// export function formatDateTime(item) {
//   if (!item.createdAt) return '—';
//   const d = new Date(item.createdAt);
//   const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
//   const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
//   return `${datePart}, ${timePart}`;
// }
// export function escapeHtml(str) {
//   const div = document.createElement('div');
//   div.textContent = str ?? '';
//   return div.innerHTML;
// }

// // ─── CARDS / GRID (no photos — always a category icon) ────────
// export function buildCardHTML(item, bookmarkedIds = null) {
//   const icon = getCategoryIcon(item.category);
//   const badgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
//   const badgeText = item.type === 'lost' ? 'Lost' : 'Found';
//   const fmt = formatDate(item);
//   const showBookmark = bookmarkedIds !== null;
//   const bookmarked = showBookmark && bookmarkedIds.has(item.id);

//   return `
//     <div class="item-card" data-id="${item.id}" data-type="${item.type}" data-category="${item.category}">
//       <span class="card-badge ${badgeClass}">${badgeText}</span>
//       <div class="card-image">
//         <i class="fas fa-${icon}"></i>
//       </div>
//       <div class="card-content">
//         <span class="card-category">${escapeHtml(item.category)}</span>
//         <h3 class="card-title">${escapeHtml(item.title)}</h3>
//         <p class="card-desc">${escapeHtml(item.description)}</p>
//         <div class="card-meta">
//           <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location)}</span>
//           <span><i class="fas fa-calendar"></i> ${fmt}</span>
//         </div>
//         <div class="card-footer">
//           ${showBookmark ? `
//           <button class="icon-btn bookmark-btn ${bookmarked ? 'active' : ''}" data-bookmark-id="${item.id}" title="${bookmarked ? 'Remove bookmark' : 'Bookmark'}">
//             <i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i>
//           </button>` : ''}
//           <span class="contact-hint" style="flex:1;text-align:center;color:var(--gray);font-size:12px">
//             <i class="fas fa-lock"></i> Contact shown after you open this item
//           </span>
//         </div>
//       </div>
//     </div>`;
// }

// export function escapeAttr(str) { return escapeHtml(str); }

// export function renderItems(items, gridId = 'itemsGrid', bookmarkedIds = null) {
//   const grid = document.getElementById(gridId);
//   if (!grid) return;

//   if (items.length === 0) {
//     grid.innerHTML = `
//       <div class="empty-state">
//         <i class="fas fa-box-open"></i>
//         <h3>No items found</h3>
//         <p>Try adjusting your filters.</p>
//       </div>`;
//     return;
//   }

//   grid.innerHTML = items.map(i => buildCardHTML(i, bookmarkedIds)).join('');
//   attachCardClickListeners(grid, items);
// }

// function attachCardClickListeners(container, items) {
//   container.querySelectorAll('.item-card').forEach(card => {
//     card.addEventListener('click', function (e) {
//       if (e.target.closest('.bookmark-btn')) return;
//       const id = this.dataset.id;
//       const item = items.find(i => i.id === id);
//       if (item) openDetailModal(item);
//     });
//   });
// }

// // ─── REPORT (LOST) MODAL ────────────────────────────────────────
// export function openReportModal() {
//   const modal = document.getElementById('reportModal');
//   if (!modal) return;
//   modal.classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// export function closeModal() {
//   const modal = document.getElementById('reportModal');
//   if (modal) {
//     modal.classList.remove('active');
//     document.body.style.overflow = 'auto';
//   }
//   const form = document.getElementById('reportForm');
//   if (form) form.reset();
// }

// // ─── ITEM DETAIL MODAL ───────────────────────────────────────────
// let currentDetailItem = null;
// export function openDetailModal(item) {
//   currentDetailItem = item;
//   const modal = document.getElementById('detailModal');
//   if (!modal) return;

//   const icon = getCategoryIcon(item.category);
//   const badgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
//   const badgeText = item.type === 'lost' ? 'Lost' : 'Found';
//   const fmt = formatDate(item);

//   const detailImage = document.getElementById('detailImage');
//   detailImage.innerHTML = `<i class="fas fa-${icon}"></i>`;

//   const detailBadge = document.getElementById('detailBadge');
//   detailBadge.className = `card-badge ${badgeClass}`;
//   detailBadge.textContent = badgeText;

//   document.getElementById('detailTitle').textContent = item.title;
//   document.getElementById('detailCategory').textContent = item.category;
//   document.getElementById('detailLocation').textContent = item.location;
//   document.getElementById('detailDate').textContent = fmt;
//   document.getElementById('detailDescription').textContent = item.description;

//   const suspiciousBtn = document.getElementById('detailSuspiciousBtn');
//   if (suspiciousBtn) suspiciousBtn.dataset.reportId = item.id;

//   modal.classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// export function getCurrentDetailItem() { return currentDetailItem; }
// export function closeDetailModal() {
//   const modal = document.getElementById('detailModal');
//   if (modal) {
//     modal.classList.remove('active');
//     document.body.style.overflow = 'auto';
//   }
// }

// // ─── SUSPICIOUS-POST MODAL ───────────────────────────────────────
// export function openSuspiciousModal(reportId) {
//   const modal = document.getElementById('suspiciousModal');
//   if (!modal) return;
//   document.getElementById('suspiciousReportId').value = reportId;
//   modal.classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// export function closeSuspiciousModal() {
//   const modal = document.getElementById('suspiciousModal');
//   if (modal) {
//     modal.classList.remove('active');
//     document.body.style.overflow = 'auto';
//   }
//   const form = document.getElementById('suspiciousForm');
//   if (form) form.reset();
// }

// // ─── EDIT-LINK SUCCESS MODAL ────────────────────────────────────
// export function openEditLinkModal(editLink, contactEmail) {
//   const modal = document.getElementById('editLinkModal');
//   if (!modal) return;
//   document.getElementById('editLinkInput').value = editLink;
//   const mailBtn = document.getElementById('editLinkEmailBtn');
//   if (mailBtn) {
//     const subject = encodeURIComponent('Your Foundly report — save this edit link');
//     const body = encodeURIComponent(
//       `Here's the link to edit, resolve, or delete your Foundly report:\n\n${editLink}\n\nKeep it safe — anyone with this link can manage this report.`
//     );
//     mailBtn.href = `mailto:${contactEmail || ''}?subject=${subject}&body=${body}`;
//   }
//   modal.classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// export function closeEditLinkModal() {
//   const modal = document.getElementById('editLinkModal');
//   if (modal) {
//     modal.classList.remove('active');
//     document.body.style.overflow = 'auto';
//   }
// }

// // ─── TOAST ───────────────────────────────────────────────────
// export function showToast(message, type = '') {
//   let toast = document.getElementById('foundlyToast');
//   if (!toast) {
//     toast = document.createElement('div');
//     toast.id = 'foundlyToast';
//     toast.className = 'toast';
//     document.body.appendChild(toast);
//   }
//   toast.className = `toast ${type ? 'toast-' + type : ''}`;
//   const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
//   toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
//   requestAnimationFrame(() => { toast.classList.add('show'); });
//   clearTimeout(toast._timer);
//   toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
// }

// // ─── REPORT SUBMISSION (lost only — no photo) ───────────────────
// export async function submitLostReportForm({ category, title, description, location, contact }) {
//   const { id, editToken } = await createLostReport({ category, title, description, location, contact });
//   const editLink = buildEditLink(id, editToken);
//   await sendLostReportEmail({ contact, title, category, location }, editLink);
//   return { id, editToken, editLink };
// }

// // ─── GLOBAL LISTENERS ───────────────────────────────────────────
// document.addEventListener('click', function (e) {
//   const modal = document.getElementById('reportModal');
//   if (modal && e.target === modal) closeModal();
//   const detailModal = document.getElementById('detailModal');
//   if (detailModal && e.target === detailModal) closeDetailModal();
//   const editLinkModal = document.getElementById('editLinkModal');
//   if (editLinkModal && e.target === editLinkModal) closeEditLinkModal();
//   const suspiciousModal = document.getElementById('suspiciousModal');
//   if (suspiciousModal && e.target === suspiciousModal) closeSuspiciousModal();
// });




/* ============================================================
   FOUNDLY — Data layer (Supabase-backed)
   ------------------------------------------------------------
   Reads go through the RPC functions in
   supabase/migrations/0003_accounts_and_workflow.sql so that the
   `contact` column is never handed to anyone but the report's
   owner or an admin. All writes go through SECURITY DEFINER
   functions too — see that migration for the full picture.

   Photos have been removed: every item is represented by a
   category icon instead (see ICON_MAP below), so there is no
   upload/storage code left in this file any more.
   ============================================================ */

import { supabase } from "./supabase-init.js";
import {
  EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY,
  EMAILJS_TEMPLATE_ID, EMAILJS_LOST_REPORT_TEMPLATE_ID
} from "./emailjs-config.js";

// ─── CATEGORY ICONS ───────────────────────────────────────────
const ICON_MAP = {
  phones: 'mobile-alt', pets: 'paw', wallets: 'wallet', keys: 'key',
  bags: 'bag-shopping', electronics: 'laptop', jewelry: 'gem',
  id: 'id-card', other: 'question-circle'
};
export function getCategoryIcon(cat) { return ICON_MAP[cat] || 'tag'; }

export const CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'id',          label: 'ID Cards' },
  { value: 'bags',        label: 'Bags & Luggage' },
  { value: 'keys',        label: 'Keys' },
  { value: 'phones',      label: 'Phones' },
  { value: 'wallets',     label: 'Wallets & Purses' },
  { value: 'jewelry',     label: 'Jewelry' },
  { value: 'pets',        label: 'Pets' },
  { value: 'other',       label: 'Other' }
];

// ─── PUBLIC READS (contact never included) ─────────────────────
export async function listPublicReports({ type } = {}) {
  const { data, error } = await supabase.rpc('list_public_reports', { p_type: type || null });
  if (error) throw error;
  return data || [];
}

export async function getPublicReport(id) {
  const { data, error } = await supabase.rpc('get_public_report', { p_id: id });
  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : data;
}

export function filterAndSort(items, { category, searchTerm, sort } = {}) {
  let out = [...items];
  if (category) out = out.filter(i => i.category === category);
  if (searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    out = out.filter(i =>
      (i.title || '').toLowerCase().includes(term) ||
      (i.description || '').toLowerCase().includes(term) ||
      (i.location || '').toLowerCase().includes(term)
    );
  }
  const ts = (i) => i.createdAt ? new Date(i.createdAt).getTime() : (i.created_at ? new Date(i.created_at).getTime() : 0);
  if (sort === 'oldest') out.sort((a, b) => ts(a) - ts(b));
  else if (sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === 'za') out.sort((a, b) => b.title.localeCompare(a.title));
  else out.sort((a, b) => ts(b) - ts(a)); // newest first (default)
  return out;
}

// The RPCs above return snake_case columns (created_at, etc) since
// they're plain `returns table(...)` functions, not the aliased
// select the old direct-table reads used. Normalize once here so the
// rest of the app can keep using the original camelCase field names.
export function normalizeReport(row) {
  if (!row) return row;
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    description: row.description,
    location: row.location,
    contact: row.contact ?? null,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    resolvedAt: row.resolved_at ?? row.resolvedAt,
    deletedAt: row.deleted_at ?? row.deletedAt,
    matchedReportId: row.matched_report_id ?? row.matchedReportId ?? null,
    identifyEmailSentAt: row.identify_email_sent_at ?? row.identifyEmailSentAt ?? null
  };
}
export function normalizeReports(rows) { return (rows || []).map(normalizeReport); }

// ─── OWNER READS/WRITES ("My Reports") ─────────────────────────
export async function listMyReports() {
  const { data, error } = await supabase.rpc('list_my_reports');
  if (error) throw error;
  return normalizeReports(data);
}

export async function createLostReport({ category, title, description, location, contact }) {
  const { data, error } = await supabase.rpc('create_report', {
    p_category: category, p_title: title, p_description: description,
    p_location: location, p_contact: contact
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.id, editToken: row.edit_token };
}

export async function ownerUpdateReport(id, updates) {
  const { error } = await supabase.rpc('owner_update_report', { p_id: id, p_updates: updates });
  if (error) throw error;
  return { success: true };
}
export async function ownerResolveReport(id) {
  const { error } = await supabase.rpc('owner_resolve_report', { p_id: id });
  if (error) throw error;
  return { success: true };
}
export async function ownerDeleteReport(id) {
  const { error } = await supabase.rpc('owner_delete_report', { p_id: id });
  if (error) throw error;
  return { success: true };
}

// ─── TOKEN-GATED SELF-SERVICE (edit.html) ──────────────────────
// Requires the exact edit token — that's what proves the caller is
// allowed to see (and edit) the contact field for this report.
export async function fetchReportByToken(id, token) {
  const { data, error } = await supabase.rpc('get_report_by_token', { p_id: id, p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? (data[0] || null) : data;
  return normalizeReport(row);
}

export async function updateReportByToken(id, token, updates) {
  const { error } = await supabase.rpc('update_report_by_token', { p_id: id, p_token: token, p_updates: updates });
  if (error) throw error;
  return { success: true };
}
export async function resolveReportByToken(id, token) {
  const { error } = await supabase.rpc('resolve_report_by_token', { p_id: id, p_token: token });
  if (error) throw error;
  return { success: true };
}
export async function deleteReportByToken(id, token) {
  const { error } = await supabase.rpc('delete_report_by_token', { p_id: id, p_token: token });
  if (error) throw error;
  return { success: true };
}

export function buildEditLink(id, token) {
  return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}edit.html?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
}

// ─── BOOKMARKS (self-scoped table, direct RLS-protected access) ─
export async function listMyBookmarkIds() {
  const { data, error } = await supabase.from('bookmarks').select('report_id');
  if (error) throw error;
  return (data || []).map(r => r.report_id);
}

export async function listMyBookmarkedItems() {
  const ids = await listMyBookmarkIds();
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map(id => getPublicReport(id)));
  return normalizeReports(results.filter(Boolean).filter(i => i.status !== 'deleted'));
}

export async function isBookmarked(reportId) {
  const { data, error } = await supabase.from('bookmarks').select('report_id').eq('report_id', reportId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addBookmark(reportId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to bookmark items.');
  const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, report_id: reportId });
  if (error) throw error;
}

export async function removeBookmark(reportId) {
  const { error } = await supabase.from('bookmarks').delete().eq('report_id', reportId);
  if (error) throw error;
}

// ─── SUSPICIOUS POST REPORTS ────────────────────────────────────
export async function reportSuspiciousPost({ reportId, reason, details, reporterContact }) {
  const { error } = await supabase.rpc('report_suspicious_post', {
    p_report_id: reportId, p_reason: reason, p_details: details || null, p_reporter_contact: reporterContact || null
  });
  if (error) throw error;
  return { success: true };
}

// ─── ADMIN READS (all statuses + contact — RLS restricts to admins) ─
const REPORT_COLUMNS = `
  id, type, category, title, description, location, contact,
  imageUrl:image_url, status,
  createdAt:created_at, updatedAt:updated_at, resolvedAt:resolved_at,
  deletedAt:deleted_at, matchedReportId:matched_report_id,
  identifyEmailSentAt:identify_email_sent_at
`;

export async function fetchAllReportsAdmin() {
  const { data, error } = await supabase.from('reports').select(REPORT_COLUMNS).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export function computeStats(items) {
  return {
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    lost: items.filter(i => i.type === 'lost').length,
    found: items.filter(i => i.type === 'found').length,
    deleted: items.filter(i => i.status === 'deleted').length,
    resolved: items.filter(i => i.status === 'resolved').length
  };
}

export async function adminGetStats() {
  const { data, error } = await supabase.rpc('admin_get_stats');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || { total_users: 0, total_reports: 0, lost_reports: 0, found_reports: 0, resolved_reports: 0 };
}

// ─── ADMIN WRITES ────────────────────────────────────────────────
export async function adminSetStatus(id, status) {
  const { error } = await supabase.rpc('admin_set_status', { p_id: id, p_status: status });
  if (error) throw error;
  return { success: true };
}
export async function adminUpdateReport(id, updates) {
  const { error } = await supabase.rpc('admin_update_report', { p_id: id, p_updates: updates });
  if (error) throw error;
  return { success: true };
}
export async function adminCreateReport(fields) {
  const { data, error } = await supabase.rpc('admin_create_report', {
    p_type: fields.type, p_category: fields.category, p_title: fields.title,
    p_description: fields.description, p_location: fields.location,
    p_contact: fields.contact || null, p_status: fields.status || 'active'
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.id, editToken: row.edit_token };
}
export async function adminDeletePermanently(id) {
  const { error } = await supabase.rpc('admin_delete_permanently', { p_id: id });
  if (error) throw error;
  return { success: true };
}
export async function adminSetMatch(id, matchedId) {
  const { error } = await supabase.rpc('admin_set_match', { p_id: id, p_matched_id: matchedId });
  if (error) throw error;
  return { success: true };
}
export async function adminMarkIdentifySent(id) {
  const { error } = await supabase.rpc('admin_mark_identify_sent', { p_id: id });
  if (error) throw error;
  return { success: true };
}

// ─── ADMIN: suspicious reports ──────────────────────────────────
export async function adminListSuspiciousReports() {
  const { data, error } = await supabase.rpc('admin_list_suspicious_reports');
  if (error) throw error;
  return data || [];
}
export async function adminUpdateSuspiciousStatus(id, status) {
  const { error } = await supabase.rpc('admin_update_suspicious_status', { p_id: id, p_status: status });
  if (error) throw error;
  return { success: true };
}

// ─── ADMIN: user management ──────────────────────────────────────
export async function adminListUsers() {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return data || [];
}
export async function adminGetUserReports(userId) {
  const { data, error } = await supabase.rpc('admin_get_user_reports', { p_user_id: userId });
  if (error) throw error;
  return data || [];
}
export async function adminSuspendUser(userId) {
  const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: userId });
  if (error) throw error;
  return { success: true };
}
export async function adminReactivateUser(userId) {
  const { error } = await supabase.rpc('admin_reactivate_user', { p_user_id: userId });
  if (error) throw error;
  return { success: true };
}
export async function adminDeleteUserAccount(userId) {
  const { error } = await supabase.rpc('admin_delete_user_account', { p_user_id: userId });
  if (error) throw error;
  return { success: true };
}

// ─── EMAIL: EmailJS (client-side, no server, no domain needed) ──
// EmailJS's free plan caps out at 2 templates, so EMAILJS_TEMPLATE_ID
// is now a GENERIC "notification" template (subject/heading/message
// fields) reused for three different emails — resolution notice,
// identify invite, and finder thank-you. EMAILJS_LOST_REPORT_TEMPLATE_ID
// stays exactly as it was, since it needs its own dedicated edit_link
// field. See js/emailjs-config.js for what to paste into that generic
// template's content in the EmailJS dashboard.
let emailjsInitialized = false;
async function getEmailjs() {
  const { default: emailjs } = await import("https://esm.sh/@emailjs/browser@4");
  if (!emailjsInitialized) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    emailjsInitialized = true;
  }
  return emailjs;
}
function isConfigured(templateId) {
  return EMAILJS_SERVICE_ID && !EMAILJS_SERVICE_ID.startsWith('YOUR_')
      && templateId && !templateId.startsWith('YOUR_')
      && EMAILJS_PUBLIC_KEY && !EMAILJS_PUBLIC_KEY.startsWith('YOUR_');
}
async function sendViaTemplate(templateId, params, label) {
  if (!isConfigured(templateId)) {
    console.warn(`EmailJS template for "${label}" is not configured (see js/emailjs-config.js) — skipping email.`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const emailjs = await getEmailjs();
    await emailjs.send(EMAILJS_SERVICE_ID, templateId, params);
    return { sent: true };
  } catch (err) {
    console.error(`Failed to send "${label}" email:`, err);
    return { sent: false, reason: err?.message || 'unknown_error' };
  }
}

// Sent the moment a lost report is created — includes the edit link.
// Uses its own dedicated template (unchanged from before).
export async function sendLostReportEmail(item, editLink) {
  return sendViaTemplate(EMAILJS_LOST_REPORT_TEMPLATE_ID, {
    to_email: item.contact, item_title: item.title, item_type: 'lost',
    item_category: item.category, item_location: item.location, edit_link: editLink
  }, 'lost report confirmation');
}

// The three functions below all share ONE generic template — see
// js/emailjs-config.js for the exact fields (subject/heading/message)
// to set up in the EmailJS dashboard.

// Sent to the report owner once an admin marks it Resolved.
export async function sendResolutionNotification(item) {
  return sendViaTemplate(EMAILJS_TEMPLATE_ID, {
    to_email: item.contact,
    subject: `Foundly: Your ${item.type} report has been resolved`,
    heading: 'Marked as Resolved',
    message: `Good news — your report "${item.title}" (${item.category}, ${item.location}) has been marked as resolved.\n\nThank you for using Foundly!`
  }, 'resolution notification');
}

// Sent by an admin: "please come to the office to identify your item".
export async function sendIdentifyEmail(item) {
  return sendViaTemplate(EMAILJS_TEMPLATE_ID, {
    to_email: item.contact,
    subject: `Foundly: Come identify your item — ${item.title}`,
    heading: 'We may have found your item!',
    message: `The Foundly office believes they may have found your "${item.title}" (${item.category}) that you reported lost near ${item.location}.\n\nPlease come to the GCTU Lost & Found Department, Main Administration Block, Ground Floor, and describe the item in full detail — including anything you left out of your original report — so our team can confirm it's really yours before handing it over.\n\nOffice hours: Monday – Friday, 8am – 6pm GMT.`
  }, 'come-identify invitation');
}

// Sent to the finder (if we have their contact) once the handover is
// confirmed and both reports are resolved.
export async function sendFinderThankYouEmail(foundItem) {
  if (!foundItem?.contact) return { sent: false, reason: 'no_finder_contact' };
  return sendViaTemplate(EMAILJS_TEMPLATE_ID, {
    to_email: foundItem.contact,
    subject: `Foundly: Thank you for helping return "${foundItem.title}"`,
    heading: 'Thank you!',
    message: `Great news — the "${foundItem.title}" (${foundItem.category}) you handed in near ${foundItem.location} has been returned to its rightful owner.\n\nThank you for doing the right thing — it made a real difference to someone.`
  }, 'finder thank-you');
}

// ─── SHARED UI: formatting ──────────────────────────────────────
export function formatDate(item) {
  if (!item.createdAt) return '—';
  return new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function formatDateTime(item) {
  if (!item.createdAt) return '—';
  const d = new Date(item.createdAt);
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ─── CARDS / GRID (no photos — always a category icon) ────────
export function buildCardHTML(item, bookmarkedIds = null) {
  const icon = getCategoryIcon(item.category);
  const badgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
  const badgeText = item.type === 'lost' ? 'Lost' : 'Found';
  const fmt = formatDate(item);
  const showBookmark = bookmarkedIds !== null;
  const bookmarked = showBookmark && bookmarkedIds.has(item.id);

  return `
    <div class="item-card" data-id="${item.id}" data-type="${item.type}" data-category="${item.category}">
      <span class="card-badge ${badgeClass}">${badgeText}</span>
      <div class="card-image">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="card-content">
        <span class="card-category">${escapeHtml(item.category)}</span>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p class="card-desc">${escapeHtml(item.description)}</p>
        <div class="card-meta">
          <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location)}</span>
          <span><i class="fas fa-calendar"></i> ${fmt}</span>
        </div>
        <div class="card-footer">
          ${showBookmark ? `
          <button class="icon-btn bookmark-btn ${bookmarked ? 'active' : ''}" data-bookmark-id="${item.id}" title="${bookmarked ? 'Remove bookmark' : 'Bookmark'}">
            <i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i>
          </button>` : ''}
          <span class="contact-hint" style="flex:1;text-align:center;color:var(--gray);font-size:12px">
            <i class="fas fa-lock"></i> Contact shown after you open this item
          </span>
        </div>
      </div>
    </div>`;
}

export function escapeAttr(str) { return escapeHtml(str); }

export function renderItems(items, gridId = 'itemsGrid', bookmarkedIds = null) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <h3>No items found</h3>
        <p>Try adjusting your filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(i => buildCardHTML(i, bookmarkedIds)).join('');
  attachCardClickListeners(grid, items);
}

function attachCardClickListeners(container, items) {
  container.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.bookmark-btn')) return;
      const id = this.dataset.id;
      const item = items.find(i => i.id === id);
      if (item) openDetailModal(item);
    });
  });
}

// ─── REPORT (LOST) MODAL ────────────────────────────────────────
export function openReportModal() {
  const modal = document.getElementById('reportModal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
export function closeModal() {
  const modal = document.getElementById('reportModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
  const form = document.getElementById('reportForm');
  if (form) form.reset();
}

// ─── ITEM DETAIL MODAL ───────────────────────────────────────────
let currentDetailItem = null;
export function openDetailModal(item) {
  currentDetailItem = item;
  const modal = document.getElementById('detailModal');
  if (!modal) return;

  const icon = getCategoryIcon(item.category);
  const badgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
  const badgeText = item.type === 'lost' ? 'Lost' : 'Found';
  const fmt = formatDate(item);

  const detailImage = document.getElementById('detailImage');
  detailImage.innerHTML = `<i class="fas fa-${icon}"></i>`;

  const detailBadge = document.getElementById('detailBadge');
  detailBadge.className = `card-badge ${badgeClass}`;
  detailBadge.textContent = badgeText;

  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailCategory').textContent = item.category;
  document.getElementById('detailLocation').textContent = item.location;
  document.getElementById('detailDate').textContent = fmt;
  document.getElementById('detailDescription').textContent = item.description;

  const suspiciousBtn = document.getElementById('detailSuspiciousBtn');
  if (suspiciousBtn) suspiciousBtn.dataset.reportId = item.id;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
export function getCurrentDetailItem() { return currentDetailItem; }
export function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// ─── SUSPICIOUS-POST MODAL ───────────────────────────────────────
export function openSuspiciousModal(reportId) {
  const modal = document.getElementById('suspiciousModal');
  if (!modal) return;
  document.getElementById('suspiciousReportId').value = reportId;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
export function closeSuspiciousModal() {
  const modal = document.getElementById('suspiciousModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
  const form = document.getElementById('suspiciousForm');
  if (form) form.reset();
}

// ─── EDIT-LINK SUCCESS MODAL ────────────────────────────────────
export function openEditLinkModal(editLink, contactEmail) {
  const modal = document.getElementById('editLinkModal');
  if (!modal) return;
  document.getElementById('editLinkInput').value = editLink;
  const mailBtn = document.getElementById('editLinkEmailBtn');
  if (mailBtn) {
    const subject = encodeURIComponent('Your Foundly report — save this edit link');
    const body = encodeURIComponent(
      `Here's the link to edit, resolve, or delete your Foundly report:\n\n${editLink}\n\nKeep it safe — anyone with this link can manage this report.`
    );
    mailBtn.href = `mailto:${contactEmail || ''}?subject=${subject}&body=${body}`;
  }
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
export function closeEditLinkModal() {
  const modal = document.getElementById('editLinkModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// ─── TOAST ───────────────────────────────────────────────────
export function showToast(message, type = '') {
  let toast = document.getElementById('foundlyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'foundlyToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type ? 'toast-' + type : ''}`;
  const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
  requestAnimationFrame(() => { toast.classList.add('show'); });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── REPORT SUBMISSION (lost only — no photo) ───────────────────
export async function submitLostReportForm({ category, title, description, location, contact }) {
  const { id, editToken } = await createLostReport({ category, title, description, location, contact });
  const editLink = buildEditLink(id, editToken);
  await sendLostReportEmail({ contact, title, category, location }, editLink);
  return { id, editToken, editLink };
}

// ─── GLOBAL LISTENERS ───────────────────────────────────────────
document.addEventListener('click', function (e) {
  const modal = document.getElementById('reportModal');
  if (modal && e.target === modal) closeModal();
  const detailModal = document.getElementById('detailModal');
  if (detailModal && e.target === detailModal) closeDetailModal();
  const editLinkModal = document.getElementById('editLinkModal');
  if (editLinkModal && e.target === editLinkModal) closeEditLinkModal();
  const suspiciousModal = document.getElementById('suspiciousModal');
  if (suspiciousModal && e.target === suspiciousModal) closeSuspiciousModal();
});
