// Service worker
// Short-lived: the browser may terminate the service worker when idle
// and wake it again when an extension event is triggered.

// Triggered when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create(
        {
            id: "aa-highlight-selected-text",
            title: "Highlight with Annotator",
            contexts: ["selection"]
        },
        () => {
            if (chrome.runtime.lastError) {
                console.log(
                    "Context menu:",
                    chrome.runtime.lastError.message
                );
                return;
            }

            console.log("Extension successfully installed");
        }
    );
});

// Triggered when a context-menu item is clicked.
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu item clicked.");

    if (
        info.menuItemId === "aa-highlight-selected-text" &&
        tab &&
        typeof tab.id === "number" &&
        info.selectionText
    ) {
        chrome.tabs.sendMessage(
            tab.id,
            {
                type: "highlight-selected-text",
                text: info.selectionText
            },
            () => {
                if (chrome.runtime.lastError) {
                    console.log(
                        "Could not send message:",
                        chrome.runtime.lastError.message
                    );
                }
            }
        );
    }
});

// Triggered when a message is received from another part of the extension.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);

    // Handle messages here if needed.
});


chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (!message || message.action !== 'defineWord') {
            return;
        }

        const word = String(message.word || '')
            .trim()
            .toLowerCase();

        if (!word) {
            sendResponse({
                status: 'error',
                error: 'No word provided.'
            });

            return;
        }

        fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        )
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Word not found');
                }

                return response.json();
            })
            .then((data) => {
                const meaning = data?.[0]?.meanings?.[0];
                const definition =
                    meaning?.definitions?.[0]?.definition;

                if (!definition) {
                    throw new Error('Definition not found');
                }

                sendResponse({
                    status: 'ok',
                    definition
                });
            })
            .catch((error) => {
                console.error('Dictionary API error:', error);

                sendResponse({
                    status: 'error',
                    error: 'Definition not found.'
                });
            });

        return true;
    }
);
