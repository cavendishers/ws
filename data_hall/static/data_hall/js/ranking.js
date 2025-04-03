// 模拟从后端获取数据，实际项目中请替换为真实接口 fetch 地址
fetch('/api/rankingList.json')
  .then(res => res.json())
  .then(data => {
    renderRankingTable(data);
  })
  .catch(err => {
    console.error('获取榜单数据出错:', err);
    // 若接口不可用，使用本地示例数据
    const mockData = getMockRankingData();
    renderRankingTable(mockData);
  });

function renderRankingTable(dataArray) {
  const tbody = document.getElementById('rankingTbody');
  tbody.innerHTML = '';
  dataArray.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#1A2B5E]';
    tr.innerHTML = `
      <td class="px-4 py-3 text-[var(--secondary)]">${index + 1}</td>
      <td class="px-4 py-3">${item.name}</td>
      <td class="px-4 py-3">${item.devPotential}</td>
      <td class="px-4 py-3">${item.expansionSpeed}</td>
      <td class="px-4 py-3">${item.innovation}</td>
      <td class="px-4 py-3">${item.capitalAttention}</td>
      <td class="px-4 py-3">${item.teamBackground}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 本地示例数据（20条左右）
function getMockRankingData() {
  return [
    { name: '字节跳动', devPotential: 95, expansionSpeed: 90, innovation: 92, capitalAttention: 88, teamBackground: 94 },
    { name: 'SpaceX', devPotential: 93, expansionSpeed: 95, innovation: 90, capitalAttention: 96, teamBackground: 89 },
    { name: 'OpenAI', devPotential: 92, expansionSpeed: 88, innovation: 98, capitalAttention: 85, teamBackground: 90 },
    { name: 'Shein', devPotential: 88, expansionSpeed: 90, innovation: 80, capitalAttention: 87, teamBackground: 85 },
    { name: 'Databricks', devPotential: 85, expansionSpeed: 82, innovation: 88, capitalAttention: 90, teamBackground: 84 },
    { name: 'Tesla', devPotential: 97, expansionSpeed: 95, innovation: 95, capitalAttention: 93, teamBackground: 96 },
    { name: '阿里巴巴', devPotential: 94, expansionSpeed: 90, innovation: 89, capitalAttention: 92, teamBackground: 90 },
    { name: '腾讯', devPotential: 96, expansionSpeed: 94, innovation: 93, capitalAttention: 90, teamBackground: 92 },
    { name: '华为', devPotential: 92, expansionSpeed: 93, innovation: 90, capitalAttention: 91, teamBackground: 90 },
    { name: '大疆', devPotential: 90, expansionSpeed: 88, innovation: 87, capitalAttention: 85, teamBackground: 86 },
    { name: '小米', devPotential: 88, expansionSpeed: 85, innovation: 83, capitalAttention: 82, teamBackground: 84 },
    { name: '百度', devPotential: 91, expansionSpeed: 88, innovation: 90, capitalAttention: 87, teamBackground: 88 },
    { name: '京东', devPotential: 86, expansionSpeed: 84, innovation: 82, capitalAttention: 80, teamBackground: 83 },
    { name: '美团', devPotential: 89, expansionSpeed: 90, innovation: 88, capitalAttention: 85, teamBackground: 87 },
    { name: '拼多多', devPotential: 87, expansionSpeed: 83, innovation: 85, capitalAttention: 82, teamBackground: 84 },
    { name: '快手', devPotential: 90, expansionSpeed: 87, innovation: 85, capitalAttention: 83, teamBackground: 86 },
    { name: '中芯国际', devPotential: 80, expansionSpeed: 78, innovation: 75, capitalAttention: 70, teamBackground: 77 },
    { name: '海康威视', devPotential: 85, expansionSpeed: 82, innovation: 80, capitalAttention: 83, teamBackground: 81 },
    { name: '中兴', devPotential: 84, expansionSpeed: 80, innovation: 82, capitalAttention: 79, teamBackground: 80 },
    { name: '联想', devPotential: 83, expansionSpeed: 81, innovation: 80, capitalAttention: 78, teamBackground: 80 }
  ];
} 