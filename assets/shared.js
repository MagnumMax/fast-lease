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

export function mountHeader({ containerId, title, breadcrumbs = [] }) {
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
          <button class="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:text-slate-900">
            <i data-lucide="bell" class="h-4 w-4"></i>
            <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">3</span>
          </button>
        </div>
      </div>
    </div>
  `;
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
 { label: 'Каталог', href: '/index.html', icon: 'car' },
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
 { label: 'Клиенты', href: '/ops/clients/index.html', icon: 'users' },
 { label: 'Автомобили', href: '/ops/cars/index.html', icon: 'car' },
 { label: 'Сделки', href: '/ops/deals/index.html', icon: 'kanban' },
 { label: 'Задачи', href: '/ops/tasks/index.html', icon: 'list-checks' },
];

export const adminNav = [
 { label: 'BPMN процессы', href: '/admin/bpm/index.html', icon: 'workflow' },
 { label: 'Пользователи', href: '/admin/users/index.html', icon: 'users' },
 { label: 'Интеграции', href: '/admin/integrations/index.html', icon: 'plug' },
];
