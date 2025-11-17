// AI对话功能
class AIChat {
    constructor() {
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendMessage');
        this.chatMessages = document.getElementById('chatMessages');

        this.isTyping = false;

        this.init();
    }

    init() {
        // 绑定事件
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自动调整输入框高度
        this.chatInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });

        // 滚动到底部
        this.scrollToBottom();
    }

    adjustTextareaHeight() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;

        // 添加用户消息
        this.addMessage(message, 'user');

        // 清空输入框
        this.chatInput.value = '';
        this.adjustTextareaHeight();

        // 显示AI正在输入
        this.showTypingIndicator();

        // 模拟AI回复
        setTimeout(() => {
            this.hideTypingIndicator();
            const aiResponse = this.generateAIResponse(message);
            this.addMessage(aiResponse, 'ai');
        }, 1000 + Math.random() * 2000);
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (type === 'ai') {
            avatar.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m6-9h-6m-6 0h6"></path>
                </svg>
            `;
        } else {
            avatar.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            `;
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<p>${this.escapeHtml(content)}</p>`;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.sendButton.disabled = true;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m6-9h-6m-6 0h6"></path>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.sendButton.disabled = false;

        const typingMessage = this.chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    generateAIResponse(userMessage) {
        // 根据用户消息生成相应的AI回复
        const responses = {
            '产业链': '根据当前数据分析，新能源汽车产业链涵盖了上游的原材料和核心零部件供应，中游的整车制造和动力电池生产，以及下游的应用场景和服务。请问您想了解产业链的哪个具体环节？',
            '企业': '目前系统中有156家潜在招引企业，涵盖技术合作、供应链协作和资本合作三种类型。您可以通过企业检索功能查找具体企业信息。',
            '政策': '最新的产业政策支持新能源汽车产业发展，包括财政补贴、税收优惠和技术扶持等多项措施。建议关注具体城市的政策细则。',
            '招商': '基于链点分析，建议重点关注IGBT模块、车辆控制系统等薄弱环节的招商工作。可以优先考虑长三角地区的技术型企业。',
            '数据': '系统整合了多维度的产业链数据，包括企业信息、技术路径、供应链关系等。您可以通过筛选条件获取针对性的数据分析结果。'
        };

        // 检查关键词
        for (const [key, response] of Object.entries(responses)) {
            if (userMessage.includes(key)) {
                return response;
            }
        }

        // 默认回复
        const defaultResponses = [
            '我理解您的问题。基于当前的产业链数据分析，建议您可以从以下几个维度进行深入研究：产业链结构、企业分布、技术路径和政策环境。',
            '这是一个很好的问题。根据系统分析，我们可以为您提供更详细的数据支持和策略建议。请告诉我您关注的具体方面。',
            '感谢您的咨询。我会基于现有数据为您提供专业的分析和建议。如果您需要更具体的报告，可以使用页面的报告生成功能。',
            '我正在为您分析相关信息。建议您可以结合页面的筛选功能，获取更精准的产业链分析结果。'
        ];

        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// 页面加载完成后初始化AI对话功能
document.addEventListener('DOMContentLoaded', () => {
    new AIChat();
});