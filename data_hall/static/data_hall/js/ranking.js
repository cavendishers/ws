// 当前分页状态
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;
let selectedIndustry = '';

// 初始化页面数据
document.addEventListener('DOMContentLoaded', function() {
  // 加载企业排名数据
  loadRankingData(currentPage);
  
  // 绑定导出数据按钮事件
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportRankingData);
  } else {
    console.error('未找到导出按钮');
  }
});

// 加载企业排名数据
function loadRankingData(page = 1, industry = '') {
  currentPage = page;
  selectedIndustry = industry;
  
  // 显示加载状态
  showLoadingState();
  
  // 构建API请求URL
  const url = `/api/company-rankings/?page=${page}&page_size=${pageSize}${industry ? '&industry=' + encodeURIComponent(industry) : ''}`;
  
  // 尝试从API获取数据
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('网络错误，无法获取数据');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.rankings && data.rankings.length > 0) {
        // 更新分页信息
        totalPages = data.total_pages || 1;
        currentPage = data.current_page || 1;
        
        // 渲染表格和分页控件
        renderRankingTable(data.rankings);
        renderPagination(currentPage, totalPages);
      } else {
        // 如果API返回空数据，使用本地示例数据
        console.log('使用本地示例数据');
        const mockData = getMockRankingData();
        renderRankingTable(mockData);
        
        // 模拟分页，假设有5页数据
        totalPages = 5;
        renderPagination(currentPage, totalPages);
      }
      
      // 隐藏加载状态
      hideLoadingState();
    })
    .catch(err => {
      console.error('获取榜单数据出错:', err);
      // 若接口不可用，使用本地示例数据
      const mockData = getMockRankingData();
      renderRankingTable(mockData);
      
      // 模拟分页，假设有5页数据
      totalPages = 5;
      renderPagination(currentPage, totalPages);
      
      // 隐藏加载状态
      hideLoadingState();
    });
}

// 显示加载状态
function showLoadingState() {
  const tbody = document.getElementById('rankingTbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">加载中...</td></tr>';
  }
}

// 隐藏加载状态
function hideLoadingState() {
  // 可以添加其他的加载完成后的操作
}

// 渲染排名表格
function renderRankingTable(dataArray) {
  const tbody = document.getElementById('rankingTbody');
  tbody.innerHTML = '';
  
  if (dataArray.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">暂无数据</td></tr>';
    return;
  }
  
  dataArray.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#1A2B5E]';
    
    // 使用模板字符串构建表格行内容
    tr.innerHTML = `
      <td class="px-4 py-3 text-[var(--secondary)]">${item.rank}</td>
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

// 渲染分页控件
function renderPagination(currentPage, totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    // 如果只有一页，不显示分页控件
    return;
  }
  
  // 创建分页容器
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'flex justify-center items-center mt-6 space-x-2';
  
  // 添加上一页按钮
  const prevButton = document.createElement('button');
  prevButton.className = `px-3 py-1 rounded ${currentPage === 1 ? 'bg-[#1A2B5E] text-gray-500 cursor-not-allowed' : 'bg-[var(--primary)] hover:bg-[#1A2B5E] text-white'}`;
  prevButton.innerHTML = '&laquo; 上一页';
  
  if (currentPage > 1) {
    prevButton.addEventListener('click', () => loadRankingData(currentPage - 1, selectedIndustry));
  }
  
  paginationDiv.appendChild(prevButton);
  
  // 添加页码按钮
  const maxVisiblePages = 5; // 最多显示的页码数
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // 调整起始页，确保显示指定数量的页码
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // 添加第一页和省略号
  if (startPage > 1) {
    const firstPageBtn = document.createElement('button');
    firstPageBtn.className = 'px-3 py-1 rounded bg-[var(--primary)] hover:bg-[#1A2B5E] text-white';
    firstPageBtn.textContent = '1';
    firstPageBtn.addEventListener('click', () => loadRankingData(1, selectedIndustry));
    paginationDiv.appendChild(firstPageBtn);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'px-3 py-1 text-white';
      ellipsis.textContent = '...';
      paginationDiv.appendChild(ellipsis);
    }
  }
  
  // 添加页码按钮
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-[#00C1D4] text-white' : 'bg-[var(--primary)] hover:bg-[#1A2B5E] text-white'}`;
    pageBtn.textContent = i.toString();
    
    if (i !== currentPage) {
      pageBtn.addEventListener('click', () => loadRankingData(i, selectedIndustry));
    }
    
    paginationDiv.appendChild(pageBtn);
  }
  
  // 添加省略号和最后一页
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'px-3 py-1 text-white';
      ellipsis.textContent = '...';
      paginationDiv.appendChild(ellipsis);
    }
    
    const lastPageBtn = document.createElement('button');
    lastPageBtn.className = 'px-3 py-1 rounded bg-[var(--primary)] hover:bg-[#1A2B5E] text-white';
    lastPageBtn.textContent = totalPages.toString();
    lastPageBtn.addEventListener('click', () => loadRankingData(totalPages, selectedIndustry));
    paginationDiv.appendChild(lastPageBtn);
  }
  
  // 添加下一页按钮
  const nextButton = document.createElement('button');
  nextButton.className = `px-3 py-1 rounded ${currentPage === totalPages ? 'bg-[#1A2B5E] text-gray-500 cursor-not-allowed' : 'bg-[var(--primary)] hover:bg-[#1A2B5E] text-white'}`;
  nextButton.innerHTML = '下一页 &raquo;';
  
  if (currentPage < totalPages) {
    nextButton.addEventListener('click', () => loadRankingData(currentPage + 1, selectedIndustry));
  }
  
  paginationDiv.appendChild(nextButton);
  
  // 添加到容器
  paginationContainer.appendChild(paginationDiv);
  
  // 显示当前页信息
  const pageInfo = document.createElement('div');
  pageInfo.className = 'text-center text-sm text-gray-400 mt-2';
  pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
  paginationContainer.appendChild(pageInfo);
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
    { rank: 1, name: '字节跳动', devPotential: 95, expansionSpeed: 90, innovation: 92, capitalAttention: 88, teamBackground: 94, comprehensiveScore: 92 },
    { rank: 2, name: 'SpaceX', devPotential: 93, expansionSpeed: 95, innovation: 90, capitalAttention: 96, teamBackground: 89, comprehensiveScore: 93 },
    { rank: 3, name: 'OpenAI', devPotential: 92, expansionSpeed: 88, innovation: 98, capitalAttention: 85, teamBackground: 90, comprehensiveScore: 91 },
    { rank: 4, name: 'Shein', devPotential: 88, expansionSpeed: 90, innovation: 80, capitalAttention: 87, teamBackground: 85, comprehensiveScore: 86 },
    { rank: 5, name: 'Databricks', devPotential: 85, expansionSpeed: 82, innovation: 88, capitalAttention: 90, teamBackground: 84, comprehensiveScore: 86 },
    { rank: 6, name: 'Tesla', devPotential: 97, expansionSpeed: 95, innovation: 95, capitalAttention: 93, teamBackground: 96, comprehensiveScore: 95 },
    { rank: 7, name: '阿里巴巴', devPotential: 94, expansionSpeed: 90, innovation: 89, capitalAttention: 92, teamBackground: 90, comprehensiveScore: 91 },
    { rank: 8, name: '腾讯', devPotential: 96, expansionSpeed: 94, innovation: 93, capitalAttention: 90, teamBackground: 92, comprehensiveScore: 93 },
    { rank: 9, name: '华为', devPotential: 92, expansionSpeed: 93, innovation: 90, capitalAttention: 91, teamBackground: 90, comprehensiveScore: 91 },
    { rank: 10, name: '大疆', devPotential: 90, expansionSpeed: 88, innovation: 87, capitalAttention: 85, teamBackground: 86, comprehensiveScore: 87 },
    { rank: 11, name: '小米', devPotential: 88, expansionSpeed: 85, innovation: 83, capitalAttention: 82, teamBackground: 84, comprehensiveScore: 84 },
    { rank: 12, name: '百度', devPotential: 91, expansionSpeed: 88, innovation: 90, capitalAttention: 87, teamBackground: 88, comprehensiveScore: 89 },
    { rank: 13, name: '京东', devPotential: 86, expansionSpeed: 84, innovation: 82, capitalAttention: 80, teamBackground: 83, comprehensiveScore: 83 },
    { rank: 14, name: '美团', devPotential: 89, expansionSpeed: 90, innovation: 88, capitalAttention: 85, teamBackground: 87, comprehensiveScore: 88 },
    { rank: 15, name: '拼多多', devPotential: 87, expansionSpeed: 83, innovation: 85, capitalAttention: 82, teamBackground: 84, comprehensiveScore: 84 },
    { rank: 16, name: '快手', devPotential: 90, expansionSpeed: 87, innovation: 85, capitalAttention: 83, teamBackground: 86, comprehensiveScore: 86 },
    { rank: 17, name: '中芯国际', devPotential: 80, expansionSpeed: 78, innovation: 75, capitalAttention: 70, teamBackground: 77, comprehensiveScore: 76 },
    { rank: 18, name: '海康威视', devPotential: 85, expansionSpeed: 82, innovation: 80, capitalAttention: 83, teamBackground: 81, comprehensiveScore: 82 },
    { rank: 19, name: '中兴', devPotential: 84, expansionSpeed: 80, innovation: 82, capitalAttention: 79, teamBackground: 80, comprehensiveScore: 81 },
    { rank: 20, name: '联想', devPotential: 83, expansionSpeed: 81, innovation: 80, capitalAttention: 78, teamBackground: 80, comprehensiveScore: 80 }
  ];
} 