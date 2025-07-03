/**
 * 三级联动地区选择器类 - 基于后端预渲染HTML
 */
class RegionSelector {
    // 常量定义
    static REGION_TYPES = {
        PROVINCE: 'province',
        CITY: 'city', 
        DISTRICT: 'district'
    };
    
    static REGION_LEVELS = {
        PROVINCE: 1,
        CITY: 2,
        DISTRICT: 3
    };
    
    static MUNICIPALITIES = ['北京市', '上海市', '天津市', '重庆市'];
    
    static IGNORED_REGIONS = ['市辖区', '县', '自治区直辖县级行政区划', '市辖县'];
    
    static SELECTORS = {
        REGION_ITEM: '.region-item',
        REGION_CHECKBOX: '.region-checkbox',
        CLOSE_BUTTON: '.region-selector-close',
        RESET_BUTTON: '.region-btn-reset',
        CONFIRM_BUTTON: '.region-btn-confirm',
        SEARCH_INPUT: '.region-search-input',
        SELECTED_COUNT: '#selected-count'
    };
    constructor() {
        console.log('RegionSelector 构造函数开始执行...');
        
        try {
            this.modal = null;
            // 简化选择逻辑：只维护一个选中状态集合
            this.selectedRegions = new Set(); // 用户实际选中的地区（所有级别）
            this.currentProvince = null;
            this.currentCity = null;
            this.searchKeyword = '';
            this.onConfirm = null;
            this.searchDebounceTimer = null;
            this.updateTimer = null; // 用于防抖UI更新
            
            // 缓存DOM元素
            this.provinceColumn = null;
            this.cityColumn = null;
            this.districtColumn = null;
            this.searchInput = null;
            this.selectedCountEl = null;
            this.regionDomCache = null;
            
            // 性能优化缓存
            this.childCodesCache = new Map();
            this.parentCodesCache = new Map();
            
            this.init();
            console.log('RegionSelector 构造完成');
        } catch (error) {
            console.error('RegionSelector 构造失败:', error);
            throw error;
        }
    }
    
    /**
     * 初始化
     */
    init() {
        this.loadRegionDomCache();
        this.createModal();
        this.bindEvents();
    }
    
    /**
     * 加载地区DOM缓存
     */
    loadRegionDomCache() {
        console.log('开始加载地区DOM缓存...');
        
        let templateElement = document.getElementById('region-dom-cache');
        
        if (!templateElement) {
            console.error('未找到地区数据缓存，请确保页面包含 #region-dom-cache 元素');
            
            const templates = document.querySelectorAll('template');
            for (let template of templates) {
                if (template.innerHTML.includes('region-item')) {
                    templateElement = template;
                    break;
                }
            }
            
            if (!templateElement) return;
        }
        
        if (templateElement.tagName.toLowerCase() === 'template') {
            this.regionDomCache = templateElement.content || templateElement;
        } else {
            this.regionDomCache = templateElement;
        }
        
        console.log('地区DOM缓存加载成功');
    }
    
    /**
     * 创建模态框
     */
    createModal() {
        this.modal = this._createModalElement();
        this.modal.innerHTML = this._getModalTemplate();
        
        document.body.appendChild(this.modal);
        this._cacheModalElements();
    }
    
    /**
     * 创建模态框DOM元素
     * @private
     * @returns {HTMLElement} 模态框元素
     */
    _createModalElement() {
        const modal = document.createElement('div');
        modal.className = 'region-selector-modal';
        return modal;
    }
    
    /**
     * 获取模态框HTML模板
     * @private
     * @returns {string} HTML模板字符串
     */
    _getModalTemplate() {
        return `
            <div class="region-selector-container">
                ${this._getModalHeaderTemplate()}
                ${this._getSearchContainerTemplate()}
                ${this._getColumnsTemplate()}
                ${this._getFooterTemplate()}
            </div>
        `;
    }
    
    /**
     * 获取模态框头部模板
     * @private
     * @returns {string} 头部HTML模板
     */
    _getModalHeaderTemplate() {
        return `
            <div class="region-selector-header">
                <h3 class="region-selector-title">选择地区</h3>
                <button class="region-selector-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * 获取搜索容器模板
     * @private
     * @returns {string} 搜索容器HTML模板
     */
    _getSearchContainerTemplate() {
        return `
            <div class="region-search-container">
                <input type="text" class="region-search-input" placeholder="搜索省份、城市或区县...">
            </div>
        `;
    }
    
    /**
     * 获取列容器模板
     * @private
     * @returns {string} 列容器HTML模板
     */
    _getColumnsTemplate() {
        return `
            <div class="region-columns">
                ${this._getColumnTemplate('province', '省份/直辖市', 'province-column', '正在加载省份数据...', true)}
                ${this._getColumnTemplate('city', '城市', 'city-column', '请先选择省份')}
                ${this._getColumnTemplate('district', '区县', 'district-column', '请先选择城市')}
            </div>
        `;
    }
    
    /**
     * 获取单个列模板
     * @private
     * @param {string} type - 列类型
     * @param {string} title - 列标题
     * @param {string} id - 列ID
     * @param {string} emptyText - 空状态文本
     * @param {boolean} isLoading - 是否显示加载状态
     * @returns {string} 列HTML模板
     */
    _getColumnTemplate(type, title, id, emptyText, isLoading = false) {
        const iconMap = {
            province: 'fas fa-map',
            city: 'fas fa-map-marker-alt',
            district: 'fas fa-building'
        };
        
        const contentClass = isLoading ? 'region-loading' : 'region-empty';
        const contentIcon = isLoading ? 
            '<div class="region-loading-spinner"></div>' : 
            `<div class="region-empty-icon"><i class="${iconMap[type]}"></i></div>`;
        
        return `
            <div class="region-column">
                <div class="region-column-header">${title}</div>
                <div class="region-column-content" id="${id}">
                    <div class="${contentClass}">
                        ${contentIcon}
                        <div>${emptyText}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取页脚模板
     * @private
     * @returns {string} 页脚HTML模板
     */
    _getFooterTemplate() {
        return `
            <div class="region-selector-footer">
                <div class="selected-count">已选择 <span id="selected-count">0</span> 个地区</div>
                <div class="region-actions">
                    <button class="region-btn region-btn-reset">重置</button>
                    <button class="region-btn region-btn-confirm">确定</button>
                </div>
            </div>
        `;
    }
    
    /**
     * 缓存模态框内的DOM元素
     * @private
     */
    _cacheModalElements() {
        this.provinceColumn = this.modal.querySelector('#province-column');
        this.cityColumn = this.modal.querySelector('#city-column');
        this.districtColumn = this.modal.querySelector('#district-column');
        this.searchInput = this.modal.querySelector('.region-search-input');
        this.selectedCountEl = this.modal.querySelector('#selected-count');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        this._bindModalEvents();
        this._bindKeyboardEvents();
        this._bindSearchEvents();
        this._bindActionButtonEvents();
    }
    
    /**
     * 绑定模态框事件
     * @private
     */
    _bindModalEvents() {
        this.modal.querySelector(RegionSelector.SELECTORS.CLOSE_BUTTON)
            .addEventListener('click', () => this.hide());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }
    
    /**
     * 绑定键盘事件
     * @private
     */
    _bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.hide();
            }
        });
    }
    
    /**
     * 绑定搜索事件
     * @private
     */
    _bindSearchEvents() {
        this.searchInput.addEventListener('input', (e) => {
            this._handleSearchInput(e.target.value.trim());
        });
    }
    
    /**
     * 处理搜索输入
     * @private
     * @param {string} value - 搜索值
     */
    _handleSearchInput(value) {
        this.searchKeyword = value;
        clearTimeout(this.searchDebounceTimer);
        
        if (!this.searchKeyword) {
            this.loadProvinces();
            return;
        }
        
        this.searchDebounceTimer = setTimeout(() => this.performSearch(), 200);
    }
    
    /**
     * 绑定操作按钮事件
     * @private
     */
    _bindActionButtonEvents() {
        this.modal.querySelector(RegionSelector.SELECTORS.RESET_BUTTON)
            .addEventListener('click', () => this.reset());
        
        this.modal.querySelector(RegionSelector.SELECTORS.CONFIRM_BUTTON)
            .addEventListener('click', () => this.confirm());
    }
    
    /**
     * 显示选择器
     */
    show(selectedRegions = [], onConfirm = null) {
        this.selectedRegions = new Set(selectedRegions);
        this.onConfirm = onConfirm;
        
        if (selectedRegions.length === 0) {
            this.currentProvince = null;
            this.currentCity = null;
            this.searchKeyword = '';
            this.searchInput.value = '';
        }
        
        this.modal.classList.add('active');
        this.loadProvinces();
        this.updateSelectedCount();
        
        setTimeout(() => this.searchInput.focus(), 300);
    }
    
    /**
     * 隐藏选择器
     */
    hide() {
        this.modal.classList.remove('active');
        this.searchInput.value = '';
        this.searchKeyword = '';
        this.currentProvince = null;
        this.currentCity = null;
        
        // 清理性能优化缓存（避免内存泄漏）
        this._clearPerformanceCache();
    }
    
    /**
     * 清理性能优化缓存
     * @private
     */
    _clearPerformanceCache() {
        this.childCodesCache.clear();
        this.parentCodesCache.clear();
        
        if (this.updateTimer) {
            cancelAnimationFrame(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * 从DOM缓存中获取地区项
     */
    getRegionItemsFromCache(type, parentCode = null) {
        if (!this.regionDomCache) return [];
        
        let items = this.regionDomCache.querySelectorAll(`[data-type="${type}"]`);
        
        if (parentCode) {
            return Array.from(items).filter(item => item.getAttribute('data-parent') === parentCode);
        } else if (type === 'province') {
            return Array.from(items).filter(item => {
                const parent = item.getAttribute('data-parent');
                return !parent || parent === '';
            });
        }
        
        return Array.from(items);
    }
    
    /**
     * 加载省份列表
     */
    loadProvinces() {
        if (!this.regionDomCache) {
            this.showError(this.provinceColumn, '地区数据未加载');
            return;
        }
        
        const provinceItems = this.getRegionItemsFromCache('province');
        
        if (provinceItems.length === 0) {
            this.showError(this.provinceColumn, '省份数据为空');
            return;
        }
        
        const processedItems = provinceItems.map(item => {
            const cloned = item.cloneNode(true);
            const code = cloned.getAttribute('data-code');
            
            this.updateItemSelectionState(cloned, code);
            this.addChildCount(cloned, code);
            
            return cloned;
        });
        
        this.provinceColumn.innerHTML = '';
        processedItems.forEach(item => this.provinceColumn.appendChild(item));
        
        this.bindColumnEvents(this.provinceColumn, 'province');
        
        // 自动展开有选中子项的省份
        const expandProvinceCode = this.findProvinceToExpand();
        if (expandProvinceCode) {
            this.loadCities(expandProvinceCode);
            this.setActiveItem(this.provinceColumn, expandProvinceCode);
        } else {
            this.showEmpty(this.cityColumn, '请先选择省份');
            this.showEmpty(this.districtColumn, '请先选择城市');
        }
    }
    
    /**
     * 查找需要展开的省份
     */
    findProvinceToExpand() {
        const provinceItems = this.getRegionItemsFromCache('province');
        
        // 优先展开直接选中的省份
        for (let item of provinceItems) {
            const code = item.getAttribute('data-code');
            if (this.selectedRegions.has(code)) {
                return code;
            }
        }
        
        // 其次展开有选中子项的省份
        for (let item of provinceItems) {
            const code = item.getAttribute('data-code');
            if (this.hasSelectedChildren(code)) {
                return code;
            }
        }
        
        return null;
    }
    
    /**
     * 加载城市列表
     */
    loadCities(provinceCode) {
        this.currentProvince = provinceCode;
        
        const cityItems = this.getRegionItemsFromCache('city', provinceCode);
        
        if (cityItems.length === 0) {
            this.showEmpty(this.cityColumn, '该省份暂无城市数据');
            this.showEmpty(this.districtColumn, '请先选择城市');
            return;
        }
        
        const processedItems = cityItems.map(item => {
            const cloned = item.cloneNode(true);
            const code = cloned.getAttribute('data-code');
            
            this.updateItemSelectionState(cloned, code);
            this.addChildCount(cloned, code);
            
            return cloned;
        });
        
        this.cityColumn.innerHTML = '';
        processedItems.forEach(item => this.cityColumn.appendChild(item));
        
        this.bindColumnEvents(this.cityColumn, 'city');
        
        this.showEmpty(this.districtColumn, '请先选择城市');
        this.currentCity = null;
        
        // 自动展开有选中子项的城市
        const expandCityCode = this.findCityToExpand(provinceCode);
        if (expandCityCode) {
            this.loadDistricts(expandCityCode);
            this.setActiveItem(this.cityColumn, expandCityCode);
        }
    }
    
    /**
     * 查找需要展开的城市
     */
    findCityToExpand(provinceCode) {
        const cityItems = this.getRegionItemsFromCache('city', provinceCode);
        
        // 优先展开直接选中的城市
        for (let item of cityItems) {
            const code = item.getAttribute('data-code');
            if (this.selectedRegions.has(code)) {
                return code;
            }
        }
        
        // 其次展开有选中子项的城市
        for (let item of cityItems) {
            const code = item.getAttribute('data-code');
            if (this.hasSelectedChildren(code)) {
                return code;
            }
        }
        
        return null;
    }
    
    /**
     * 加载区县列表
     */
    loadDistricts(cityCode) {
        this.currentCity = cityCode;
        
        const districtItems = this.getRegionItemsFromCache('district', cityCode);
        
        if (districtItems.length === 0) {
            this.showEmpty(this.districtColumn, '该城市暂无区县数据');
            return;
        }
        
        const processedItems = districtItems.map(item => {
            const cloned = item.cloneNode(true);
            const code = cloned.getAttribute('data-code');
            
            this.updateItemSelectionState(cloned, code);
            
            return cloned;
        });
        
        this.districtColumn.innerHTML = '';
        processedItems.forEach(item => this.districtColumn.appendChild(item));
        
        this.bindColumnEvents(this.districtColumn, 'district');
    }
    
    /**
     * 更新项目选中状态
     */
    updateItemSelectionState(item, code) {
        const isSelected = this.isRegionSelected(code);
        const checkbox = item.querySelector('.region-checkbox');
        
        if (checkbox) {
            checkbox.checked = isSelected;
        }
        
        item.classList.toggle('selected', isSelected);
    }
    
    /**
     * 判断地区是否应该显示为选中状态
     */
    isRegionSelected(code) {
        // 1. 直接选中
        if (this.selectedRegions.has(code)) {
            return true;
        }
        
        // 2. 父级选中且当前项未被明确排除
        const parentCodes = this.getAllParentCodes(code);
        for (const parentCode of parentCodes) {
            if (this.selectedRegions.has(parentCode)) {
                // 检查从父级到当前项的路径上是否有被明确排除的项
                if (!this._hasExcludedInPath(parentCode, code)) {
                    return true;
                }
            }
        }
        
        // 3. 作为父级，如果有子级被选中，也应该显示为选中（用于显示层级关系）
        if (this.shouldParentShowAsSelected(code)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 检查从父级到子级的路径上是否有被明确排除的项
     * @private
     * @param {string} parentCode - 父级代码
     * @param {string} childCode - 子级代码
     * @returns {boolean} 路径上是否有排除项
     */
    _hasExcludedInPath(parentCode, childCode) {
        const childParents = this.getAllParentCodes(childCode);
        const parentIndex = childParents.indexOf(parentCode);
        
        if (parentIndex === -1) return false;
        
        // 检查从父级到子级路径上的所有中间节点
        for (let i = 0; i < parentIndex; i++) {
            const intermediateCode = childParents[i];
            if (this.selectedRegions.has(`-${intermediateCode}`)) {
                return true; // 发现排除标记
            }
        }
        
        return this.selectedRegions.has(`-${childCode}`); // 检查子级本身是否被排除
    }
    
    /**
     * 判断父级是否应该显示为选中状态
     */
    shouldParentShowAsSelected(parentCode) {
        // 如果父级本身被选中，不在这里处理（在isRegionSelected的第1步处理）
        if (this.selectedRegions.has(parentCode)) {
            return false;
        }
        
        // 如果有任何子级被直接选中，父级也应该显示为选中（用于显示层级关系）
        // 注意：这里只检查直接选中，避免无限递归
        const allChildCodes = this.getAllChildCodes(parentCode);
        return allChildCodes.some(childCode => this.selectedRegions.has(childCode));
    }
    
    /**
     * 添加子级数量显示
     */
    addChildCount(item, code) {
        const childCount = this.getChildCount(code);
        const countEl = item.querySelector('.region-count');
        
        if (countEl) {
            countEl.textContent = childCount > 0 ? `(${childCount})` : '';
        } else if (childCount > 0) {
            const countSpan = document.createElement('span');
            countSpan.className = 'region-count';
            countSpan.textContent = `(${childCount})`;
            item.appendChild(countSpan);
        }
    }
    
    /**
     * 设置激活项目
     */
    setActiveItem(column, code) {
        column.querySelectorAll('.region-item').forEach(i => i.classList.remove('active'));
        const item = column.querySelector(`[data-code="${code}"]`);
        if (item) {
            item.classList.add('active');
        }
    }
    
    /**
     * 获取子级数量
     */
    getChildCount(code) {
        if (!this.regionDomCache) return 0;
        return this.regionDomCache.querySelectorAll(`[data-parent="${code}"]`).length;
    }
    
    /**
     * 检查是否有选中的子地区
     */
    hasSelectedChildren(code) {
        const childCodes = this.getAllChildCodes(code);
        return childCodes.some(childCode => this.selectedRegions.has(childCode));
    }
    
    /**
     * 获取所有子地区代码（带缓存优化）
     */
    getAllChildCodes(parentCode) {
        if (!this.regionDomCache) return [];
        
        // 检查缓存
        if (this.childCodesCache.has(parentCode)) {
            return this.childCodesCache.get(parentCode);
        }
        
        const childCodes = [];
        const directChildren = this.regionDomCache.querySelectorAll(`[data-parent="${parentCode}"]`);
        
        directChildren.forEach(child => {
            const childCode = child.getAttribute('data-code');
            childCodes.push(childCode);
            
            const grandChildren = this.getAllChildCodes(childCode);
            childCodes.push(...grandChildren);
        });
        
        // 缓存结果
        this.childCodesCache.set(parentCode, childCodes);
        return childCodes;
    }
    
    /**
     * 获取所有父地区代码（带缓存优化）
     */
    getAllParentCodes(code) {
        if (!this.regionDomCache) return [];
        
        // 检查缓存
        if (this.parentCodesCache.has(code)) {
            return this.parentCodesCache.get(code);
        }
        
        const parentCodes = [];
        let currentCode = code;
        
        while (currentCode) {
            const item = this.regionDomCache.querySelector(`[data-code="${currentCode}"]`);
            if (!item) break;
            
            const parentCode = item.getAttribute('data-parent');
            if (parentCode) {
                parentCodes.push(parentCode);
                currentCode = parentCode;
            } else {
                break;
            }
        }
        
        // 缓存结果
        this.parentCodesCache.set(code, parentCodes);
        return parentCodes;
    }
    
    /**
     * 绑定列事件
     */
    bindColumnEvents(column, type) {
        const items = column.querySelectorAll(RegionSelector.SELECTORS.REGION_ITEM);
        items.forEach(item => {
            this._bindSingleItemEvents(item, type, column);
        });
    }
    
    /**
     * 绑定单个项目的事件
     * @private
     * @param {HTMLElement} item - 地区项目元素
     * @param {string} type - 地区类型
     * @param {HTMLElement} column - 所属列元素
     */
    _bindSingleItemEvents(item, type, column) {
        const code = this._getItemCode(item);
        const checkbox = this._getItemCheckbox(item);
        
        this._bindCheckboxChangeEvent(checkbox, code, type, column, item);
        this._bindItemClickEvent(item, checkbox, type, code, column);
    }
    
    /**
     * 获取项目的地区代码
     * @private
     * @param {HTMLElement} item - 地区项目元素
     * @returns {string} 地区代码
     */
    _getItemCode(item) {
        return item.getAttribute('data-code');
    }
    
    /**
     * 获取项目的复选框元素
     * @private
     * @param {HTMLElement} item - 地区项目元素
     * @returns {HTMLElement} 复选框元素
     */
    _getItemCheckbox(item) {
        return item.querySelector(RegionSelector.SELECTORS.REGION_CHECKBOX);
    }
    
    /**
     * 绑定复选框变化事件
     * @private
     * @param {HTMLElement} checkbox - 复选框元素
     * @param {string} code - 地区代码
     * @param {string} type - 地区类型
     * @param {HTMLElement} column - 所属列元素
     * @param {HTMLElement} item - 项目元素
     */
    _bindCheckboxChangeEvent(checkbox, code, type, column, item) {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            
            if (checkbox.checked) {
                this._handleCheckboxChecked(code, type, column, item);
            } else {
                this._handleCheckboxUnchecked(code);
            }
            
            this._updateUIAfterSelection();
        });
    }
    
    /**
     * 处理复选框被勾选
     * @private
     * @param {string} code - 地区代码
     * @param {string} type - 地区类型
     * @param {HTMLElement} column - 所属列元素
     * @param {HTMLElement} item - 项目元素
     */
    _handleCheckboxChecked(code, type, column, item) {
        this.selectRegion(code);
        this.expandRegion(type, code, column, item);
    }
    
    /**
     * 处理复选框被取消勾选
     * @private
     * @param {string} code - 地区代码
     */
    _handleCheckboxUnchecked(code) {
        this.deselectRegion(code);
    }
    
    /**
     * 绑定项目点击事件
     * @private
     * @param {HTMLElement} item - 项目元素
     * @param {HTMLElement} checkbox - 复选框元素
     * @param {string} type - 地区类型
     * @param {string} code - 地区代码
     * @param {HTMLElement} column - 所属列元素
     */
    _bindItemClickEvent(item, checkbox, type, code, column) {
        item.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            this.expandRegion(type, code, column, item);
        });
    }
    
    /**
     * 选择操作后更新UI（使用防抖优化性能）
     * @private
     */
    _updateUIAfterSelection() {
        // 取消之前的更新
        if (this.updateTimer) {
            cancelAnimationFrame(this.updateTimer);
        }
        
        // 使用 requestAnimationFrame 来优化DOM更新
        this.updateTimer = requestAnimationFrame(() => {
            this.updateAllDisplayedSelectionStates();
            this.updateSelectedCount();
            this.updateTimer = null;
        });
    }
    
    /**
     * 展开地区
     */
    expandRegion(type, code, column, item) {
        column.querySelectorAll('.region-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        if (type === 'province') {
            this.loadCities(code);
        } else if (type === 'city') {
            this.loadDistricts(code);
        }
    }
    
    /**
     * 选中地区（简化逻辑）
     */
    selectRegion(code) {
        console.log(`选择地区: ${this.findRegionName(code)} (${code})`);
        
        // 1. 移除排除标记（如果存在）
        this.selectedRegions.delete(`-${code}`);
        
        // 2. 添加到选中集合
        this.selectedRegions.add(code);
        
        // 3. 移除被包含的子级选择（避免冗余）
        this._removeRedundantChildSelections(code);
        
        // 4. 移除冗余的父级选择（保持最粗粒度）
        this._removeRedundantParentSelections(code);
        
        // 5. 处理直辖市特殊情况
        this.handleMunicipalitySpecialCase(code, true);
        
        console.log('当前选择:', Array.from(this.selectedRegions).filter(c => !c.startsWith('-')).map(c => this.findRegionName(c)));
    }
    
    /**
     * 移除冗余的子级选择
     * @private
     * @param {string} parentCode - 父级地区代码
     */
    _removeRedundantChildSelections(parentCode) {
        const allChildCodes = this.getAllChildCodes(parentCode);
        allChildCodes.forEach(childCode => {
            this.selectedRegions.delete(childCode);
            this.selectedRegions.delete(`-${childCode}`); // 同时移除排除标记
        });
    }
    
    /**
     * 移除冗余的父级选择
     * @private
     * @param {string} childCode - 子级地区代码
     */
    _removeRedundantParentSelections(childCode) {
        const parentCodes = this.getAllParentCodes(childCode);
        parentCodes.forEach(parentCode => {
            if (this.selectedRegions.has(parentCode)) {
                this.selectedRegions.delete(parentCode);
                console.log(`移除冗余的父级选择: ${this.findRegionName(parentCode)}`);
            }
        });
    }
    
    /**
     * 处理直辖市特殊情况
     */
    handleMunicipalitySpecialCase(code, isDirectSelection) {
        const regionName = this.findRegionName(code);
        const parentCodes = this.getAllParentCodes(code);
        
        // 情况1：如果当前选择的是"市辖区"，特殊处理重庆
        if (regionName === '市辖区' && parentCodes.length > 0 && isDirectSelection) {
            const municipalityCode = parentCodes[parentCodes.length - 1];
            const municipalityName = this.findRegionName(municipalityCode);
            
            if (municipalityName && this.isMunicipality(municipalityName)) {
                // 重庆市辖区的特殊处理：保持市辖区选择，不要优化为重庆市
                if (municipalityName === '重庆市') {
                    console.log(`重庆市辖区特殊处理：保持市辖区选择，允许进一步展开到具体区`);
                    // 不做任何处理，保持原有选择
                } else {
                    // 其他直辖市（北京、上海、天津）的处理：优化为直辖市
                    this.selectedRegions.delete(code);
                    this.selectedRegions.add(municipalityCode);
                    console.log(`直辖市特殊处理：将${regionName}优化为${municipalityName}`);
                }
            }
        }
        
        // 情况2：如果直接选择直辖市，需要特殊处理避免选择"县"
        if (isDirectSelection && this.isMunicipality(regionName)) {
            this._handleMunicipalityDirectSelection(code, regionName);
        }
    }
    
    /**
     * 处理直接选择直辖市的情况
     * @private
     * @param {string} municipalityCode - 直辖市代码
     * @param {string} municipalityName - 直辖市名称
     */
    _handleMunicipalityDirectSelection(municipalityCode, municipalityName) {
        // 对于直辖市，我们希望只包含市辖区部分，排除县级部分
        const childCodes = this.getDirectChildCodes(municipalityCode);
        
        // 查找需要排除的县级部分
        for (const childCode of childCodes) {
            const childName = this.findRegionName(childCode);
            // 精确匹配，特别是重庆的"县"
            if (childName === '县') {
                // 排除县级部分
                this.selectedRegions.add(`-${childCode}`);
                console.log(`直辖市特殊处理：排除${municipalityName}的县级部分 (${childName})`);
            }
        }
    }
    
    /**
     * 判断是否为直辖市
     * @param {string} name - 地区名称
     * @returns {boolean} 是否为直辖市
     */
    isMunicipality(name) {
        return RegionSelector.MUNICIPALITIES.includes(name);
    }
    

    
    /**
     * 取消选中地区
     */
    deselectRegion(code) {
        console.log(`取消选择地区: ${this.findRegionName(code)} (${code})`);
        
        const parentCodes = this.getAllParentCodes(code);
        const isDirectlySelected = this.selectedRegions.has(code);
        const isImplicitlySelected = !isDirectlySelected && 
            parentCodes.some(parentCode => this.selectedRegions.has(parentCode));
        
        if (isDirectlySelected) {
            // 直接选择的地区，直接移除
            this.selectedRegions.delete(code);
            console.log(`移除直接选择: ${this.findRegionName(code)}`);
        } else if (isImplicitlySelected) {
            // 被父级包含的地区，添加排除标记
            this.selectedRegions.add(`-${code}`);
            console.log(`添加排除标记: ${this.findRegionName(code)}`);
        }
        
        console.log('当前选择:', Array.from(this.selectedRegions).filter(c => !c.startsWith('-')).map(c => this.findRegionName(c)));
    }
    

    

    
    /**
     * 获取直接子地区代码（仅一级子地区）
     */
    getDirectChildCodes(parentCode) {
        if (!this.regionDomCache) return [];
        
        const directChildren = this.regionDomCache.querySelectorAll(`[data-parent="${parentCode}"]`);
        return Array.from(directChildren).map(child => child.getAttribute('data-code'));
    }
    

    
    /**
     * 计算有效选中地区数量
     */
    calculateEffectiveCount() {
        return Array.from(this.selectedRegions).filter(code => !code.startsWith('-')).length;
    }
    
    /**
     * 更新所有显示的选中状态
     */
    updateAllDisplayedSelectionStates() {
        [this.provinceColumn, this.cityColumn, this.districtColumn].forEach(column => {
            if (column) {
                const items = column.querySelectorAll('.region-item');
                items.forEach(item => {
                    const code = item.getAttribute('data-code');
                    if (code) {
                        this.updateItemSelectionState(item, code);
                    }
                });
            }
        });
    }
    
    /**
     * 执行搜索
     */
    performSearch() {
        const searchResults = this.searchRegions(this.searchKeyword);
        this.displaySearchResults(searchResults);
    }
    
    /**
     * 搜索地区
     */
    searchRegions(keyword) {
        if (!this.regionDomCache) return [];
        
        const keywordLower = keyword.toLowerCase();
        const allItems = this.regionDomCache.querySelectorAll('.region-item');
        
        const results = this._collectSearchResults(allItems, keyword, keywordLower);
        return this._sortSearchResults(results);
    }
    
    /**
     * 收集搜索结果
     * @private
     * @param {NodeList} allItems - 所有地区项目
     * @param {string} keyword - 搜索关键词
     * @param {string} keywordLower - 小写搜索关键词
     * @returns {Array} 搜索结果数组
     */
    _collectSearchResults(allItems, keyword, keywordLower) {
        const results = [];
        
        allItems.forEach(item => {
            const regionData = this._extractRegionDataFromItem(item);
            
            if (this.matchesKeyword(regionData.name, keyword, keywordLower)) {
                const searchResult = this._createSearchResult(regionData);
                results.push(searchResult);
            }
        });
        
        return results;
    }
    
    /**
     * 从项目元素中提取地区数据
     * @private
     * @param {HTMLElement} item - 地区项目元素
     * @returns {Object} 地区数据对象
     */
    _extractRegionDataFromItem(item) {
        return {
            code: item.dataset.code,
            name: item.dataset.name,
            type: item.dataset.type,
            parent: item.dataset.parent
        };
    }
    
    /**
     * 创建搜索结果对象
     * @private
     * @param {Object} regionData - 地区数据
     * @returns {Object} 搜索结果对象
     */
    _createSearchResult(regionData) {
        const path = this.getRegionPath(regionData.code, regionData.type, regionData.parent);
        
        return {
            code: regionData.code,
            name: regionData.name,
            path: path,
            level: this.getRegionLevel(regionData.type),
            isSelected: this.isRegionSelected(regionData.code)
        };
    }
    
    /**
     * 对搜索结果进行排序
     * @private
     * @param {Array} results - 搜索结果数组
     * @returns {Array} 排序后的搜索结果
     */
    _sortSearchResults(results) {
        return results.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.name.localeCompare(b.name);
        });
    }
    
    /**
     * 检查名称是否匹配关键词
     */
    matchesKeyword(name, keyword, keywordLower) {
        if (name.includes(keyword) || name.toLowerCase().includes(keywordLower)) {
            return true;
        }
        
        const cleanName = name.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
        const cleanKeyword = keyword.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
        
        return cleanName.includes(cleanKeyword) || cleanName.toLowerCase().includes(keywordLower);
    }
    
    /**
     * 获取地区级别
     * @param {string} type - 地区类型
     * @returns {number} 地区级别
     */
    getRegionLevel(type) {
        const typeToLevel = {
            [RegionSelector.REGION_TYPES.PROVINCE]: RegionSelector.REGION_LEVELS.PROVINCE,
            [RegionSelector.REGION_TYPES.CITY]: RegionSelector.REGION_LEVELS.CITY,
            [RegionSelector.REGION_TYPES.DISTRICT]: RegionSelector.REGION_LEVELS.DISTRICT
        };
        return typeToLevel[type] || RegionSelector.REGION_LEVELS.DISTRICT;
    }
    
    /**
     * 获取地区路径
     */
    getRegionPath(code, type, parentCode = null) {
        if (!this.regionDomCache || type === 'province') return [];
        
        const path = [];
        
        if (parentCode) {
            const parentItem = this.regionDomCache.querySelector(`[data-code="${parentCode}"]`);
            if (parentItem) {
                const parentName = parentItem.dataset.name;
                const parentType = parentItem.dataset.type;
                const grandParentCode = parentItem.dataset.parent;
                
                const parentPath = this.getRegionPath(parentCode, parentType, grandParentCode);
                path.push(...parentPath);
                
                if (parentName && !this.isIgnoredRegion(parentName)) {
                    path.push(parentName);
                }
            }
        }
        
        return path;
    }
    
    /**
     * 根据代码查找地区名称
     */
    findRegionName(code) {
        if (!this.regionDomCache) return null;
        
        const item = this.regionDomCache.querySelector(`[data-code="${code}"]`);
        return item ? item.dataset.name : null;
    }
    
    /**
     * 根据地区名称查找代码
     */
    findRegionCode(name) {
        if (!this.regionDomCache || !name) return null;
        
        // 直接匹配地区名称
        const items = this.regionDomCache.querySelectorAll('[data-name]');
        for (const item of items) {
            if (item.dataset.name === name) {
                return item.dataset.code;
            }
        }
        
        // 如果直接匹配失败，尝试去除常见后缀再匹配
        const cleanName = name.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
        for (const item of items) {
            const itemName = item.dataset.name;
            const cleanItemName = itemName.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
            if (cleanItemName === cleanName) {
                return item.dataset.code;
            }
        }
        
        return null;
    }
    
    /**
     * 显示搜索结果
     */
    displaySearchResults(results) {
        if (results.length === 0) {
            this.showEmpty(this.provinceColumn, '未找到匹配的地区');
            this.showEmpty(this.cityColumn, '');
            this.showEmpty(this.districtColumn, '');
            return;
        }
        
        const resultItems = results.map(result => {
            const levelTags = { 1: '省', 2: '市', 3: '区' };
            const levelClass = result.level === 1 ? 'province' : result.level === 2 ? 'city' : 'district';
            const levelText = `<span class="level-tag level-${levelClass}">${levelTags[result.level]}</span>`;
            const pathText = result.path.length > 0 ? ` (${result.path.join(' > ')})` : '';
            
            return `
                <div class="region-item search-highlight ${result.isSelected ? 'selected' : ''}" 
                     data-code="${result.code}" data-name="${result.name}" data-type="search">
                    <input type="checkbox" class="region-checkbox" ${result.isSelected ? 'checked' : ''}>
                    <span class="region-name">${result.name}${pathText}</span>
                    ${levelText}
                </div>
            `;
        });
        
        this.provinceColumn.innerHTML = resultItems.join('');
        this.bindSearchResultEvents();
        
        this.showEmpty(this.cityColumn, '搜索模式下不显示');
        this.showEmpty(this.districtColumn, '搜索模式下不显示');
    }
    
    /**
     * 绑定搜索结果事件
     */
    bindSearchResultEvents() {
        const items = this.provinceColumn.querySelectorAll('.region-item');
        items.forEach(item => {
            this._bindSearchResultItemEvents(item);
        });
    }
    
    /**
     * 绑定单个搜索结果项的事件
     * @private
     * @param {HTMLElement} item - 搜索结果项元素
     */
    _bindSearchResultItemEvents(item) {
        const code = item.dataset.code;
        const checkbox = item.querySelector('.region-checkbox');
        
        this._bindSearchResultCheckboxEvent(checkbox, code);
        this._bindSearchResultClickEvent(item, checkbox, code);
    }
    
    /**
     * 绑定搜索结果复选框事件
     * @private
     * @param {HTMLElement} checkbox - 复选框元素
     * @param {string} code - 地区代码
     */
    _bindSearchResultCheckboxEvent(checkbox, code) {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            
            if (checkbox.checked) {
                this.selectRegion(code);
            } else {
                this.deselectRegion(code);
            }
            
            this._updateSearchResultsUI();
        });
    }
    
    /**
     * 绑定搜索结果点击事件
     * @private
     * @param {HTMLElement} item - 项目元素
     * @param {HTMLElement} checkbox - 复选框元素
     * @param {string} code - 地区代码
     */
    _bindSearchResultClickEvent(item, checkbox, code) {
        item.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            
            // 搜索模式下点击只是切换选择状态，不展开
            this._toggleSearchResultSelection(item, checkbox, code);
        });
    }
    
    /**
     * 切换搜索结果的选择状态
     * @private
     * @param {HTMLElement} item - 项目元素
     * @param {HTMLElement} checkbox - 复选框元素
     * @param {string} code - 地区代码
     */
    _toggleSearchResultSelection(item, checkbox, code) {
        if (this.isRegionSelected(code)) {
            this.deselectRegion(code);
            checkbox.checked = false;
        } else {
            this.selectRegion(code);
            checkbox.checked = true;
        }
        
        item.classList.toggle('selected', this.isRegionSelected(code));
        this.updateSelectedCount();
    }
    
    /**
     * 更新搜索结果UI
     * @private
     */
    _updateSearchResultsUI() {
        this.updateSearchResultsDisplay();
        this.updateSelectedCount();
    }
    
    /**
     * 更新搜索结果显示状态
     */
    updateSearchResultsDisplay() {
        const items = this.provinceColumn.querySelectorAll('.region-item');
        items.forEach(item => {
            const code = item.dataset.code;
            const checkbox = item.querySelector('.region-checkbox');
            const isSelected = this.isRegionSelected(code);
            
            checkbox.checked = isSelected;
            item.classList.toggle('selected', isSelected);
        });
    }
    
    /**
     * 显示空状态
     */
    showEmpty(column, message) {
        column.innerHTML = `
            <div class="region-empty">
                <div class="region-empty-icon">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <div>${message}</div>
            </div>
        `;
    }
    
    /**
     * 显示错误状态
     */
    showError(column, message) {
        column.innerHTML = `
            <div class="region-empty">
                <div class="region-empty-icon" style="color: #ff6b6b;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div style="color: #ff6b6b;">${message}</div>
            </div>
        `;
    }
    
    /**
     * 更新选中数量
     */
    updateSelectedCount() {
        const effectiveCount = this.calculateEffectiveCount();
        this.selectedCountEl.textContent = effectiveCount;
    }
    
    /**
     * 重置选择
     */
    reset() {
        this.selectedRegions.clear();
        this.updateSelectedCount();
        
        this.searchKeyword = '';
        this.searchInput.value = '';
        this.currentProvince = null;
        this.currentCity = null;
        
        this.loadProvinces();
        this.showEmpty(this.cityColumn, '请先选择省份');
        this.showEmpty(this.districtColumn, '请先选择城市');
    }
    
    /**
     * 确认选择
     */
    confirm() {
        const { finalCodes, finalNames } = this._calculateFinalSelections();
        
        console.log('确认选择 - 最终地区代码:', finalCodes);
        console.log('确认选择 - 最终地区名称:', finalNames);
        
        if (this.onConfirm) {
            this.onConfirm(finalCodes, finalNames);
        }
        
        this.hide();
    }
    
    /**
     * 计算最终的选择结果
     * @private
     * @returns {Object} 包含最终代码和名称的对象
     */
    _calculateFinalSelections() {
        const finalCodes = [];
        const finalNames = [];
        const positiveSelections = Array.from(this.selectedRegions).filter(code => !code.startsWith('-'));
        const excludedCodes = new Set(Array.from(this.selectedRegions)
            .filter(code => code.startsWith('-'))
            .map(code => code.substring(1)));
        
        for (const code of positiveSelections) {
            this._expandSelectionWithExclusions(code, excludedCodes, finalCodes, finalNames);
        }
        
        return { finalCodes, finalNames };
    }
    
    /**
     * 展开选择并排除明确取消的项目
     * @private
     * @param {string} code - 选中的地区代码
     * @param {Set} excludedCodes - 排除的地区代码集合
     * @param {Array} finalCodes - 最终代码数组
     * @param {Array} finalNames - 最终名称数组
     */
    _expandSelectionWithExclusions(code, excludedCodes, finalCodes, finalNames) {
        if (excludedCodes.has(code)) {
            return; // 该地区被排除
        }
        
        const childCodes = this.getDirectChildCodes(code);
        const hasExcludedChildren = childCodes.some(childCode => 
            excludedCodes.has(childCode) || 
            this._hasExcludedDescendants(childCode, excludedCodes)
        );
        
        if (hasExcludedChildren) {
            // 有子项被排除，需要递归处理子项
            for (const childCode of childCodes) {
                this._expandSelectionWithExclusions(childCode, excludedCodes, finalCodes, finalNames);
            }
        } else {
            // 没有子项被排除，添加当前项
            finalCodes.push(code);
            const name = this.findRegionName(code);
            if (name && !this._shouldIgnoreInFinalResult(name, code)) {
                finalNames.push(name);
            }
        }
    }
    
    /**
     * 判断是否应该在最终结果中忽略
     * @private
     * @param {string} name - 地区名称
     * @param {string} code - 地区代码
     * @returns {boolean} 是否应该忽略
     */
    _shouldIgnoreInFinalResult(name, code) {
        // 对于重庆市辖区，不忽略
        if (name === '市辖区') {
            const parentCodes = this.getAllParentCodes(code);
            if (parentCodes.length > 0) {
                const parentName = this.findRegionName(parentCodes[parentCodes.length - 1]);
                if (parentName === '重庆市') {
                    return false; // 重庆市辖区不忽略
                }
            }
        }
        
        // 其他情况按原有逻辑处理
        return this.isIgnoredRegion(name);
    }
    
    /**
     * 检查是否有被排除的后代
     * @private
     * @param {string} code - 地区代码
     * @param {Set} excludedCodes - 排除的地区代码集合
     * @returns {boolean}
     */
    _hasExcludedDescendants(code, excludedCodes) {
        const allDescendants = this.getAllChildCodes(code);
        return allDescendants.some(descendant => excludedCodes.has(descendant));
    }

    
    /**
     * 判断是否为需要忽略的地区
     * @param {string} name - 地区名称
     * @returns {boolean} 是否为需要忽略的地区
     */
    isIgnoredRegion(name) {
        return RegionSelector.IGNORED_REGIONS.includes(name);
    }
    
    /**
     * 获取选中的地区
     */
    getSelectedRegions() {
        const { finalCodes } = this._calculateFinalSelections();
        return finalCodes;
    }
    
    /**
     * 获取选中地区的名称
     */
    getSelectedRegionNames() {
        const { finalNames } = this._calculateFinalSelections();
        return finalNames;
    }
}

// 全局实例
window.regionSelector = null;

// 初始化函数
function initRegionSelector() {
    try {
        console.log('开始初始化地区选择器...');
        window.regionSelector = new RegionSelector();
        console.log('地区选择器初始化完成');
        return true;
    } catch (error) {
        console.error('地区选择器初始化失败:', error);
        return false;
    }
}

// 初始化机制
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (!window.regionSelector) {
                initRegionSelector();
            }
        }, 100);
    });
} else {
    setTimeout(() => {
        if (!window.regionSelector) {
            initRegionSelector();
        }
    }, 50);
}