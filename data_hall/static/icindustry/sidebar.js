// Shared sidebar navigation structure used across all section pages.
const SIDEBAR_MENU = [
  {
    id: 'industry-map',
    title: '产业链图谱',
    children: [
      { id: 'industry-overview', label: '图谱总览', href: 'industry.html' },
      { id: 'industry-assessment', label: '产业研判', href: 'industry_assessment.html' }
    ]
  },
  {
    id: 'industry-analysis',
    title: '产业链分析',
    children: [
      { id: 'industry-companies', label: '招商引资', href: 'companies.html' },
      { id: 'technical-complement', label: '技术性互补', href: 'technical_complement.html' },
      { id: 'supply-dependency', label: '供应链依赖', href: 'supply_dependency.html' },
      { id: 'capital-linkage', label: '资本关联性企业', href: 'capital_association.html' }
    ]
  },
  {
    id: 'risk-warning',
    title: '风险预警',
    children: [
      { id: 'smart-match', label: '智能匹配', href: 'smart_match.html' },
      { id: 'potential-identification', label: '潜力挖掘', href: 'potential_identification.html' },
      { id: 'risk-warning', label: '风险预警', href: 'risk_warning.html' }
    ]
  },
  {
    id: 'ai-intelligence',
    title: 'AI数据智能',
    children: [
      { id: 'ai-reports', label: 'AI报告', href: 'ai_reports.html' },
      { id: 'data-assist', label: '数据提取', href: 'data_assist.html' }
    ]
  }
];

const DEFAULT_SECTION_INDEX = 0;

function normalisePath(path) {
  if (!path) return '';
  const withoutQuery = path.split('?')[0].split('#')[0];
  const parts = withoutQuery.split('/').filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : withoutQuery;
  return (last || '').toLowerCase();
}

function renderSidebar(container) {
  if (!container) return;

  const currentPage =
    normalisePath(window.location.pathname) ||
    normalisePath(window.location.href) ||
    'index.html';

  const anySectionActive = SIDEBAR_MENU.some((section) =>
    section.children.some(
      (item) => normalisePath(item.href) === currentPage
    )
  );

  const menuRoot = document.createElement('ul');
  menuRoot.className = 'sidebar-menu';

  SIDEBAR_MENU.forEach((section, index) => {
    const hasActiveItem = section.children.some(
      (item) => normalisePath(item.href) === currentPage
    );
    const sectionElement = document.createElement('li');
    sectionElement.className = 'sidebar-section';
    const shouldOpen = hasActiveItem || (!anySectionActive && index === DEFAULT_SECTION_INDEX);
    if (shouldOpen) {
      sectionElement.classList.add('is-opened');
    }

    const headerButton = document.createElement('button');
    headerButton.type = 'button';
    headerButton.className = 'sidebar-section__title';
    headerButton.setAttribute(
      'aria-expanded',
      sectionElement.classList.contains('is-opened') ? 'true' : 'false'
    );
    headerButton.innerHTML = `
      <span class="sidebar-section__icon" aria-hidden="true"></span>
      <span class="sidebar-section__label">${section.title}</span>
      <span class="sidebar-section__caret" aria-hidden="true"></span>
    `;

    const submenu = document.createElement('ul');
    submenu.className = 'sidebar-submenu';
    if (sectionElement.classList.contains('is-opened')) {
      submenu.hidden = false;
      submenu.style.display = '';
    } else {
      submenu.hidden = true;
      submenu.style.display = 'none';
    }

    section.children.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.className = 'sidebar-item';

      const link = document.createElement('a');
      link.href = item.href;
      link.className = 'sidebar-link';
      link.textContent = item.label;

      if (normalisePath(item.href) === currentPage) {
        listItem.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }

      listItem.appendChild(link);
      submenu.appendChild(listItem);
    });

    headerButton.addEventListener('click', () => {
      const isOpen = sectionElement.classList.contains('is-opened');

      if (isOpen) {
        sectionElement.classList.remove('is-opened');
        submenu.hidden = true;
        submenu.style.display = 'none';
        headerButton.setAttribute('aria-expanded', 'false');
        return;
      }

      container.querySelectorAll('.sidebar-section').forEach((other) => {
        if (other === sectionElement) return;
        other.classList.remove('is-opened');
        const otherMenu = other.querySelector('.sidebar-submenu');
        if (otherMenu) {
          otherMenu.hidden = true;
          otherMenu.style.display = 'none';
        }
        const otherButton = other.querySelector('.sidebar-section__title');
        if (otherButton) {
          otherButton.setAttribute('aria-expanded', 'false');
        }
      });

      sectionElement.classList.add('is-opened');
      submenu.hidden = false;
      submenu.style.display = '';
      headerButton.setAttribute('aria-expanded', 'true');
    });

    sectionElement.appendChild(headerButton);
    sectionElement.appendChild(submenu);
    menuRoot.appendChild(sectionElement);
  });

  container.innerHTML = '';
  container.appendChild(menuRoot);
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebarContainer = document.getElementById('sidebar');
  renderSidebar(sidebarContainer);
});
