const params = new URLSearchParams(location.search);
const next = params.get('next') || 'index.html';

document.getElementById('continueBtn').addEventListener('click', () => {
  window.location.href = next;
});
