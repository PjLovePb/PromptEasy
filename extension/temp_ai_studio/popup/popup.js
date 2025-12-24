// popup/popup.js
document.getElementById('reloadButton').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "reloadDialogue" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                } else {
                    console.log("Dialogue reloaded:", response);
                    window.close(); // 关闭弹窗
                }
            });
        }
    });
});
