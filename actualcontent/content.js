//active article
var detectButton = document.getElementById("detect-article");
detectButton.addEventListener("click", detectArticle);

function detectArticle() {

}

//quick action
var highlightButton = document.getElementById("highlight-article");
highlightButton.addEventListener("click", highlightMode);

function highlightMode() {
    document.addEventListener("mouseup", () => {
        const selection = window.getSelection().toString().trim();
        if (selection.length > 0) {
            saveHighlight(selection);
        }
    });
}

function saveHighlight(text) {
    chrome.storage.local.get({ highlights:[] },(data)=> {
        const highlights = data.highlights;
        highlights.push({
            text,
            url: window.location.href;
            title: document.title;
            timestamp: Date.now()

        });
        chrome.storage.local.set({ highlights }); 
    });

}


var summarizeButton = document.getElementById("summarize-btn");
summarizeButton.addEventListener("click", summarizeMode);

function summarizeMode() {
    // Implementation for summarizing article
}

var defineMode = document.getElementById("define-btn");
defineMode.addEventListener("click", defineMode);

function defineMode() {

}

