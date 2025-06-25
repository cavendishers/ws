/**
 * 三级联动地区选择器类 - 基于后端预渲染HTML
 */
class RegionSelector {
    constructor() {
        console.log('RegionSelector 构造函数开始执行...');
        
        try {
            this.modal = null;
            this.selectedRegions = new Set(); // 存储实际选中的地区代码
            this.currentProvince = null;
            this.currentCity = null;
            this.searchKeyword = '';
            this.onConfirm = null;
            this.searchDebounceTimer = null;
            
            // 缓存DOM元素
            this.provinceColumn = null;
            this.cityColumn = null;
            this.districtColumn = null;
            this.searchInput = null;
            this.selectedCountEl = null;
            this.regionDomCache = null;
            
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
        this.modal = document.createElement('div');
        this.modal.className = 'region-selector-modal';
        this.modal.innerHTML = `
            <div class="region-selector-container">
                <div class="region-selector-header">
                    <h3 class="region-selector-title">选择地区</h3>
                    <button class="region-selector-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="region-search-container">
                    <input type="text" class="region-search-input" placeholder="搜索省份、城市或区县...">
                </div>
                
                <div class="region-columns">
                    <div class="region-column">
                        <div class="region-column-header">省份/直辖市</div>
                        <div class="region-column-content" id="province-column">
                            <div class="region-loading">
                                <div class="region-loading-spinner"></div>
                                正在加载省份数据...
                            </div>
                        </div>
                    </div>
                    
                    <div class="region-column">
                        <div class="region-column-header">城市</div>
                        <div class="region-column-content" id="city-column">
                            <div class="region-empty">
                                <div class="region-empty-icon">
                                    <i class="fas fa-map-marker-alt"></i>
                                </div>
                                <div>请先选择省份</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="region-column">
                        <div class="region-column-header">区县</div>
                        <div class="region-column-content" id="district-column">
                            <div class="region-empty">
                                <div class="region-empty-icon">
                                    <i class="fas fa-building"></i>
                                </div>
                                <div>请先选择城市</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="region-selector-footer">
                    <div class="selected-count">已选择 <span id="selected-count">0</span> 个地区</div>
                    <div class="region-actions">
                        <button class="region-btn region-btn-reset">重置</button>
                        <button class="region-btn region-btn-confirm">确定</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
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
        this.modal.querySelector('.region-selector-close').addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.hide();
            }
        });
        
        this.searchInput.addEventListener('input', (e) => {
            this.searchKeyword = e.target.value.trim();
            clearTimeout(this.searchDebounceTimer);
            
            if (!this.searchKeyword) {
                this.loadProvinces();
                return;
            }
            
            this.searchDebounceTimer = setTimeout(() => this.performSearch(), 200);
        });
        
        this.modal.querySelector('.region-btn-reset').addEventListener('click', () => this.reset());
        this.modal.querySelector('.region-btn-confirm').addEventListener('click', () => this.confirm());
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
     * 判断地区是否被选中（包括直接选中和通过父级选中）
     */
    isRegionSelected(code) {
        // 1. 直接选中
        if (this.selectedRegions.has(code)) {
            return true;
        }
        
        // 2. 通过父级选中
        const parentCodes = this.getAllParentCodes(code);
        return parentCodes.some(parentCode => this.selectedRegions.has(parentCode));
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
     * 获取所有子地区代码
     */
    getAllChildCodes(parentCode) {
        if (!this.regionDomCache) return [];
        
        const childCodes = [];
        const directChildren = this.regionDomCache.querySelectorAll(`[data-parent="${parentCode}"]`);
        
        directChildren.forEach(child => {
            const childCode = child.getAttribute('data-code');
            childCodes.push(childCode);
            
            const grandChildren = this.getAllChildCodes(childCode);
            childCodes.push(...grandChildren);
        });
        
        return childCodes;
    }
    
    /**
     * 获取所有父地区代码
     */
    getAllParentCodes(code) {
        if (!this.regionDomCache) return [];
        
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
        
        return parentCodes;
    }
    
    /**
     * 绑定列事件
     */
    bindColumnEvents(column, type) {
        const items = column.querySelectorAll('.region-item');
        
        items.forEach(item => {
            const code = item.getAttribute('data-code');
            const checkbox = item.querySelector('.region-checkbox');
            
            // 复选框点击事件
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                
                if (checkbox.checked) {
                    // 复选框勾选是直接选择
                    this.selectRegion(code, true);
                    // 勾选时自动展开下级
                    this.expandRegion(type, code, column, item);
                } else {
                    this.deselectRegion(code);
                }
                
                this.updateAllDisplayedSelectionStates();
                this.updateSelectedCount();
            });
            
            // 项目点击事件 - 展开下级
            item.addEventListener('click', (e) => {
                if (e.target === checkbox) return;
                
                this.expandRegion(type, code, column, item);
            });
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
     * 选中地区（文氏图包含关系逻辑）
     */
    selectRegion(code, isDirectSelection = true) {
        // 1. 添加当前地区
        this.selectedRegions.add(code);
        
        // 2. 如果是直接选择，且有子地区，则选中所有子地区
        if (isDirectSelection) {
            const directChildCodes = this.getDirectChildCodes(code);
            if (directChildCodes.length > 0) {
                // 直接选择父地区时，选中所有子地区
                const allChildCodes = this.getAllChildCodes(code);
                allChildCodes.forEach(childCode => {
                    this.selectedRegions.add(childCode);
                });
            }
        }
        
        // 3. 检查是否需要自动选中父地区（跳级选择）
        const parentCodes = this.getAllParentCodes(code);
        const shouldSelectParents = this.isSkipLevelSelection(code, parentCodes);
        
        if (shouldSelectParents) {
            // 跳级选择时自动选中父地区，但不触发父地区的子地区选择
            parentCodes.forEach(parentCode => {
                this.selectedRegions.add(parentCode);
            });
        }
        
        // 4. 智能优化选择
        this.optimizeSelections();
    }
    
    /**
     * 判断是否为跳级选择
     */
    isSkipLevelSelection(code, parentCodes) {
        // 如果没有父地区，不是跳级选择
        if (parentCodes.length === 0) {
            return false;
        }
        
        // 获取直接父地区
        const directParentCode = parentCodes[0];
        
        // 如果直接父地区已经被选中，说明不是跳级选择
        if (this.selectedRegions.has(directParentCode)) {
            return false;
        }
        
        // 检查当前的展开状态来判断是否为跳级选择
        // 如果当前地区的直接父地区正在展开状态（即当前页面显示了该地区），则不是跳级选择
        if (this.isParentCurrentlyExpanded(code, directParentCode)) {
            return false;
        }
        
        // 检查是否有任何父地区已经被选中
        // 如果有父地区已被选中，说明当前选择是在已有父地区基础上的正常选择
        const hasSelectedParent = parentCodes.some(parentCode => 
            this.selectedRegions.has(parentCode)
        );
        
        // 只有在没有任何父地区被选中，且不在展开状态下的情况下，才认为是跳级选择
        return !hasSelectedParent;
    }
    
    /**
     * 检查父地区是否当前正在展开状态
     */
    isParentCurrentlyExpanded(code, directParentCode) {
        if (!this.regionDomCache) return false;
        
        // 获取当前地区的类型
        const currentItem = this.regionDomCache.querySelector(`[data-code="${code}"]`);
        if (!currentItem) return false;
        
        const currentType = currentItem.getAttribute('data-type');
        
        // 根据地区类型检查相应的展开状态
        if (currentType === 'city') {
            // 如果是城市，检查当前展开的省份是否为其父地区
            return this.currentProvince === directParentCode;
        } else if (currentType === 'district') {
            // 如果是区县，检查当前展开的城市是否为其父地区
            return this.currentCity === directParentCode;
        }
        
        return false;
    }
    
    /**
     * 取消选中地区
     */
    deselectRegion(code) {
        // 1. 移除当前地区
        this.selectedRegions.delete(code);
        
        // 2. 移除所有子地区
        const childCodes = this.getAllChildCodes(code);
        childCodes.forEach(childCode => {
            this.selectedRegions.delete(childCode);
        });
        
        // 3. 检查父地区是否需要取消选中
        this.checkParentDeselection(code);
    }
    
    /**
     * 检查父地区是否需要取消选中
     */
    checkParentDeselection(code) {
        const parentCodes = this.getAllParentCodes(code);
        
        parentCodes.forEach(parentCode => {
            // 如果父地区被选中，检查是否还有其他子地区被选中
            if (this.selectedRegions.has(parentCode)) {
                const directChildCodes = this.getDirectChildCodes(parentCode);
                const hasSelectedDirectChildren = directChildCodes.some(childCode => 
                    this.selectedRegions.has(childCode)
                );
                
                // 如果没有直接子地区被选中，则取消父地区选中
                if (!hasSelectedDirectChildren) {
                    this.selectedRegions.delete(parentCode);
                }
            }
        });
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
     * 优化选择（如果父地区的所有直接子地区都被选中，则只保留父地区）
     */
    optimizeSelections() {
        const selectedArray = Array.from(this.selectedRegions);
        const toRemove = new Set();
        
        selectedArray.forEach(code => {
            if (this.selectedRegions.has(code) && !toRemove.has(code)) {
                const directChildCodes = this.getDirectChildCodes(code);
                
                if (directChildCodes.length > 0) {
                    // 检查是否所有直接子地区都被选中
                    const allDirectChildrenSelected = directChildCodes.every(childCode => 
                        this.selectedRegions.has(childCode)
                    );
                    
                    if (allDirectChildrenSelected) {
                        // 标记要移除的所有子地区（包括间接子地区）
                        const allChildCodes = this.getAllChildCodes(code);
                        allChildCodes.forEach(childCode => {
                            toRemove.add(childCode);
                        });
                    }
                }
            }
        });
        
        // 执行移除操作
        toRemove.forEach(code => {
            this.selectedRegions.delete(code);
        });
    }
    
    /**
     * 计算有效选中地区数量（最顶层的选择数量）
     */
    calculateEffectiveCount() {
        const selectedArray = Array.from(this.selectedRegions);
        let effectiveCount = 0;
        
        selectedArray.forEach(code => {
            // 检查是否有更高级别的父地区也被选中
            const parentCodes = this.getAllParentCodes(code);
            const hasSelectedParent = parentCodes.some(parentCode => 
                this.selectedRegions.has(parentCode)
            );
            
            // 如果没有更高级别的父地区被选中，则计入有效数量
            if (!hasSelectedParent) {
                effectiveCount++;
            }
        });
        
        return effectiveCount;
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
        
        const results = [];
        const keywordLower = keyword.toLowerCase();
        const allItems = this.regionDomCache.querySelectorAll('.region-item');
        
        allItems.forEach(item => {
            const code = item.dataset.code;
            const name = item.dataset.name;
            const type = item.dataset.type;
            const parent = item.dataset.parent;
            
            if (this.matchesKeyword(name, keyword, keywordLower)) {
                const path = this.getRegionPath(code, type, parent);
                results.push({
                    code,
                    name,
                    path,
                    level: this.getRegionLevel(type),
                    isSelected: this.isRegionSelected(code)
                });
            }
        });
        
        results.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.name.localeCompare(b.name);
        });
        
        return results;
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
     */
    getRegionLevel(type) {
        const levels = { province: 1, city: 2, district: 3 };
        return levels[type] || 3;
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
            const code = item.dataset.code;
            const checkbox = item.querySelector('.region-checkbox');
            
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                
                if (checkbox.checked) {
                    // 搜索结果中的勾选也是直接选择
                    this.selectRegion(code, true);
                } else {
                    this.deselectRegion(code);
                }
                
                this.updateSearchResultsDisplay();
                this.updateSelectedCount();
            });
            
            item.addEventListener('click', (e) => {
                if (e.target === checkbox) return;
                
                // 搜索模式下点击只是切换选择状态，不展开
                if (this.isRegionSelected(code)) {
                    this.deselectRegion(code);
                    checkbox.checked = false;
                } else {
                    // 搜索结果中的点击也是直接选择
                    this.selectRegion(code, true);
                    checkbox.checked = true;
                }
                
                item.classList.toggle('selected', this.isRegionSelected(code));
                this.updateSelectedCount();
            });
        });
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
        const selectedRegionNames = [];
        
        for (const code of this.selectedRegions) {
            const name = this.findRegionName(code);
            if (name && !this.isIgnoredRegion(name)) {
                selectedRegionNames.push(name);
            }
        }
        
        if (this.onConfirm) {
            this.onConfirm(Array.from(this.selectedRegions), selectedRegionNames);
        }
        
        this.hide();
    }
    
    /**
     * 判断是否为需要忽略的地区
     */
    isIgnoredRegion(name) {
        const ignoredNames = ['市辖区', '县', '自治区直辖县级行政区划', '市辖县'];
        return ignoredNames.includes(name);
    }
    
    /**
     * 获取选中的地区
     */
    getSelectedRegions() {
        return Array.from(this.selectedRegions);
    }
    
    /**
     * 获取选中地区的名称
     */
    getSelectedRegionNames() {
        const names = [];
        for (const code of this.selectedRegions) {
            const name = this.findRegionName(code);
            if (name) {
                names.push(name);
            }
        }
        return names;
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

// 备用初始化
window.addEventListener('load', function() {
    setTimeout(() => {
        if (!window.regionSelector) {
            initRegionSelector();
        }
    }, 200);
}); 