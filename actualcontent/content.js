// Active article detection
console.log('Article Annotator content script loaded');

 function showNotification(message) {
    let notification = document.getElementById(
        'article-annotator-notification'
    );

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'article-annotator-notification';

        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 320px;
            background: #222;
            color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font: 14px/1.5 Arial, sans-serif;
            z-index: 2147483647;
            `;

            document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';

    clearTimeout(notification_hideTimeout);
    notification_hideTimeout = setTimeout(() => {
        notification.style.display = 'none';
    }, 2500);
}

function detectArticle() {
    // Get the main article content
    const article = document.querySelector('article') || 
                   document.querySelector('main') || 
                   document.querySelector('.article-content') || 
                   document.querySelector('.post-content') ||
                   document.querySelector('[role="main"]');
    
    if (article) {
        // Extract text content
        const textContent = article.innerText || article.textContent || '';
        
        // Store the article content
        chrome.storage.local.set({ 
            currentArticle: {
                content: textContent,
                url: window.location.href,
                title: document.title,
                timestamp: Date.now()
                
            }
        }, () => {
        console.log('Article detected and saved');

        showNotification(
            'Article detected successfully!'
        );
    });
    } else {
        showNotification('No article found on this page');
    }
}

// Quick action - Highlight mode
let isHighlightMode = false;

function highlightMode() {
    isHighlightMode = !isHighlightMode;

    if (isHighlightMode) {
        showNotification('Highlight mode activated - Select text to highlight');
        document.removeEventListener("mouseup", handleHighlight);
        document.addEventListener("mouseup", handleHighlight);
    } else {
        showNotification('Highlight mode deactivated');
        document.removeEventListener("mouseup", handleHighlight);
    }
}

function handleHighlight() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
        return;
    }

    const selectedText = selection.toString().trim();

    if (!selectedText) {
        return;
    }

    const range = selection.getRangeAt(0);

    const mark = document.createElement('mark');

    mark.style.backgroundColor = '#ffeb3b';
    mark.style.color = '#000';
    mark.style.padding = '2px 0';
    mark.style.borderRadius = '2px';

    try {
        range.surroundContents(mark);

        saveHighlight(selectedText);
console.log('Highlight handler called:', selectedText);
        showNotification('Text highlighted!');

        selection.removeAllRanges();
    } catch (error) {
        console.error('Highlight error:', error);

        showNotification(
            'Could not highlight that selection. Try selecting text within one paragraph.'
        );
    }
}
    


function saveHighlight(text) {
    chrome.storage.local.get({ highlights: [] }, (data) => {
        if(chrome.runtime.lastError){
            console.error('Could not load highlights:', chrome.runtime.lastError.message);
            return;
        }
        const highlights = data.highlights;
        highlights.push({
            text: text,
            url: window.location.href,  // Fixed: semicolon to comma
            title: document.title,      // Fixed: semicolon to comma
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 9) // Unique ID
        });
        chrome.storage.local.set({ highlights }, () => {
            if (chrome.runtime.lastError) {
                console.error('Could not save highlight:', chrome.runtime.lastError.message);
                return;
            }
            console.log('Highlight saved:', text.substring(0, 50) + '...');
        });
    });
}



// Define mode - Dictionary 
// ===============================
// Definition Mode
// ===============================

let isDefineMode = false;

function toggleDefineMode() {
    isDefineMode = !isDefineMode;

        console.log('Define mode is now:', isDefineMode);

    if (isDefineMode) {
        showNotification(
            'Definition mode activated - double-click a word'
        );

        document.removeEventListener('dblclick', handleDefinition);
        document.addEventListener('dblclick', handleDefinition);
    } else {
        showNotification('Definition mode deactivated');

        document.removeEventListener('dblclick', handleDefinition);

        removeDefinitionPopup();
    }
}

function handleDefinition(event) {

    if (!isDefineMode) {
        return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
        return;
    }

    const word = selection.toString().trim();

    // Only define a single word
    if (!word || /\s/.test(word)) {
        return;
    }

    // Remove punctuation around the word
    const cleanWord = word
        .replace(/^[^\w'-]+|[^\w'-]+$/g, '')
        .toLowerCase();

    if (!cleanWord || /\s/.test(cleanWord)) {
        return;
    }

    showDefinitionPopup(
        cleanWord,
        'Looking up definition...',
        event.clientX,
        event.clientY
    );

    // Ask the extension service worker to fetch the definition
    chrome.runtime.sendMessage(
        {
            action: 'defineWord',
            word: cleanWord
        },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(
                    'Definition request error:',
                    chrome.runtime.lastError.message
                );

                return;
            }

    
                const definition =
                response?.definition ||
                response?.meaning ||
                response?.text;

            if (!definition) {
                showDefinitionPopup(
                    cleanWord,
                    response?.error || 'No definition returned.',
                    event.clientX,
                    event.clientY
                );
                return;
            }

            showDefinitionPopup(
                cleanWord,
                definition,
                event.clientX,
                event.clientY
            );
        }
    );
}

        

    
 
function showDefinitionPopup(word, definition, x, y) {
    removeDefinitionPopup();

    const popup = document.createElement('div');

    popup.id = 'definition-popup';

    popup.style.cssText = `
        position: fixed;
        left: ${Math.min(x + 10, window.innerWidth - 330)}px;
        top: ${Math.max(y - 80, 10)}px;
        width: 280px;
        background: #ffffff;
        color: #222222;
        border: 1px solid #dcdcdc;
        border-radius: 10px;
        padding: 14px 38px 14px 16px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
        z-index: 2147483647;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-sizing: border-box;
    `;

    const title = document.createElement('div');

    title.textContent = word;

    title.style.cssText = `
        font-size: 16px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 6px;
    `;

    const text = document.createElement('div');

    text.textContent = definition;

    text.style.cssText = `
        color: #374151;
    `;

    const closeButton = document.createElement('button');

    closeButton.textContent = '×';

    closeButton.style.cssText = `
        position: absolute;
        top: 5px;
        right: 8px;
        border: none;
        background: transparent;
        color: #888;
        font-size: 20px;
        cursor: pointer;
        padding: 2px 5px;
        line-height: 1;
    `;

    closeButton.addEventListener('click', () => {
        popup.remove();
    });

    popup.appendChild(title);
    popup.appendChild(text);
    popup.appendChild(closeButton);

    document.body.appendChild(popup);

    // Remove after 8 seconds
    setTimeout(() => {
        if (popup.parentElement) {
            popup.remove();
        }
    }, 8000);
}

function removeDefinitionPopup() {
    const popup = document.getElementById('definition-popup');

    if (popup) {
        popup.remove();
    }
}


// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize - check for article on page load
document.addEventListener('DOMContentLoaded', () => {
    // Optional: Auto-detect article on page load
    setTimeout(detectArticle, 1000);
});

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return;
    const action = message.action || message.type;
    console.log('content script received message:', action, message);
    switch (action) {
        case 'detectArticle':
    detectArticle();
    sendResponse({
        status: 'ok'
    });
    break;

        case 'toggleHighlight':
            highlightMode();
            sendResponse({ status: 'ok' });
            break;
       

        case 'toggleDefine':
            toggleDefineMode();
            sendResponse({ status: 'ok' });
            break;
        case 'highlightSelectedText':
        case 'highlight-selected-text':
            if (message.text) saveHighlight(message.text);
            sendResponse({ status: 'ok' });
            break;
    }
    return true;
});

// Cleanup listeners when extension is disabled
//window.addEventListener('unload', () => {
//    document.removeEventListener("mouseup", handleHighlight);
//    document.removeEventListener("dblclick", handleDefinition);
//});
