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
    tooltip.style.display = 'none';
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    document.body.appendChild(tooltip);
}

// 加载GeoJSON数据
async function loadGeoData() {
    try {
        const response = await fetch('/static/data_hall/map/hangzhou.geojson');
        geoData = await response.json();
        console.log('GeoJSON数据加载完成:', geoData);
        
        // 初始化公司标记
        companyMarkers = new CompanyMarkers(canvas, ctx);
        
        // 初始绘制地图
        drawMap();
        
        // 设置定期重绘
        setInterval(() => {
            if (companyMarkers && companyMarkers.companies && companyMarkers.companies.length > 0) {
                drawMap();
            }
        }, 3000);
    } catch (error) {
        console.error('加载GeoJSON数据失败:', error);
        // 使用模拟数据
        geoData = getMockGeoData();
        drawMap();
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

// 绘制地图
function drawMap() {
    if (!geoData) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算边界框
    let transformedBounds = {
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
            transformedBounds.minX = Math.min(transformedBounds.minX, x);
            transformedBounds.minY = Math.min(transformedBounds.minY, y);
            transformedBounds.maxX = Math.max(transformedBounds.maxX, x);
            transformedBounds.maxY = Math.max(transformedBounds.maxY, y);
        });
    });
    
    let width = transformedBounds.maxX - transformedBounds.minX;
    let height = transformedBounds.maxY - transformedBounds.minY;
    
    // 计算缩放比例以适应屏幕
    let scaleX = (canvas.width * 0.9) / width;
    let scaleY = (canvas.height * 0.9) / height;
    let scale = Math.min(scaleX, scaleY);
    
    // 计算平移量使地图居中
    let translateX = (canvas.width - width * scale) / 2 - transformedBounds.minX * scale;
    let translateY = (canvas.height - height * scale) / 2 - transformedBounds.minY * scale;
    
    // 保存变换矩阵
    transformMatrix.scale = scale;
    transformMatrix.translateX = translateX;
    transformMatrix.translateY = translateY;

    // 应用变换
    ctx.save();
    ctx.translate(translateX, translateY);
    ctx.scale(scale, scale);

    // 绘制区域
    geoData.features.forEach((feature, index) => {
        const coordinates = feature.transformedCoordinates;
        const isHovered = hoveredRegion === feature.properties.Name;
        
        // 计算动画进度
        if (!feature.hoverProgress) feature.hoverProgress = 0;
        const targetProgress = isHovered ? 1 : 0;
        feature.hoverProgress += (targetProgress - feature.hoverProgress) * 0.2;

        if (isHovered) {
            ctx.save();
            const shadowBlur = 15 * feature.hoverProgress;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetX = 5 * feature.hoverProgress / scale;
            ctx.shadowOffsetY = 5 * feature.hoverProgress / scale;
        }

        ctx.beginPath();
        ctx.moveTo(coordinates[0][0], coordinates[0][1]);
        
        for (let i = 1; i < coordinates.length; i++) {
            ctx.lineTo(coordinates[i][0], coordinates[i][1]);
        }
        
        ctx.closePath();

        // 使用更美观的颜色方案
        // 基础颜色：深蓝色系
        const baseColor = {
            r: 19,
            g: 33,
            b: 68
        };
        
        // 悬停颜色：亮蓝色系
        const hoverColor = {
            r: 0,
            g: 193,
            b: 212
        };
        
        // 计算当前颜色
        const currentColor = {
            r: baseColor.r + (hoverColor.r - baseColor.r) * feature.hoverProgress,
            g: baseColor.g + (hoverColor.g - baseColor.g) * feature.hoverProgress,
            b: baseColor.b + (hoverColor.b - baseColor.b) * feature.hoverProgress
        };
        
        // 填充区域
        const alpha = 0.6 + (0.2 * feature.hoverProgress);
        ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${alpha})`;
        ctx.fill();

        // 绘制边框
        const strokeAlpha = 0.8 + (0.2 * feature.hoverProgress);
        ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
        ctx.lineWidth = (2 + feature.hoverProgress) / scale;
        ctx.stroke();

        if (isHovered) {
            ctx.restore();
        }
    });

    // 绘制区域名称
    geoData.features.forEach((feature) => {
        const coordinates = feature.transformedCoordinates;
        const isHovered = hoveredRegion === feature.properties.Name;
        const center = getPolygonCenter(coordinates);
        
        const baseFontSize = 14;
        const maxFontSize = 18;
        const fontSize = (baseFontSize + (maxFontSize - baseFontSize) * feature.hoverProgress) / scale;
        
        // 文字颜色：从灰色到白色
        const textColor = `rgba(${255 * feature.hoverProgress}, ${255 * feature.hoverProgress}, ${255 * feature.hoverProgress}, 1)`;
        
        const text = feature.properties.Name;
        ctx.fillStyle = textColor;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, center[0], center[1]);
    });

    // 绘制公司标记
    if (companyMarkers && companyMarkers.companies && companyMarkers.companies.length > 0) {
        companyMarkers.drawMarkers(scale, translateX, translateY);
    }

    ctx.restore();

    // 如果有动画正在进行，继续重绘
    if (geoData.features.some(feature => 
        Math.abs(feature.hoverProgress - (hoveredRegion === feature.properties.Name ? 1 : 0)) > 0.01
    )) {
        requestAnimationFrame(drawMap);
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
    if (!geoData || !tooltip) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mapPoint = screenToMapCoordinates(mouseX, mouseY);
    let found = false;
    
    // 检查是否在公司标记附近
    const isNearCompany = companyMarkers && companyMarkers.isNearCompany(mapPoint, transformMatrix.scale);
    if (isNearCompany) {
        // 可以添加公司相关的tooltip显示逻辑
    }
    
    for (const feature of geoData.features) {
        if (isPointInPolygon(mapPoint, feature.transformedCoordinates)) {
            const name = feature.properties.Name;
            const code = feature.properties.Code;
            
            if (hoveredRegion !== name) {
                hoveredRegion = name;
                drawMap();
                updateDataPanel(feature);
            }

            // 更新tooltip
            tooltip.innerHTML = `
                <div class="tooltip-title">${name}</div>
                <div class="tooltip-content">
                    <div class="tooltip-data">
                        <div>行政区划代码：${code}</div>
                        <div>GDP：328.4亿元</div>
                        <div>人口：52.3万人</div>
                        <div>企业数量：12,458家</div>
                    </div>
                </div>
            `;
            
            // 设置tooltip位置
            let left = e.clientX + 15;
            let top = e.clientY + 15;
            
            // 确保tooltip不会超出视口
            const tooltipRect = tooltip.getBoundingClientRect();
            if (left + tooltipRect.width > window.innerWidth) {
                left = e.clientX - tooltipRect.width - 15;
            }
            if (top + tooltipRect.height > window.innerHeight) {
                top = e.clientY - tooltipRect.height - 15;
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';
            
            found = true;
            break;
        }
    }
    
    if (!found) {
        if (hoveredRegion !== null) {
            hoveredRegion = null;
            drawMap();
        }
        tooltip.style.opacity = '0';
        setTimeout(() => {
            if (tooltip.style.opacity === '0') {
                tooltip.style.display = 'none';
            }
        }, 300);
    }
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    createTooltip();
    loadGeoData();
    initCharts();
    
    // 添加事件监听器
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawMap();
    });
}); 