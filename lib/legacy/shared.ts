// @ts-nocheck
/* eslint-disable */

export function formatCurrency(value, currency = "AED") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export async function loadPricing(basePath = "") {
  try {
    const res = await fetch(`${basePath}/pricing.json`);
    if (!res.ok) throw new Error(`Failed to load pricing: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('Pricing load failed, falling back:', e);
    return {};
  }
}

export function formatDate(value) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(value));
}

export function statusBadge(status) {
  const normalized = status.toLowerCase();
  let tone = "badge-info";
  if (["paid", "closed", "active", "completed", "ready"].includes(normalized)) tone = "badge-success";
  if (["pending", "in progress", "requires action", "delivery", "contract signing", "awaiting payment"].includes(normalized)) tone = "badge-warning";
  if (["overdue", "rejected", "error"].includes(normalized)) tone = "badge-danger";
  return `<span class="badge ${tone}">${status}</span>`;
}

export function renderProfileSection({
  basePath = "",
  avatarInitials = "MK",
  profileHref,
  logoutHref,
  profileLabel = "Profile Settings",
  logoutLabel = "Sign out",
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
          <p class="text-sm font-semibold text-slate-900">Your Profile</p>
          <p class="text-xs text-slate-500">Quick actions</p>
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
      <nav class="flex-1 overflow-y-auto px-4 py-6 space-y-2" role="navigation" aria-label="Sidebar">
        ${items
          .map((item) => {
            const isActive = activePath === item.href;
            const base = "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition";
            const active = isActive
              ? "bg-slate-900 text-white shadow-surface"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
            const ariaCurrent = isActive ? ' aria-current="page"' : '';
            return `
              <a href="${basePath}${item.href}" class="${base} ${active} focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"${ariaCurrent}>
                <i data-lucide="${item.icon}" class="h-4 w-4" aria-hidden="true"></i>
                <span>${item.label}</span>
              </a>
            `;
          })
          .join("")}
      </nav>
    </div>
  `;
}

export function mountHeader({ containerId, title, breadcrumbs = [], basePath = "", icon, items, activePath }) {
  const pathnameRaw = typeof window !== "undefined" && window.location ? window.location.pathname : "";
  const normalizedPath = (activePath || pathnameRaw || "").replace(/\/{2,}/g, "/");
  if (!items) {
    // Determine menu by absolute path, ignoring basePath
    if (normalizedPath.startsWith("/ops/")) {
      items = typeof opsNav !== "undefined" ? opsNav : items;
    } else if (normalizedPath.startsWith("/admin/")) {
      items = typeof adminNav !== "undefined" ? adminNav : items;
    } else if (normalizedPath.startsWith("/investor/")) {
      items = typeof investorNav !== "undefined" ? investorNav : items;
    } else if (normalizedPath.startsWith("/client/")) {
      items = typeof clientNav !== "undefined" ? clientNav : items;
    } else if (typeof mainNav !== "undefined") {
      items = mainNav;
    }
  }
  // Active path is always normalized
  activePath = normalizedPath;
  const container = document.getElementById(containerId);
  if (!container) return;

  // Resolve icon: explicit prop -> exact match -> prefix match -> mapped root
  let resolvedIcon = icon;
  if (!resolvedIcon && Array.isArray(items)) {
    const exact = items.find((i) => i.href === activePath)?.icon;
    if (exact) {
      resolvedIcon = exact;
    } else {
      // Try prefix match against menu hrefs (to cover detail pages)
      const prefixMatch = items.find((i) => activePath.startsWith(i.href))?.icon;
      if (prefixMatch) {
        resolvedIcon = prefixMatch;
      } else {
        // Map common section prefixes to root menu items
        const iconBySection = (() => {
          const path = activePath || normalizedPath;
          const maps = [
            { startsWith: "/ops/clients/", root: "/ops/clients/index.html" },
            { startsWith: "/ops/deals/", root: "/ops/deals/index.html" },
            { startsWith: "/ops/sellers/", root: "/ops/sellers/index.html" },
            { startsWith: "/ops/cars/", root: "/ops/cars/index.html" },
            { startsWith: "/client/deals/", root: "/client/deals/index.html" },
            { startsWith: "/client/invoices/", root: "/client/invoices/index.html" },
            { startsWith: "/investor/assets/", root: "/investor/portfolio/index.html" },
          ];
          const map = maps.find(m => path.startsWith(m.startsWith));
          if (map) {
            return items.find(i => i.href === map.root)?.icon;
          }
          return undefined;
        })();
        if (iconBySection) {
          resolvedIcon = iconBySection;
        }
      }
    }
  }

  container.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          ${resolvedIcon ? `<i data-lucide="${resolvedIcon}" class="h-5 w-5 text-slate-500"></i>` : ''}
          <h1 class="text-2xl font-semibold text-slate-900">${title}</h1>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative hidden md:block">
            <i data-lucide="search" class="absolute left-3 top-2.5 h-4 w-4 text-slate-400"></i>
            <input id="global-search-input" type="text" class="w-56 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:ring-slate-900" placeholder="Global search" aria-label="Global search" />
          </div>
          <!-- Profile dropdown -->
          <div class="relative">
            <button id="profile-dropdown-btn" class="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2" aria-haspopup="menu" aria-expanded="false" aria-label="Open profile menu">
              <div class="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                MK
              </div>
              <i data-lucide="chevron-down" class="h-3 w-3" aria-hidden="true"></i>
              <span class="notification-badge absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">3</span>
            </button>
            <!-- Dropdown menu -->
            <div id="profile-dropdown-menu" class="absolute right-0 mt-2 min-w-[16rem] w-max rounded-lg border border-slate-200 bg-white shadow-lg z-50 hidden" role="menu" aria-label="Profile menu">
              <div class="py-1">
                <a href="${basePath}/profile/index.html" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap" role="menuitem">
                  <i data-lucide="user" class="h-4 w-4" aria-hidden="true"></i>
                  Profile
                </a>
                <a href="#" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap" role="menuitem">
                  <i data-lucide="bell" class="h-4 w-4" aria-hidden="true"></i>
                  Notifications
                </a>
                <a href="https://wa.me/971504831277" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 whitespace-nowrap" role="menuitem">
                  <i data-lucide="message-circle" class="h-4 w-4" aria-hidden="true"></i>
                  Contact via WhatsApp
                </a>
                <a href="${basePath}/login/index.html" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap" role="menuitem">
                  <i data-lucide="log-out" class="h-4 w-4" aria-hidden="true"></i>
                  Sign out
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ensure icons render in header
  try { applyIcons(); } catch {}

  // Add dropdown functionality
  const dropdownBtn = container.querySelector('#profile-dropdown-btn');
  const dropdownMenu = container.querySelector('#profile-dropdown-menu');
  
  if (dropdownBtn && dropdownMenu) {
    const menuItems = Array.from(dropdownMenu.querySelectorAll('[role="menuitem"]'));
    menuItems.forEach(mi => mi.setAttribute('tabindex', '-1'));

    const openDropdown = () => {
      dropdownMenu.classList.remove('hidden');
      dropdownBtn.setAttribute('aria-expanded', 'true');
      const first = menuItems[0];
      if (first) first.focus();
    };
    const closeDropdown = () => {
      dropdownMenu.classList.add('hidden');
      dropdownBtn.setAttribute('aria-expanded', 'false');
      dropdownBtn.focus();
    };

    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = dropdownMenu.classList.contains('hidden');
      if (willOpen) openDropdown(); else closeDropdown();
    });

    // Keyboard support on button
    dropdownBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dropdownMenu.classList.remove('hidden');
        dropdownBtn.setAttribute('aria-expanded', 'true');
        const last = menuItems[menuItems.length - 1];
        if (last) last.focus();
      }
    });

    // Roving focus inside menu
    dropdownMenu.addEventListener('keydown', (e) => {
      const currentIndex = menuItems.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex >= 0 ? (currentIndex + 1) % menuItems.length : 0;
        menuItems[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        menuItems[prev].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        menuItems[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close dropdown on escape key globally
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdownMenu.classList.add('hidden');
        dropdownBtn.setAttribute('aria-expanded', 'false');
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
    if (q.includes('maksym holovakhin')) return navigate('/ops/clients/client-104/index.html');
    if (q.startsWith('fl-') || q.startsWith('app-')) return navigate('/ops/deals/index.html');
    if (q.includes('inv') || q.includes('invoice')) return navigate('/client/invoices/index.html');
    if (q.includes('rolls') || q.includes('bentley') || q.includes('lamborghini') || q.includes('tesla') || q.includes('car')) return navigate('/ops/cars/index.html');
    if (q.includes('client')) return navigate('/ops/clients/index.html');
    return navigate('/ops/deals/index.html');
  });
}

export function renderTable({ containerId, columns, data }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const headHtml = columns
    .map((column) => `<th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">${column.label}</th>`)
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
  try {
    document.querySelectorAll('i[data-lucide]').forEach(el => {
      if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
      el.setAttribute('focusable', 'false');
    });
  } catch {}
}

export function mountTimeline({ containerId, steps }) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.setAttribute('role', 'list');
  if (!container.getAttribute('aria-label')) {
    container.setAttribute('aria-label', 'Application timeline');
  }

  container.innerHTML = steps
    .map((step, index) => {
      const stateClass = step.state ? ` timeline-step ${step.state}` : " timeline-step";
      const ariaCurrent = step.state === 'current' ? ' aria-current="step"' : '';
      return `
        <div role="listitem" class="relative pl-12 ${stateClass.trim()}"${ariaCurrent}>
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
  const c = document.getElementById(containerId);
  if (c) {
    c.setAttribute('role', 'region');
    c.setAttribute('aria-live', 'polite');
    c.setAttribute('aria-atomic', 'false');
  }
  renderList({
    containerId,
    items,
    renderItem: (item) => `
      <div class="flex items-start gap-3 rounded-lg border border-slate-200/60 bg-white/80 px-4 py-3">
        <div class="mt-1 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
          <i data-lucide="${item.icon || "bell"}" class="h-4 w-4 text-slate-600" aria-hidden="true"></i>
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

  // Landmark and visibility
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');

  // Identify panel and title/description for aria associations
  const panel = modal.querySelector(':scope > div') || modal.querySelector('div');
  if (panel) panel.setAttribute('tabindex', '-1');
  const titleEl = panel ? panel.querySelector('h1, h2, h3') : null;
  if (titleEl) {
    if (!titleEl.id) titleEl.id = `${modalId}-title`;
    modal.setAttribute('aria-labelledby', titleEl.id);
  }
  const descEl = panel ? panel.querySelector('p, form') : null;
  if (descEl) {
    if (!descEl.id) descEl.id = `${modalId}-desc`;
    modal.setAttribute('aria-describedby', descEl.id);
  }

  // Focus management
  let lastFocused = null;
  const focusableSelector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const getFocusable = () => Array.from(panel ? panel.querySelectorAll(focusableSelector) : []);

  const trapKeydown = (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key !== 'Tab') return;
    const f = getFocusable();
    if (!f.length) { e.preventDefault(); panel?.focus(); return; }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) { e.preventDefault(); last.focus(); }
    } else {
      if (active === last) { e.preventDefault(); first.focus(); }
    }
  };

  const open = () => {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const focusables = getFocusable();
    (focusables[0] || panel)?.focus();
    document.addEventListener('keydown', trapKeydown);
  };
  const close = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', trapKeydown);
    if (lastFocused) { try { lastFocused.focus(); } catch {} }
  };

  openers.forEach((btn) => btn.addEventListener('click', () => { lastFocused = btn; open(); }));
  closers.forEach((btn) => btn.addEventListener('click', close));
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
}

// Navigation configurations for different roles
export const clientNav = [
  { label: 'Dashboard', href: '/client/dashboard/index.html', icon: 'layout-dashboard' },
  { label: 'My Vehicle', href: '/client/my-vehicle/index.html', icon: 'car' },
  { label: 'Payments', href: '/client/invoices/index.html', icon: 'credit-card' },
  { label: 'Referrals', href: '/client/referrals/index.html', icon: 'users' },
  // { label: 'New Application', href: '/application/new/index.html', icon: 'file-plus' },
  { label: 'Support', href: '/client/support/index.html', icon: 'life-buoy' },
];

export const investorNav = [
  { label: 'Dashboard', href: '/investor/dashboard/index.html', icon: 'chart-line' },
  { label: 'Portfolio', href: '/investor/portfolio/index.html', icon: 'briefcase' },
  { label: 'Financial Reports', href: '/investor/reports/index.html', icon: 'pie-chart' },
];

export const opsNav = [
  { label: 'Dashboard', href: '/ops/dashboard/index.html', icon: 'activity' },
  { label: 'Tasks', href: '/ops/tasks/index.html', icon: 'list-checks' },
  { label: 'Deals', href: '/ops/deals/index.html', icon: 'kanban' },
  { label: 'Clients', href: '/ops/clients/index.html', icon: 'users' },
  { label: 'Vehicles', href: '/ops/cars/index.html', icon: 'car' },
];

export const adminNav = [
  { label: 'BPMN Processes', href: '/admin/bpm/index.html', icon: 'workflow' },
  { label: 'Users', href: '/admin/users/index.html', icon: 'users' },
  { label: 'Integrations', href: '/admin/integrations/index.html', icon: 'plug' },
];

export const mainNav = [
  { label: 'Home', href: '/index.html', icon: 'home' },
  { label: 'About', href: '/about/index.html', icon: 'info' },
  { label: 'Services', href: '/services/index.html', icon: 'settings' },
  { label: 'Contact', href: '/contact/index.html', icon: 'mail' },
];

// Function to add "Back to list" button on detail pages
export function mountBackToListButton({ containerId, listHref, label = "Back to list" }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const buttonHtml = `
    <div class="mb-6">
      <a href="${listHref}" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-900 hover:bg-slate-50 hover:text-slate-900 transition-colors">
        <i data-lucide="arrow-left" class="h-4 w-4"></i>
        ${label}
      </a>
    </div>
  `;

  container.insertAdjacentHTML('afterbegin', buttonHtml);
}

export function applyGlobalAccessibilityAndUI() {
  try {
    // Focus styles for interactive elements
    document.querySelectorAll('a, button, input, select, textarea').forEach(el => {
      const cls = 'focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2';
      if (!el.className || !el.className.includes('focus:ring-')) {
        el.classList.add('focus:outline-none', 'focus:ring-2', 'focus:ring-slate-500', 'focus:ring-offset-2');
      }
    });

    // Icons should be hidden from screen readers
    document.querySelectorAll('i[data-lucide]').forEach(el => {
      if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
      el.setAttribute('focusable', 'false');
    });

    // Ensure main landmark and skip link
    const mainEl = document.querySelector('main');
    if (mainEl) {
      if (!mainEl.hasAttribute('role')) mainEl.setAttribute('role', 'main');
      if (!mainEl.id) mainEl.id = 'main-content';
    }
    const hasSkipLink = !!document.querySelector('a.skip-link[href="#main-content"]');
    if (!hasSkipLink && document.body) {
      const skip = document.createElement('a');
      skip.href = '#main-content';
      skip.className = 'skip-link sr-only focus:not-sr-only fixed top-2 left-2 z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-slate-500';
      skip.textContent = 'Skip to main content';
      document.body.prepend(skip);
    }

    // Notifications containers
    const notif = document.getElementById('notifications');
    if (notif) {
      notif.setAttribute('role', 'region');
      notif.setAttribute('aria-live', 'polite');
      notif.setAttribute('aria-atomic', 'false');
    }

    // Download buttons
    document.querySelectorAll('[data-action="download"], button, a').forEach(el => {
      const hasIcon = el.querySelector && el.querySelector('i[data-lucide="download"]');
      if (hasIcon && !el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', 'Download');
      }
    });

    // Mark active links as current
    document.querySelectorAll('a.active').forEach(a => {
      a.setAttribute('aria-current', 'page');
    });
  } catch {}
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    try { applyGlobalAccessibilityAndUI(); } catch {}
  });
}
// @ts-nocheck
/* eslint-disable */
