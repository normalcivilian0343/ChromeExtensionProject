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
  // Wire popup buttons to content script
  function sendMessageToActiveTab(message) {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        console.error('No active tab found');
        return;
      }

      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(
        tabId,
        message,
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              'Content script error:',
              chrome.runtime.lastError.message
            );

            alert(
              'The Article Annotator content script is not loaded on this page. Please refresh the page and try again.'
            );

            return;
          }

          console.log('Content script response:', response);
        }
      );
    }
  );
}


  const detectBtn = document.getElementById('detect-article');
  if (detectBtn) detectBtn.addEventListener('click', () => sendMessageToActiveTab({ action: 'detectArticle' }));

  const highlightBtn = document.getElementById('highlight-mode');
  if (highlightBtn) highlightBtn.addEventListener('click', () => sendMessageToActiveTab({ action: 'toggleHighlight' }));

  const summarizeBtn = document.getElementById('summarize-btn');
  if (summarizeBtn) summarizeBtn.addEventListener('click', () => sendMessageToActiveTab({ action: 'summarize' }));

  const defineBtn = document.getElementById('define-btn');
  if (defineBtn) defineBtn.addEventListener('click', () => sendMessageToActiveTab({ action: 'toggleDefine' }));
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
