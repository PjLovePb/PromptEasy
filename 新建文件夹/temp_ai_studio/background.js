// background.js
// 接收来自 content script 的对话数据，并存储
let chatData = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateChatData") {
        chatData = request.data;
        // 可以选择性地通知所有打开的 popup 窗口更新数据
        // chrome.runtime.sendMessage({ action: "chatDataUpdated" });
        sendResponse({ status: "ok" });
    } else if (request.action === "getChatData") {
        sendResponse({ data: chatData });
    }
    return true; // 表示将异步发送响应
});
