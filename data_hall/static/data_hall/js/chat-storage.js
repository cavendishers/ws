/**
 * 聊天记录持久化存储管理器
 * 使用IndexedDB存储聊天记录，确保页面刷新后数据不丢失
 */
class ChatStorageManager {
    constructor() {
        this.dbName = 'AIChatStorage';
        this.dbVersion = 1;
        this.storeName = 'chatMessages';
        this.settingsStore = 'chatSettings';
        this.db = null;
        
        // 初始化数据库
        this.initDB();
    }

    /**
     * 初始化IndexedDB数据库
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB数据库打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB数据库初始化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建聊天消息存储表
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const messageStore = db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                    messageStore.createIndex('sessionId', 'sessionId', { unique: false });
                }

                // 创建聊天设置存储表
                if (!db.objectStoreNames.contains(this.settingsStore)) {
                    const settingsStore = db.createObjectStore(this.settingsStore, { 
                        keyPath: 'key' 
                    });
                }

                console.log('IndexedDB数据库结构升级完成');
            };
        });
    }

    /**
     * 生成会话ID（基于日期，同一天使用同一会话）
     */
    generateSessionId() {
        const today = new Date();
        return `session_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}`;
    }

    /**
     * 保存聊天消息
     * @param {string} content - 消息内容
     * @param {string} sender - 发送者类型 ('user' 或 'ai')
     * @param {Object} metadata - 额外的元数据
     */
    async saveMessage(content, sender, metadata = {}) {
        if (!this.db) {
            await this.initDB();
        }

        const message = {
            content: content,
            sender: sender,
            timestamp: new Date().toISOString(),
            sessionId: this.generateSessionId(),
            metadata: metadata
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(message);

            request.onsuccess = () => {
                console.log('消息保存成功:', message);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('消息保存失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 获取指定会话的所有消息
     * @param {string} sessionId - 会话ID，默认为当天会话
     */
    async getMessages(sessionId = null) {
        if (!this.db) {
            await this.initDB();
        }

        const targetSessionId = sessionId || this.generateSessionId();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('sessionId');
            const request = index.getAll(targetSessionId);

            request.onsuccess = () => {
                const messages = request.result.sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                );
                console.log(`获取到 ${messages.length} 条历史消息`);
                resolve(messages);
            };

            request.onerror = () => {
                console.error('获取消息失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 获取最近的多个会话
     * @param {number} limit - 获取会话数量限制
     */
    async getRecentSessions(limit = 10) {
        if (!this.db) {
            await this.initDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const allMessages = request.result;
                
                // 按会话分组
                const sessionMap = new Map();
                allMessages.forEach(message => {
                    if (!sessionMap.has(message.sessionId)) {
                        sessionMap.set(message.sessionId, []);
                    }
                    sessionMap.get(message.sessionId).push(message);
                });

                // 获取每个会话的最后一条消息时间，用于排序
                const sessions = Array.from(sessionMap.entries()).map(([sessionId, messages]) => {
                    const lastMessage = messages.sort((a, b) => 
                        new Date(b.timestamp) - new Date(a.timestamp)
                    )[0];
                    
                    return {
                        sessionId,
                        messageCount: messages.length,
                        lastMessageTime: lastMessage.timestamp,
                        preview: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
                    };
                });

                // 按最后消息时间排序，获取最近的会话
                const recentSessions = sessions
                    .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
                    .slice(0, limit);

                resolve(recentSessions);
            };

            request.onerror = () => {
                console.error('获取会话列表失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 清除指定会话的所有消息
     * @param {string} sessionId - 会话ID，默认为当天会话
     */
    async clearSession(sessionId = null) {
        if (!this.db) {
            await this.initDB();
        }

        const targetSessionId = sessionId || this.generateSessionId();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('sessionId');
            const request = index.openCursor(targetSessionId);

            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    console.log(`清除了 ${deletedCount} 条消息`);
                    resolve(deletedCount);
                }
            };

            request.onerror = () => {
                console.error('清除会话失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 清除所有聊天记录
     */
    async clearAllMessages() {
        if (!this.db) {
            await this.initDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('所有聊天记录已清除');
                resolve();
            };

            request.onerror = () => {
                console.error('清除所有消息失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 保存聊天设置
     * @param {string} key - 设置键
     * @param {*} value - 设置值
     */
    async saveSetting(key, value) {
        if (!this.db) {
            await this.initDB();
        }

        const setting = { key, value, timestamp: new Date().toISOString() };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.settingsStore], 'readwrite');
            const store = transaction.objectStore(this.settingsStore);
            const request = store.put(setting);

            request.onsuccess = () => {
                console.log('设置保存成功:', key, value);
                resolve();
            };

            request.onerror = () => {
                console.error('设置保存失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 获取聊天设置
     * @param {string} key - 设置键
     * @param {*} defaultValue - 默认值
     */
    async getSetting(key, defaultValue = null) {
        if (!this.db) {
            await this.initDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.settingsStore], 'readonly');
            const store = transaction.objectStore(this.settingsStore);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : defaultValue);
            };

            request.onerror = () => {
                console.error('获取设置失败:', request.error);
                resolve(defaultValue);
            };
        });
    }

    /**
     * 导出聊天记录（用于备份）
     */
    async exportMessages() {
        if (!this.db) {
            await this.initDB();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const messages = request.result;
                const exportData = {
                    version: '1.0',
                    exportTime: new Date().toISOString(),
                    messagesCount: messages.length,
                    messages: messages
                };
                resolve(exportData);
            };

            request.onerror = () => {
                console.error('导出消息失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 导入聊天记录（用于恢复）
     * @param {Object} exportData - 导出的数据
     */
    async importMessages(exportData) {
        if (!this.db) {
            await this.initDB();
        }

        if (!exportData.messages || !Array.isArray(exportData.messages)) {
            throw new Error('无效的导入数据格式');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            let importedCount = 0;
            const importPromises = exportData.messages.map(message => {
                return new Promise((resolveImport, rejectImport) => {
                    // 移除原有ID，让数据库自动生成新ID
                    const { id, ...messageData } = message;
                    const request = store.add(messageData);

                    request.onsuccess = () => {
                        importedCount++;
                        resolveImport();
                    };

                    request.onerror = () => {
                        console.warn('导入消息失败:', message, request.error);
                        rejectImport(request.error);
                    };
                });
            });

            Promise.allSettled(importPromises).then(() => {
                console.log(`成功导入 ${importedCount} 条消息`);
                resolve(importedCount);
            });
        });
    }
}

// 创建全局存储管理器实例
window.chatStorage = new ChatStorageManager();

// 导出类定义
window.ChatStorageManager = ChatStorageManager; 