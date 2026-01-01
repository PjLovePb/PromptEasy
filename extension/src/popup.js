/**
 * Popup Script
 * Handles interactions in the popup and communication with content script
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const copyBtn = document.getElementById('copyBtn');
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

  copyBtn.addEventListener('click', async () => {
    // Disable button during copy
    copyBtn.disabled = true;
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span class="button-icon">⏳</span><span class="button-text">' + chrome.i18n.getMessage('copying') + '</span>';

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          const response = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getAllUserInputs' }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ error: chrome.runtime.lastError.message });
              } else {
                resolve(response);
              }
            });
          });

          if (response.error) {
            console.error('Error getting user inputs:', response.error);
            copyBtn.innerHTML = '<span class="button-icon">❌</span><span class="button-text">' + chrome.i18n.getMessage('copyFailed') + '</span>';
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
              copyBtn.disabled = false;
            }, 2000);
            return;
          }

          if (response.userInputs && response.userInputs.length > 0) {
            // Combine all user inputs with line breaks
            const allText = response.userInputs.join('\n\n');
            
            // Copy to clipboard
            try {
              await navigator.clipboard.writeText(allText);
              copyBtn.innerHTML = '<span class="button-icon">✅</span><span class="button-text">' + chrome.i18n.getMessage('copySuccess') + '</span>';
              setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.disabled = false;
              }, 2000);
            } catch (err) {
              console.error('Failed to copy to clipboard:', err);
              // Fallback: use document.execCommand
              const textArea = document.createElement('textarea');
              textArea.value = allText;
              textArea.style.position = 'fixed';
              textArea.style.opacity = '0';
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                copyBtn.innerHTML = '<span class="button-icon">✅</span><span class="button-text">' + chrome.i18n.getMessage('copySuccess') + '</span>';
                setTimeout(() => {
                  copyBtn.innerHTML = originalText;
                  copyBtn.disabled = false;
                }, 2000);
              } catch (e) {
                copyBtn.innerHTML = '<span class="button-icon">❌</span><span class="button-text">' + chrome.i18n.getMessage('copyFailed') + '</span>';
                setTimeout(() => {
                  copyBtn.innerHTML = originalText;
                  copyBtn.disabled = false;
                }, 2000);
              }
              document.body.removeChild(textArea);
            }
          } else {
            copyBtn.innerHTML = '<span class="button-icon">⚠️</span><span class="button-text">' + chrome.i18n.getMessage('noInputsFound') + '</span>';
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
              copyBtn.disabled = false;
            }, 2000);
          }
        } catch (error) {
          console.error('Error copying inputs:', error);
          copyBtn.innerHTML = '<span class="button-icon">❌</span><span class="button-text">' + chrome.i18n.getMessage('copyFailed') + '</span>';
          setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
          }, 2000);
        }
      }
    });
  });

  // Initialize
  init();

  // Update status every 2 seconds
  setInterval(() => {
    sendMessageToTab('getStatus');
  }, 2000);
});