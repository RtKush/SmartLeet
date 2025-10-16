function getProblemStatement() {
    const desc = document.querySelector(`div[data-track-load="description_content"]`);
    return desc ? desc.innerText.trim() : "No problem found";
}


chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req.action === "getProblem") {
        sendResponse({ problem: getProblemStatement() });
    }
});
