// AI Studio Content Extractor - 专门处理Google AI Studio的内容提取

class AIStudioContentExtractor {
  constructor() {
    this.dialogues = [];
    this.lastUrl = location.href;
    this.urlObserver = null;
    this.domObserver = null;
    console.log('[AI Studio Extractor] 初始化内容提取器');
  }

  // 等待元素出现
  async waitForElements(selector, timeout = 15000) {
    return new Promise((resolve) => {
      const checkInterval = 500;
      const maxAttempts = timeout / checkInterval;
      let attempts = 0;

      const check = () => {
        const elements = document.querySelectorAll(selector);
        console.log(`[AI Studio Extractor] 找到 ${elements.length} 个 ${selector} 元素`);
        
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

  // 从 scrollbar 中提取用户消息（aria-label）
  extractUserMessagesFromScrollbar() {
    const scrollbar = document.querySelector('ms-prompt-scrollbar');
    if (!scrollbar) {
      console.log('[AI Studio Extractor] 未找到 prompt-scrollbar');
      return [];
    }
    
    const buttons = scrollbar.querySelectorAll('button[aria-label]');
    const userMessages = [];
    
    buttons.forEach((button, index) => {
      const ariaLabel = button.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim().length > 0) {
        // 过滤掉系统按钮
        if (!ariaLabel.match(/^(Good response|Bad response|Rerun|Open options|More options)/i)) {
          console.log(`[AI Studio Extractor] 从 scrollbar 提取用户消息 ${index}: ${ariaLabel.substring(0, 50)}...`);
          userMessages.push(ariaLabel.trim());
        }
      }
    });
    
    return userMessages;
  }

  // 提取对话内容
  async extractDialogue() {
    console.log('[AI Studio Extractor] 开始提取对话...');
    
    // 等待对话元素加载
    const chatTurns = await this.waitForElements('.chat-turn-container');
    
    console.log(`[AI Studio Extractor] 找到 ${chatTurns.length} 个对话轮次`);
    
    if (chatTurns.length === 0) {
      console.log('[AI Studio Extractor] 未找到对话内容');
      return [];
    }
    
    // 从 scrollbar 提取用户消息
    const userMessages = this.extractUserMessagesFromScrollbar();
    console.log(`[AI Studio Extractor] 从 scrollbar 提取了 ${userMessages.length} 条用户消息`);
    
    const dialogues = [];
    let userMessageIndex = 0;
    
    chatTurns.forEach((turn, index) => {
      try {
        // 通过类名判断角色
        const classList = turn.className;
        let role = 'unknown';
        let text = '';
        
        if (classList.includes('user')) {
          role = 'user';
          // 从 scrollbar 的 aria-label 中获取用户消息
          if (userMessageIndex < userMessages.length) {
            text = userMessages[userMessageIndex];
            userMessageIndex++;
          } else {
            console.log(`[AI Studio Extractor] 跳过对话 ${index}：用户消息索引超出范围`);
            return;
          }
        } else if (classList.includes('model')) {
          role = 'ai';
          // AI 消息从 turn-content 中提取
          const turnContent = turn.querySelector('.turn-content');
          if (!turnContent) {
            console.log(`[AI Studio Extractor] 跳过对话 ${index}：未找到 turn-content`);
            return;
          }
          text = turnContent.textContent.trim();
          // 移除角色标签
          text = text.replace(/^(User|Model)\s*/i, '').trim();
          // 移除"Thoughts"等标签
          text = text.replace(/^Thoughts\s*/i, '').trim();
        }
        
        if (!text || text.length < 2) {
          console.log(`[AI Studio Extractor] 跳过对话 ${index}：文本为空 (role: ${role})`);
          return;
        }
        
        console.log(`[AI Studio Extractor] 提取对话 ${index}: ${role} - ${text.substring(0, 50)}...`);
        
        dialogues.push({
          role: role,
          text: text,
          preview: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
          userElement: turn,
          userText: text,
          index: index
        });
      } catch (error) {
        console.error(`[AI Studio Extractor] 提取对话 ${index} 时出错:`, error);
      }
    });
    
    this.dialogues = dialogues;
    console.log(`[AI Studio Extractor] 成功提取 ${dialogues.length} 条对话`);
    return dialogues;
  }

  // 获取所有消息
  getMessages() {
    return this.dialogues;
  }

  // 获取特定索引的消息
  getMessageByIndex(index) {
    return this.dialogues[index] || null;
  }

  // 开始监听DOM变化
  startListening() {
    // 监听 URL 变化（用于检测对话切换）
    this.urlObserver = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== this.lastUrl) {
        console.log('[AI Studio Extractor] URL 变化，重新加载对话...');
        this.lastUrl = currentUrl;
        setTimeout(() => this.extractDialogue(), 1000);
      }
    });

    // 监听 DOM 变化（用于检测新消息）
    this.domObserver = new MutationObserver((mutations) => {
      // 检查是否有新的对话轮次添加
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && node.classList && node.classList.contains('chat-turn-container')) {
              console.log('[AI Studio Extractor] 检测到新对话，重新加载...');
              setTimeout(() => this.extractDialogue(), 500);
              return;
            }
          }
        }
      }
    });

    // 开始观察
    const titleElement = document.querySelector('head > title');
    if (titleElement) {
      this.urlObserver.observe(titleElement, { childList: true });
    }
    this.domObserver.observe(document.body, { childList: true, subtree: true });
    console.log('[AI Studio Extractor] 开始监听DOM变化');
  }

  // 停止监听
  stopListening() {
    if (this.urlObserver) {
      this.urlObserver.disconnect();
      this.urlObserver = null;
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    console.log('[AI Studio Extractor] 停止监听DOM变化');
  }

  // 销毁
  destroy() {
    this.stopListening();
    this.dialogues = [];
    console.log('[AI Studio Extractor] 内容提取器已销毁');
  }
}

// 导出类
export default AIStudioContentExtractor;