/**
 * Popup Script
 * Handles interactions in the popup and communication with content script
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const platformNameSpan = document.getElementById('platformName');
  const messageCountSpan = document.getElementById('messageCount');
  const sidebarStatusSpan = document.getElementById('sidebarStatus');

  /**
   * Get current tab and send message
   */
  function sendMessageToTab(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Content script not available');
            platformNameSpan.textContent = chrome.i18n.getMessage('unsupportedPage');
            messageCountSpan.textContent = '-';
            sidebarStatusSpan.textContent = chrome.i18n.getMessage('disabled');
          } else if (response) {
            updateStatus(response);
          }
        });
      }
    });
  }

  /**
   * Update status display
   */
  function updateStatus(status) {
    platformNameSpan.textContent = status.platform || 'Unknown';
    messageCountSpan.textContent = status.messageCount || 0;
    sidebarStatusSpan.textContent = status.sidebarVisible ? chrome.i18n.getMessage('enabled') : chrome.i18n.getMessage('disabled');

    // Update button text
    if (status.sidebarVisible) {
      toggleBtn.innerHTML = '<span class="button-icon">👁️</span><span class="button-text">' + chrome.i18n.getMessage('hideSidebar') + '</span>';
    } else {
      toggleBtn.innerHTML = '<span class="button-icon">👁️‍🗨️</span><span class="button-text">' + chrome.i18n.getMessage('showSidebar') + '</span>';
    }
  }

  /**
   * Initialize popup
   */
  function init() {
    sendMessageToTab('getStatus');
  }

  /**
   * Bind button events
   */
  toggleBtn.addEventListener('click', () => {
    sendMessageToTab('toggleSidebar');
    // Delay to update status
    setTimeout(() => {
      sendMessageToTab('getStatus');
    }, 200);
  });

  refreshBtn.addEventListener('click', () => {
    sendMessageToTab('refreshMessages');
    // Delay to update status
    setTimeout(() => {
      sendMessageToTab('getStatus');
    }, 500);
  });

  // Initialize
  init();

  // Update status every 2 seconds
  setInterval(() => {
    sendMessageToTab('getStatus');
  }, 2000);
});