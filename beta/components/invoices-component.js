/**
 * Invoices Component
 * Renders invoices table with filtering capabilities and mobile cards view
 */

export function createInvoicesComponent({ 
  containerId, 
  data = [], 
  formatCurrency, 
  formatDate, 
  statusBadge,
  renderTable 
}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  // Create the component HTML structure
  const componentHTML = `
    <div class="mt-6 flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="relative">
          <i data-lucide="search" class="absolute left-3 top-2.5 h-4 w-4 text-slate-400"></i>
          <input id="invoice-filter-search" type="text" class="w-64 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:ring-slate-900" placeholder="Search (number/date)" />
        </div>
        <select id="invoice-filter-status" class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="">All statuses</option>
          <option>Paid</option>
          <option>Awaiting Payment</option>
        </select>
      </div>
      <div class="mt-4 hidden md:block" id="invoice-table"></div>
      <div class="mt-4 md:hidden space-y-4" id="invoice-cards"></div>
    </div>
  `;

  container.innerHTML = componentHTML;

  // Initialize filters
  const invoiceFilters = { query: '', status: '' };

  // Filter and render function
  function applyInvoiceFilters() {
    const q = (invoiceFilters.query || '').toLowerCase();
    const status = invoiceFilters.status || '';
    const filtered = data.filter(inv =>
      (!q || inv.id.toLowerCase().includes(q) || formatDate(inv.dueDate).toLowerCase().includes(q) || (inv.purpose || '').toLowerCase().includes(q)) &&
      (!status || inv.status === status)
    );

    // Render table for desktop
    renderTable({
      containerId: 'invoice-table',
      columns: [
        { key: 'id', label: 'Invoice', render: (row) => `<a href="${row.link}" class="text-slate-900 hover:underline">${row.id}</a>` },
        { key: 'dueDate', label: 'Date', render: (row) => formatDate(row.dueDate) },
        { key: 'purpose', label: 'Purpose', render: (row) => `${row.purpose || '—'}` },
        { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount, 'AED') },
        { key: 'status', label: 'Status', render: (row) => statusBadge(row.status) },
      ],
      data: filtered,
    });

    // Render cards for mobile
    renderInvoiceCards(filtered);
  }

  // Mobile cards renderer
  function renderInvoiceCards(filteredData) {
    const cardsContainer = document.getElementById('invoice-cards');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = filteredData
      .map(
        (row) => `
        <a href="${row.link}" class="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">${row.id}</p>
              <p class="text-sm text-slate-500">${formatDate(row.dueDate)}</p>
            </div>
            ${statusBadge(row.status)}
          </div>
          <p class="mt-3 text-xs text-slate-500">Purpose: ${row.purpose || '—'}</p>
          <p class="mt-3 text-xs text-slate-500">Amount: ${formatCurrency(row.amount, 'AED')}</p>
        </a>
      `
      )
      .join('');
  }

  // Set up event listeners
  const searchInput = document.getElementById('invoice-filter-search');
  const statusSelect = document.getElementById('invoice-filter-status');

  if (searchInput) {
    searchInput.addEventListener('input', () => { 
      invoiceFilters.query = searchInput.value; 
      applyInvoiceFilters(); 
    });
    searchInput.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter') applyInvoiceFilters(); 
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => { 
      invoiceFilters.status = statusSelect.value; 
      applyInvoiceFilters(); 
    });
  }

  // Initial render
  applyInvoiceFilters();

  // Return public API
  return {
    refresh: applyInvoiceFilters,
    updateData: (newData) => {
      data = newData;
      applyInvoiceFilters();
    }
  };
}

// Default invoices data
export const defaultInvoicesData = [
  { id: 'INV-2025-013', dueDate: '2025-11-15', amount: 3260, status: 'Awaiting Payment', purpose: 'Monthly Lease Payment', link: '../../client/invoices/invoice-2024-001/index.html' },
  { id: 'INV-2025-012', dueDate: '2025-01-15', amount: 3260, status: 'Paid', purpose: 'Monthly Lease Payment', link: '../../client/invoices/invoice-2024-001/index.html' },
  { id: 'INV-2024-011', dueDate: '2024-12-15', amount: 3260, status: 'Paid', purpose: 'Monthly lease payment', link: '../../client/invoices/invoice-2024-001/index.html' },
  { id: 'INV-2024-010', dueDate: '2024-11-15', amount: 3260, status: 'Paid', purpose: 'Monthly lease payment', link: '../../client/invoices/invoice-2024-001/index.html' },
  { id: 'INV-2024-009', dueDate: '2024-10-15', amount: 3260, status: 'Paid', purpose: 'Monthly lease payment', link: '../../client/invoices/invoice-2024-001/index.html' },
  { id: 'FINE-2025-021', dueDate: '2025-09-28', amount: 500, status: 'Awaiting Payment', purpose: 'Dubai Police fine', link: '../../client/invoices/invoice-2024-001/index.html' },
  { id: 'SALIK-2025-045', dueDate: '2025-09-26', amount: 16, status: 'Paid', purpose: 'Salik toll charge', link: '../../client/invoices/invoice-2024-001/index.html' },
];