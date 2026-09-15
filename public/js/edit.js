import {
  fetchReportByToken, updateReportByToken, resolveReportByToken, deleteReportByToken,
  showToast, CATEGORIES
} from './foundly-data.js';

const params = new URLSearchParams(location.search);
const reportId = params.get('id');
const editToken = params.get('token');

document.getElementById('editCategory').innerHTML = CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');

function show(id) {
  ['loadingState', 'invalidState', 'editPanel'].forEach(s => {
    document.getElementById(s).style.display = s === id ? '' : 'none';
  });
}

function populateForm(item) {
  document.getElementById('editTitle').value = item.title;
  document.getElementById('editCategory').value = item.category;
  document.getElementById('editLocation').value = item.location;
  document.getElementById('editDescription').value = item.description;
  document.getElementById('editContact').value = item.contact;

  const pill = document.getElementById('statusPill');
  pill.textContent = item.status.charAt(0).toUpperCase() + item.status.slice(1);
  pill.className = `status-pill status-${item.status}`;

  const locked = item.status === 'resolved' || item.status === 'deleted';
  const lockedNotice = document.getElementById('lockedNotice');
  const lockedNoticeText = document.getElementById('lockedNoticeText');
  if (locked) {
    lockedNotice.style.display = 'block';
    lockedNoticeText.textContent = item.status === 'resolved'
      ? 'This report has been resolved — nice! The edit link no longer makes changes.'
      : 'This report has been deleted and is no longer visible to the public. The edit link no longer makes changes.';
  } else {
    lockedNotice.style.display = 'none';
  }

  document.getElementById('saveBtn').disabled = locked;
  document.getElementById('resolveBtn').disabled = locked;
  document.getElementById('deleteBtn').disabled = locked;
  document.querySelectorAll('#editForm input, #editForm select, #editForm textarea').forEach(el => { el.disabled = locked; });
}

async function loadReport() {
  if (!reportId || !editToken) {
    show('invalidState');
    return;
  }
  try {
    const item = await fetchReportByToken(reportId, editToken);
    populateForm(item);
    show('editPanel');
  } catch (err) {
    console.error(err);
    show('invalidState');
  }
}

async function handleSave(event) {
  event.preventDefault();
  const saveBtn = document.getElementById('saveBtn');
  const original = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const updates = {
      title: document.getElementById('editTitle').value,
      category: document.getElementById('editCategory').value,
      location: document.getElementById('editLocation').value,
      description: document.getElementById('editDescription').value,
      contact: document.getElementById('editContact').value
    };
    await updateReportByToken(reportId, editToken, updates);
    showToast('✅ Changes saved!', 'success');
    await loadReport();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Could not save changes. Check your link and try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = original;
  }
}

async function handleResolve() {
  if (!confirm('Mark this report as resolved? This means you already identified and collected the item at the office. The edit link will stop working after this.')) return;
  try {
    await resolveReportByToken(reportId, editToken);
    showToast('🎉 Marked as resolved!', 'success');
    await loadReport();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Could not update status.', 'error');
  }
}

async function handleDelete() {
  if (!confirm('Delete this report? It will no longer be visible to anyone, and the edit link will stop working.')) return;
  try {
    await deleteReportByToken(reportId, editToken);
    showToast('Report deleted.', '');
    await loadReport();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Could not delete report.', 'error');
  }
}

document.getElementById('editForm').addEventListener('submit', handleSave);
Object.assign(window, { handleResolve, handleDelete });

loadReport();
