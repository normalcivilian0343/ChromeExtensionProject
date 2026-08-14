//service worker OR short-lived, meaning the browser terminates them
//when idle and wake them up when event is triggered
//triggers when extension is first installed or updated
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "aa-highlight-selected-text",
        title: "Highlight with Annotator",
        contexts: ["selection"]
    });
    console.log("Extension successfullyinstalled");
});
//triggers when extension's toolbar icon is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Extension icon clicked on tab: ", tab.id);
    if (info.menuItemId === "aa-highlight-selected-text" && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "highlight-selected-text" ,  text: info.selectionText });
    }
        
});
//triggers when a message is received 
