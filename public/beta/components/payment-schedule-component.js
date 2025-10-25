/**
 * Payment Schedule Component
 * Renders a payment schedule table with payment status and amounts
 */

export function createPaymentScheduleComponent({ 
  containerId, 
  data = [], 
  formatCurrency, 
  formatDate 
}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  // Define columns for the payment schedule table
  const columns = [
    { key: 'number', label: '#' },
    {
      key: 'dueDate',
      label: 'Date',
      render: (row) => formatDate(row.dueDate),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => formatCurrency(row.amount, 'AED'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const statusClass = row.status === 'Paid' 
          ? 'badge-success' 
          : row.status === 'Planned' 
            ? 'badge-info' 
            : 'badge-warning';
        return `<span class="badge ${statusClass}">${row.status}</span>`;
      },
    },
  ];

  // Create table HTML
  const tableHTML = `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200">
            ${columns.map(col => `<th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          ${data.map(row => `
            <tr class="hover:bg-slate-50">
              ${columns.map(col => `
                <td class="px-4 py-3 text-sm text-slate-900">
                  ${col.render ? col.render(row) : row[col.key]}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHTML;
}

// Default payment schedule data
export const defaultPaymentScheduleData = [
  { number: 13, dueDate: '2025-11-15', amount: 3260, status: 'Planned' },
  { number: 12, dueDate: '2025-01-15', amount: 3260, status: 'Overdue' },
  { number: 11, dueDate: '2024-12-15', amount: 3260, status: 'Paid' },
  { number: 10, dueDate: '2024-11-15', amount: 3260, status: 'Paid' },
  { number: 9, dueDate: '2024-10-15', amount: 3260, status: 'Paid' },
];