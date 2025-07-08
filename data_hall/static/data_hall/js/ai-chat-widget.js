let markdownRenderer = null;

// 获取静态资源URL的辅助方法
function getStaticAssetUrl(filename) {
    // 从HTML模板中的img元素获取正确的静态文件URL
    const headerImg = document.querySelector('#chat-header img[alt="AI Assistant"], #fullscreen-header img[alt="AI Assistant"]');
    if (headerImg && headerImg.src) {
        return headerImg.src;
    }
    // 备用方案：根据Django静态文件配置构建路径
    return `/static/${filename}`;
}

// 初始化Markdown渲染器
function initializeMarkdownRenderer() {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        // 配置marked选项 - 禁用已弃用的参数
        marked.setOptions({
            breaks: true,        // 启用换行符转换
            gfm: true,          // 启用GitHub风格Markdown
            tables: true,       // 启用表格支持
            sanitize: false,    // 禁用内置sanitize（我们使用DOMPurify）
            smartLists: true,   // 智能列表
            smartypants: false, // 禁用智能标点（避免emoji冲突）
            mangle: false,      // 禁用mangle（已弃用的参数）
            headerIds: false,   // 禁用headerIds（已弃用的参数）
            headerPrefix: ''    // 清空headerPrefix（避免警告）
        });
        
        markdownRenderer = {
            // 渲染Markdown内容为安全的HTML
            render: function(markdown) {
                try {
                    // 1. 预处理：处理emoji简码（如:smile:转为😊）
                    const processedMarkdown = this.processEmojiShortcodes(markdown);
                    
                    // 2. 使用marked解析Markdown
                    const rawHtml = marked.parse(processedMarkdown);
                    
                    // 3. 使用DOMPurify清理HTML，防止XSS攻击
                    const cleanHtml = DOMPurify.sanitize(rawHtml, {
                        ALLOWED_TAGS: [
                            'p', 'br', 'strong', 'em', 'u', 'strike', 'del',
                            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                            'ul', 'ol', 'li',
                            'blockquote', 'code', 'pre',
                            'table', 'thead', 'tbody', 'tr', 'th', 'td',
                            'a', 'hr', 'span', 'div'
                        ],
                        ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'target'],
                        ALLOW_DATA_ATTR: false
                    });
                    
                    return cleanHtml;
                } catch (error) {
                    console.error('Markdown渲染失败:', error);
                    // 降级处理：返回转义的纯文本
                    return this.escapeHtml(markdown);
                }
            },
            
            // 处理emoji简码
            processEmojiShortcodes: function(text) {
                const emojiMap = {
                    ':smile:': '😊', ':grinning:': '😀', ':joy:': '😂', ':wink:': '😉',
                    ':heart:': '❤️', ':thumbs_up:': '👍', ':thumbs_down:': '👎',
                    ':fire:': '🔥', ':star:': '⭐', ':check:': '✅', ':x:': '❌',
                    ':warning:': '⚠️', ':info:': 'ℹ️', ':question:': '❓',
                    ':rocket:': '🚀', ':bulb:': '💡', ':gear:': '⚙️',
                    ':book:': '📚', ':chart:': '📊', ':computer:': '💻',
                    ':tada:': '🎉', ':sparkles:': '✨', ':zap:': '⚡'
                };
                
                let processed = text;
                for (const [shortcode, emoji] of Object.entries(emojiMap)) {
                    processed = processed.replace(new RegExp(shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
                }
                return processed;
            },
            
            // HTML转义（降级处理）
            escapeHtml: function(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },
            
            // 检查是否已初始化
            isReady: function() {
                return typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';
            }
        };
        
        console.log('Markdown渲染器初始化完成');
        return true;
    } else {
        console.warn('Markdown库未加载完成，将在稍后重试');
        return false;
    }
}

// 编码表情符号为HTML实体（与后端保持一致）
function encodeEmojis(text) {
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, 
        function(match) {
            return '&#' + match.codePointAt(0) + ';';
        });
}

// 解码HTML实体表情符号为Unicode
function decodeEmojis(text) {
    return text.replace(/&#(\d+);/g, function(match, dec) {
        return String.fromCodePoint(dec);
    });
}

// 安全渲染文本内容（支持Markdown和纯文本）
function renderTextContent(content, isMarkdown = true) {
    if (!content) return '';
    
    // 先解码表情符号HTML实体
    const decodedContent = decodeEmojis(content);
    
    // 如果启用Markdown且渲染器已就绪，使用Markdown渲染
    if (isMarkdown && markdownRenderer && markdownRenderer.isReady()) {
        return markdownRenderer.render(decodedContent);
    } else {
        // 降级处理：纯文本模式，但支持基本换行
        const div = document.createElement('div');
        div.textContent = decodedContent;
        let html = div.innerHTML;
        // 将换行符转换为<br>标签
        html = html.replace(/\n/g, '<br>');
        return html;
    }
}

// 获取CSRF token的函数
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function getCSRFToken() {
    // 先尝试从meta标签获取
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
        return metaToken.getAttribute('content');
    }
    // 再尝试从cookie获取
    return getCookie('csrftoken');
}

document.addEventListener('DOMContentLoaded', function() {
    const chatWidget = document.getElementById('ai-chat-widget');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const thinkBtn = document.getElementById('think-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const minimizedTrigger = document.getElementById('minimized-trigger');
    const dragHandle = document.getElementById('drag-handle');
    const chatHeader = document.getElementById('chat-header');
    
    // 全屏相关元素
    const fullscreenChat = document.getElementById('fullscreen-chat');
    const fullscreenInput = document.getElementById('fullscreen-input');
    const fullscreenSendBtn = document.getElementById('fullscreen-send-btn');
    const fullscreenMessages = document.getElementById('fullscreen-messages');
    const fullscreenThinkBtn = document.getElementById('fullscreen-think-btn');
    const fullscreenClearBtn = document.getElementById('fullscreen-clear-btn');
    const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');
    const fullscreenHeader = document.getElementById('fullscreen-header');

    // 初始化元素状态 - 确保全屏界面完全隐藏
    if (fullscreenChat) {
        fullscreenChat.style.display = 'none';
        fullscreenChat.style.visibility = 'hidden';
        fullscreenChat.style.position = 'fixed';
        fullscreenChat.style.top = '0';
        fullscreenChat.style.left = '0';
        fullscreenChat.style.width = '100vw';
        fullscreenChat.style.height = '100vh';
        fullscreenChat.style.zIndex = '2147483647';
        fullscreenChat.classList.add('hidden');
        fullscreenChat.classList.remove('flex');
    }

    // HTML已设置正确初始状态（脉冲圆环可见，聊天窗口隐藏），这里只需确保位置
    // 确保位置在右下角
    chatWidget.style.left = '';
    chatWidget.style.top = '';
    chatWidget.style.right = '1.5rem';
    chatWidget.style.bottom = '1.5rem';
    
    // 确保页面滚动正常
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    console.log('AI聊天组件初始化完成');

    // 初始化Markdown渲染器（延迟初始化，确保库已加载）
    setTimeout(() => {
        if (!initializeMarkdownRenderer()) {
            // 如果第一次初始化失败，再尝试几次
            let retryCount = 0;
            const maxRetries = 5;
            const retryInterval = setInterval(() => {
                if (initializeMarkdownRenderer() || retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                    if (retryCount >= maxRetries) {
                        console.warn('Markdown渲染器初始化失败，将使用纯文本模式');
                    }
                }
                retryCount++;
            }, 500);
        }
    }, 100);

    // 拖拽功能变量
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // 拖拽功能实现（鼠标）- 支持拖拽手柄
    dragHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        const rect = chatWidget.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
        
        // 防止选中文本
        e.preventDefault();
    });

    // 拖拽功能实现（触摸）- 支持拖拽手柄
    dragHandle.addEventListener('touchstart', function(e) {
        isDragging = true;
        const rect = chatWidget.getBoundingClientRect();
        const touch = e.touches[0];
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;
        
        document.addEventListener('touchmove', handleTouchDrag);
        document.addEventListener('touchend', handleDragEnd);
        
        e.preventDefault();
    });

    // 最小化状态下的拖拽功能（鼠标）
    minimizedTrigger.addEventListener('mousedown', function(e) {
        let dragStarted = false;
        let clickHandled = false;
        const startX = e.clientX;
        const startY = e.clientY;
        const startTime = Date.now();
        
        const checkDrag = (moveE) => {
            const distance = Math.sqrt(Math.pow(moveE.clientX - startX, 2) + Math.pow(moveE.clientY - startY, 2));
            if (distance > 8 && !dragStarted && Date.now() - startTime > 100) {
                dragStarted = true;
                clickHandled = true;
                isDragging = true;
                const rect = chatWidget.getBoundingClientRect();
                dragOffset.x = startX - rect.left;
                dragOffset.y = startY - rect.top;
                
                document.addEventListener('mousemove', handleDrag);
                document.addEventListener('mouseup', handleMinimizedDragEnd);
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        const handleMinimizedDragEnd = (endE) => {
            isDragging = false;
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mousemove', checkDrag);
            document.removeEventListener('mouseup', handleMinimizedDragEnd);
            
            // 如果没有拖拽，且鼠标还在元素内，则触发点击恢复
            if (!dragStarted && !clickHandled) {
                const rect = minimizedTrigger.getBoundingClientRect();
                if (endE.clientX >= rect.left && endE.clientX <= rect.right && 
                    endE.clientY >= rect.top && endE.clientY <= rect.bottom) {
                    restoreChat();
                }
            }
        };
        
        document.addEventListener('mousemove', checkDrag);
        document.addEventListener('mouseup', handleMinimizedDragEnd);
        
        e.preventDefault();
    });

    // 最小化状态下的拖拽功能（触摸）
    minimizedTrigger.addEventListener('touchstart', function(e) {
        let dragStarted = false;
        let touchHandled = false;
        const startTouch = e.touches[0];
        const startX = startTouch.clientX;
        const startY = startTouch.clientY;
        const startTime = Date.now();
        
        const checkTouchDrag = (moveE) => {
            const touch = moveE.touches[0];
            const distance = Math.sqrt(Math.pow(touch.clientX - startX, 2) + Math.pow(touch.clientY - startY, 2));
            if (distance > 10 && !dragStarted && Date.now() - startTime > 150) {
                dragStarted = true;
                touchHandled = true;
                isDragging = true;
                const rect = chatWidget.getBoundingClientRect();
                dragOffset.x = startX - rect.left;
                dragOffset.y = startY - rect.top;
                
                document.addEventListener('touchmove', handleTouchDrag);
                document.addEventListener('touchend', handleMinimizedTouchEnd);
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        const handleMinimizedTouchEnd = (endE) => {
            isDragging = false;
            document.removeEventListener('touchmove', handleTouchDrag);
            document.removeEventListener('touchmove', checkTouchDrag);
            document.removeEventListener('touchend', handleMinimizedTouchEnd);
            
            // 如果没有拖拽，触发点击恢复
            if (!dragStarted && !touchHandled) {
                restoreChat();
            }
        };
        
        document.addEventListener('touchmove', checkTouchDrag, { passive: false });
        document.addEventListener('touchend', handleMinimizedTouchEnd);
        
        e.preventDefault();
    });

    function handleDrag(e) {
        if (!isDragging) return;
        
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        updatePosition(newX, newY);
    }

    function handleTouchDrag(e) {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const newX = touch.clientX - dragOffset.x;
        const newY = touch.clientY - dragOffset.y;
        
        updatePosition(newX, newY);
        e.preventDefault();
    }

    function updatePosition(newX, newY) {
        // 限制拖拽范围在视窗内
        const maxX = window.innerWidth - chatWidget.offsetWidth;
        const maxY = window.innerHeight - chatWidget.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        chatWidget.style.left = constrainedX + 'px';
        chatWidget.style.top = constrainedY + 'px';
        chatWidget.style.right = 'auto';
        chatWidget.style.bottom = 'auto';
    }

    function handleDragEnd() {
        isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleTouchDrag);
        document.removeEventListener('touchend', handleDragEnd);
    }

    // 最小化功能
    function minimizeChat() {
        // 添加退出动画
        chatWindow.classList.add('window-exit');
        
        setTimeout(() => {
            chatWindow.classList.add('hidden');
            chatWindow.classList.remove('flex', 'flex-col', 'window-exit');
            
            minimizedTrigger.classList.remove('hidden');
            minimizedTrigger.classList.add('minimized-enter');
            
            // 总是回到右下角的默认位置
            chatWidget.style.left = '';
            chatWidget.style.top = '';
            chatWidget.style.right = '1.5rem';
            chatWidget.style.bottom = '1.5rem';
            
            // 清理动画类
            setTimeout(() => {
                minimizedTrigger.classList.remove('minimized-enter');
            }, 500);
            
            // 启动脉冲动画提示用户
            const pulseRing = minimizedTrigger.querySelector('.animate-ping');
            if (pulseRing) {
                setTimeout(() => {
                    pulseRing.style.opacity = '0.6';
                    // 5秒后停止脉冲动画
                    setTimeout(() => {
                        pulseRing.style.opacity = '0';
                    }, 5000);
                }, 500);
            }
        }, 300);
    }

    function restoreChat() {
        // 添加退出动画给最小化按钮
        minimizedTrigger.classList.add('minimized-exit');
        
        setTimeout(() => {
            minimizedTrigger.classList.add('hidden');
            minimizedTrigger.classList.remove('minimized-exit');
            
            chatWindow.classList.remove('hidden');
            chatWindow.classList.add('flex', 'flex-col', 'window-enter');
            
            // 检查并调整窗口位置，确保完全可见
            adjustWindowPosition();
            
            // 停止脉冲动画
            const pulseRing = minimizedTrigger.querySelector('.animate-ping');
            if (pulseRing) {
                pulseRing.style.opacity = '0';
            }
            
            // 清理动画类
            setTimeout(() => {
                chatWindow.classList.remove('window-enter');
            }, 400);
            
            chatInput.focus();
        }, 300);
    }

    // 调整窗口位置确保完全可见
    function adjustWindowPosition() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const chatWindowWidth = 560; // 聊天窗口宽度
        const chatWindowHeight = 450; // 聊天窗口基础高度
        
        // 获取当前位置
        const currentLeft = parseInt(chatWidget.style.left) || 0;
        const currentTop = parseInt(chatWidget.style.top) || 0;
        
        // 如果设置了left/top，说明被拖拽过，需要检查边界
        if (chatWidget.style.left !== '' || chatWidget.style.top !== '') {
            let newLeft = currentLeft;
            let newTop = currentTop;
            
            // 检查右边界
            if (currentLeft + chatWindowWidth > windowWidth) {
                newLeft = windowWidth - chatWindowWidth - 20; // 留20px边距
            }
            
            // 检查左边界
            if (currentLeft < 20) {
                newLeft = 20;
            }
            
            // 检查下边界
            if (currentTop + chatWindowHeight > windowHeight) {
                newTop = windowHeight - chatWindowHeight - 20;
            }
            
            // 检查上边界
            if (currentTop < 20) {
                newTop = 20;
            }
            
            // 应用调整后的位置
            if (newLeft !== currentLeft || newTop !== currentTop) {
                chatWidget.style.left = newLeft + 'px';
                chatWidget.style.top = newTop + 'px';
                chatWidget.style.right = 'auto';
                chatWidget.style.bottom = 'auto';
            }
        }
    }

    // 最小化按钮事件
    minimizeBtn.addEventListener('click', minimizeChat);
    
    // 双击头部进入全屏
    chatHeader.addEventListener('dblclick', function(e) {
        // 避免在拖拽过程中触发双击
        if (!isDragging) {
            enterFullscreen();
        }
        e.preventDefault();
        e.stopPropagation();
    });

    // 双击全屏头部退出全屏
    fullscreenHeader.addEventListener('dblclick', function(e) {
        exitFullscreen();
        e.preventDefault();
        e.stopPropagation();
    });

    // 聊天窗口始终显示，焦点在输入框
    chatInput.focus();

    // 输入框自适应高度
    let lastInputHeight = 42; // 记录上次的输入框高度
    
    chatInput.addEventListener('input', function() {
        // 重置高度并移除滚动条
        this.style.height = 'auto';
        this.style.overflowY = 'hidden';
        
        // 计算新高度，最小42px，最大96px（约3行文本）
        const newHeight = Math.min(Math.max(this.scrollHeight, 42), 96);
        this.style.height = newHeight + 'px';
        
        // 如果内容超过最大高度，才显示滚动条
        if (this.scrollHeight > 96) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
        
        // 只有当高度发生变化时才调整聊天框
        if (newHeight !== lastInputHeight) {
            adjustChatWindowHeight(newHeight);
            lastInputHeight = newHeight;
        }
        
        // 更新发送按钮状态
        if (!isAIResponding) {
            sendBtn.disabled = this.value.trim() === '';
        }
    });

    // 动态调整聊天窗口高度和位置
    function adjustChatWindowHeight(inputHeight) {
        const baseHeight = 450; // 基础高度
        const baseInputHeight = 42; // 基础输入框高度
        const extraHeight = Math.max(0, inputHeight - baseInputHeight);
        const newWindowHeight = baseHeight + extraHeight;
        
        // 调整聊天窗口总高度
        chatWindow.style.height = newWindowHeight + 'px';
        
        // 只有在窗口还在初始位置时才调整bottom位置
        if (chatWidget.style.left === '' && chatWidget.style.top === '') {
            // 窗口在右下角初始位置，向上扩展但保持bottom固定
            chatWidget.style.bottom = '1.5rem'; // 保持固定的bottom位置
        } else {
            // 如果窗口已被拖拽，需要保持窗口底部位置不变，向上扩展
            const currentRect = chatWidget.getBoundingClientRect();
            const currentBottom = window.innerHeight - currentRect.bottom;
            
            // 计算新的top位置，确保bottom位置不变
            const newTop = window.innerHeight - currentBottom - newWindowHeight;
            
            // 确保窗口不会超出屏幕顶部
            const finalTop = Math.max(10, newTop);
            chatWidget.style.top = finalTop + 'px';
        }
    }

    // 重置聊天窗口到初始状态
    function resetChatWindowHeight() {
        chatWindow.style.height = '450px';
        
        // 重置窗口位置
        if (chatWidget.style.left === '' && chatWidget.style.top === '') {
            // 窗口在初始位置，重置bottom
            chatWidget.style.bottom = '1.5rem';
        } else {
            // 窗口已被拖拽，保持其位置但确保高度正确
            const currentRect = chatWidget.getBoundingClientRect();
            const currentBottom = window.innerHeight - currentRect.bottom;
            const newTop = window.innerHeight - currentBottom - 450; // 基础高度
            const finalTop = Math.max(10, newTop);
            chatWidget.style.top = finalTop + 'px';
        }
        
        // 确保输入框滚动条状态正确
        chatInput.style.overflowY = 'hidden';
        fullscreenInput.style.overflowY = 'hidden';
    }

    // 全局状态管理
    let isAIResponding = false;
    let currentResponseAbortController = null;

    // 发送消息 - 使用AI聊天管理器
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // 标准化Unicode字符，确保表情符号正确处理
        const normalizedMessage = message.normalize('NFC');

        // 如果AI正在响应，则停止当前响应
        if (isAIResponding) {
            stopAIResponse();
            return;
        }

        // 清空输入框并重置状态
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.style.height = '42px';
        chatInput.style.overflowY = 'hidden';
        chatInput.scrollTop = 0;
        sendBtn.disabled = true;
        
        // 重置输入框高度记录
        lastInputHeight = 42;
        
        // 重置聊天窗口到初始状态
        resetChatWindowHeight();

        // 设置发送状态
        setAIResponseState(true);

        // 添加用户消息到UI
        addMessageToUI(normalizedMessage, 'user');
        
        // 显示typing indicator
        showTypingIndicator();
        
        try {
            // 等待并使用AI聊天管理器发送消息
            console.log('通过AI聊天管理器发送消息:', normalizedMessage);
            const aiChatManager = await waitForAIChatManager();
            const aiResponse = await aiChatManager.sendMessage(normalizedMessage);
            
            // 添加AI回复到UI（会自动清除typing indicator）
            if (aiResponse) {
                addMessageToUI(aiResponse, 'ai');
                console.log('AI回复已添加到UI:', aiResponse.substring(0, 50) + '...');
            }
            
            setAIResponseState(false);
            
        } catch (error) {
            console.error('发送消息失败:', error);
            
            // 清除typing indicator
            messageState.isTyping = false;
            renderCurrentMode();
            
            // 显示错误信息
            let errorMessage = '抱歉，AI服务暂时不可用，请稍后重试。';
            if (error.name === 'AbortError') {
                errorMessage = '请求已取消。';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = '网络连接失败，请检查网络后重试。';
            } else if (error.message.includes('消息内容不能为空')) {
                errorMessage = '请输入有效的消息内容。';
            } else if (error.message === 'AI聊天管理器加载超时') {
                errorMessage = '聊天功能加载失败，请刷新页面重试。';
            }
            
            showErrorMessage(errorMessage);
            setAIResponseState(false);
        }
    }

    // 设置AI响应状态
    function setAIResponseState(responding) {
        isAIResponding = responding;
        
        // 更新发送按钮状态
        const sendIcon = sendBtn.querySelector('.send-icon');
        const stopIcon = sendBtn.querySelector('.stop-icon');
        
        if (responding) {
            sendBtn.classList.add('send-btn-sending');
            sendIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
            sendBtn.disabled = false;
            sendBtn.title = '停止生成';
        } else {
            sendBtn.classList.remove('send-btn-sending');
            sendIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
            sendBtn.disabled = chatInput.value.trim() === '';
            sendBtn.title = '发送消息';
            currentResponseAbortController = null;
        }
        
        // 同步全屏按钮状态
        const fullscreenSendIcon = fullscreenSendBtn.querySelector('.send-icon');
        const fullscreenStopIcon = fullscreenSendBtn.querySelector('.stop-icon');
        
        if (responding) {
            fullscreenSendBtn.classList.add('send-btn-sending');
            fullscreenSendIcon.classList.add('hidden');
            fullscreenStopIcon.classList.remove('hidden');
            fullscreenSendBtn.disabled = false;
            fullscreenSendBtn.title = '停止生成';
        } else {
            fullscreenSendBtn.classList.remove('send-btn-sending');
            fullscreenSendIcon.classList.remove('hidden');
            fullscreenStopIcon.classList.add('hidden');
            fullscreenSendBtn.disabled = fullscreenInput.value.trim() === '';
            fullscreenSendBtn.title = '发送消息';
        }
    }

    // 停止AI响应
    function stopAIResponse() {
        // 使用AI聊天管理器停止响应
        if (window.aiChatManager && typeof window.aiChatManager.stopCurrentResponse === 'function') {
            window.aiChatManager.stopCurrentResponse();
        }
        
        // 清除所有打字指示器
        clearTypingIndicators();
        
        setAIResponseState(false);
    }

    // 统一清除打字指示器
    function clearTypingIndicators() {
        // 清除小窗口的打字指示器
        const typingIndicators = chatMessages.querySelectorAll('.typing-indicator-container');
        typingIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
        
        // 清除全屏模式的打字指示器
        const fullscreenTypingIndicators = fullscreenMessages.querySelectorAll('.typing-indicator-container');
        fullscreenTypingIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
        
        console.log('已清除所有打字指示器');
    }

    // 统一的消息状态管理
    let messageState = {
        messages: [], // 所有消息
        isTyping: false, // 是否显示typing indicator
        lastUpdate: Date.now()
    };

    // 统一显示typing indicator
    function showTypingIndicator() {
        if (!messageState.isTyping) {
            messageState.isTyping = true;
            renderCurrentMode();
        }
    }

    // 统一添加消息
    function addMessageToUI(content, sender, isFullscreen = null) {
        // 如果有typing indicator，先清除
        if (messageState.isTyping) {
            messageState.isTyping = false;
        }
        
        // 添加到消息状态
        messageState.messages.push({
            id: Date.now(),
            content,
            sender,
            timestamp: new Date()
        });
        
        messageState.lastUpdate = Date.now();
        renderCurrentMode();
    }

    // 渲染当前模式的消息
    function renderCurrentMode() {
        const isFullscreen = !fullscreenChat.classList.contains('hidden');
        
        if (isFullscreen) {
            renderFullscreenMessages();
        } else {
            renderWindowMessages();
        }
    }

    // 渲染小窗口消息
    function renderWindowMessages() {
        chatMessages.innerHTML = '';
        
        // 添加欢迎消息
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'flex items-start space-x-3';
        // 从HTML中获取logo URL，避免在JS中使用Django模板标签
        const logoUrl = getStaticAssetUrl('ai_assistant_logo.jpg');
        welcomeDiv.innerHTML = `
            <img src="${logoUrl}" alt="AI" class="w-8 h-8 mt-1 opacity-80 flex-shrink-0" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 1px rgba(255,255,255,0.2));">
            <div class="chat-message-ai px-4 py-3 rounded-lg rounded-tl-sm max-w-[70%]">
                <p class="text-sm leading-relaxed">你好！我是AI智能助手，有什么可以帮助您的吗？</p>
            </div>
        `;
        chatMessages.appendChild(welcomeDiv);
        
        // 渲染所有消息
        messageState.messages.forEach(msg => {
            const messageDiv = createMessageElement(msg, false);
            chatMessages.appendChild(messageDiv);
        });
        
        // 如果正在typing，显示indicator
        if (messageState.isTyping) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'flex items-start space-x-3 typing-indicator-container';
            // 从HTML中获取logo URL，避免在JS中使用Django模板标签
            const logoUrl = getStaticAssetUrl('ai_assistant_logo.jpg');
            typingDiv.innerHTML = `
                <img src="${logoUrl}" alt="AI" class="w-8 h-8 mt-1 opacity-80 flex-shrink-0" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 1px rgba(255,255,255,0.2));">
                <div class="chat-message-ai px-4 py-3 rounded-lg rounded-tl-sm">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            chatMessages.appendChild(typingDiv);
        }
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 渲染全屏消息
    function renderFullscreenMessages() {
        fullscreenMessages.innerHTML = '';
        
        // 添加全屏欢迎消息
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'flex items-start space-x-4 max-w-4xl mx-auto';
        // 从HTML中获取logo URL，避免在JS中使用Django模板标签
        const logoUrl = getStaticAssetUrl('ai_assistant_logo.jpg');
        welcomeDiv.innerHTML = `
            <img src="${logoUrl}" alt="AI" class="w-10 h-10 mt-1 opacity-80 flex-shrink-0">
            <div class="bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] px-4 py-3 rounded-lg rounded-tl-sm max-w-[70%] border border-[rgba(0,191,255,0.08)]">
                <p class="text-sm leading-6">你好！我是AI智能助手，现在在全屏模式下为您服务。有什么可以帮助您的吗？</p>
            </div>
        `;
        fullscreenMessages.appendChild(welcomeDiv);
        
        // 渲染所有消息
        messageState.messages.forEach(msg => {
            const messageDiv = createMessageElement(msg, true);
            fullscreenMessages.appendChild(messageDiv);
        });
        
        // 如果正在typing，显示indicator
        if (messageState.isTyping) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'flex items-start space-x-4 typing-indicator-container max-w-4xl mx-auto';
            // 从HTML中获取logo URL，避免在JS中使用Django模板标签
            const logoUrl = getStaticAssetUrl('ai_assistant_logo.jpg');
            typingDiv.innerHTML = `
                <img src="${logoUrl}" alt="AI" class="w-10 h-10 mt-1 opacity-80 flex-shrink-0">
                <div class="chat-message-ai px-4 py-3 rounded-lg rounded-tl-sm border border-[rgba(0,191,255,0.08)]">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            fullscreenMessages.appendChild(typingDiv);
        }
        
        fullscreenMessages.scrollTop = fullscreenMessages.scrollHeight;
    }

    // 创建消息元素
    function createMessageElement(msg, isFullscreen) {
        const messageDiv = document.createElement('div');
        const spaceClass = isFullscreen ? 'space-x-4' : 'space-x-3';
        const maxWidthClass = isFullscreen ? 'max-w-4xl mx-auto' : '';
        
        messageDiv.className = `flex items-start ${spaceClass} chat-message-enter ${maxWidthClass}`;

        if (msg.sender === 'user') {
            // 用户消息
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'flex justify-end w-full';
            
            const messageContainer = document.createElement('div');
            messageContainer.className = 'chat-message-user px-4 py-3 rounded-lg rounded-tr-sm max-w-[70%]';
            
            const messageContent = document.createElement('div');
            messageContent.className = `text-sm ${isFullscreen ? 'leading-6' : 'leading-relaxed'} markdown-content`;
            messageContent.innerHTML = renderTextContent(msg.content, false);
            
            // 添加用户消息操作按钮
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-hover-actions';
            actionsDiv.innerHTML = `
                <button class="message-action-btn regenerate-btn" onclick="regenerateResponse(this)"><span class="btn-tooltip">重新生成</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>
                <button class="message-action-btn edit-btn" onclick="editMessage(this)"><span class="btn-tooltip">编辑消息</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button class="message-action-btn delete-btn" onclick="deleteMessage(this)"><span class="btn-tooltip">删除消息</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            `;
            
            messageContainer.appendChild(messageContent);
            messageContainer.appendChild(actionsDiv);
            wrapperDiv.appendChild(messageContainer);
            messageDiv.appendChild(wrapperDiv);
        } else {
            // AI消息
            const avatarImg = document.createElement('img');
            // 从HTML中获取logo URL，避免在JS中使用Django模板标签
            avatarImg.src = getStaticAssetUrl('ai_assistant_logo.jpg');
            avatarImg.alt = 'AI';
            avatarImg.className = isFullscreen ? 'w-10 h-10 mt-1 opacity-80 flex-shrink-0' : 'w-8 h-8 mt-1 opacity-80 flex-shrink-0';
            if (!isFullscreen) {
                avatarImg.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 1px rgba(255,255,255,0.2))';
            }
            
            const messageContainer = document.createElement('div');
            messageContainer.className = isFullscreen 
                ? 'chat-message-ai px-4 py-3 rounded-lg rounded-tl-sm max-w-[70%] border border-[rgba(0,191,255,0.08)]'
                : 'chat-message-ai px-4 py-3 rounded-lg rounded-tl-sm max-w-[70%]';
            
            const messageContent = document.createElement('div');
            messageContent.className = `text-sm ${isFullscreen ? 'leading-6' : 'leading-relaxed'} markdown-content`;
            messageContent.innerHTML = renderTextContent(msg.content, true);
            
            // 添加AI消息操作按钮
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-hover-actions';
            actionsDiv.innerHTML = `
                <button class="message-action-btn regenerate-btn" onclick="regenerateResponse(this)"><span class="btn-tooltip">重新生成</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>
                <button class="message-action-btn copy-btn" onclick="copyMessage(this)"><span class="btn-tooltip">复制内容</span>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2z"></path>
                    </svg>
                </button>
            `;
            
            messageContainer.appendChild(messageContent);
            messageContainer.appendChild(actionsDiv);
            messageDiv.appendChild(avatarImg);
            messageDiv.appendChild(messageContainer);
        }

        return messageDiv;
    }



    // 发送按钮点击事件
    sendBtn.addEventListener('click', sendMessage);

    // 回车发送消息
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Think按钮点击事件
    thinkBtn.addEventListener('click', function() {
        // 添加思考模式的视觉反馈
        this.classList.add('animate-pulse');
        setTimeout(() => {
            this.classList.remove('animate-pulse');
        }, 2000);
    });

    // 清除聊天记录功能
    async function clearChatMessages() {
        try {
            // 等待并调用AI聊天管理器清除后端数据
            const aiChatManager = await waitForAIChatManager();
            await aiChatManager.clearAllMessages();
            console.log('后端聊天记录已清除');
            
            // 清空消息状态
            messageState.messages = [];
            messageState.isTyping = false;
            messageState.lastUpdate = Date.now();
            
            // 重新渲染当前模式
            renderCurrentMode();
            
        } catch (error) {
            console.error('清除聊天记录失败:', error);
            if (error.message === 'AI聊天管理器加载超时') {
                showErrorMessage('聊天功能加载失败，请刷新页面重试');
            } else {
                showErrorMessage('清除聊天记录失败，请稍后重试');
            }
        }
    }

    // 进入全屏模式
    function enterFullscreen() {
        console.log('进入全屏模式...');
        
        // 显示全屏界面
        fullscreenChat.style.display = 'flex';
        fullscreenChat.style.flexDirection = 'column';
        fullscreenChat.style.position = 'fixed';
        fullscreenChat.style.top = '0';
        fullscreenChat.style.left = '0';
        fullscreenChat.style.width = '100vw';
        fullscreenChat.style.height = '100vh';
        fullscreenChat.style.zIndex = '2147483647';
        fullscreenChat.style.visibility = 'visible';
        
        fullscreenChat.classList.remove('hidden');
        fullscreenChat.classList.add('flex', 'fullscreen-enter');
        
        // 禁用页面滚动
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // 渲染全屏消息（统一状态管理会自动处理typing indicator）
        renderFullscreenMessages();
        
        // 清理动画类
        setTimeout(() => {
            fullscreenChat.classList.remove('fullscreen-enter');
        }, 250);
        
        // 聚焦输入框
        setTimeout(() => {
            if (fullscreenInput) {
                fullscreenInput.focus();
            }
            console.log('全屏模式已激活');
        }, 100);
    }

    // 退出全屏模式
    function exitFullscreen() {
        console.log('退出全屏模式...');
        
        // 添加退出动画
        fullscreenChat.classList.add('fullscreen-exit');
        
        setTimeout(() => {
            // 隐藏全屏界面
            fullscreenChat.style.display = 'none';
            fullscreenChat.style.visibility = 'hidden';
            fullscreenChat.classList.add('hidden');
            fullscreenChat.classList.remove('flex', 'fullscreen-exit');
            
            // 恢复页面滚动
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            
            // 渲染小窗口消息（统一状态管理会自动处理typing indicator）
            renderWindowMessages();
            
            // 恢复到小窗口展开状态
            minimizedTrigger.classList.add('hidden');
            chatWindow.classList.remove('hidden');
            chatWindow.classList.add('flex', 'flex-col');
            
            // 停止脉冲动画
            const pulseRing = minimizedTrigger.querySelector('.animate-ping');
            if (pulseRing) {
                pulseRing.style.opacity = '0';
            }
            
            // 聚焦输入框
            setTimeout(() => {
                if (chatInput) {
                    chatInput.focus();
                }
                console.log('已退出全屏模式');
            }, 100);
        }, 200);
    }







    // 全屏输入框自适应高度
    fullscreenInput.addEventListener('input', function() {
        // 重置高度并移除滚动条
        this.style.height = 'auto';
        this.style.overflowY = 'hidden';
        
        // 计算新高度，最小44px，最大128px（约3行文本）
        const newHeight = Math.min(Math.max(this.scrollHeight, 44), 128);
        this.style.height = newHeight + 'px';
        
        // 如果内容超过最大高度，才显示滚动条
        if (this.scrollHeight > 128) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
        
        if (!isAIResponding) {
            fullscreenSendBtn.disabled = this.value.trim() === '';
        }
    });

    // 全屏发送消息 - 使用AI聊天管理器
    async function sendFullscreenMessage() {
        const message = fullscreenInput.value.trim();
        if (message === '') return;
        
        // 标准化Unicode字符，确保表情符号正确处理
        const normalizedMessage = message.normalize('NFC');

        // 如果AI正在响应，则停止当前响应
        if (isAIResponding) {
            stopAIResponse();
            return;
        }

        // 重置输入框状态，清除滚动条
        fullscreenInput.value = '';
        fullscreenInput.style.height = 'auto';
        fullscreenInput.style.height = '44px';
        fullscreenInput.style.overflowY = 'hidden';
        fullscreenInput.scrollTop = 0;
        fullscreenSendBtn.disabled = true;

        // 设置发送状态
        setAIResponseState(true);

        // 添加用户消息到UI
        addMessageToUI(normalizedMessage, 'user');
        
        // 显示typing indicator
        showTypingIndicator();
        
        try {
            // 等待并使用AI聊天管理器发送消息
            console.log('全屏模式通过AI聊天管理器发送消息:', normalizedMessage);
            const aiChatManager = await waitForAIChatManager();
            const aiResponse = await aiChatManager.sendMessage(normalizedMessage);
            
            // 添加AI回复到UI（会自动清除typing indicator）
            if (aiResponse) {
                addMessageToUI(aiResponse, 'ai');
                console.log('AI回复已添加到全屏UI:', aiResponse.substring(0, 50) + '...');
            }
            
            setAIResponseState(false);
            
        } catch (error) {
            console.error('全屏模式发送消息失败:', error);
            
            // 清除typing indicator
            messageState.isTyping = false;
            renderCurrentMode();
            
            // 显示错误信息
            let errorMessage = '抱歉，AI服务暂时不可用，请稍后重试。';
            if (error.name === 'AbortError') {
                errorMessage = '请求已取消。';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = '网络连接失败，请检查网络后重试。';
            } else if (error.message.includes('消息内容不能为空')) {
                errorMessage = '请输入有效的消息内容。';
            } else if (error.message === 'AI聊天管理器加载超时') {
                errorMessage = '聊天功能加载失败，请刷新页面重试。';
            }
            
            // 在全屏模式显示错误
            const errorDiv = document.createElement('div');
            errorDiv.className = 'flex items-start space-x-4 chat-message-enter max-w-4xl mx-auto';
            // 从HTML中获取logo URL，避免在JS中使用Django模板标签
            const logoUrl = getStaticAssetUrl('ai_assistant_logo.jpg');
            errorDiv.innerHTML = `
                <img src="${logoUrl}" alt="AI" class="w-10 h-10 mt-1 opacity-80 flex-shrink-0" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 0 2px rgba(255,255,255,0.2));">
                <div class="chat-message-ai px-4 py-3 rounded-lg rounded-tl-sm max-w-[70%] border border-[rgba(0,191,255,0.08)] border-l-4 border-l-red-400 bg-red-50">
                    <p class="text-sm leading-6 text-red-700">${errorMessage}</p>
                </div>
            `;
            fullscreenMessages.appendChild(errorDiv);
            fullscreenMessages.scrollTop = fullscreenMessages.scrollHeight;
            
            setAIResponseState(false);
        }
    }





    // 搜索下拉菜单交互功能
    const searchDropdownBtn = document.getElementById('search-dropdown-btn');
    const searchDropdownMenu = document.getElementById('search-dropdown-menu');
    const fullscreenSearchDropdownBtn = document.getElementById('fullscreen-search-dropdown-btn');
    const fullscreenSearchDropdownMenu = document.getElementById('fullscreen-search-dropdown-menu');

    // 小窗口搜索下拉菜单
    if (searchDropdownBtn && searchDropdownMenu) {
        searchDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isHidden = searchDropdownMenu.style.display === 'none' || searchDropdownMenu.classList.contains('hidden');
            
            // 关闭所有其他下拉菜单
            document.querySelectorAll('[id*="dropdown-menu"]').forEach(menu => {
                if (menu !== searchDropdownMenu) {
                    menu.classList.add('hidden');
                    menu.style.display = 'none';
                }
            });
            
            if (isHidden) {
                searchDropdownMenu.classList.remove('hidden');
                searchDropdownMenu.style.display = 'block';
                // 旋转箭头
                const arrow = searchDropdownBtn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            } else {
                searchDropdownMenu.classList.add('hidden');
                searchDropdownMenu.style.display = 'none';
                // 重置箭头
                const arrow = searchDropdownBtn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        });

        // 点击菜单项后关闭菜单
        searchDropdownMenu.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                searchDropdownMenu.classList.add('hidden');
                searchDropdownMenu.style.display = 'none';
                const arrow = searchDropdownBtn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
                
                // 处理搜索选项点击
                const searchType = e.target.textContent.trim();
                console.log('选择搜索类型:', searchType);
                // 这里可以添加实际的搜索逻辑
            }
        });
    }

    // 全屏搜索下拉菜单
    if (fullscreenSearchDropdownBtn && fullscreenSearchDropdownMenu) {
        fullscreenSearchDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isHidden = fullscreenSearchDropdownMenu.style.display === 'none' || fullscreenSearchDropdownMenu.classList.contains('hidden');
            
            // 关闭所有其他下拉菜单
            document.querySelectorAll('[id*="dropdown-menu"]').forEach(menu => {
                if (menu !== fullscreenSearchDropdownMenu) {
                    menu.classList.add('hidden');
                    menu.style.display = 'none';
                }
            });
            
            if (isHidden) {
                fullscreenSearchDropdownMenu.classList.remove('hidden');
                fullscreenSearchDropdownMenu.style.display = 'block';
                const arrow = fullscreenSearchDropdownBtn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            } else {
                fullscreenSearchDropdownMenu.classList.add('hidden');
                fullscreenSearchDropdownMenu.style.display = 'none';
                const arrow = fullscreenSearchDropdownBtn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        });

        fullscreenSearchDropdownMenu.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                fullscreenSearchDropdownMenu.classList.add('hidden');
                fullscreenSearchDropdownMenu.style.display = 'none';
                const arrow = fullscreenSearchDropdownBtn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
                
                const searchType = e.target.textContent.trim();
                console.log('选择搜索类型:', searchType);
            }
        });
    }

    // 点击其他地方关闭所有下拉菜单
    document.addEventListener('click', function() {
        document.querySelectorAll('[id*="dropdown-menu"]').forEach(menu => {
            menu.classList.add('hidden');
            menu.style.display = 'none';
        });
        
        // 重置所有箭头
        [searchDropdownBtn, fullscreenSearchDropdownBtn].forEach(btn => {
            if (btn) {
                const arrow = btn.querySelector('svg:last-child');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        });
    });

    // 事件监听器
    clearChatBtn.addEventListener('click', () => clearChatMessages());
    fullscreenClearBtn.addEventListener('click', () => clearChatMessages());
    fullscreenBtn.addEventListener('click', enterFullscreen);
    exitFullscreenBtn.addEventListener('click', exitFullscreen);
    
    fullscreenSendBtn.addEventListener('click', sendFullscreenMessage);
    fullscreenInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendFullscreenMessage();
        }
    });

    fullscreenThinkBtn.addEventListener('click', function() {
        this.classList.add('animate-pulse');
        setTimeout(() => {
            this.classList.remove('animate-pulse');
        }, 2000);
    });

    // ESC键退出全屏
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !fullscreenChat.classList.contains('hidden')) {
            exitFullscreen();
        }
    });



    // 重新生成功能 - 调用后端API重新生成回复
    window.regenerateResponse = async function(button) {
        // 获取用户消息内容和对应的用户消息容器
        let userMessage = '';
        let userMessageContainer = null;
        let targetAiMessageContainer = null;
        
        // 查找用户消息和对应的AI回复
        const messageContainer = button.closest('.flex.items-start');
        const isUserMessage = messageContainer.querySelector('.chat-message-user') !== null;
        const isAiMessage = messageContainer.querySelector('.chat-message-ai') !== null;
        
        if (isUserMessage) {
            // 从用户消息按钮触发
            userMessageContainer = messageContainer;
            const userMessageEl = messageContainer.querySelector('.chat-message-user .markdown-content') ||
                                 messageContainer.querySelector('.chat-message-user p');
            if (userMessageEl) {
                userMessage = userMessageEl.textContent.trim() || userMessageEl.innerText.trim();
            }
            
            // 查找对应的AI回复
            let nextElement = messageContainer.nextElementSibling;
            while (nextElement) {
                const aiMessage = nextElement.querySelector('.chat-message-ai');
                if (aiMessage) {
                    targetAiMessageContainer = nextElement;
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }
        } else if (isAiMessage) {
            // 从AI消息按钮触发
            targetAiMessageContainer = messageContainer;
            
            // 往前查找对应的用户消息
            let prevElement = messageContainer.previousElementSibling;
            while (prevElement) {
                const userMessageEl = prevElement.querySelector('.chat-message-user .markdown-content') ||
                                     prevElement.querySelector('.chat-message-user p');
                if (userMessageEl) {
                    userMessage = userMessageEl.textContent.trim() || userMessageEl.innerText.trim();
                    userMessageContainer = prevElement;
                    break;
                }
                prevElement = prevElement.previousElementSibling;
            }
        }
        
        if (!userMessage) {
            console.warn('未找到用户消息内容');
            alert('未找到要重新生成的用户消息');
            return;
        }
        
        if (isAIResponding) {
            console.warn('AI正在响应中，请稍后重试');
            return;
        }
        
        console.log('准备重新生成AI回复，用户消息:', userMessage);
        
        // 设置重新生成状态
        setAIResponseState(true);
        
        // 如果有现有的AI回复，显示重新生成状态
        let originalContent = '';
        let aiMessageBubble = null;
        let typingDiv = null;
        
        if (targetAiMessageContainer) {
            aiMessageBubble = targetAiMessageContainer.querySelector('.chat-message-ai');
            if (aiMessageBubble) {
                const messageContentEl = aiMessageBubble.querySelector('.markdown-content') || 
                                       aiMessageBubble.querySelector('p');
                if (messageContentEl) {
                    originalContent = messageContentEl.textContent || messageContentEl.innerText;
                    
                    // 隐藏原文本，显示打字指示器
                    messageContentEl.style.display = 'none';
                    
                    // 创建打字指示器
                    typingDiv = document.createElement('div');
                    typingDiv.className = 'typing-indicator';
                    typingDiv.innerHTML = `
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    `;
                    
                    aiMessageBubble.insertBefore(typingDiv, messageContentEl);
                    aiMessageBubble.classList.add('message-regenerating');
                }
            }
        } else {
            // 没有现有AI回复，显示新的打字指示器
            const typingIndicator = showTypingIndicator();
            typingDiv = typingIndicator; // 保存引用用于后续清理
        }
        
        try {
            // 获取用户消息ID用于重新生成请求
            let userMessageId = null;
            if (userMessageContainer) {
                // 从AI聊天管理器中查找匹配的用户消息ID
                const aiChatManager = await waitForAIChatManager();
                const allMessages = aiChatManager.getAllMessages();
                const matchingUserMsg = allMessages.find(msg => 
                    msg.role === 'user' && msg.content.trim() === userMessage.trim()
                );
                if (matchingUserMsg) {
                    userMessageId = matchingUserMsg.id;
                    console.log('找到用户消息ID:', userMessageId);
                } else {
                    console.warn('未找到匹配的用户消息ID，可能消息已被编辑');
                }
            }
            
            // 等待AI聊天管理器并调用重新生成
            const aiChatManager = await waitForAIChatManager();
            const newAiResponse = await aiChatManager.regenerateResponse(userMessage, userMessageId);
            
            if (newAiResponse) {
                if (targetAiMessageContainer && aiMessageBubble) {
                    // 更新现有的AI回复
                    const messageContentEl = aiMessageBubble.querySelector('.markdown-content') || 
                                           aiMessageBubble.querySelector('p');
                    if (messageContentEl) {
                        messageContentEl.innerHTML = renderTextContent(newAiResponse, true);
                        messageContentEl.style.display = '';
                    }
                    
                    // 清理打字指示器和状态
                    if (typingDiv && typingDiv.parentNode) {
                        typingDiv.parentNode.removeChild(typingDiv);
                    }
                    aiMessageBubble.classList.remove('message-regenerating');
                } else {
                    // 添加新的AI回复到UI
                    // 先清理可能的打字指示器
                    if (typingDiv && typingDiv.parentNode) {
                        typingDiv.parentNode.removeChild(typingDiv);
                    }
                    
                    addMessageToUI(newAiResponse, 'ai', false);
                }
                
                console.log('重新生成成功:', newAiResponse.substring(0, 50) + '...');
                
                // 延迟刷新UI以确保数据同步
                setTimeout(async () => {
                    await refreshUIMessages();
                }, 100);
            } else {
                throw new Error('重新生成返回空内容');
            }
            
        } catch (error) {
            console.error('重新生成失败:', error);
            
            // 清理打字指示器
            if (typingDiv && typingDiv.parentNode) {
                typingDiv.parentNode.removeChild(typingDiv);
            }
            
            // 恢复状态
            if (aiMessageBubble) {
                const messageContentEl = aiMessageBubble.querySelector('.markdown-content') || 
                                       aiMessageBubble.querySelector('p');
                if (messageContentEl) {
                    // 恢复原内容或显示错误
                    if (error.name === 'AbortError') {
                        messageContentEl.innerHTML = renderTextContent(originalContent, true);
                    } else {
                        messageContentEl.innerHTML = renderTextContent('重新生成失败，请检查网络连接后重试。', true);
                    }
                    messageContentEl.style.display = '';
                }
                aiMessageBubble.classList.remove('message-regenerating');
            } else {
                // 显示错误消息
                let errorMessage = '重新生成失败，请稍后重试。';
                if (error.message === 'AI聊天管理器加载超时') {
                    errorMessage = '聊天功能加载失败，请刷新页面重试。';
                } else if (error.message.includes('网络')) {
                    errorMessage = '网络连接失败，请检查网络后重试。';
                }
                showErrorMessage(errorMessage);
            }
        } finally {
            setAIResponseState(false);
        }
    };

    window.copyMessage = function(button) {
        // 获取消息内容元素（现在是div，不是p）
        const messageContentEl = button.closest('.chat-message-ai').querySelector('.markdown-content') || 
                                 button.closest('.chat-message-ai').querySelector('p');
        const messageText = messageContentEl.textContent || messageContentEl.innerText;
        
        // 复制到剪贴板
        navigator.clipboard.writeText(messageText).then(() => {
            // 显示复制成功提示
            const originalTitle = button.title;
            button.title = '已复制！';
            button.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            
            setTimeout(() => {
                button.title = originalTitle;
                button.style.borderColor = '';
            }, 1500);
        }).catch(() => {
            // 降级方案 - 选择文本
            const range = document.createRange();
            const selection = window.getSelection();
            
            range.selectNodeContents(messageContentEl);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 显示提示
            const originalTitle = button.title;
            button.title = '已选择文本';
            setTimeout(() => {
                button.title = originalTitle;
                selection.removeAllRanges();
            }, 1500);
        });
    };

    window.editMessage = function(button) {
        // 获取消息内容元素（现在是div，不是p）
        const messageContentEl = button.closest('.chat-message-user').querySelector('.markdown-content') || 
                                 button.closest('.chat-message-user').querySelector('p');
        const originalText = messageContentEl.textContent || messageContentEl.innerText;
        const isFullscreen = button.closest('#fullscreen-chat') !== null;
        const messageBubble = button.closest('.chat-message-user');
        
        // 🎨 创建编辑输入框 - 长文本友好版本
        const editInput = document.createElement('textarea');
        editInput.value = originalText;
        
        // 🔍 智能检测长文本模式
        const isLongText = originalText.length > 100 || originalText.split('\n').length > 3;
        const baseClass = 'message-edit-input';
        editInput.className = isLongText ? `${baseClass} long-text-mode` : baseClass;
        
        // 💡 设置智能placeholder
        if (isLongText) {
            editInput.placeholder = isFullscreen ? 
                '✏️ 长文本编辑模式已启用\n\n💡 优化功能:\n• 更大的编辑空间\n• 智能自动扩展\n• Enter = 保存, Shift+Enter = 换行\n• Esc = 取消编辑' :
                '✏️ 长文本编辑模式\n📝 更大空间，更舒适编辑\n💡 Enter保存, Esc取消';
        } else {
            editInput.placeholder = isFullscreen ? 
                '✏️ 在全屏模式下编辑你的问题...\n\n💡 提示:\n• Enter = 保存\n• Shift+Enter = 换行\n• Esc = 取消编辑' :
                '✏️ 编辑你的问题...\n💡 Enter保存, Esc取消';
        }
        
        // 📐 智能高度计算 - 长文本优化
        const baseMinHeight = isLongText ? 
            (isFullscreen ? 64 : 56) : 
            (isFullscreen ? 48 : 40);
        const maxHeight = isLongText ? 
            (isFullscreen ? 400 : 320) : 
            (isFullscreen ? 240 : 200);
        const lineHeight = isFullscreen ? 24 : 18;
        
        // 计算初始高度 - 基于内容长度和行数
        const lines = originalText.split('\n').length;
        const estimatedLines = Math.max(lines, Math.ceil(originalText.length / (isFullscreen ? 60 : 40)));
        const contentHeight = Math.max(estimatedLines * lineHeight + 32, baseMinHeight); // 32px为内边距
        const initialHeight = Math.min(contentHeight, maxHeight);
        
        // 🔧 设置初始样式（CSS已包含大部分样式，这里只设置动态值）
        editInput.style.height = initialHeight + 'px';
        editInput.style.minHeight = baseMinHeight + 'px';
        editInput.style.maxHeight = maxHeight + 'px';
        
        // 临时隐藏原文本（保持布局）
        messageContentEl.style.opacity = '0';
        messageContentEl.style.pointerEvents = 'none';
        
        // 在气泡内插入编辑框
        messageBubble.appendChild(editInput);
        
        // ✨ 智能自动高度调整 - 流畅响应用户输入
        const adjustHeight = () => {
            // 重置高度以获取准确的scrollHeight
            editInput.style.height = 'auto';
            editInput.style.overflowY = 'hidden';
            
            // 计算新高度，确保不低于最小高度
            const scrollHeight = editInput.scrollHeight;
            const newHeight = Math.max(scrollHeight, baseMinHeight);
            const finalHeight = Math.min(newHeight, maxHeight);
            
            // 应用新高度
            editInput.style.height = finalHeight + 'px';
            
            // 智能滚动条管理
            if (scrollHeight > maxHeight) {
                editInput.style.overflowY = 'auto';
                // 确保光标在可视区域内
                setTimeout(() => {
                    const cursorPosition = editInput.selectionStart;
                    const textBeforeCursor = editInput.value.substring(0, cursorPosition);
                    const lines = textBeforeCursor.split('\n').length;
                    const lineHeight = isFullscreen ? 24 : 18;
                    const shouldScroll = (lines * lineHeight) > (maxHeight - 32);
                    
                    if (shouldScroll) {
                        editInput.scrollTop = Math.max(0, (lines - 3) * lineHeight);
                    }
                }, 0);
            } else {
                editInput.style.overflowY = 'hidden';
                editInput.scrollTop = 0;
            }
            
            // 🎯 视觉反馈 - 轻微缩放效果提示高度变化
            if (Math.abs(finalHeight - parseFloat(editInput.style.height.replace('px', ''))) > 5) {
                editInput.style.transform = 'scale(1.005)';
                setTimeout(() => {
                    editInput.style.transform = '';
                }, 150);
            }
        };
        
        // 🎯 智能焦点和文本选择
        setTimeout(() => {
            editInput.focus();
            
            // 智能文本选择策略
            if (originalText.length < 50) {
                // 短文本：全选
                editInput.select();
            } else {
                // 长文本：光标置于末尾，方便继续编辑
                editInput.setSelectionRange(originalText.length, originalText.length);
                // 滚动到底部
                editInput.scrollTop = editInput.scrollHeight;
            }
        }, 50); // 短暂延迟确保元素完全渲染
        
        // 🔧 事件监听器 - 增强交互体验
        editInput.addEventListener('input', adjustHeight);
        
        // 📝 输入增强功能 - 动态长文本检测
        editInput.addEventListener('input', (e) => {
            // 🔍 动态检测是否需要切换长文本模式
            const currentText = editInput.value;
            const shouldBeLongText = currentText.length > 100 || currentText.split('\n').length > 3;
            const currentlyLongText = editInput.classList.contains('long-text-mode');
            
            if (shouldBeLongText && !currentlyLongText) {
                // 切换到长文本模式
                editInput.classList.add('long-text-mode');
                console.log('🔄 切换到长文本编辑模式');
                
                // 更新placeholder
                editInput.placeholder = isFullscreen ? 
                    '✏️ 长文本编辑模式已启用\n\n💡 优化功能:\n• 更大的编辑空间\n• 智能自动扩展\n• Enter = 保存, Shift+Enter = 换行\n• Esc = 取消编辑' :
                    '✏️ 长文本编辑模式\n📝 更大空间，更舒适编辑\n💡 Enter保存, Esc取消';
                
                // 添加视觉反馈
                editInput.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                editInput.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    editInput.style.transform = '';
                }, 400);
                
            } else if (!shouldBeLongText && currentlyLongText && currentText.length < 80) {
                // 切换回普通模式（防抖，只有在明显变短时才切换）
                editInput.classList.remove('long-text-mode');
                console.log('🔄 切换回普通编辑模式');
                
                // 恢复placeholder
                editInput.placeholder = isFullscreen ? 
                    '✏️ 在全屏模式下编辑你的问题...\n\n💡 提示:\n• Enter = 保存\n• Shift+Enter = 换行\n• Esc = 取消编辑' :
                    '✏️ 编辑你的问题...\n💡 Enter保存, Esc取消';
            }
            
            // 实时调整高度
            adjustHeight();
            
            // 智能保存提示
            if (editInput.value.trim() !== originalText.trim() && editInput.value.trim() !== '') {
                editInput.style.borderColor = 'rgba(34, 197, 94, 0.5)'; // 绿色提示有变化
            } else {
                editInput.style.borderColor = ''; // 恢复默认
            }
        });
        
        // 🎨 聚焦时的视觉增强
        editInput.addEventListener('focus', () => {
            // CSS已处理大部分聚焦样式，这里添加额外的用户反馈
            editInput.style.animation = 'none'; // 清除可能的动画
            setTimeout(() => {
                editInput.style.animation = ''; // 恢复动画
            }, 50);
        });
        
        // 🚀 粘贴事件优化
        editInput.addEventListener('paste', (e) => {
            // 延迟调整高度，确保粘贴内容已处理
            setTimeout(adjustHeight, 10);
        });
        
        // 保存函数
        const saveEdit = async () => {
            const newText = editInput.value.trim();
            if (newText && newText !== originalText) {
                try {
                    // 首先获取AI聊天管理器和消息ID
                    const aiChatManager = await waitForAIChatManager();
                    const allMessages = aiChatManager.getAllMessages();
                    
                    // 尝试多种方式查找消息
                    let userMessage = null;
                    
                    // 方法1: 通过原始文本匹配查找
                    userMessage = allMessages.find(msg => 
                        msg.role === 'user' && msg.content.trim() === originalText.trim()
                    );
                    
                    // 方法2: 如果没找到，通过消息容器的位置推断
                    if (!userMessage) {
                        console.log('通过原始文本未找到消息，尝试通过位置推断');
                        // 通过消息容器在DOM中的位置来推断消息索引
                        const messageContainer = messageBubble.closest('.flex.items-start');
                        const allMessageContainers = Array.from(document.querySelectorAll('.flex.items-start'));
                        const messageIndex = allMessageContainers.indexOf(messageContainer);
                        
                        // 计算在消息数组中的实际位置（跳过欢迎消息）
                        const userMessages = allMessages.filter(msg => msg.role === 'user');
                        const userMessageIndex = Math.max(0, messageIndex - 1); // 减1因为第一个是欢迎消息
                        
                        if (userMessageIndex < userMessages.length) {
                            userMessage = userMessages[userMessageIndex];
                            console.log('通过位置推断找到消息:', userMessage);
                        }
                    }
                    
                    if (userMessage && userMessage.id) {
                        // 调用后端API更新消息内容
                        await aiChatManager.updateMessage(userMessage.id, newText);
                        console.log('消息已成功保存到后端:', newText);
                        
                        // 更新UI显示
                        messageContentEl.innerHTML = renderTextContent(newText, false);
                        
                        // 同步更新本地消息数组
                        const localMessageIndex = allMessages.findIndex(msg => msg.id === userMessage.id);
                        if (localMessageIndex !== -1) {
                            aiChatManager.messages[localMessageIndex].content = newText;
                        }
                        
                    } else {
                        // 如果仍然没有找到消息ID，只更新本地UI（降级处理）
                        console.log('未找到消息ID，仅更新本地UI');
                        messageContentEl.innerHTML = renderTextContent(newText, false);
                        
                        // 尝试更新本地消息数组（通过原始文本匹配）
                        const messageIndex = allMessages.findIndex(msg => 
                            msg.role === 'user' && msg.content.trim() === originalText.trim()
                        );
                        if (messageIndex !== -1) {
                            aiChatManager.messages[messageIndex].content = newText;
                        }
                    }
                } catch (error) {
                    console.error('保存编辑消息失败:', error);
                    
                    // 发生错误时，至少更新本地UI
                    messageContentEl.innerHTML = renderTextContent(newText, false);
                    
                    // 显示错误提示（不使用alert，改为console提示）
                    const errorMessage = error.message.includes('更新消息失败') ? 
                        '保存失败，请检查网络连接' : '保存失败，消息仅在本地更新';
                    
                    console.warn(`消息编辑保存失败: ${errorMessage}`);
                }
            } else if (newText === originalText) {
                // 内容没有变化，直接更新UI
                messageContentEl.innerHTML = renderTextContent(newText, false);
            }
            
            // 清理编辑状态
            editInput.remove();
            messageContentEl.style.opacity = '';
            messageContentEl.style.pointerEvents = '';
        };
        
        // 取消函数
        const cancelEdit = () => {
            editInput.remove();
            messageContentEl.style.opacity = '';
            messageContentEl.style.pointerEvents = '';
        };
        
        // ⌨️ 增强键盘快捷键支持
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                // Ctrl+S / Cmd+S 保存
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                // Ctrl+Z / Cmd+Z 撤销（恢复原文本）
                e.preventDefault();
                editInput.value = originalText;
                adjustHeight();
                editInput.style.borderColor = ''; // 恢复默认边框
            }
        });
        
        // 🎯 失焦保存 - 添加确认机制防止意外保存
        editInput.addEventListener('blur', (e) => {
            // 检查是否因为点击其他可编辑元素而失焦
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && (relatedTarget.tagName === 'INPUT' || relatedTarget.tagName === 'TEXTAREA')) {
                return; // 不自动保存，让用户手动处理
            }
            
            // 如果内容有变化且不为空，才保存
            const currentText = editInput.value.trim();
            if (currentText !== originalText.trim() && currentText !== '') {
                saveEdit();
            } else if (currentText === '') {
                // 如果内容为空，取消编辑
                cancelEdit();
            } else {
                // 内容没变化，直接取消
                cancelEdit();
            }
        });
        
        // 初始调整高度
        setTimeout(adjustHeight, 0);
    };

    // 删除消息功能 - 调用后端API删除数据库记录
    window.deleteMessage = async function(button) {
        // 确认是否要删除
        if (!confirm('确定要删除这条消息吗？此操作无法撤销，将同时删除对应的AI回复。')) {
            return;
        }
        
        // 查找消息容器
        const messageContainer = button.closest('.flex.items-start');
        if (!messageContainer) {
            console.warn('未找到消息容器');
            return;
        }
        
        // 只处理用户消息删除
        const userMessageElement = messageContainer.querySelector('.chat-message-user');
        if (!userMessageElement) {
            console.warn('只能删除用户消息');
            return;
        }

        // 获取用户消息内容，用于在后端查找对应的消息ID
        const messageContentEl = userMessageElement.querySelector('.markdown-content') || 
                                 userMessageElement.querySelector('p');
        if (!messageContentEl) {
            console.warn('未找到消息内容');
            return;
        }

        const userMessageContent = messageContentEl.textContent || messageContentEl.innerText;
        console.log('准备删除用户消息:', userMessageContent);

        try {
            // 等待AI聊天管理器
            const aiChatManager = await waitForAIChatManager();
            
            // 在本地消息中查找对应的用户消息ID
            const userMessage = aiChatManager.getAllMessages().find(msg => 
                msg.role === 'user' && msg.content.trim() === userMessageContent.trim()
            );

            if (!userMessage || !userMessage.id) {
                throw new Error('未找到对应的用户消息ID');
            }

            console.log('找到用户消息ID:', userMessage.id);

            // 显示删除中状态
            messageContainer.style.opacity = '0.5';
            messageContainer.style.pointerEvents = 'none';

            // 调用后端API删除消息对
            await aiChatManager.deleteMessagePair(userMessage.id);

            // 查找要删除的UI元素（用户消息和对应的AI回复）
            let nextElement = messageContainer.nextElementSibling;
            const messagesToDelete = [messageContainer];
            
            // 查找紧随其后的AI回复消息
            while (nextElement) {
                const aiMessage = nextElement.querySelector('.chat-message-ai');
                if (aiMessage) {
                    messagesToDelete.push(nextElement);
                    break; // 只删除第一个AI回复
                }
                // 如果遇到另一个用户消息，停止查找
                if (nextElement.querySelector('.chat-message-user')) {
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }
            
            // 添加删除动画并移除UI元素
            messagesToDelete.forEach((element, index) => {
                element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                element.style.opacity = '0';
                element.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 300 + index * 100); // 延迟删除，让动画更自然
            });
            
            console.log(`消息删除成功: 用户消息及其${messagesToDelete.length - 1}条AI回复已从数据库和UI中删除`);

            // 延迟刷新UI以确保动画完成
            setTimeout(async () => {
                await refreshUIMessages();
            }, 500);

        } catch (error) {
            console.error('删除消息失败:', error);
            
            // 恢复UI状态
            messageContainer.style.opacity = '';
            messageContainer.style.pointerEvents = '';
            
            // 显示错误提示
            let errorMessage = '删除消息失败，请稍后重试。';
            if (error.message.includes('未找到')) {
                errorMessage = '未找到要删除的消息，可能已被删除。';
            } else if (error.message === 'AI聊天管理器加载超时') {
                errorMessage = '聊天功能加载失败，请刷新页面重试。';
            }
            
            alert(errorMessage);
        }
    };



    // 初始化发送按钮状态
    sendBtn.disabled = true;
    fullscreenSendBtn.disabled = true;

    // ====== 增强悬停按钮用户体验 ======
    function enhanceHoverButtonExperience() {
        let hoverTimeout = null;
        
        // 为所有消息容器添加增强的悬停逻辑
        document.addEventListener('mouseover', function(e) {
            const messageContainer = e.target.closest('.chat-message-ai, .chat-message-user');
            const hoverActions = e.target.closest('.message-hover-actions');
            
            if (messageContainer || hoverActions) {
                // 清除任何现有的隐藏计时器
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    hoverTimeout = null;
                }
                
                // 如果悬停在消息上，显示对应的按钮
                if (messageContainer) {
                    const actions = messageContainer.querySelector('.message-hover-actions');
                    if (actions) {
                        actions.style.opacity = '1';
                        actions.style.visibility = 'visible';
                        actions.style.transition = 'opacity 0.1s ease-out, visibility 0.1s ease-out';
                    }
                }
            }
        });
        
        // 处理鼠标离开
        document.addEventListener('mouseout', function(e) {
            const messageContainer = e.target.closest('.chat-message-ai, .chat-message-user');
            const hoverActions = e.target.closest('.message-hover-actions');
            
            // 检查鼠标是否真的离开了消息区域
            if (messageContainer || hoverActions) {
                const relatedTarget = e.relatedTarget;
                const sameContainer = relatedTarget && 
                    (relatedTarget.closest('.chat-message-ai, .chat-message-user') === messageContainer ||
                     relatedTarget.closest('.message-hover-actions') === (messageContainer ? messageContainer.querySelector('.message-hover-actions') : hoverActions));
                
                if (!sameContainer) {
                    // 延迟隐藏，给用户时间移动鼠标
                    hoverTimeout = setTimeout(() => {
                        const actions = messageContainer ? 
                            messageContainer.querySelector('.message-hover-actions') : 
                            hoverActions;
                        
                        if (actions && !actions.matches(':hover') && 
                            !actions.closest('.chat-message-ai, .chat-message-user').matches(':hover')) {
                            actions.style.opacity = '0';
                            actions.style.visibility = 'hidden';
                            actions.style.transition = 'opacity 0.3s ease-in, visibility 0.3s ease-in';
                        }
                    }, 200); // 200ms延迟，给用户足够时间
                }
            }
        });
        
        // 为按钮添加直接悬停检测
        document.addEventListener('mouseover', function(e) {
            if (e.target.closest('.message-action-btn')) {
                const actions = e.target.closest('.message-hover-actions');
                if (actions) {
                    // 清除隐藏计时器
                    if (hoverTimeout) {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = null;
                    }
                    
                    // 确保按钮组保持可见
                    actions.style.opacity = '1';
                    actions.style.visibility = 'visible';
                    actions.style.transition = 'none';
                }
            }
        });
        
        console.log('悬停按钮体验增强已启用');
    }
    
    // 在DOM加载完成后启用增强功能
    enhanceHoverButtonExperience();

    // ====== 聊天记录后端同步功能 ======
    
    // 等待AI聊天管理器加载完成
    async function waitForAIChatManager(maxRetries = 25) {
        let retries = 0;
        return new Promise((resolve, reject) => {
            const checkManager = () => {
                console.log(`检查AI聊天管理器 - 尝试 ${retries + 1}/${maxRetries}`);
                
                if (window.aiChatManager && typeof window.aiChatManager.initialize === 'function') {
                    console.log('AI聊天管理器已就绪');
                    resolve(window.aiChatManager);
                } else if (retries >= maxRetries) {
                    console.error('AI聊天管理器加载超时，最终状态:');
                    console.error('- window.aiChatManager:', window.aiChatManager);
                    console.error('- window.AIChatManager:', window.AIChatManager);
                    console.error('- typeof aiChatManager.initialize:', typeof window.aiChatManager?.initialize);
                    reject(new Error('AI聊天管理器加载超时'));
                } else {
                    retries++;
                    setTimeout(checkManager, 200); // 每200ms检查一次
                }
            };
            
            // 立即检查一次
            checkManager();
        });
    }

    // 从后端加载聊天历史并渲染到UI
    async function loadChatHistoryFromBackend() {
        try {
            console.log('开始从后端加载聊天历史...');
            
            // 等待AI聊天管理器加载完成
            const aiChatManager = await waitForAIChatManager();
            
            // 使用AI聊天管理器加载历史记录
            const messages = await aiChatManager.initialize();
            
            if (messages.length > 0) {
                // 加载消息到状态
                messages.forEach(message => {
                    if (message.role === 'user' || message.role === 'assistant') {
                        addMessageToUIFromHistory(message.content, message.role === 'user' ? 'user' : 'ai');
                    }
                });
                
                // 渲染当前模式
                renderCurrentMode();
                
                console.log(`从后端加载了 ${messages.length} 条聊天记录`);
            } else {
                console.log('没有找到历史聊天记录');
            }
            
        } catch (error) {
            console.error('从后端加载聊天历史失败:', error);
            if (error.message === 'AI聊天管理器加载超时') {
                showErrorMessage('聊天功能加载失败，请刷新页面重试');
            } else {
                showErrorMessage('加载聊天历史失败，请检查网络连接');
            }
        }
    }



    // 从后端加载聊天历史时的临时函数（用于兼容现有代码）
    function addMessageToUIFromHistory(content, sender) {
        messageState.messages.push({
            id: Date.now() + Math.random(),
            content,
            sender,
            timestamp: new Date()
        });
    }

    // 显示错误消息
    function showErrorMessage(message) {
        // 添加错误消息到统一状态（带特殊标记）
        addMessageToUI(`⚠️ ${message}`, 'ai');
    }


    // 启动脉冲动画（页面加载时立即可见，无需等待）
    const pulseRing = minimizedTrigger.querySelector('.animate-ping');
    if (pulseRing) {
        setTimeout(() => {
            pulseRing.style.opacity = '0.6';
            // 10秒后停止脉冲动画，给用户足够的发现时间
            setTimeout(() => {
                pulseRing.style.opacity = '0';
            }, 10000);
        }, 100); // 极短延迟，确保立即可见
    }

    // 添加滚动加载更多功能
    function setupScrollLoadMore() {
        let isLoadingMore = false;
        let scrollThrottleTimer = null;
        
        const handleScrollLoadMore = async (messagesContainer) => {
            // 节流处理
            if (scrollThrottleTimer) return;
            scrollThrottleTimer = setTimeout(() => {
                scrollThrottleTimer = null;
            }, 300);
            
            // 检查AI聊天管理器是否可用
            if (isLoadingMore || !window.aiChatManager || 
                typeof window.aiChatManager.needsLoadMore !== 'function' || 
                !window.aiChatManager.needsLoadMore()) {
                return;
            }
            
            // 检查滚动位置（滚动到顶部时加载更多）
            if (messagesContainer.scrollTop <= 100) {
                isLoadingMore = true;
                console.log('检测到滚动到顶部，加载更多历史消息...');
                
                try {
                    const scrollHeight = messagesContainer.scrollHeight;
                    await window.aiChatManager.loadChatHistory(false);
                    
                    // 重新渲染所有消息
                    await renderAllMessages();
                    
                    // 保持滚动位置
                    const newScrollHeight = messagesContainer.scrollHeight;
                    messagesContainer.scrollTop = newScrollHeight - scrollHeight + 100;
                    
                    console.log('历史消息加载完成');
                } catch (error) {
                    console.error('加载更多历史消息失败:', error);
                } finally {
                    isLoadingMore = false;
                }
            }
        };
        
        // 为两个聊天容器添加滚动监听
        chatMessages.addEventListener('scroll', () => handleScrollLoadMore(chatMessages));
        fullscreenMessages.addEventListener('scroll', () => handleScrollLoadMore(fullscreenMessages));
    }

    // 渲染所有消息到UI
    async function renderAllMessages() {
        if (!window.aiChatManager || typeof window.aiChatManager.getAllMessages !== 'function') {
            console.warn('AI聊天管理器不可用，跳过消息渲染');
            return;
        }
        
        try {
            const messages = window.aiChatManager.getAllMessages();
            
            // 更新消息状态
            messageState.messages = [];
            messages.forEach(message => {
                if (message.role === 'user' || message.role === 'assistant') {
                    messageState.messages.push({
                        id: message.id || Date.now() + Math.random(),
                        content: message.content,
                        sender: message.role === 'user' ? 'user' : 'ai',
                        timestamp: new Date(message.timestamp || Date.now())
                    });
                }
            });
            
            // 渲染当前模式
            renderCurrentMode();
            
            console.log(`已渲染 ${messages.length} 条消息到UI`);
        } catch (error) {
            console.error('渲染消息失败:', error);
        }
    }

    // 刷新UI显示最新的消息状态
    async function refreshUIMessages() {
        try {
            if (window.aiChatManager && typeof window.aiChatManager.getAllMessages === 'function') {
                await renderAllMessages();
                console.log('UI消息已刷新');
            }
        } catch (error) {
            console.error('刷新UI消息失败:', error);
        }
    }

    // 初始化聊天功能（延迟执行，确保DOM和AI管理器完全加载）
    setTimeout(async () => {
        try {
            console.log('开始初始化聊天功能...');
            console.log('页面加载时的状态:');
            console.log('- window.aiChatManager:', window.aiChatManager);
            console.log('- window.AIChatManager:', window.AIChatManager);
            
            // 设置滚动加载功能（无需等待AI管理器）
            setupScrollLoadMore();
            
            // 从后端加载聊天历史（内部会等待AI管理器）
            await loadChatHistoryFromBackend();
            
            console.log('聊天功能初始化完成');
        } catch (error) {
            console.error('初始化聊天功能失败:', error);
            // 如果初始化失败，显示提示信息
            if (error.message.includes('AI聊天管理器')) {
                showErrorMessage('聊天功能加载失败，请刷新页面重试');
            }
        }
    }, 2000); // 延长等待时间，确保所有脚本完全加载
});