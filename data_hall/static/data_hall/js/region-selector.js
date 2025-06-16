/**
 * 三级联动地区选择器类
 */
class RegionSelector {
    constructor() {
        this.modal = null;
        this.regionsData = null;
        this.selectedRegions = new Set(); // 存储选中的地区代码
        this.currentProvince = null;
        this.currentCity = null;
        this.searchKeyword = '';
        this.onConfirm = null; // 确认回调函数
        this.isLoading = false;
        this.searchDebounceTimer = null; // 搜索防抖定时器
        
        // 缓存DOM元素
        this.provinceColumn = null;
        this.cityColumn = null;
        this.districtColumn = null;
        this.searchInput = null;
        this.selectedCountEl = null;
        
        this.init();
    }
    
    /**
     * 初始化
     */
    async init() {
        await this.loadRegionsData();
        this.createModal();
        this.bindEvents();
    }
    
    /**
     * 加载地区数据
     */
    async loadRegionsData() {
        try {
            const response = await fetch('/static/data_hall/js/regions-data.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.regionsData = await response.json();
            console.log('地区数据加载成功');
        } catch (error) {
            console.error('加载地区数据失败:', error);
            // 使用默认数据或显示错误
            this.regionsData = { "86": {} };
        }
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
        
        this.getAppendContainer().appendChild(this.modal);
        
        // 缓存DOM元素
        this.provinceColumn = this.modal.querySelector('#province-column');
        this.cityColumn = this.modal.querySelector('#city-column');
        this.districtColumn = this.modal.querySelector('#district-column');
        this.searchInput = this.modal.querySelector('.region-search-input');
        this.selectedCountEl = this.modal.querySelector('#selected-count');
    }
    
    /**
     * 获取模态框应该添加到的容器
     * 在全屏模式下添加到全屏元素，否则添加到body
     */
    getAppendContainer() {
        // 检查是否在全屏模式
        if (document.fullscreenElement) {
            return document.fullscreenElement;
        }
        return document.body;
    }
    
    /**
     * 确保模态框在正确的容器中
     */
    ensureCorrectContainer() {
        if (!this.modal) return;
        
        const targetContainer = this.getAppendContainer();
        
        // 如果模态框不在正确的容器中，重新附加
        if (this.modal.parentElement !== targetContainer) {
            console.log('重新附加地区选择器到正确容器:', targetContainer === document.body ? 'body' : 'fullscreen element');
            targetContainer.appendChild(this.modal);
        }
    }
    
    /**
     * 处理全屏状态变化
     */
    handleFullscreenChange() {
        // 如果模态框已打开，需要重新附加到正确的容器
        if (this.modal && this.modal.classList.contains('active')) {
            const newContainer = this.getAppendContainer();
            
            // 如果当前容器不是目标容器，则重新附加
            if (this.modal.parentElement !== newContainer) {
                console.log('全屏状态变化，重新附加地区选择器到正确容器');
                
                // 保存当前状态
                const modalClasses = this.modal.className;
                
                // 重新附加到正确的容器
                newContainer.appendChild(this.modal);
                
                // 恢复状态
                this.modal.className = modalClasses;
            }
        }
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮
        const closeBtn = this.modal.querySelector('.region-selector-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // 点击遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.hide();
            }
        });
        
        // 监听全屏状态变化
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());
        
        // 搜索输入（添加防抖）
        this.searchInput.addEventListener('input', (e) => {
            this.searchKeyword = e.target.value.trim();
            
            // 清除之前的防抖定时器
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }
            
            // 如果搜索关键词为空，立即执行
            if (!this.searchKeyword) {
                this.performSearch();
                return;
            }
            
            // 设置防抖延迟
            this.searchDebounceTimer = setTimeout(() => {
                this.performSearch();
            }, 200);
        });
        
        // 重置按钮
        const resetBtn = this.modal.querySelector('.region-btn-reset');
        resetBtn.addEventListener('click', () => this.reset());
        
        // 确定按钮
        const confirmBtn = this.modal.querySelector('.region-btn-confirm');
        confirmBtn.addEventListener('click', () => this.confirm());
    }
    
    /**
     * 显示选择器
     */
    show(selectedRegions = [], onConfirm = null) {
        this.selectedRegions = new Set(selectedRegions);
        this.onConfirm = onConfirm;
        
        // 确保模态框在正确的容器中
        this.ensureCorrectContainer();
        
        // 如果没有选中的地区，完全重置状态
        if (selectedRegions.length === 0) {
            this.currentProvince = null;
            this.currentCity = null;
            this.searchKeyword = '';
            this.searchInput.value = '';
        }
        
        this.modal.classList.add('active');
        this.loadProvinces();
        this.updateSelectedCount();
        
        // 聚焦搜索框
        setTimeout(() => {
            this.searchInput.focus();
        }, 300);
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
     * 加载省份列表
     */
    loadProvinces() {
        if (!this.regionsData || !this.regionsData['86']) {
            this.showError(this.provinceColumn, '省份数据加载失败');
            return;
        }
        
        const provinces = this.regionsData['86'];
        const provinceItems = Object.entries(provinces).map(([code, name]) => {
            const isSelected = this.selectedRegions.has(code);
            return this.createRegionItem(code, name, isSelected, 'province');
        });
        
        this.provinceColumn.innerHTML = provinceItems.join('');
        this.bindColumnEvents(this.provinceColumn, 'province');
        
        // 如果有选中的省份，自动展开第一个选中的省份
        const selectedProvinceCode = Object.keys(provinces).find(code => this.selectedRegions.has(code));
        if (selectedProvinceCode) {
            this.loadCities(selectedProvinceCode);
            // 设置该省份为激活状态
            const provinceItem = this.provinceColumn.querySelector(`[data-code="${selectedProvinceCode}"]`);
            if (provinceItem) {
                this.provinceColumn.querySelectorAll('.region-item').forEach(i => i.classList.remove('active'));
                provinceItem.classList.add('active');
            }
        } else {
            // 如果没有选中的省份，确保其他列显示初始状态
            this.showEmpty(this.cityColumn, '请先选择省份');
            this.showEmpty(this.districtColumn, '请先选择城市');
        }
    }
    
    /**
     * 加载城市列表
     */
    loadCities(provinceCode) {
        this.currentProvince = provinceCode;
        
        if (!this.regionsData[provinceCode]) {
            this.showEmpty(this.cityColumn, '该省份暂无城市数据');
            this.showEmpty(this.districtColumn, '请先选择城市');
            return;
        }
        
        const cities = this.regionsData[provinceCode];
        const cityItems = Object.entries(cities).map(([code, name]) => {
            const isSelected = this.selectedRegions.has(code);
            return this.createRegionItem(code, name, isSelected, 'city');
        });
        
        this.cityColumn.innerHTML = cityItems.join('');
        this.bindColumnEvents(this.cityColumn, 'city');
        
        // 清空区县列表
        this.showEmpty(this.districtColumn, '请先选择城市');
        this.currentCity = null;
        
        // 如果当前省份有选中的城市，自动展开第一个选中的城市
        const selectedCityCode = Object.keys(cities).find(code => this.selectedRegions.has(code));
        if (selectedCityCode) {
            this.loadDistricts(selectedCityCode);
            // 设置该城市为激活状态
            const cityItem = this.cityColumn.querySelector(`[data-code="${selectedCityCode}"]`);
            if (cityItem) {
                this.cityColumn.querySelectorAll('.region-item').forEach(i => i.classList.remove('active'));
                cityItem.classList.add('active');
            }
        }
    }
    
    /**
     * 加载区县列表
     */
    loadDistricts(cityCode) {
        this.currentCity = cityCode;
        
        if (!this.regionsData[cityCode]) {
            this.showEmpty(this.districtColumn, '该城市暂无区县数据');
            return;
        }
        
        const districts = this.regionsData[cityCode];
        const districtItems = Object.entries(districts).map(([code, name]) => {
            const isSelected = this.selectedRegions.has(code);
            return this.createRegionItem(code, name, isSelected, 'district');
        });
        
        this.districtColumn.innerHTML = districtItems.join('');
        this.bindColumnEvents(this.districtColumn, 'district');
    }
    
    /**
     * 创建地区选项HTML
     */
    createRegionItem(code, name, isSelected, type) {
        const childCount = this.getChildCount(code);
        const countText = childCount > 0 ? `(${childCount})` : '';
        
        return `
            <div class="region-item ${isSelected ? 'selected' : ''}" data-code="${code}" data-name="${name}" data-type="${type}">
                <input type="checkbox" class="region-checkbox" ${isSelected ? 'checked' : ''}>
                <span class="region-name">${name}</span>
                ${countText ? `<span class="region-count">${countText}</span>` : ''}
            </div>
        `;
    }
    
    /**
     * 获取子级数量
     */
    getChildCount(code) {
        if (!this.regionsData[code]) return 0;
        return Object.keys(this.regionsData[code]).length;
    }
    
    /**
     * 绑定列事件
     */
    bindColumnEvents(column, type) {
        const items = column.querySelectorAll('.region-item');
        
        items.forEach(item => {
            const code = item.dataset.code;
            const name = item.dataset.name;
            const checkbox = item.querySelector('.region-checkbox');
            
            // 复选框点击事件
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSelection(code, name, item, checkbox.checked);
            });
            
            // 项目点击事件（选中/取消选中并展开下级）
            item.addEventListener('click', (e) => {
                if (e.target === checkbox) return;
                
                // 切换选中状态
                if (this.selectedRegions.has(code)) {
                    // 取消选中，同时移除下级地区
                    this.removeRegionAndChildren(code);
                    checkbox.checked = false;
                    item.classList.remove('selected');
                } else {
                    // 选中
                    this.selectedRegions.add(code);
                    checkbox.checked = true;
                    item.classList.add('selected');
                }
                this.updateSelectedCount();
                
                // 移除同级的active状态
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // 根据类型加载下级数据
                if (type === 'province') {
                    this.loadCities(code);
                } else if (type === 'city') {
                    this.loadDistricts(code);
                }
            });
            
            // 悬停效果（用于预览下级）
            item.addEventListener('mouseenter', () => {
                if (type === 'province' && this.currentProvince !== code) {
                    // 可以在这里添加预览功能
                }
            });
        });
    }
    
    /**
     * 切换选择状态
     */
    toggleSelection(code, name, item, isSelected) {
        if (isSelected) {
            this.selectedRegions.add(code);
            item.classList.add('selected');
        } else {
            // 取消选中时，同时移除下级地区
            this.removeRegionAndChildren(code);
            item.classList.remove('selected');
        }
        
        this.updateSelectedCount();
    }
    
    /**
     * 移除地区及其所有下级地区
     */
    removeRegionAndChildren(code) {
        // 移除自身
        this.selectedRegions.delete(code);
        
        // 获取所有下级地区并移除
        const childCodes = this.getAllChildCodes(code);
        childCodes.forEach(childCode => {
            this.selectedRegions.delete(childCode);
        });
        
        // 更新当前显示的界面中的选中状态
        this.updateCurrentViewSelection();
    }
    
    /**
     * 获取某个地区的所有下级地区代码
     */
    getAllChildCodes(parentCode) {
        const childCodes = [];
        
        // 直接下级
        if (this.regionsData[parentCode]) {
            const directChildren = Object.keys(this.regionsData[parentCode]);
            childCodes.push(...directChildren);
            
            // 递归获取下下级
            directChildren.forEach(childCode => {
                const grandChildren = this.getAllChildCodes(childCode);
                childCodes.push(...grandChildren);
            });
        }
        
        return childCodes;
    }
    
    /**
     * 更新当前视图中的选中状态
     */
    updateCurrentViewSelection() {
        // 更新所有列中的选中状态
        [this.provinceColumn, this.cityColumn, this.districtColumn].forEach(column => {
            if (column) {
                const items = column.querySelectorAll('.region-item');
                items.forEach(item => {
                    const code = item.dataset.code;
                    const checkbox = item.querySelector('.region-checkbox');
                    
                    if (code && checkbox) {
                        const isSelected = this.selectedRegions.has(code);
                        checkbox.checked = isSelected;
                        
                        if (isSelected) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 执行搜索
     */
    performSearch() {
        if (!this.searchKeyword) {
            this.loadProvinces();
            return;
        }
        
        const searchResults = this.searchRegions(this.searchKeyword);
        this.displaySearchResults(searchResults);
    }
    
    /**
     * 搜索地区
     */
    searchRegions(keyword) {
        const results = [];
        const keywordLower = keyword.toLowerCase();
        
        // 搜索所有级别的地区，包括省份
        for (const [parentCode, regions] of Object.entries(this.regionsData)) {
            for (const [code, name] of Object.entries(regions)) {
                // 检查是否匹配搜索关键词
                if (this.matchesKeyword(name, keyword, keywordLower)) {
                    const path = this.getRegionPath(code, parentCode);
                    results.push({
                        code,
                        name,
                        path,
                        level: this.getRegionLevel(code, parentCode),
                        isSelected: this.selectedRegions.has(code)
                    });
                }
            }
        }
        
        // 按级别排序：省份 > 城市 > 区县
        results.sort((a, b) => {
            if (a.level !== b.level) {
                return a.level - b.level;
            }
            return a.name.localeCompare(b.name);
        });
        
        return results;
    }
    
    /**
     * 检查名称是否匹配关键词
     */
    matchesKeyword(name, keyword, keywordLower) {
        // 直接匹配
        if (name.includes(keyword) || name.toLowerCase().includes(keywordLower)) {
            return true;
        }
        
        // 去掉常见后缀再匹配
        const cleanName = name.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
        const cleanKeyword = keyword.replace(/(省|市|自治区|特别行政区|区|县|自治县|自治州)$/, '');
        
        if (cleanName.includes(cleanKeyword) || cleanName.toLowerCase().includes(keywordLower)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取地区级别
     */
    getRegionLevel(code, parentCode) {
        if (parentCode === '86') {
            return 1; // 省级
        } else if (code.endsWith('00') && code.length === 6) {
            return 2; // 市级
        } else {
            return 3; // 区县级
        }
    }
    
    /**
     * 获取地区路径
     */
    getRegionPath(code, parentCode = null) {
        const path = [];
        
        // 如果是省级（父级是86）
        if (parentCode === '86') {
            return []; // 省级没有上级路径
        }
        
        // 根据代码长度和格式判断级别
        if (code.length === 6) {
            if (code.endsWith('00')) {
                // 城市级
                const provinceCode = code.substring(0, 2) + '0000';
                const provinceName = this.findRegionName(provinceCode);
                if (provinceName) path.push(provinceName);
            } else {
                // 区县级
                const cityCode = code.substring(0, 4) + '00';
                const provinceCode = code.substring(0, 2) + '0000';
                
                const provinceName = this.findRegionName(provinceCode);
                const cityName = this.findRegionName(cityCode);
                
                if (provinceName) path.push(provinceName);
                if (cityName && cityName !== '市辖区') path.push(cityName);
            }
        }
        
        return path;
    }
    
    /**
     * 查找地区名称
     */
    findRegionName(code) {
        for (const [parentCode, regions] of Object.entries(this.regionsData)) {
            if (regions[code]) {
                return regions[code];
            }
        }
        return null;
    }
    
    /**
     * 根据名称查找地区代码
     */
    findRegionCode(name) {
        for (const [parentCode, regions] of Object.entries(this.regionsData)) {
            for (const [code, regionName] of Object.entries(regions)) {
                if (regionName === name) {
                    return code;
                }
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
        
        // 在省份列显示搜索结果
        const resultItems = results.map(result => {
            let pathText = '';
            let levelText = '';
            
            // 根据级别显示不同的标识
            switch (result.level) {
                case 1:
                    levelText = '<span class="level-tag level-province">省</span>';
                    break;
                case 2:
                    levelText = '<span class="level-tag level-city">市</span>';
                    pathText = result.path.length > 0 ? ` (${result.path.join(' > ')})` : '';
                    break;
                case 3:
                    levelText = '<span class="level-tag level-district">区</span>';
                    pathText = result.path.length > 0 ? ` (${result.path.join(' > ')})` : '';
                    break;
            }
            
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
        
        // 清空其他列
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
            const name = item.dataset.name;
            const checkbox = item.querySelector('.region-checkbox');
            
            // 复选框点击事件
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSearchResultSelection(code, name, item, checkbox.checked);
            });
            
            // 项目点击事件（搜索结果中点击切换选中状态）
            item.addEventListener('click', (e) => {
                if (e.target === checkbox) return;
                
                // 切换选中状态
                if (this.selectedRegions.has(code)) {
                    // 取消选中，同时移除下级地区
                    this.removeRegionAndChildren(code);
                    checkbox.checked = false;
                    item.classList.remove('selected');
                } else {
                    // 选中，同时添加上级地区
                    this.selectRegionWithParents(code);
                    checkbox.checked = true;
                    item.classList.add('selected');
                }
                this.updateSelectedCount();
                this.updateSearchResultsDisplay();
            });
        });
    }
    
    /**
     * 切换搜索结果选择状态（带上级地区自动选择）
     */
    toggleSearchResultSelection(code, name, item, isSelected) {
        if (isSelected) {
            // 选中时，自动添加上级地区
            this.selectRegionWithParents(code);
            item.classList.add('selected');
        } else {
            // 取消选中时，移除该地区及其下级地区
            this.removeRegionAndChildren(code);
            item.classList.remove('selected');
        }
        this.updateSelectedCount();
        this.updateSearchResultsDisplay();
    }
    
    /**
     * 选择地区并自动添加其上级地区
     */
    selectRegionWithParents(code) {
        // 添加当前地区
        this.selectedRegions.add(code);
        
        // 获取该地区的完整路径并添加所有上级地区
        const parentCodes = this.getParentCodes(code);
        parentCodes.forEach(parentCode => {
            const parentName = this.findRegionName(parentCode);
            // 只添加有效的上级地区（排除"市辖区"等无意义的行政区划）
            if (parentName && !this.isIgnoredRegion(parentName)) {
                this.selectedRegions.add(parentCode);
            }
        });
    }
    
    /**
     * 获取地区的所有上级地区代码
     */
    getParentCodes(code) {
        const parentCodes = [];
        
        // 根据代码长度和格式判断级别
        if (code.length === 6) {
            if (!code.endsWith('00')) {
                // 区县级，查找其市级和省级上级
                const cityCode = this.findParentCode(code);
                if (cityCode) {
                    parentCodes.push(cityCode);
                    
                    // 继续查找市的上级（省）
                    const provinceCode = this.findParentCode(cityCode);
                    if (provinceCode) {
                        parentCodes.push(provinceCode);
                    }
                }
            } else {
                // 市级，查找其省级上级
                const provinceCode = this.findParentCode(code);
                if (provinceCode) {
                    parentCodes.push(provinceCode);
                }
            }
        }
        
        return parentCodes;
    }
    
    /**
     * 查找地区的直接上级代码
     */
    findParentCode(code) {
        // 遍历所有数据，找到包含该代码的父级
        for (const [parentCode, regions] of Object.entries(this.regionsData)) {
            if (regions[code]) {
                return parentCode;
            }
        }
        return null;
    }
    
    /**
     * 更新搜索结果显示状态
     */
    updateSearchResultsDisplay() {
        const items = this.provinceColumn.querySelectorAll('.region-item');
        items.forEach(item => {
            const code = item.dataset.code;
            const checkbox = item.querySelector('.region-checkbox');
            const isSelected = this.selectedRegions.has(code);
            
            checkbox.checked = isSelected;
            if (isSelected) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
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
        this.selectedCountEl.textContent = this.selectedRegions.size;
    }
    
    /**
     * 重置选择
     */
    reset() {
        this.selectedRegions.clear();
        this.updateSelectedCount();
        
        // 清除搜索状态
        this.searchKeyword = '';
        this.searchInput.value = '';
        
        // 重置导航状态
        this.currentProvince = null;
        this.currentCity = null;
        
        // 重新加载初始视图
        this.loadProvinces();
        this.showEmpty(this.cityColumn, '请先选择省份');
        this.showEmpty(this.districtColumn, '请先选择城市');
    }
    
    /**
     * 确认选择
     */
    confirm() {
        const selectedRegionNames = [];
        
        // 获取选中地区的名称，过滤掉"市辖区"等无意义的行政区划
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
     * 判断是否为需要忽略的地区（如市辖区）
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

// 创建全局实例
window.regionSelector = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        window.regionSelector = new RegionSelector();
        console.log('地区选择器初始化完成');
    } catch (error) {
        console.error('地区选择器初始化失败:', error);
    }
}); 