    const provinceMap = echarts.init(document.getElementById('provinceMap'));
    const mapTitle = document.getElementById('mapTitle');
    const mapLocation = document.getElementById('mapLocation');
    const resetBtn = document.getElementById('resetMapBtn');
    let currentRegion = 'province';

    const provinceData = [
      { name: '杭州市', value: 680, amount: 152 },
      { name: '宁波市', value: 430, amount: 108 },
      { name: '温州市', value: 220, amount: 76 },
      { name: '嘉兴市', value: 240, amount: 83 },
      { name: '湖州市', value: 160, amount: 52 },
      { name: '绍兴市', value: 190, amount: 68 },
      { name: '金华市', value: 175, amount: 47 },
      { name: '衢州市', value: 120, amount: 28 },
      { name: '舟山市', value: 86, amount: 36 },
      { name: '台州市', value: 198, amount: 58 },
      { name: '丽水市', value: 75, amount: 19 }
    ];

    const hangzhouDistricts = [
      { name: '拱墅区', value: 96, amount: 32 },
      { name: '西湖区', value: 110, amount: 38 },
      { name: '滨江区', value: 130, amount: 42 },
      { name: '萧山区', value: 140, amount: 26 },
      { name: '余杭区', value: 160, amount: 31 },
      { name: '临平区', value: 85, amount: 19 },
      { name: '富阳区', value: 60, amount: 12 },
      { name: '临安区', value: 45, amount: 8 }
    ];

    function loadProvinceMap() {
      fetch('https://geo.datav.aliyun.com/areas_v3/bound/330000_full.json')
        .then(res => res.json())
        .then(geoJson => {
          echarts.registerMap('zhejiang', geoJson);
          renderProvince();
        });
    }

    function renderProvince() {
      currentRegion = 'province';
      mapTitle.textContent = '企业数量热力图 · 浙江省';
      mapLocation.textContent = '当前：浙江省';
      resetBtn.style.display = 'none';

      provinceMap.setOption({
        tooltip: {
          trigger: 'item',
          formatter: params => {
            const item = provinceData.find(it => it.name === params.name);
            if (!item) return params.name;
            return `${params.name}<br/>在册企业数：${item.value} 家<br/>签约金额：${item.amount} 亿元`;
          }
        },
        visualMap: {
          min: 70,
          max: 700,
          left: 20,
          bottom: 20,
          inRange: { color: ['#dbeafe', '#60a5fa', '#1d4ed8'] },
          text: ['高', '低']
        },
        series: [{
          name: '企业数量',
          type: 'map',
          map: 'zhejiang',
          roam: true,
          emphasis: { label: { color: '#0f172a', fontWeight: 'bold' }, areaColor: '#bfdbfe' },
          data: provinceData
        }]
      });
    }

    function renderHangzhou() {
      fetch('https://geo.datav.aliyun.com/areas_v3/bound/330100_full.json')
        .then(res => res.json())
        .then(geoJson => {
          echarts.registerMap('hangzhou', geoJson);
          currentRegion = 'hangzhou';
          mapTitle.textContent = '企业数量热力图 · 杭州市';
          mapLocation.textContent = '当前：杭州市';
          resetBtn.style.display = 'inline-flex';

          provinceMap.setOption({
            tooltip: {
              trigger: 'item',
              formatter: params => {
                const item = hangzhouDistricts.find(it => it.name === params.name);
                if (!item) return params.name;
                return `${params.name}<br/>在册企业数：${item.value} 家<br/>签约金额：${item.amount} 亿元`;
              }
            },
            visualMap: {
              min: 40,
              max: 170,
              left: 20,
              bottom: 20,
              inRange: { color: ['#dbeafe', '#60a5fa', '#1d4ed8'] },
              text: ['高', '低']
            },
            series: [{
              name: '企业数量',
              type: 'map',
              map: 'hangzhou',
              roam: true,
              emphasis: { label: { color: '#0f172a', fontWeight: 'bold' }, areaColor: '#bfdbfe' },
              data: hangzhouDistricts
            }]
          });
        });
    }

    provinceMap.on('click', params => {
      if (params.name === '杭州市' && currentRegion !== 'hangzhou') {
        renderHangzhou();
        renderMetrics('hangzhou');
      }
    });

    resetBtn.addEventListener('click', () => {
      renderProvince();
      renderMetrics('province');
    });

    const metricsData = {
      province: [
        { title: '企业数 / 上市企业数', value: '2888 家', compare: '同比 +3.8%', growthClass: '', chart: [2680, 2704, 2720, 2755, 2800, 2826, 2850, 2868, 2888, 2895] },
        { title: '国内专利数', value: '17 万件', compare: '同比 -6.1%', growthClass: 'down', chart: [19, 18.6, 18.1, 17.8, 17.6, 17.2, 16.9, 16.7, 16.4, 16.6] },
        { title: '研发占比', value: '3.4 %', compare: '同比 -5.1%', growthClass: 'down', chart: [3.7, 3.6, 3.5, 3.4, 3.3, 3.3, 3.4, 3.4, 3.4, 3.4] },
        { title: '产业平台 / 科研机构', value: '平台 5 个', compare: '科研机构 25 个', growthClass: '', chart: [22, 23, 24, 24, 25, 25, 25, 25, 25, 26] },
        { title: '投资项目 / 投资额', value: '1987 个', compare: '投资额 3103.6 亿元', growthClass: '', chart: [1120, 1206, 1580, 1688, 1722, 1898, 2044, 2100, 2122, 2200] }
      ],
      hangzhou: [
        { title: '企业数 / 上市企业数', value: '1188 家', compare: '同比 +5.4%', growthClass: '', chart: [1030, 1055, 1082, 1106, 1124, 1146, 1168, 1179, 1188, 1195] },
        { title: '国内专利数', value: '8.2 万件', compare: '同比 +2.6%', growthClass: '', chart: [7.6, 7.8, 8.0, 8.1, 8.0, 8.1, 8.15, 8.18, 8.2, 8.25] },
        { title: '研发占比', value: '4.5 %', compare: '同比 +0.8%', growthClass: '', chart: [4.2, 4.1, 4.4, 4.5, 4.3, 4.4, 4.5, 4.6, 4.5, 4.7] },
        { title: '产业平台 / 科研机构', value: '平台 3 个', compare: '科研机构 12 个', growthClass: '', chart: [10, 10, 11, 11, 11, 12, 12, 12, 12, 12] },
        { title: '投资项目 / 投资额', value: '618 个', compare: '投资额 1288.4 亿元', growthClass: '', chart: [420, 450, 480, 520, 560, 590, 602, 615, 618, 630] }
      ]
    };

    const metricGrid = document.getElementById('metricGrid');
    const metricCharts = {};

    function renderMetrics(region) {
      const data = metricsData[region] || metricsData.province;
      metricGrid.innerHTML = data.map((metric, idx) => `
        <div class="metric-card">
          <div class="metric-header">
            <span>${metric.title}</span>
            <small>详情</small>
          </div>
          <div class="metric-values">
            <span>${metric.value}</span>
            <span class="metric-growth ${metric.growthClass || ''}">${metric.compare}</span>
          </div>
          <div class="metric-chart" id="metric-chart-${idx}"></div>
        </div>
      `).join('');

      data.forEach((metric, idx) => {
        const el = document.getElementById(`metric-chart-${idx}`);
        if (!el) return;
        if (metricCharts[idx]) {
          metricCharts[idx].dispose();
        }
        const chart = echarts.init(el);
        chart.setOption({
          grid: { left: 30, right: 10, top: 10, bottom: 20 },
          xAxis: { type: 'category', show: false, data: ['2024/07','2024/09','2024/11','2025/01','2025/03','2025/05','2025/07','2025/09','2025/11','2026/01'] },
          yAxis: { type: 'value', show: false },
          tooltip: { trigger: 'axis' },
          series: [{ type: 'bar', data: metric.chart, itemStyle: { color: '#60a5fa' }, barWidth: 10 }]
        });
        metricCharts[idx] = chart;
      });
    }

    const compareChart = echarts.init(document.getElementById('compareChart'));
    const compareCategories = ['材料及元器件', '零部件', '汽车制造装备', '整车研发制造', '汽车后市场', '测试及服务'];
    const compareSeriesConfig = [
      { name: '在册企业数（家）', color: '#0b56d9', data: [168, 198, 142, 185, 96, 72] },
      { name: '上市企业数（家）', color: '#94a3b8', data: [32, 45, 21, 36, 12, 8] },
      { name: '从业人数（万人）', color: '#1ec8a6', data: [12.8, 15.6, 8.4, 16.2, 6.5, 4.2] },
      { name: '国内专利数（万个）', color: '#31c48d', data: [2.1, 2.6, 1.4, 2.8, 1.2, 0.9] },
      { name: '技术人员数量（万人）', color: '#cbd5f5', data: [4.8, 5.6, 3.2, 6.2, 2.8, 2.1] },
      { name: '高级技术人员数量（万人）', color: '#6470d8', data: [1.4, 1.9, 1.1, 2.2, 0.9, 0.6] }
    ];

    compareChart.setOption({
      color: compareSeriesConfig.map(item => item.color),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: compareSeriesConfig.map(item => item.name),
        top: 10,
        itemWidth: 14,
        itemHeight: 14,
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      grid: { left: 40, right: 40, top: 70, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: compareCategories,
        axisLine: { lineStyle: { color: '#cbd5f5' } },
        axisTick: { show: false },
        axisLabel: { color: '#475569' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b' }
      },
      series: compareSeriesConfig.map(item => ({
        name: item.name,
        type: 'bar',
        data: item.data,
        barWidth: 16,
        emphasis: { focus: 'series' }
      }))
    });

    const chainSegments = [
      {
        name: '材料及元器件',
        ratings: { scale: 5, tech: 4, develop: 3 },
        companies: [
          { name: '横店集团东磁股份有限公司', tag: '上市', status: '增长' },
          { name: '天能股份有限公司', tag: '上市', status: '稳健' },
          { name: '福莱特玻璃集团股份有限公司', tag: '上市', status: '向好' }
        ],
        projects: [
          { name: '磐安锂电材料升级项目', tag: '重点', status: '开工' },
          { name: '嘉兴新能源材料创新园', tag: '示范', status: '推进' }
        ]
      },
      {
        name: '零部件',
        ratings: { scale: 5, tech: 5, develop: 4 },
        companies: [
          { name: '宁波拓普集团股份有限公司', tag: '上市', status: '提升' },
          { name: '浙江万向系统有限公司', tag: '央企', status: '稳健' },
          { name: '浙江精进电动科技有限公司', tag: '专精', status: '快速' }
        ],
        projects: [
          { name: '宁波关键零部件智造园', tag: '重点', status: '推进' },
          { name: '杭州智能底盘工厂', tag: '示范', status: '开工' }
        ]
      },
      {
        name: '汽车制造装备',
        ratings: { scale: 4, tech: 4, develop: 3 },
        companies: [
          { name: '浙江钱江机器人有限公司', tag: '上市', status: '突破' },
          { name: '浙江中自机器人股份有限公司', tag: '专精', status: '快速' },
          { name: '浙江华数机器人有限公司', tag: '央企', status: '稳健' }
        ],
        projects: [
          { name: '杭州智能制造装备小镇', tag: '示范', status: '落地' },
          { name: '嘉兴智能装备创新中心', tag: '重点', status: '推进' }
        ]
      },
      {
        name: '整车研发制造',
        ratings: { scale: 5, tech: 4, develop: 4 },
        companies: [
          { name: '浙江吉利控股集团有限公司', tag: '上市', status: '稳健' },
          { name: '浙江极氪智能科技有限公司', tag: '上市', status: '快速' },
          { name: '零跑汽车科技股份有限公司', tag: '上市', status: '增长' }
        ],
        projects: [
          { name: '杭州智能网联测试示范区', tag: '示范', status: '运营' },
          { name: '宁波智能整车研发中心', tag: '重点', status: '推进' }
        ]
      },
      {
        name: '汽车后市场',
        ratings: { scale: 4, tech: 3, develop: 3 },
        companies: [
          { name: '浙江万马股份有限公司', tag: '上市', status: '稳健' },
          { name: '杭州长江汽车服务有限公司', tag: '服务', status: '向好' },
          { name: '浙江云阔创新科技有限公司', tag: '专精', status: '快速' }
        ],
        projects: [
          { name: '杭州智慧出行平台升级', tag: '示范', status: '运营' },
          { name: '嘉兴汽车后市场综合体', tag: '重点', status: '推进' }
        ]
      },
      {
        name: '测试及服务',
        ratings: { scale: 3, tech: 3, develop: 3 },
        companies: [
          { name: '浙江智能驾驶测试有限公司', tag: '专精', status: '快速' },
          { name: '浙江省汽车研究院有限公司', tag: '科研', status: '稳健' },
          { name: '赛普(杭州)电测有限公司', tag: '专精', status: '提升' }
        ],
        projects: [
          { name: '浙江车规级检测实验室', tag: '示范', status: '推进' },
          { name: '台州先进测试服务平台', tag: '重点', status: '开工' }
        ]
      }
    ];

    const chainRatingGrid = document.getElementById('chainRatingGrid');
    const topBoard = document.getElementById('topBoard');

    const starLine = count => '★'.repeat(count) + '☆'.repeat(5 - count);
    const badgeClass = tag => {
      if (tag === '央企') return 'badge-core';
      if (tag === '专精') return 'badge-special';
      if (tag === '科研') return 'badge-lab';
      if (tag === '服务') return 'badge-service';
      if (tag === '高新') return 'badge-innov';
      return 'badge-high';
    };
    const statusClass = status => {
      if (['增长','稳健','向好','快速','突破','提升','运营'].includes(status)) return 'status-positive';
      if (['推进','开工','施工','落地'].includes(status)) return 'status-warning';
      return 'status-neutral';
    };

    chainRatingGrid.innerHTML = chainSegments.map(segment => `
      <div class="chain-rating-cell">
        <div class="chain-rating-title">${segment.name}</div>
        <div class="chain-rating-row scale"><span class="stars">${starLine(segment.ratings.scale)}</span></div>
        <div class="chain-rating-row tech"><span class="stars">${starLine(segment.ratings.tech)}</span></div>
        <div class="chain-rating-row develop"><span class="stars">${starLine(segment.ratings.develop)}</span></div>
      </div>
    `).join('');

    topBoard.innerHTML = chainSegments.map(segment => `
      <div class="top-column">
        <h4>${segment.name}</h4>
        <div class="top-section">
          <div class="top-title">TOP 企业</div>
          <ul class="top-list">
            ${segment.companies.map(item => `
              <li class="top-item">
                <span class="top-name">${item.name}</span>
                <span class="top-meta">
                  <span class="badge ${badgeClass(item.tag)}">${item.tag}</span>
                  <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
                </span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="top-section">
          <div class="top-title">TOP 项目</div>
          <ul class="top-list">
            ${segment.projects.map(item => `
              <li class="top-item">
                <span class="top-name">${item.name}</span>
                <span class="top-meta">
                  <span class="badge ${badgeClass(item.tag)}">${item.tag}</span>
                  <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
                </span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        tab.classList.add('active');
        const targetPanel = document.getElementById(tab.dataset.target);
        if (targetPanel) targetPanel.classList.add('active');
        if (targetPanel && targetPanel.id === 'comparePanel') {
          setTimeout(() => compareChart.resize(), 0);
        }
      });
    });

    loadProvinceMap();
    renderMetrics('province');
  
