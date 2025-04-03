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

// 加载GeoJSON数据
fetch('hangzhou.geojson')
    .then(response => response.json())
    .then(data => {
        geoData = data;
        console.log('GeoJSON数据加载完成:', geoData);
        createTooltip(); // 确保在数据加载后创建tooltip
        
        // 初始化公司标记
        companyMarkers = new CompanyMarkers(canvas, ctx);
        
        // 初始绘制地图
        drawMap();
        
        // 每隔一段时间重新绘制地图，确保公司标记显示
        setTimeout(() => {
            console.log('延迟触发重绘以确保公司标记显示');
            if (companyMarkers && (!companyMarkers.companies || companyMarkers.companies.length === 0)) {
                // 如果公司数据还没加载，再次尝试加载
                companyMarkers.loadCompanies().then(() => {
                    drawMap();
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
    
    // 计算缩放比例以适应屏幕，保持宽高比
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
        companyMarkers.drawMarkers(scale, translateX, translateY);
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
    const isNearCompany = companyMarkers && companyMarkers.isNearCompany(mapPoint, transformMatrix.scale);
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

// 确保页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    createTooltip();
});

// 添加点击事件用于调试
canvas.addEventListener('click', (e) => {
    console.log('画布被点击');
    handleMouseMove(e);
}); 