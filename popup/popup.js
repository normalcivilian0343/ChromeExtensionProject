document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get({ highlights: [] }, (data) => {
    const container = document.getElementById('highlights-list');
    data.highlights.reverse().forEach(h => {
      const item = document.createElement('div');
      item.className = 'highlight-item';
      item.innerHTML = `<p>${escapeHtml(h.text)}</p><small>${h.title}</small>`;
      container.appendChild(item);
    });
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}