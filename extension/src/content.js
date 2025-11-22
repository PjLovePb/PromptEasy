/**
 * Content Script - Main Entry Point
 * 扩展的主要逻辑入口，协调各个模块
 */

(async () => {
  try {
    // 1. 初始化平台检测器
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

    console.log(`AIChatHelper initialized for ${platform.name}`);

    // 2. 初始化消息提取器
    if (!window.messageExtractor) {
      window.messageExtractor = new MessageExtractor(window.platformDetector);
    }

    // 3. 初始化侧边栏管理器
    if (!window.sidebarManager) {
      window.sidebarManager = new SidebarManager(window.messageExtractor, window.platformDetector);
    }

    // 4. 创建侧边栏
    window.sidebarManager.createSidebar();

    // 5. 初始提取消息
    window.messageExtractor.extractMessages();
    window.sidebarManager.updateSidebar();

    // 6. 恢复侧边栏可见性状态
    chrome.storage.local.get(['sidebarVisible'], (result) => {
      if (result.sidebarVisible === false) {
        window.sidebarManager.hide();
      }
    });

    // 7. 监听 DOM 变化，自动更新消息列表
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

    // 8. 监听来自 popup 的消息
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

    // 9. 定期刷新消息（每 5 秒检查一次）
    setInterval(() => {
      if (window.messageExtractor.shouldRefresh()) {
        window.sidebarManager.refresh();
      }
    }, 5000);

    // 10. 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      observer.disconnect();
      window.sidebarManager.destroy();
    });

    console.log('AIChatHelper fully initialized');
  } catch (error) {
    console.error('Error initializing AIChatHelper:', error);
  }
})();
