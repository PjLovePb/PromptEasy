/**
 * Sidebar Manager Module
 * 用于管理侧边栏的创建、更新和交互
 */

class SidebarManager {
  constructor(messageExtractor, platformDetector) {
    this.messageExtractor = messageExtractor;
    this.platformDetector = platformDetector;
    this.sidebarElement = null;
    this.isVisible = true;
    this.highlightedElement = null;
    this.debounceTimer = null;
  }

  /**
   * 创建侧边栏 DOM
   */
  createSidebar() {
    if (this.sidebarElement) {
      return this.sidebarElement;
    }

    const sidebar = document.createElement('div');
    sidebar.id = 'aichathelper-sidebar';
    sidebar.className = 'aichathelper-sidebar';
    sidebar.innerHTML = `
      <div class="aichathelper-header">
        <div class="aichathelper-title">
          <span class="aichathelper-icon">💬</span>
          <span class="aichathelper-name">${chrome.i18n.getMessage('sidebarTitle')}</span>
        </div>
        <div class="aichathelper-header-actions">
          <button class="aichathelper-copy" title="${chrome.i18n.getMessage('copyAllInputs')}">
            <span class="aichathelper-copy-icon">📋</span>
            <span class="aichathelper-copy-text">${chrome.i18n.getMessage('copyAllInputs')}</span>
          </button>
          <button class="aichathelper-toggle" title="${chrome.i18n.getMessage('toggleTooltip')}">
            <span class="aichathelper-toggle-icon">−</span>
          </button>
        </div>
      </div>
      <div class="aichathelper-content">
        <div class="aichathelper-messages">
          <div class="aichathelper-loading">${chrome.i18n.getMessage('loadingText')}</div>
        </div>
      </div>
      <div class="aichathelper-footer">
        <small class="aichathelper-platform"></small>
      </div>
      <button class="aichathelper-expand" title="${chrome.i18n.getMessage('showSidebar')}">
        <span class="aichathelper-expand-icon">💬</span>
      </button>
    `;

    document.body.appendChild(sidebar);
    this.sidebarElement = sidebar;

    this.attachEventListeners();
    return sidebar;
  }

  /**
   * 绑定事件监听器
   */
  attachEventListeners() {
    if (!this.sidebarElement) return;

    // 切换按钮
    const toggleBtn = this.sidebarElement.querySelector('.aichathelper-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // 展开按钮（收起状态下显示）
    const expandBtn = this.sidebarElement.querySelector('.aichathelper-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => this.show());
    }

    // 复制按钮
    const copyBtn = this.sidebarElement.querySelector('.aichathelper-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyAllInputs(copyBtn));
    }

    // 消息列表点击事件（事件委托）
    const messagesContainer = this.sidebarElement.querySelector('.aichathelper-messages');
    if (messagesContainer) {
      messagesContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.aichathelper-message-item');
        if (item) {
          const index = parseInt(item.dataset.index, 10);
          this.scrollToMessage(index);
        }
      });
    }
  }

  /**
   * 更新侧边栏内容
   */
  updateSidebar() {
    if (!this.sidebarElement) {
      this.createSidebar();
    }

    const messages = this.messageExtractor.getMessages();
    const messagesContainer = this.sidebarElement.querySelector('.aichathelper-messages');
    const platformName = this.platformDetector.getPlatformName();

    // 更新平台名称
    const platformSpan = this.sidebarElement.querySelector('.aichathelper-platform');
    if (platformSpan) {
      platformSpan.textContent = chrome.i18n.getMessage('platformText', [platformName]);
    }

    if (messages.length === 0) {
      messagesContainer.innerHTML = `<div class="aichathelper-empty">${chrome.i18n.getMessage('emptyMessages')}</div>`;
      return;
    }

    // 生成消息列表 HTML
    const html = messages
      .map(
        (msg, idx) => `
      <div class="aichathelper-message-item" data-index="${idx}" title="${this.escapeHtml(msg.userText)}">
        <div class="aichathelper-message-number">${idx + 1}</div>
        <div class="aichathelper-message-text">${this.escapeHtml(msg.preview)}</div>
      </div>
    `
      )
      .join('');

    messagesContainer.innerHTML = html;
  }

  /**
   * 滚动到指定消息
   * @param {number} index - 消息索引
   */
  scrollToMessage(index) {
    const message = this.messageExtractor.getMessageByIndex(index);
    if (!message || !message.userElement) {
      console.warn(`Message at index ${index} not found`);
      return;
    }

    // 移除之前的高亮
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('aichathelper-highlighted');
    }

    // 平滑滚动到消息位置
    message.userElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // 高亮显示当前消息
    message.userElement.classList.add('aichathelper-highlighted');
    this.highlightedElement = message.userElement;

    // 更新侧边栏中的活跃状态
    this.updateActiveItem(index);

    // 3 秒后移除高亮
    setTimeout(() => {
      if (this.highlightedElement) {
        this.highlightedElement.classList.remove('aichathelper-highlighted');
        this.highlightedElement = null;
      }
    }, 3000);
  }

  /**
   * 更新侧边栏中的活跃项
   * @param {number} index - 消息索引
   */
  updateActiveItem(index) {
    if (!this.sidebarElement) return;

    // 移除所有活跃状态
    const items = this.sidebarElement.querySelectorAll('.aichathelper-message-item');
    items.forEach((item) => item.classList.remove('active'));

    // 添加当前项的活跃状态
    const activeItem = this.sidebarElement.querySelector(
      `.aichathelper-message-item[data-index="${index}"]`
    );
    if (activeItem) {
      activeItem.classList.add('active');
      // 确保活跃项在视图中
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * 切换侧边栏显示/隐藏
   */
  toggleSidebar() {
    if (!this.sidebarElement) return;

    this.isVisible = !this.isVisible;
    this.sidebarElement.classList.toggle('collapsed', !this.isVisible);

    const toggleBtn = this.sidebarElement.querySelector('.aichathelper-toggle-icon');
    if (toggleBtn) {
      toggleBtn.textContent = this.isVisible ? '−' : '+';
    }

    // 保存状态到 storage
    chrome.storage.local.set({ sidebarVisible: this.isVisible });
  }

  /**
   * 显示侧边栏
   */
  show() {
    if (!this.sidebarElement) {
      this.createSidebar();
    }
    this.isVisible = true;
    this.sidebarElement.classList.remove('collapsed');
    const toggleBtn = this.sidebarElement.querySelector('.aichathelper-toggle-icon');
    if (toggleBtn) {
      toggleBtn.textContent = '−';
    }
    // 保存状态到 storage
    chrome.storage.local.set({ sidebarVisible: true });
  }

  /**
   * 隐藏侧边栏
   */
  hide() {
    if (!this.sidebarElement) return;
    this.isVisible = false;
    this.sidebarElement.classList.add('collapsed');
  }

  /**
   * 刷新侧边栏（重新提取消息并更新显示）
   */
  refresh() {
    // 使用防抖避免频繁刷新
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.messageExtractor.extractMessages();
      this.updateSidebar();
    }, 500);
  }

  /**
   * 复制所有用户输入
   * @param {HTMLElement} button - 复制按钮元素
   */
  async copyAllInputs(button) {
    if (!button) return;

    const originalHTML = button.innerHTML;
    const copyIcon = button.querySelector('.aichathelper-copy-icon');
    const copyText = button.querySelector('.aichathelper-copy-text');

    // 禁用按钮并显示加载状态
    button.disabled = true;
    if (copyIcon) copyIcon.textContent = '⏳';
    if (copyText) copyText.textContent = chrome.i18n.getMessage('copying');

    try {
      const messages = this.messageExtractor.getMessages();
      const userInputs = messages.map(msg => msg.userText).filter(text => text && text.length > 0);

      if (userInputs.length === 0) {
        if (copyIcon) copyIcon.textContent = '⚠️';
        if (copyText) copyText.textContent = chrome.i18n.getMessage('noInputsFound');
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.disabled = false;
        }, 2000);
        return;
      }

      // 合并所有用户输入
      const allText = userInputs.join('\n\n');

      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(allText);
        if (copyIcon) copyIcon.textContent = '✅';
        if (copyText) copyText.textContent = chrome.i18n.getMessage('copySuccess');
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: 使用 document.execCommand
        const textArea = document.createElement('textarea');
        textArea.value = allText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          if (copyIcon) copyIcon.textContent = '✅';
          if (copyText) copyText.textContent = chrome.i18n.getMessage('copySuccess');
        } catch (e) {
          if (copyIcon) copyIcon.textContent = '❌';
          if (copyText) copyText.textContent = chrome.i18n.getMessage('copyFailed');
        }
        document.body.removeChild(textArea);
      }

      // 2秒后恢复按钮状态
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Error copying inputs:', error);
      if (copyIcon) copyIcon.textContent = '❌';
      if (copyText) copyText.textContent = chrome.i18n.getMessage('copyFailed');
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.disabled = false;
      }, 2000);
    }
  }

  /**
   * HTML 转义（防止 XSS）
   * @param {string} text - 原始文本
   * @returns {string}
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>'"]/g, (m) => map[m]);
  }

  /**
   * 销毁侧边栏
   */
  destroy() {
    if (this.sidebarElement) {
      this.sidebarElement.remove();
      this.sidebarElement = null;
    }
    clearTimeout(this.debounceTimer);
  }
}

// 创建全局实例
window.sidebarManager = null;

// 在 messageExtractor 初始化后创建实例
if (window.messageExtractor && window.platformDetector) {
  window.sidebarManager = new SidebarManager(window.messageExtractor, window.platformDetector);
}