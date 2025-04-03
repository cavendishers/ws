// 公司标记管理类
class CompanyMarkers {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.companies = [];
        this.loadCompanies();
    }

    // 加载公司数据
    async loadCompanies() {
        try {
            const response = await fetch('hangzhou_company.json');
            const data = await response.json();
            this.companies = data.companies;
            console.log('公司数据加载完成:', this.companies);
            return this.companies;
        } catch (error) {
            console.error('加载公司数据失败:', error);
            return [];
        }
    }

    // 绘制公司标记
    drawMarkers(scale, translateX, translateY) {
        if (!this.companies || this.companies.length === 0) {
            console.warn('没有公司数据可供绘制');
            return;
        }
        
        console.log('绘制公司标记，共', this.companies.length, '个公司');
        
        this.companies.forEach(company => {
            // 使用地图坐标系统，不再需要自己转换坐标
            const [x, y] = [company.longitude, -company.latitude];
            
            // 绘制标记
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5 / scale, 0, Math.PI * 2);
            this.ctx.fillStyle = 'red';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2 / scale;
            this.ctx.stroke();

            // 绘制光晕效果
            this.ctx.beginPath();
            this.ctx.arc(x, y, 8 / scale, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 3 / scale;
            this.ctx.stroke();

            // 绘制公司名称
            this.ctx.fillStyle = 'white';
            this.ctx.font = `${12 / scale}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            
            // 绘制文字背景
            const textWidth = this.ctx.measureText(company.name).width;
            const padding = 3 / scale;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(
                x - textWidth / 2 - padding,
                y + 10 / scale - padding,
                textWidth + padding * 2,
                14 / scale + padding * 2
            );
            
            // 绘制文字
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(company.name, x, y + 10 / scale);
        });
    }

    // 检查点是否在公司标记附近
    isNearCompany(point, scale = 1, threshold = 10) {
        if (!this.companies || this.companies.length === 0) return false;
        
        return this.companies.some(company => {
            const [x, y] = [company.longitude, -company.latitude];
            const distance = Math.sqrt(
                Math.pow(point[0] - x, 2) + 
                Math.pow(point[1] - y, 2)
            );
            return distance < threshold / scale;
        });
    }
} 