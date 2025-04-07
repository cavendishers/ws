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

    // 获取所有区县的公司数量
    const companyCountPromises = geoData.features.map(feature => 
        getCountyCompanyCount(feature.properties.Name)
    );

    Promise.all(companyCountPromises).then(companyCounts => {
        // 找出最大公司数量，用于计算颜色深浅
        const maxCompanyCount = Math.max(...companyCounts);
        
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
                // 悬停状态：使用高亮颜色
                ctx.fillStyle = `rgba(0, 193, 212, 0.8)`;
            } else {
                // 非悬停状态：根据公司数量设置颜色深浅
                // 使用更深的颜色范围，增加对比度
                const baseColor = {
                    r: 0 + (19 - 0) * (1 - colorIntensity),   // 从0到19
                    g: 193 + (20 - 193) * (1 - colorIntensity), // 从193到20
                    b: 212 + (50 - 212) * (1 - colorIntensity)  // 从212到50
                };
                // 增加颜色饱和度
                ctx.fillStyle = `rgba(${Math.round(baseColor.r)}, ${Math.round(baseColor.g)}, ${Math.round(baseColor.b)}, 0.9)`;
            }
            
            ctx.fill();

            // 绘制边框
            ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = isHovered ? 3 / scale : 2 / scale;
            ctx.stroke();
        });

        // 恢复上下文
        ctx.restore();

        // 绘制公司标记
        if (companyMarkers && companyMarkers.companies && companyMarkers.companies.length > 0) {
            companyMarkers.drawMarkers(scale, translateX, translateY);
        }
    });
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
        if (isPointInPolygon(mapPoint, feature.transformedCoordinates)) {
            const name = feature.properties.Name;
            
            if (hoveredRegion !== name) {
                hoveredRegion = name;
                drawMap();
                updateDataPanel(feature);
            }

            // 显示tooltip
            showTooltip(e, name, '加载中...');
            
            // 获取公司数量
            getCountyCompanyCount(name).then(count => {
                if (hoveredRegion === name) {
                    showTooltip(e, name, count);
                }
            });
            
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

// 缓存区县公司数量
let countyCompanyCountsCache = {};
let countyCompanyCountsLastFetch = 0;

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
    
    // 如果缓存过期（超过1分钟）或不存在，则重新获取
    if (now - countyCompanyCountsLastFetch > 60000 || !countyCompanyCountsCache[cacheKey]) {
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
            countyCompanyCountsCache[cacheKey] = {};
            data.county_stats.forEach(item => {
                countyCompanyCountsCache[cacheKey][item.county] = item.count;
            });
            countyCompanyCountsLastFetch = now;
            
        } catch (error) {
            console.error('获取区县公司数量失败:', error);
            // 如果API请求失败，但缓存中有数据，继续使用缓存
            if (!countyCompanyCountsCache[cacheKey]) {
                countyCompanyCountsCache[cacheKey] = {};
            }
        }
    }
    
    // 从缓存中返回数量，如果没有则返回0
    return countyCompanyCountsCache[cacheKey][countyName] || 0;
}

// 初始化图表
function initCharts() {
    // 初始化分布趋势图
    const distributionChartDom = document.getElementById('distributionChart');
    distributionChart = echarts.init(distributionChartDom);
    const distributionOption = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['2018', '2019', '2020', '2021', '2022', '2023'],
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        yAxis: {
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        series: [
            {
                name: '企业数量',
                type: 'bar',
                data: [1200, 1500, 1800, 2100, 2400, 2800],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#83bff6' },
                        { offset: 0.5, color: '#188df0' },
                        { offset: 1, color: '#188df0' }
                    ])
                }
            }
        ]
    };
    distributionChart.setOption(distributionOption);

    // 初始化专利数量趋势图
    const patentChartDom = document.getElementById('patentChart');
    patentChart = echarts.init(patentChartDom);
    const patentOption = {
        tooltip: {
            trigger: 'axis'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['2018', '2019', '2020', '2021', '2022', '2023'],
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        yAxis: {
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        series: [
            {
                name: '专利数量',
                type: 'line',
                smooth: true,
                data: [500, 650, 800, 950, 1100, 1300],
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(255, 215, 0, 0.5)' },
                        { offset: 1, color: 'rgba(255, 215, 0, 0.1)' }
                    ])
                },
                itemStyle: {
                    color: '#FFD700'
                },
                lineStyle: {
                    width: 3
                }
            }
        ]
    };
    patentChart.setOption(patentOption);

    // 初始化融资规模趋势图
    const financingChartDom = document.getElementById('financingChart');
    financingChart = echarts.init(financingChartDom);
    const financingOption = {
        tooltip: {
            trigger: 'axis'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['2018', '2019', '2020', '2021', '2022', '2023'],
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        yAxis: {
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        series: [
            {
                name: '融资规模(亿元)',
                type: 'bar',
                data: [15, 25, 35, 45, 60, 80],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#00C1D4' },
                        { offset: 1, color: '#132144' }
                    ])
                }
            }
        ]
    };
    financingChart.setOption(financingOption);

    // 初始化企业类型分布图
    const enterpriseTypeChartDom = document.getElementById('enterpriseTypeChart');
    enterpriseTypeChart = echarts.init(enterpriseTypeChartDom);
    const enterpriseTypeOption = {
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: {
                color: '#ccc'
            }
        },
        series: [
            {
                name: '企业类型',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#132144',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '18',
                        fontWeight: 'bold',
                        color: '#fff'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: 35, name: '上市公司' },
                    { value: 15, name: '独角兽' },
                    { value: 25, name: '小巨人' },
                    { value: 20, name: '专精特新' },
                    { value: 5, name: '其他' }
                ]
            }
        ]
    };
    enterpriseTypeChart.setOption(enterpriseTypeOption);

    // 初始化区域分布图
    const regionChartDom = document.getElementById('regionChart');
    regionChart = echarts.init(regionChartDom);
    const regionOption = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        yAxis: {
            type: 'category',
            data: ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '桐庐县', '淳安县', '建德市'],
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        series: [
            {
                name: '企业数量',
                type: 'bar',
                data: [85, 72, 65, 58, 95, 88, 76, 92, 45, 38, 42, 35, 30],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#132144' },
                        { offset: 1, color: '#00C1D4' }
                    ])
                }
            }
        ]
    };
    regionChart.setOption(regionOption);

    // 监听窗口大小变化，调整图表大小
    window.addEventListener('resize', () => {
        distributionChart.resize();
        patentChart.resize();
        financingChart.resize();
        enterpriseTypeChart.resize();
        regionChart.resize();
    });
}

// 加载统计数据
async function loadStats() {
    try {
        console.log('Map: 开始加载统计数据...');
        // 获取筛选条件
        const industry = document.getElementById('industryFilter').value;
        const city = document.getElementById('cityFilter').value;
        const county = document.getElementById('countyFilter').value;
        
        // 构建查询参数
        const params = new URLSearchParams();
        if (industry) params.append('industry', industry);
        if (city) params.append('city', city);
        if (county) params.append('county', county);
        
        console.log('Map: 筛选条件:', { industry, city, county });
        
        const response = await fetch(`/api/company-stats/?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Map: 获取到的统计数据:', data);
        
        // 更新产业分布图表
        updateIndustryChart(data.industry_stats);
        
        // 更新区县分布图表
        updateCountyChart(data.county_stats);
        
        // 重新绘制地图
        drawMap();
        
        console.log('Map: 统计数据加载完成');
    } catch (error) {
        console.error('Map: 加载统计数据失败:', error);
    }
}

// 更新产业分布图表
function updateIndustryChart(stats) {
    const chartData = stats.map(item => ({
        name: item.industry || '未知产业',
        value: item.count
    }));
    
    if (distributionChart) {
        distributionChart.dispose();
    }
    
    distributionChart = echarts.init(document.getElementById('distributionChart'));
    distributionChart.setOption({
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 10,
            data: chartData.map(item => item.name),
            textStyle: {
                color: '#ccc'
            }
        },
        series: [{
            name: '产业分布',
            type: 'pie',
            radius: ['50%', '70%'],
            avoidLabelOverlap: false,
            label: {
                show: false,
                position: 'center'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: '14',
                    fontWeight: 'bold',
                    color: '#fff'
                }
            },
            labelLine: {
                show: false
            },
            data: chartData,
            itemStyle: {
                borderRadius: 5,
                borderColor: '#132144',
                borderWidth: 2
            }
        }]
    });
}

// 更新区县分布图表
function updateCountyChart(stats) {
    const chartData = stats.map(item => ({
        name: item.county || '未知区县',
        value: item.count
    }));
    
    if (regionChart) {
        regionChart.dispose();
    }
    
    regionChart = echarts.init(document.getElementById('regionChart'));
    regionChart.setOption({
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            boundaryGap: [0, 0.01],
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        yAxis: {
            type: 'category',
            data: chartData.map(item => item.name),
            axisLine: {
                lineStyle: {
                    color: '#ccc'
                }
            },
            axisLabel: {
                color: '#ccc'
            }
        },
        series: [{
            name: '企业数量',
            type: 'bar',
            data: chartData.map(item => item.value),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: '#132144' },
                    { offset: 1, color: '#00C1D4' }
                ])
            }
        }]
    });
}

// 设置筛选监听器
function setupFilterListeners() {
    const industryFilter = document.getElementById('industryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const countyFilter = document.getElementById('countyFilter');
    
    const filters = [industryFilter, cityFilter, countyFilter];
    filters.forEach(filter => {
        filter.addEventListener('change', () => {
            // 清除区县公司数量缓存
            countyCompanyCountsCache = {};
            countyCompanyCountsLastFetch = 0;
            
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化地图...');
    
    // 先进行Canvas尺寸设置
    resizeCanvas();
    
    // 创建tooltip
    tooltip = createTooltip();
    
    // 步骤1: 加载地理数据
    loadGeoData().then(success => {
        if (!success) {
            console.error('地理数据加载失败');
            return;
        }
        
        console.log('地理数据加载成功，初始化公司标记...');
        // 步骤2: 初始化公司标记
        if (typeof CompanyMarkers === 'function') {
            companyMarkers = new CompanyMarkers(canvas, ctx);
            // 加载公司数据
            companyMarkers.loadCompanies().then(() => {
                console.log('公司数据加载完成，绘制地图...');
                // 步骤3: 初始绘制地图
                drawMap();
            });
        } else {
            console.error('CompanyMarkers类不存在');
        }
        
        // 步骤4: 加载统计数据
        loadStats();
        
        // 步骤5: 设置筛选监听器
        setupFilterListeners();
    });
    
    // 添加事件监听器
    canvas.addEventListener('mousemove', handleMouseMove);
    // 添加鼠标离开地图区域的事件监听器
    canvas.addEventListener('mouseleave', () => {
        hoveredRegion = null;
        hideTooltip();
        drawMap();
    });
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawMap();
    });
}); 