export function formatCurrency(value, currency = "AED") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(value));
}

export function statusBadge(status) {
  const normalized = status.toLowerCase();
  let tone = "badge-info";
  if (["оплачено", "завершено", "активен", "активна", "выполнена", "готов"].includes(normalized)) tone = "badge-success";
  if (["ожидание", "в процессе", "требует действий", "выдача", "подписание договора", "ожидает оплаты"].includes(normalized)) tone = "badge-warning";
  if (["просрочено", "отклонено", "ошибка"].includes(normalized)) tone = "badge-danger";
  return `<span class="badge ${tone}">${status}</span>`;
}

export function renderProfileSection({
  basePath = "",
  avatarInitials = "MK",
  profileHref,
  logoutHref,
  profileLabel = "Настройки профиля",
  logoutLabel = "Выйти",
}) {
  const resolvedBasePath = typeof basePath === "string" ? basePath : "";
  const settingsLink = profileHref ?? `${resolvedBasePath}/profile/index.html`;
  const exitLink = logoutHref ?? `${resolvedBasePath}/login/index.html`;

  return `
    <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-full bg-slate-900/90 text-white flex items-center justify-center text-sm font-semibold">
          ${avatarInitials}
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-900">Ваш профиль</p>
          <p class="text-xs text-slate-500">Быстрые действия</p>
        </div>
      </div>
      <div class="mt-4 grid gap-2">
        <a href="${settingsLink}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900">
          <i data-lucide="settings" class="h-4 w-4"></i>
          <span>${profileLabel}</span>
        </a>
        <a href="${exitLink}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900">
          <i data-lucide="log-out" class="h-4 w-4"></i>
          <span>${logoutLabel}</span>
        </a>
      </div>
    </div>
  `;
}

export function mountSidebar({ containerId, role, items, activePath, basePath = "", profile }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  console.log('mountSidebar called with items:', items);

  container.innerHTML = `
    <div class="h-full flex flex-col">
      <div class="px-6 py-5 flex items-center gap-3 border-b border-slate-200/70">
        <div class="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold">
          FL
        </div>
      <div>
          <p class="text-sm uppercase tracking-wide text-slate-500">Fast Lease</p>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        ${items
          .map((item) => {
            const isActive = activePath === item.href;
            const base = "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition";
            const active = isActive
              ? "bg-slate-900 text-white shadow-surface"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
            return `
              <a href="${basePath}${item.href}" class="${base} ${active}">
                <i data-lucide="${item.icon}" class="h-4 w-4"></i>
                <span>${item.label}</span>
              </a>
            `;
          })
          .join("")}
      </nav>
      <div class="px-6 py-5 border-t border-slate-200/70">
        ${renderProfileSection({ basePath, ...(profile || {}) })}
      </div>
    </div>
  `;
}

export function mountHeader({ containerId, title, breadcrumbs = [], basePath = "" }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="flex items-center text-xs text-slate-400 uppercase tracking-wide">${
            breadcrumbs.join(" · ") || ""
          }</div>
          <h1 class="text-2xl font-semibold text-slate-900">${title}</h1>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative hidden md:block">
            <i data-lucide="search" class="absolute left-3 top-2.5 h-4 w-4 text-slate-400"></i>
            <input id="global-search-input" type="text" class="w-56 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:ring-slate-900" placeholder="Глобальный поиск" />
          </div>
          <button class="notifications-btn relative inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:text-slate-900">
            <i data-lucide="bell" class="h-4 w-4"></i>
            <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">3</span>
          </button>
          <!-- Profile dropdown -->
          <div class="relative">
            <button id="profile-dropdown-btn" class="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
              <div class="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                МК
              </div>
              <i data-lucide="chevron-down" class="h-3 w-3"></i>
              <span class="mobile-notification-badge absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white hidden">3</span>
            </button>
            <!-- Dropdown menu -->
            <div id="profile-dropdown-menu" class="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50 hidden">
              <div class="py-1">
                <a href="${basePath}/profile/index.html" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <i data-lucide="user" class="h-4 w-4"></i>
                  Профиль
                </a>
                <a href="${basePath}/login/index.html" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <i data-lucide="log-out" class="h-4 w-4"></i>
                  Выйти
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add dropdown functionality
  const dropdownBtn = container.querySelector('#profile-dropdown-btn');
  const dropdownMenu = container.querySelector('#profile-dropdown-menu');
  
  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
      }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdownMenu.classList.add('hidden');
      }
    });
  }
}

export function enableGlobalSearch({ basePath = "" } = {}) {
  const input = document.getElementById('global-search-input');
  if (!input) return;

  const navigate = (href) => {
    window.location.href = `${basePath}${href}`;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = (input.value || '').trim().toLowerCase();
    try { localStorage.setItem('globalSearchQuery', input.value || ''); } catch {}

    if (!q) return navigate('/ops/deals/index.html');
    if (q.includes('максим кузьмин')) return navigate('/ops/clients/client-104/index.html');
    if (q.startsWith('fl-') || q.startsWith('app-')) return navigate('/ops/deals/index.html');
    if (q.includes('inv') || q.includes('инвойс')) return navigate('/client/invoices/index.html');
    if (q.includes('rolls') || q.includes('bentley') || q.includes('lamborghini') || q.includes('tesla') || q.includes('авто')) return navigate('/ops/cars/index.html');
    if (q.includes('клиент')) return navigate('/ops/clients/index.html');
    return navigate('/ops/deals/index.html');
  });
}

export function renderTable({ containerId, columns, data }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const headHtml = columns
    .map((column) => `<th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">${column.label}</th>`)
    .join("");

  const rowsHtml = data
    .map((row) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50/60">
        ${columns
          .map((column) => `<td class="px-4 py-3 text-sm text-slate-700">${
            typeof column.render === "function" ? column.render(row) : row[column.key] ?? "—"
          }</td>`)
          .join("")}
      </tr>
    `)
    .join("");

  container.innerHTML = `
    <div class="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <table class="min-w-full">
        <thead class="bg-slate-50/80">
          <tr>${headHtml}</tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

export function renderList({ containerId, items, renderItem }) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map(renderItem).join("");
}

export function initChart({ canvasId, config }) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return null;
  return new Chart(ctx, config);
}

export function initSortable(containerSelector, options = {}) {
  if (typeof Sortable === "undefined") return;
  const container = document.querySelector(containerSelector);
  if (!container) return;
  return Sortable.create(container, options);
}

export function applyIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function mountTimeline({ containerId, steps }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = steps
    .map((step, index) => {
      const stateClass = step.state ? ` timeline-step ${step.state}` : " timeline-step";
      return `
        <div class="relative pl-12 ${stateClass.trim()}">
          <div class="step-indicator absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold">${
            index + 1
          }</div>
          <div class="pb-6">
            <p class="text-sm font-semibold text-slate-800">${step.title}</p>
            <p class="text-sm text-slate-500">${step.description || ""}</p>
            ${step.meta || ""}
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderNotifications({ containerId, items }) {
  renderList({
    containerId,
    items,
    renderItem: (item) => `
      <div class="flex items-start gap-3 rounded-lg border border-slate-200/60 bg-white/80 px-4 py-3">
        <div class="mt-1 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
          <i data-lucide="${item.icon || "bell"}" class="h-4 w-4 text-slate-600"></i>
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between text-sm">
            <p class="font-medium text-slate-800">${item.title}</p>
            <span class="text-xs text-slate-400">${item.time}</span>
          </div>
          <p class="text-sm text-slate-500">${item.description}</p>
        </div>
      </div>
    `,
  });
}

export function bindTabs({ triggersSelector, panelsSelector }) {
  const triggers = document.querySelectorAll(triggersSelector);
  const panels = document.querySelectorAll(`${panelsSelector}:not(button)`);
  if (!triggers.length || !panels.length) return;

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const target = trigger.dataset.tab;
      triggers.forEach((btn) => btn.classList.remove("bg-slate-900", "text-white"));
      trigger.classList.add("bg-slate-900", "text-white");

      panels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.tab !== target);
      });
    });
  });
}

export function bindModal({ openSelector, modalId, closeSelector = "[data-close-modal]" }) {
  const modal = document.getElementById(modalId);
  const openers = document.querySelectorAll(openSelector);
  const closers = modal ? modal.querySelectorAll(closeSelector) : [];
  if (!modal) return;

  const open = () => modal.classList.remove("hidden");
  const close = () => modal.classList.add("hidden");

  openers.forEach((btn) => btn.addEventListener("click", open));
  closers.forEach((btn) => btn.addEventListener("click", close));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
}

// Навигационные конфигурации для разных ролей
export const clientNav = [
 { label: 'Дашборд', href: '/client/dashboard/index.html', icon: 'layout-dashboard' },
 { label: 'Мои сделки', href: '/client/deals/index.html', icon: 'files' },
 { label: 'Инвойсы', href: '/client/invoices/index.html', icon: 'credit-card' },
 { label: 'Поддержка', href: '/client/support/index.html', icon: 'life-buoy' },
];

export const investorNav = [
 { label: 'Дашборд', href: '/investor/dashboard/index.html', icon: 'chart-line' },
 { label: 'Мой портфель', href: '/investor/portfolio/index.html', icon: 'briefcase' },
 { label: 'Финансовые отчёты', href: '/investor/reports/index.html', icon: 'pie-chart' },
];

export const opsNav = [
  { label: 'Дашборд', href: '/ops/dashboard/index.html', icon: 'activity' },
  { label: 'Задачи', href: '/ops/tasks/index.html', icon: 'list-checks' },
  { label: 'Сделки', href: '/ops/deals/index.html', icon: 'kanban' },
  { label: 'Клиенты', href: '/ops/clients/index.html', icon: 'users' },
  { label: 'Автомобили', href: '/ops/cars/index.html', icon: 'car' },
];

export const adminNav = [
  { label: 'BPMN процессы', href: '/admin/bpm/index.html', icon: 'workflow' },
  { label: 'Пользователи', href: '/admin/users/index.html', icon: 'users' },
  { label: 'Интеграции', href: '/admin/integrations/index.html', icon: 'plug' },
];

export const mainNav = [
  { label: 'Home', href: '/index.html', icon: 'home' },
  { label: 'About', href: '/about/index.html', icon: 'info' },
  { label: 'Services', href: '/services/index.html', icon: 'settings' },
  { label: 'Contact', href: '/contact/index.html', icon: 'mail' },
];

export function mountMobileBottomNav({ containerId, items, activePath, basePath = "" }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="mobile-bottom-nav-container">
      ${items
        .slice(0, 5) // Limit to 5 items for mobile
        .map((item) => {
          const isActive = activePath === item.href;
          const activeClass = isActive ? 'active' : '';
          return `
            <a href="${basePath}${item.href}" class="mobile-nav-item ${activeClass}" data-nav-item="${item.href}">
              <i data-lucide="${item.icon}" class="mobile-nav-icon"></i>
              <span class="mobile-nav-label">${item.label}</span>
            </a>
          `;
        })
        .join("")}
    </div>
  `;

  // Add click handlers for smooth navigation
  const navItems = container.querySelectorAll('.mobile-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // Remove active class from all items
      navItems.forEach(navItem => navItem.classList.remove('active'));
      // Add active class to clicked item
      item.classList.add('active');
      
      // Optional: Add haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    });
  });

  // Update active state based on current page
  updateMobileNavActiveState(container, activePath);
}

export function updateMobileNavActiveState(container, currentPath) {
  if (!container) return;
  
  const navItems = container.querySelectorAll('.mobile-nav-item');
  navItems.forEach(item => {
    const itemPath = item.getAttribute('data-nav-item');
    if (itemPath === currentPath) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
