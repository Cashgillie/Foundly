import {
  listMyReports, ownerUpdateReport, ownerResolveReport, ownerDeleteReport,
  getCategoryIcon, escapeHtml, formatDateTime, showToast, CATEGORIES
} from './foundly-data.js';
import { initSiteNav } from './site-nav.js';
import { logoutUser } from './auth.js';

let allReports = [];

function buildCategorySelect() {
  document.getElementById('editCategory').innerHTML = CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
}

async function loadReports() {
  const tbody = document.getElementById('reportsTableBody');
  try {
    allReports = await listMyReports();
    renderTable();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--danger)">Couldn't load your reports. ${escapeHtml(err.message || '')}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('reportsTableBody');
  if (allReports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--gray)">
      <i class="fas fa-box-open" style="font-size:32px;display:block;margin-bottom:12px"></i>
      You haven't reported any lost items yet. <a href="index.html?report=1" style="color:var(--primary);font-weight:700">Report one</a>.
    </td></tr>`;
    return;
  }
  tbody.innerHTML = allReports.map(buildRow).join('');
}

function buildRow(item) {
  const icon = getCategoryIcon(item.category);
  const status = item.status || 'active';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const locked = status === 'resolved' || status === 'deleted';

  let matchNote = '';
  if (item.matchedReportId) {
    matchNote = `<div class="table-item-sub" style="color:#7209b7"><i class="fas fa-link"></i> A possible match has been linked by the office</div>`;
  } else if (item.identifyEmailSentAt) {
    matchNote = `<div class="table-item-sub" style="color:#0891b2"><i class="fas fa-envelope"></i> Come-identify email sent</div>`;
  }

  let menuItems = '';
  if (!locked) {
    menuItems += `<button onclick="openEditReportModal('${item.id}')"><i class="fas fa-pen"></i> Edit</button>`;
    menuItems += `<button class="success-item" onclick="resolveMyReport('${item.id}')"><i class="fas fa-circle-check"></i> Mark Resolved</button>`;
    menuItems += `<hr>`;
    menuItems += `<button class="danger-item" onclick="deleteMyReport('${item.id}')"><i class="fas fa-trash"></i> Delete</button>`;
  } else {
    menuItems += `<button disabled style="opacity:0.5;cursor:not-allowed"><i class="fas fa-lock"></i> No actions available</button>`;
  }

  return `
    <tr data-id="${item.id}">
      <td><div class="table-icon-cell"><i class="fas fa-${icon}"></i></div></td>
      <td>
        <div class="table-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="table-item-sub"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location)}</div>
        ${matchNote}
      </td>
      <td>${capitalize(item.category)}</td>
      <td>${formatDateTime(item)}</td>
      <td><span class="status-pill status-${status}">${statusLabel}</span></td>
      <td class="admin-actions">
        <div class="dropdown">
          <button class="dropdown-toggle" onclick="toggleActionsMenu(event, '${item.id}')" title="Actions"><i class="fas fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu" id="menu-${item.id}">${menuItems}</div>
        </div>
      </td>
    </tr>`;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function closeAllActionMenus(except) {
  document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m !== except) m.classList.remove('open'); });
}
function toggleActionsMenu(event, id) {
  event.stopPropagation();
  const menu = document.getElementById(`menu-${id}`);
  const wasOpen = menu.classList.contains('open');
  closeAllActionMenus();
  if (!wasOpen) menu.classList.add('open');
}
document.addEventListener('click', () => closeAllActionMenus());

async function resolveMyReport(id) {
  if (!confirm('Mark this report as resolved? This means you already identified and collected your item at the office.')) return;
  try {
    await ownerResolveReport(id);
    showToast('Marked as resolved!', 'success');
    await loadReports();
  } catch (err) {
    showToast(err.message || 'Action failed.', 'error');
  }
}

async function deleteMyReport(id) {
  if (!confirm('Delete this report? It will no longer be visible to anyone.')) return;
  try {
    await ownerDeleteReport(id);
    showToast('Report deleted.', '');
    await loadReports();
  } catch (err) {
    showToast(err.message || 'Action failed.', 'error');
  }
}

function openEditReportModal(id) {
  const item = allReports.find(i => i.id === id);
  if (!item) return;
  document.getElementById('editReportId').value = item.id;
  document.getElementById('editTitle').value = item.title;
  document.getElementById('editCategory').value = item.category;
  document.getElementById('editLocation').value = item.location;
  document.getElementById('editDescription').value = item.description;
  document.getElementById('editContact').value = item.contact || '';
  document.getElementById('editReportModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeEditReportModal() {
  document.getElementById('editReportModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

document.getElementById('editReportForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editReportId').value;
  const updates = {
    title: document.getElementById('editTitle').value.trim(),
    category: document.getElementById('editCategory').value,
    location: document.getElementById('editLocation').value.trim(),
    description: document.getElementById('editDescription').value.trim(),
    contact: document.getElementById('editContact').value.trim()
  };
  try {
    await ownerUpdateReport(id, updates);
    showToast('Report updated!', 'success');
    closeEditReportModal();
    await loadReports();
  } catch (err) {
    showToast(err.message || 'Could not save changes.', 'error');
  }
});

document.getElementById('navLogoutBtn')?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'index.html';
});

document.addEventListener('click', function (e) {
  const modal = document.getElementById('editReportModal');
  if (modal && e.target === modal) closeEditReportModal();
});

Object.assign(window, {
  openEditReportModal, closeEditReportModal, resolveMyReport, deleteMyReport, toggleActionsMenu
});

document.addEventListener('DOMContentLoaded', async () => {
  buildCategorySelect();
  await initSiteNav({ requireAuth: true });
  await loadReports();
});
