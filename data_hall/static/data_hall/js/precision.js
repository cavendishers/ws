let precisionData = [];

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  loadPrecisionData();
});

// 加载精准招商数据
function loadPrecisionData() {
  // 尝试从后端API获取数据
  fetch('/api/precisionList.json')
    .then(res => res.json())
    .then(data => {
      // 计算综合得分并排序
      data.forEach(item => {
        // 计算平均分作为综合得分
        item.combinedScore = (item.marketFit + item.supplyChainFit + item.networkFit + item.resourceFit) / 4;
      });

      // 按照综合得分降序排序
      data.sort((a, b) => b.combinedScore - a.combinedScore);
      
      // 保存数据并渲染
      precisionData = data;
      renderTable(data);
    })
    .catch(err => {
      console.error('获取精准招商数据出错:', err);
      // 如果接口不可用，使用本地示例数据
      const mock = getMockData();
      mock.forEach(item => {
        item.combinedScore = (item.marketFit + item.supplyChainFit + item.networkFit + item.resourceFit) / 4;
      });
      mock.sort((a, b) => b.combinedScore - a.combinedScore);
      
      // 保存数据并渲染
      precisionData = mock;
      renderTable(mock);
    });
}

// 渲染表格
function renderTable(dataArr) {
  const tbody = document.getElementById('precisionTbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  dataArr.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#1A2B5E]';
    tr.innerHTML = `
      <td class="px-4 py-3">${item.name}</td>
      <td class="px-4 py-3">${item.industry}</td>
      <td class="px-4 py-3">${item.subTrack}</td>
      <td class="px-4 py-3">${item.regYear}</td>
      <td class="px-4 py-3">${item.financing}</td>
      <td class="px-4 py-3">${renderStarRating(item.marketFit)}</td>
      <td class="px-4 py-3">${renderStarRating(item.supplyChainFit)}</td>
      <td class="px-4 py-3">${renderStarRating(item.networkFit)}</td>
      <td class="px-4 py-3">${renderStarRating(item.resourceFit)}</td>
      <td class="px-4 py-3 font-bold">${renderStarRating(item.combinedScore)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 将评分(1-5)渲染为星星，使用较弱的金色 (#E6C200)
function renderStarRating(score) {
  const maxStars = 5;
  let fullStars = Math.floor(score);  // 获取整数部分
  let halfStar = (score % 1) >= 0.5 ? 1 : 0;  // 判断是否为半颗星
  let stars = '';

  // 绘制满星
  for (let i = 0; i < fullStars; i++) {
    stars += `<i class="fas fa-star" style="color: #E6C200;"></i>`;
  }

  // 绘制半颗星
  if (halfStar === 1) {
    stars += `<i class="fas fa-star-half-alt" style="color: #E6C200;"></i>`;
  }

  // 绘制空星
  for (let i = fullStars + halfStar; i < maxStars; i++) {
    stars += `<i class="far fa-star" style="color: #E6C200;"></i>`;
  }

  return stars;
}

// 示例数据
function getMockData() {
  return [
    {
      name: '深度求索科技',
      industry: '人工智能',
      subTrack: '计算机视觉',
      regYear: 2018,
      financing: 'A轮',
      marketFit: 4.5,
      supplyChainFit: 3.25,
      networkFit: 5,
      resourceFit: 4.5
    },
    {
      name: '华能光电',
      industry: '半导体',
      subTrack: '芯片设计',
      regYear: 2016,
      financing: 'B轮',
      marketFit: 5,
      supplyChainFit: 4,
      networkFit: 4.5,
      resourceFit: 5
    },
    {
      name: '未来能源',
      industry: '新能源',
      subTrack: '动力电池',
      regYear: 2017,
      financing: 'C轮',
      marketFit: 5,
      supplyChainFit: 5,
      networkFit: 4.25,
      resourceFit: 5
    },
    {
      name: '瑞康生物',
      industry: '生物医药',
      subTrack: '疫苗研发',
      regYear: 2015,
      financing: '天使轮',
      marketFit: 3,
      supplyChainFit: 3.5,
      networkFit: 5,
      resourceFit: 4
    },
    {
      name: '智云软件',
      industry: '人工智能',
      subTrack: '自然语言处理',
      regYear: 2019,
      financing: 'Pre-A轮',
      marketFit: 4,
      supplyChainFit: 3,
      networkFit: 4.5,
      resourceFit: 3.5
    },
    {
      name: '量子信息',
      industry: '量子科技',
      subTrack: '量子计算',
      regYear: 2020,
      financing: 'A轮',
      marketFit: 4.8,
      supplyChainFit: 3.8,
      networkFit: 4.2,
      resourceFit: 4.5
    }
  ];
} 