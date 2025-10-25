/**
 * Vehicle Component
 * Компонент для отображения информации об автомобиле
 */

export function createVehicleComponent(data = {}) {
  const {
    title = 'Vehicle',
    heading = '',
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

  const specsHtml = specs
    .map(
      (spec) => `
        <div class="rounded-xl bg-slate-50/80 p-3">
          <dt class="text-[11px] uppercase tracking-wide text-slate-400">${spec.label}</dt>
          <dd class="mt-1 text-sm font-semibold text-slate-900">${spec.value}</dd>
        </div>
      `,
    )
    .join('');

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div class="flex-1 space-y-6">
          <div class="space-y-4">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">${title}</p>
            <h1 class="text-3xl font-semibold leading-tight text-slate-900" data-vehicle-title>${heading}</h1>
            <p class="max-w-xl text-sm text-slate-600" data-vehicle-subtitle>${subtitle}</p>
          </div>

          <div class="border-y border-slate-200 py-4">
            <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-vehicle-specs>
              ${specsHtml}
            </dl>
          </div>
        </div>

        <figure class="relative w-full min-h-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm aspect-[4/3] lg:ml-auto lg:min-h-[260px] lg:w-[360px] xl:w-[420px]">
          <img data-vehicle-image src="${image}" alt="Vehicle" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        </figure>
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
  if (imgEl) {
    imgEl.src = image;
    if (title) {
      imgEl.alt = title;
    }
  }

  if (specsEl && specs) {
    specsEl.innerHTML = specs.map(spec => `
      <div class="rounded-xl bg-slate-50/80 p-3">
        <dt class="text-[11px] uppercase tracking-wide text-slate-400">${spec.label}</dt>
        <dd class="mt-1 text-sm font-semibold text-slate-900">${spec.value}</dd>
      </div>
    `).join('');
  }
}
