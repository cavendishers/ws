/**
 * 产业链侧边栏企业库管理类
 */
class ChainSidebar {
    constructor() {
        this.sidebar = null;
        this.overlay = null;
        this.currentChainPointId = null;
        this.currentPage = 1;
        this.pageSize = 15;
        this.isOpen = false;
        this.isLoading = false;
        this.isInitialized = false;
        this.chainPointMap = new Map(); // 存储链点ID与节点数据的映射
        
        this.init();
    }
    
    /**
     * 初始化侧边栏
     */
    init() {
        this.createSidebarHTML();
        this.bindEvents();
        this.bindChainPointClickEvents();
    }
    
    /**
     * 创建侧边栏HTML结构
     */
    createSidebarHTML() {
        // 创建遮罩层
        this.overlay = document.createElement('div');
        this.overlay.className = 'chain-sidebar-overlay';
        document.body.appendChild(this.overlay);
        
        // 创建侧边栏
        this.sidebar = document.createElement('div');
        this.sidebar.className = 'chain-sidebar';
        this.sidebar.innerHTML = `
            <div class="chain-sidebar-header">
                <h2 class="chain-sidebar-title">链点关联企业</h2>
                <p class="chain-sidebar-subtitle">正在加载链点信息...</p>
                <button class="chain-sidebar-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chain-sidebar-content">
                <div class="chain-sidebar-loading">
                    <div class="loading-spinner"></div>
                    <p>正在加载企业数据...</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.sidebar);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮事件
        const closeBtn = this.sidebar.querySelector('.chain-sidebar-close');
        closeBtn.addEventListener('click', () => this.closeSidebar());
        
        // 遮罩层点击事件
        this.overlay.addEventListener('click', () => this.closeSidebar());
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeSidebar();
            }
        });
    }
    
    /**
     * 绑定产业链节点点击事件
     */
    bindChainPointClickEvents() {
        // 使用智能等待机制，而不是固定延迟
        this.waitForGraphDataAndBind();
    }
    
    /**
     * 智能等待graphData加载完成并绑定事件
     */
    waitForGraphDataAndBind() {
        let attempts = 0;
        const maxAttempts = 50; // 最多尝试50次（5秒）
        const checkInterval = 100; // 每100ms检查一次
        
        const checkAndBind = () => {
            attempts++;
            
            // 检查graphData是否可用和DOM是否ready
            if (typeof graphData !== 'undefined' && graphData.Children) {
                const chainPoints = document.querySelectorAll('.node-level-2, .node-level-3, .node-level-4');
                
                if (chainPoints.length > 0) {
                    // 数据和DOM都ready，立即绑定
                    this.performBinding();
                    return;
                }
            }
            
            // 如果还没ready且没超过最大尝试次数，继续等待
            if (attempts < maxAttempts) {
                setTimeout(checkAndBind, checkInterval);
            } else {
                console.warn('侧边栏初始化超时，将使用降级方案');
                this.performBinding(); // 即使超时也尝试绑定
            }
        };
        
        // 立即开始检查
        checkAndBind();
    }
    
    /**
     * 执行实际的绑定操作
     */
    performBinding() {
        try {
            // 首先从全局变量graphData中提取所有链点数据
            if (typeof graphData !== 'undefined' && graphData.Children) {
                this.buildChainPointMap(graphData.Children);
            }
            
            const chainPoints = document.querySelectorAll('.node-level-1, .node-level-2, .node-level-3, .node-level-4');
            
            chainPoints.forEach((node) => {
                // 从节点的文本内容匹配链点数据
                const nodeName = node.querySelector('.node-title')?.textContent?.trim();
                
                if (nodeName) {
                    // 从映射表中查找对应的链点数据
                    const chainPointData = this.findChainPointByName(nodeName);
                    
                    if (chainPointData) {
                        // 为节点设置链点ID
                        node.setAttribute('data-chain-point-id', chainPointData.NodeId);
                        node.setAttribute('data-chain-point-name', chainPointData.NodeName);
                        node.setAttribute('data-chain-point-code', chainPointData.NodeCode || '');
                        
                        // 添加拖动检测的点击事件
                        this.bindNodeClickWithDragDetection(node, chainPointData);
                        
                        // 添加视觉反馈
                        node.style.cursor = 'pointer';
                        node.title = `点击查看【${nodeName}】的关联企业`;
                    } else {
                        console.warn(`未找到链点数据: ${nodeName}`);
                        
                        // 为没有找到数据的节点添加Coming Soon提示（也需要拖动检测）
                        this.bindNodeClickWithDragDetection(node, null, nodeName);
                        
                        node.style.cursor = 'pointer';
                        node.title = `${nodeName} - 数据即将上线`;
                    }
                }
            });
            
            console.log(`已绑定 ${chainPoints.length} 个链点的点击事件`);
            console.log(`链点映射表包含 ${this.chainPointMap.size} 个链点`);
            
            // 设置初始化完成标志
            this.isInitialized = true;
            console.log('产业链侧边栏初始化完成，功能已可用！');
            
        } catch (error) {
            console.error('侧边栏绑定事件时出错:', error);
        }
    }
    
    /**
     * 为节点绑定带拖动检测的点击事件
     */
    bindNodeClickWithDragDetection(node, chainPointData, comingSoonName = null) {
        let isDragging = false;
        let mouseDownPos = { x: 0, y: 0 };
        let mouseDownTime = 0;
        const dragThreshold = 5; // 拖动阈值（像素）
        const timeThreshold = 200; // 时间阈值（毫秒）
        
        // 鼠标按下事件
        node.addEventListener('mousedown', (e) => {
            isDragging = false;
            mouseDownPos = { x: e.clientX, y: e.clientY };
            mouseDownTime = Date.now();
        });
        
        // 鼠标移动事件
        node.addEventListener('mousemove', (e) => {
            if (mouseDownTime > 0) {
                const deltaX = Math.abs(e.clientX - mouseDownPos.x);
                const deltaY = Math.abs(e.clientY - mouseDownPos.y);
                
                // 如果鼠标移动超过阈值，标记为拖动
                if (deltaX > dragThreshold || deltaY > dragThreshold) {
                    isDragging = true;
                }
            }
        });
        
        // 鼠标抬起事件
        node.addEventListener('mouseup', (e) => {
            const mouseUpTime = Date.now();
            const timeDiff = mouseUpTime - mouseDownTime;
            
            // 重置状态
            mouseDownTime = 0;
            
            // 如果是拖动或者按住时间太长，不触发点击
            if (isDragging || timeDiff > timeThreshold) {
                isDragging = false;
                return;
            }
            
            // 只有在精确点击时才触发
            e.preventDefault();
            e.stopPropagation();
            
            if (chainPointData) {
                const id = chainPointData.NodeId;
                const name = chainPointData.NodeName;
                console.log(`精确点击了链点: ${name} (ID: ${id})`);
                this.openSidebar(id, name);
            } else if (comingSoonName) {
                console.log(`精确点击了Coming Soon链点: ${comingSoonName}`);
                this.showComingSoon(comingSoonName);
            }
        });
        
        // 鼠标离开事件（清理状态）
        node.addEventListener('mouseleave', () => {
            mouseDownTime = 0;
            isDragging = false;
        });
        
        // 为了兼容性，也监听原始的click事件（但要检查是否为拖动）
        node.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }
    
    /**
     * 构建链点映射表
     */
    buildChainPointMap(nodes) {
        nodes.forEach(node => {
            this.addNodeToMap(node);
        });
    }
    
    /**
     * 递归添加节点到映射表
     */
    addNodeToMap(node) {
        // 只添加有NodeId的节点（真实的链点数据）
        if (node.NodeId && node.NodeName) {
            this.chainPointMap.set(node.NodeName, {
                NodeId: node.NodeId,
                NodeName: node.NodeName,
                NodeCode: node.NodeCode,
                NodeLevel: node.NodeLevel
            });
        }
        
        // 递归处理子节点
        if (node.Children && node.Children.length > 0) {
            node.Children.forEach(child => {
                this.addNodeToMap(child);
            });
        }
    }
    
    /**
     * 根据名称查找链点数据
     */
    findChainPointByName(nodeName) {
        return this.chainPointMap.get(nodeName);
    }
    
    /**
     * 显示Coming Soon提示
     */
    showComingSoon(nodeName) {
        this.isOpen = true;
        
        // 更新标题
        this.updateHeader(`${nodeName} - 敬请期待`, '该链点的企业数据正在整理中...');
        
        // 显示侧边栏和遮罩层
        this.overlay.classList.add('active');
        this.sidebar.classList.add('active');
        
        // 显示Coming Soon内容
        this.showComingSoonContent(nodeName);
    }
    
    /**
     * 显示Coming Soon内容
     */
    showComingSoonContent(nodeName) {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        content.innerHTML = `
            <div class="chain-sidebar-empty">
                <div class="empty-icon" style="font-size: 64px; margin-bottom: 24px;">
                    <i class="fas fa-clock" style="color: #4266AC;"></i>
                </div>
                <h3 style="font-size: 20px; margin-bottom: 12px; color: #F2F5FC;">Coming Soon</h3>
                <p style="font-size: 16px; margin-bottom: 8px; color: #DCE2F0;">【${nodeName}】</p>
                <p style="font-size: 14px; color: #A7B3D2; opacity: 0.8;">该链点的企业数据正在整理中</p>
                <p style="font-size: 14px; color: #A7B3D2; opacity: 0.8;">敬请期待...</p>
            </div>
        `;
    }
    
    /**
     * 打开侧边栏
     */
    async openSidebar(chainPointId, chainPointName) {
        // 如果还未初始化完成，提示用户稍等
        if (!this.isInitialized) {
            console.log('侧边栏还在初始化中，请稍等...');
            return;
        }
        
        if (this.isOpen && this.currentChainPointId === chainPointId) {
            return; // 如果已经打开相同的链点，不重复打开
        }
        
        this.currentChainPointId = chainPointId;
        this.currentPage = 1;
        this.isOpen = true;
        
        // 更新标题
        this.updateHeader(chainPointName, '正在加载企业数据...');
        
        // 显示侧边栏和遮罩层
        this.overlay.classList.add('active');
        this.sidebar.classList.add('active');
        
        // 加载企业数据
        await this.loadEnterpriseData();
    }
    
    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        // 立即移除遮罩层的active类，开始淡出
        this.overlay.classList.remove('active');
        
        // 移除侧边栏的active类并添加closing类来触发滑出动画
        this.sidebar.classList.remove('active');
        this.sidebar.classList.add('closing');
        
        // 动画完成后重置侧边栏位置并清理类
        setTimeout(() => {
            this.sidebar.classList.remove('closing');
            // 确保侧边栏重置到初始位置
            this.sidebar.style.right = '-80%';
            // 清理内联样式
            setTimeout(() => {
                this.sidebar.style.right = '';
            }, 50);
        }, 400);
    }
    
    /**
     * 更新侧边栏头部信息
     */
    updateHeader(title, subtitle) {
        const titleEl = this.sidebar.querySelector('.chain-sidebar-title');
        const subtitleEl = this.sidebar.querySelector('.chain-sidebar-subtitle');
        
        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
    }
    
    /**
     * 加载企业数据
     */
    async loadEnterpriseData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const response = await fetch(
                `/api/chain-point/${this.currentChainPointId}/enterprises/?page=${this.currentPage}&page_size=${this.pageSize}`
            );
            console.log(response)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('获取到企业数据:', data);
            
            this.renderEnterpriseList(data);
            
        } catch (error) {
            console.error('加载企业数据失败:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        content.innerHTML = `
            <div class="chain-sidebar-loading">
                <div class="loading-spinner"></div>
                <p>正在加载企业数据...</p>
            </div>
        `;
    }
    
    /**
     * 显示错误状态
     */
    showError(message) {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        content.innerHTML = `
            <div class="chain-sidebar-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-message">加载失败</div>
                <div class="error-detail">${message}</div>
            </div>
        `;
    }
    
    /**
     * 渲染企业列表
     */
    renderEnterpriseList(data) {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        
        // 检查API返回的coming_soon状态
        if (data.status === 'coming_soon') {
            this.updateHeader(
                `${data.chain_point.name} - 敬请期待`,
                data.message || '该链点的企业数据正在整理中...'
            );
            this.showComingSoonContent(data.chain_point.name);
            return;
        }
        
        if (!data.enterprises || data.enterprises.length === 0) {
            this.showEmpty();
            return;
        }
        
        // 更新头部信息
        this.updateHeader(
            `${data.chain_point.name} - 关联企业`,
            `共 ${data.total_count} 家企业，当前第 ${data.pagination.current_page} 页`
        );
        
        // 渲染企业表格
        const tableHTML = this.generateTableHTML(data.enterprises);
        const paginationHTML = this.generatePaginationHTML(data.pagination);
        
        content.innerHTML = `
            <div class="enterprise-list-container">
                ${tableHTML}
            </div>
            ${paginationHTML}
        `;
        
        // 绑定分页事件
        this.bindPaginationEvents(data.pagination);
    }
    
    /**
     * 生成表格HTML
     */
    generateTableHTML(enterprises) {
        const rows = enterprises.map((enterprise, index) => {
            const serialNumber = ((this.currentPage - 1) * this.pageSize) + index + 1;
            const relevanceClass = this.getRelevanceClass(enterprise.industry_relevance);
            
            return `
                <tr>
                    <td>${serialNumber}</td>
                    <td class="enterprise-name">${enterprise.company_name}</td>
                    <td>${enterprise.chain_point_name}</td>
                    <td>${enterprise.chain_point_level}</td>
                    <td>${enterprise.industry || '-'}</td>
                    <td>${enterprise.industry_sub || '-'}</td>
                    <td>
                        <span class="relevance-tag ${relevanceClass}">
                            ${enterprise.industry_relevance}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
        return `
            <table class="enterprise-table">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>企业名称</th>
                        <th>产业链节点</th>
                        <th>产业链环节</th>
                        <th>主要行业</th>
                        <th>细分领域</th>
                        <th>产业关联性</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }
    
    /**
     * 生成分页HTML
     */
    generatePaginationHTML(pagination) {
        const { current_page, total_pages, total_count } = pagination;
        
        return `
            <div class="sidebar-pagination">
                <button class="pagination-btn ${current_page <= 1 ? 'disabled' : ''}" 
                        data-action="prev" ${current_page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> 上一页
                </button>
                
                <div class="pagination-info">
                    第 ${current_page} 页 / 共 ${total_pages} 页 (${total_count} 条)
                </div>
                
                <button class="pagination-btn ${current_page >= total_pages ? 'disabled' : ''}" 
                        data-action="next" ${current_page >= total_pages ? 'disabled' : ''}>
                    下一页 <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * 绑定分页事件
     */
    bindPaginationEvents(pagination) {
        const prevBtn = this.sidebar.querySelector('[data-action="prev"]');
        const nextBtn = this.sidebar.querySelector('[data-action="next"]');
        
        if (prevBtn && !prevBtn.classList.contains('disabled')) {
            prevBtn.addEventListener('click', () => {
                this.currentPage = pagination.current_page - 1;
                this.loadEnterpriseData();
            });
        }
        
        if (nextBtn && !nextBtn.classList.contains('disabled')) {
            nextBtn.addEventListener('click', () => {
                this.currentPage = pagination.current_page + 1;
                this.loadEnterpriseData();
            });
        }
    }
    
    /**
     * 获取关联性样式类
     */
    getRelevanceClass(relevance) {
        const classMap = {
            '高': 'relevance-high',
            '中': 'relevance-medium',
            '低': 'relevance-low'
        };
        return classMap[relevance] || 'relevance-low';
    }
    
    /**
     * 显示空状态
     */
    showEmpty() {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        content.innerHTML = `
            <div class="chain-sidebar-empty">
                <div class="empty-icon">
                    <i class="fas fa-building"></i>
                </div>
                <div>暂无关联企业</div>
            </div>
        `;
    }
}

// 页面加载完成后初始化侧边栏
document.addEventListener('DOMContentLoaded', function() {
    // 立即初始化，内部会智能等待
    window.chainSidebar = new ChainSidebar();
    console.log('产业链侧边栏开始初始化...');
}); 