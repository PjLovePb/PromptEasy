/**
 * Message Extractor Module
 * 用于从 DOM 中提取用户提问和 AI 回答
 */

class MessageExtractor {
  constructor(platformDetector) {
    this.platformDetector = platformDetector;
    this.messages = [];
    this.lastExtractTime = 0;
  }

  /**
   * 使用选择器查找元素
   * @param {string|Array} selectors - CSS 选择器或选择器数组
   * @returns {NodeList|null}
   */
  findElements(selectors) {
    if (Array.isArray(selectors)) {
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return elements;
          }
        } catch (error) {
          console.warn(`Invalid selector: ${selector}`, error);
        }
      }
      return null;
    } else {
      try {
        return document.querySelectorAll(selectors);
      } catch (error) {
        console.warn(`Invalid selector: ${selectors}`, error);
        return null;
      }
    }
  }

  /**
   * 提取元素中的文本内容
   * @param {Element} element - DOM 元素
   * @param {string|Array} contentSelector - 内容选择器
   * @returns {string}
   */
  extractText(element, contentSelector) {
    if (!element) return '';

    let textElement = element;

    if (contentSelector) {
      const found = this.findElements(contentSelector);
      if (found && found.length > 0) {
        // 如果是数组选择器，需要在当前元素内查找
        const selectorArray = Array.isArray(contentSelector) ? contentSelector : [contentSelector];
        for (const selector of selectorArray) {
          const child = element.querySelector(selector);
          if (child) {
            textElement = child;
            break;
          }
        }
      }
    }

    return textElement.textContent?.trim() || '';
  }

  /**
   * 提取消息列表
   * @returns {Array} 消息数组
   */
  extractMessages() {
    const platform = this.platformDetector.getPlatformConfig();
    if (!platform) {
      console.warn('Platform not detected');
      return [];
    }

    // DeepSeek 特殊处理
    if (platform.key === 'deepseek') {
      return this.extractMessagesForDeepSeek();
    }

    const messages = [];
    const userSelectors = [
      platform.selectors.userMessage,
      ...(platform.selectors.fallbackSelectors?.userMessage || [])
    ];

    const userElements = this.findElements(userSelectors);
    if (!userElements || userElements.length === 0) {
      console.warn('No user messages found');
      return [];
    }

    userElements.forEach((userElement, index) => {
      const userText = this.extractText(userElement, platform.selectors.messageContent);

      if (userText.length > 0) {
        messages.push({
          index,
          userText,
          userElement,
          timestamp: new Date(),
          preview: this.getPreview(userText)
        });
      }
    });

    this.messages = messages;
    this.lastExtractTime = Date.now();

    console.log(`Extracted ${messages.length} messages`);
    return messages;
  }

  /**
   * DeepSeek 特殊的消息提取方法
   * 用户消息有 .fbb737a4 子元素，AI 消息有 .ds-markdown 子元素
   * @returns {Array} 消息数组
   */
  extractMessagesForDeepSeek() {
    const messages = [];
    const messageElements = document.querySelectorAll('.ds-message');

    messageElements.forEach((element) => {
      // 检查是否是用户消息（有 .fbb737a4 子元素）
      const userContent = element.querySelector('.fbb737a4');
      if (userContent) {
        const userText = userContent.textContent?.trim() || '';
        if (userText.length > 0) {
          messages.push({
            index: messages.length,
            userText,
            userElement: element,
            timestamp: new Date(),
            preview: this.getPreview(userText)
          });
        }
      }
    });

    this.messages = messages;
    this.lastExtractTime = Date.now();

    console.log(`[DeepSeek] Extracted ${messages.length} user messages`);
    return messages;
  }

  /**
   * 获取文本预览（截断长文本）
   * @param {string} text - 原始文本
   * @param {number} length - 预览长度
   * @returns {string}
   */
  getPreview(text, length = 60) {
    const normalized = text.replace(/\s+/g, ' ').replace(/[`]/g, '').trim();
    if (normalized.length <= length) {
      return normalized;
    }
    return normalized.slice(0, length) + '...';
  }

  /**
   * 获取缓存的消息列表
   * @returns {Array}
   */
  getMessages() {
    return this.messages;
  }

  /**
   * 获取指定索引的消息
   * @param {number} index - 消息索引
   * @returns {Object|null}
   */
  getMessageByIndex(index) {
    return this.messages[index] || null;
  }

  /**
   * 获取消息总数
   * @returns {number}
   */
  getMessageCount() {
    return this.messages.length;
  }

  /**
   * 清空消息缓存
   */
  clearMessages() {
    this.messages = [];
  }

  /**
   * 检查是否需要重新提取消息（基于 DOM 变化）
   * @returns {boolean}
   */
  shouldRefresh() {
    const platform = this.platformDetector.getPlatformConfig();
    if (!platform) return false;

    // 如果距离上次提取超过 2 秒，或消息数量发生变化，则需要刷新
    const timeDiff = Date.now() - this.lastExtractTime;

    let currentCount = 0;
    if (platform.key === 'deepseek') {
      // DeepSeek 特殊处理：计算用户消息数量
      currentCount = document.querySelectorAll('.ds-message .fbb737a4').length;
    } else {
      currentCount = this.findElements(
        platform.selectors.userMessage
      )?.length || 0;
    }

    return timeDiff > 2000 || currentCount !== this.messages.length;
  }
}

// 创建全局实例
window.messageExtractor = null;

// 在 platformDetector 初始化后创建实例
if (window.platformDetector) {
  window.messageExtractor = new MessageExtractor(window.platformDetector);
}
