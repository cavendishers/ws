// 产业链详情页面的JavaScript代码
document.addEventListener('DOMContentLoaded', function () {
    // 从后端获取产业链数据 - 这个变量将由HTML模板传递
    if (typeof graphData === 'undefined') {
        console.error('graphData is not defined. Make sure it is passed from the template.');
        return;
    }

    const container = document.getElementById('industry-chain-container');
    const zoomPanContainer = document.getElementById('chart-zoom-pan-container');

    if (!graphData || !graphData.Children) {
        console.error('graphData is not defined or has no Children property.');
        container.innerHTML = '<p style="color:red; text-align:center;">Error: Graph data not found.</p>';
        return;
    }

    renderGraph(graphData.Children, container);

    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let start = { x: 0, y: 0 };
    let translateX = 0;
    let translateY = 0;

    function setTransform() {
        container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    // 自动适应视窗，展示全局视图
    function fitToViewport() {
        // 确保在测量前容器是可见的，但暂时移除变换
        const currentTransform = container.style.transform;
        container.style.visibility = 'visible';
        container.style.transform = 'translate(0px, 0px) scale(1)';
        
        // 强制重新计算布局
        container.offsetHeight;
        
        // 获取容器原始尺寸
        const containerRect = container.getBoundingClientRect();
        const zoomContainerRect = zoomPanContainer.getBoundingClientRect();
        
        // 计算合适的缩放比例（预留更多边距）
        const marginX = 100; // 水平边距
        const marginY = 80;  // 垂直边距
        const scaleX = (zoomContainerRect.width - marginX) / containerRect.width;
        const scaleY = (zoomContainerRect.height - marginY) / containerRect.height;
        scale = Math.min(scaleX, scaleY, 1); // 不要放大，只缩小
        
        // 确保最小缩放不会太小
        scale = Math.max(scale, 0.2);
        
        // 计算水平居中位置
        const scaledWidth = containerRect.width * scale;
        translateX = Math.max(20, (zoomContainerRect.width - scaledWidth) / 2);
        
        // 调整垂直位置 - 只留出少量顶部间隙而不是垂直居中
        const topMargin = 20; // 顶部固定间隙
        translateY = topMargin;
        
        // 确保图表不会被底部裁剪
        const scaledHeight = containerRect.height * scale;
        if (topMargin + scaledHeight > zoomContainerRect.height) {
            // 如果高度超出视口，调整缩放以适应
            const newScale = (zoomContainerRect.height - topMargin - 20) / containerRect.height;
            scale = Math.max(newScale, 0.2);
            translateY = topMargin;
        }
        
        // 应用变换
        setTransform();
        
        console.log(`自动适应: 缩放比例=${scale.toFixed(2)}, 位置X=${translateX.toFixed(0)}px, Y=${translateY.toFixed(0)}px`);
        console.log(`容器尺寸: ${containerRect.width}x${containerRect.height}, 视口尺寸: ${zoomContainerRect.width}x${zoomContainerRect.height}`);
    }

    // 页面加载时立即适应视窗，不使用延时
    fitToViewport();

    // 窗口大小改变时重新适应
    window.addEventListener('resize', fitToViewport);

    // 刷新按钮点击事件
    document.querySelector('.graph-sidebar-item[title="刷新"]').addEventListener('click', function() {
        // 直接刷新整个页面
        window.location.reload();
    });

    zoomPanContainer.onmousedown = function (e) {
        e.preventDefault();
        start = { x: e.clientX - translateX, y: e.clientY - translateY };
        panning = true;
        zoomPanContainer.style.cursor = 'grabbing';
    };

    zoomPanContainer.onmouseup = function () {
        panning = false;
        zoomPanContainer.style.cursor = 'grab';
    };

    zoomPanContainer.onmouseleave = function () { // Stop panning if mouse leaves container
        panning = false;
        zoomPanContainer.style.cursor = 'grab';
    };

    zoomPanContainer.onmousemove = function (e) {
        e.preventDefault();
        if (!panning) {
            return;
        }
        translateX = e.clientX - start.x;
        translateY = e.clientY - start.y;
        setTransform();
    };

    zoomPanContainer.onwheel = function (e) {
        e.preventDefault();
        const xs = (e.clientX - translateX) / scale;
        const ys = (e.clientY - translateY) / scale;
        const delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);

        (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
        scale = Math.min(Math.max(0.2, scale), 4); // Min 0.2x, Max 4x zoom

        translateX = e.clientX - xs * scale;
        translateY = e.clientY - ys * scale;

        setTransform();
    };

    // 添加视图选项的点击事件
    const viewOptions = document.querySelectorAll('.view-option');
    viewOptions.forEach(option => {
        option.addEventListener('click', function() {
            viewOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 添加全屏按钮功能
    document.querySelector('.graph-sidebar-item[title="全屏"]').addEventListener('click', function() {
        const chartSection = document.getElementById('industry-chain-section');
        if (!document.fullscreenElement) {
            if (chartSection.requestFullscreen) {
                chartSection.requestFullscreen();
            } else if (chartSection.webkitRequestFullscreen) { /* Safari */
                chartSection.webkitRequestFullscreen();
            } else if (chartSection.msRequestFullscreen) { /* IE11 */
                chartSection.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    });
});

function renderGraph(nodes, parentElement) {
    const mainColumnsData = {
        "上游": [],
        "中游": [],
        "下游": []
    };

    // Group top-level nodes by their NodeNumDesc
    nodes.forEach(node => {
        if (node.NodeNumDesc && mainColumnsData[node.NodeNumDesc]) {
            mainColumnsData[node.NodeNumDesc].push(node);
        } else {
            // Fallback or error handling if NodeNumDesc is unexpected
            console.warn("Node with unexpected NodeNumDesc:", node.NodeNumDesc, node);
        }
    });
    
    const columnOrder = ["上游", "中游", "下游"];
    columnOrder.forEach((columnName, index) => {
        if (mainColumnsData[columnName].length > 0) {
            const columnDiv = createColumn(columnName);
            mainColumnsData[columnName].forEach(node => {
                // NodeLevel 1 items are the main blocks within a column
                const nodeElement = createNodeElement(node);
                columnDiv.appendChild(nodeElement);
                

            });
            parentElement.appendChild(columnDiv);
        }
        // Add arrow if not the last column
        if (index < columnOrder.length - 1 && mainColumnsData[columnOrder[index+1]].length > 0) {
            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            arrow.innerHTML = '&#x2192';
            parentElement.appendChild(arrow);
        }
    });
}

function createColumn(title) {
    const columnDiv = document.createElement('div');
    let columnClass = '';
    if (title === '上游') columnClass = 'upstream-column';
    else if (title === '中游') columnClass = 'midstream-column';
    else if (title === '下游') columnClass = 'downstream-column';
    
    columnDiv.className = `industry-column ${columnClass}`;

    const titleContainer = document.createElement('div');
    titleContainer.className = 'column-title-container';
    const titleEl = document.createElement('span');
    titleEl.className = 'column-title';
    titleEl.textContent = title;
    titleContainer.appendChild(titleEl);
    columnDiv.appendChild(titleContainer);
    
    return columnDiv;
}

function createNodeElement(nodeData) {
    const nodeElement = document.createElement('div');
    nodeElement.className = `node-level-${nodeData.NodeLevel}`;
    
    // 如果是顶级分类节点（上游/中游/下游），不显示文本
    if (nodeData.NodeNumDesc && ["上游", "中游", "下游"].includes(nodeData.NodeNumDesc)) {
        // 不设置文本内容
    } else {
        // 为非顶级节点创建标题元素
        const titleElement = document.createElement('div');
        titleElement.className = 'node-title';
        titleElement.textContent = nodeData.NodeName;
        nodeElement.appendChild(titleElement);
    }

    // 特殊处理：如果是 node-level2 且没有子节点，创建一个同名的 node-level3 子节点
    let childrenToProcess = nodeData.Children;
    if (nodeData.NodeLevel === 2 && (!nodeData.Children || nodeData.Children.length === 0)) {
        // 创建一个模拟的 node-level3 子节点
        const simulatedChild = {
            NodeName: nodeData.NodeName,
            NodeLevel: 3,
            Children: []
        };
        childrenToProcess = [simulatedChild];
    }

    if (childrenToProcess && childrenToProcess.length > 0) {
        // 对于第一级和第二级节点，使用多列布局
        if (nodeData.NodeLevel === 1 || nodeData.NodeLevel === 2) {
            // 递归计算所有子孙节点的总数量
            const childCount = countAllDescendantsFromChildren(childrenToProcess);
            
            // 计算需要的列数（每列最多20个节点）
            const MAX_NODES_PER_COLUMN = 20;
            const requiredColumns = distributeNodesPerColumn(childCount, MAX_NODES_PER_COLUMN);
            
            // 根据节点级别设置不同的最大列数
            let maxColumns = nodeData.NodeLevel === 1 ? 4 : 3; // Level 1最多4列，Level 2最多3列
            
            // 根据屏幕宽度进一步限制列数
            const screenWidth = window.innerWidth;
            if (screenWidth < 1200) {
                maxColumns = Math.min(maxColumns, 2);
            } else if (screenWidth < 1600) {
                maxColumns = Math.min(maxColumns, 3);
            }
            
            const actualColumns = Math.min(requiredColumns, maxColumns);
            
            // 创建多列容器（外层容器）
            const columnsContainer = document.createElement('div');
            columnsContainer.className = 'multi-columns-wrapper';
            // 添加列数信息供CSS使用
            columnsContainer.setAttribute('data-columns', actualColumns);
            columnsContainer.classList.add(`columns-${actualColumns}`);
            nodeElement.appendChild(columnsContainer);
            
            // 将子节点分组，每组不超过MAX_NODES_PER_COLUMN个节点
            const columns = [];
            for (let i = 0; i < actualColumns; i++) {
                columns.push([]);
            }
            
            // 计算每个子节点及其子孙节点的数量，用于分配列
            let childrenWithCounts = childrenToProcess.map(child => {
                const count = countAllDescendants(child) + 1; // +1 表示节点自身
                return { node: child, count: count };
            });
            
            // 贪心算法，将节点分配到各列，尽量保持每列总节点数接近
            let columnCounts = new Array(actualColumns).fill(0);
            
            // 从大到小排序，优先分配大节点
            childrenWithCounts.sort((a, b) => b.count - a.count);
            
            // 分配节点到列
            childrenWithCounts.forEach(item => {
                // 找出当前节点数最少的列
                const minColumnIndex = columnCounts.indexOf(Math.min(...columnCounts));
                columns[minColumnIndex].push(item.node);
                columnCounts[minColumnIndex] += item.count;
                console.log(`分配节点 ${item.node.NodeName}(${item.count}个) 到第${minColumnIndex+1}列，当前该列共${columnCounts[minColumnIndex]}个节点`);
            });
            
            // 为每列创建容器并添加节点
            for (let i = 0; i < actualColumns; i++) {
                if (columns[i].length > 0) {
                    const columnDiv = document.createElement('div');
                    columnDiv.className = `node-level-${nodeData.NodeLevel}-column column-${i+1}`;
                    
                    // 为该列的每个子节点创建元素
                    columns[i].forEach(childNode => {
                        const childElement = createNodeElement(childNode);
                        columnDiv.appendChild(childElement);
                    });
                    
                    // 添加列到容器
                    columnsContainer.appendChild(columnDiv);
                }
            }
            
            // 为节点添加列数标识类，供CSS控制宽度
            if (actualColumns > 1) {
                nodeElement.classList.add(`has-${actualColumns}-columns`);
                
                // 如果是Level 2，还需要向上传播宽度需求
                if (nodeData.NodeLevel === 2) {
                    // 查找父级Level 1节点，标记其包含多列Level 2
                    const parentLevel1 = nodeElement.closest('.node-level-1');
                    if (parentLevel1) {
                        parentLevel1.classList.add('contains-wide-level2');
                    }
                }
            }
            
            console.log(`Level ${nodeData.NodeLevel} 节点 "${nodeData.NodeName}": 屏幕宽度=${screenWidth}px, 最大列数=${maxColumns}, 实际列数=${actualColumns}`);
            
            return nodeElement;
        } else {
            // 对于三级及以下节点，使用原来的逻辑
            const childrenContainer = document.createElement('div');
            childrenContainer.className = `node-level-${nodeData.NodeLevel}-items-container`;
            
            childrenToProcess.forEach(childNode => {
                const childElement = createNodeElement(childNode);
                childrenContainer.appendChild(childElement);
            });
            nodeElement.appendChild(childrenContainer);
        }
    }
    return nodeElement;
}

// 递归计算节点及其所有子孙节点的总数量
function countAllDescendants(node) {
    if (!node.Children || node.Children.length === 0) {
        return 0;
    }
    
    let count = node.Children.length; // 直接子节点数量
    
    // 递归计算每个子节点的子孙节点数量
    for (const child of node.Children) {
        count += countAllDescendants(child);
    }
    
    return count;
}

// 计算子节点数组中所有节点及其子孙节点的总数量
function countAllDescendantsFromChildren(children) {
    if (!children || children.length === 0) {
        return 0;
    }
    
    let count = children.length; // 直接子节点数量
    
    // 递归计算每个子节点的子孙节点数量
    for (const child of children) {
        count += countAllDescendants(child);
    }
    
    return count;
}

// 计算每列应包含的节点数并返回分配方案
function distributeNodesPerColumn(totalNodes, maxNodesPerColumn) {
    const requiredColumns = Math.ceil(totalNodes / maxNodesPerColumn);
    console.log(`总节点数: ${totalNodes}, 每列最大节点数: ${maxNodesPerColumn}, 需要列数: ${requiredColumns}`);
    return requiredColumns;
} 