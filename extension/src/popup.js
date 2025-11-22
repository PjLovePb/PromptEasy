/**
 * Popup Script
 * 处理弹窗中的交互和与 content script 的通信
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const platformNameSpan = document.getElementById('platformName');
  const messageCountSpan = document.getElementById('messageCount');
  const sidebarStatusSpan = document.getElementById('sidebarStatus');

  /**
   * 获取当前标签页并发送消息
   */
  function sendMessageToTab(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Content script not available');
            platformNameSpan.textContent = '不支持的页面';
            messageCountSpan.textContent = '-';
            sidebarStatusSpan.textContent = '未启用';
          } else if (response) {
            updateStatus(response);
          }
        });
      }
    });
  }

  /**
   * 更新状态显示
   */
  function updateStatus(status) {
    platformNameSpan.textContent = status.platform || '未知';
    messageCountSpan.textContent = status.messageCount || 0;
    sidebarStatusSpan.textContent = status.sidebarVisible ? '已启用' : '已隐藏';

    // 更新按钮文本
    if (status.sidebarVisible) {
      toggleBtn.innerHTML = '<span class="button-icon">👁️</span><span class="button-text">隐藏侧边栏</span>';
    } else {
      toggleBtn.innerHTML = '<span class="button-icon">👁️‍🗨️</span><span class="button-text">显示侧边栏</span>';
    }
  }

  /**
   * 初始化弹窗
   */
  function init() {
    sendMessageToTab('getStatus');
  }

  /**
   * 绑定按钮事件
   */
  toggleBtn.addEventListener('click', () => {
    sendMessageToTab('toggleSidebar');
    // 延迟更新状态
    setTimeout(() => {
      sendMessageToTab('getStatus');
    }, 200);
  });

  refreshBtn.addEventListener('click', () => {
    sendMessageToTab('refreshMessages');
    // 延迟更新状态
    setTimeout(() => {
      sendMessageToTab('getStatus');
    }, 500);
  });

  // 初始化
  init();

  // 每 2 秒更新一次状态
  setInterval(() => {
    sendMessageToTab('getStatus');
  }, 2000);
});
