(function () {
  const config = window.__PAGE_MODE__;
  if (!config) return;

  const relationFilter = config.relationFilter || '';
  const statsConfig = Array.isArray(config.stats) ? config.stats : [];
  const tableHeaders = Array.isArray(config.tableHeaders) ? config.tableHeaders : [];
  const tableTitle = config.tableTitle || '';
  const summaryLabel = config.summaryLabel || '';

  const SUBTYPE_POOL = {
    technical: ['tech_cooperation', 'tech_transfer', 'tech_license'],
    supply: ['supplier', 'customer'],
    capital: ['equity_investment', 'subsidiary_outside', 'co_investor']
  };

  function matchesRelationType(company, type) {
    if (!type) return true;
    if (!company) return false;
    if (company.relationType) return company.relationType === type;
    if (Array.isArray(company.relationTypes)) return company.relationTypes.includes(type);
    return false;
  }

  function getRelationSubtype(company) {
    if (!company) return '';
    if (company.relationSubtype) return company.relationSubtype;

    const primary = company.relationType || (Array.isArray(company.relationTypes) && company.relationTypes[0]) || '';
    let pool = SUBTYPE_POOL[primary] || [];

    if (!pool.length) {
      company.relationSubtype = primary || '';
      return company.relationSubtype;
    }

    const keyBase = company.name || `${company.country || ''}${company.city || ''}${company.chainNode || ''}`;
    const key = slugifyName ? slugifyName(keyBase) : (keyBase || '');
    const hash = key.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const subtype = pool[hash % pool.length];
    company.relationSubtype = subtype;
    return subtype;
  }

  function summarizeTechnical(detail) {
    if (!detail) return '暂无成果信息';
    const patents = Array.isArray(detail.patents) ? detail.patents : [];
    const softwares = Array.isArray(detail.softwares) ? detail.softwares : [];
    const techDirections = Array.isArray(detail.techDirections) ? detail.techDirections : [];
    const highValue = patents.length;
    const pct = Math.max(0, Math.floor(highValue / 2));
    const standards = softwares.length;
    const papers = techDirections.length;
    return `高价值专利：${highValue}件；PCT专利：${pct}件；国标：${standards}项；论文著作：${papers}篇`;
  }

  function summarizeProcurement(detail, subtype) {
    if (!detail) return '暂无采购事件';
    const list = subtype === 'customer' ? detail.customers : detail.suppliers;
    if (!Array.isArray(list) || !list.length) return '暂无采购事件';
    const item = list[0] || {};
    const name = item.name || '关联企业';
    const amountKey = subtype === 'customer' ? 'salesAmount' : 'purchaseAmount';
    const amountLabel = subtype === 'customer' ? '销售' : '采购';
    const amount = item[amountKey] ?? '--';
    const date = item.publicDate || '--';
    return `${name}：${amountLabel}金额${amount}万元（${date}）`;
  }

  function summarizeCapital(detail, subtype) {
    if (!detail) return '暂无投资事件';
    const investments = Array.isArray(detail.investments) ? detail.investments : [];
    if (subtype === 'co_investor') {
      const financing = Array.isArray(detail.financing) ? detail.financing : [];
      if (financing.length) {
        const round = financing[0];
        const investors = Array.isArray(round.investors) ? round.investors.join('、') : '--';
        return `${round.round || '投资轮次'}：${investors || '--'}（${round.date || '--'}）`;
      }
    }
    if (!investments.length) return '暂无投资事件';
    const item = investments[0];
    if (subtype === 'subsidiary_outside') {
      return `省外布局：${item.companyName || '--'}（${item.region || '--'}，成立${item.estDate || '--'}）`;
    }
    return `${item.companyName || '--'}（持股${item.ratio || '--'}，${item.region || '--'}）`;
  }

  function getChainLabels(company) {
    const { first = '', second = '' } = getNormalizedChainLevels ? getNormalizedChainLevels(company) : {};
    const firstLabel = (chainFirstLabelMap && chainFirstLabelMap.get(first)) || company.chainNodeNew || company.chainNode || '—';
    const secondLabel = (chainSecondLabelMap && chainSecondLabelMap.get(second)) || company.chainNode || '—';
    return { firstLabel, secondLabel };
  }

  function buildTechnicalRow(company, detailId) {
    const row = document.createElement('tr');
    const detail = ensureDetail(company);
    const { firstLabel, secondLabel } = getChainLabels(company);
    const nature = getCompanyNatureLabel ? getCompanyNatureLabel(company) : '';
    const subtype = getRelationSubtype(company);
    const subtypeLabel = getSubtypeLabel(subtype, company.relationType);
    const achievements = summarizeTechnical(detail);
    row.innerHTML = `
      <td><strong>${company.name || '—'}</strong></td>
      <td>${company.country || '—'}</td>
      <td>${company.city || '—'}</td>
      <td>${firstLabel || '—'}</td>
      <td>${secondLabel || '—'}</td>
      <td>${nature || '—'}</td>
      <td>${subtypeLabel || '—'}</td>
      <td>${achievements} <span class="link-like" onclick="navigateToDetail('${detailId}')">详情</span></td>
    `;
    return row;
  }

  function buildSupplyRow(company, detailId) {
    const row = document.createElement('tr');
    const detail = ensureDetail(company);
    const { firstLabel, secondLabel } = getChainLabels(company);
    const nature = getCompanyNatureLabel ? getCompanyNatureLabel(company) : '';
    const subtype = getRelationSubtype(company);
    const subtypeLabel = getSubtypeLabel(subtype, company.relationType);
    const summary = summarizeProcurement(detail, subtype);
    row.innerHTML = `
      <td><strong>${company.name || '—'}</strong></td>
      <td>${company.country || '—'}</td>
      <td>${company.city || '—'}</td>
      <td>${firstLabel || '—'}</td>
      <td>${secondLabel || '—'}</td>
      <td>${nature || '—'}</td>
      <td>${subtypeLabel || '—'}</td>
      <td>${summary} <span class="link-like" onclick="navigateToDetail('${detailId}')">详情</span></td>
    `;
    return row;
  }

  function buildCapitalRow(company, detailId) {
    const row = document.createElement('tr');
    const detail = ensureDetail(company);
    const { firstLabel, secondLabel } = getChainLabels(company);
    const nature = getCompanyNatureLabel ? getCompanyNatureLabel(company) : '';
    const subtype = getRelationSubtype(company);
    const subtypeLabel = getSubtypeLabel(subtype, company.relationType);
    const summary = summarizeCapital(detail, subtype);
    row.innerHTML = `
      <td><strong>${company.name || '—'}</strong></td>
      <td>${company.country || '—'}</td>
      <td>${company.city || '—'}</td>
      <td>${firstLabel || '—'}</td>
      <td>${secondLabel || '—'}</td>
      <td>${nature || '—'}</td>
      <td>${subtypeLabel || '—'}</td>
      <td>${summary} <span class="link-like" onclick="navigateToDetail('${detailId}')">详情</span></td>
    `;
    return row;
  }

  function ensureDetail(company) {
    if (!company) return null;
    ensureDetailFor && ensureDetailFor(company);
    const id = nameToIdMap && nameToIdMap[company.name];
    return id ? companyDetails[id] : null;
  }

  function getSubtypeLabel(subtype, primary) {
    return getRelationSubtypeLabel(subtype) || getRelationTypeLabel && getRelationTypeLabel(primary) || subtype || primary || '—';
  }

  function filterBaseData() {
    return companiesData.filter(company => matchesRelationType(company, relationFilter));
  }

  const summaryBuilder = (count) => `${summaryLabel}${count}家`;
  let sourceData = filterBaseData();

  window.updateStatistics = function () {
    const total = filteredData.length;
    const summaryElement = document.getElementById('pageSummary') || document.querySelector('.page-header div div');
    if (summaryElement) summaryElement.textContent = summaryBuilder(total);

    statsConfig.forEach((stat) => {
      const el = document.getElementById(stat.id);
      if (!el) return;
      if (!stat.subtype) {
        el.textContent = filteredData.length;
        return;
      }
      const count = filteredData.filter(company => getRelationSubtype(company) === stat.subtype).length;
      el.textContent = count;
    });
    const ids = ['technicalCount', 'supplyCount', 'capitalCount'];
    ids.forEach((id) => {
      if (statsConfig.some(stat => stat.id === id)) return;
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });
  };

  window.updateFilterInfo = function () {
    const filterInfo = document.getElementById('filterInfo');
    if (!filterInfo) return;
    if (filteredData.length === sourceData.length) {
      filterInfo.innerHTML = '<span style="color: #666;">显示全部数据</span>';
    } else {
      filterInfo.innerHTML = `<span style="color: #666;">筛选结果：${filteredData.length} 条记录</span>`;
    }
  };

  window.updatePagination = function () {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 0;
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    if (prevBtn) prevBtn.disabled = currentPage === 1 || totalItems === 0;
    if (nextBtn) nextBtn.disabled = totalItems === 0 || currentPage >= totalPages;

    const displayCurrent = totalItems === 0 ? 0 : currentPage;
    const displayTotal = totalItems === 0 ? 0 : totalPages;
    if (pageInfo) pageInfo.textContent = `第 ${displayCurrent} 页，共 ${displayTotal} 页`;
  };

  window.loadData = function () {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    if (totalPages > 0 && currentPage > totalPages) currentPage = totalPages;
    if (totalPages === 0) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageData = filteredData.slice(startIndex, endIndex);

    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!pageData.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = tableHeaders.length || 1;
      emptyCell.className = 'muted';
      emptyCell.style.textAlign = 'center';
      emptyCell.style.padding = '24px 0';
      emptyCell.textContent = '暂无数据';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      updatePagination();
      return;
    }

    pageData.forEach((company) => {
      const detailId = nameToIdMap ? nameToIdMap[company.name] : '';
      let row;
      if (config.mode === 'technical') {
        row = buildTechnicalRow(company, detailId);
      } else if (config.mode === 'supply') {
        row = buildSupplyRow(company, detailId);
      } else if (config.mode === 'capital') {
        row = buildCapitalRow(company, detailId);
      }
      if (row) tableBody.appendChild(row);
    });

    updatePagination();
  };

  window.applyFilter = function () {
    const industry = document.getElementById('filterIndustry')?.value || '';
    const relationType = document.getElementById('filterRelationTypes')?.value || '';
    const companyType = document.getElementById('filterCompanyTypes')?.value || '';
    const location = document.getElementById('filterLocation')?.value || '';

    filteredData = sourceData.filter(company => {
      if (industry && company.industry !== industry) return false;
      if (relationType && relationType !== relationFilter) return false;
      if (companyType && (!company.companyTypes || !company.companyTypes.includes(companyType))) return false;
      if (location && company.location !== location) return false;
      return true;
    });

    currentPage = 1;
    loadData();
    updateFilterInfo();
    updateStatistics();
  };

  window.resetFilter = function () {
    const industrySelect = document.getElementById('filterIndustry');
    if (industrySelect) industrySelect.value = '';
    const relationSelect = document.getElementById('filterRelationTypes');
    if (relationSelect) relationSelect.value = relationFilter;
    const companySelect = document.getElementById('filterCompanyTypes');
    if (companySelect) companySelect.value = '';
    const locationSelect = document.getElementById('filterLocation');
    if (locationSelect) locationSelect.value = '';

    filteredData = [...sourceData];
    currentPage = 1;
    loadData();
    updateFilterInfo();
    updateStatistics();
  };

  function ensureTableStructure() {
    if (tableHeaders.length) {
      const headerRow = document.querySelector('.data-table thead tr');
      if (headerRow) headerRow.innerHTML = tableHeaders.map((header) => `<th>${header}</th>`).join('');
    }
    if (tableTitle) {
      const titleEl = document.querySelector('.table-title');
      if (titleEl) titleEl.textContent = tableTitle;
    }
  }

  function ensureDetail(company) {
    ensureDetailFor && ensureDetailFor(company);
    const detailId = nameToIdMap ? nameToIdMap[company.name] : '';
    return detailId ? companyDetails[detailId] : null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureTableStructure();

    const summaryElement = document.getElementById('pageSummary');
    if (summaryElement) summaryElement.textContent = summaryBuilder(0);

    const relationSelect = document.getElementById('filterRelationTypes');
    if (relationSelect) {
      relationSelect.value = relationFilter;
      relationSelect.disabled = true;
    }

    sourceData = filterBaseData();
    filteredData = [...sourceData];
    currentPage = 1;

    const elementsToClone = ['filterIndustry', 'filterCompanyTypes', 'filterLocation', 'resetFilter'];
    elementsToClone.forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      const clone = node.cloneNode(true);
      node.parentNode.replaceChild(clone, node);
    });

    const industrySelect = document.getElementById('filterIndustry');
    if (industrySelect) {
      industrySelect.addEventListener('change', () => {
        resetChainSelections && resetChainSelections();
        updateChainCascaderDisplay && updateChainCascaderDisplay();
        closeChainCascader && closeChainCascader();
        applyFilter();
      });
    }

    const companyTypeSelect = document.getElementById('filterCompanyTypes');
    if (companyTypeSelect) {
      companyTypeSelect.addEventListener('change', applyFilter);
    }

    const locationSelect = document.getElementById('filterLocation');
    if (locationSelect) {
      locationSelect.addEventListener('change', applyFilter);
    }

    const resetButton = document.getElementById('resetFilter');
    if (resetButton) {
      resetButton.addEventListener('click', resetFilter);
    }

    loadData();
    updateFilterInfo();
    updateStatistics();
    updatePagination();
  });
  delete window.__PAGE_MODE__;
})();
