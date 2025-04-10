// 移动端菜单切换
document.addEventListener('DOMContentLoaded', function() {
    // 移动端菜单切换
    const menuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // 初始化所有ECharts图表
    const chartElements = document.querySelectorAll('[data-chart]');
    chartElements.forEach(function(element) {
        const chartType = element.getAttribute('data-chart');
        const chartId = element.id;
        
        if (chartId && window.echarts) {
            const chart = echarts.init(document.getElementById(chartId));
            
            // 根据图表类型加载不同的配置
            let option = {};
            
            if (chartType === 'map') {
                option = getMapChartOption();
            } else if (chartType === 'tree') {
                option = getTreeChartOption();
            } else if (chartType === 'bar') {
                option = getBarChartOption();
            } else if (chartType === 'pie') {
                option = getPieChartOption();
            }
            
            chart.setOption(option);
            
            // 响应式调整
            window.addEventListener('resize', function() {
                chart.resize();
            });
        }
    });
    
    // 行业切换按钮事件
    const industryButtons = document.querySelectorAll('.industry-btn');
    industryButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            // 移除其他按钮的active类
            industryButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            // 添加当前按钮的active类
            this.classList.add('active');
            
            // 获取行业数据并更新图表
            const industry = this.getAttribute('data-industry');
            updateIndustryChart(industry);
        });
    });
});

// 地图图表配置
function getMapChartOption() {
    return {
        tooltip: {
            trigger: 'item',
            formatter: '{b}<br/>企业数量：{c}'
        },
        visualMap: {
            min: 0,
            max: 200,
            text: ['高', '低'],
            realtime: false,
            calculable: true,
            inRange: {
                color: ['#132144', '#1a2a5a', '#2a3a6a', '#3a4a7a', '#4a5a8a']
            }
        },
        series: [{
            name: '企业分布',
            type: 'map',
            map: 'china',
            roam: true,
            emphasis: {
                label: {
                    show: true
                }
            },
            data: [
                {name: '北京', value: 150},
                {name: '上海', value: 120},
                {name: '广东', value: 180},
                {name: '江苏', value: 100},
                {name: '浙江', value: 90}
            ]
        }]
    };
}

// 树形图表配置
function getTreeChartOption() {
    return {
        tooltip: {
            trigger: 'item',
            formatter: '{b}'
        },
        series: [{
            type: 'tree',
            data: [{
                name: '人工智能',
                children: [
                    {
                        name: '基础层',
                        children: [
                            { name: '芯片' },
                            { name: '算法' },
                            { name: '数据' }
                        ]
                    },
                    {
                        name: '技术层',
                        children: [
                            { name: '机器学习' },
                            { name: '深度学习' },
                            { name: '计算机视觉' }
                        ]
                    },
                    {
                        name: '应用层',
                        children: [
                            { name: '智能机器人' },
                            { name: '自动驾驶' },
                            { name: '智慧医疗' }
                        ]
                    }
                ]
            }],
            top: '5%',
            left: '7%',
            bottom: '5%',
            right: '7%',
            symbolSize: 10,
            label: {
                position: 'left',
                verticalAlign: 'middle',
                align: 'right',
                fontSize: 12,
                color: '#fff'
            },
            leaves: {
                label: {
                    position: 'right',
                    verticalAlign: 'middle',
                    align: 'left'
                }
            },
            emphasis: {
                focus: 'descendant'
            },
            expandAndCollapse: true,
            animationDuration: 550,
            animationDurationUpdate: 750,
            initialTreeDepth: 2
        }]
    };
}

// 柱状图表配置
function getBarChartOption() {
    return {
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
            axisLabel: {
                color: '#fff'
            }
        },
        yAxis: {
            type: 'category',
            data: ['北京', '上海', '广东', '江苏', '浙江'],
            axisLabel: {
                color: '#fff'
            }
        },
        series: [{
            name: '企业数量',
            type: 'bar',
            data: [150, 120, 180, 100, 90],
            itemStyle: {
                color: '#4a5a8a'
            }
        }]
    };
}

// 饼图表配置
function getPieChartOption() {
    return {
        tooltip: {
            trigger: 'item'
        },
        legend: {
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: {
                color: '#fff'
            }
        },
        series: [{
            name: '行业分布',
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
                    fontSize: '20',
                    fontWeight: 'bold'
                }
            },
            labelLine: {
                show: false
            },
            data: [
                { value: 235, name: '人工智能' },
                { value: 274, name: '生物科技' },
                { value: 310, name: '新能源' },
                { value: 335, name: '半导体' },
                { value: 400, name: '机器人' }
            ]
        }]
    };
}

// 更新行业图表
function updateIndustryChart(industry) {
    // 这里可以根据选择的行业加载不同的数据
    // 实际应用中，这里应该是一个AJAX请求，从服务器获取数据
    console.log('更新行业图表:', industry);
    
    // 示例：根据行业更新树形图
    const chartDom = document.getElementById('industry-chart');
    if (chartDom) {
        const myChart = echarts.init(chartDom);
        
        // 根据行业获取不同的数据
        let treeData = {};
        
        if (industry === 'ai') {
            treeData = {
                name: '人工智能',
                children: [
                    {
                        name: '基础层',
                        children: [
                            { name: '芯片' },
                            { name: '算法' },
                            { name: '数据' }
                        ]
                    },
                    {
                        name: '技术层',
                        children: [
                            { name: '机器学习' },
                            { name: '深度学习' },
                            { name: '计算机视觉' }
                        ]
                    },
                    {
                        name: '应用层',
                        children: [
                            { name: '智能机器人' },
                            { name: '自动驾驶' },
                            { name: '智慧医疗' }
                        ]
                    }
                ]
            };
        } else if (industry === 'biotech') {
            treeData = {
                name: '生物科技',
                children: [
                    {
                        name: '基础研究',
                        children: [
                            { name: '基因组学' },
                            { name: '蛋白质组学' },
                            { name: '代谢组学' }
                        ]
                    },
                    {
                        name: '技术应用',
                        children: [
                            { name: '基因治疗' },
                            { name: '细胞治疗' },
                            { name: '免疫治疗' }
                        ]
                    },
                    {
                        name: '产品开发',
                        children: [
                            { name: '诊断试剂' },
                            { name: '治疗药物' },
                            { name: '医疗器械' }
                        ]
                    }
                ]
            };
        } else {
            // 默认数据
            treeData = {
                name: '行业产业链',
                children: [
                    { name: '上游' },
                    { name: '中游' },
                    { name: '下游' }
                ]
            };
        }
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}'
            },
            series: [{
                type: 'tree',
                data: [treeData],
                top: '5%',
                left: '7%',
                bottom: '5%',
                right: '7%',
                symbolSize: 10,
                label: {
                    position: 'left',
                    verticalAlign: 'middle',
                    align: 'right',
                    fontSize: 12,
                    color: '#fff'
                },
                leaves: {
                    label: {
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left'
                    }
                },
                emphasis: {
                    focus: 'descendant'
                },
                expandAndCollapse: true,
                animationDuration: 550,
                animationDurationUpdate: 750,
                initialTreeDepth: 2
            }]
        };
        
        myChart.setOption(option);
    }
}

// 全局变量
let isOverlayOpenGlobal = false;

// 导航栏滚动效果
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('nav');
    if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});

// 页面滚动锁定/解锁功能
function lockScroll() {
    if (!document.body.classList.contains('overflow-hidden')) {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.classList.add('overflow-hidden');
    }
}

function unlockScroll() {
    if (document.body.classList.contains('overflow-hidden')) {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.classList.remove('overflow-hidden');
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
}

// 暴露给其他模块使用
window.appUtils = {
    isOverlayOpen: () => isOverlayOpenGlobal,
    setOverlayOpen: (isOpen) => {
        isOverlayOpenGlobal = isOpen;
        if (isOpen) {
            lockScroll();
        } else {
            unlockScroll();
        }
    }
};

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
}); 