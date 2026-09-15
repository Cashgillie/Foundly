import {
  listPublicReports, listMyBookmarkedItems, normalizeReports, filterAndSort, renderItems, showToast,
  closeDetailModal, getCurrentDetailItem, openReportModal, closeModal,
  openEditLinkModal, closeEditLinkModal, submitLostReportForm,
  openSuspiciousModal, closeSuspiciousModal, reportSuspiciousPost,
  addBookmark, removeBookmark, listMyBookmarkIds,
  CATEGORIES, escapeHtml
} from './foundly-data.js';
import { initSiteNav, getCurrentUser } from './site-nav.js';

const HOME_PREVIEW = 9;
let currentView = 'all';      // all | lost | found | bookmarks
let currentCategory = 'all';
let showingAll = false;
let allItems = [];            // every active lost+found report (contact hidden)
let bookmarkedItems = [];     // full bookmarked item objects (for the Bookmarks tab)
let bookmarkedIds = new Set();

function buildCategoryUI() {
  const select = document.getElementById('drpdwn');
  const pillsWrap = document.getElementById('categoryPills');
  const icons = { electronics: 'laptop', id: 'id-card', bags: 'bag-shopping', keys: 'key', phones: 'mobile-alt', wallets: 'wallet', jewelry: 'gem', pets: 'paw', other: 'tag' };
  if (select) {
    select.innerHTML = `<option value="">All Categories</option>` +
      CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
  }
  if (pillsWrap) {
    pillsWrap.innerHTML = `<div class="pill active" onclick="filterByCategory('all', this)"><i class="fas fa-border-all"></i> All Items</div>` +
      CATEGORIES.map(c => `<div class="pill" onclick="filterByCategory('${c.value}', this)"><i class="fas fa-${icons[c.value] || 'tag'}"></i> ${c.label}</div>`).join('');
  }
}

async function loadItems() {
  const [items, bookmarks] = await Promise.all([
    listPublicReports({}),
    listMyBookmarkedItems().catch(() => [])
  ]);
  allItems = normalizeReports(items);
  bookmarkedItems = bookmarks;
  bookmarkedIds = new Set(bookmarkedItems.map(i => i.id));
  updateTabCounts();
  refreshGrid();
}

function updateTabCounts() {
  document.getElementById('countAll').textContent = allItems.length;
  document.getElementById('countLost').textContent = allItems.filter(i => i.type === 'lost').length;
  document.getElementById('countFound').textContent = allItems.filter(i => i.type === 'found').length;
  document.getElementById('countBookmarks').textContent = bookmarkedItems.length;
}

function sourceForCurrentView() {
  if (currentView === 'bookmarks') return bookmarkedItems;
  if (currentView === 'lost') return allItems.filter(i => i.type === 'lost');
  if (currentView === 'found') return allItems.filter(i => i.type === 'found');
  return allItems;
}

function getFiltered() {
  const term = document.getElementById('searchInput')?.value || '';
  const cat = currentCategory !== 'all' ? currentCategory : (document.getElementById('drpdwn')?.value || '');
  return filterAndSort(sourceForCurrentView(), { category: cat, searchTerm: term });
}

function refreshGrid() {
  const filtered = getFiltered();
  const toShow = (showingAll || currentView !== 'all') ? filtered : filtered.slice(0, HOME_PREVIEW);
  renderItems(toShow, 'itemsGrid', bookmarkedIds);
  wireBookmarkButtons();
}

function setViewTab(view) {
  currentView = view;
  showingAll = false;
  document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  refreshGrid();
}

function applyFilters() { refreshGrid(); }

function filterByCategory(cat, el) {
  currentCategory = cat;
  document.querySelectorAll('#categoryPills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  refreshGrid();
}

// ─── Bookmark toggling ───────────────────────────────────────────
async function toggleBookmarkFor(id) {
  try {
    if (bookmarkedIds.has(id)) {
      await removeBookmark(id);
      showToast('Bookmark removed', '');
    } else {
      await addBookmark(id);
      showToast('Bookmarked!', 'success');
    }
    const bookmarks = await listMyBookmarkedItems();
    bookmarkedItems = bookmarks;
    bookmarkedIds = new Set(bookmarkedItems.map(i => i.id));
    updateTabCounts();
    refreshGrid();
  } catch (err) {
    showToast(err.message || 'Could not update bookmark.', 'error');
  }
}

function wireBookmarkButtons() {
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmarkFor(btn.dataset.bookmarkId);
    });
  });
}

async function refreshDetailBookmarkBtn() {
  const item = getCurrentDetailItem();
  const btn = document.getElementById('detailBookmarkBtn');
  if (!item || !btn) return;
  const bookmarked = bookmarkedIds.has(item.id);
  btn.innerHTML = bookmarked ? '<i class="fas fa-bookmark"></i> Bookmarked' : '<i class="far fa-bookmark"></i> Bookmark';
}

document.getElementById('detailBookmarkBtn')?.addEventListener('click', async () => {
  const item = getCurrentDetailItem();
  if (!item) return;
  await toggleBookmarkFor(item.id);
  await refreshDetailBookmarkBtn();
});

document.getElementById('detailSuspiciousBtn')?.addEventListener('click', () => {
  const item = getCurrentDetailItem();
  if (!item) return;
  closeDetailModal();
  openSuspiciousModal(item.id);
});

document.getElementById('suspiciousForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  try {
    await reportSuspiciousPost({
      reportId: document.getElementById('suspiciousReportId').value,
      reason: document.getElementById('suspiciousReason').value,
      details: document.getElementById('suspiciousDetails').value,
      reporterContact: document.getElementById('suspiciousContact').value
    });
    closeSuspiciousModal();
    showToast('Thanks — our team will review this listing.', 'success');
  } catch (err) {
    showToast(err.message || 'Could not submit report.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

// ─── Report a Lost Item (popup) ──────────────────────────────────
async function handleOpenReportModal() {
  const user = await getCurrentUser();
  const emailInput = document.getElementById('itemEmail');
  if (user && emailInput && !emailInput.value) emailInput.value = user.email || '';
  openReportModal();
}

document.getElementById('reportForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const original = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  const category = document.getElementById('itemCategory').value;
  const title = document.getElementById('itemTitle').value;
  const description = document.getElementById('itemDescription').value;
  const location = document.getElementById('itemLocation').value;
  const contact = document.getElementById('itemEmail').value;

  try {
    const result = await submitLostReportForm({ category, title, description, location, contact });
    document.getElementById('reportForm').reset();
    closeModal();
    showToast('Item reported successfully! Check your email for a confirmation.', 'success');
    openEditLinkModal(result.editLink, contact);
    await loadItems();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error saving item. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = original;
  }
});

function copyEditLink() {
  const input = document.getElementById('editLinkInput');
  input.select();
  navigator.clipboard?.writeText(input.value).then(
    () => showToast('Link copied!', 'success'),
    () => document.execCommand('copy')
  );
}

// ─── FAQ ──────────────────────────────────────────────────────
const FAQS = [
  { q: 'Who can report a lost item?', a: 'Anyone with a Foundly account. Register for free, then report the item you lost — it\'ll show up under the Lost tab (with your contact hidden from other users).' },
  { q: 'Who adds items to the Found tab?', a: 'Only the Foundly office team. If you find something, please bring it to the Lost & Found Department — don\'t create a public "found" listing yourself.' },
  { q: 'Why can\'t I see the reporter\'s or finder\'s email?', a: 'To protect everyone\'s privacy and prevent false ownership claims, contact details are only visible to the Foundly office. If there\'s a match, the office contacts you directly, or you visit in person.' },
  { q: 'I think I found a match — what do I do?', a: 'Come to the Foundly office and describe the item in full detail, including anything you left out of your report. Once our team confirms it\'s really yours, they\'ll hand it over and mark the report resolved.' },
  { q: 'Do I need an account to use Foundly?', a: 'Yes — you\'ll need to log in before you can see or use anything on the site. Accounts let us tie reports to you for "My Reports", email you updates, and keep the office\'s process accountable.' },
  { q: 'Can I edit or remove my report?', a: 'Yes, two ways: use the private edit link emailed to you when you reported it, or log in and manage it from "My Reports". Both let you update details, mark it resolved, or delete it — until it\'s been resolved.' },
  { q: 'What if I see a suspicious or fake listing?', a: 'Open the item and click "Report Suspicious". Our team reviews every flagged listing.' },
  { q: 'What categories of items can I report?', a: 'Phones, electronics, ID cards, bags, keys, wallets, jewelry, pets, and other. If your item doesn\'t fit a category, use "Other" and describe it clearly.' }
];

function buildFAQ() {
  const container = document.getElementById('faqList');
  if (!container) return;
  container.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item">
      <div class="faq-question" onclick="toggleFAQ(${i}, this)">
        <span>${escapeHtml(f.q)}</span>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="faq-answer" id="faq-ans-${i}">${escapeHtml(f.a)}</div>
    </div>
  `).join('');
}

function toggleFAQ(idx, el) {
  const ans = document.getElementById(`faq-ans-${idx}`);
  const isOpen = ans.classList.contains('open');
  document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('open'));
  if (!isOpen) {
    ans.classList.add('open');
    el.classList.add('open');
  }
}

Object.assign(window, {
  applyFilters, filterByCategory, setViewTab, closeDetailModal, closeModal,
  closeSuspiciousModal, closeEditLinkModal, copyEditLink, toggleFAQ,
  openReportModal: handleOpenReportModal
});

document.addEventListener('DOMContentLoaded', async () => {
  buildCategoryUI();
  document.getElementById('itemCategory').innerHTML = CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
  await initSiteNav({ requireAuth: true });
  await loadItems();
  buildFAQ();

  document.getElementById('searchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyFilters();
  });

  // Deep-link support: index.html?type=lost / ?type=found / ?type=bookmarks, ?report=1
  const params = new URLSearchParams(location.search);
  const type = params.get('type');
  if (type && ['lost', 'found', 'bookmarks'].includes(type)) setViewTab(type);
  if (params.get('report') === '1') handleOpenReportModal();
  if (type || params.get('report')) history.replaceState(null, '', location.pathname);

  const detailModalEl = document.getElementById('detailModal');
  if (detailModalEl) {
    const observer = new MutationObserver(() => {
      if (detailModalEl.classList.contains('active')) refreshDetailBookmarkBtn();
    });
    observer.observe(detailModalEl, { attributes: true, attributeFilter: ['class'] });
  }
});
