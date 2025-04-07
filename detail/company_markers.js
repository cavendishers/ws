// 公司标记管理类
class CompanyMarkers {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.companies = [];
        this.hoveredCompany = null;
        this.loadCompanies();
        
        // 添加鼠标移动事件监听
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    // 加载公司数据
    async loadCompanies() {
        try {
            // 获取筛选条件
            const industry = document.getElementById('industryFilter')?.value || '';
            const city = document.getElementById('cityFilter')?.value || '';
            const county = document.getElementById('countyFilter')?.value || '';
            
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
            console.error('加载公司数据失败，使用备用模拟数据:', error);
            
            // 备用模拟数据
            this.companies = [
                {
                    company_name: '备用测试公司1',
                    name: '备用测试公司1',
                    latitude: 30.240494,
                    longitude: 120.146847
                },
                {
                    company_name: '备用测试公司2',
                    name: '备用测试公司2',
                    latitude: 30.274281,
                    longitude: 120.155172
                },
                {
                    company_name: '备用测试公司3',
                    name: '备用测试公司3',
                    latitude: 30.224789,
                    longitude: 120.186865
                }
            ];
            
            console.log('使用备用模拟数据:', this.companies);
            return this.companies;
        }
    }

    // 绘制公司标记
    drawMarkers(scale, translateX, translateY) {
        if (!this.companies || this.companies.length === 0) {
            console.warn('没有公司数据可供绘制');
            return;
        }
        
        console.log('绘制公司标记，共', this.companies.length, '个公司');
        console.log('绘制参数:', { scale, translateX, translateY });
        console.log('第一个公司数据:', this.companies[0]);
        
        // 明确设置填充和描边样式
        this.ctx.fillStyle = 'red';
        this.ctx.strokeStyle = 'white';
        
        this.companies.forEach((company, index) => {
            // 确保经纬度是数字
            const lon = parseFloat(company.longitude);
            const lat = parseFloat(company.latitude);
            
            if (isNaN(lon) || isNaN(lat)) {
                console.warn(`公司 ${index} 的经纬度无效:`, company);
                return; // 跳过这个公司
            }
            
            // 转换为画布坐标
            const x = lon * scale + translateX;
            const y = -lat * scale + translateY;
            
            if (index === 0) {
                console.log('第一个公司转换后坐标:', { x, y, lon, lat });
            }
            
            // 绘制标记(缩小红点大小) - 确保红点可见
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2); // 使用固定值而不是缩放
            this.ctx.fillStyle = 'red';
            this.ctx.fill();
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'white';
            this.ctx.stroke();

            // 每个公司都显示名称，不仅是悬停的
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            
            // 绘制文字背景
            const textWidth = this.ctx.measureText(company.name || '未命名').width;
            const padding = 2;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(
                x - textWidth / 2 - padding,
                y + 5 - padding,
                textWidth + padding * 2,
                12 + padding * 2
            );
            
            // 绘制文字
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(company.name || '未命名', x, y + 5);
        });
    }

    // 检查点是否在公司标记附近
    isNearCompany(point, scale = 1, threshold = 10) {
        if (!this.companies || this.companies.length === 0) return false;
        
        const translateX = window.transformMatrix?.translateX || 0;
        const translateY = window.transformMatrix?.translateY || 0;
        
        return this.companies.some(company => {
            const [x, y] = [
                company.longitude * scale + translateX,
                -company.latitude * scale + translateY
            ];
            const distance = Math.sqrt(
                Math.pow(point[0] - x, 2) + 
                Math.pow(point[1] - y, 2)
            );
            return distance < threshold / scale;
        });
    }

    // 处理鼠标移动事件
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 检查是否悬停在公司标记上
        this.hoveredCompany = this.findCompanyAtPoint(x, y);
    }

    // 查找指定坐标点的公司
    findCompanyAtPoint(x, y) {
        const scale = window.transformMatrix?.scale || 1;
        const translateX = window.transformMatrix?.translateX || 0;
        const translateY = window.transformMatrix?.translateY || 0;
        
        for (const company of this.companies) {
            const [mapX, mapY] = [
                company.longitude * scale + translateX,
                -company.latitude * scale + translateY
            ];
            
            const distance = Math.sqrt(
                Math.pow(x - mapX, 2) + 
                Math.pow(y - mapY, 2)
            );
            
            if (distance < 10 / scale) {
                return company;
            }
        }
        return null;
    }
} 