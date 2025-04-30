document.addEventListener('DOMContentLoaded', function() {
  // 获取模态框元素
  const modal = document.getElementById('industryModal');
  const modalTitle = document.getElementById('modalTitle');
  const industryChainImage = document.getElementById('industryChainImage');
  const industryDescription = document.getElementById('industryDescription');
  const coreEnterprises = document.getElementById('coreEnterprises');
  const industryTrend = document.getElementById('industryTrend');
  const closeBtn = document.querySelector('.close');
  
  // 产业数据（模拟数据）
  const industryData = {
    '人工智能': {
      image: '/static/data_hall/img/产业链/人工智能产业链.jpg',
      description: '人工智能产业链涵盖基础层、技术层和应用层三大部分。基础层包括算力基础设施和数据资源，技术层包括机器学习、深度学习、自然语言处理等核心技术，应用层则遍布金融、医疗、制造、交通等多个领域。',
      coreEnterprises: ['百度', '科大讯飞', '商汤科技', '旷视科技', '云从科技'],
      trend: '随着大模型技术的突破，AI产业正迎来新一轮爆发式增长，预计未来五年内，新一代人工智能将在各行各业实现深度融合发展。'
    },
    '未来医疗': {
      image: '/static/data_hall/img/产业链/未来医疗.jpg',
      description: '未来医疗产业链整合了传统医疗与新兴科技，包括医疗器械、生物制药、数字医疗和精准医疗四大板块，重点发展基因测序、AI辅助诊断、远程医疗等创新领域。',
      coreEnterprises: ['华大基因', '迈瑞医疗', '微医集团', '丁香园', '翰森制药'],
      trend: '随着人口老龄化加剧和健康需求提升，智慧医疗将成为产业发展重点，基因治疗和细胞治疗等前沿技术将加速商业化。'
    },
    '物联网': {
      image: '/static/data_hall/img/产业链/物联网.jpg',
      description: '物联网产业链由感知层、网络层和应用层构成。感知层包括各类传感器和RFID设备，网络层负责数据传输，应用层则实现智能家居、工业互联网、智慧城市等多种场景应用。',
      coreEnterprises: ['海尔', '美的', '小米', '华为', '海康威视'],
      trend: '随着5G网络的普及和边缘计算技术的成熟，物联网将迎来更大规模的应用爆发，特别是在智能制造和智慧城市领域。'
    },
    '数字经济': {
      image: '/static/data_hall/img/产业链/数字经济.jpg',
      description: '数字经济产业链涵盖数字产业化和产业数字化两大方向，包括电子信息制造、软件服务、平台经济和数字贸易四大关键环节，是推动经济高质量发展的新引擎。',
      coreEnterprises: ['阿里巴巴', '腾讯', '京东', '字节跳动', '美团'],
      trend: '数字经济正加速与实体经济深度融合，产业互联网将成为数字经济发展的下一个重点，数据要素市场化配置机制将逐步完善。'
    },
    '机器人': {
      image: '/static/data_hall/img/产业链/机器人.jpg',
      description: '机器人产业链包括核心零部件（伺服电机、减速器、控制器）、本体制造和系统集成三大环节，覆盖工业机器人、服务机器人和特种机器人三大类别。',
      coreEnterprises: ['埃斯顿', '新松机器人', '大疆创新', '优必选', '柯马'],
      trend: '协作机器人和服务机器人将成为产业发展新方向，人工智能技术的融入将显著提升机器人的柔性化、智能化水平，应用场景将持续拓展。'
    },
    '大数据': {
      image: '/static/data_hall/img/产业链/大数据.jpg',
      description: '大数据产业链包括数据采集、数据存储、数据处理、数据分析和数据应用五大环节，形成了从基础设施到行业应用的完整生态体系。',
      coreEnterprises: ['阿里云', '腾讯云', '华为云', '星环科技', '达观数据'],
      trend: '随着数据治理体系的完善和数据要素市场的建立，大数据产业将迎来更加规范化的发展，同时数据安全与隐私保护将成为产业发展的关键议题。'
    },
    '云计算': {
      image: '/static/data_hall/img/产业链/云计算.jpg',
      description: '云计算产业链由基础设施层（IaaS）、平台服务层（PaaS）和软件服务层（SaaS）构成，围绕IDC、服务器、网络设备、云服务平台和云应用五大环节形成完整体系。',
      coreEnterprises: ['阿里云', '腾讯云', '华为云', '百度智能云', 'AWS'],
      trend: '混合云和多云战略将成为企业IT转型的主流选择，边缘计算与云计算的融合将加速，云原生技术将推动应用架构创新。'
    },
    '半导体': {
      image: '/static/data_hall/img/产业链/半导体.jpg',
      description: '半导体产业链包括上游设计、中游制造和下游封测三大环节，是信息技术产业的基础，涉及EDA工具、晶圆制造、封装测试等多个专业领域。',
      coreEnterprises: ['中芯国际', '华虹半导体', '长电科技', '紫光展锐', '寒武纪'],
      trend: '在国产替代和技术升级双重驱动下，中国半导体产业将加速发展，特别是在特色工艺、封装测试和设计环节有望取得突破。'
    }
  };
  
  // 为每个卡片添加点击事件
  const industryCards = document.querySelectorAll('.industry-card');
  industryCards.forEach(card => {
    card.addEventListener('click', function() {
      const industry = this.getAttribute('data-industry');
      if (industry && industryData[industry]) {
        // 填充模态框内容
        modalTitle.textContent = industry + '产业链';
        
        // 设置产业链图片
        industryChainImage.src = industryData[industry].image || '';
        
        // 设置产业描述
        industryDescription.textContent = industryData[industry].description || '暂无描述';
        
        // 设置核心企业列表
        if (industryData[industry].coreEnterprises && industryData[industry].coreEnterprises.length) {
          coreEnterprises.innerHTML = industryData[industry].coreEnterprises.map(name => `<li>${name}</li>`).join('');
        } else {
          coreEnterprises.innerHTML = '<li>暂无数据</li>';
        }
        
        // 设置发展趋势
        industryTrend.textContent = industryData[industry].trend || '暂无数据';
        
        // 显示模态框
        modal.style.display = 'block';
        setTimeout(() => {
          modal.classList.add('show');
        }, 10);
      }
    });
  });
  
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
}); 