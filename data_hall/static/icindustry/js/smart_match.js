    const ITEMS_PER_PAGE = 10;
    const matchData = [
      { demand: '杭州市工信局', type: '政府部门', area: '杭州', industry: '新能源汽车', requestType: '市场开拓', request: '对接高能级整车及核心零部件项目，支持本地配套落地', companies: ['吉利汽车', '零跑科技', '奥动新能源'] },
      { demand: '宁波象山县产业基金', type: '资本机构', area: '宁波', industry: '生物医药', requestType: '融资寻求', request: '寻找临床阶段创新药企参与定向增发', companies: ['贝达药业', '微芯生物', '君实生物'] },
      { demand: '嘉兴港区智能装备产业园', type: '园区平台', area: '嘉兴', industry: '智能机器人', requestType: '人才引进', request: '引入工业机器人本体及伺服系统项目，打造示范产线', companies: ['埃夫特', '汇川技术', '佳顺智能'] },
      { demand: '台州智能网联汽车联盟', type: '龙头企业', area: '台州', industry: '新能源汽车', requestType: '减负降本', request: '共建域控制器联合实验室，补链车规级芯片', companies: ['地平线', '黑芝麻智能', '东软睿驰'] },
      { demand: '宁波杭州湾新区集成电路产业园', type: '园区平台', area: '宁波', industry: '集成电路', requestType: '市场开拓', request: '引进IC设计企业，推动芯片研发成果孵化', companies: ['中芯国际', '华虹半导体', '兆易创新'] },
      { demand: '舟山新材料产业园区', type: '政府部门', area: '杭州', industry: '新材料', requestType: '其他', request: '承接高端复合材料项目，拓展绿色材料供应链', companies: ['扬帆新材', '万华化学', '海默科技'] },
      { demand: '桐乡市人工智能小镇', type: '政府部门', area: '嘉兴', industry: '人工智能', requestType: '人才引进', request: '布局机器学习平台，吸引头部AI企业设立区域总部', companies: ['阿里巴巴', '商汤科技', '科大讯飞'] },
      { demand: '杭州未来科技城管委会', type: '园区平台', area: '杭州', industry: '生物医药', requestType: '市场开拓', request: '打造细胞治疗应用场景，招引CDMO企业', companies: ['药明康德', '凯莱英', '博雅辑因'] },
      { demand: '宁波中车集成电路有限公司', type: '龙头企业', area: '宁波', industry: '集成电路', requestType: '减负降本', request: '联合开发车规级芯片和特种材料技术', companies: ['中芯国际', '韦尔股份', '中微公司'] },
      { demand: '台州湾新区经发局', type: '政府部门', area: '台州', industry: '低空经济', requestType: '融资寻求', request: '引入无人机及低空交通项目，实现产业闭环布局', companies: ['大疆创新', '亿航智能', '小鹏汇天'] },
      { demand: '浙江省新能源集团创新办公室', type: '龙头企业', area: '杭州', industry: '新材料', requestType: '市场开拓', request: '寻找氢燃料电池材料合作伙伴', companies: ['宁德时代', '比亚迪', '现代汽车'] },
      { demand: '中国人寿创新投资浙江团队', type: '资本机构', area: '杭州', industry: '人工智能', requestType: '融资寻求', request: '关注AI算法和算力解决方案，寻求战略投资', companies: ['字节跳动', '腾讯', '百度'] }
    ];

    let filtered = matchData.slice();
    let currentPage = 1;

    function renderTable() {
      const tbody = document.getElementById('matchTableBody');
      const pagination = document.getElementById('matchPagination');
      if (!tbody || !pagination) return;

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

      if (!pageItems.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#8a94a6;">暂无匹配结果，请调整筛选条件</td></tr>';
      } else {
        tbody.innerHTML = pageItems.map(item => `
          <tr>
            <td>${item.demand}<br/><span style="font-size:12px;color:#8a94a6;">${item.type} · ${item.area}</span></td>
            <td>${item.request}<br/><span style="font-size:12px;color:#8a94a6;">产业方向：${item.industry} · 诉求类型：${item.requestType}</span></td>
            <td>${item.companies.join('、')}</td>
          </tr>
        `).join('');
      }

      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
      pagination.innerHTML = `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">上一页</button>
        <span class="pagination-info">第 ${currentPage} / ${totalPages} 页，共 ${filtered.length} 条</span>
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">下一页</button>
      `;
    }

    function changePage(page) {
      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
      currentPage = Math.min(Math.max(page, 1), totalPages);
      renderTable();
    }

    window.changePage = changePage;

    function applyFilter() {
      const area = document.getElementById('filterArea').value;
      const industry = document.getElementById('filterIndustry').value;
      const requestType = document.getElementById('filterRequestType').value;
      const keyword = document.getElementById('keywordInput').value.trim().toLowerCase();

      filtered = matchData.filter(item => {
        const matchArea = !area || item.area === area;
        const matchIndustry = !industry || item.industry === industry;
        const matchRequestType = !requestType || item.requestType === requestType;
        const matchKeyword = !keyword ||
          item.demand.toLowerCase().includes(keyword) ||
          item.request.toLowerCase().includes(keyword) ||
          item.companies.join(',').toLowerCase().includes(keyword);
        return matchArea && matchIndustry && matchRequestType && matchKeyword;
      });

      currentPage = 1;
      renderTable();
    }

    document.getElementById('applyFilter').addEventListener('click', applyFilter);
    document.getElementById('resetFilter').addEventListener('click', () => {
      document.getElementById('filterArea').value = '';
      document.getElementById('filterIndustry').value = '';
      document.getElementById('filterRequestType').value = '';
      document.getElementById('keywordInput').value = '';
      filtered = matchData.slice();
      currentPage = 1;
      renderTable();
    });

    document.getElementById('keywordInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') applyFilter();
    });

    renderTable();
  
