const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
let geoData = null;
let tooltip = null;
// 将transformMatrix暴露为全局变量
window.transformMatrix = {
    scale: 1,
    translateX: 0,
    translateY: 0
};
let hoveredRegion = null;
let companyMarkers = null;

// 设置固定的canvas尺寸，与容器尺寸保持一致
canvas.width = 764;  // 设置固定宽度
canvas.height = 622;  // 设置固定高度

// 创建tooltip元素
function createTooltip() {
    // 如果已存在tooltip，先移除
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
    console.log('Tooltip created and added to body');
}

// 在地图加载完成后，主动加载公司数据
function initCompanyMarkers() {
    // 确保canvas和ctx存在
    if (!canvas || !ctx) {
        console.error('Canvas或ctx不存在，无法初始化公司标记');
        return;
    }
    
    console.log('开始初始化公司标记...');
    
    try {
        // 创建公司标记实例
        companyMarkers = new CompanyMarkers(canvas, ctx);
        console.log('公司标记类初始化成功');
        
        // 主动加载公司数据
        companyMarkers.loadCompanies().then(companies => {
            console.log('初始化时成功加载公司数据:', companies);
            // 加载完成后重绘地图
            drawMap();
        });
    } catch (error) {
        console.error('初始化公司标记时出错:', error);
    }
}

// 加载GeoJSON数据
console.log('开始加载GeoJSON数据...');
fetch('hangzhou.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        geoData = data;
        console.log('GeoJSON数据加载完成:', geoData);
        createTooltip(); // 确保在数据加载后创建tooltip
        
        // 初始化公司标记
        initCompanyMarkers();
        
        // 初始绘制地图
        drawMap();
        
        // 每隔一段时间重新绘制地图，确保公司标记显示
        setTimeout(() => {
            console.log('延迟触发重绘以确保公司标记显示');
            if (companyMarkers && (!companyMarkers.companies || companyMarkers.companies.length === 0)) {
                // 如果公司数据还没加载，再次尝试加载
                companyMarkers.loadCompanies().then(() => {
                    console.log('延迟加载公司数据完成，重新绘制地图');
                    drawMap();
                }).catch(error => {
                    console.error('延迟加载公司数据失败:', error);
                });
            } else {
                drawMap();
            }
        }, 1000);
        
        // 设置定期检查公司标记是否显示
        setInterval(() => {
            if (companyMarkers && companyMarkers.companies && companyMarkers.companies.length > 0) {
                drawMap();
            }
        }, 3000);
    })
    .catch(error => {
        console.error('加载GeoJSON数据失败:', error);
        // 尝试使用备用方法加载公司数据
        try {
            companyMarkers = new CompanyMarkers(canvas, ctx);
            companyMarkers.loadCompanies().then(() => {
                console.log('GeoJSON加载失败，但成功加载了公司数据');
                drawMap();
            });
        } catch (error) {
            console.error('备用方法加载公司数据也失败:', error);
        }
    });

// 坐标转换函数
function convertGeoToCartesian(lon, lat) {
    // 使用简单的线性映射，保持相对位置关系
    const x = lon;
    const y = -lat; // 反转y轴，使北向上
    return [x, y];
}

// 转换屏幕坐标到地图坐标
function screenToMapCoordinates(screenX, screenY) {
    // 反转变换矩阵
    const x = (screenX - window.transformMatrix.translateX) / window.transformMatrix.scale;
    const y = (screenY - window.transformMatrix.translateY) / window.transformMatrix.scale;
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
    
    // 计算缩放比例以适应屏幕，保持宽高比
    let scaleX = (canvas.width * 0.9) / width;
    let scaleY = (canvas.height * 0.9) / height;
    let scale = Math.min(scaleX, scaleY);
    
    // 计算平移量使地图居中
    let translateX = (canvas.width - width * scale) / 2 - transformedBounds.minX * scale;
    let translateY = (canvas.height - height * scale) / 2 - transformedBounds.minY * scale;
    
    // 保存变换矩阵
    window.transformMatrix.scale = scale;
    window.transformMatrix.translateX = translateX;
    window.transformMatrix.translateY = translateY;

    // 应用变换
    ctx.save();
    ctx.translate(translateX, translateY);
    ctx.scale(scale, scale);

    // 先绘制所有区域的形状和边框
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

        const hue = (index * 30) % 360;
        const lightness = 60 - (10 * feature.hoverProgress); // 动画过渡
        const alpha = 0.6 + (0.2 * feature.hoverProgress); // 动画过渡
        ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;
        ctx.fill();

        const strokeAlpha = 0.8 + (0.2 * feature.hoverProgress); // 边框透明度动画
        ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
        ctx.lineWidth = (2 + feature.hoverProgress) / scale; // 线宽动画
        ctx.stroke();

        if (isHovered) {
            ctx.restore();
        }
    });

    // 然后单独绘制所有区域的文字
    geoData.features.forEach((feature) => {
        const coordinates = feature.transformedCoordinates;
        const isHovered = hoveredRegion === feature.properties.Name;
        const center = getPolygonCenter(coordinates);
        
        // 文字大小动画
        const baseFontSize = 14;
        const maxFontSize = 18;
        const fontSize = (baseFontSize + (maxFontSize - baseFontSize) * feature.hoverProgress) / scale;
        
        // 文字颜色动画
        const textColor = `rgba(${255 * feature.hoverProgress}, ${255 * feature.hoverProgress}, ${255 * feature.hoverProgress}, 1)`;
        
        const text = feature.properties.Name;
        ctx.fillStyle = textColor;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, center[0], center[1]);
    });

    // 绘制公司标记 - 始终在最上层
    if (companyMarkers && companyMarkers.companies && companyMarkers.companies.length > 0) {
        console.log('正在绘制公司标记...公司数量:', companyMarkers.companies.length);
        try {
            // 确保变换矩阵已正确设置
            console.log('绘制时的变换矩阵:', {
                scale: scale,
                translateX: translateX,
                translateY: translateY
            });
            
            // 绘制前强制确保公司数据存在
            if (companyMarkers.companies.length > 0) {
                companyMarkers.drawMarkers(scale, translateX, translateY);
                console.log('公司标记绘制成功');
            } else {
                console.warn('公司数据存在但长度为0');
            }
        } catch (error) {
            console.error('绘制公司标记时出错:', error, error.stack);
        }
    } else {
        console.log('没有公司标记可供绘制，companyMarkers:', companyMarkers);
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

// 检查点是否在多边形内（射线法）
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
            <strong>行政区划代码：</strong>${code}
        </div>
        <div class="data-item">
            <strong>GDP总量：</strong>328.4亿元
        </div>
        <div class="data-item">
            <strong>人口规模：</strong>52.3万人
        </div>
        <div class="data-item">
            <strong>企业数量：</strong>12,458家
        </div>
        <div class="data-item">
            <strong>重点产业：</strong>数字经济、智能制造
        </div>
    `;
}

// 鼠标移动事件处理函数
function handleMouseMove(e) {
    if (!geoData || !tooltip) {
        console.log('数据或tooltip未准备好');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mapPoint = screenToMapCoordinates(mouseX, mouseY);
    let found = false;
    
    // 检查是否在公司标记附近
    const isNearCompany = companyMarkers && companyMarkers.isNearCompany(mapPoint, window.transformMatrix.scale);
    if (isNearCompany) {
        // 如果鼠标在公司标记附近，可以显示公司相关的tooltip
        // 这里可以添加逻辑来显示公司的tooltip信息
        // 暂时不影响区域的悬停状态
        // return; // 注释掉这行，让区域悬停继续处理
    }
    
    for (const feature of geoData.features) {
        if (isPointInPolygon(mapPoint, feature.transformedCoordinates)) {
            const name = feature.properties.Name;
            const code = feature.properties.Code;
            
            if (hoveredRegion !== name) {
                hoveredRegion = name;
                drawMap();
            }

            // 更新tooltip内容和位置
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

// 移除旧的事件监听器（如果存在）
canvas.removeEventListener('mousemove', handleMouseMove);
// 添加新的事件监听器
canvas.addEventListener('mousemove', handleMouseMove);

// 测试函数：直接在画布上绘制测试点
function drawTestDots() {
    if (!ctx) return;
    
    console.log('绘制测试点...');
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制边框
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // 绘制中心点
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 绘制大红点（中心）
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    
    // 绘制四个角落的点
    const points = [
        { x: 50, y: 50, color: 'blue' },
        { x: canvas.width - 50, y: 50, color: 'green' },
        { x: 50, y: canvas.height - 50, color: 'yellow' },
        { x: canvas.width - 50, y: canvas.height - 50, color: 'purple' }
    ];
    
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`(${point.x}, ${point.y})`, point.x, point.y + 20);
    });
    
    console.log('测试点绘制完成');
}

// 立即添加测试按钮和绘制测试点
(function initializeMap() {
    // 检查canvas是否存在
    if (!canvas || !ctx) {
        console.error('无法找到canvas或ctx');
        return;
    }

    console.log('页面立即初始化，绘制测试公司点...');
    
    // 直接绘制测试点
    drawTestDots();
    
    // 创建测试公司数据
    const testCompanies = [
        {
            name: '测试公司1',
            latitude: 30.259924,
            longitude: 120.130095
        },
        {
            name: '测试公司2',
            latitude: 30.319104,
            longitude: 120.150116
        },
        {
            name: '测试公司3',
            latitude: 30.206428,
            longitude: 120.210095
        }
    ];
    
    // 直接绘制公司点
    drawCompanyPoints(testCompanies);
    
    // 添加测试按钮
    document.body.insertAdjacentHTML('beforeend', `
        <button id="test-draw-button" style="
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 10000;
            padding: 5px 10px;
            background: #ff0000;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        ">测试绘制</button>
    `);
    
    // 绑定测试按钮事件
    const button = document.getElementById('test-draw-button');
    if (button) {
        button.addEventListener('click', () => {
            console.log('测试按钮被点击');
            drawTestDots();
            drawCompanyPoints(testCompanies);
        });
    }
})();

// 直接绘制公司点函数 - 不依赖复杂的转换
function drawCompanyPoints(companies) {
    if (!ctx) return;
    
    console.log('直接绘制公司点...');
    
    // 获取canvas尺寸
    const width = canvas.width;
    const height = canvas.height;
    
    // 简单的线性映射 - 杭州经纬度范围约为：
    // 经度: 119.9-120.4, 纬度: 30.1-30.4
    const lonMin = 119.9;
    const lonMax = 120.4;
    const latMin = 30.1;
    const latMax = 30.4;
    
    // 计算比例尺，留出边距
    const margin = 50;
    const scaleX = (width - 2 * margin) / (lonMax - lonMin);
    const scaleY = (height - 2 * margin) / (latMax - latMin);
    
    companies.forEach(company => {
        // 将经纬度转换为画布坐标
        const x = margin + (company.longitude - lonMin) * scaleX;
        const y = height - margin - (company.latitude - latMin) * scaleY; // 反转y轴
        
        console.log(`绘制公司点: ${company.name}, 坐标: (${x}, ${y})`);
        
        // 绘制公司点
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制公司名称
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const textWidth = ctx.measureText(company.name).width;
        const padding = 3;
        
        // 绘制文字背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            x - textWidth/2 - padding,
            y + 10 - padding,
            textWidth + 2*padding,
            16 + 2*padding
        );
        
        // 绘制文字
        ctx.fillStyle = 'white';
        ctx.fillText(company.name, x, y + 10);
    });
}

// 确保页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    createTooltip();
    initializeMap();
});

// 添加点击事件用于调试
canvas.addEventListener('click', (e) => {
    console.log('画布被点击');
    handleMouseMove(e);
}); 