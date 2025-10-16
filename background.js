chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(["geminiApiKey"], (result) =>{
        if(!result.geminiApiKey){
            chrome.tabs.create({url: "options.html"});
        }
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.get(["solutions"], (res) => {
        const allSolutions = res.solutions || {};
        if (allSolutions[tabId]) {
            delete allSolutions[tabId];
            chrome.storage.local.set({ solutions: allSolutions });
        }
    });
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    const tabId = details.tabId;
    chrome.storage.local.get(["solutions"], (res) => {
        const allSolutions = res.solutions || {};
        if (allSolutions[tabId]) {
            delete allSolutions[tabId];
            chrome.storage.local.set({ solutions: allSolutions });
        }
    });
}, { url: [{ hostContains: "leetcode.com" }] });

