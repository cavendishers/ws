// 移动菜单交互
document.addEventListener('DOMContentLoaded', function() {
    // 初始化移动端菜单
    initMobileMenu();
    
    // 初始化桌面端下拉菜单
    initDesktopDropdown();
    
    // 初始化半透明背景效果
    initGlassEffect();
});

// 初始化移动端菜单
function initMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        const mobileSubMenuToggles = mobileMenu.querySelectorAll('.mobile-submenu-toggle');
        mobileSubMenuToggles.forEach(toggle => {
            const subMenu = toggle.nextElementSibling;
            if (subMenu && subMenu.classList.contains('pl-4')) {
                subMenu.classList.add('hidden');
                const initialIcon = toggle.querySelector('i');
                if(initialIcon) initialIcon.classList.replace('fa-chevron-up','fa-chevron-down');
                toggle.addEventListener('click', (e) => {
                    subMenu.classList.toggle('hidden');
                    const icon = e.currentTarget.querySelector('i');
                    if (icon) {
                         if(subMenu.classList.contains('hidden')){ 
                             icon.classList.replace('fa-chevron-up','fa-chevron-down'); 
                         } else { 
                             icon.classList.replace('fa-chevron-down','fa-chevron-up'); 
                         }
                    }
                });
            }
        });
    }
}

// 初始化桌面端下拉菜单
function initDesktopDropdown() {
    const dropdownBtn = document.getElementById('industryDropdownBtn');
    const dropdown = document.getElementById('industryDropdown');
    const dropdownContainer = document.querySelector('.dropdown-container');
    
    if (dropdownBtn && dropdown && dropdownContainer) {
        // 初始化样式
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.position = 'absolute';
        dropdown.style.backgroundColor = 'rgba(2, 4, 10, 0.95)';
        dropdown.style.padding = '10px';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.zIndex = '50';
        dropdown.style.transition = 'opacity 0.3s, visibility 0.3s';
        
        // 设置下拉菜单项样式
        const dropdownLinks = dropdown.querySelectorAll('a');
        dropdownLinks.forEach(link => {
            link.style.padding = '8px 12px';
            link.style.display = 'block';
            link.style.borderBottom = '1px solid rgba(0, 191, 255, 0.1)';
        });
        
        if (dropdownLinks.length > 0) {
            dropdownLinks[dropdownLinks.length - 1].style.borderBottom = 'none';
        }
        
        // 点击按钮时打开或关闭下拉菜单
        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (dropdown.style.opacity === '1') {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
            } else {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
            }
        });
        
        // 点击页面其他地方时关闭下拉菜单
        document.addEventListener('click', function() {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
        });
        
        // 点击下拉菜单内容时阻止冒泡，防止意外关闭
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// 初始化半透明背景效果
function initGlassEffect() {
    // 应用全局性的玻璃效果样式
    const containerFluid = document.querySelectorAll('.container-fluid');
    const cards = document.querySelectorAll('.card');
    const mapContainer = document.getElementById('map-container');
    
    // 给容器添加玻璃效果
    if (containerFluid) {
        containerFluid.forEach(container => {
            container.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            container.style.backdropFilter = 'blur(10px)';
            container.style.borderRadius = '10px';
            container.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            container.style.margin = '15px auto';
            container.style.padding = '20px';
        });
    }
    
    // 给卡片添加玻璃效果
    if (cards) {
        cards.forEach(card => {
            card.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            card.style.backdropFilter = 'blur(5px)';
            card.style.borderRadius = '10px';
            card.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            card.style.transition = 'all 0.3s ease';
        });
    }
    
    // 给地图容器添加玻璃效果
    if (mapContainer) {
        mapContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        mapContainer.style.backdropFilter = 'blur(8px)';
        mapContainer.style.borderRadius = '10px';
        mapContainer.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
    }
} 