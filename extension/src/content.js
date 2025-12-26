/**
 * Content Script - Main Entry Point
 * Main logic entry for the extension, coordinating various modules
 */

(async () => {
  try {
    console.log('[AIChatHelper] Initializing plugin...');
    
    // Check if it's Google AI Studio platform
    const isAIStudio = window.location.hostname.includes('aistudio.google.com');
    
    if (isAIStudio) {
      console.log('[AIChatHelper] Detected Google AI Studio platform, using dedicated logic');
      
      // Google AI Studio dedicated logic
      const DIALOGUE_SELECTOR = '.chat-turn-container';
      const SCROLLBAR_SELECTOR = 'ms-prompt-scrollbar';
      
      // Wait for elements to appear
      function waitForElements(selector, timeout = 15000) {
        return new Promise((resolve) => {
          const checkInterval = 500;
          const maxAttempts = timeout / checkInterval;
          let attempts = 0;

          const check = () => {
            const elements = document.querySelectorAll(selector);
            console.log(`[AI Studio Navigator] Found ${elements.length} ${selector} elements`);
            
            if (elements.length > 0) {
              resolve(elements);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(check, checkInterval);
            } else {
              resolve([]);
            }
          };

          check();
        });
      }

      // Extract user messages from scrollbar (aria-label)
      function extractUserMessagesFromScrollbar() {
        const scrollbar = document.querySelector(SCROLLBAR_SELECTOR);
        if (!scrollbar) {
          console.log('[AI Studio Navigator] Could not find prompt-scrollbar');
          return [];
        }
        
        const buttons = scrollbar.querySelectorAll('button[aria-label]');
        const userMessages = [];
        
        buttons.forEach((button, index) => {
          const ariaLabel = button.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.trim().length > 0) {
            // Filter out system buttons (like "Good response", "Bad response", etc.)
            if (!ariaLabel.match(/^(Good response|Bad response|Rerun|Open options|More options)/i)) {
              console.log(`[AI Studio Navigator] Extracted user message ${index} from scrollbar: ${ariaLabel.substring(0, 50)}...`);
              userMessages.push(ariaLabel.trim());
            }
          }
        });
        
        return userMessages;
      }

      // Extract dialogue content
      async function extractDialogue() {
        console.log('[AI Studio Navigator] Starting to extract dialogue...');
        
        // Wait for dialogue elements to load
        console.log('[AI Studio Navigator] Waiting for dialogue elements to load...');
        const chatTurns = await waitForElements(DIALOGUE_SELECTOR);
        
        console.log(`[AI Studio Navigator] Found ${chatTurns.length} dialogue turns`);
        
        if (chatTurns.length === 0) {
          console.log('[AI Studio Navigator] Could not find dialogue content');
          return [];
        }
        
        // Extract user messages from scrollbar
        const userMessages = extractUserMessagesFromScrollbar();
        console.log(`[AI Studio Navigator] Extracted ${userMessages.length} user messages from scrollbar`);
        
        const dialogues = [];
        let userMessageIndex = 0;
        
        chatTurns.forEach((turn, index) => {
          try {
            // Determine role by class name
            const classList = turn.className;
            let role = 'unknown';
            let text = '';
            
            if (classList.includes('user')) {
              role = 'user';
              // Get user message from scrollbar's aria-label
              if (userMessageIndex < userMessages.length) {
                text = userMessages[userMessageIndex];
                userMessageIndex++;
              } else {
                console.log(`[AI Studio Navigator] Skipping dialogue ${index}: User message index out of range`);
                return;
              }
            } else if (classList.includes('model')) {
              role = 'ai';
              // Get AI message from turn-content
              const turnContent = turn.querySelector('.turn-content');
              if (!turnContent) {
                console.log(`[AI Studio Navigator] Skipping dialogue ${index}: Could not find turn-content`);
                return;
              }
              text = turnContent.textContent.trim();
              // Remove role labels
              text = text.replace(/^(User|Model)\s*/i, '').trim();
              // Remove "Thoughts" and other labels
              text = text.replace(/^Thoughts\s*/i, '').trim();
            }
            
            if (!text || text.length < 2) {
              console.log(`[AI Studio Navigator] Skipping dialogue ${index}: Text is empty (role: ${role})`);
              return;
            }
            
            console.log(`[AI Studio Navigator] Extracted dialogue ${index}: ${role} - ${text.substring(0, 50)}...`);
            
            dialogues.push({
              role: role,
              text: text,
              element: turn
            });
          } catch (error) {
            console.error(`[AI Studio Navigator] Error extracting dialogue ${index}:`, error);
          }
        });
        
        console.log(`[AI Studio Navigator] Successfully extracted ${dialogues.length} dialogues`);
        return dialogues;
      }

      // Create sidebar
      function createSidebar(dialogues) {
        // Check if sidebar already exists
        let sidebar = document.getElementById('ai-studio-navigator-sidebar');
        if (sidebar) {
          sidebar.remove();
        }
        
        // Create sidebar container
        sidebar = document.createElement('div');
        sidebar.id = 'ai-studio-navigator-sidebar';
        sidebar.innerHTML = `
          <div class="sidebar-header">
            <h3>${chrome.i18n.getMessage('sidebarNavTitle')}</h3>
            <button class="close-btn" id="close-sidebar">×</button>
          </div>
          <div class="sidebar-content" id="sidebar-content">
          </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
          #ai-studio-navigator-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            width: 300px;
            height: 100vh;
            background: #1e1e1e;
            color: #e0e0e0;
            box-shadow: -2px 0 10px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          
          .sidebar-header {
            padding: 16px;
            background: #2d2d2d;
            border-bottom: 1px solid #3d3d3d;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .sidebar-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
          }
          
          .close-btn {
            background: none;
            border: none;
            color: #e0e0e0;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
          }
          
          .close-btn:hover {
            color: #ff5555;
          }
          
          .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
          }
          
          .dialogue-item {
            padding: 12px;
            margin-bottom: 8px;
            background: #2d2d2d;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 3px solid transparent;
          }
          
          .dialogue-item:hover {
            background: #3d3d3d;
            transform: translateX(-2px);
          }
          
          .dialogue-item.user {
            border-left-color: #4a9eff;
          }
          
          .dialogue-item.ai {
            border-left-color: #50c878;
          }
          
          .dialogue-role {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 4px;
            opacity: 0.7;
          }
          
          .dialogue-item.user .dialogue-role {
            color: #4a9eff;
          }
          
          .dialogue-item.ai .dialogue-role {
            color: #50c878;
          }
          
          .dialogue-text {
            font-size: 13px;
            line-height: 1.4;
            color: #e0e0e0;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          
          .highlight {
            animation: highlight 1s ease-out;
          }
          
          @keyframes highlight {
            0% { background: #4a9eff; }
            100% { background: #2d2d2d; }
          }
        `;
        
        document.head.appendChild(style);
        
        // Add dialogue items
        const content = sidebar.querySelector('#sidebar-content');
        dialogues.forEach((dialogue, index) => {
          const item = document.createElement('div');
          item.className = `dialogue-item ${dialogue.role}`;
          item.innerHTML = `
            <div class="dialogue-role">${dialogue.role === 'user' ? chrome.i18n.getMessage('userRole') : chrome.i18n.getMessage('aiRole')}</div>
            <div class="dialogue-text">${dialogue.text.substring(0, 30)}${dialogue.text.length > 30 ? '...' : ''}</div>
          `;
          
          // Click to jump to corresponding dialogue
          item.addEventListener('click', () => {
            dialogue.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            dialogue.element.classList.add('highlight');
            setTimeout(() => dialogue.element.classList.remove('highlight'), 1000);
          });
          
          content.appendChild(item);
        });
        
        // Close button
        sidebar.querySelector('#close-sidebar').addEventListener('click', () => {
          sidebar.remove();
        });
        
        document.body.appendChild(sidebar);
        console.log('[AI Studio Navigator] Sidebar created');
      }

      // Main function
      async function init() {
        try {
          const dialogues = await extractDialogue();
          
          if (dialogues.length === 0) {
            console.log('[AI Studio Navigator] Could not find dialogue content');
            return;
          }
          
          createSidebar(dialogues);
          console.log('[AI Studio Navigator] Initialization complete!');
        } catch (error) {
          console.error('[AI Studio Navigator] Initialization failed:', error);
        }
      }

      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'reload') {
          init();
          sendResponse({ success: true });
        }
      });

      // Listen for URL changes (to detect dialogue switching)
      let lastUrl = location.href;
      const urlObserver = new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
          console.log('[AI Studio Navigator] URL changed, reloading dialogue...');
          lastUrl = currentUrl;
          // Delay a bit to wait for new dialogue to load
          setTimeout(init, 1000);
        }
      });

      // Listen for DOM changes (to detect new messages)
      const domObserver = new MutationObserver((mutations) => {
        // Check if any new dialogue turns were added
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1 && node.classList && node.classList.contains('chat-turn-container')) {
                console.log('[AI Studio Navigator] Detected new dialogue, reloading...');
                setTimeout(init, 500);
                return;
              }
            }
          }
        }
      });

      // Initialize after page loads
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          init();
          // Start listening
          urlObserver.observe(document.querySelector('head > title'), { childList: true });
          domObserver.observe(document.body, { childList: true, subtree: true });
        });
      } else {
        init();
        // Start listening
        urlObserver.observe(document.querySelector('head > title'), { childList: true });
        domObserver.observe(document.body, { childList: true, subtree: true });
      }
      
      return;
    }
    
    // Other platforms use general logic
    console.log('[AIChatHelper] Detected non-Google AI Studio platform, using general logic');
    
    // 1. Initialize platform detector
    if (!window.platformDetector) {
      console.error('Platform detector not loaded');
      return;
    }

    await window.platformDetector.init();
    const platform = window.platformDetector.detectPlatform();

    if (!platform) {
      console.log('Unsupported platform or not an AI chat page');
      return;
    }

    console.log(`[AIChatHelper] Initialization complete, current platform: ${platform.name}`);

    // 2. Initialize message extractor
    if (!window.messageExtractor) {
      window.messageExtractor = new MessageExtractor(window.platformDetector);
    }

    // 3. Initialize sidebar manager
    if (!window.sidebarManager) {
      window.sidebarManager = new SidebarManager(window.messageExtractor, window.platformDetector);
    }

    // 4. Create sidebar
    window.sidebarManager.createSidebar();

    // 5. Initial message extraction
    window.messageExtractor.extractMessages();
    window.sidebarManager.updateSidebar();

    // 6. Restore sidebar visibility state
    chrome.storage.local.get(['sidebarVisible'], (result) => {
      if (result.sidebarVisible === false) {
        window.sidebarManager.hide();
      }
    });

    // 7. Listen for DOM changes to automatically update message list
    const observer = new MutationObserver(() => {
      if (window.messageExtractor.shouldRefresh()) {
        window.sidebarManager.refresh();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });

    // 8. Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleSidebar') {
        window.sidebarManager.toggleSidebar();
        sendResponse({ success: true });
      } else if (request.action === 'refreshMessages') {
        window.sidebarManager.refresh();
        sendResponse({ success: true });
      } else if (request.action === 'getStatus') {
        sendResponse({
          platform: platform.name,
          messageCount: window.messageExtractor.getMessageCount(),
          sidebarVisible: window.sidebarManager.isVisible
        });
      }
    });

    // 9. Periodically refresh messages (check every 5 seconds)
    setInterval(() => {
      if (window.messageExtractor.shouldRefresh()) {
        window.sidebarManager.refresh();
      }
    }, 5000);

    // 10. Cleanup when page unloads
    window.addEventListener('beforeunload', () => {
      observer.disconnect();
      window.sidebarManager.destroy();
    });

    console.log('[AIChatHelper] Initialization complete!');
  } catch (error) {
    console.error('[AIChatHelper] Initialization failed:', error);
  }
})();