// content.js - AI Studio Chat Navigator

console.log('[AI Studio Navigator] 插件初始化...');

// CSS 选择器
const DIALOGUE_SELECTOR = '.chat-turn-container';
const SCROLLBAR_SELECTOR = 'ms-prompt-scrollbar';

// 等待元素出现
function waitForElements(selector, timeout = 15000) {
    return new Promise((resolve) => {
        const checkInterval = 500;
        const maxAttempts = timeout / checkInterval;
        let attempts = 0;

        const check = () => {
            const elements = document.querySelectorAll(selector);
            console.log(`[AI Studio Navigator] 找到 ${elements.length} 个 ${selector} 元素`);
            
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
function extractUserMessagesFromScrollbar() {
    const scrollbar = document.querySelector(SCROLLBAR_SELECTOR);
    if (!scrollbar) {
        console.log('[AI Studio Navigator] 未找到 prompt-scrollbar');
        return [];
    }
    
    const buttons = scrollbar.querySelectorAll('button[aria-label]');
    const userMessages = [];
    
    buttons.forEach((button, index) => {
        const ariaLabel = button.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim().length > 0) {
            // 过滤掉系统按钮（如 "Good response", "Bad response" 等）
            if (!ariaLabel.match(/^(Good response|Bad response|Rerun|Open options|More options)/i)) {
                console.log(`[AI Studio Navigator] 从 scrollbar 提取用户消息 ${index}: ${ariaLabel.substring(0, 50)}...`);
                userMessages.push(ariaLabel.trim());
            }
        }
    });
    
    return userMessages;
}

// 提取对话内容
async function extractDialogue() {
    console.log('[AI Studio Navigator] 开始提取对话...');
    
    // 等待对话元素加载
    console.log('[AI Studio Navigator] 等待对话元素加载...');
    const chatTurns = await waitForElements(DIALOGUE_SELECTOR);
    
    console.log(`[AI Studio Navigator] 找到 ${chatTurns.length} 个对话轮次`);
    
    if (chatTurns.length === 0) {
        console.log('[AI Studio Navigator] 未找到对话内容');
        return [];
    }
    
    // 从 scrollbar 提取用户消息
    const userMessages = extractUserMessagesFromScrollbar();
    console.log(`[AI Studio Navigator] 从 scrollbar 提取了 ${userMessages.length} 条用户消息`);
    
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
                    console.log(`[AI Studio Navigator] 跳过对话 ${index}：用户消息索引超出范围`);
                    return;
                }
            } else if (classList.includes('model')) {
                role = 'ai';
                // AI 消息从 turn-content 中提取
                const turnContent = turn.querySelector('.turn-content');
                if (!turnContent) {
                    console.log(`[AI Studio Navigator] 跳过对话 ${index}：未找到 turn-content`);
                    return;
                }
                text = turnContent.textContent.trim();
                // 移除角色标签
                text = text.replace(/^(User|Model)\s*/i, '').trim();
                // 移除"Thoughts"等标签
                text = text.replace(/^Thoughts\s*/i, '').trim();
            }
            
            if (!text || text.length < 2) {
                console.log(`[AI Studio Navigator] 跳过对话 ${index}：文本为空 (role: ${role})`);
                return;
            }
            
            console.log(`[AI Studio Navigator] 提取对话 ${index}: ${role} - ${text.substring(0, 50)}...`);
            
            dialogues.push({
                role: role,
                text: text,
                element: turn
            });
        } catch (error) {
            console.error(`[AI Studio Navigator] 提取对话 ${index} 时出错:`, error);
        }
    });
    
    console.log(`[AI Studio Navigator] 成功提取 ${dialogues.length} 条对话`);
    return dialogues;
}

// 创建侧边栏
function createSidebar(dialogues) {
    // 检查是否已存在侧边栏
    let sidebar = document.getElementById('ai-studio-navigator-sidebar');
    if (sidebar) {
        sidebar.remove();
    }
    
    // 创建侧边栏容器
    sidebar = document.createElement('div');
    sidebar.id = 'ai-studio-navigator-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h3>对话导航</h3>
            <button class="close-btn" id="close-sidebar">×</button>
        </div>
        <div class="sidebar-content" id="sidebar-content">
        </div>
    `;
    
    // 添加样式
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
    
    // 添加对话项
    const content = sidebar.querySelector('#sidebar-content');
    dialogues.forEach((dialogue, index) => {
        const item = document.createElement('div');
        item.className = `dialogue-item ${dialogue.role}`;
        item.innerHTML = `
            <div class="dialogue-role">${dialogue.role === 'user' ? 'User' : 'AI'}</div>
            <div class="dialogue-text">${dialogue.text.substring(0, 30)}${dialogue.text.length > 30 ? '...' : ''}</div>
        `;
        
        // 点击跳转到对应对话
        item.addEventListener('click', () => {
            dialogue.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            dialogue.element.classList.add('highlight');
            setTimeout(() => dialogue.element.classList.remove('highlight'), 1000);
        });
        
        content.appendChild(item);
    });
    
    // 关闭按钮
    sidebar.querySelector('#close-sidebar').addEventListener('click', () => {
        sidebar.remove();
    });
    
    document.body.appendChild(sidebar);
    console.log('[AI Studio Navigator] 侧边栏已创建');
}

// 主函数
async function init() {
    try {
        const dialogues = await extractDialogue();
        
        if (dialogues.length === 0) {
            console.log('[AI Studio Navigator] 未找到对话内容');
            return;
        }
        
        createSidebar(dialogues);
        console.log('[AI Studio Navigator] 初始化完成！');
    } catch (error) {
        console.error('[AI Studio Navigator] 初始化失败:', error);
    }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reload') {
        init();
        sendResponse({ success: true });
    }
});

// 监听 URL 变化（用于检测对话切换）
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        console.log('[AI Studio Navigator] URL 变化，重新加载对话...');
        lastUrl = currentUrl;
        // 延迟一下，等待新对话加载
        setTimeout(init, 1000);
    }
});

// 监听 DOM 变化（用于检测新消息）
const domObserver = new MutationObserver((mutations) => {
    // 检查是否有新的对话轮次添加
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('chat-turn-container')) {
                    console.log('[AI Studio Navigator] 检测到新对话，重新加载...');
                    setTimeout(init, 500);
                    return;
                }
            }
        }
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        // 开始监听
        urlObserver.observe(document.querySelector('head > title'), { childList: true });
        domObserver.observe(document.body, { childList: true, subtree: true });
    });
} else {
    init();
    // 开始监听
    urlObserver.observe(document.querySelector('head > title'), { childList: true });
    domObserver.observe(document.body, { childList: true, subtree: true });
}
