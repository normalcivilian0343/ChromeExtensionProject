//when popup is opened
document.addEventListener('DOMContentLoaded', () => {
 // DOM elements
 const articleTitleEl = document.getElementById('article-title');
 const detectBtn = document.getElementById('detect-article');
 const highlightBtn = document.getElementById('highlight-mode');
 const summarizeBtn = document.getElementById('summarize-btn');
 const defineBtn = document.getElementById('define-btn');
 const highlightsList = document.getElementById('highlights-list');
 const noteInput = document.getElementById('note-input');
 const saveNoteBtn = document.getElementById('save-note');
 const notesList = document.getElementById('notes-list');
 const clearDataBtn = document.getElementById('clear-data');
 const wordCountEl = document.getElementById('word-count');


 // State
 let currentArticle = {
   title: 'No article detected',
   url: ''
 };


 // ----- Helper functions -----

// Update article title in popup

 function updateArticleTitle(article) {
   if (article && article.title) {
     articleTitleEl.textContent = article.title;} 
   else {
     articleTitleEl.textContent = 'No article detected';}
   currentArticle = article || { title: 'No article detected', url: '' };
 }

 // Refresh all UI from storage
 async function refreshUI() {
   const data = await loadData();
   updateArticleTitle(data.article);
   renderHighlights(data.highlights);
   renderNotes(data.notes);
   updateWordCount(data.highlights, data.notes);
  }

 // Detect current article (get title from active tab)
 async function detectCurrentArticle() {
   try {
     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     if (!tab) {
       articleTitleEl.textContent = 'No active tab';
       return;
     }
     // Try to get the title from the tab
     let title = tab.title || 'Untitled';
     // Also try to get more info via content script if possible
     // For simplicity, we'll just use the tab title and URL
     const article = {
       title: title,
       url: tab.url || ''
     };
     // Save to storage
     const data = await loadData();
     await saveData(data.highlights, data.notes, article);
     updateArticleTitle(article);
   } catch (error) {
     console.error('Error detecting article:', error);
     articleTitleEl.textContent = 'Error detecting article';
   }
 }
      

 // Load data from chrome.storage.local
 function loadData() {
   return new Promise((resolve) => {
     chrome.storage.local.get(['highlights', 'notes', 'article'], (result) => {
       resolve({
         highlights: result.highlights || [],
         notes: result.notes || [],
         article: result.article || { title: 'No article detected', url: '' }
       });
     });
   });
 }


 // Save data to chrome.storage.local
 function saveData(highlights, notes, article) {
   return new Promise((resolve) => {
     chrome.storage.local.set({ highlights, notes, article }, resolve);
   });
 }


 // Render highlights list
 function renderHighlights(highlights) {
   highlightsList.innerHTML = '';
   if (!highlights || highlights.length === 0) {
     const li = document.createElement('li');
     li.className = 'empty-message';
     li.textContent = 'No highlights yet';
     highlightsList.appendChild(li);
     return;
   }
   highlights.forEach((text, index) => {
     const li = document.createElement('li');
     li.textContent = text;
     // Add a delete button for each highlight
     const deleteBtn = document.createElement('button');
     deleteBtn.textContent = '✕';
     deleteBtn.className = 'delete-highlight';
     deleteBtn.dataset.index = index;
     deleteBtn.addEventListener('click', (e) => {
       e.stopPropagation();
       removeHighlight(index);
     });
     li.appendChild(deleteBtn);
     highlightsList.appendChild(li);
   });
 }


 // Render notes list
 function renderNotes(notes) {
   notesList.innerHTML = '';
   if (!notes || notes.length === 0) {
     const li = document.createElement('li');
     li.className = 'empty-message';
     li.textContent = 'No notes saved';
     notesList.appendChild(li);
     return;
   }
   notes.forEach((note, index) => {
     const li = document.createElement('li');
     li.textContent = note;
     // Add a delete button for each note
     const deleteBtn = document.createElement('button');
     deleteBtn.textContent = '✕';
     deleteBtn.className = 'delete-note';
     deleteBtn.dataset.index = index;
     deleteBtn.addEventListener('click', (e) => {
       e.stopPropagation();
       removeNote(index);
     });
     li.appendChild(deleteBtn);
     notesList.appendChild(li);
   });
 }


 // Update word count display
 function updateWordCount(highlights, notes) {
   const hCount = highlights ? highlights.length : 0;
   const nCount = notes ? notes.length : 0;
   wordCountEl.textContent = `${nCount} notes · ${hCount} highlights`;
 }


 // Remove a highlight by index
 async function removeHighlight(index) {
   const data = await loadData();
   const highlights = data.highlights;
   if (index >= 0 && index < highlights.length) {
     highlights.splice(index, 1);
     await saveData(highlights, data.notes, data.article);
     renderHighlights(highlights);
     renderNotes(data.notes);
     updateWordCount(highlights, data.notes);
   }
 }


 // Remove a note by index
 async function removeNote(index) {
   const data = await loadData();
   const notes = data.notes;
   if (index >= 0 && index < notes.length) {
     notes.splice(index, 1);
     await saveData(data.highlights, notes, data.article);
     renderHighlights(data.highlights);
     renderNotes(notes);
     updateWordCount(data.highlights, notes);
   }
 }




 


 // Highlight mode: send message to content script to start highlighting
 async function startHighlightMode() {
   try {
     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     if (!tab) {
       alert('No active tab found.');
       return;
     }
     // Send message to content script to enable highlight mode
     chrome.tabs.sendMessage(tab.id, { action: 'enableHighlightMode' }, (response) => {
       if (chrome.runtime.lastError) {
         // Content script not injected or not responding
         alert('Please refresh the page to enable highlighting. (Content script not loaded)');
         console.warn('Could not send message to content script:', chrome.runtime.lastError.message);
       } else {
         alert('Highlight mode enabled! Select text on the page to highlight it.');
       }
     });
   } catch (error) {
     console.error('Error starting highlight mode:', error);
     alert('Error starting highlight mode. Please refresh the page and try again.');
   }
 }


 // AI Summarize: placeholder functionality
 function summarizeArticle() {
   alert('AI Summarize feature: This would summarize the current article. (Functionality placeholder)');
   // In a real implementation, you'd send a message to a background script or content script
   // or use an API call.
 }


 // Define Word
 chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.id) {
    // Send a message to the content script of that tab
    chrome.tabs.sendMessage(tabs[0].id, { action: "GET_SELECTED_WORD" }, (response) => {
      if (response && response.selectedWord) {
        console.log("Selected word:", response.selectedWord);
        // Update your popup UI here
      }
    });
  }
});


 // Save a new note
 async function saveNote() {
   const noteText = noteInput.value();
   if (!noteText) {
     alert('Please enter a note.');
     return;
   }
   const data = await loadData();
   const notes = data.notes || [];
   notes.push(noteText);
   await saveData(data.highlights, notes, data.article);
   noteInput.value = '';
   renderNotes(notes);
   renderHighlights(data.highlights);
   updateWordCount(data.highlights, notes);
 }


 // Clear all data (highlights and notes)
 async function clearAllData() {
   if (confirm('Are you sure you want to clear all highlights and notes?')) {
     const data = await loadData();
     await saveData([], [], data.article);
     renderHighlights([]);
     renderNotes([]);
     updateWordCount([], []);
   }
 }


 // Listen for new highlight from content script
 chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
   if (message.action === 'newHighlight') {
     // Add the highlight to storage
     (async () => {
       const data = await loadData();
       const highlights = data.highlights || [];
       highlights.push(message.text);
       await saveData(highlights, data.notes, data.article);
       renderHighlights(highlights);
       renderNotes(data.notes);
       updateWordCount(highlights, data.notes);
       sendResponse({ status: 'ok' });
     })();
     return true; // keep message channel open for async response
   }
   // Also listen for article detection from content script if needed
   if (message.action === 'articleDetected') {
     (async () => {
       const data = await loadData();
       const article = {
         title: message.title || 'Unknown',
         url: message.url || ''
       };
       await saveData(data.highlights, data.notes, article);
       updateArticleTitle(article);
       sendResponse({ status: 'ok' });
     })();
     return true;
   }
 });






 // Load initial data
 refreshUI();


 // Event listeners
 detectBtn.addEventListener('click', detectCurrentArticle);
 highlightBtn.addEventListener('click', startHighlightMode);
 summarizeBtn.addEventListener('click', summarizeArticle);
 defineBtn.addEventListener('click', defineWord);
 saveNoteBtn.addEventListener('click', saveNote);
 clearDataBtn.addEventListener('click', clearAllData);


 // Allow Enter key to save note
 noteInput.addEventListener('keydown', (e) => {
   if (e.key === 'Enter' && !e.shiftKey) {
     e.preventDefault();
     saveNote();
   }
 });


 // Also listen for changes from storage (if other parts of extension update)
 chrome.storage.onChanged.addListener((changes, area) => {
   if (area === 'local') {
     refreshUI();
   }
 });

 // Load saved highlights
 chrome.storage.local.get({ highlights: [] }, (data) => {
   const container = document.getElementById('highlights-list');


   if (!container) {
     return;
   }

//highlights are displayed in reverse order to show the most recent first
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


 // Send message to content script -- what happens when the user clicks the "Highlight Mode" button
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
       outputLanguage: "en"
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



// Get the text of the current page
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








