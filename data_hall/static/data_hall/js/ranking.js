// 初始化页面数据
document.addEventListener('DOMContentLoaded', function() {
  // 加载企业排名数据
  loadRankingData();
  
  // 绑定导出数据按钮事件
  const exportBtn = document.querySelector('.bg-[var(--button-highlight)]');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportRankingData);
  }
});

// 加载企业排名数据
function loadRankingData() {
  // 尝试从API获取数据
  fetch('/api/company-rankings/')
    .then(response => {
      if (!response.ok) {
        throw new Error('网络错误，无法获取数据');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.rankings && data.rankings.length > 0) {
        renderRankingTable(data.rankings);
      } else {
        // 如果API返回空数据，使用本地示例数据
        console.log('使用本地示例数据');
        const mockData = getMockRankingData();
        renderRankingTable(mockData);
      }
    })
    .catch(err => {
      console.error('获取榜单数据出错:', err);
      // 若接口不可用，使用本地示例数据
      const mockData = getMockRankingData();
      renderRankingTable(mockData);
    });
}

// 渲染排名表格
function renderRankingTable(dataArray) {
  const tbody = document.getElementById('rankingTbody');
  tbody.innerHTML = '';
  dataArray.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#1A2B5E]';
    
    // 使用模板字符串构建表格行内容
    tr.innerHTML = `
      <td class="px-4 py-3 text-[var(--secondary)]">${item.rank || index + 1}</td>
      <td class="px-4 py-3">${item.name}</td>
      <td class="px-4 py-3">${item.devPotential}</td>
      <td class="px-4 py-3">${item.expansionSpeed}</td>
      <td class="px-4 py-3">${item.innovation}</td>
      <td class="px-4 py-3">${item.capitalAttention}</td>
      <td class="px-4 py-3">${item.teamBackground}</td>
      <td class="px-4 py-3 text-yellow-400 font-bold">${item.comprehensiveScore || calculateScore(item)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 计算综合得分
function calculateScore(item) {
  return Math.round((
    item.devPotential + 
    item.expansionSpeed + 
    item.innovation + 
    item.capitalAttention + 
    item.teamBackground
  ) / 5);
}

// 导出数据为CSV
function exportRankingData() {
  const table = document.querySelector('table');
  if (!table) return;
  
  // 提取表头
  const headers = Array.from(table.querySelectorAll('thead th'))
    .map(th => th.textContent.trim());
    
  // 提取表格数据
  const rows = Array.from(table.querySelectorAll('tbody tr'))
    .map(row => Array.from(row.querySelectorAll('td'))
      .map(cell => cell.textContent.trim()));
      
  // 构建CSV内容
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '新势力企业排名.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 本地示例数据（20条左右）
function getMockRankingData() {
  return [
    { name: '字节跳动', devPotential: 95, expansionSpeed: 90, innovation: 92, capitalAttention: 88, teamBackground: 94, comprehensiveScore: 92 },
    { name: 'SpaceX', devPotential: 93, expansionSpeed: 95, innovation: 90, capitalAttention: 96, teamBackground: 89, comprehensiveScore: 93 },
    { name: 'OpenAI', devPotential: 92, expansionSpeed: 88, innovation: 98, capitalAttention: 85, teamBackground: 90, comprehensiveScore: 91 },
    { name: 'Shein', devPotential: 88, expansionSpeed: 90, innovation: 80, capitalAttention: 87, teamBackground: 85, comprehensiveScore: 86 },
    { name: 'Databricks', devPotential: 85, expansionSpeed: 82, innovation: 88, capitalAttention: 90, teamBackground: 84, comprehensiveScore: 86 },
    { name: 'Tesla', devPotential: 97, expansionSpeed: 95, innovation: 95, capitalAttention: 93, teamBackground: 96, comprehensiveScore: 95 },
    { name: '阿里巴巴', devPotential: 94, expansionSpeed: 90, innovation: 89, capitalAttention: 92, teamBackground: 90, comprehensiveScore: 91 },
    { name: '腾讯', devPotential: 96, expansionSpeed: 94, innovation: 93, capitalAttention: 90, teamBackground: 92, comprehensiveScore: 93 },
    { name: '华为', devPotential: 92, expansionSpeed: 93, innovation: 90, capitalAttention: 91, teamBackground: 90, comprehensiveScore: 91 },
    { name: '大疆', devPotential: 90, expansionSpeed: 88, innovation: 87, capitalAttention: 85, teamBackground: 86, comprehensiveScore: 87 },
    { name: '小米', devPotential: 88, expansionSpeed: 85, innovation: 83, capitalAttention: 82, teamBackground: 84, comprehensiveScore: 84 },
    { name: '百度', devPotential: 91, expansionSpeed: 88, innovation: 90, capitalAttention: 87, teamBackground: 88, comprehensiveScore: 89 },
    { name: '京东', devPotential: 86, expansionSpeed: 84, innovation: 82, capitalAttention: 80, teamBackground: 83, comprehensiveScore: 83 },
    { name: '美团', devPotential: 89, expansionSpeed: 90, innovation: 88, capitalAttention: 85, teamBackground: 87, comprehensiveScore: 88 },
    { name: '拼多多', devPotential: 87, expansionSpeed: 83, innovation: 85, capitalAttention: 82, teamBackground: 84, comprehensiveScore: 84 },
    { name: '快手', devPotential: 90, expansionSpeed: 87, innovation: 85, capitalAttention: 83, teamBackground: 86, comprehensiveScore: 86 },
    { name: '中芯国际', devPotential: 80, expansionSpeed: 78, innovation: 75, capitalAttention: 70, teamBackground: 77, comprehensiveScore: 76 },
    { name: '海康威视', devPotential: 85, expansionSpeed: 82, innovation: 80, capitalAttention: 83, teamBackground: 81, comprehensiveScore: 82 },
    { name: '中兴', devPotential: 84, expansionSpeed: 80, innovation: 82, capitalAttention: 79, teamBackground: 80, comprehensiveScore: 81 },
    { name: '联想', devPotential: 83, expansionSpeed: 81, innovation: 80, capitalAttention: 78, teamBackground: 80, comprehensiveScore: 80 }
  ];
} 