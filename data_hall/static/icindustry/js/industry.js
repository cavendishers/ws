  // 静态模式：不再在浏览器读取 xlsx，以上游/中游/下游的静态 HTML 已写入页面

  // 一级链点标题样式和悬停效果
  document.addEventListener('DOMContentLoaded', function() {
    // 为所有一级链点标题添加悬停效果
    const groupTitles = document.querySelectorAll('.group-title');

    groupTitles.forEach(title => {
      // 为一级链点标题添加悬停效果
      title.addEventListener('mouseenter', function() {
        this.style.filter = 'brightness(1.05)';
      });

      title.addEventListener('mouseleave', function() {
        this.style.filter = 'brightness(1)';
      });
    });

    // 确保所有group-container都显示
    const groupContainers = document.querySelectorAll('.group-container');
    groupContainers.forEach(container => {
      container.style.display = 'flex';
    });
  });

  // 链点点击弹窗功能
  document.addEventListener('DOMContentLoaded', function() {
    // 为所有panel-item-name添加点击事件
    const panelItemNames = document.querySelectorAll('.panel-item-name');

    panelItemNames.forEach(itemName => {
      itemName.style.cursor = 'pointer';
      itemName.addEventListener('click', function() {
        const chainPointName = this.textContent.trim();
        openChainPointModal(chainPointName);
      });
    });
  });

  function openChainPointModal(chainPointName) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'chainPointModal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3>${chainPointName} - 企业详情</h3>
            <button class="modal-close" onclick="closeChainPointModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-layout">
              <!-- 左侧：龙头企业 -->
              <div class="modal-left">
                <div class="modal-section">
                  <div class="section-header">
                    <div class="section-title-with-search">
                      <h4>龙头企业</h4>
                      <div class="search-container">
                        <input type="text" id="leading-search-input" class="search-input" placeholder="检索企业">
                        <button class="search-btn" id="leading-search-btn">搜索</button>
                      </div>
                    </div>
                    <div class="stats-inline">
                      <span class="stat-badge leading">
                        <span class="stat-number-small" id="chainOwnerCount">12</span>
                        <span class="stat-label-small">链主</span>
                      </span>
                      <span class="stat-badge leading">
                        <span class="stat-number-small" id="listedCount">8</span>
                        <span class="stat-label-small">上市</span>
                      </span>
                      <span class="stat-badge leading">
                        <span class="stat-number-small" id="fortune500Count">3</span>
                        <span class="stat-label-small">500强</span>
                      </span>
                    </div>
                  </div>
                  <div class="table-container">
                    <table class="enterprise-table">
                      <thead>
                        <tr>
                          <th>企业全名</th>
                          <th>企业简称</th>
                          <th>所在地区</th>
                          <th>企业简介</th>
                        </tr>
                      </thead>
                      <tbody id="leadingEnterpriseTableBody">
                        <!-- 动态填充 -->
                      </tbody>
                    </table>
                    <div class="pagination" id="leadingPagination">
                      <!-- 动态生成分页 -->
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右侧：潜力企业 -->
              <div class="modal-right">
                <div class="modal-section">
                  <div class="section-header">
                    <div class="section-title-with-search">
                      <h4>潜力企业</h4>
                      <div class="search-container">
                        <input type="text" id="potential-search-input" class="search-input" placeholder="检索企业">
                        <button class="search-btn" id="potential-search-btn">搜索</button>
                      </div>
                    </div>
                    <div class="stats-inline">
                      <span class="stat-badge potential">
                        <span class="stat-number-small" id="potentialTotalCount">38</span>
                        <span class="stat-label-small">总计</span>
                      </span>
                    </div>
                  </div>
                  <div class="table-container">
                    <table class="enterprise-table">
                      <thead>
                        <tr>
                          <th>企业全名</th>
                          <th>企业简称</th>
                          <th>所在地区</th>
                          <th>成立年份</th>
                        </tr>
                      </thead>
                      <tbody id="potentialEnterpriseTableBody">
                        <!-- 动态填充 -->
                      </tbody>
                    </table>
                    <div class="pagination" id="potentialPagination">
                      <!-- 动态生成分页 -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 初始化数据
    initModalData(chainPointName);
  }

  function closeChainPointModal() {
    const modal = document.getElementById('chainPointModal');
    if (modal) {
      modal.remove();
    }
  }

  // 分页相关变量
  let leadingEnterprises = [];
  let potentialEnterprises = [];
  let leadingCurrentPage = 1;
  let potentialCurrentPage = 1;
  const ITEMS_PER_PAGE = 10;

  function initModalData(chainPointName) {
    // 生成模拟数据
    generateMockData(chainPointName);

    // 设置潜力企业总数
    document.getElementById('potentialTotalCount').textContent = potentialEnterprises.length;

    // 渲染表格
    renderLeadingEnterprises();
    renderPotentialEnterprises();

    // 添加搜索事件监听
    document.getElementById('leading-search-btn').addEventListener('click', () => {
      filterEnterprises('leading');
    });

    document.getElementById('leading-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        filterEnterprises('leading');
      }
    });

    document.getElementById('potential-search-btn').addEventListener('click', () => {
      filterEnterprises('potential');
    });

    document.getElementById('potential-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        filterEnterprises('potential');
      }
    });
  }

  function generateMockData(chainPointName) {
    // 龙头企业数据
    const leadingCompanyNames = [
      '比亚迪股份有限公司', '宁德时代新能源科技股份有限公司', '吉利控股集团有限公司', '上海汽车集团股份有限公司',
      '蔚来控股有限公司', '理想汽车设计制造公司', '小鹏汽车控股有限公司', '华为技术有限公司',
      '科大讯飞股份有限公司', '阿里巴巴集团控股有限公司', '腾讯控股有限公司', '百度在线网络技术（北京）有限公司',
      '京东方科技集团股份有限公司', '小米集团有限责任公司', '长城汽车股份有限公司',
      '广州汽车集团股份有限公司', '东风汽车集团有限公司', '重庆长安汽车股份有限公司',
      '北京汽车集团有限公司', '安徽江淮汽车集团股份有限公司', '奇瑞控股集团有限公司',
      '国轩高科股份有限公司', '欣旺达电子股份有限公司', '亿纬锂能股份有限公司',
      '先导智能装备股份有限公司', '恩捷股份科技有限公司', '天赐材料股份有限公司', '赣锋锂业股份有限公司'
    ];

    const leadingShortNames = [
      '比亚迪', '宁德时代', '吉利', '上汽集团', '蔚来', '理想汽车', '小鹏汽车',
      '华为', '科大讯飞', '阿里巴巴', '腾讯', '百度', '京东方', '小米',
      '长城汽车', '广汽集团', '东风汽车', '长安汽车', '北汽集团', '江淮汽车', '奇瑞',
      '国轩高科', '欣旺达', '亿纬锂能', '先导智能', '恩捷股份', '天赐材料', '赣锋锂业'
    ];

    const attributes = ['链主企业', '上市企业', '世界500强', '高新技术企业', '专精特新'];
    const regions = ['杭州市滨江区', '宁波市鄞州区', '温州市龙湾区', '嘉兴市南湖区', '湖州市吴兴区',
                    '绍兴市越城区', '金华市婺城区', '衢州市柯城区', '舟山市定海区', '台州市椒江区', '丽水市莲都区'];
    const descriptions = [
      '专注于新能源汽车研发、生产和销售的高新技术企业',
      '全球领先的动力电池制造商和新能源解决方案提供商',
      '集汽车整车、零部件、研发于一体的综合性汽车集团',
      '中国最大的汽车制造企业之一，产品涵盖乘用车和商用车',
      '专注于智能电动汽车研发和制造的创新型企业',
      '专注于增程式电动汽车研发和制造的企业',
      '专注于智能电动汽车研发和制造的企业',
      '全球领先的信息与通信技术解决方案供应商',
      '人工智能和语音技术领域的领军企业',
      '全球领先的电子商务和科技公司',
      '全球领先的互联网科技公司',
      '全球最大的中文搜索引擎和人工智能公司',
      '全球领先的半导体显示技术、产品和服务的供应商',
      '消费电子和智能硬件制造商',
      '专业从事汽车整车及零部件制造的企业',
      '中国汽车制造行业的重要企业之一',
      '中国四大汽车集团之一，涵盖乘用车、商用车等领域',
      '中国汽车行业四大集团之一，产品涵盖轿车、SUV等',
      '中国汽车制造企业，产品涵盖乘用车、新能源汽车等',
      '集汽车研发、制造、销售于一体的综合性企业',
      '中国自主品牌汽车制造企业',
      '专业从事新能源汽车动力电池研发和制造的企业',
      '锂电池和消费电池制造企业',
      '专业从事锂电池研发和制造的企业',
      '智能制造装备和解决方案提供商',
      '锂电池隔膜材料研发和制造企业',
      '锂电池电解液和新能源材料制造企业',
      '锂电池正极材料研发和制造企业'
    ];

    leadingEnterprises = [];
    for (let i = 0; i < leadingCompanyNames.length; i++) {
      const companyAttrs = [];
      if (i < 12) companyAttrs.push('链主企业');
      if (i < 20) companyAttrs.push('上市企业');
      if (i < 5) companyAttrs.push('世界500强');
      if (Math.random() > 0.3) companyAttrs.push('高新技术企业');
      if (Math.random() > 0.7) companyAttrs.push('专精特新');

      leadingEnterprises.push({
        fullName: leadingCompanyNames[i],
        shortName: leadingShortNames[i],
        location: regions[i % regions.length],
        description: descriptions[i % descriptions.length],
        attributes: companyAttrs,
        id: `leading_${i + 1}`
      });
    }

    // 潜力企业数据
    const potentialCompanyNames = [
      '微盟集团股份有限公司', '商汤科技有限公司', '寒武纪科技股份有限公司', '地平线机器人技术有限公司',
      '小马智行科技有限公司', '文远知行科技有限公司', 'AutoX科技有限公司', 'Momenta科技有限公司',
      '小马智行（北京）科技有限公司', '轻舟智航科技有限公司', '智加科技有限公司', '主线科技有限公司',
      '畅行智能科技有限公司', '所托瑞安科技有限公司', '中智行科技有限公司', '酷哇机器人有限公司',
      '仙途智能科技有限公司', '飞步科技有限公司', '驭势科技（北京）有限公司', '希迪智驾（长沙）有限公司',
      '新石器慧通（北京）科技有限公司', '行深智能科技有限公司', '白犀牛智达（北京）科技有限公司',
      '京东物流股份有限公司', '美团无人机科技有限公司', '菜鸟网络科技有限公司', '顺丰科技有限公司', '达达集团'
    ];

    const potentialShortNames = [
      '微盟集团', '商汤科技', '寒武纪科技', '地平线机器人', '小马智行', '文远知行', 'AutoX',
      'Momenta', 'Pony.ai', '轻舟智航', '智加科技', '主线科技', '畅行智能', '所托瑞安',
      '中智行', '酷哇机器人', '仙途智能', '飞步科技', '驭势科技', '希迪智驾', '新石器',
      '行深智能', '白犀牛', '京东物流', '美团无人机', '菜鸟网络', '顺丰科技', '达达集团'
    ];

    const districts = ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'];
    const establishmentYears = Array.from({length: 30}, (_, i) => 2010 + i);

    potentialEnterprises = [];
    for (let i = 0; i < potentialCompanyNames.length; i++) {
      potentialEnterprises.push({
        fullName: potentialCompanyNames[i],
        shortName: potentialShortNames[i],
        location: districts[i % districts.length],
        establishmentYear: establishmentYears[Math.floor(Math.random() * establishmentYears.length)],
        potential: Math.floor(Math.random() * 41) + 60, // 60-100
        id: `potential_${i + 1}`
      });
    }
  }

  function renderLeadingEnterprises() {
    const tbody = document.getElementById('leadingEnterpriseTableBody');
    const start = (leadingCurrentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = leadingEnterprises.slice(start, end);

    tbody.innerHTML = pageData.map(company => `
      <tr>
        <td>
          <a href="companies.html#/company/${encodeURIComponent(company.id)}" class="company-link" target="_blank">
            ${company.fullName}
          </a>
        </td>
        <td>${company.shortName}</td>
        <td>${company.location}</td>
        <td>
          <div class="company-description">
            ${company.description}
          </div>
        </td>
      </tr>
    `).join('');

    renderPagination('leading', leadingEnterprises.length, leadingCurrentPage, renderLeadingEnterprises);

    // 渲染完成后调用行高匹配函数
    setTimeout(matchTableRowHeights, 100);
  }

  function renderPotentialEnterprises() {
    const tbody = document.getElementById('potentialEnterpriseTableBody');
    const start = (potentialCurrentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = potentialEnterprises.slice(start, end);

    tbody.innerHTML = pageData.map(company => `
      <tr>
        <td>
          <a href="companies.html#/company/${encodeURIComponent(company.id)}" class="company-link" target="_blank">
            ${company.fullName}
          </a>
        </td>
        <td>${company.shortName}</td>
        <td>${company.location}</td>
        <td>${company.establishmentYear}</td>
      </tr>
    `).join('');

    renderPagination('potential', potentialEnterprises.length, potentialCurrentPage, renderPotentialEnterprises);

    // 渲染完成后调用行高匹配函数
    setTimeout(matchTableRowHeights, 100);
  }

  function renderPagination(type, totalItems, currentPage, renderFunction) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginationId = type === 'leading' ? 'leadingPagination' : 'potentialPagination';
    const pagination = document.getElementById(paginationId);

    let paginationHTML = `
      <button class="pagination-btn" onclick="changePage('${type}', ${currentPage - 1}, ${renderFunction.name})"
              ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
      <span class="pagination-info">第 ${currentPage} 页 / 共 ${totalPages} 页</span>
      <button class="pagination-btn" onclick="changePage('${type}', ${currentPage + 1}, ${renderFunction.name})"
              ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;

    pagination.innerHTML = paginationHTML;
  }

  function changePage(type, newPage, renderFunctionName) {
    const totalPages = type === 'leading' ?
      Math.ceil(leadingEnterprises.length / ITEMS_PER_PAGE) :
      Math.ceil(potentialEnterprises.length / ITEMS_PER_PAGE);

    if (newPage < 1 || newPage > totalPages) return;

    if (type === 'leading') {
      leadingCurrentPage = newPage;
      renderLeadingEnterprises();
    } else {
      potentialCurrentPage = newPage;
      renderPotentialEnterprises();
    }
  }

  // 行高匹配函数
  function matchTableRowHeights() {
    const leadingTable = document.querySelector('#leadingEnterpriseTableBody').parentElement;
    const potentialTable = document.querySelector('#potentialEnterpriseTableBody').parentElement;

    if (!leadingTable || !potentialTable) return;

    const leadingRows = leadingTable.querySelectorAll('tr');
    const potentialRows = potentialTable.querySelectorAll('tr');

    const maxRows = Math.max(leadingRows.length, potentialRows.length);

    for (let i = 0; i < maxRows; i++) {
      const leadingRow = leadingRows[i];
      const potentialRow = potentialRows[i];

      if (leadingRow && potentialRow) {
        // 获取两行的当前高度
        const leadingHeight = leadingRow.offsetHeight;
        const potentialHeight = potentialRow.offsetHeight;

        // 使用较高的行高
        const maxHeight = Math.max(leadingHeight, potentialHeight);

        // 设置两行的最小高度为最大高度
        leadingRow.style.minHeight = maxHeight + 'px';
        potentialRow.style.minHeight = maxHeight + 'px';

        // 确保所有单元格都有相同的高度
        const leadingCells = leadingRow.querySelectorAll('td');
        const potentialCells = potentialRow.querySelectorAll('td');

        leadingCells.forEach(cell => {
          cell.style.minHeight = maxHeight + 'px';
          cell.style.height = maxHeight + 'px';
        });

        potentialCells.forEach(cell => {
          cell.style.minHeight = maxHeight + 'px';
          cell.style.height = maxHeight + 'px';
        });
      }
    }
  }

  // 搜索功能实现
  function filterEnterprises(type) {
    const searchInput = document.getElementById(`${type}-search-input`);
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (type === 'leading') {
      if (!searchTerm) {
        // 如果搜索框为空，重置为原始数据
        generateMockData('');
      } else {
        // 过滤龙头企业数据
        leadingEnterprises = leadingEnterprises.filter(company =>
          company.fullName.toLowerCase().includes(searchTerm) ||
          company.shortName.toLowerCase().includes(searchTerm) ||
          company.location.toLowerCase().includes(searchTerm) ||
          company.description.toLowerCase().includes(searchTerm) ||
          company.attributes.some(attr => attr.toLowerCase().includes(searchTerm))
        );
      }
      leadingCurrentPage = 1;
      renderLeadingEnterprises();
    } else if (type === 'potential') {
      if (!searchTerm) {
        // 如果搜索框为空，重置为原始数据
        generateMockData('');
      } else {
        // 过滤潜力企业数据
        potentialEnterprises = potentialEnterprises.filter(company =>
          company.fullName.toLowerCase().includes(searchTerm) ||
          company.shortName.toLowerCase().includes(searchTerm) ||
          company.location.toLowerCase().includes(searchTerm) ||
          company.establishmentYear.toString().includes(searchTerm)
        );
      }
      potentialCurrentPage = 1;
      renderPotentialEnterprises();
    }
  }

  // 点击模态框外部关闭
  document.addEventListener('click', function(e) {
    const modal = document.getElementById('chainPointModal');
    if (modal && e.target === modal.querySelector('.modal-overlay')) {
      closeChainPointModal();
    }
  });
