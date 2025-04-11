// 公司标记管理类
class CompanyMarkers {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.companies = [];
        this.hoveredCompany = null;
        this.loadCompanies();
        
        // 注释掉鼠标移动事件监听
        // this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        // 监听筛选变化
        this.setupFilterListeners();
    }

    // 设置筛选监听器
    setupFilterListeners() {
        const industryFilter = document.getElementById('industryFilter');
        const cityFilter = document.getElementById('cityFilter');
        const countyFilter = document.getElementById('countyFilter');
        
        if (!industryFilter || !cityFilter || !countyFilter) {
            console.warn('筛选控件不存在，无法设置监听器');
            return;
        }
        
        const filters = [industryFilter, cityFilter, countyFilter];
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                console.log('筛选条件变化:', {
                    industry: industryFilter.value,
                    city: cityFilter.value,
                    county: countyFilter.value
                });
                this.loadCompanies().then(() => {
                    // 数据加载完成后重新绘制地图
                    if (typeof drawMap === 'function') {
                        drawMap();
                    }
                });
            });
        });
        console.log('筛选监听器设置完成');
    }

    // 加载公司数据
    async loadCompanies() {
        try {
            // 获取筛选条件
            const industryFilter = document.getElementById('industryFilter');
            const cityFilter = document.getElementById('cityFilter');
            const countyFilter = document.getElementById('countyFilter');
            
            const industry = industryFilter ? industryFilter.value : '';
            const city = cityFilter ? cityFilter.value : '';
            const county = countyFilter ? countyFilter.value : '';
            
            // 构建查询参数
            const params = new URLSearchParams();
            if (industry) params.append('industry', industry);
            if (city) params.append('city', city);
            if (county) params.append('county', county);
            
            console.log('正在加载公司数据，筛选条件:', { industry, city, county });
            
            try {
                const response = await fetch(`/api/company-locations/?${params.toString()}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                this.companies = data.companies.map(company => ({
                    ...company,
                    name: company.company_name,
                    latitude: parseFloat(company.latitude),
                    longitude: parseFloat(company.longitude)
                }));
            } catch (error) {
                console.error('API获取公司数据失败，使用模拟数据:', error);
                
                // 使用模拟数据（杭州市区域内的三个测试点）
                this.companies = [
                    {
                        company_name: '测试公司1 - 西湖区',
                        name: '测试公司1 - 西湖区',
                        latitude: 30.259924,
                        longitude: 120.130095
                    },
                    {
                        company_name: '测试公司2 - 拱墅区',
                        name: '测试公司2 - 拱墅区',
                        latitude: 30.319104,
                        longitude: 120.150116
                    },
                    {
                        company_name: '测试公司3 - 滨江区',
                        name: '测试公司3 - 滨江区',
                        latitude: 30.206428,
                        longitude: 120.210095
                    }
                ];
            }
            
            console.log('公司数据加载完成:', this.companies);
            return this.companies;
        } catch (error) {
            console.error('加载公司数据失败:', error);
            return [];
        }
    }

    // 处理鼠标移动事件
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 检查是否悬停在公司标记上
        this.hoveredCompany = this.findCompanyAtPoint(x, y);
        
        // 如果悬停状态变化，重绘地图
        if (this.hoveredCompany && typeof drawMap === 'function') {
            drawMap();
        }
    }

    // 查找指定坐标点的公司
    findCompanyAtPoint(x, y) {
        // 获取当前的变换矩阵
        const transformMatrix = window.transformMatrix || { scale: 1, translateX: 0, translateY: 0 };
        const scale = transformMatrix.scale;
        const translateX = transformMatrix.translateX;
        const translateY = transformMatrix.translateY;
        
        for (const company of this.companies) {
            if (!company.longitude || !company.latitude) continue;
            
            const [mapX, mapY] = [
                company.longitude * scale + translateX,
                -company.latitude * scale + translateY
            ];
            
            const distance = Math.sqrt(
                Math.pow(x - mapX, 2) + 
                Math.pow(y - mapY, 2)
            );
            
            if (distance < 10) {
                return company;
            }
        }
        return null;
    }

    // 绘制公司标记
    drawMarkers(scale, translateX, translateY) {
        if (!this.companies || this.companies.length === 0) {
            console.warn('没有公司数据可供绘制');
            return;
        }
        
        console.log('绘制公司标记...共', this.companies.length, '个公司');
        console.log('绘制参数:', { scale, translateX, translateY });
        
        // 绘制公司标记
        this.companies.forEach((company, index) => {
            // 确保经纬度是有效数字
            const lon = parseFloat(company.longitude);
            const lat = parseFloat(company.latitude);
            
            if (isNaN(lon) || isNaN(lat)) {
                console.warn(`公司 ${index} 的经纬度无效:`, company);
                return; // 跳过无效的公司
            }
            
            // 计算画布坐标
            const x = lon * scale + translateX;
            const y = -lat * scale + translateY;
            
            if (index === 0) {
                console.log('第一个公司坐标:', { x, y, lon, lat });
            }
            
            // 绘制红点
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2.5, 0, Math.PI * 2); // 固定大小
            this.ctx.fillStyle = 'red';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // 注释掉悬停显示名称的代码
            /*
            if (this.hoveredCompany === company) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                
                // 绘制文字背景
                const name = company.company_name || company.name || '未命名';
                const textWidth = this.ctx.measureText(name).width;
                const padding = 4;
                
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(
                    x - textWidth/2 - padding,
                    y + 10 - padding,
                    textWidth + 2*padding,
                    16 + 2*padding
                );
                
                // 绘制文字
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(name, x, y + 10);
            }
            */
        });
    }

    // 检查点是否在公司标记附近
    isNearCompany(point, scale = 1) {
        if (!this.companies || this.companies.length === 0) return false;
        
        // 获取当前的变换矩阵
        const transformMatrix = window.transformMatrix || { scale: 1, translateX: 0, translateY: 0 };
        const translateX = transformMatrix.translateX;
        const translateY = transformMatrix.translateY;
        
        return this.companies.some(company => {
            if (!company.longitude || !company.latitude) return false;
            
            const [x, y] = [
                company.longitude * scale + translateX,
                -company.latitude * scale + translateY
            ];
            
            const distance = Math.sqrt(
                Math.pow(point[0] - x, 2) + 
                Math.pow(point[1] - y, 2)
            );
            
            return distance < 10;
        });
    }
} 