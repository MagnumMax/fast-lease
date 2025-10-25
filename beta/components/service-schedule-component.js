/**
 * Service Schedule Component
 * Компонент для отображения графика обслуживания и подтверждений
 */

export function createServiceScheduleComponent(data = {}) {
  const {
    title = 'Service schedule and confirmations',
    services = [],
    requiredSlots = [
      { key: 'front', label: 'Front' },
      { key: 'rear', label: 'Rear' },
      { key: 'left', label: 'Left side' },
      { key: 'right', label: 'Right side' },
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'sticker', label: 'Service sticker' },
    ],
    instructions = 'To confirm service, upload 6 photos: front, rear, left and right sides, dashboard, service sticker. JPG/PNG up to 10MB.'
  } = data;

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">${title}</h3>
      </div>
      <div id="services-list" class="mt-3 space-y-3"></div>
      <p class="mt-2 text-[11px] text-slate-500">${instructions}</p>
    </section>
  `;
}

export function mountServiceScheduleComponent(containerId, data = {}) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = createServiceScheduleComponent(data);
  }
}

export function updateServiceScheduleComponent(containerId, newData) {
  mountServiceScheduleComponent(containerId, newData);
}

export function renderServices(services = []) {
  const container = document.getElementById('services-list');
  if (!container) return;

  container.innerHTML = services
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map((service) => {
      const status = getServiceStatus(service);
      const filled = countFilledSlots(service.attachments || []);
      const ready = filled === 6;
      const dueMeta = `Due: ${formatDate(service.dueDate)}${service.mileageDue ? ' • ' + service.mileageDue.toLocaleString('en-US') + ' km' : ''}${service.completedAt ? ` • Completed: ${formatDate(service.completedAt)}` : ''}`;

      return `
        <div class="rounded-xl border border-slate-200 px-4 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-900">${service.name}</p>
              <p class="mt-0.5 text-xs text-slate-500">${dueMeta}</p>
              <p class="mt-1 text-[11px] text-slate-500">Photos: ${filled}/6</p>
            </div>
            ${statusBadge(status)}
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
            <button class="btn-open-service-modal inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-900" data-service-id="${service.id}">
              <i data-lucide="upload" class="h-4 w-4"></i>
              Upload 6 photos
            </button>
            ${service.completedAt ? '' : `
            <button class="btn-complete-service inline-flex items-center gap-2 rounded-lg ${ready ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-600/50 text-white cursor-not-allowed'} px-3 py-2 text-xs font-semibold" data-service-id="${service.id}" ${ready ? '' : 'disabled title="Add all 6 photos"'}>
              <i data-lucide="check-circle" class="h-4 w-4"></i>
              Mark as completed
            </button>
            `}
          </div>
          ${(Array.isArray(service.attachments) && service.attachments.length) ? `
            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" id="service-photos-${service.id}">
              ${service.attachments.map(attachment => {
                const slot = requiredSlots.find(s => s.key === attachment.slot);
                const label = slot ? slot.label : 'Photo';
                return `
                  <figure class="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src="${attachment.url}" alt="${label}" class="h-24 w-full object-cover" />
                    <figcaption class="px-2 py-1 text-[10px] text-slate-500">${label}</figcaption>
                  </figure>
                `;
              }).join('')}
            </div>
          ` : `<div class="mt-3" id="service-photos-${service.id}"></div>`}
        </div>
      `;
    })
    .join('');

  // Add event listeners for buttons
  const uploadBtns = container.querySelectorAll('.btn-open-service-modal');
  uploadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const serviceId = btn.getAttribute('data-service-id');
      openServicePhotoModal(serviceId, services);
    });
  });

  const completeBtns = container.querySelectorAll('.btn-complete-service');
  completeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const serviceId = btn.getAttribute('data-service-id');
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const filled = countFilledSlots(service.attachments || []);
      if (filled < 6) {
        openServicePhotoModal(serviceId, services);
        return;
      }

      service.completedAt = new Date().toISOString();
      renderServices(services);
    });
  });

  // Apply icons if function is available
  if (typeof applyIcons === 'function') {
    applyIcons();
  }
}

function getServiceStatus(service) {
  if (service.completedAt) return 'Completed';
  const due = new Date(service.dueDate);
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (due < todayMid) return 'Overdue';
  const days = Math.ceil((due - todayMid) / (1000 * 60 * 60 * 24));
  if (days <= 14) return 'Requires action';
  return 'Planned';
}

function countFilledSlots(attachments) {
  const requiredSlots = [
    { key: 'front', label: 'Front' },
    { key: 'rear', label: 'Rear' },
    { key: 'left', label: 'Left side' },
    { key: 'right', label: 'Right side' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'sticker', label: 'Service sticker' },
  ];

  return requiredSlots.filter(slot => attachments.some(a => a.slot === slot.key)).length;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function statusBadge(status) {
  const badges = {
    'Completed': '<span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">Completed</span>',
    'Overdue': '<span class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">Overdue</span>',
    'Requires action': '<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Requires action</span>',
    'Planned': '<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">Planned</span>',
  };
  return badges[status] || '';
}

function openServicePhotoModal(serviceId, services) {
  // This function would need to be implemented based on the modal logic
  // For now, it's a placeholder that can be extended
  console.log('Opening service photo modal for service:', serviceId);
}