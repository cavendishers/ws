    (function(){
      const modules={panorama:{},link:{},analysis:{}};

      document.querySelectorAll('[data-module]').forEach((el,idx)=>{
        const moduleKey=el.dataset.module;
        if(!modules[moduleKey]){modules[moduleKey]={inputs:[]};}
        if(el.matches('input[type="radio"]')){
          el.addEventListener('change',()=>{
            updateSummary();
          });
          return;
        }
        if(!el.dataset.key){el.dataset.key=`${moduleKey}-${idx}`;}
        modules[moduleKey].inputs.push(el);

        if(el.matches('select')||el.matches('input[type="date"]')){
          el.addEventListener('change',updateSummary);
        }else if(el.matches('input[type="checkbox"]')){
          el.addEventListener('change',updateSummary);
        }else if(el.matches('input[type="search"],input[type="text"]')){
          el.addEventListener('input',updateSummary);
        }
      });

      function formatDate(start,end){
        if(!start&&!end) return '';
        if(start&&end) return `${start} 至 ${end}`;
        return start?`${start} 起`:`截至 ${end}`;
      }

      function unique(arr){
        const map=new Map();
        arr.forEach(text=>{if(text) map.set(text,true);});
        return Array.from(map.keys());
      }

      function buildTag(text){
        const span=document.createElement('span');
        span.className='summary-tag';
        span.textContent=text;
        return span;
      }

      function collectModuleSummary(key){
        const tags=[];
        const moduleInputs=modules[key]?.inputs||[];

        moduleInputs.forEach(input=>{
          const label=input.dataset.filter||'';
          if(input.matches('select')){
            if(input.value) tags.push(label?`${label}: ${input.value}`:input.value);
          }else if(input.matches('input[type="checkbox"]')){
            if(input.checked){
              const chipLabel=input.value||input.dataset.label||input.closest('label')?.textContent.trim();
              if(chipLabel) tags.push(label?`${label}: ${chipLabel}`:chipLabel);
            }
          }else if(input.matches('input[type="date"]')){
            const start=document.querySelector('input[type="date"][data-module="'+key+'"][data-filter="开始时间"]')?.value;
            const end=document.querySelector('input[type="date"][data-module="'+key+'"][data-filter="结束时间"]')?.value;
            const text=formatDate(start,end);
            if(text) tags.push(`时间范围: ${text}`);
          }else if(input.matches('input[type="search"],input[type="text"]')){
            if(input.value.trim()){tags.push(`${label}: ${input.value.trim()}`);}
          }
        });

        document.querySelectorAll('input[type="radio"][data-module="'+key+'"]:checked').forEach(radio=>{
          const label=radio.dataset.filter;
          const val=radio.value;
          if(val) tags.push(`${label}: ${val}`);
        });

        return unique(tags);
      }

      function updateSummary(){
        ['panorama','link','analysis'].forEach(key=>{
          const container=document.querySelector('[data-summary="'+key+'"]');
          if(!container) return;
          container.innerHTML='';
          const tags=collectModuleSummary(key);
          if(!tags.length){
            container.appendChild(buildTag('尚未选择'));
          }else{
            tags.forEach(text=>container.appendChild(buildTag(text)));
          }
          // 更新按钮状态
          updateButtonStates(key, tags.length > 0);
        });
      }

      function updateButtonStates(moduleKey, hasSelection) {
        const generateBtn = document.querySelector(`.btn-generate[data-module="${moduleKey}"]`);
        const downloadBtn = document.querySelector(`.btn-download[data-module="${moduleKey}"]`);

        if (generateBtn && downloadBtn) {
          // 生成按钮：有选择时可点击，无选择时禁用
          generateBtn.disabled = !hasSelection;

          // 下载按钮：有生成报告时可点击，否则禁用
          const hasReport = localStorage.getItem(`report_${moduleKey}`) !== null;
          downloadBtn.disabled = !hasReport;

          // 更新下载按钮文本
          if (hasReport) {
            downloadBtn.textContent = '下载报告';
          } else {
            downloadBtn.textContent = '下载报告';
          }
        }
      }

      function generateReport(moduleKey) {
        const generateBtn = document.querySelector(`.btn-generate[data-module="${moduleKey}"]`);
        const downloadBtn = document.querySelector(`.btn-download[data-module="${moduleKey}"]`);

        if (!generateBtn || !downloadBtn) return;

        // 添加生成中状态
        generateBtn.classList.add('generating');
        generateBtn.textContent = '生成中...';
        generateBtn.disabled = true;

        // 模拟生成报告的过程
        setTimeout(() => {
          // 生成报告数据
          const reportData = {
            module: moduleKey,
            selections: collectModuleSummary(moduleKey),
            timestamp: new Date().toISOString(),
            content: generateReportContent(moduleKey)
          };

          // 保存到本地存储
          localStorage.setItem(`report_${moduleKey}`, JSON.stringify(reportData));

          // 恢复生成按钮状态
          generateBtn.classList.remove('generating');
          generateBtn.textContent = '重新生成';
          generateBtn.disabled = false;

          // 启用下载按钮
          downloadBtn.disabled = false;

          // 显示成功提示
          showNotification(`${getModuleName(moduleKey)}生成成功！`, 'success');
        }, 2000); // 模拟2秒生成时间
      }

      function downloadReport(moduleKey) {
        const reportData = localStorage.getItem(`report_${moduleKey}`);
        if (!reportData) {
          showNotification('请先生成报告', 'warning');
          return;
        }

        const report = JSON.parse(reportData);

        // 创建下载内容
        const content = formatReportForDownload(report);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = `${getModuleName(moduleKey)}_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`${getModuleName(moduleKey)}下载成功！`, 'success');
      }

      function getModuleName(moduleKey) {
        const names = {
          'panorama': '产业链全景报告',
          'link': '链点专项报告',
          'analysis': '企业分析报告'
        };
        return names[moduleKey] || '报告';
      }

      function generateReportContent(moduleKey) {
        // 根据模块生成不同内容的报告
        const templates = {
          'panorama': '基于选择的地市和地区范围，分析区域产业链发展现状、重点企业分布、配套设施建设情况等。',
          'link': '针对选择的链点和目标城市，分析产业链薄弱环节、空间布局建议、招商策略建议等。',
          'analysis': '根据企业选择和分析维度，提供企业画像、财务状况、创新能力、供应链协同等综合分析。'
        };
        return templates[moduleKey] || '分析报告内容';
      }

      function formatReportForDownload(report) {
        const title = `${getModuleName(report.module)}\n${'='.repeat(50)}\n\n`;
        const timestamp = `生成时间：${new Date(report.timestamp).toLocaleString()}\n\n`;
        const selections = `选择条件：\n${report.selections.join('\n')}\n\n`;
        const content = `报告内容：\n${report.content}\n\n`;
        const footer = `\n${'='.repeat(50)}\n本报告由AI智能分析系统自动生成`;

        return title + timestamp + selections + content + footer;
      }

      function showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          animation: slideIn 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        // 根据类型设置颜色
        const colors = {
          'success': 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;',
          'warning': 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;',
          'info': 'background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%); color: white;'
        };

        notification.style.cssText += colors[type] || colors['info'];
        notification.textContent = message;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
          notification.style.animation = 'slideOut 0.3s ease';
          setTimeout(() => {
            if (notification.parentNode) {
              document.body.removeChild(notification);
            }
          }, 300);
        }, 3000);
      }

      // 绑定按钮事件
      document.querySelectorAll('.btn-generate').forEach(btn => {
        btn.addEventListener('click', () => {
          const moduleKey = btn.dataset.module;
          generateReport(moduleKey);
        });
      });

      document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', () => {
          const moduleKey = btn.dataset.module;
          downloadReport(moduleKey);
        });
      });

      // 初始化按钮状态
      ['panorama','link','analysis'].forEach(key => {
        updateButtonStates(key, false);
      });

      updateSummary();
    })();
  
