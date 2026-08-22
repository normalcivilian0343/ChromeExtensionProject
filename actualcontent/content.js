// Active article detection
console.log('Article Annotator content script loaded');
function detectArticle() {
    // Get the main article content
    const article = document.querySelector('article') || 
                   document.querySelector('main') || 
                   document.querySelector('.article-content') || 
                   document.querySelector('.post-content') ||
                   document.querySelector('[role="main"]');
    
    if (article) {
        // Extract text content
        const textContent = article.innerText || article.textContent;
        
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

            showNotification('Article detected successfully!');
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
        const highlights = data.highlights;
        highlights.push({
            text: text,
            url: window.location.href,  // Fixed: semicolon to comma
            title: document.title,      // Fixed: semicolon to comma
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 9) // Unique ID
        });
        chrome.storage.local.set({ highlights }, () => {
            console.log('Highlight saved:', text.substring(0, 50) + '...');
        });
    });
}

// Summarize function
function summarizeMode() {
    // Get the article content
    chrome.storage.local.get(['currentArticle'], (data) => {
        const article = data.currentArticle;
        
        if (!article || !article.content) {
            showNotification('No article detected. Click "Detect Article" first.');
            return;
        }
        
        
        const content = article.content;
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        const summary = sentences.slice(0, 3).join(' '); // First 3 sentences
        
        // Store summary
        chrome.storage.local.set({ 
            currentSummary: {
                text: summary,
                url: window.location.href,
                title: document.title,
                timestamp: Date.now()
            }
        }, () => {
            // Open popup 
            showNotification('Summary created! Click the extension icon to view.');
            console.log('Summary:', summary);
            
            // Send message to background script to open popup
            chrome.runtime.sendMessage({ action: 'showSummary', summary: summary });
        });
    });
}

// Define mode - Dictionary 
let isDefineMode = false;

function toggleDefineMode() {
    isDefineMode = !isDefineMode;

    if (isDefineMode) {
        showNotification('Definition mode activated - Double-click any word');
        document.removeEventListener("dblclick", handleDefinition);
        document.addEventListener("dblclick", handleDefinition);
    } else {
        showNotification('Definition mode deactivated');
        document.removeEventListener("dblclick", handleDefinition);
    }
}

function handleDefinition(event) {
    const selection = window.getSelection().toString().trim();
    
    if (selection.length > 0 && selection.split(' ').length === 1) {
        // Single word selected
        const word = selection.toLowerCase();
        
        // Use Dictionary API
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
            .then(response => {
                if (!response.ok) throw new Error('Word not found');
                return response.json();
            })
            .then(data => {
                const definition = data[0].meanings[0].definitions[0].definition;
                showDefinitionPopup(word, definition, event.clientX, event.clientY);
            })
            .catch(error => {
                showDefinitionPopup(word, 'Definition not found', event.clientX, event.clientY);
            });
    }
}

// Helper function to show definition popup
function showDefinitionPopup(word, definition, x, y) {
    // Remove any existing popup
    const existingPopup = document.getElementById('definition-popup');
    if (existingPopup) existingPopup.remove();
    
    const popup = document.createElement('div');
    popup.id = 'definition-popup';
    popup.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y - 10}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 12px 16px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
    `;
    
    popup.innerHTML = `
        <strong style="color: #2c3e50; display: block; margin-bottom: 4px;">${word}</strong>
        <span style="color: #34495e;">${definition}</span>
        <button onclick="this.parentElement.remove()" style="
            position: absolute;
            top: 4px;
            right: 8px;
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: #999;
        ">×</button>
    `;
    
    document.body.appendChild(popup);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (popup.parentElement) popup.remove();
    }, 5000);
}

// Helper function to show notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
        max-width: 350px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
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
            sendResponse({ status: 'ok' });
            break;
        case 'toggleHighlight':
            highlightMode();
            sendResponse({ status: 'ok' });
            break;
        case 'summarize':
            summarizeMode();
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
window.addEventListener('unload', () => {
    document.removeEventListener("mouseup", handleHighlight);
    document.removeEventListener("dblclick", handleDefinition);
});
