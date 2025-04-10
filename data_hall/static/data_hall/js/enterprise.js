let enterpriseData = [];

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  loadEnterpriseData();

  // 搜索功能绑定事件
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const keyword = searchInput.value.trim();
      if (!keyword) {
        renderTable(enterpriseData);
        return;
      }
      const filtered = enterpriseData.filter(item =>
        item.name.includes(keyword)
      );
      renderTable(filtered);
    });

    // 回车搜索
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }
});

// 加载企业数据
function loadEnterpriseData() {
  // 尝试从后端API获取数据
  fetch('/api/enterpriseList.json')
    .then(response => response.json())
    .then(data => {
      enterpriseData = data; // 存储到全局变量
      renderTable(data);
      renderCharts(data);
    })
    .catch(err => {
      console.error('获取企业数据出错:', err);
      // 如出错，使用静态示例数据
      const mockData = getMockData();
      enterpriseData = mockData;
      renderTable(mockData);
      renderCharts(mockData);
    });
}

// 渲染表格
function renderTable(dataArray) {
  const tbody = document.getElementById('enterpriseTbody');
  if (!tbody) return;
  
  tbody.innerHTML = ''; // 清空

  dataArray.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#1A2B5E]';
    tr.innerHTML = `
      <td class="px-4 py-3">${item.name}</td>
      <td class="px-4 py-3">${item.province}</td>
      <td class="px-4 py-3">${item.city}</td>
      <td class="px-4 py-3">${item.industry}</td>
      <td class="px-4 py-3">${item.subTrack}</td>
      <td class="px-4 py-3">${item.regYear}</td>
      <td class="px-4 py-3">${item.financing}</td>
      <td class="px-4 py-3">${item.devPotential}</td>
      <td class="px-4 py-3">${item.expansionSpeed}</td>
      <td class="px-4 py-3">${item.innovation}</td>
      <td class="px-4 py-3">${item.capitalAttention}</td>
      <td class="px-4 py-3">${item.teamBackground}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 渲染图表
function renderCharts(dataArray) {
  // 行业分布: 统计 industry 频次
  const industryCount = {};
  dataArray.forEach(item => {
    industryCount[item.industry] = (industryCount[item.industry] || 0) + 1;
  });
  const industryData = Object.keys(industryCount).map(key => {
    return { name: key, value: industryCount[key] };
  });

  // 融资轮次分布
  const financingCount = {};
  dataArray.forEach(item => {
    financingCount[item.financing] = (financingCount[item.financing] || 0) + 1;
  });
  const financingData = Object.keys(financingCount).map(key => {
    return { name: key, value: financingCount[key] };
  });

  // 行业分布图 (环形)
  const industryDom = document.getElementById('industryChart');
  if (industryDom) {
    const industryChart = echarts.init(industryDom);
    const industryOption = {
      tooltip: { trigger: 'item' },
      legend: {
        top: '5%',
        textStyle: { color: '#ccc', fontSize: 12 }
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'], // 环形图
          center: ['50%', '55%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: industryData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.5)'
            }
          }
        }
      ]
    };
    industryChart.setOption(industryOption);
    
    // 窗口大小变化时自动调整图表大小
    window.addEventListener('resize', () => {
      industryChart.resize();
    });
  }

  // 融资轮次分布图 (环形)
  const financingDom = document.getElementById('financingChart');
  if (financingDom) {
    const financingChart = echarts.init(financingDom);
    const financingOption = {
      tooltip: { trigger: 'item' },
      legend: {
        top: '5%',
        textStyle: { color: '#ccc', fontSize: 12 }
      },
      series: [
        {
          name: '融资轮次',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: financingData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.5)'
            }
          }
        }
      ]
    };
    financingChart.setOption(financingOption);
    
    // 窗口大小变化时自动调整图表大小
    window.addEventListener('resize', () => {
      financingChart.resize();
    });
  }
}

// 示例数据
function getMockData() {
  return [
    {
      name: '深度求索科技',
      province: '广东',
      city: '深圳',
      industry: '人工智能',
      subTrack: '深度学习',
      regYear: 2018,
      financing: 'B轮',
      devPotential: 90,
      expansionSpeed: 85,
      innovation: 92,
      capitalAttention: 88,
      teamBackground: 90
    },
    {
      name: '华能光电',
      province: '江苏',
      city: '苏州',
      industry: '新能源',
      subTrack: '光伏',
      regYear: 2015,
      financing: 'C轮',
      devPotential: 88,
      expansionSpeed: 82,
      innovation: 80,
      capitalAttention: 85,
      teamBackground: 84
    },
    {
      name: '芯能半导体',
      province: '上海',
      city: '上海',
      industry: '半导体',
      subTrack: '芯片设计',
      regYear: 2016,
      financing: 'A轮',
      devPotential: 85,
      expansionSpeed: 80,
      innovation: 88,
      capitalAttention: 79,
      teamBackground: 82
    },
    {
      name: '智云生物',
      province: '北京',
      city: '北京',
      industry: '生物医药',
      subTrack: '基因检测',
      regYear: 2017,
      financing: '天使轮',
      devPotential: 83,
      expansionSpeed: 75,
      innovation: 90,
      capitalAttention: 78,
      teamBackground: 86
    },
    {
      name: '未来数据',
      province: '浙江',
      city: '杭州',
      industry: '人工智能',
      subTrack: '大数据分析',
      regYear: 2019,
      financing: 'Pre-A',
      devPotential: 87,
      expansionSpeed: 80,
      innovation: 85,
      capitalAttention: 81,
      teamBackground: 88
    },
    {
      name: '光源芯片',
      province: '浙江',
      city: '宁波',
      industry: '半导体',
      subTrack: '功率芯片',
      regYear: 2020,
      financing: '天使轮',
      devPotential: 82,
      expansionSpeed: 76,
      innovation: 84,
      capitalAttention: 77,
      teamBackground: 80
    },
    {
      name: '瑞康生物',
      province: '广东',
      city: '广州',
      industry: '生物医药',
      subTrack: '疫苗研发',
      regYear: 2012,
      financing: 'B轮',
      devPotential: 89,
      expansionSpeed: 84,
      innovation: 88,
      capitalAttention: 90,
      teamBackground: 87
    }
  ];
} 