document.addEventListener('DOMContentLoaded', function() {
  // 设置全局标记，防止其他代码干扰
  window.INDUSTRY_PAGE_INITIALIZED = true;
  
  // 添加调试信息
  console.log('🚀 industry.js 已加载并开始执行');
  
  // 中英文映射表
  const industryImageMap = {
    '人工智能': 'artificial_intelligence.jpg',
    '新能源汽车': 'new_energy_vehicles.jpg',
    '医药生物': 'biopharmaceutical.jpg',
    '数字经济': 'digital_economy.jpg',
    '机器人': 'robotics.jpg',
    '物联网': 'iot.jpg',
    '低空经济': 'low_altitude_economy.jpg',
    '半导体': 'semiconductor.jpg',
    '大数据': 'big_data.jpg',
    '云计算': 'cloud_computing.jpg',
    '元宇宙': 'metaverse.jpg',
    '量子计算': 'quantum_computing.jpg',
    '生物医药': 'biopharmaceutical.jpg',
    '新材料': 'new_materials.jpg',
    '新能源': 'new_energy.jpg',
    '新基建': 'new_infrastructure.jpg',
    '新消费': 'new_consumption.jpg',
    '新农业': 'new_agriculture.jpg',
    '新金融': 'new_finance.jpg',
    '新制造': 'new_manufacturing.jpg',
    '集成电路': 'integrated_circuit.jpg',
  };
  
  // 中文名称到英文代码的映射表 - 作为备用方案
  const industryCodeMap = {
    '人工智能': 'AI',
    '新能源汽车': 'NEV', 
    '医药生物': 'BIOTECH',
    '数字经济': 'DIGITAL',
    '机器人': 'ROBOTICS',
    '物联网': 'IOT',
    '低空经济': 'LAE',
    '半导体': 'SEMICONDUCTOR',
    '大数据': 'BIGDATA',
    '云计算': 'CLOUD',
    '元宇宙': 'METAVERSE'
  };
  
  // 获取模态框元素（保留以备将来可能需要的模态框功能）
  const modal = document.getElementById('industryModal');
  const closeBtn = document.querySelector('.close');
  
  // 为每个卡片添加点击事件
  const industryCards = document.querySelectorAll('.industry-card');
  console.log(`📊 找到 ${industryCards.length} 个产业卡片`);
  
  industryCards.forEach((card, index) => {
    
    // 添加事件监听器前的调试信息
    const industryCode = card.getAttribute('data-industry-code');
    const industryName = card.getAttribute('data-industry');
    console.log(`📋 卡片 ${index + 1}: ${industryName} (${industryCode})`);
    
    // 设置背景图片（从模板内联代码移过来）
    let imageName = industryImageMap[industryName] || 'artificial_intelligence.jpg';
    let imagePath = `/static/data_hall/img/${imageName}`;
    card.style.backgroundImage = `url(${imagePath})`;
    
    // 定义事件处理函数
    function handleCardClick(event) {
      // 防止事件冒泡和默认行为
      event.preventDefault();
      event.stopPropagation();
      
      console.log('🎯 点击事件触发!');
      console.log('点击了产业卡片:', industryName, '代码:', industryCode);
      
      // 构建URL的逻辑 - 优先使用 industryCode，如果没有则使用映射表
      let urlCode = industryCode;
      
      // 如果没有 industryCode 或者 industryCode 是空的，使用备用映射
      if (!urlCode || urlCode.trim() === '') {
        urlCode = industryCodeMap[industryName];
        console.log('⚠️ 未找到 industryCode，使用备用映射:', urlCode);
      }
      
      // 如果仍然没有找到合适的代码，使用默认值
      if (!urlCode || urlCode.trim() === '') {
        urlCode = 'DEFAULT';
        console.error('❌ 无法确定产业代码，使用默认值');
      }
      
      // 确保 urlCode 不包含中文字符
      if (/[\u4e00-\u9fff]/.test(urlCode)) {
        console.error('❌ 检测到中文字符在URL代码中，这是不应该发生的！');
        // 如果检测到中文，尝试使用英文映射
        urlCode = industryCodeMap[urlCode] || 'DEFAULT';
      }
      
      const detailUrl = `/industry/detail/${urlCode}/`;
      console.log('✅ 准备跳转到:', detailUrl);
      
      // 直接执行跳转，不使用模态框
      window.location.href = detailUrl;
    }
    
    // 强制移除任何可能存在的旧事件处理器
    card.onclick = null;
    
    // 移除所有可能的旧事件监听器
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);
    
    // 在新的元素上添加事件监听器
    newCard.addEventListener('click', function(event) {
      // 重新获取属性，因为是新克隆的元素
      const industryCode = newCard.getAttribute('data-industry-code');
      const industryName = newCard.getAttribute('data-industry');
      
      // 防止事件冒泡和默认行为
      event.preventDefault();
      event.stopPropagation();
      
      console.log('🎯 点击事件触发!');
      console.log('点击了产业卡片:', industryName, '代码:', industryCode);
      
      // 构建URL的逻辑 - 优先使用 industryCode，如果没有则使用映射表
      let urlCode = industryCode;
      
      // 如果没有 industryCode 或者 industryCode 是空的，使用备用映射
      if (!urlCode || urlCode.trim() === '') {
        urlCode = industryCodeMap[industryName];
        console.log('⚠️ 未找到 industryCode，使用备用映射:', urlCode);
      }
      
      // 如果仍然没有找到合适的代码，使用默认值
      if (!urlCode || urlCode.trim() === '') {
        urlCode = 'DEFAULT';
        console.error('❌ 无法确定产业代码，使用默认值');
      }
      
      // 确保 urlCode 不包含中文字符
      if (/[\u4e00-\u9fff]/.test(urlCode)) {
        console.error('❌ 检测到中文字符在URL代码中，这是不应该发生的！');
        // 如果检测到中文，尝试使用英文映射
        urlCode = industryCodeMap[urlCode] || 'DEFAULT';
      }
      
      const detailUrl = `/industry/detail/${urlCode}/`;
      console.log('✅ 准备跳转到:', detailUrl);
      
      // 直接执行跳转，不使用模态框
      window.location.href = detailUrl;
    }, true); // 使用捕获阶段
    
         // 重新设置背景图片，因为是新克隆的元素
     imageName = industryImageMap[industryName] || 'artificial_intelligence.jpg';
     imagePath = `/static/data_hall/img/${imageName}`;
     newCard.style.backgroundImage = `url(${imagePath})`;
  });
  
  // 移除模态框相关代码，因为我们直接跳转而不显示模态框
  // 但保留模态框代码以备后用，只是不会调用它
  if (modal) {
    // 点击关闭按钮关闭模态框
    closeBtn.addEventListener('click', function() {
      closeModal();
    });
    
    // 点击模态框背景关闭模态框
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeModal();
      }
    });
    
    // 关闭模态框函数
    function closeModal() {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
    
    // 按ESC键关闭模态框
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
      }
    });
  }
}); 