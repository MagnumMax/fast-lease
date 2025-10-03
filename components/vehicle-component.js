/**
 * Vehicle Component
 * Компонент для отображения информации об автомобиле
 */

export function createVehicleComponent(data = {}) {
  const {
    title = 'Vehicle',
    subtitle = 'Lease-to-own program for 36 months',
    image = '',
    specs = [
      { label: 'Year', value: '2024' },
      { label: 'Engine', value: '6.75L V12' },
      { label: 'Color', value: 'Arctic White' },
      { label: 'VIN', value: 'SAMPLEVIN123456789' },
      { label: 'Mileage', value: '18,420 km' },
      { label: 'Insurance', value: 'Valid until 12.12.2025' },
    ]
  } = data;

  const specsHtml = specs.map(spec => `
    <div class="grid grid-cols-[auto_1fr] items-start gap-3 border-b border-slate-200 pb-2">
      <dt class="text-xs text-slate-500 text-right pr-2">${spec.label}</dt>
      <dd class="text-sm font-medium text-slate-900 text-right">${spec.value}</dd>
    </div>
  `).join('');

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="grid gap-6 md:grid-cols-2 items-start">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-400">${title}</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-900" data-vehicle-title>—</h1>
          <p class="text-sm text-slate-600" data-vehicle-subtitle>${subtitle}</p>
        </div>

        <div>
          <figure class="h-48 md:h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <img data-vehicle-image src="${image}" alt="Vehicle" class="h-full w-full object-cover" loading="lazy" />
          </figure>
          <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-sm" data-vehicle-specs>
            ${specsHtml}
          </dl>
        </div>
      </div>
    </section>
  `;
}

export function mountVehicleComponent(containerId, data = {}) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = createVehicleComponent(data);
  }
}

export function updateVehicleComponent(containerId, newData) {
  mountVehicleComponent(containerId, newData);
}

export function updateVehicleData(title, subtitle, image, specs) {
  const titleEl = document.querySelector('[data-vehicle-title]');
  const subtitleEl = document.querySelector('[data-vehicle-subtitle]');
  const imgEl = document.querySelector('[data-vehicle-image]');
  const specsEl = document.querySelector('[data-vehicle-specs]');

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (imgEl) imgEl.src = image;

  if (specsEl && specs) {
    specsEl.innerHTML = specs.map(spec => `
      <div class="grid grid-cols-[auto_1fr] items-start gap-3 border-b border-slate-200 pb-2">
        <dt class="text-xs text-slate-500 text-right pr-2">${spec.label}</dt>
        <dd class="text-sm font-medium text-slate-900 text-right">${spec.value}</dd>
      </div>
    `).join('');
  }
}