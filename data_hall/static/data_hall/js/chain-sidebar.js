/**
 * 产业链侧边栏企业库管理类
 */
class ChainSidebar {
    constructor() {
        this.sidebar = null;
        this.overlay = null;
        this.currentChainPointId = null;
        this.currentChainPointName = null; // 缓存当前链点名称
        this.currentPage = 1;
        this.pageSize = 15;
        this.isOpen = false;
        this.isLoading = false;
        this.isInitialized = false;
        this.chainPointMap = new Map(); // 存储链点ID与节点数据的映射
        
        // 性能优化相关
        this.debounceTimer = null; // 防抖定时器
        this.filterDebounceTimer = null; // 筛选防抖定时器
        this.lastRenderTime = 0; // 上次渲染时间戳
        
        // DOM优化相关
        this.tableContainer = null; // 缓存表格容器引用
        this.isVirtualScrollEnabled = false; // 虚拟滚动开关（实验性功能）
        
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
        // 注意：现在筛选由后端处理，不再需要在前端存储大量数据
        
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
        
        // 延迟显示Coming Soon内容，避免与动画冲突
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.showComingSoonContent(nodeName);
            });
        });
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
        this.currentChainPointName = chainPointName; // 缓存链点名称
        this.currentPage = 1;
        this.isOpen = true;
        
        // 重置筛选条件
        this.clearAllFiltersWithoutRerender();
        
        // 更新标题
        this.updateHeader(chainPointName, '正在加载企业数据...');
        
        // 显示侧边栏和遮罩层
        this.overlay.classList.add('active');
        this.sidebar.classList.add('active');
        
        // 延迟加载企业数据，避免与动画同时进行
        requestAnimationFrame(() => {
            // 再次使用requestAnimationFrame确保动画已开始
            requestAnimationFrame(async () => {
                await this.loadEnterpriseData();
            });
        });
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
            // 构建查询参数
            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize
            });
            
            // 添加筛选条件到查询参数
            this.addFiltersToParams(params);
            
            const response = await fetch(
                `/api/chain-point/${this.currentChainPointId}/enterprises/?${params.toString()}`
            );
            console.log(response)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('获取到企业数据:', data);
            
            // 如果是第一次加载，构建可用的筛选选项
            if (this.currentPage === 1) {
                this.buildAvailableFiltersFromAPI(data);
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
        
        // 生成骨架屏HTML
        const skeletonRows = Array.from({ length: 8 }, (_, index) => `
            <tr class="skeleton-row" style="animation-delay: ${index * 0.1}s">
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 30px;"></div></td>
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 80%;"></div></td>
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 60%;"></div></td>
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 40%;"></div></td>
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 70%;"></div></td>
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 50%;"></div></td>
                <td><div style="height: 16px; background: rgba(66, 102, 172, 0.1); border-radius: 4px; width: 35px;"></div></td>
            </tr>
        `).join('');
        
        content.innerHTML = `
            <div class="chain-sidebar-loading">
                <div class="loading-spinner"></div>
                <p>正在加载企业数据...</p>
            </div>
            <div class="enterprise-list-container">
                <table class="enterprise-table">
                    <thead>
                        <tr>
                            <th>序号</th>
                            <th>企业名称</th>
                            <th>链点名称</th>
                            <th>链点层级</th>
                            <th>主要行业</th>
                            <th>细分领域</th>
                            <th>关联性</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${skeletonRows}
                    </tbody>
                </table>
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
        // 性能监控开始
        const startTime = performance.now();
        
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
        
        // 使用防抖机制避免频繁渲染
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.performRender(data, content, startTime);
        }, 16); // 约1帧的时间，确保流畅度
    }
    
    /**
     * 执行实际的渲染操作 (智能更新版本)
     */
    performRender(data, content, startTime) {
        // 检查是否可以进行增量更新
        const canIncrementalUpdate = this.canUseIncrementalUpdate(data);
        
        if (canIncrementalUpdate) {
            this.performIncrementalUpdate(data, content, startTime);
        } else {
            this.performFullRender(data, content, startTime);
        }
    }
    
    /**
     * 检查是否可以使用增量更新
     */
    canUseIncrementalUpdate(data) {
        // 只有在表格已存在且数据结构相同时才使用增量更新
        const existingTable = this.sidebar.querySelector('.enterprise-table');
        return existingTable && 
               data.enterprises && 
               data.enterprises.length > 0 && 
               !this.hasFilterChanged();
    }
    
    /**
     * 检查筛选条件是否发生变化
     */
    hasFilterChanged() {
        // 简单的变化检测：如果上次渲染时间距现在很近，可能是筛选变化
        return Date.now() - this.lastRenderTime < 1000;
    }
    
    /**
     * 增量更新（仅更新表格内容）
     */
    performIncrementalUpdate(data, content, startTime) {
        requestAnimationFrame(() => {
            const tbody = this.sidebar.querySelector('.enterprise-table tbody');
            const pagination = this.sidebar.querySelector('.sidebar-pagination');
            
            if (tbody && pagination) {
                // 只更新表格内容和分页
                const newRows = this.generateTableRows(data.enterprises);
                const newPaginationHTML = this.generatePaginationHTML(data.pagination);
                
                tbody.innerHTML = newRows;
                pagination.outerHTML = newPaginationHTML;
                
                // 重新绑定分页事件
                this.bindPaginationEvents(data.pagination);
                
                // 性能监控
                const endTime = performance.now();
                const renderTime = endTime - startTime;
                console.log(`链点 ${this.currentChainPointName} 增量更新完成，耗时: ${renderTime.toFixed(2)}ms`);
                this.lastRenderTime = renderTime;
                
                // 执行淡入动画
                this.fadeInTableContent();
            } else {
                // 降级到完整渲染
                this.performFullRender(data, content, startTime);
            }
        });
    }
    
    /**
     * 完整渲染
     */
    performFullRender(data, content, startTime) {
        // 使用文档片段减少DOM操作
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');
        
        // 分阶段渲染，避免长时间阻塞
        requestAnimationFrame(() => {
            // 第一阶段：生成筛选框HTML
            const filtersHTML = this.generateFiltersHTML();
            
            requestAnimationFrame(() => {
                // 第二阶段：检查是否有企业数据并生成内容
                if (!data.enterprises || data.enterprises.length === 0) {
                    // 显示空状态，但保留筛选框
                    container.innerHTML = `
                        ${filtersHTML}
                        <div class="enterprise-list-container">
                            ${this.generateEmptyStateHTML()}
                        </div>
                    `;
                } else {
                    // 渲染企业表格
                    const tableHTML = this.generateTableHTML(data.enterprises);
                    const paginationHTML = this.generatePaginationHTML(data.pagination);
                    
                    container.innerHTML = `
                        ${filtersHTML}
                        <div class="enterprise-list-container">
                            ${tableHTML}
                        </div>
                        ${paginationHTML}
                    `;
                }
                
                fragment.appendChild(container);
                
                requestAnimationFrame(() => {
                    // 第三阶段：更新DOM
                    content.innerHTML = '';
                    content.appendChild(fragment);
                    
                    // 缓存表格容器引用
                    this.tableContainer = content.querySelector('.enterprise-list-container');
                    
                    // 绑定分页事件
                    if (data.enterprises && data.enterprises.length > 0) {
                        this.bindPaginationEvents(data.pagination);
                    }
                    
                    // 性能监控结束
                    const endTime = performance.now();
                    const renderTime = endTime - startTime;
                    console.log(`链点 ${this.currentChainPointName} 完整渲染完成，耗时: ${renderTime.toFixed(2)}ms`);
                    
                    // 记录渲染时间，用于性能分析
                    this.lastRenderTime = renderTime;
                    
                    // 动态调整性能策略
                    this.adjustPerformanceStrategy(renderTime);
                    
                    // 执行淡入动画
                    this.fadeInTableContent();
                });
            });
        });
    }
    
    /**
     * 仅生成表格行内容
     */
    generateTableRows(enterprises) {
        // 提前计算基础值
        const baseSerialNumber = (this.currentPage - 1) * this.pageSize;
        const rows = [];
        
        // 使用for循环而不是map，性能更好
        for (let i = 0; i < enterprises.length; i++) {
            const enterprise = enterprises[i];
            const serialNumber = baseSerialNumber + i + 1;
            
            // 内联relevanceClass计算
            let relevanceClass;
            switch (enterprise.industry_relevance) {
                case '高': relevanceClass = 'relevance-high'; break;
                case '中': relevanceClass = 'relevance-medium'; break;
                case '低': relevanceClass = 'relevance-low'; break;
                default: relevanceClass = 'relevance-low';
            }
            
            rows.push(
                '<tr>',
                '<td>', serialNumber, '</td>',
                '<td class="enterprise-name">', enterprise.company_name || '', '</td>',
                '<td>', enterprise.chain_point_name || '', '</td>',
                '<td>', enterprise.chain_point_level || '', '</td>',
                '<td>', enterprise.industry || '-', '</td>',
                '<td>', enterprise.industry_sub || '-', '</td>',
                '<td><span class="relevance-tag ', relevanceClass, '">',
                enterprise.industry_relevance || '', '</span></td>',
                '</tr>'
            );
        }
        
        return rows.join('');
    }
    
    /**
     * 动态调整性能策略
     */
    adjustPerformanceStrategy(renderTime) {
        if (renderTime > 80) {
            // 渲染时间过长，启用更激进的优化
            console.warn(`渲染时间 ${renderTime.toFixed(2)}ms 过长，启用性能优化模式`);
            this.isVirtualScrollEnabled = true;
            this.pageSize = Math.min(this.pageSize, 10); // 减少每页显示数量
        } else if (renderTime < 30) {
            // 渲染性能很好，可以适当增加每页数量
            this.isVirtualScrollEnabled = false;
            this.pageSize = Math.min(this.pageSize + 5, 20); // 适当增加每页显示数量
        }
    }
    
    /**
     * 生成表格HTML (优化版本)
     */
    generateTableHTML(enterprises) {
        // 提前计算基础值，避免在循环中重复计算
        const baseSerialNumber = (this.currentPage - 1) * this.pageSize;
        
        // 使用数组而不是字符串拼接，性能更好
        const rows = [];
        
        // 批量处理企业数据，减少函数调用开销
        for (let i = 0; i < enterprises.length; i++) {
            const enterprise = enterprises[i];
            const serialNumber = baseSerialNumber + i + 1;
            
            // 内联relevanceClass计算，避免额外函数调用
            let relevanceClass;
            switch (enterprise.industry_relevance) {
                case '高': relevanceClass = 'relevance-high'; break;
                case '中': relevanceClass = 'relevance-medium'; break;
                case '低': relevanceClass = 'relevance-low'; break;
                default: relevanceClass = 'relevance-low';
            }
            
            // 直接使用数组push，避免字符串拼接
            rows.push(
                '<tr>',
                '<td>', serialNumber, '</td>',
                '<td class="enterprise-name">', enterprise.company_name || '', '</td>',
                '<td>', enterprise.chain_point_name || '', '</td>',
                '<td>', enterprise.chain_point_level || '', '</td>',
                '<td>', enterprise.industry || '-', '</td>',
                '<td>', enterprise.industry_sub || '-', '</td>',
                '<td><span class="relevance-tag ', relevanceClass, '">',
                enterprise.industry_relevance || '', '</span></td>',
                '</tr>'
            );
        }
        
        // 一次性拼接，减少内存分配
        return [
            '<table class="enterprise-table">',
            '<thead>',
            '<tr>',
            '<th>序号</th>',
            '<th>企业名称</th>',
            '<th>产业链节点</th>',
            '<th>产业链环节</th>',
            '<th>主要行业</th>',
            '<th>细分领域</th>',
            '<th>产业关联性</th>',
            '</tr>',
            '</thead>',
            '<tbody>',
            ...rows,
            '</tbody>',
            '</table>'
        ].join('');
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
                        ? `当前筛选条件下没有匹配的企业` 
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
     * 添加筛选条件到查询参数
     */
    addFiltersToParams(params) {
        // 行业筛选
        if (this.filters.industries.size > 0) {
            params.append('industries', Array.from(this.filters.industries).join(','));
        }
        
        // 细分领域筛选
        if (this.filters.industrySubCategories.size > 0) {
            params.append('industry_sub_categories', Array.from(this.filters.industrySubCategories).join(','));
        }
        
        // 关联性筛选
        if (this.filters.relevanceLevels.size > 0) {
            params.append('relevance_levels', Array.from(this.filters.relevanceLevels).join(','));
        }
        
        // 地区筛选
        if (this.filters.regions.size > 0) {
            params.append('regions', Array.from(this.filters.regions).join(','));
        }
        
        // 联系方式筛选
        if (this.filters.contactTypes.size > 0) {
            params.append('contact_types', Array.from(this.filters.contactTypes).join(','));
        }
        
        // 科技荣誉筛选
        if (this.filters.techHonors.size > 0) {
            params.append('tech_honors', Array.from(this.filters.techHonors).join(','));
        }
        
        // 融资轮次筛选
        if (this.filters.fundingRounds.size > 0) {
            params.append('funding_rounds', Array.from(this.filters.fundingRounds).join(','));
        }
        
        // 上市状态筛选
        if (this.filters.listingStatus.size > 0) {
            params.append('listing_status', Array.from(this.filters.listingStatus).join(','));
        }
        
        // 企业规模筛选
        if (this.filters.companyScale.size > 0) {
            params.append('company_scale', Array.from(this.filters.companyScale).join(','));
        }
        
        // 员工人数筛选
        if (this.filters.employeeCount.size > 0) {
            params.append('employee_count', Array.from(this.filters.employeeCount).join(','));
        }
        
        // 成立年限筛选
        if (this.filters.establishmentYears.size > 0) {
            params.append('establishment_years', Array.from(this.filters.establishmentYears).join(','));
        }
        
        // 登记状态筛选
        if (this.filters.registrationStatus.size > 0) {
            params.append('registration_status', Array.from(this.filters.registrationStatus).join(','));
        }
    }
    
    /**
     * 从API响应构建可用的筛选选项
     */
    buildAvailableFiltersFromAPI(data) {
        // 清空现有选项
        this.availableFilters.industries.clear();
        this.availableFilters.industrySubCategories.clear();
        
        // 从API响应中获取可用的筛选选项
        if (data.available_filters) {
            // 如果后端返回了可用的筛选选项
            if (data.available_filters.industries) {
                data.available_filters.industries.forEach(industry => {
                    this.availableFilters.industries.add(industry);
                });
            }
            
            if (data.available_filters.industry_sub_categories) {
                data.available_filters.industry_sub_categories.forEach(sub => {
                    this.availableFilters.industrySubCategories.add(sub);
                });
            }
        } else {
            // 降级方案：从当前页面的企业数据中提取
            if (data.enterprises) {
                data.enterprises.forEach(enterprise => {
                    if (enterprise.industry && enterprise.industry !== '-') {
                        this.availableFilters.industries.add(enterprise.industry);
                    }
                    if (enterprise.industry_sub && enterprise.industry_sub !== '-') {
                        this.availableFilters.industrySubCategories.add(enterprise.industry_sub);
                    }
                });
            }
        }
    }
    
    /**
     * 应用筛选条件
     */
    async applyFilters() {
        // 清除之前的防抖定时器
        if (this.filterDebounceTimer) {
            clearTimeout(this.filterDebounceTimer);
        }
        
        // 使用防抖机制，避免频繁的API请求
        this.filterDebounceTimer = setTimeout(async () => {
            // 重置到第一页
            this.currentPage = 1;
            
            // 重新从后端加载数据
            await this.loadEnterpriseData();
        }, 300); // 300ms防抖延迟
    }
    
    /**
     * 生成筛选框HTML
     */
    generateFiltersHTML() {
        // 缓存链点名称，避免重复DOM查询
        const chainPointName = this.currentChainPointName || 
            this.sidebar.querySelector('.chain-sidebar-title')?.textContent
                .replace(' - 关联企业', '')
                .replace(' - 敬请期待', '') || '';
        
        // 缓存数组，避免重复Array.from操作
        const cachedArrays = {
            industries: Array.from(this.availableFilters.industries).sort(),
            subCategories: Array.from(this.availableFilters.industrySubCategories).sort(),
            relevanceLevels: Array.from(this.availableFilters.relevanceLevels),
            regions: Array.from(this.availableFilters.regions),
            contactTypes: Array.from(this.availableFilters.contactTypes),
            techHonors: Array.from(this.availableFilters.techHonors),
            fundingRounds: Array.from(this.availableFilters.fundingRounds),
            listingStatus: Array.from(this.availableFilters.listingStatus),
            companyScale: Array.from(this.availableFilters.companyScale),
            employeeCount: Array.from(this.availableFilters.employeeCount),
            establishmentYears: Array.from(this.availableFilters.establishmentYears),
            registrationStatus: Array.from(this.availableFilters.registrationStatus)
        };
        
        // 优化已选条件的生成
        const activeFiltersHTML = this.generateActiveFiltersHTML(chainPointName);
        
        // 生成筛选选项HTML
        const filterOptionsHTML = this.generateFilterOptionsHTML(cachedArrays);
        
        return `
            <div class="chain-sidebar-filters">
                ${activeFiltersHTML}
                ${cachedArrays.industries.length > 0 ? this.generateRelevanceFilterHTML(cachedArrays.relevanceLevels) : ''}
                ${filterOptionsHTML}
            </div>
            
            <div class="filter-stats">
                ${this.hasActiveFilters() ? `已应用 ${this.getActiveFiltersCount()} 个筛选条件` : '可以使用下方筛选条件进行精确查找'}
            </div>
        `;
    }
    
    /**
     * 生成已选条件HTML
     */
    generateActiveFiltersHTML(chainPointName) {
        const filterConfig = [
            { key: 'relevanceLevels', prefix: '产业关联性' },
            { key: 'industries', prefix: '行业' },
            { key: 'industrySubCategories', prefix: '细分领域' },
            { key: 'regions', prefix: '地区' },
            { key: 'contactTypes', prefix: '联系方式' },
            { key: 'techHonors', prefix: '科技荣誉' },
            { key: 'fundingRounds', prefix: '融资轮次' },
            { key: 'listingStatus', prefix: '上市状态' },
            { key: 'companyScale', prefix: '企业规模' },
            { key: 'employeeCount', prefix: '员工人数' },
            { key: 'establishmentYears', prefix: '成立年限' },
            { key: 'registrationStatus', prefix: '登记状态' }
        ];
        
        const activeFilterTags = [];
        
        // 添加节点标签
        activeFilterTags.push(`<span class="filter-tag active">节点：${chainPointName}</span>`);
        
        // 批量生成已选筛选条件
        filterConfig.forEach(config => {
            if (this.filters[config.key].size > 0) {
                this.filters[config.key].forEach(value => {
                    activeFilterTags.push(
                        `<span class="filter-tag active" onclick="chainSidebar.toggleFilter('${config.key}', '${value}', this)">
                            ${config.prefix}：${value}
                            <span class="close-btn" onclick="event.stopPropagation(); chainSidebar.toggleFilter('${config.key}', '${value}', this.parentElement)">×</span>
                        </span>`
                    );
                });
            }
        });
        
        // 添加清除按钮
        if (this.hasActiveFilters()) {
            activeFilterTags.push(
                `<button class="clear-filters-btn" onclick="chainSidebar.clearAllFilters()">
                    <i class="fas fa-trash"></i> 清除
                </button>`
            );
        }
        
        return `
            <div class="filter-section">
                <label class="filter-label">已选条件</label>
                <div class="filter-row">
                    ${activeFilterTags.join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * 生成关联性筛选HTML
     */
    generateRelevanceFilterHTML(relevanceLevelsArray) {
        const relevanceTags = relevanceLevelsArray.map(level => 
            `<span class="filter-tag ${this.filters.relevanceLevels.has(level) ? 'active' : ''}" 
                  onclick="chainSidebar.toggleFilter('relevanceLevels', '${level}', this)">
                ${level}
            </span>`
        );
        
        return `
            <div class="filter-section">
                <label class="filter-label">产业关联性</label>
                <div class="filter-row">
                    ${relevanceTags.join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * 生成筛选选项HTML
     */
    generateFilterOptionsHTML(cachedArrays) {
        const selectOptions = [
            { key: 'regions', label: '所属地区', array: cachedArrays.regions },
            { key: 'contactTypes', label: '联系方式', array: cachedArrays.contactTypes },
            { key: 'techHonors', label: '科技荣誉', array: cachedArrays.techHonors },
            { key: 'fundingRounds', label: '融资轮次', array: cachedArrays.fundingRounds },
            { key: 'listingStatus', label: '上市/发债', array: cachedArrays.listingStatus },
            { key: 'companyScale', label: '企业规模', array: cachedArrays.companyScale },
            { key: 'employeeCount', label: '员工人数', array: cachedArrays.employeeCount },
            { key: 'establishmentYears', label: '成立年限', array: cachedArrays.establishmentYears },
            { key: 'registrationStatus', label: '登记状态', array: cachedArrays.registrationStatus }
        ];
        
        // 条件添加行业和细分领域选项
        if (cachedArrays.industries.length > 0) {
            selectOptions.push({ key: 'industries', label: '主要行业', array: cachedArrays.industries });
        }
        if (cachedArrays.subCategories.length > 0) {
            selectOptions.push({ key: 'industrySubCategories', label: '细分领域', array: cachedArrays.subCategories });
        }
        
        const selectHTML = selectOptions.map(option => 
            this.generateSelectHTML(option.key, option.label, option.array)
        ).join('');
        
        return `
            <div class="filter-section">
                <label class="filter-label">更多筛选</label>
                <div class="filter-row">
                    ${selectHTML}
                </div>
            </div>
        `;
    }
    
    /**
     * 生成单个select HTML
     */
    generateSelectHTML(key, label, optionsArray) {
        if (optionsArray.length === 0) return '';
        
        const options = optionsArray.map(value => 
            `<option value="${value}">${value}</option>`
        ).join('');
        
        return `
            <select onchange="chainSidebar.addFilter('${key}', this.value, this); this.value='';" class="filter-select">
                <option value="">${label}</option>
                ${options}
            </select>
        `;
    }
    
    /**
     * 切换筛选条件（带动画反馈）
     */
    toggleFilter(filterType, value, element = null) {
        // 添加点击反馈动画
        if (element) {
            this.addClickFeedback(element);
        } else {
            // 如果没有传入元素，尝试找到对应的元素
            const filterElement = this.findFilterElement(filterType, value);
            if (filterElement) {
                this.addClickFeedback(filterElement);
            }
        }
        
        // 即时视觉反馈 - 更新筛选统计
        this.showFilteringFeedback();
        
        if (this.filters[filterType].has(value)) {
            this.filters[filterType].delete(value);
        } else {
            this.filters[filterType].add(value);
        }
        this.applyFiltersWithAnimation();
    }
    
    /**
     * 添加筛选条件（带动画反馈）
     */
    addFilter(filterType, value, element = null) {
        if (value && !this.filters[filterType].has(value)) {
            // 添加选择反馈动画
            if (element) {
                this.addSelectFeedback(element);
            }
            
            // 即时视觉反馈
            this.showFilteringFeedback();
            
            this.filters[filterType].add(value);
            this.applyFiltersWithAnimation();
        }
    }
    
    /**
     * 清除所有筛选条件（带动画反馈）
     */
    clearAllFilters() {
        // 即时视觉反馈
        this.showFilteringFeedback();
        
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
        this.applyFiltersWithAnimation();
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
    
    /**
     * 带动画的筛选应用方法
     */
    async applyFiltersWithAnimation() {
        // 添加数据刷新指示器
        this.showDataRefreshing();
        
        // 淡出当前表格内容
        this.fadeOutTableContent();
        
        // 清除之前的防抖定时器
        if (this.filterDebounceTimer) {
            clearTimeout(this.filterDebounceTimer);
        }
        
        // 使用防抖机制，避免频繁的API请求
        this.filterDebounceTimer = setTimeout(async () => {
            // 重置到第一页
            this.currentPage = 1;
            
            // 重新从后端加载数据
            await this.loadEnterpriseData();
            
            // 移除数据刷新指示器
            this.hideDataRefreshing();
        }, 300); // 300ms防抖延迟
    }
    
    /**
     * 添加点击反馈动画
     */
    addClickFeedback(element) {
        // 移除之前的动画类
        element.classList.remove('clicked');
        
        // 触发重排，确保类被移除
        element.offsetHeight;
        
        // 添加动画类
        element.classList.add('clicked');
        
        // 动画完成后移除类
        setTimeout(() => {
            element.classList.remove('clicked');
        }, 400);
    }
    
    /**
     * 添加选择反馈动画
     */
    addSelectFeedback(element) {
        element.classList.remove('selecting');
        element.offsetHeight;
        element.classList.add('selecting');
        
        setTimeout(() => {
            element.classList.remove('selecting');
        }, 300);
    }
    
    /**
     * 显示筛选反馈
     */
    showFilteringFeedback() {
        const filterStats = this.sidebar.querySelector('.filter-stats');
        const highlight = this.sidebar.querySelector('.filter-stats .highlight');
        
        if (filterStats) {
            filterStats.classList.add('updating');
            setTimeout(() => {
                filterStats.classList.remove('updating');
            }, 500);
        }
        
        if (highlight) {
            highlight.classList.add('updating');
            setTimeout(() => {
                highlight.classList.remove('updating');
            }, 500);
        }
    }
    
    /**
     * 显示数据刷新状态
     */
    showDataRefreshing() {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        if (content) {
            content.classList.add('data-refreshing');
        }
    }
    
    /**
     * 隐藏数据刷新状态
     */
    hideDataRefreshing() {
        const content = this.sidebar.querySelector('.chain-sidebar-content');
        if (content) {
            content.classList.remove('data-refreshing');
        }
    }
    
    /**
     * 淡出表格内容
     */
    fadeOutTableContent() {
        const container = this.sidebar.querySelector('.enterprise-list-container');
        const table = this.sidebar.querySelector('.enterprise-table');
        
        if (container) {
            container.classList.add('fade-out');
        }
        
        if (table) {
            table.classList.add('loading');
        }
    }
    
    /**
     * 淡入表格内容
     */
    fadeInTableContent() {
        const container = this.sidebar.querySelector('.enterprise-list-container');
        const table = this.sidebar.querySelector('.enterprise-table');
        
        if (container) {
            container.classList.remove('fade-out');
            container.classList.add('fade-in');
            
            // 动画完成后移除类
            setTimeout(() => {
                container.classList.remove('fade-in');
            }, 400);
        }
        
        if (table) {
            table.classList.remove('loading');
        }
        
        // 添加表格行的进入动画
        this.animateTableRows();
    }
    
    /**
     * 表格行动画
     */
    animateTableRows() {
        const rows = this.sidebar.querySelectorAll('.enterprise-table tbody tr');
        
        rows.forEach((row, index) => {
            // 重置动画状态
            row.classList.remove('entered');
            row.classList.add('entering');
            
            // 延迟添加进入动画，创建波浪效果
            setTimeout(() => {
                row.classList.remove('entering');
                row.classList.add('entered');
                
                // 清理动画类
                setTimeout(() => {
                    row.classList.remove('entered');
                }, 300);
            }, index * 30); // 每行延迟30ms
        });
    }
    
    /**
     * 查找筛选元素
     */
    findFilterElement(filterType, value) {
        // 尝试找到对应的筛选标签元素
        const filterTags = this.sidebar.querySelectorAll('.filter-tag');
        
        for (const tag of filterTags) {
            const tagText = tag.textContent.trim();
            if (tagText.includes(value)) {
                return tag;
            }
        }
        
        return null;
    }
}

// 页面加载完成后初始化侧边栏
document.addEventListener('DOMContentLoaded', function() {
    // 立即初始化，内部会智能等待
    window.chainSidebar = new ChainSidebar();
    console.log('产业链侧边栏开始初始化...');
}); 