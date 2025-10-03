/**
 * Deal Component
 * Компонент для отображения информации о сделке
 */

export function createDealComponent(data = {}) {
  const {
    dealId = 'FL-2025-1042',
    vehicleName = 'Rolls-Royce Cullinan',
    status = 'Active',
    description = 'Lease-to-own program for 36 months. Created on December 12, 2024.',
    imageUrl = '../../assets/images/rolls-royce-cullinan-exterior.jpg',
    imageAlt = 'Rolls-Royce Cullinan',
    monthlyPayment = '—',
    nextPayment = '—',
    dueAmount = '—'
  } = data;

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="grid gap-6 md:grid-cols-[1fr_320px] md:grid-rows-[auto_1fr] items-stretch">
        <!-- Left: title/subtitle -->
        <div>
          <div class="flex items-center gap-2">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Deal</p>
            <span class="badge badge-success">${status}</span>
          </div>
          <h1 class="mt-2 text-2xl font-semibold text-slate-900">${dealId} · ${vehicleName}</h1>
          <p class="text-sm text-slate-600">${description}</p>
        </div>

        <!-- Mobile image -->
        <div class="md:hidden">
          <figure class="h-40 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <img
              src="${imageUrl}"
              alt="${imageAlt}"
              class="h-full w-full object-cover"
              loading="lazy"
              onerror="this.src='https://placehold.co/560x320?text=No+Image'"
            />
          </figure>
        </div>

        <!-- Right: image spans full block height on desktop -->
        <div class="hidden md:block row-span-2">
          <figure class="h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <img
              src="${imageUrl}"
              alt="${imageAlt}"
              class="h-full w-full object-cover"
              loading="lazy"
              onerror="this.src='https://placehold.co/560x320?text=No+Image'"
            />
          </figure>
        </div>

        <!-- Bottom-left: KPI cards -->
        <div class="grid gap-3 grid-cols-3">
          <div class="rounded-xl bg-slate-50/80 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Monthly payment</p>
            <p class="mt-1 text-sm font-semibold text-slate-900" id="deal-payment">${monthlyPayment}</p>
          </div>
          <div class="rounded-xl bg-slate-50/80 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Next payment</p>
            <p class="mt-1 text-sm font-semibold text-slate-900" id="deal-next-payment">${nextPayment}</p>
          </div>
          <div class="rounded-xl bg-slate-50/80 p-3">
            <p class="text-[11px] uppercase tracking-wide text-slate-400">Due amount</p>
            <p class="mt-1 text-sm font-semibold text-red-600" id="deal-remaining">${dueAmount}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function mountDealComponent(containerId, data = {}) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = createDealComponent(data);
  }
}

export function updateDealKPIs(monthlyPayment, nextPayment, dueAmount) {
  const dpEl = document.getElementById('deal-payment');
  const npEl = document.getElementById('deal-next-payment');
  const drEl = document.getElementById('deal-remaining');
  
  if (dpEl) dpEl.textContent = monthlyPayment;
  if (npEl) npEl.textContent = nextPayment;
  if (drEl) drEl.textContent = dueAmount;
}