// 全局图表实例
let mapChart, distributionChart, patentChart, financingChart, enterpriseTypeChart, regionChart;

// 地图相关变量
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
let geoData = null;
let tooltip = null;
let transformMatrix = {
    scale: 1,
    translateX: 0,
    translateY: 0
};
let hoveredRegion = null;
let companyMarkers = null;

// 定义全局变量，使其对其他脚本可见
window.transformMatrix = {
    scale: 1,
    translateX: 0,
    translateY: 0
};

// 添加数据缓存
const dataCache = {
    countyStats: {},
    lastFetchTime: 0,
    cacheDuration: 5 * 60 * 1000, // 缓存5分钟
    isInitialized: false, // 添加初始化标志
    yearlyData: null,
    industryStats: null,
    countyDistribution: null,
    isLoading: false // 新增加载状态标记
};

// 设置canvas尺寸
function resizeCanvas() {
    const container = document.getElementById('map-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// 创建tooltip元素
function createTooltip() {
    const existingTooltip = document.querySelector('.tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.display = 'none';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.backgroundColor = 'rgba(44, 62, 80, 0.95)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '15px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    tooltip.style.fontSize = '14px';
    tooltip.style.zIndex = '10000';
    tooltip.style.minWidth = '200px';
    tooltip.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    tooltip.style.transition = 'opacity 0.3s ease';
    tooltip.style.opacity = '1';
    
    document.body.appendChild(tooltip);
    console.log('Tooltip创建成功');
    
    return tooltip;
}

// 加载GeoJSON数据
async function loadGeoData() {
    try {
        console.log('开始加载GeoJSON数据...');
        const response = await fetch('/static/data_hall/map/hangzhou.geojson');
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        geoData = await response.json();
        console.log('GeoJSON数据加载完成:', geoData);
        
        // 初始化公司标记
        // companyMarkers = new CompanyMarkers(canvas, ctx);
        
        // 初始绘制地图
        // drawMap();
        
        return true; // 返回成功标志
    } catch (error) {
        console.error('加载GeoJSON数据失败:', error);
        // 使用模拟数据
        geoData = getMockGeoData();
        console.log('使用模拟GeoJSON数据');
        return true; // 即使使用模拟数据也返回成功
    }
}

// 获取模拟GeoJSON数据
function getMockGeoData() {
    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {
                    Name: "上城区",
                    Code: "330102"
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [120.15, 30.25],
                        [120.16, 30.25],
                        [120.16, 30.26],
                        [120.15, 30.26],
                        [120.15, 30.25]
                    ]]
                }
            },
            {
                type: "Feature",
                properties: {
                    Name: "下城区",
                    Code: "330103"
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [120.17, 30.25],
                        [120.18, 30.25],
                        [120.18, 30.26],
                        [120.17, 30.26],
                        [120.17, 30.25]
                    ]]
                }
            }
        ]
    };
}

// 坐标转换函数
function convertGeoToCartesian(lon, lat) {
    const x = lon;
    const y = -lat;
    return [x, y];
}

// 转换屏幕坐标到地图坐标
function screenToMapCoordinates(screenX, screenY) {
    const x = (screenX - transformMatrix.translateX) / transformMatrix.scale;
    const y = (screenY - transformMatrix.translateY) / transformMatrix.scale;
    return [x, y];
}

// 检查点是否在多边形内
function isPointInPolygon(point, polygon) {
    // 检查polygon是否为有效数组
    if (!polygon || !Array.isArray(polygon) || polygon.length === 0) {
        return false;
    }
    
    let inside = false;
    const x = point[0], y = point[1];
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// 绘制地图
function drawMap() {
    if (!geoData) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算边界框
    let bounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };

    // 预处理所有坐标点
    geoData.features.forEach(feature => {
        feature.transformedCoordinates = [];
        feature.geometry.coordinates[0].forEach(coord => {
            const [x, y] = convertGeoToCartesian(coord[0], coord[1]);
            feature.transformedCoordinates.push([x, y]);
            bounds.minX = Math.min(bounds.minX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.maxY = Math.max(bounds.maxY, y);
        });
    });
    
    let width = bounds.maxX - bounds.minX;
    let height = bounds.maxY - bounds.minY;
    
    // 计算缩放比例以适应屏幕
    let scaleX = (canvas.width * 0.9) / width;
    let scaleY = (canvas.height * 0.9) / height;
    let scale = Math.min(scaleX, scaleY);
    
    // 计算平移量使地图居中
    let translateX = (canvas.width - width * scale) / 2 - bounds.minX * scale;
    let translateY = (canvas.height - height * scale) / 2 - bounds.minY * scale;
    
    // 保存变换矩阵
    transformMatrix.scale = scale;
    transformMatrix.translateX = translateX;
    transformMatrix.translateY = translateY;
    
    // 应用变换
    ctx.save();
    ctx.translate(translateX, translateY);
    ctx.scale(scale, scale);

    // 获取筛选条件和缓存键
    const industryFilter = document.getElementById('industryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const countyFilter = document.getElementById('countyFilter');
    
    const industry = industryFilter ? industryFilter.value : '';
    const city = cityFilter ? cityFilter.value : '';
    const county = countyFilter ? countyFilter.value : '';
    
    const cacheKey = `${industry}_${city}_${county}`;
    
    // 检查缓存状态
    const now = Date.now();
    const cacheExpired = (now - dataCache.lastFetchTime > dataCache.cacheDuration);
    const noCacheData = (!dataCache.countyStats[cacheKey]);
    
    // 如果没有缓存数据或缓存已过期，并且不是正在加载
    if ((noCacheData || cacheExpired) && !dataCache.isLoading) {
        // 触发一次性加载所有数据
        loadAllData().then(() => {
            // 加载完成后重新绘制地图
            drawMap();
        });
        // 显示加载中状态
        geoData.features.forEach(feature => {
            const coordinates = feature.transformedCoordinates;
            
            ctx.beginPath();
            ctx.moveTo(coordinates[0][0], coordinates[0][1]);
            
            for (let i = 1; i < coordinates.length; i++) {
                ctx.lineTo(coordinates[i][0], coordinates[i][1]);
            }
            
            ctx.closePath();
            
            // 使用灰色表示加载中
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
        });
        
        ctx.restore();
        return;
    }
    
    // 在缓存中找出所有区县的公司数量
    let maxCompanyCount = 0;
    const companyCounts = [];
    
    // 从缓存中获取公司数量
    geoData.features.forEach(feature => {
        let count = 0;
        if (dataCache.countyStats[cacheKey]) {
            count = dataCache.countyStats[cacheKey][feature.properties.Name] || 0;
        }
        companyCounts.push(count);
        maxCompanyCount = Math.max(maxCompanyCount, count);
    });
    
    // 绘制区域
    geoData.features.forEach((feature, index) => {
        const coordinates = feature.transformedCoordinates;
        const isHovered = hoveredRegion === feature.properties.Name;
        const companyCount = companyCounts[index];
        
        // 计算颜色深浅比例（0-1之间）
        const colorIntensity = maxCompanyCount > 0 ? companyCount / maxCompanyCount : 0;
        
        ctx.beginPath();
        ctx.moveTo(coordinates[0][0], coordinates[0][1]);
        
        for (let i = 1; i < coordinates.length; i++) {
            ctx.lineTo(coordinates[i][0], coordinates[i][1]);
        }
        
        ctx.closePath();

        if (isHovered) {
            // 悬停状态：使用更鲜艳的高亮颜色
            ctx.fillStyle = `rgba(0, 220, 255, 0.95)`;
        } else {
            // 非悬停状态：使用更鲜艳的渐变色
            const baseColor = {
                r: 26 + (55 - 26) * colorIntensity,   // 从暗到亮
                g: 115 + (195 - 115) * colorIntensity, // 增加绿色成分
                b: 170 + (255 - 170) * colorIntensity  // 增加蓝色成分
            };
            ctx.fillStyle = `rgba(${Math.round(baseColor.r)}, ${Math.round(baseColor.g)}, ${Math.round(baseColor.b)}, 0.9)`;
        }
        
        ctx.fill();

        // 绘制边框
        ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(180, 230, 255, 0.7)';
        ctx.lineWidth = isHovered ? 3 / scale : 1.5 / scale;
        ctx.stroke();
    });

    // 恢复上下文
    ctx.restore();

    // 绘制公司标记
    if (companyMarkers && companyMarkers.companies && companyMarkers.companies.length > 0) {
        companyMarkers.drawMarkers(scale, translateX, translateY);
    }
}

// 计算多边形的中心点
function getPolygonCenter(coordinates) {
    let sumX = 0;
    let sumY = 0;
    coordinates.forEach(coord => {
        sumX += coord[0];
        sumY += coord[1];
    });
    return [sumX / coordinates.length, sumY / coordinates.length];
}

// 更新数据面板内容
function updateDataPanel(feature) {
    const dataPanel = document.querySelector('.data-panel');
    if (!dataPanel) return;

    const name = feature.properties.Name;
    const code = feature.properties.Code;
    
    dataPanel.innerHTML = `
        <h3>${name}</h3>
        <div class="data-item">
            <strong>行政区划代码</strong>
            <span>${code}</span>
        </div>
        <div class="data-item">
            <strong>GDP总量</strong>
            <span>328.4亿元</span>
        </div>
        <div class="data-item">
            <strong>人口规模</strong>
            <span>52.3万人</span>
        </div>
        <div class="data-item">
            <strong>企业数量</strong>
            <span>12,458家</span>
        </div>
        <div class="data-item">
            <strong>重点产业</strong>
            <span>数字经济、智能制造</span>
        </div>
    `;
}

// 鼠标移动事件处理
function handleMouseMove(e) {
    if (!geoData) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mapPoint = screenToMapCoordinates(mouseX, mouseY);
    let found = false;
    
    for (const feature of geoData.features) {
        // 确保feature和transformedCoordinates存在且有效
        if (!feature || !feature.transformedCoordinates || !Array.isArray(feature.transformedCoordinates) || feature.transformedCoordinates.length === 0) {
            continue;
        }
        
        if (isPointInPolygon(mapPoint, feature.transformedCoordinates)) {
            const name = feature.properties.Name;
            
            if (hoveredRegion !== name) {
                hoveredRegion = name;
                drawMap();
                updateDataPanel(feature);
            }

            // 获取筛选条件和缓存键
            const industryFilter = document.getElementById('industryFilter');
            const cityFilter = document.getElementById('cityFilter');
            const countyFilter = document.getElementById('countyFilter');
            
            const industry = industryFilter ? industryFilter.value : '';
            const city = cityFilter ? cityFilter.value : '';
            const county = countyFilter ? countyFilter.value : '';
            
            const cacheKey = `${industry}_${city}_${county}`;
            
            // 从缓存中获取公司数量
            let companyCount = '加载中...';
            if (dataCache.countyStats[cacheKey] && dataCache.countyStats[cacheKey][name] !== undefined) {
                companyCount = dataCache.countyStats[cacheKey][name];
            }
            
            // 显示tooltip，使用缓存数据
            showTooltip(e, name, companyCount);
            
            found = true;
            break;
        }
    }
    
    if (!found) {
        if (hoveredRegion !== null) {
            hoveredRegion = null;
            drawMap();
        }
        hideTooltip();
    }
}

// 隐藏tooltip
function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.style.opacity = '0';
        tooltip.innerHTML = ''; // 清空内容
        tooltip.style.visibility = 'hidden'; // 添加visibility属性
        tooltip.style.pointerEvents = 'none'; // 确保不会捕获鼠标事件
        
        // 移除tooltip元素
        if (document.body.contains(tooltip)) {
            document.body.removeChild(tooltip);
            tooltip = null;
        }
    }
}

// 显示tooltip
function showTooltip(event, countyName, companyCount) {
    if (!tooltip || !document.body.contains(tooltip)) {
        tooltip = createTooltip();
    }
    
    // 获取筛选条件
    const industryFilter = document.getElementById('industryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const countyFilter = document.getElementById('countyFilter');
    
    const industry = industryFilter ? industryFilter.value : '';
    const city = cityFilter ? cityFilter.value : '';
    const county = countyFilter ? countyFilter.value : '';
    
    // 构建缓存键
    const cacheKey = `${industry}_${city}_${county}`;
    
    // 从缓存中获取公司数量，如果缓存中有数据
    if (dataCache.countyStats[cacheKey] && dataCache.countyStats[cacheKey][countyName] !== undefined) {
        companyCount = dataCache.countyStats[cacheKey][countyName];
    }
    
    // 更新tooltip内容
    tooltip.innerHTML = `
        <div class="tooltip-title">${countyName}</div>
        <div class="tooltip-content">
            <div class="tooltip-data">
                <div>公司数量：<span style="color: #3498db; font-weight: bold;">${companyCount}</span> 家</div>
            </div>
        </div>
    `;
    
    // 设置tooltip位置
    let left = event.clientX + 15;
    let top = event.clientY + 15;
    
    // 确保tooltip不会超出视口
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width > window.innerWidth) {
        left = event.clientX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
        top = event.clientY - tooltipRect.height - 15;
    }
    
    tooltip.style.visibility = 'visible'; // 添加visibility属性
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    tooltip.style.pointerEvents = 'none'; // 确保不会捕获鼠标事件
}

// 获取区县公司数量
async function getCountyCompanyCount(countyName) {
    const now = Date.now();
    
    // 获取筛选条件
    const industryFilter = document.getElementById('industryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const countyFilter = document.getElementById('countyFilter');
    
    const industry = industryFilter ? industryFilter.value : '';
    const city = cityFilter ? cityFilter.value : '';
    const county = countyFilter ? countyFilter.value : '';
    
    // 构建缓存键，包含筛选条件
    const cacheKey = `${industry}_${city}_${county}`;
    
    // 如果缓存过期（超过5分钟）或不存在，则重新获取
    if (now - dataCache.lastFetchTime > dataCache.cacheDuration || !dataCache.countyStats[cacheKey]) {
        try {
            // 构建查询参数
            const params = new URLSearchParams();
            if (industry) params.append('industry', industry);
            if (city) params.append('city', city);
            if (county) params.append('county', county);
            
            // 发起API请求
            const response = await fetch(`/api/county-company-counts/?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 更新缓存
            dataCache.countyStats[cacheKey] = {};
            data.county_stats.forEach(item => {
                dataCache.countyStats[cacheKey][item.county] = item.count;
            });
            dataCache.lastFetchTime = now;
            
        } catch (error) {
            console.error('获取区县公司数量失败:', error);
            // 如果API请求失败，但缓存中有数据，继续使用缓存
            if (!dataCache.countyStats[cacheKey]) {
                dataCache.countyStats[cacheKey] = {};
            }
        }
    }
    
    // 从缓存中返回数量，如果没有则返回0
    return dataCache.countyStats[cacheKey][countyName] || 0;
}

// 初始化图表
function initCharts() {
    console.log('开始初始化所有图表');
    
    // 初始化分布趋势图（柱状图）
    distributionChart = echarts.init(document.getElementById('distributionChart'), null, {renderer: 'canvas'});
    // 先设置一个基础配置，稍后会用实际数据更新
    distributionChart.setOption({
        animation: true,
        animationDuration: 800,
        animationEasing: 'cubicOut',
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: {
            top: '50px', // 增加顶部边距，为标签留出空间
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: {
                color: '#ccc',
                fontSize: 10,
                rotate: 0 // 将年份横坐标调整为水平
            }
        },
        yAxis: {
            type: 'value',
            name: '企业数量',
            nameTextStyle: { color: '#ccc' },
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: { color: '#ccc' },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        series: [{
            name: '企业数量',
            type: 'bar',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 初始化为0
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#00C1D4' },
                    { offset: 0.5, color: '#188df0' },
                    { offset: 1, color: '#0A1A3A' }
                ])
            },
            emphasis: {
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#00E5FF' },
                        { offset: 0.7, color: '#188df0' },
                        { offset: 1, color: '#132144' }
                    ])
                }
            },
            label: {
                show: true,
                position: 'top', // 在柱子上方标注数量
                color: '#fff'
            }
        }]
    });
    
    // 初始化企业类型分布图（饼图）
    enterpriseTypeChart = echarts.init(document.getElementById('enterpriseTypeChart'), null, {renderer: 'canvas'});
    enterpriseTypeChart.setOption({
        animation: true,
        animationDuration: 800,
        animationEasing: 'cubicOut',
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)',
            backgroundColor: 'rgba(10, 26, 58, 0.85)',
            borderColor: 'rgba(0, 193, 212, 0.2)',
            textStyle: {
                color: '#fff'
            }
        },
        legend: {
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: { color: '#ccc', fontSize: 11 },
            itemWidth: 10,
            itemHeight: 10
        },
        series: [{
            name: '产业分布',
            type: 'pie',
            radius: ['30%', '70%'],
            center: ['40%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 6,
                borderColor: '#0f1733',
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: 'rgba(0, 193, 212, 0.2)'
            },
            label: {
                show: true,
                position: 'outside',
                formatter: '{b}\n{c} ({d}%)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 'bold',
                backgroundColor: 'rgba(10, 26, 58, 0.7)',
                borderRadius: 4,
                padding: [4, 6],
                lineHeight: 14,
                align: 'center'
            },
            labelLine: {
                show: true,
                length: 15,
                length2: 20,
                smooth: true,
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    width: 1
                }
            },
            emphasis: {
                focus: 'series',
                scaleSize: 10,
                itemStyle: {
                    shadowBlur: 15,
                    shadowColor: 'rgba(0, 193, 212, 0.5)'
                }
            },
            data: [
                { value: 35, name: '上市公司' },
                { value: 15, name: '独角兽' },
                { value: 25, name: '小巨人' },
                { value: 20, name: '专精特新' },
                { value: 5, name: '其他' }
            ]
        }],
        color: ['#00C1D4', '#2F80ED', '#FFD700', '#00E676', '#FF5252']
    });
    
    // 初始化区域分布图（柱状图）
    regionChart = echarts.init(document.getElementById('regionChart'), null, {renderer: 'canvas'});
    regionChart.setOption({
        animation: true,
        animationDuration: 800,
        animationEasing: 'cubicOut',
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区'],
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: { 
                color: '#ccc',
                rotate: 45 // 区县名称旋转45度，避免重叠
            }
        },
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: { color: '#ccc' }
        },
        series: [{
            name: '企业数量',
            type: 'bar',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 初始化为0
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#00C1D4' },
                    { offset: 1, color: '#132144' }
                ])
            },
            label: {
                show: true,
                position: 'top',
                color: '#fff',
                formatter: '{c}'
            }
        }]
    });

    // 更新标签位置
    updateLabels();
}

// 监听筛选条件变化 - 统一处理所有筛选条件变化
const filters = ['industryFilter', 'cityFilter', 'countyFilter'];
filters.forEach(filterId => {
    const element = document.getElementById(filterId);
    if (element) {
        element.addEventListener('change', function() {
            // 清除缓存
            dataCache.isInitialized = false;
            
            // 统一加载所有数据
            loadAllData();
            
            // 立即更新标签，提供即时反馈
            createFixedLabels();
        });
    }
});

// 统一数据加载函数
async function loadAllData() {
    try {
        // 防止重复加载
        if (dataCache.isLoading) {
            console.log('数据正在加载中，跳过重复请求');
            return;
        }
        
        // 标记为正在加载
        dataCache.isLoading = true;
        
        // 获取筛选条件
        const industryFilter = document.getElementById('industryFilter');
        const cityFilter = document.getElementById('cityFilter');
        const countyFilter = document.getElementById('countyFilter');
        
        const industry = industryFilter ? industryFilter.value : '';
        const city = cityFilter ? cityFilter.value : '';
        const county = countyFilter ? countyFilter.value : '';
        
        // 构建缓存键
        const cacheKey = `${industry}_${city}_${county}`;
        
        // 构建请求参数
        const params = new URLSearchParams();
        if (industry) params.append('industry', industry);
        if (city) params.append('city', city);
        if (county) params.append('county', county);
        
        const queryString = params.toString();
        
        console.log('开始统一加载数据，筛选条件:', { industry, city, county });
        
        // 创建固定标签，用于显示当前选中的过滤器
        createFixedLabels();
        
        // 并行发起所有需要的API请求
        const [yearlyStatsResponse, companyStatsResponse, countyCountsResponse] = await Promise.all([
            fetch(`/api/company-yearly-stats/?${queryString}`),
            fetch(`/api/company-stats/?${queryString}`),
            fetch(`/api/county-company-counts/?${queryString}`)
        ]);
        
        // 处理年度分布数据
        if (yearlyStatsResponse.ok) {
            const yearlyData = await yearlyStatsResponse.json();
            dataCache.yearlyData = yearlyData;
            
            // 更新年度分布图表
            updateYearlyDistributionChart(yearlyData);
        } else {
            console.error('获取年度分布数据失败');
            // 使用模拟数据代替
            useMockYearlyData();
        }
        
        // 处理公司统计数据
        if (companyStatsResponse.ok) {
            const statsData = await companyStatsResponse.json();
            dataCache.industryStats = statsData.industry_stats;
            
            // 更新产业分布图表
            updateIndustryChart(statsData.industry_stats);
        }
        
        // 处理区县公司数量数据
        if (countyCountsResponse.ok) {
            const countyData = await countyCountsResponse.json();
            
            // 更新缓存
            dataCache.countyStats[cacheKey] = {};
            countyData.county_stats.forEach(item => {
                dataCache.countyStats[cacheKey][item.county] = item.count;
            });
            
            // 更新区县分布图表
            updateCountyChart(countyData.county_stats);
        }
        
        // 更新地区和产业标签
        updateLabels();
        
        // 重新绘制地图
        drawMap();
        
        // 标记缓存为已初始化并更新时间戳
        dataCache.isInitialized = true;
        dataCache.lastFetchTime = Date.now();
        
        console.log('所有数据加载完成');
    } catch (error) {
        console.error('加载数据失败:', error);
    } finally {
        // 无论成功失败，都将加载状态重置
        dataCache.isLoading = false;
        
        // 确保创建固定标签
        createFixedLabels();
        
        // 在每次数据加载后重设图表大小，以确保标签显示正确
        if (distributionChart) distributionChart.resize();
        if (enterpriseTypeChart) enterpriseTypeChart.resize();
        if (regionChart) regionChart.resize();
    }
}

// 更新年度分布图表
function updateYearlyDistributionChart(data) {
    if (!distributionChart) return;
    
    const years = data.yearly_stats.map(item => item.year);
    const counts = data.yearly_stats.map(item => item.count);
    
    // 延迟更新以避免闪烁
    setTimeout(() => {
        distributionChart.setOption({
            animation: true,
            animationDuration: 800,
            animationEasing: 'cubicOut',
            xAxis: {
                data: years
            },
            series: [{
                data: counts,
                label: {
                    show: true,
                    position: 'top',
                    color: '#fff'
                }
            }]
        });
    }, 100);
}

// 使用模拟年度数据
function useMockYearlyData() {
    if (!distributionChart) return;
    
    const currentYear = 2024; // 固定使用2024年作为当前年份
    const years = Array.from({length: 10}, (_, i) => (currentYear - 9 + i).toString());
    const mockCounts = [175, 195, 178, 180, 185, 182, 100, 55, 10, 0];
    
    distributionChart.setOption({
        xAxis: {
            data: years
        },
        series: [{
            data: mockCounts
        }]
    });
    
    // 保存到缓存
    dataCache.yearlyData = {
        yearly_stats: years.map((year, index) => ({
            year: year,
            count: mockCounts[index]
        }))
    };
}

// 更新标签
function updateLabels() {
    const countySelect = document.getElementById('countyFilter');
    const industrySelect = document.getElementById('industryFilter');
    
    if (countySelect && industrySelect) {
        const selectedCounty = countySelect.options[countySelect.selectedIndex].text;
        const selectedIndustry = industrySelect.options[industrySelect.selectedIndex].text;
        
        updateRegionLabel(selectedCounty);
        updateIndustryLabel(selectedIndustry);
    }
}

// 加载统计数据
async function loadStats() {
    // 如果已初始化，使用缓存数据
    if (dataCache.isInitialized && !dataCache.isLoading) {
        console.log('使用缓存数据更新图表');
        updateChartsWithCachedData();
        return;
    }
    
    // 初始化图表
    initCharts();
    
    // 统一加载所有需要的数据
    await loadAllData();
}

// 使用缓存数据更新图表
function updateChartsWithCachedData() {
    const industry = document.getElementById('industryFilter').value;
    const city = document.getElementById('cityFilter').value;
    const county = document.getElementById('countyFilter').value;
    const cacheKey = `${industry}_${city}_${county}`;
    
    if (dataCache.countyStats[cacheKey]) {
        // 更新区县分布图表
        const countyStats = Object.entries(dataCache.countyStats[cacheKey]).map(([county, count]) => ({
            county,
            count
        }));
        updateCountyChart(countyStats);
        
        // 重新绘制地图
        drawMap();
    }
}

// 更新产业链分布图表
function updateIndustryChart(stats) {
    // 提取产业数据
    const chartData = stats.map(item => ({
        name: item.industry || '未知产业',
        value: item.count
    })).sort((a, b) => b.value - a.value).slice(0, 10); // 取前10个产业
    
    if (enterpriseTypeChart) {
        // 延迟更新以避免闪烁
        setTimeout(() => {
            enterpriseTypeChart.setOption({
                animation: true,
                animationDuration: 800,
                animationEasing: 'cubicOut',
                series: [{
                    center: ['40%', '50%'],
                    radius: ['30%', '70%'],
                    data: chartData,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: '#0f1733',
                        borderWidth: 2,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 193, 212, 0.2)'
                    },
                    label: {
                        show: true,
                        position: 'outside',
                        formatter: '{b}\n{c} ({d}%)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(10, 26, 58, 0.7)',
                        borderRadius: 4,
                        padding: [4, 6],
                        lineHeight: 14,
                        align: 'center'
                    },
                    labelLine: {
                        show: true,
                        length: 15,
                        length2: 20,
                        smooth: true,
                        lineStyle: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            width: 1
                        }
                    },
                    emphasis: {
                        focus: 'series',
                        scaleSize: 10,
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(0, 193, 212, 0.5)'
                        }
                    }
                }]
            });
        }, 100);
    }
}

// 更新区县分布图表
function updateCountyChart(stats) {
    const chartData = stats.map(item => ({
        name: item.county || '未知区县',
        value: item.count
    }));
    
    // 根据企业数量从高到低排序
    chartData.sort((a, b) => b.value - a.value);
    
    if (!regionChart) {
        console.log('区县图表未初始化');
        return;
    }
    
    // 延迟更新以避免闪烁
    setTimeout(() => {
        regionChart.setOption({
            animation: true,
            animationDuration: 800,
            animationEasing: 'cubicOut',
            xAxis: {
                data: chartData.map(item => item.name)
            },
            series: [{
                data: chartData.map(item => item.value),
                label: {
                    show: true,
                    position: 'top',
                    color: '#fff',
                    formatter: '{c}'
                }
            }]
        });
    }, 100);
}

// 设置筛选监听器
function setupFilterListeners() {
    const industryFilter = document.getElementById('industryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const countyFilter = document.getElementById('countyFilter');
    
    const filters = [industryFilter, cityFilter, countyFilter];
    filters.forEach(filter => {
        filter.addEventListener('change', () => {
            // 清除缓存
            dataCache.countyStats = {};
            dataCache.lastFetchTime = 0;
            dataCache.isInitialized = false;
            
            // 更新统计数据和地图
            loadStats();
            
            // 重新加载公司标记
            if (companyMarkers) {
                companyMarkers.loadCompanies().then(() => {
                    drawMap();
                });
            }
        });
    });
}

// 创建固定标签
function createFixedLabels() {
    // 找到近十年企业数量趋势的容器
    const chartContainer = document.getElementById('distributionChart');
    if (!chartContainer) return;
    
    const container = chartContainer.parentElement;
    if (!container) return;
    
    // 移除旧标签
    const oldLabels = document.querySelectorAll('.fixed-label');
    oldLabels.forEach(label => label.remove());
    
    // 获取筛选器选中的值
    const industryFilter = document.getElementById('industryFilter');
    const countyFilter = document.getElementById('countyFilter');
    
    const selectedIndustry = industryFilter ? industryFilter.options[industryFilter.selectedIndex].text : '全部产业';
    const selectedCounty = countyFilter ? countyFilter.options[countyFilter.selectedIndex].text : '全部地区';
    
    // 创建标签容器
    const labelContainer = document.createElement('div');
    labelContainer.className = 'fixed-label-container';
    labelContainer.style.position = 'absolute';
    labelContainer.style.top = '5px';
    labelContainer.style.left = '0';
    labelContainer.style.right = '0';
    labelContainer.style.display = 'flex';
    labelContainer.style.justifyContent = 'center';
    labelContainer.style.zIndex = '9999';
    
    // 创建产业标签
    const industryLabel = document.createElement('div');
    industryLabel.className = 'fixed-label';
    industryLabel.textContent = selectedIndustry;
    industryLabel.style.color = '#ffffff';
    industryLabel.style.fontWeight = 'bold';
    industryLabel.style.backgroundColor = 'rgba(10, 26, 58, 0.8)';
    industryLabel.style.padding = '2px 10px';
    industryLabel.style.borderRadius = '4px';
    industryLabel.style.marginRight = '10px';
    industryLabel.style.boxShadow = '0 0 10px rgba(0, 193, 212, 0.3)';
    
    // 创建地区标签
    const regionLabel = document.createElement('div');
    regionLabel.className = 'fixed-label';
    regionLabel.textContent = selectedCounty;
    regionLabel.style.color = '#ffffff';
    regionLabel.style.fontWeight = 'bold';
    regionLabel.style.backgroundColor = 'rgba(10, 26, 58, 0.8)';
    regionLabel.style.padding = '2px 10px';
    regionLabel.style.borderRadius = '4px';
    regionLabel.style.boxShadow = '0 0 10px rgba(0, 193, 212, 0.3)';
    
    // 添加到容器
    labelContainer.appendChild(industryLabel);
    labelContainer.appendChild(regionLabel);
    container.appendChild(labelContainer);
    
    console.log('固定标签已创建并居中放置:', selectedIndustry, selectedCounty);
}

// 更新产业标签 - 现在调用固定标签创建
function updateIndustryLabel(industryName) {
    createFixedLabels();
}

// 更新地区标签 - 现在调用固定标签创建
function updateRegionLabel(regionName) {
    createFixedLabels();
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('初始化地图和图表...');
    
    // 设置canvas尺寸
    resizeCanvas();
    
    // 创建tooltip
    tooltip = createTooltip();
    
    // 加载GeoJSON数据
    const geoDataLoaded = await loadGeoData();
    
    if (geoDataLoaded) {
        // 初始化公司标记
        companyMarkers = new CompanyMarkers(canvas, ctx);
        
        // 初始化图表
        initCharts();
        
        // 创建固定标签
        createFixedLabels();
        
        // 统一加载所有数据
        await loadAllData();
        
        // 初始绘制地图
        drawMap();
        
        // 添加鼠标移动事件监听
        canvas.addEventListener('mousemove', handleMouseMove);
        
        // 监听窗口大小变化
        window.addEventListener('resize', function() {
            resizeCanvas();
            drawMap();
            
            // 重置图表大小
            if (distributionChart) distributionChart.resize();
            if (enterpriseTypeChart) enterpriseTypeChart.resize();
            if (regionChart) regionChart.resize();
            
            // 重新创建标签确保位置正确
            createFixedLabels();
        });
        
        // 监听筛选条件变化
        const filters = ['industryFilter', 'cityFilter', 'countyFilter'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', function() {
                    // 清除缓存
                    dataCache.isInitialized = false;
                    
                    // 立即更新标签，提供即时反馈
                    createFixedLabels();
                    
                    // 统一加载所有数据
                    loadAllData();
                });
            }
        });
    }
}); 