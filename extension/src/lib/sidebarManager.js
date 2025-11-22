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
          <span class="aichathelper-name">对话历史</span>
        </div>
        <button class="aichathelper-toggle" title="收起/展开">
          <span class="aichathelper-toggle-icon">−</span>
        </button>
      </div>
      <div class="aichathelper-content">
        <div class="aichathelper-messages">
          <div class="aichathelper-loading">加载中...</div>
        </div>
      </div>
      <div class="aichathelper-footer">
        <small class="aichathelper-platform"></small>
      </div>
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
      platformSpan.textContent = `平台: ${platformName}`;
    }

    if (messages.length === 0) {
      messagesContainer.innerHTML = '<div class="aichathelper-empty">暂无消息</div>';
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
    return text.replace(/[&<>"']/g, (m) => map[m]);
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
