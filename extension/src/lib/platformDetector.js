/**
 * Platform Detector Module
 * 用于识别当前页面属于哪个 AI Chat 平台
 */

class PlatformDetector {
  constructor() {
    this.platformsConfig = null;
    this.currentPlatform = null;
  }

  /**
   * 初始化平台配置
   */
  async init() {
    try {
      // 尝试多个可能的路径
      const possiblePaths = [
        'src/config/platforms.json',
        '/src/config/platforms.json',
        chrome.runtime.getURL('src/config/platforms.json')
      ];
      
      let response = null;
      let lastError = null;
      
      for (const path of possiblePaths) {
        try {
          response = await fetch(path);
          if (response.ok) {
            console.log(`Successfully loaded platforms config from: ${path}`);
            break;
          }
        } catch (error) {
          lastError = error;
          console.log(`Failed to load from ${path}:`, error.message);
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('Failed to load platforms config from any path');
      }
      
      this.platformsConfig = await response.json();
      console.log('Platforms config loaded successfully');
    } catch (error) {
      console.error('Failed to load platforms config:', error);
      // 使用内联的平台配置作为备选方案
      this.platformsConfig = this.getDefaultPlatformsConfig();
    }
  }

  /**
   * 获取默认的平台配置（备选方案）
   */
  getDefaultPlatformsConfig() {
    return {
      "platforms": {
        "chatgpt": {
          "name": "ChatGPT",
          "urls": ["chat.openai.com", "chatgpt.com"],
          "selectors": {
            "userMessage": "[role=\"user\"]",
            "assistantMessage": "[role=\"assistant\"]",
            "messageContent": "div:first-child",
            "scrollContainer": "main"
          }
        },
        "gemini": {
          "name": "Google Gemini",
          "urls": ["gemini.google.com"],
          "selectors": {
            "userMessage": "[data-role=\"user\"]",
            "assistantMessage": "[data-role=\"assistant\"]",
            "messageContent": ".message-content, [role=\"article\"]",
            "scrollContainer": "body"
          }
        },
        "claude": {
          "name": "Anthropic Claude",
          "urls": ["claude.ai"],
          "selectors": {
            "userMessage": ".user-message",
            "assistantMessage": ".assistant-message",
            "messageContent": ".message-text, [role=\"article\"]",
            "scrollContainer": "main"
          }
        },
        "deepseek": {
          "name": "DeepSeek",
          "urls": ["chat.deepseek.com"],
          "selectors": {
            "userMessage": "[data-sender=\"user\"]",
            "assistantMessage": "[data-sender=\"assistant\"]",
            "messageContent": ".ds-message-content, .message-content",
            "scrollContainer": "body"
          }
        },
        "doubao": {
          "name": "字节豆包",
          "urls": ["doubao.com"],
          "selectors": {
            "userMessage": "[data-type=\"user\"]",
            "assistantMessage": "[data-type=\"assistant\"]",
            "messageContent": ".message-body, .message-content",
            "scrollContainer": "body"
          }
        }
      }
    };
  }

  /**
   * 检测当前页面所属的平台
   * @returns {Object|null} 平台配置对象或 null
   */
  detectPlatform() {
    if (!this.platformsConfig) {
      console.warn('Platforms config not loaded');
      return null;
    }

    const currentUrl = window.location.hostname;

    for (const [platformKey, platformConfig] of Object.entries(this.platformsConfig.platforms)) {
      for (const urlPattern of platformConfig.urls) {
        if (currentUrl.includes(urlPattern)) {
          this.currentPlatform = {
            key: platformKey,
            ...platformConfig
          };
          console.log(`Detected platform: ${platformKey}`);
          return this.currentPlatform;
        }
      }
    }

    console.warn('Unknown platform');
    return null;
  }

  /**
   * 获取当前平台的配置
   * @returns {Object|null}
   */
  getPlatformConfig() {
    return this.currentPlatform;
  }

  /**
   * 获取默认配置
   * @returns {Object}
   */
  getDefaultConfig() {
    return this.platformsConfig?.defaultConfig || {
      messagePreviewLength: 50,
      sidebarWidth: 300,
      animationDuration: 300,
      debounceDelay: 500
    };
  }

  /**
   * 获取平台名称
   * @returns {string}
   */
  getPlatformName() {
    return this.currentPlatform?.name || 'Unknown Platform';
  }

  /**
   * 检查是否支持当前平台
   * @returns {boolean}
   */
  isSupportedPlatform() {
    return this.currentPlatform !== null;
  }
}

// 创建全局实例
window.platformDetector = new PlatformDetector();
