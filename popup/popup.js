document.addEventListener('DOMContentLoaded', () => {
  // Load saved highlights
  chrome.storage.local.get({ highlights: [] }, (data) => {
    const container = document.getElementById('highlights-list');

    if (!container) {
      return;
    }

    data.highlights.reverse().forEach((h) => {
      const item = document.createElement('li');
      item.className = 'highlight-item';

      const text = document.createElement('p');
      text.textContent = h.text || '';

      const title = document.createElement('small');
      title.textContent = h.title || '';

      item.appendChild(text);
      item.appendChild(title);
      container.appendChild(item);
    });
  });

  // Send message to content script
  function sendMessageToActiveTab(message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true
      },
      (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const tab = tabs[0];

        if (!tab || !tab.id) {
          reject(new Error('No active tab found.'));
          return;
        }

        // Chrome pages cannot run normal content scripts.
        if (
          tab.url &&
          (
            tab.url.startsWith('chrome://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')
          )
        ) {
          reject(
            new Error(
              'Article Annotator cannot run on this type of page.'
            )
          );
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          message,
          (response) => {
            if (chrome.runtime.lastError) {
              reject(
                new Error(
                  chrome.runtime.lastError.message
                )
              );
              return;
            }

            resolve(response);
          }
        );
      }
    );
  });
}


  // Detect article button
  const detectBtn = document.getElementById('detect-article');

if (detectBtn) {
  detectBtn.addEventListener('click', async () => {
    try {
      detectBtn.disabled = true;
      detectBtn.textContent = 'Detecting...';

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      const tab = tabs[0];

      if (!tab || !tab.id) {
        throw new Error('No active tab found.');
      }

      const results = await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: () => {
          const article =
            document.querySelector('article') ||
            document.querySelector('main') ||
            document.querySelector('[role="main"]') ||
            document.querySelector('.article-content') ||
            document.querySelector('.post-content');

          if (!article) {
            return {
              found: false
            };
          }

          return {
            found: true,
            content: (
              article.innerText ||
              article.textContent ||
              ''
            ).trim(),
            title: document.title,
            url: window.location.href
          };
        }
      });

      const article = results?.[0]?.result;

      if (!article?.found) {
        throw new Error(
          'No article could be detected on this page.'
        );
      }

      await chrome.storage.local.set({
        currentArticle: {
          content: article.content,
          url: article.url,
          title: article.title,
          timestamp: Date.now()
        }
      });

      const title =
        document.getElementById('article-title');

      if (title) {
        title.textContent = article.title;
      }

      detectBtn.textContent = 'Article Detected!';

    } catch (error) {
      console.error(
        'Detect Article error:',
        error
      );

      alert(
        'Could not detect the article:\n\n' +
        error.message
      );

      detectBtn.textContent =
        'Detect Current Article';

    } finally {
      detectBtn.disabled = false;
    }
  });
}


  // Highlight mode button
  const highlightBtn = document.getElementById('highlight-mode');

  if (highlightBtn) {
    highlightBtn.addEventListener('click', () => {
      sendMessageToActiveTab({
        action: 'toggleHighlight'
      });
    });
  }

  // Summarize button
const summarizeBtn = document.getElementById('summarize-btn');
const output = document.getElementById('output');

if (summarizeBtn) {
  summarizeBtn.addEventListener('click', async () => {
    try {
      if (output) {
        output.textContent = 'Generating summary...';
      }

      // Check whether Chrome's built-in Summarizer API exists
      if (!('Summarizer' in self)) {
        throw new Error(
          'Chrome Summarizer API is not available in this browser.'
        );
      }

      // Check whether the model is available
      const availability =
  await Summarizer.availability();

console.log(
  'Summarizer availability:',
  availability
);

if (availability === 'unavailable') {
  throw new Error(
    'The AI Summarizer is not available on this device.'
  );
}

if (output) {
  if (availability === 'downloadable') {
    output.textContent =
      'AI model needs to download. Starting download...';
  } else if (availability === 'downloading') {
    output.textContent =
      'AI model is downloading...';
  }
}


      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tabs[0] || !tabs[0].id) {
        throw new Error('No active tab found.');
      }

      const results = await chrome.scripting.executeScript({
        target: {
          tabId: tabs[0].id
        },
        func: () => {
  const article =
    document.querySelector('article') ||
    document.querySelector('main') ||
    document.querySelector('[role="main"]');

  const text =
    article?.innerText ||
    document.body?.innerText ||
    '';

  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

      });

      const pageText = results?.[0]?.result;

      if (!pageText || pageText.trim().length < 50) {
        throw new Error(
          'There is not enough text on this page to summarize.'
        );
      }

      // Create the built-in Chrome AI summarizer
      if (output) {
  output.textContent =
    'AI model downloaded. Initializing summarizer...';
}

const summarizer = await Summarizer.create({
  type: 'key-points',
  format: 'markdown',
  length: 'medium'
});

if (output) {
  output.textContent =
    'AI model ready. Generating summary...';
}

console.log('Sending text to Summarizer:', pageText.length);


      const summary = await summarizer.summarize(
      pageText,
      {
        context: 'Summarize this article clearly. Focus on the main ideas, important facts, and conclusions.'
      }
);
console.log('Summary returned:', summary);


      if (output) {
        output.textContent = summary;
      }

      // Clean up
      if (summarizer.destroy) {
        summarizer.destroy();
      }

    } catch (error) {
      console.error('AI Summary error:', error);

      if (output) {
        output.textContent =
          'Unable to generate summary: ' +
          (error?.message || error);
      }
    }
  });
}


  // Define button
  const defineBtn = document.getElementById('define-btn');

  if (defineBtn) {
    defineBtn.addEventListener('click', () => {
      sendMessageToActiveTab({
        action: 'toggleDefine'
      });
    });
  }

  // Clear highlights button
  const clearBtn = document.getElementById('clear-data');

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmed = confirm(
        'Are you sure you want to clear all saved highlights?'
      );

      if (!confirmed) {
        return;
      }

      chrome.storage.local.remove('highlights', () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error clearing highlights:',
            chrome.runtime.lastError.message
          );
          return;
        }

        const container =
          document.getElementById('highlights-list');

        if (container) {
          container.innerHTML = '';
        }

        console.log('All highlights cleared');
      });
    });
  }
});

