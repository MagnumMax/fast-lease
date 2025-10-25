/**
 * Key Information Component
 * Компонент для отображения ключевой информации о сделке
 */

export function createKeyInformationComponent(data = {}) {
  const {
    title = 'Key information',
    items = [
      { label: 'VIN', value: '5YJSA1E26LF123456' },
      { label: 'Program Term', value: '36 months' },
      { label: 'Issue Date', value: '12.12.2024' },
      { label: 'Mileage', value: '18 400 km' }
    ]
  } = data;

  const itemsHtml = items.map(item => `
    <div class="flex justify-between">
      <dt>${item.label}</dt>
      <dd>${item.value}</dd>
    </div>
  `).join('');

  return `
    <article class="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <h2 class="text-sm font-semibold text-slate-800">${title}</h2>
      <dl class="mt-4 space-y-3 text-sm text-slate-600">
        ${itemsHtml}
      </dl>
    </article>
  `;
}

export function mountKeyInformationComponent(containerId, data = {}) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = createKeyInformationComponent(data);
  }
}

export function updateKeyInformation(containerId, newData) {
  mountKeyInformationComponent(containerId, newData);
}