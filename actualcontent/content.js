// Active article detection
var detectButton = document.getElementById("detect-article");
detectButton.addEventListener("click", detectArticle);

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
var highlightButton = document.getElementById("highlight-article");
highlightButton.addEventListener("click", highlightMode);

let isHighlightMode = false;

function highlightMode() {
    isHighlightMode = !isHighlightMode;
    
    if (isHighlightMode) {
        showNotification('Highlight mode activated - Select text to highlight');
        highlightButton.textContent = 'Stop Highlighting';
        highlightButton.style.backgroundColor = '#ff6b6b';
        
        document.removeEventListener("mouseup", handleHighlight);
        document.addEventListener("mouseup", handleHighlight);
    } else {
        showNotification('Highlight mode deactivated');
        highlightButton.textContent = 'Highlight Mode';
        highlightButton.style.backgroundColor = '';
        document.removeEventListener("mouseup", handleHighlight);
    }
}

function handleHighlight() {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) {
        saveHighlight(selection);
        showNotification('Text highlighted!');
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
var summarizeButton = document.getElementById("summarize-btn");
summarizeButton.addEventListener("click", summarizeMode);

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
var defineBtn = document.getElementById("define-btn");
defineBtn.addEventListener("click", toggleDefineMode);

let isDefineMode = false;

function toggleDefineMode() {
    isDefineMode = !isDefineMode;
    
    if (isDefineMode) {
        showNotification('Definition mode activated - Double-click any word');
        defineBtn.textContent = 'Stop Definition';
        defineBtn.style.backgroundColor = '#4ecdc4';
        
        document.removeEventListener("dblclick", handleDefinition);
        document.addEventListener("dblclick", handleDefinition);
    } else {
        showNotification('Definition mode deactivated');
        defineBtn.textContent = 'Define Mode';
        defineBtn.style.backgroundColor = '';
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

// Cleanup listeners when extension is disabled
window.addEventListener('unload', () => {
    document.removeEventListener("mouseup", handleHighlight);
    document.removeEventListener("dblclick", handleDefinition);
});
