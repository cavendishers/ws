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
        
        // 筛选相关属性
        this.filters = {
            industries: new Set(),
            industrySubCategories: new Set(),
            relevanceLevels: new Set(),
            regions: new Set(),
            contactTypes: new Set(),
            techHonors: new Set(),
            fundingRounds: new Set(),
            listingStatus: new Set(),
            companyScale: new Set(),
            employeeCount: new Set(),
            establishmentYears: new Set(),
            registrationStatus: new Set()
        };
        this.availableFilters = {
            industries: new Set(),
            industrySubCategories: new Set(),
            relevanceLevels: new Set(['高', '中', '低']),
            regions: new Set(['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '陕西省', '山东省', '福建省', '湖南省', '河南省', '安徽省', '重庆市', '天津市', '辽宁省', '河北省', '江西省', '云南省', '山西省', '广西壮族自治区', '贵州省', '吉林省', '新疆维吾尔自治区', '甘肃省', '内蒙古自治区', '黑龙江省', '海南省', '宁夏回族自治区', '青海省', '西藏自治区', '香港特别行政区', '澳门特别行政区', '台湾省']),
            contactTypes: new Set(['有固定电话', '有有效电话', '有官方网站', '有邮箱地址']),
            techHonors: new Set(['国家高新技术企业', '专精特新企业', '独角兽企业', '瞪羚企业', '科技型中小企业']),
            fundingRounds: new Set(['种子轮', '天使轮', 'Pre-A轮', 'A轮', 'A+轮', 'B轮', 'B+轮', 'C轮', 'C+轮', 'D轮及以上', '战略投资', 'IPO']),
            listingStatus: new Set(['已上市', '新三板', '北交所', '科创板', '创业板', '主板', '港股', '美股', '未上市']),
            companyScale: new Set(['大型企业', '中型企业', '小型企业', '微型企业']),
            employeeCount: new Set(['1-49人', '50-99人', '100-499人', '500-999人', '1000-4999人', '5000人以上']),
            establishmentYears: new Set(['1年以内', '1-3年', '3-5年', '5-10年', '10-20年', '20年以上']),
            registrationStatus: new Set(['存续', '在业', '迁入', '迁出', '吊销', '注销', '停业', '清算'])
        };
        this.allEnterprises = []; // 存储所有企业数据用于筛选
        this.filteredEnterprises = []; // 存储筛选后的企业数据
        
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
        
        // 重置筛选条件
        this.clearAllFiltersWithoutRerender();
        this.allEnterprises = [];
        this.filteredEnterprises = [];
        
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
            // 如果是第一页，获取所有数据用于筛选
            const pageSize = this.currentPage === 1 ? 1000 : this.pageSize;
            const response = await fetch(
                `/api/chain-point/${this.currentChainPointId}/enterprises/?page=1&page_size=${pageSize}`
            );
            console.log(response)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('获取到企业数据:', data);
            
            // 如果是第一次加载，存储所有数据并构建筛选选项
            if (this.currentPage === 1) {
                this.allEnterprises = data.enterprises || [];
                this.buildAvailableFilters();
                this.applyFilters();
            }
            
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
        
        // 更新头部信息
        this.updateHeader(
            `${data.chain_point.name} - 关联企业`,
            `共 ${data.total_count} 家企业，当前第 ${data.pagination.current_page} 页`
        );
        
        // 渲染筛选框（只要有原始数据就显示筛选框）
        const filtersHTML = this.allEnterprises.length > 0 ? this.generateFiltersHTML() : '';
        
        // 检查是否有企业数据
        if (!data.enterprises || data.enterprises.length === 0) {
            // 显示空状态，但保留筛选框
            content.innerHTML = `
                ${filtersHTML}
                <div class="enterprise-list-container">
                    ${this.generateEmptyStateHTML()}
                </div>
            `;
            return;
        }
        
        // 渲染企业表格
        const tableHTML = this.generateTableHTML(data.enterprises);
        const paginationHTML = this.generatePaginationHTML(data.pagination);
        
        content.innerHTML = `
            ${filtersHTML}
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
                // 如果有筛选条件，使用筛选后的数据分页
                if (this.hasActiveFilters()) {
                    this.renderFilteredEnterpriseList();
                } else {
                    this.loadEnterpriseData();
                }
            });
        }
        
        if (nextBtn && !nextBtn.classList.contains('disabled')) {
            nextBtn.addEventListener('click', () => {
                this.currentPage = pagination.current_page + 1;
                // 如果有筛选条件，使用筛选后的数据分页
                if (this.hasActiveFilters()) {
                    this.renderFilteredEnterpriseList();
                } else {
                    this.loadEnterpriseData();
                }
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
     * 显示空状态（旧方法，保留兼容性）
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
    
    /**
     * 生成空状态HTML（新方法，用于保留筛选框的空状态）
     */
    generateEmptyStateHTML() {
        const hasFilters = this.hasActiveFilters();
        const totalEnterprises = this.allEnterprises.length;
        
        return `
            <div class="chain-sidebar-empty">
                <div class="empty-icon" style="font-size: 48px; margin-bottom: 16px; color: #4266AC;">
                    <i class="fas fa-search"></i>
                </div>
                <h3 style="font-size: 18px; margin-bottom: 8px; color: #F2F5FC;">
                    ${hasFilters ? '未找到匹配的企业' : '暂无关联企业'}
                </h3>
                <p style="font-size: 14px; color: #A7B3D2; margin-bottom: 16px;">
                    ${hasFilters 
                        ? `当前筛选条件下没有匹配的企业，共有 ${totalEnterprises} 家企业可供筛选` 
                        : '该链点暂时没有关联的企业数据'
                    }
                </p>
                ${hasFilters ? `
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="chainSidebar.clearAllFilters()" 
                            style="background: #4266AC; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        <i class="fas fa-refresh"></i> 清除筛选条件
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 构建可用的筛选选项
     */
    buildAvailableFilters() {
        this.availableFilters.industries.clear();
        this.availableFilters.industrySubCategories.clear();
        
        this.allEnterprises.forEach(enterprise => {
            if (enterprise.industry && enterprise.industry !== '-') {
                this.availableFilters.industries.add(enterprise.industry);
            }
            if (enterprise.industry_sub && enterprise.industry_sub !== '-') {
                this.availableFilters.industrySubCategories.add(enterprise.industry_sub);
            }
        });
    }
    
    /**
     * 应用筛选条件
     */
    applyFilters() {
        this.filteredEnterprises = this.allEnterprises.filter(enterprise => {
            // 行业筛选
            if (this.filters.industries.size > 0) {
                if (!this.filters.industries.has(enterprise.industry)) {
                    return false;
                }
            }
            
            // 细分领域筛选
            if (this.filters.industrySubCategories.size > 0) {
                if (!this.filters.industrySubCategories.has(enterprise.industry_sub)) {
                    return false;
                }
            }
            
            // 关联性筛选
            if (this.filters.relevanceLevels.size > 0) {
                if (!this.filters.relevanceLevels.has(enterprise.industry_relevance)) {
                    return false;
                }
            }
            
            // 地区筛选
            if (this.filters.regions.size > 0) {
                if (!this.filters.regions.has(enterprise.region)) {
                    return false;
                }
            }
            
            // 联系方式筛选
            if (this.filters.contactTypes.size > 0) {
                let hasContactType = false;
                for (let contactType of this.filters.contactTypes) {
                    if (contactType === '有固定电话' && enterprise.has_landline) {
                        hasContactType = true;
                        break;
                    }
                    if (contactType === '有有效电话' && enterprise.has_valid_phone) {
                        hasContactType = true;
                        break;
                    }
                    if (contactType === '有官方网站' && enterprise.has_website) {
                        hasContactType = true;
                        break;
                    }
                    if (contactType === '有邮箱地址' && enterprise.has_email) {
                        hasContactType = true;
                        break;
                    }
                }
                if (!hasContactType) {
                    return false;
                }
            }
            
            // 科技荣誉筛选
            if (this.filters.techHonors.size > 0) {
                if (!enterprise.tech_honors || !this.filters.techHonors.has(enterprise.tech_honors)) {
                    return false;
                }
            }
            
            // 融资轮次筛选
            if (this.filters.fundingRounds.size > 0) {
                if (!enterprise.funding_round || !this.filters.fundingRounds.has(enterprise.funding_round)) {
                    return false;
                }
            }
            
            // 上市状态筛选
            if (this.filters.listingStatus.size > 0) {
                if (!enterprise.listing_status || !this.filters.listingStatus.has(enterprise.listing_status)) {
                    return false;
                }
            }
            
            // 企业规模筛选
            if (this.filters.companyScale.size > 0) {
                if (!enterprise.company_scale || !this.filters.companyScale.has(enterprise.company_scale)) {
                    return false;
                }
            }
            
            // 员工人数筛选
            if (this.filters.employeeCount.size > 0) {
                if (!enterprise.employee_count || !this.filters.employeeCount.has(enterprise.employee_count)) {
                    return false;
                }
            }
            
            // 成立年限筛选
            if (this.filters.establishmentYears.size > 0) {
                if (!enterprise.establishment_years || !this.filters.establishmentYears.has(enterprise.establishment_years)) {
                    return false;
                }
            }
            
            // 登记状态筛选
            if (this.filters.registrationStatus.size > 0) {
                if (!enterprise.registration_status || !this.filters.registrationStatus.has(enterprise.registration_status)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // 重置到第一页
        this.currentPage = 1;
        
        // 重新渲染列表
        this.renderFilteredEnterpriseList();
    }
    
    /**
     * 渲染筛选后的企业列表
     */
    renderFilteredEnterpriseList() {
        const totalCount = this.filteredEnterprises.length;
        const totalPages = Math.ceil(totalCount / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const currentPageEnterprises = this.filteredEnterprises.slice(startIndex, endIndex);
        
        // 构造与API返回格式相同的数据结构
        const mockData = {
            enterprises: currentPageEnterprises,
            total_count: totalCount,
            pagination: {
                current_page: this.currentPage,
                total_pages: totalPages,
                total_count: totalCount
            },
            chain_point: {
                name: this.sidebar.querySelector('.chain-sidebar-title').textContent.replace(' - 关联企业', '').replace(' - 敬请期待', '')
            }
        };
        
        this.renderEnterpriseList(mockData);
    }
    
    /**
     * 生成筛选框HTML
     */
    generateFiltersHTML() {
        const industriesArray = Array.from(this.availableFilters.industries).sort();
        const subCategoriesArray = Array.from(this.availableFilters.industrySubCategories).sort();
        const relevanceLevelsArray = Array.from(this.availableFilters.relevanceLevels);
        const chainPointName = this.sidebar.querySelector('.chain-sidebar-title').textContent.replace(' - 关联企业', '').replace(' - 敬请期待', '');
        
        return `
            <div class="chain-sidebar-filters">
                <div class="filter-section">
                    <label class="filter-label">已选条件</label>
                    <div class="filter-row">
                        <span class="filter-tag active">
                            节点：${chainPointName}
                        </span>
                        ${Array.from(this.filters.relevanceLevels).map(level => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('relevanceLevels', '${level}')">
                                产业关联性：${level}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('relevanceLevels', '${level}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.industries).map(industry => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('industries', '${industry}')">
                                行业：${industry}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('industries', '${industry}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.industrySubCategories).map(sub => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('industrySubCategories', '${sub}')">
                                细分领域：${sub}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('industrySubCategories', '${sub}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.regions).map(region => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('regions', '${region}')">
                                地区：${region}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('regions', '${region}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.contactTypes).map(type => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('contactTypes', '${type}')">
                                联系方式：${type}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('contactTypes', '${type}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.techHonors).map(honor => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('techHonors', '${honor}')">
                                科技荣誉：${honor}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('techHonors', '${honor}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.fundingRounds).map(round => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('fundingRounds', '${round}')">
                                融资轮次：${round}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('fundingRounds', '${round}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.listingStatus).map(status => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('listingStatus', '${status}')">
                                上市状态：${status}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('listingStatus', '${status}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.companyScale).map(scale => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('companyScale', '${scale}')">
                                企业规模：${scale}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('companyScale', '${scale}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.employeeCount).map(count => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('employeeCount', '${count}')">
                                员工人数：${count}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('employeeCount', '${count}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.establishmentYears).map(years => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('establishmentYears', '${years}')">
                                成立年限：${years}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('establishmentYears', '${years}')">×</span>
                            </span>
                        `).join('')}
                        ${Array.from(this.filters.registrationStatus).map(status => `
                            <span class="filter-tag active" onclick="chainSidebar.toggleFilter('registrationStatus', '${status}')">
                                登记状态：${status}
                                <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('registrationStatus', '${status}')">×</span>
                            </span>
                        `).join('')}
                        ${this.hasActiveFilters() ? `
                        <button class="clear-filters-btn" onclick="chainSidebar.clearAllFilters()">
                            <i class="fas fa-trash"></i> 清除
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                ${industriesArray.length > 0 ? `
                <div class="filter-section">
                    <label class="filter-label">产业关联性</label>
                    <div class="filter-row">
                        ${relevanceLevelsArray.map(level => `
                            <span class="filter-tag ${this.filters.relevanceLevels.has(level) ? 'active' : ''}" 
                                  onclick="chainSidebar.toggleFilter('relevanceLevels', '${level}')">
                                ${level}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="filter-section">
                    <label class="filter-label">更多筛选</label>
                    <div class="filter-row">
                        <select onchange="chainSidebar.addFilter('regions', this.value); this.value='';" class="filter-select">
                            <option value="">所属地区</option>
                            ${Array.from(this.availableFilters.regions).map(region => `<option value="${region}">${region}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('contactTypes', this.value); this.value='';" class="filter-select">
                            <option value="">联系方式</option>
                            ${Array.from(this.availableFilters.contactTypes).map(type => `<option value="${type}">${type}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('techHonors', this.value); this.value='';" class="filter-select">
                            <option value="">科技荣誉</option>
                            ${Array.from(this.availableFilters.techHonors).map(honor => `<option value="${honor}">${honor}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('fundingRounds', this.value); this.value='';" class="filter-select">
                            <option value="">融资轮次</option>
                            ${Array.from(this.availableFilters.fundingRounds).map(round => `<option value="${round}">${round}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('listingStatus', this.value); this.value='';" class="filter-select">
                            <option value="">上市/发债</option>
                            ${Array.from(this.availableFilters.listingStatus).map(status => `<option value="${status}">${status}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('companyScale', this.value); this.value='';" class="filter-select">
                            <option value="">企业规模</option>
                            ${Array.from(this.availableFilters.companyScale).map(scale => `<option value="${scale}">${scale}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('employeeCount', this.value); this.value='';" class="filter-select">
                            <option value="">员工人数</option>
                            ${Array.from(this.availableFilters.employeeCount).map(count => `<option value="${count}">${count}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('establishmentYears', this.value); this.value='';" class="filter-select">
                            <option value="">成立年限</option>
                            ${Array.from(this.availableFilters.establishmentYears).map(years => `<option value="${years}">${years}</option>`).join('')}
                        </select>
                        <select onchange="chainSidebar.addFilter('registrationStatus', this.value); this.value='';" class="filter-select">
                            <option value="">登记状态</option>
                            ${Array.from(this.availableFilters.registrationStatus).map(status => `<option value="${status}">${status}</option>`).join('')}
                        </select>
                        ${industriesArray.length > 0 ? `
                        <select onchange="chainSidebar.addFilter('industries', this.value); this.value='';" class="filter-select">
                            <option value="">主要行业</option>
                            ${industriesArray.map(industry => `<option value="${industry}">${industry}</option>`).join('')}
                        </select>
                        ` : ''}
                        ${subCategoriesArray.length > 0 ? `
                        <select onchange="chainSidebar.addFilter('industrySubCategories', this.value); this.value='';" class="filter-select">
                            <option value="">细分领域</option>
                            ${subCategoriesArray.map(sub => `<option value="${sub}">${sub}</option>`).join('')}
                        </select>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="filter-stats">
                已筛选出 <span class="highlight">${this.filteredEnterprises.length}</span> 家企业
                ${this.hasActiveFilters() ? `，共 ${this.getActiveFiltersCount()} 个筛选条件` : ''}
            </div>
        `;
    }
    
    /**
     * 切换筛选条件
     */
    toggleFilter(filterType, value) {
        if (this.filters[filterType].has(value)) {
            this.filters[filterType].delete(value);
        } else {
            this.filters[filterType].add(value);
        }
        this.applyFilters();
    }
    
    /**
     * 添加筛选条件
     */
    addFilter(filterType, value) {
        if (value && !this.filters[filterType].has(value)) {
            this.filters[filterType].add(value);
            this.applyFilters();
        }
    }
    
    /**
     * 清除所有筛选条件
     */
    clearAllFilters() {
        this.filters.industries.clear();
        this.filters.industrySubCategories.clear();
        this.filters.relevanceLevels.clear();
        this.filters.regions.clear();
        this.filters.contactTypes.clear();
        this.filters.techHonors.clear();
        this.filters.fundingRounds.clear();
        this.filters.listingStatus.clear();
        this.filters.companyScale.clear();
        this.filters.employeeCount.clear();
        this.filters.establishmentYears.clear();
        this.filters.registrationStatus.clear();
        this.applyFilters();
    }
    
    /**
     * 清除所有筛选条件（不重新渲染）
     */
    clearAllFiltersWithoutRerender() {
        this.filters.industries.clear();
        this.filters.industrySubCategories.clear();
        this.filters.relevanceLevels.clear();
        this.filters.regions.clear();
        this.filters.contactTypes.clear();
        this.filters.techHonors.clear();
        this.filters.fundingRounds.clear();
        this.filters.listingStatus.clear();
        this.filters.companyScale.clear();
        this.filters.employeeCount.clear();
        this.filters.establishmentYears.clear();
        this.filters.registrationStatus.clear();
    }
    
    /**
     * 检查是否有激活的筛选条件
     */
    hasActiveFilters() {
        return this.filters.industries.size > 0 || 
               this.filters.industrySubCategories.size > 0 || 
               this.filters.relevanceLevels.size > 0 ||
               this.filters.regions.size > 0 ||
               this.filters.contactTypes.size > 0 ||
               this.filters.techHonors.size > 0 ||
               this.filters.fundingRounds.size > 0 ||
               this.filters.listingStatus.size > 0 ||
               this.filters.companyScale.size > 0 ||
               this.filters.employeeCount.size > 0 ||
               this.filters.establishmentYears.size > 0 ||
               this.filters.registrationStatus.size > 0;
    }
    
    /**
     * 获取激活的筛选条件数量
     */
    getActiveFiltersCount() {
        return this.filters.industries.size + 
               this.filters.industrySubCategories.size + 
               this.filters.relevanceLevels.size +
               this.filters.regions.size +
               this.filters.contactTypes.size +
               this.filters.techHonors.size +
               this.filters.fundingRounds.size +
               this.filters.listingStatus.size +
               this.filters.companyScale.size +
               this.filters.employeeCount.size +
               this.filters.establishmentYears.size +
               this.filters.registrationStatus.size;
    }
}

// 页面加载完成后初始化侧边栏
document.addEventListener('DOMContentLoaded', function() {
    // 立即初始化，内部会智能等待
    window.chainSidebar = new ChainSidebar();
    console.log('产业链侧边栏开始初始化...');
}); 