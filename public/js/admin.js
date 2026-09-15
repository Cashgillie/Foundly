// import { loginUser, logoutUser, onAuthChanged, isCurrentUserAdmin } from './auth.js';
// import {
//   fetchAllReportsAdmin, adminGetStats, adminSetStatus, adminUpdateReport, adminCreateReport,
//   adminDeletePermanently, adminSetMatch, adminMarkIdentifySent,
//   adminListSuspiciousReports, adminUpdateSuspiciousStatus,
//   adminListUsers, adminGetUserReports, adminSuspendUser, adminReactivateUser, adminDeleteUserAccount,
//   getCategoryIcon, escapeHtml, formatDate, formatDateTime, showToast, CATEGORIES,
//   sendResolutionNotification, sendIdentifyEmail, sendFinderThankYouEmail
// } from './foundly-data.js';

// let allReports = [];
// let allUsers = [];
// let allSuspicious = [];
// let currentStatusTab = 'all';
// let currentPreviewId = null;
// let currentMatchTargetId = null;

// // ============================================================
// // AUTH GATE
// // ============================================================
// function showGate(id) {
//   ['loginGate', 'notAdminGate', 'adminContent'].forEach(g => {
//     document.getElementById(g).style.display = (g === id) ? (g === 'adminContent' ? 'block' : 'flex') : 'none';
//   });
// }

// async function handleGateAuth(user) {
//   if (!user) { showGate('loginGate'); return; }
//   const admin = await isCurrentUserAdmin(user);
//   if (!admin) { showGate('notAdminGate'); return; }

//   document.getElementById('adminEmailLabel').textContent = user.email;
//   showGate('adminContent');
//   await bootstrapDashboard();
// }

// document.getElementById('gateForm').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const errorEl = document.getElementById('gateError');
//   errorEl.style.display = 'none';
//   const btn = document.getElementById('gateSubmitBtn');
//   const original = btn.innerHTML;
//   btn.disabled = true;
//   btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

//   try {
//     await loginUser(document.getElementById('gateEmail').value.trim(), document.getElementById('gatePassword').value);
//     // onAuthChanged will pick up the new session and call handleGateAuth
//   } catch (err) {
//     errorEl.textContent = err.message || 'Sign in failed.';
//     errorEl.style.display = 'block';
//   } finally {
//     btn.disabled = false;
//     btn.innerHTML = original;
//   }
// });

// async function handleSignOut() {
//   await logoutUser();
//   window.location.reload();
// }
// async function handleSignOutAndReload() { await handleSignOut(); }

// // ============================================================
// // BOOTSTRAP
// // ============================================================
// function buildCategorySelects() {
//   const opts = CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
//   document.getElementById('adminItemCategory').innerHTML = opts;
//   document.getElementById('adminCategoryFilter').innerHTML = `<option value="">All</option>` + opts;
// }

// async function bootstrapDashboard() {
//   buildCategorySelects();
//   await reloadAdminData();
// }

// async function reloadAdminData() {
//   const tbody = document.getElementById('adminTableBody');
//   try {
//     const [reports, stats] = await Promise.all([fetchAllReportsAdmin(), adminGetStats()]);
//     allReports = reports;
//     document.getElementById('statUsers').textContent = stats.total_users;
//     document.getElementById('statTotal').textContent = stats.total_reports;
//     document.getElementById('statLost').textContent = stats.lost_reports;
//     document.getElementById('statFound').textContent = stats.found_reports;
//     document.getElementById('statResolved').textContent = stats.resolved_reports;
//     applyAdminFilters();
//   } catch (err) {
//     console.error(err);
//     tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load reports: ${escapeHtml(err.message || '')}</td></tr>`;
//   }
// }

// // ============================================================
// // REPORTS TAB
// // ============================================================
// function setTab(status, el) {
//   currentStatusTab = status;
//   document.querySelectorAll('#statusTabs .pill').forEach(p => p.classList.remove('active'));
//   el.classList.add('active');
//   applyAdminFilters();
// }

// function applyAdminFilters() {
//   const term = (document.getElementById('adminSearchInput').value || '').toLowerCase().trim();
//   const type = document.getElementById('adminTypeFilter').value;
//   const category = document.getElementById('adminCategoryFilter').value;

//   let filtered = [...allReports];
//   if (currentStatusTab !== 'all') filtered = filtered.filter(r => r.status === currentStatusTab);
//   if (type !== 'all') filtered = filtered.filter(r => r.type === type);
//   if (category) filtered = filtered.filter(r => r.category === category);
//   if (term) {
//     filtered = filtered.filter(r =>
//       (r.title || '').toLowerCase().includes(term) ||
//       (r.description || '').toLowerCase().includes(term) ||
//       (r.location || '').toLowerCase().includes(term) ||
//       (r.contact || '').toLowerCase().includes(term)
//     );
//   }
//   filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

//   document.getElementById('adminResultCount').textContent = filtered.length;
//   renderReportsTable(filtered);
// }

// function findReport(id) { return allReports.find(r => r.id === id); }

// function renderReportsTable(items) {
//   const tbody = document.getElementById('adminTableBody');
//   if (items.length === 0) {
//     tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--gray)">No reports match your filters.</td></tr>`;
//     return;
//   }
//   tbody.innerHTML = items.map(buildReportRow).join('');
// }

// function buildReportRow(item) {
//   const icon = getCategoryIcon(item.category);
//   const typeBadge = item.type === 'lost'
//     ? `<span class="card-badge badge-lost" style="position:static">Lost</span>`
//     : `<span class="card-badge badge-found" style="position:static">Found</span>`;
//   const status = item.status;
//   const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
//   const matched = findReport(item.matchedReportId);

//   let matchNote = '';
//   if (matched) matchNote = `<div class="table-item-sub" style="color:#7209b7"><i class="fas fa-link"></i> Matched: ${escapeHtml(matched.title)}</div>`;

//   return `
//     <tr data-id="${item.id}">
//       <td><div class="table-icon-cell"><i class="fas fa-${icon}"></i></div></td>
//       <td>
//         <div class="table-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
//         <div class="table-item-sub"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location)}</div>
//         ${matchNote}
//       </td>
//       <td>${typeBadge}</td>
//       <td>${capitalize(item.category)}</td>
//       <td>${formatDateTime(item)}</td>
//       <td><span class="status-pill status-${status}">${statusLabel}</span></td>
//       <td>
//         <div class="dropdown">
//           <button class="dropdown-toggle" onclick="toggleMenu(event, 'report-${item.id}')"><i class="fas fa-ellipsis-vertical"></i></button>
//           <div class="dropdown-menu" id="menu-report-${item.id}">${buildReportMenu(item)}</div>
//         </div>
//       </td>
//     </tr>`;
// }

// function buildReportMenu(item) {
//   const rows = [];
//   rows.push(`<button onclick="openPreviewModal('${item.id}')"><i class="fas fa-eye"></i> Preview</button>`);
//   rows.push(`<button onclick="openItemModal('edit', '${item.id}')"><i class="fas fa-pen"></i> Edit</button>`);

//   if (item.status === 'active') {
//     if (item.type === 'lost') {
//       if (item.matchedReportId) {
//         rows.push(`<hr>`);
//         rows.push(`<button onclick="unlinkMatch('${item.id}')"><i class="fas fa-link-slash"></i> Unlink Match</button>`);
//         rows.push(`<button onclick="sendIdentifyEmailAction('${item.id}')"><i class="fas fa-envelope"></i> ${item.identifyEmailSentAt ? 'Resend' : 'Send'} Identify Email</button>`);
//         rows.push(`<button class="success-item" onclick="confirmHandoverResolve('${item.id}')"><i class="fas fa-handshake"></i> Confirm Handover &amp; Resolve</button>`);
//       } else {
//         rows.push(`<hr>`);
//         rows.push(`<button onclick="openMatchPicker('${item.id}')"><i class="fas fa-link"></i> Link Found Match</button>`);
//         rows.push(`<button class="success-item" onclick="quickResolve('${item.id}')"><i class="fas fa-circle-check"></i> Mark Resolved</button>`);
//       }
//     } else {
//       rows.push(`<hr>`);
//       rows.push(`<button class="success-item" onclick="quickResolve('${item.id}')"><i class="fas fa-circle-check"></i> Mark Resolved</button>`);
//     }
//     rows.push(`<hr>`);
//     rows.push(`<button class="warning-item" onclick="softDelete('${item.id}')"><i class="fas fa-trash"></i> Delete</button>`);
//   } else {
//     rows.push(`<hr>`);
//     rows.push(`<button class="success-item" onclick="restoreActive('${item.id}')"><i class="fas fa-rotate-left"></i> Restore to Active</button>`);
//   }
//   rows.push(`<button class="danger-item" onclick="permanentlyDelete('${item.id}')"><i class="fas fa-fire"></i> Delete Permanently</button>`);
//   return rows.join('');
// }

// function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// // ---- shared dropdown-menu open/close (namespaced keys across tables) ----
// function closeAllMenus(except) {
//   document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m !== except) m.classList.remove('open'); });
// }
// function toggleMenu(event, key) {
//   event.stopPropagation();
//   const menu = document.getElementById(`menu-${key}`);
//   const wasOpen = menu.classList.contains('open');
//   closeAllMenus();
//   if (!wasOpen) menu.classList.add('open');
// }
// document.addEventListener('click', () => closeAllMenus());

// // ---- report actions ----
// async function quickResolve(id) {
//   const item = findReport(id);
//   if (!confirm(`Mark "${item.title}" as resolved? This notifies the reporter by email.`)) return;
//   try {
//     await adminSetStatus(id, 'resolved');
//     if (item.contact) await sendResolutionNotification(item);
//     showToast('Marked as resolved and notified.', 'success');
//     await reloadAdminData();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }

// async function softDelete(id) {
//   if (!confirm('Delete this report? It will be hidden from the public but kept for records.')) return;
//   try { await adminSetStatus(id, 'deleted'); showToast('Report deleted.', ''); await reloadAdminData(); }
//   catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }
// async function restoreActive(id) {
//   try { await adminSetStatus(id, 'active'); showToast('Restored to active.', 'success'); await reloadAdminData(); }
//   catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }
// async function permanentlyDelete(id) {
//   if (!confirm('Permanently delete this report? This cannot be undone and removes it completely from the database.')) return;
//   try { await adminDeletePermanently(id); showToast('Permanently deleted.', ''); await reloadAdminData(); }
//   catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }

// async function unlinkMatch(id) {
//   try { await adminSetMatch(id, null); showToast('Match unlinked.', ''); await reloadAdminData(); }
//   catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }
// async function sendIdentifyEmailAction(id) {
//   const item = findReport(id);
//   if (!item.contact) { showToast('This report has no contact email on file.', 'error'); return; }
//   if (!confirm(`Send an email to ${item.contact} inviting them to come identify a possible match?`)) return;
//   try {
//     const result = await sendIdentifyEmail(item);
//     await adminMarkIdentifySent(id);
//     if (result.sent) showToast('Identify email sent!', 'success');
//     else showToast('Marked as sent, but the email itself was not sent — check js/emailjs-config.js.', 'error');
//     await reloadAdminData();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }
// async function confirmHandoverResolve(id) {
//   const lostItem = findReport(id);
//   const foundItem = findReport(lostItem.matchedReportId);
//   if (!confirm(`Confirm the handover of "${lostItem.title}"? This marks both reports resolved and emails everyone involved.`)) return;
//   try {
//     await adminSetStatus(lostItem.id, 'resolved');
//     if (foundItem) await adminSetStatus(foundItem.id, 'resolved');
//     if (lostItem.contact) await sendResolutionNotification(lostItem);
//     if (foundItem) await sendFinderThankYouEmail(foundItem);
//     showToast('Handover confirmed — both parties notified!', 'success');
//     await reloadAdminData();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }

// // ---- match picker modal ----
// function openMatchPicker(id) {
//   currentMatchTargetId = id;
//   document.getElementById('matchPickerSearch').value = '';
//   renderMatchPickerResults();
//   document.getElementById('matchPickerModal').classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// function closeMatchPickerModal() {
//   document.getElementById('matchPickerModal').classList.remove('active');
//   document.body.style.overflow = 'auto';
// }
// function renderMatchPickerResults() {
//   const term = (document.getElementById('matchPickerSearch').value || '').toLowerCase().trim();
//   const results = allReports.filter(r => r.type === 'found' && r.status === 'active' && r.id !== currentMatchTargetId &&
//     (!term || r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term)));
//   const wrap = document.getElementById('matchPickerResults');
//   if (results.length === 0) {
//     wrap.innerHTML = `<p style="color:var(--gray);text-align:center;padding:24px">No matching active found items.</p>`;
//     return;
//   }
//   wrap.innerHTML = results.map(r => `
//     <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #f1f3f5;cursor:pointer" onclick="selectMatch('${r.id}')">
//       <div class="table-icon-cell"><i class="fas fa-${getCategoryIcon(r.category)}"></i></div>
//       <div style="flex:1">
//         <div class="table-item-title">${escapeHtml(r.title)}</div>
//         <div class="table-item-sub">${escapeHtml(r.location)} · ${formatDate(r)}</div>
//       </div>
//       <button class="btn btn-outline" style="padding:6px 14px;font-size:13px">Select</button>
//     </div>
//   `).join('');
// }
// async function selectMatch(foundId) {
//   try {
//     await adminSetMatch(currentMatchTargetId, foundId);
//     showToast('Match linked!', 'success');
//     closeMatchPickerModal();
//     await reloadAdminData();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }

// // ---- preview modal ----
// function openPreviewModal(id) {
//   const item = findReport(id);
//   if (!item) return;
//   currentPreviewId = id;

//   document.getElementById('previewImage').innerHTML = `<i class="fas fa-${getCategoryIcon(item.category)}"></i>`;
//   const badge = document.getElementById('previewBadge');
//   badge.className = `card-badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`;
//   badge.textContent = item.type === 'lost' ? 'Lost' : 'Found';

//   const statusPill = document.getElementById('previewStatusPill');
//   statusPill.className = `status-pill status-${item.status}`;
//   statusPill.textContent = capitalize(item.status);

//   document.getElementById('previewTitle').textContent = item.title;
//   document.getElementById('previewCategory').textContent = item.category;
//   document.getElementById('previewLocation').textContent = item.location;
//   document.getElementById('previewDate').textContent = formatDate(item);
//   document.getElementById('previewDescription').textContent = item.description;

//   const contactBtn = document.getElementById('previewContactBtn');
//   const contactEmail = document.getElementById('previewContactEmail');
//   if (item.contact) {
//     contactBtn.href = `mailto:${item.contact}`;
//     contactEmail.textContent = item.contact;
//     contactBtn.style.display = '';
//   } else {
//     contactBtn.style.display = 'none';
//   }

//   const matched = findReport(item.matchedReportId);
//   document.getElementById('previewMatchBadgeWrap').innerHTML = matched
//     ? `<span class="match-badge"><i class="fas fa-link"></i> Matched with: ${escapeHtml(matched.title)}</span>` : '';

//   document.getElementById('previewMatchActions').innerHTML = buildPreviewActionButtons(item);

//   document.getElementById('adminPreviewModal').classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// function buildPreviewActionButtons(item) {
//   if (item.status !== 'active') return '';
//   const btns = [];
//   if (item.type === 'lost') {
//     if (item.matchedReportId) {
//       btns.push(`<button class="btn btn-outline" style="width:100%;justify-content:center" onclick="sendIdentifyEmailAction('${item.id}')"><i class="fas fa-envelope"></i> ${item.identifyEmailSentAt ? 'Resend' : 'Send'} Identify Email</button>`);
//       btns.push(`<button class="btn" style="width:100%;justify-content:center;background:#10b981;color:white" onclick="closePreviewModal(); confirmHandoverResolve('${item.id}')"><i class="fas fa-handshake"></i> Confirm Handover &amp; Resolve</button>`);
//     } else {
//       btns.push(`<button class="btn btn-outline" style="width:100%;justify-content:center" onclick="closePreviewModal(); openMatchPicker('${item.id}')"><i class="fas fa-link"></i> Link Found Match</button>`);
//     }
//   }
//   return btns.join('');
// }
// function closePreviewModal() {
//   document.getElementById('adminPreviewModal').classList.remove('active');
//   document.body.style.overflow = 'auto';
// }
// function editFromPreview() {
//   const id = currentPreviewId;
//   closePreviewModal();
//   openItemModal('edit', id);
// }

// // ---- add / edit item modal ----
// function onAdminTypeChange() {
//   const type = document.getElementById('adminItemType').value;
//   const emailInput = document.getElementById('adminItemEmail');
//   const label = document.getElementById('adminItemEmailLabel');
//   const hint = document.getElementById('adminItemEmailHint');
//   if (type === 'lost') {
//     label.textContent = 'Contact Email *';
//     hint.textContent = "Required for lost items reported on the reporter's behalf.";
//     emailInput.required = true;
//   } else {
//     label.textContent = "Finder's Contact Email (optional)";
//     hint.textContent = 'Only fill this in if the finder left their contact info — used to thank them once the item is claimed.';
//     emailInput.required = false;
//   }
// }

// function openItemModal(mode, id) {
//   const form = document.getElementById('adminItemForm');
//   form.reset();
//   document.getElementById('adminItemId').value = '';

//   if (mode === 'edit') {
//     const item = findReport(id);
//     if (!item) return;
//     document.getElementById('adminModalTitle').textContent = 'Edit Item';
//     document.getElementById('adminSubmitBtnText').textContent = 'Save Changes';
//     document.getElementById('adminItemId').value = item.id;
//     document.getElementById('adminItemType').value = item.type;
//     document.getElementById('adminItemStatus').value = item.status;
//     document.getElementById('adminItemTitle').value = item.title;
//     document.getElementById('adminItemCategory').value = item.category;
//     document.getElementById('adminItemLocation').value = item.location;
//     document.getElementById('adminItemDescription').value = item.description;
//     document.getElementById('adminItemEmail').value = item.contact || '';
//   } else {
//     document.getElementById('adminModalTitle').textContent = 'Add Found Item';
//     document.getElementById('adminSubmitBtnText').textContent = 'Add Item';
//     document.getElementById('adminItemType').value = 'found';
//     document.getElementById('adminItemStatus').value = 'active';
//   }
//   onAdminTypeChange();
//   document.getElementById('adminItemModal').classList.add('active');
//   document.body.style.overflow = 'hidden';
// }
// function closeItemModal() {
//   document.getElementById('adminItemModal').classList.remove('active');
//   document.body.style.overflow = 'auto';
// }

// async function submitItemForm(event) {
//   event.preventDefault();
//   const id = document.getElementById('adminItemId').value;
//   const fields = {
//     type: document.getElementById('adminItemType').value,
//     status: document.getElementById('adminItemStatus').value,
//     title: document.getElementById('adminItemTitle').value.trim(),
//     category: document.getElementById('adminItemCategory').value,
//     location: document.getElementById('adminItemLocation').value.trim(),
//     description: document.getElementById('adminItemDescription').value.trim(),
//     contact: document.getElementById('adminItemEmail').value.trim()
//   };

//   const btn = event.target.querySelector('button[type="submit"]');
//   const original = btn.innerHTML;
//   btn.disabled = true;
//   btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

//   try {
//     if (id) {
//       await adminUpdateReport(id, fields);
//       showToast('Item updated!', 'success');
//     } else {
//       await adminCreateReport(fields);
//       showToast('Item added!', 'success');
//     }
//     closeItemModal();
//     await reloadAdminData();
//   } catch (err) {
//     showToast(err.message || 'Could not save item.', 'error');
//   } finally {
//     btn.disabled = false;
//     btn.innerHTML = original;
//   }
// }

// // ============================================================
// // USERS TAB
// // ============================================================
// async function loadUsers() {
//   const tbody = document.getElementById('usersTableBody');
//   try {
//     allUsers = await adminListUsers();
//     renderUsersTable();
//   } catch (err) {
//     tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load users: ${escapeHtml(err.message || '')}</td></tr>`;
//   }
// }
// function renderUsersTable() {
//   const tbody = document.getElementById('usersTableBody');
//   const term = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
//   let filtered = allUsers;
//   if (term) filtered = filtered.filter(u => (u.email || '').toLowerCase().includes(term) || (u.full_name || '').toLowerCase().includes(term));

//   if (filtered.length === 0) {
//     tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--gray)">No users found.</td></tr>`;
//     return;
//   }
//   tbody.innerHTML = filtered.map(u => `
//     <tr data-id="${u.id}">
//       <td>
//         <div class="table-item-title">${escapeHtml(u.full_name || '(no name set)')}</div>
//         <div class="table-item-sub">${escapeHtml(u.email || '')}</div>
//       </td>
//       <td>${escapeHtml(u.phone || '—')}</td>
//       <td>${u.report_count}</td>
//       <td>${new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
//       <td><span class="status-pill ${u.is_suspended ? 'status-deleted' : 'status-active'}">${u.is_suspended ? 'Suspended' : 'Active'}</span></td>
//       <td>
//         <div class="dropdown">
//           <button class="dropdown-toggle" onclick="toggleMenu(event, 'user-${u.id}')"><i class="fas fa-ellipsis-vertical"></i></button>
//           <div class="dropdown-menu" id="menu-user-${u.id}">
//             <button onclick="openUserReportsModal('${u.id}')"><i class="fas fa-clipboard-list"></i> View Reports</button>
//             <hr>
//             ${u.is_suspended
//               ? `<button class="success-item" onclick="toggleSuspend('${u.id}', false)"><i class="fas fa-rotate-left"></i> Reactivate</button>`
//               : `<button class="warning-item" onclick="toggleSuspend('${u.id}', true)"><i class="fas fa-ban"></i> Suspend</button>`}
//             <button class="danger-item" onclick="deleteUserAccount('${u.id}')"><i class="fas fa-user-slash"></i> Remove Account</button>
//           </div>
//         </div>
//       </td>
//     </tr>
//   `).join('');
// }
// async function toggleSuspend(userId, suspend) {
//   const label = suspend ? 'suspend' : 'reactivate';
//   if (!confirm(`Are you sure you want to ${label} this account?`)) return;
//   try {
//     if (suspend) await adminSuspendUser(userId); else await adminReactivateUser(userId);
//     showToast(`Account ${suspend ? 'suspended' : 'reactivated'}.`, 'success');
//     await loadUsers();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }
// async function deleteUserAccount(userId) {
//   if (!confirm('Permanently remove this account? Their past reports are kept for records but unlinked from their profile. This cannot be undone.')) return;
//   if (!confirm('Really sure? Type OK in the next prompt is not required, but this is your last confirmation.')) return;
//   try {
//     await adminDeleteUserAccount(userId);
//     showToast('Account removed.', 'success');
//     await loadUsers();
//     await reloadAdminData();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }

// function openUserReportsModal(userId) {
//   const user = allUsers.find(u => u.id === userId);
//   document.getElementById('userReportsModalTitle').textContent = `${user?.full_name || user?.email || 'User'}'s Reports`;
//   const tbody = document.getElementById('userReportsTableBody');
//   tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray)"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
//   document.getElementById('userReportsModal').classList.add('active');
//   document.body.style.overflow = 'hidden';

//   adminGetUserReports(userId).then(reports => {
//     if (reports.length === 0) {
//       tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray)">No reports from this user yet.</td></tr>`;
//       return;
//     }
//     tbody.innerHTML = reports.map(r => `
//       <tr>
//         <td><div class="table-item-title">${escapeHtml(r.title)}</div><div class="table-item-sub">${escapeHtml(r.location)}</div></td>
//         <td>${capitalize(r.type)}</td>
//         <td><span class="status-pill status-${r.status}">${capitalize(r.status)}</span></td>
//         <td>${escapeHtml(r.contact || '—')}</td>
//         <td>${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
//       </tr>
//     `).join('');
//   }).catch(err => {
//     tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--danger)">${escapeHtml(err.message || 'Failed to load.')}</td></tr>`;
//   });
// }
// function closeUserReportsModal() {
//   document.getElementById('userReportsModal').classList.remove('active');
//   document.body.style.overflow = 'auto';
// }

// // ============================================================
// // SUSPICIOUS TAB
// // ============================================================
// async function loadSuspicious() {
//   const tbody = document.getElementById('suspiciousTableBody');
//   try {
//     allSuspicious = await adminListSuspiciousReports();
//     renderSuspiciousTable();
//   } catch (err) {
//     tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load: ${escapeHtml(err.message || '')}</td></tr>`;
//   }
// }
// function renderSuspiciousTable() {
//   const tbody = document.getElementById('suspiciousTableBody');
//   if (allSuspicious.length === 0) {
//     tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--gray)">No suspicious-post reports yet.</td></tr>`;
//     return;
//   }
//   tbody.innerHTML = allSuspicious.map(s => `
//     <tr>
//       <td>
//         <div class="table-item-title">${escapeHtml(s.report_title || '(item removed)')}</div>
//         <div class="table-item-sub">${capitalize(s.report_type || '')} · ${capitalize(s.report_status || '')}</div>
//       </td>
//       <td>${escapeHtml(s.reason)}</td>
//       <td style="max-width:220px">${escapeHtml(s.details || '—')}</td>
//       <td>${escapeHtml(s.reporter_contact || 'Anonymous')}</td>
//       <td>${new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
//       <td><span class="status-pill ${s.status === 'open' ? 'status-active' : s.status === 'dismissed' ? 'status-deleted' : 'status-resolved'}">${capitalize(s.status)}</span></td>
//       <td>
//         <div class="dropdown">
//           <button class="dropdown-toggle" onclick="toggleMenu(event, 'susp-${s.id}')"><i class="fas fa-ellipsis-vertical"></i></button>
//           <div class="dropdown-menu" id="menu-susp-${s.id}">
//             <button onclick="viewSuspiciousReport('${s.report_id}')"><i class="fas fa-eye"></i> View Item</button>
//             <hr>
//             <button class="success-item" onclick="setSuspiciousStatus('${s.id}', 'reviewed')"><i class="fas fa-check"></i> Mark Reviewed</button>
//             <button class="warning-item" onclick="setSuspiciousStatus('${s.id}', 'dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>
//           </div>
//         </div>
//       </td>
//     </tr>
//   `).join('');
// }
// async function setSuspiciousStatus(id, status) {
//   try {
//     await adminUpdateSuspiciousStatus(id, status);
//     showToast('Updated.', 'success');
//     await loadSuspicious();
//   } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
// }
// function viewSuspiciousReport(reportId) {
//   setAdminTab('reports');
//   if (findReport(reportId)) openPreviewModal(reportId);
//   else showToast('That report could not be found (it may have been permanently deleted).', 'error');
// }

// // ============================================================
// // TABS
// // ============================================================
// const loadedTabs = new Set(['reports']);
// function setAdminTab(tab) {
//   document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
//   document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
//   if (!loadedTabs.has(tab)) {
//     loadedTabs.add(tab);
//     if (tab === 'users') loadUsers();
//     if (tab === 'suspicious') loadSuspicious();
//   }
// }

// // ============================================================
// // GLOBAL WIRING
// // ============================================================
// document.addEventListener('click', function (e) {
//   ['adminPreviewModal', 'adminItemModal', 'matchPickerModal', 'userReportsModal'].forEach(id => {
//     const modal = document.getElementById(id);
//     if (modal && e.target === modal) modal.classList.remove('active');
//   });
// });

// Object.assign(window, {
//   handleSignOut, handleSignOutAndReload, setAdminTab, setTab, applyAdminFilters, reloadAdminData,
//   toggleMenu, openPreviewModal, closePreviewModal, openItemModal, closeItemModal, onAdminTypeChange,
//   submitItemForm, openMatchPicker, closeMatchPickerModal, renderMatchPickerResults, selectMatch,
//   unlinkMatch, sendIdentifyEmailAction, confirmHandoverResolve, quickResolve, softDelete, restoreActive,
//   permanentlyDelete, renderUsersTable, toggleSuspend, deleteUserAccount, openUserReportsModal,
//   closeUserReportsModal, setSuspiciousStatus, viewSuspiciousReport, editFromPreview
// });

// onAuthChanged(handleGateAuth);


import { loginUser, logoutUser, onAuthChanged, isCurrentUserAdmin } from './auth.js';
import {
  fetchAllReportsAdmin, adminGetStats, adminSetStatus, adminUpdateReport, adminCreateReport,
  adminDeletePermanently, adminSetMatch, adminMarkIdentifySent,
  adminListSuspiciousReports, adminUpdateSuspiciousStatus,
  adminListUsers, adminGetUserReports, adminSuspendUser, adminReactivateUser, adminDeleteUserAccount,
  getCategoryIcon, escapeHtml, formatDate, formatDateTime, showToast, CATEGORIES,
  sendResolutionNotification, sendIdentifyEmail, sendFinderThankYouEmail
} from './foundly-data.js';

let allReports = [];
let allUsers = [];
let allSuspicious = [];
let currentStatusTab = 'all';
let currentPreviewId = null;
let currentMatchTargetId = null;

// ============================================================
// AUTH GATE
// ============================================================
function showGate(id) {
  ['loginGate', 'notAdminGate', 'adminContent'].forEach(g => {
    document.getElementById(g).style.display = (g === id) ? (g === 'adminContent' ? 'block' : 'flex') : 'none';
  });
}

async function handleGateAuth(user) {
  if (!user) { showGate('loginGate'); return; }
  const admin = await isCurrentUserAdmin(user);
  if (!admin) { showGate('notAdminGate'); return; }

  document.getElementById('adminEmailLabel').textContent = user.email;
  showGate('adminContent');
  await bootstrapDashboard();
}

document.getElementById('gateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('gateError');
  errorEl.style.display = 'none';
  const btn = document.getElementById('gateSubmitBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    await loginUser(document.getElementById('gateEmail').value.trim(), document.getElementById('gatePassword').value);
    // onAuthChanged will pick up the new session and call handleGateAuth
  } catch (err) {
    errorEl.textContent = err.message || 'Sign in failed.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

async function handleSignOut() {
  await logoutUser();
  window.location.reload();
}
async function handleSignOutAndReload() { await handleSignOut(); }

// ============================================================
// BOOTSTRAP
// ============================================================
function buildCategorySelects() {
  const opts = CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
  document.getElementById('adminItemCategory').innerHTML = opts;
  document.getElementById('adminCategoryFilter').innerHTML = `<option value="">All</option>` + opts;
}

async function bootstrapDashboard() {
  buildCategorySelects();
  await reloadAdminData();
}

async function reloadAdminData() {
  const tbody = document.getElementById('adminTableBody');
  try {
    const [reports, stats] = await Promise.all([fetchAllReportsAdmin(), adminGetStats()]);
    allReports = reports;
    document.getElementById('statUsers').textContent = stats.total_users;
    document.getElementById('statTotal').textContent = stats.total_reports;
    document.getElementById('statLost').textContent = stats.lost_reports;
    document.getElementById('statFound').textContent = stats.found_reports;
    document.getElementById('statResolved').textContent = stats.resolved_reports;
    applyAdminFilters();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load reports: ${escapeHtml(err.message || '')}</td></tr>`;
  }
}

// ============================================================
// REPORTS TAB
// ============================================================
function setTab(status, el) {
  currentStatusTab = status;
  document.querySelectorAll('#statusTabs .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyAdminFilters();
}

function applyAdminFilters() {
  const term = (document.getElementById('adminSearchInput').value || '').toLowerCase().trim();
  const type = document.getElementById('adminTypeFilter').value;
  const category = document.getElementById('adminCategoryFilter').value;

  let filtered = [...allReports];
  if (currentStatusTab !== 'all') filtered = filtered.filter(r => r.status === currentStatusTab);
  if (type !== 'all') filtered = filtered.filter(r => r.type === type);
  if (category) filtered = filtered.filter(r => r.category === category);
  if (term) {
    filtered = filtered.filter(r =>
      (r.title || '').toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term) ||
      (r.location || '').toLowerCase().includes(term) ||
      (r.contact || '').toLowerCase().includes(term)
    );
  }
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  document.getElementById('adminResultCount').textContent = filtered.length;
  renderReportsTable(filtered);
}

function findReport(id) { return allReports.find(r => r.id === id); }

function renderReportsTable(items) {
  const tbody = document.getElementById('adminTableBody');
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--gray)">No reports match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(buildReportRow).join('');
}

function buildReportRow(item) {
  const icon = getCategoryIcon(item.category);
  const typeBadge = item.type === 'lost'
    ? `<span class="card-badge badge-lost" style="position:static">Lost</span>`
    : `<span class="card-badge badge-found" style="position:static">Found</span>`;
  const status = item.status;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const matched = findReport(item.matchedReportId);

  let matchNote = '';
  if (matched) matchNote = `<div class="table-item-sub" style="color:#7209b7"><i class="fas fa-link"></i> Matched: ${escapeHtml(matched.title)}</div>`;

  return `
    <tr data-id="${item.id}">
      <td><div class="table-icon-cell"><i class="fas fa-${icon}"></i></div></td>
      <td>
        <div class="table-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="table-item-sub"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location)}</div>
        ${matchNote}
      </td>
      <td>${typeBadge}</td>
      <td>${capitalize(item.category)}</td>
      <td>${formatDateTime(item)}</td>
      <td><span class="status-pill status-${status}">${statusLabel}</span></td>
      <td>
        <div class="dropdown">
          <button class="dropdown-toggle" onclick="toggleMenu(event, 'report-${item.id}')"><i class="fas fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu" id="menu-report-${item.id}">${buildReportMenu(item)}</div>
        </div>
      </td>
    </tr>`;
}

function buildReportMenu(item) {
  const rows = [];
  rows.push(`<button onclick="openPreviewModal('${item.id}')"><i class="fas fa-eye"></i> Preview</button>`);
  rows.push(`<button onclick="openItemModal('edit', '${item.id}')"><i class="fas fa-pen"></i> Edit</button>`);

  if (item.status === 'active') {
    if (item.type === 'lost') {
      if (item.matchedReportId) {
        rows.push(`<hr>`);
        rows.push(`<button onclick="unlinkMatch('${item.id}')"><i class="fas fa-link-slash"></i> Unlink Match</button>`);
        rows.push(`<button onclick="sendIdentifyEmailAction('${item.id}')"><i class="fas fa-envelope"></i> ${item.identifyEmailSentAt ? 'Resend' : 'Send'} Identify Email</button>`);
        rows.push(`<button class="success-item" onclick="confirmHandoverResolve('${item.id}')"><i class="fas fa-handshake"></i> Confirm Handover &amp; Resolve</button>`);
      } else {
        rows.push(`<hr>`);
        rows.push(`<button onclick="openMatchPicker('${item.id}')"><i class="fas fa-link"></i> Link Found Match</button>`);
        rows.push(`<button class="success-item" onclick="quickResolve('${item.id}')"><i class="fas fa-circle-check"></i> Mark Resolved</button>`);
      }
    } else {
      rows.push(`<hr>`);
      rows.push(`<button class="success-item" onclick="quickResolve('${item.id}')"><i class="fas fa-circle-check"></i> Mark Resolved</button>`);
    }
    rows.push(`<hr>`);
    rows.push(`<button class="warning-item" onclick="softDelete('${item.id}')"><i class="fas fa-trash"></i> Delete</button>`);
  } else {
    rows.push(`<hr>`);
    rows.push(`<button class="success-item" onclick="restoreActive('${item.id}')"><i class="fas fa-rotate-left"></i> Restore to Active</button>`);
  }
  rows.push(`<button class="danger-item" onclick="permanentlyDelete('${item.id}')"><i class="fas fa-fire"></i> Delete Permanently</button>`);
  return rows.join('');
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ---- shared dropdown-menu open/close (namespaced keys across tables) ----
function closeAllMenus(except) {
  document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m !== except) m.classList.remove('open'); });
}
function toggleMenu(event, key) {
  event.stopPropagation();
  const menu = document.getElementById(`menu-${key}`);
  const wasOpen = menu.classList.contains('open');
  closeAllMenus();
  if (!wasOpen) menu.classList.add('open');
}
document.addEventListener('click', () => closeAllMenus());

// ---- report actions ----
async function quickResolve(id) {
  const item = findReport(id);
  if (!confirm(`Mark "${item.title}" as resolved? This notifies the reporter by email.`)) return;
  try {
    await adminSetStatus(id, 'resolved');
    if (item.contact) await sendResolutionNotification(item);
    showToast('Marked as resolved and notified.', 'success');
    await reloadAdminData();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}

async function softDelete(id) {
  if (!confirm('Delete this report? It will be hidden from the public but kept for records.')) return;
  try { await adminSetStatus(id, 'deleted'); showToast('Report deleted.', ''); await reloadAdminData(); }
  catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}
async function restoreActive(id) {
  try { await adminSetStatus(id, 'active'); showToast('Restored to active.', 'success'); await reloadAdminData(); }
  catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}
async function permanentlyDelete(id) {
  if (!confirm('Permanently delete this report? This cannot be undone and removes it completely from the database.')) return;
  try { await adminDeletePermanently(id); showToast('Permanently deleted.', ''); await reloadAdminData(); }
  catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}

async function unlinkMatch(id) {
  try { await adminSetMatch(id, null); showToast('Match unlinked.', ''); await reloadAdminData(); }
  catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}
async function sendIdentifyEmailAction(id) {
  const item = findReport(id);
  if (!item.contact) { showToast('This report has no contact email on file.', 'error'); return; }
  if (!confirm(`Send an email to ${item.contact} inviting them to come identify a possible match?`)) return;
  try {
    const result = await sendIdentifyEmail(item);
    await adminMarkIdentifySent(id);
    if (result.sent) showToast('Identify email sent!', 'success');
    else showToast('Marked as sent, but the email itself was not sent — check js/emailjs-config.js.', 'error');
    await reloadAdminData();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}
async function confirmHandoverResolve(id) {
  const lostItem = findReport(id);
  const foundItem = findReport(lostItem.matchedReportId);
  if (!confirm(`Confirm the handover of "${lostItem.title}"? This marks both reports resolved and emails everyone involved.`)) return;
  try {
    await adminSetStatus(lostItem.id, 'resolved');
    if (foundItem) await adminSetStatus(foundItem.id, 'resolved');
    if (lostItem.contact) await sendResolutionNotification(lostItem);
    if (foundItem) await sendFinderThankYouEmail(foundItem);
    showToast('Handover confirmed — both parties notified!', 'success');
    await reloadAdminData();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}

// ---- match picker modal ----
function openMatchPicker(id) {
  currentMatchTargetId = id;
  document.getElementById('matchPickerSearch').value = '';
  renderMatchPickerResults();
  document.getElementById('matchPickerModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeMatchPickerModal() {
  document.getElementById('matchPickerModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}
function renderMatchPickerResults() {
  const term = (document.getElementById('matchPickerSearch').value || '').toLowerCase().trim();
  const results = allReports.filter(r => r.type === 'found' && r.status === 'active' && r.id !== currentMatchTargetId &&
    (!term || r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term)));
  const wrap = document.getElementById('matchPickerResults');
  if (results.length === 0) {
    wrap.innerHTML = `<p style="color:var(--gray);text-align:center;padding:24px">No matching active found items.</p>`;
    return;
  }
  wrap.innerHTML = results.map(r => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #f1f3f5;cursor:pointer" onclick="selectMatch('${r.id}')">
      <div class="table-icon-cell"><i class="fas fa-${getCategoryIcon(r.category)}"></i></div>
      <div style="flex:1">
        <div class="table-item-title">${escapeHtml(r.title)}</div>
        <div class="table-item-sub">${escapeHtml(r.location)} · ${formatDate(r)}</div>
      </div>
      <button class="btn btn-outline" style="padding:6px 14px;font-size:13px">Select</button>
    </div>
  `).join('');
}
async function selectMatch(foundId) {
  try {
    await adminSetMatch(currentMatchTargetId, foundId);
    showToast('Match linked!', 'success');
    closeMatchPickerModal();
    await reloadAdminData();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}

// ---- preview modal ----
function openPreviewModal(id) {
  const item = findReport(id);
  if (!item) return;
  currentPreviewId = id;

  document.getElementById('previewImage').innerHTML = `<i class="fas fa-${getCategoryIcon(item.category)}"></i>`;
  const badge = document.getElementById('previewBadge');
  badge.className = `card-badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`;
  badge.textContent = item.type === 'lost' ? 'Lost' : 'Found';

  const statusPill = document.getElementById('previewStatusPill');
  statusPill.className = `status-pill status-${item.status}`;
  statusPill.textContent = capitalize(item.status);

  document.getElementById('previewTitle').textContent = item.title;
  document.getElementById('previewCategory').textContent = item.category;
  document.getElementById('previewLocation').textContent = item.location;
  document.getElementById('previewDate').textContent = formatDate(item);
  document.getElementById('previewDescription').textContent = item.description;

  const contactBtn = document.getElementById('previewContactBtn');
  const contactEmail = document.getElementById('previewContactEmail');
  if (item.contact) {
    contactBtn.href = `mailto:${item.contact}`;
    contactEmail.textContent = item.contact;
    contactBtn.style.display = '';
  } else {
    contactBtn.style.display = 'none';
  }

  const matched = findReport(item.matchedReportId);
  document.getElementById('previewMatchBadgeWrap').innerHTML = matched
    ? `<span class="match-badge"><i class="fas fa-link"></i> Matched with: ${escapeHtml(matched.title)}</span>` : '';

  document.getElementById('previewMatchActions').innerHTML = buildPreviewActionButtons(item);

  document.getElementById('adminPreviewModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function buildPreviewActionButtons(item) {
  if (item.status !== 'active') return '';
  const btns = [];
  if (item.type === 'lost') {
    if (item.matchedReportId) {
      btns.push(`<button class="btn btn-outline" style="width:100%;justify-content:center" onclick="sendIdentifyEmailAction('${item.id}')"><i class="fas fa-envelope"></i> ${item.identifyEmailSentAt ? 'Resend' : 'Send'} Identify Email</button>`);
      btns.push(`<button class="btn" style="width:100%;justify-content:center;background:#10b981;color:white" onclick="closePreviewModal(); confirmHandoverResolve('${item.id}')"><i class="fas fa-handshake"></i> Confirm Handover &amp; Resolve</button>`);
    } else {
      btns.push(`<button class="btn btn-outline" style="width:100%;justify-content:center" onclick="closePreviewModal(); openMatchPicker('${item.id}')"><i class="fas fa-link"></i> Link Found Match</button>`);
    }
  }
  return btns.join('');
}
function closePreviewModal() {
  document.getElementById('adminPreviewModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}
function editFromPreview() {
  const id = currentPreviewId;
  closePreviewModal();
  openItemModal('edit', id);
}

// ---- add / edit item modal ----
function onAdminTypeChange() {
  const type = document.getElementById('adminItemType').value;
  const emailInput = document.getElementById('adminItemEmail');
  const label = document.getElementById('adminItemEmailLabel');
  const hint = document.getElementById('adminItemEmailHint');
  if (type === 'lost') {
    label.textContent = 'Contact Email *';
    hint.textContent = "Required for lost items reported on the reporter's behalf.";
    emailInput.required = true;
  } else {
    label.textContent = "Finder's Contact Email (optional)";
    hint.textContent = 'Only fill this in if the finder left their contact info — used to thank them once the item is claimed.';
    emailInput.required = false;
  }
}

function openItemModal(mode, id) {
  const form = document.getElementById('adminItemForm');
  form.reset();
  document.getElementById('adminItemId').value = '';

  if (mode === 'edit') {
    const item = findReport(id);
    if (!item) return;
    document.getElementById('adminModalTitle').textContent = 'Edit Item';
    document.getElementById('adminSubmitBtnText').textContent = 'Save Changes';
    document.getElementById('adminItemId').value = item.id;
    document.getElementById('adminItemType').value = item.type;
    document.getElementById('adminItemStatus').value = item.status;
    document.getElementById('adminItemTitle').value = item.title;
    document.getElementById('adminItemCategory').value = item.category;
    document.getElementById('adminItemLocation').value = item.location;
    document.getElementById('adminItemDescription').value = item.description;
    document.getElementById('adminItemEmail').value = item.contact || '';
  } else {
    document.getElementById('adminModalTitle').textContent = 'Add Found Item';
    document.getElementById('adminSubmitBtnText').textContent = 'Add Item';
    document.getElementById('adminItemType').value = 'found';
    document.getElementById('adminItemStatus').value = 'active';
  }
  onAdminTypeChange();
  document.getElementById('adminItemModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeItemModal() {
  document.getElementById('adminItemModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

async function submitItemForm(event) {
  event.preventDefault();
  const id = document.getElementById('adminItemId').value;
  const fields = {
    type: document.getElementById('adminItemType').value,
    status: document.getElementById('adminItemStatus').value,
    title: document.getElementById('adminItemTitle').value.trim(),
    category: document.getElementById('adminItemCategory').value,
    location: document.getElementById('adminItemLocation').value.trim(),
    description: document.getElementById('adminItemDescription').value.trim(),
    contact: document.getElementById('adminItemEmail').value.trim()
  };

  const btn = event.target.querySelector('button[type="submit"]');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    if (id) {
      await adminUpdateReport(id, fields);
      showToast('Item updated!', 'success');
    } else {
      await adminCreateReport(fields);
      showToast('Item added!', 'success');
    }
    closeItemModal();
    await reloadAdminData();
  } catch (err) {
    showToast(err.message || 'Could not save item.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// ============================================================
// USERS TAB
// ============================================================
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  try {
    allUsers = await adminListUsers();
    renderUsersTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load users: ${escapeHtml(err.message || '')}</td></tr>`;
  }
}
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  const term = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  let filtered = allUsers;
  if (term) filtered = filtered.filter(u => (u.email || '').toLowerCase().includes(term) || (u.full_name || '').toLowerCase().includes(term));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--gray)">No users found.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(u => `
    <tr data-id="${u.id}">
      <td>
        <div class="table-item-title">${escapeHtml(u.full_name || '(no name set)')}</div>
        <div class="table-item-sub">${escapeHtml(u.email || '')}</div>
      </td>
      <td>${escapeHtml(u.phone || '—')}</td>
      <td>${u.report_count}</td>
      <td>${new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td><span class="status-pill ${u.is_suspended ? 'status-deleted' : 'status-active'}">${u.is_suspended ? 'Suspended' : 'Active'}</span></td>
      <td>
        <div class="dropdown">
          <button class="dropdown-toggle" onclick="toggleMenu(event, 'user-${u.id}')"><i class="fas fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu" id="menu-user-${u.id}">
            <button onclick="openUserReportsModal('${u.id}')"><i class="fas fa-clipboard-list"></i> View Reports</button>
            <hr>
            ${u.is_suspended
              ? `<button class="success-item" onclick="toggleSuspend('${u.id}', false)"><i class="fas fa-rotate-left"></i> Reactivate</button>`
              : `<button class="warning-item" onclick="toggleSuspend('${u.id}', true)"><i class="fas fa-ban"></i> Suspend</button>`}
            <button class="danger-item" onclick="deleteUserAccount('${u.id}')"><i class="fas fa-user-slash"></i> Remove Account</button>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}
async function toggleSuspend(userId, suspend) {
  const label = suspend ? 'suspend' : 'reactivate';
  if (!confirm(`Are you sure you want to ${label} this account?`)) return;
  try {
    if (suspend) await adminSuspendUser(userId); else await adminReactivateUser(userId);
    showToast(`Account ${suspend ? 'suspended' : 'reactivated'}.`, 'success');
    await loadUsers();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}
async function deleteUserAccount(userId) {
  if (!confirm('Permanently remove this account? Their past reports are kept for records but unlinked from their profile. This cannot be undone.')) return;
  if (!confirm('Really sure? Type OK in the next prompt is not required, but this is your last confirmation.')) return;
  try {
    await adminDeleteUserAccount(userId);
    showToast('Account removed.', 'success');
    await loadUsers();
    await reloadAdminData();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}

function openUserReportsModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  document.getElementById('userReportsModalTitle').textContent = `${user?.full_name || user?.email || 'User'}'s Reports`;
  const tbody = document.getElementById('userReportsTableBody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray)"><i class="fas fa-spinner fa-spin"></i></td></tr>`;
  document.getElementById('userReportsModal').classList.add('active');
  document.body.style.overflow = 'hidden';

  adminGetUserReports(userId).then(reports => {
    if (reports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray)">No reports from this user yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = reports.map(r => `
      <tr>
        <td><div class="table-item-title">${escapeHtml(r.title)}</div><div class="table-item-sub">${escapeHtml(r.location)}</div></td>
        <td>${capitalize(r.type)}</td>
        <td><span class="status-pill status-${r.status}">${capitalize(r.status)}</span></td>
        <td>${escapeHtml(r.contact || '—')}</td>
        <td>${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      </tr>
    `).join('');
  }).catch(err => {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--danger)">${escapeHtml(err.message || 'Failed to load.')}</td></tr>`;
  });
}
function closeUserReportsModal() {
  document.getElementById('userReportsModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// ============================================================
// SUSPICIOUS TAB
// ============================================================
async function loadSuspicious() {
  const tbody = document.getElementById('suspiciousTableBody');
  try {
    allSuspicious = await adminListSuspiciousReports();
    renderSuspiciousTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load: ${escapeHtml(err.message || '')}</td></tr>`;
  }
}
function renderSuspiciousTable() {
  const tbody = document.getElementById('suspiciousTableBody');
  if (allSuspicious.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--gray)">No suspicious-post reports yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = allSuspicious.map(s => `
    <tr>
      <td>
        <div class="table-item-title">${escapeHtml(s.report_title || '(item removed)')}</div>
        <div class="table-item-sub">${capitalize(s.report_type || '')} · ${capitalize(s.report_status || '')}</div>
      </td>
      <td>${escapeHtml(s.reason)}</td>
      <td style="max-width:220px">${escapeHtml(s.details || '—')}</td>
      <td>${escapeHtml(s.reporter_contact || 'Anonymous')}</td>
      <td>${new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td><span class="status-pill ${s.status === 'open' ? 'status-active' : s.status === 'dismissed' ? 'status-deleted' : 'status-resolved'}">${capitalize(s.status)}</span></td>
      <td>
        <div class="dropdown">
          <button class="dropdown-toggle" onclick="toggleMenu(event, 'susp-${s.id}')"><i class="fas fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu" id="menu-susp-${s.id}">
            <button onclick="viewSuspiciousReport('${s.report_id}')"><i class="fas fa-eye"></i> View Item</button>
            <hr>
            <button class="success-item" onclick="setSuspiciousStatus('${s.id}', 'reviewed')"><i class="fas fa-check"></i> Mark Reviewed</button>
            <button class="warning-item" onclick="setSuspiciousStatus('${s.id}', 'dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}
async function setSuspiciousStatus(id, status) {
  try {
    await adminUpdateSuspiciousStatus(id, status);
    showToast('Updated.', 'success');
    await loadSuspicious();
  } catch (err) { showToast(err.message || 'Action failed.', 'error'); }
}
function viewSuspiciousReport(reportId) {
  setAdminTab('reports');
  if (findReport(reportId)) openPreviewModal(reportId);
  else showToast('That report could not be found (it may have been permanently deleted).', 'error');
}

// ============================================================
// TABS
// ============================================================
const loadedTabs = new Set(['reports']);
function setAdminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  if (!loadedTabs.has(tab)) {
    loadedTabs.add(tab);
    if (tab === 'users') loadUsers();
    if (tab === 'suspicious') loadSuspicious();
  }
}

// ============================================================
// GLOBAL WIRING
// ============================================================
document.addEventListener('click', function (e) {
  ['adminPreviewModal', 'adminItemModal', 'matchPickerModal', 'userReportsModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal && e.target === modal) modal.classList.remove('active');
  });
});

Object.assign(window, {
  handleSignOut, handleSignOutAndReload, setAdminTab, setTab, applyAdminFilters, reloadAdminData,
  toggleMenu, openPreviewModal, closePreviewModal, openItemModal, closeItemModal, onAdminTypeChange,
  submitItemForm, openMatchPicker, closeMatchPickerModal, renderMatchPickerResults, selectMatch,
  unlinkMatch, sendIdentifyEmailAction, confirmHandoverResolve, quickResolve, softDelete, restoreActive,
  permanentlyDelete, renderUsersTable, toggleSuspend, deleteUserAccount, openUserReportsModal,
  closeUserReportsModal, setSuspiciousStatus, viewSuspiciousReport, editFromPreview
});

onAuthChanged(handleGateAuth);