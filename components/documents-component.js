/**
 * Documents Component
 * Компонент для отображения списка документов
 */

export function createDocumentsComponent(data = {}) {
  const {
    title = 'Documents',
    documents = [
      { title: 'Lease agreement', status: 'Signed on 12/12/2024' },
      { title: 'Payment schedule (update)', status: 'Version 02/2025' },
      { title: 'Delivery acceptance form', status: 'Signature pending' },
      { title: 'Registration Certificate (Mulkiya)', status: 'Valid until 12.12.2025' },
      { title: 'Insurance Policy', status: 'Version 2025' },
      { title: 'Inspection Protocol', status: 'Passed 01.2025' },
      { title: 'Vehicle Usage Rules', status: 'Current' }
    ]
  } = data;

  const documentsHtml = documents.map(doc => `
    <li class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
      <div>
        <p class="text-sm font-medium text-slate-900">${doc.title}</p>
        <p class="text-xs text-slate-500">${doc.status}</p>
      </div>
      <button aria-label="Download ${doc.title}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
        <i data-lucide="download" class="h-4 w-4" aria-hidden="true"></i>Download
      </button>
    </li>
  `).join('');

  return `
    <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">${title}</h2>
      </div>
      <ul id="combined-documents" class="mt-4 space-y-3">
        ${documentsHtml}
      </ul>
    </article>
  `;
}

export function mountDocumentsComponent(containerId, data = {}) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = createDocumentsComponent(data);
  }
}

export function updateDocuments(containerId, newDocuments) {
  const data = { documents: newDocuments };
  mountDocumentsComponent(containerId, data);
}

export function addDocument(containerId, newDocument) {
  const container = document.getElementById(containerId);
  if (container) {
    const documentsList = container.querySelector('#combined-documents');
    if (documentsList) {
      const newDocumentHtml = `
        <li class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <p class="text-sm font-medium text-slate-900">${newDocument.title}</p>
            <p class="text-xs text-slate-500">${newDocument.status}</p>
          </div>
          <button aria-label="Download ${newDocument.title}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
            <i data-lucide="download" class="h-4 w-4" aria-hidden="true"></i>Download
          </button>
        </li>
      `;
      documentsList.insertAdjacentHTML('beforeend', newDocumentHtml);
    }
  }
}