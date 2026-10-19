import { X, Printer } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const STATUS_LABELS = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export default function InvoiceModal({ order, onClose, title = 'Invoice' }) {
  if (!order) return null;

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Please allow popups for this site to save PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHTML(order, title));
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto">

        {/* Toolbar */}
        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="font-black text-base">{title}</p>
            <p className="text-[11px] font-mono text-amir-dark/50 truncate">{order.id}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-xs transition-colors"
            >
              <Printer size={14} /> Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon w-9 h-9 hover:bg-rose-50 text-gray-400 hover:text-rose-500"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 sm:p-8">
          <InvoiceContent order={order} title={title} />
        </div>
      </div>
    </div>
  );
}

/* ─── On-screen content (unchanged from before) ─── */
function InvoiceContent({ order, title }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2 border-amir-dark/10">
        <div>
          <p className="text-2xl font-black text-amir-dark">AMIR BabyShop</p>
          <p className="text-xs text-amir-dark/60 mt-1 leading-relaxed">
            123 Baby Lane<br />
            Nairobi, Kenya<br />
            hello@amirbabyshop.com<br />
            +254 700 123 456
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amir-dark/50">
            {title}
          </p>
          <p className="font-mono font-black text-sm text-amir-dark mt-1">
            {order.id}
          </p>
          <p className="text-[11px] text-amir-dark/60 mt-2">
            {new Date(order.createdAt).toLocaleDateString([], {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
          <p className="text-[10px] text-amir-dark/50 mt-1 uppercase tracking-wider font-bold">
            {STATUS_LABELS[order.status] || order.status}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 py-6 border-b border-amir-dark/10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amir-dark/50 mb-2">
            Bill To
          </p>
          <p className="font-bold text-sm text-amir-dark">
            {order.customer?.name || 'Guest'}
          </p>
          {order.customer?.email && (
            <p className="text-xs text-amir-dark/70 mt-0.5">{order.customer.email}</p>
          )}
          {order.customer?.phone && (
            <p className="text-xs text-amir-dark/70 mt-0.5">{order.customer.phone}</p>
          )}
        </div>
        {order.customer?.address && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amir-dark/50 mb-2">
              Shipping Address
            </p>
            <p className="text-xs text-amir-dark/70 leading-relaxed">
              {order.customer.address}<br />
              {order.customer.city} {order.customer.zip}
            </p>
          </div>
        )}
      </div>

      <div className="py-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-amir-dark/10">
              <th className="text-left py-2 text-[10px] font-bold uppercase tracking-wider text-amir-dark/60">
                Item
              </th>
              <th className="text-center py-2 text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 w-16">
                Qty
              </th>
              <th className="text-right py-2 text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 w-24">
                Price
              </th>
              <th className="text-right py-2 text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 w-24">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i} className="border-b border-amir-dark/5">
                <td className="py-3 align-top">
                  <p className="text-xs font-bold text-amir-dark leading-tight">
                    {item.name}
                  </p>
                  {(item.size || item.color) && (
                    <p className="text-[10px] text-amir-dark/50 mt-0.5">
                      {[item.size, item.color].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </td>
                <td className="py-3 text-center text-xs font-bold text-amir-dark align-top">
                  {item.qty}
                </td>
                <td className="py-3 text-right text-xs text-amir-dark/70 align-top">
                  {formatCurrency(item.price)}
                </td>
                <td className="py-3 text-right text-xs font-black text-amir-dark align-top">
                  {formatCurrency(item.price * item.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-4 border-t-2 border-amir-dark/10">
        <div className="max-w-xs ml-auto space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-amir-dark/60 font-semibold">Subtotal</span>
            <span className="font-bold text-amir-dark">
              {formatCurrency(order.subtotal ?? 0)}
            </span>
          </div>

          {order.discount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-emerald-700 font-semibold">
                Discount
                {order.couponCode && (
                  <span className="ml-1 font-mono font-black text-[10px] text-emerald-800">
                    ({order.couponCode})
                  </span>
                )}
              </span>
              <span className="font-bold text-emerald-700">
                −{formatCurrency(order.discount)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 mt-2 border-t border-amir-dark/15 text-sm">
            <span className="font-black text-amir-dark">Total</span>
            <span className="font-black text-amir-dark">
              {formatCurrency(order.total ?? 0)}
            </span>
          </div>

                    {order.payment && (
            <div className="flex justify-between text-xs pt-1">
              <span className="text-amir-dark/60 font-semibold">Payment Method</span>
              <span className="font-bold text-amir-dark uppercase">
                {order.payment === 'cod' ? 'Cash on Delivery' : order.payment === 'momo' ? 'Mobile Money' : order.payment}
              </span>
            </div>
          )}

          {order.paymentStatus && (
            <div className="flex justify-between text-xs pt-1">
              <span className="text-amir-dark/60 font-semibold">Payment Status</span>
              <span className={`font-bold uppercase ${
                order.paymentStatus === 'paid' 
                  ? 'text-emerald-600' 
                  : order.paymentStatus === 'refunded'
                  ? 'text-rose-600'
                  : 'text-amber-600'
              }`}>
                {order.paymentStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-amir-dark/10 text-center">
        <p className="text-sm font-black text-amir-dark">
          Thank you for shopping with AMIR BabyShop!
        </p>
        <p className="text-[11px] text-amir-dark/60 mt-1">
          Questions? Call us on +254724059049
        </p>
        <p className="text-[10px] text-amir-dark/40 mt-3">
          This document serves as your official {title.toLowerCase()}.
        </p>
      </div>
    </>
  );
}

/* ─── Standalone HTML for print window ─── */
function buildPrintHTML(order, title) {
  const items = (order.items || [])
    .map(item => `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${(item.size || item.color)
            ? `<div class="item-variant">${escapeHtml([item.size, item.color].filter(Boolean).join(' · '))}</div>`
            : ''}
        </td>
        <td class="center">${item.qty}</td>
        <td class="right">${escapeHtml(formatCurrency(item.price))}</td>
        <td class="right bold">${escapeHtml(formatCurrency(item.price * item.qty))}</td>
      </tr>
    `)
    .join('');

  const discountRow = order.discount > 0
    ? `
      <div class="totals-row discount">
        <span>Discount${order.couponCode ? ` <span class="coupon">(${escapeHtml(order.couponCode)})</span>` : ''}</span>
        <span>−${escapeHtml(formatCurrency(order.discount))}</span>
      </div>`
    : '';

    const paymentRow = order.payment
    ? `
      <div class="totals-row" style="margin-top: 6px;">
        <span class="muted">Payment Method</span>
        <span class="bold uppercase">${escapeHtml(
          order.payment === 'cod' ? 'Cash on Delivery' : 
          order.payment === 'momo' ? 'Mobile Money' : 
          order.payment
        )}</span>
      </div>`
    : '';

  const paymentStatusRow = order.paymentStatus
    ? `
      <div class="totals-row">
        <span class="muted">Payment Status</span>
        <span class="bold uppercase" style="color: ${
          order.paymentStatus === 'paid' ? '#059669' : 
          order.paymentStatus === 'refunded' ? '#e11d48' : 
          '#d97706'
        }">${escapeHtml(order.paymentStatus)}</span>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(order.id)} — ${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #2D2A32;
      background: #fff;
      padding: 40px 32px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.5;
      font-size: 13px;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e5e5e5; }
    .brand-name { font-size: 22px; font-weight: 900; }
    .brand-info { font-size: 11px; color: #666; margin-top: 6px; line-height: 1.7; }
    .meta { text-align: right; }
    .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #999; }
    .order-id { font-family: ui-monospace, Menlo, monospace; font-weight: 900; font-size: 15px; margin-top: 4px; }
    .meta-date { font-size: 11px; color: #666; margin-top: 8px; }
    .meta-status { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #999; margin-top: 4px; }
    .bill-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 0; border-bottom: 1px solid #e5e5e5; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 8px; }
    .customer-name { font-weight: 700; font-size: 14px; }
    .customer-info { font-size: 12px; color: #666; margin-top: 3px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { text-align: left; padding: 10px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; border-bottom: 2px solid #e5e5e5; font-weight: 700; }
    th.center, td.center { text-align: center; }
    th.right, td.right { text-align: right; }
    td { padding: 12px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    td.bold { font-weight: 700; }
    .item-name { font-weight: 700; color: #2D2A32; }
    .item-variant { font-size: 10px; color: #888; margin-top: 3px; }
    .totals { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e5e5; width: 280px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; }
    .totals-row .muted { color: #666; font-weight: 600; }
    .totals-row .bold { font-weight: 700; }
    .totals-row.discount { color: #059669; }
    .totals-row.discount .coupon { font-family: ui-monospace, Menlo, monospace; font-size: 10px; font-weight: 900; }
    .totals-row.grand { font-size: 15px; font-weight: 900; border-top: 1px solid #e5e5e5; margin-top: 10px; padding-top: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; }
    .footer .thanks { font-weight: 900; font-size: 14px; }
    .footer .contact { font-size: 11px; color: #666; margin-top: 4px; }
    .footer .legal { font-size: 10px; color: #aaa; margin-top: 12px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">AMIR BabyShop</div>
      <div class="brand-info">
        123 Baby Lane<br>
        Nairobi, Kenya<br>
        hello@amirbabyshop.com<br>
        +254 700 123 456
      </div>
    </div>
    <div class="meta">
      <div class="meta-label">${escapeHtml(title)}</div>
      <div class="order-id">${escapeHtml(order.id)}</div>
      <div class="meta-date">${escapeHtml(new Date(order.createdAt).toLocaleDateString([], {
        month: 'long', day: 'numeric', year: 'numeric',
      }))}</div>
      <div class="meta-status">${escapeHtml(STATUS_LABELS[order.status] || order.status)}</div>
    </div>
  </div>

  <div class="bill-section">
    <div>
      <div class="section-label">Bill To</div>
      <div class="customer-name">${escapeHtml(order.customer?.name || 'Guest')}</div>
      ${order.customer?.email ? `<div class="customer-info">${escapeHtml(order.customer.email)}</div>` : ''}
      ${order.customer?.phone ? `<div class="customer-info">${escapeHtml(order.customer.phone)}</div>` : ''}
    </div>
    ${order.customer?.address ? `
      <div>
        <div class="section-label">Shipping Address</div>
        <div class="customer-info">${escapeHtml(order.customer.address)}<br>${escapeHtml(order.customer.city || '')} ${escapeHtml(order.customer.zip || '')}</div>
      </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="center" style="width:70px">Qty</th>
        <th class="right" style="width:100px">Price</th>
        <th class="right" style="width:100px">Total</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>

    <div class="totals">
    <div class="totals-row">
      <span class="muted">Subtotal</span>
      <span class="bold">${escapeHtml(formatCurrency(order.subtotal ?? 0))}</span>
    </div>
    ${discountRow}
    <div class="totals-row grand">
      <span>Total</span>
      <span>${escapeHtml(formatCurrency(order.total ?? 0))}</span>
    </div>
    ${paymentRow}
    ${paymentStatusRow}
  </div>

  <div class="footer">
    <div class="thanks">Thank you for shopping with AMIR BabyShop!</div>
    <div class="contact">Questions? Email us at hello@amirbabyshop.com</div>
    <div class="legal">This document serves as your official ${escapeHtml(title.toLowerCase())}.</div>
  </div>

  <script>
    // Auto-focus and let user choose Save as PDF
    window.onload = () => {
      setTimeout(() => window.print(), 200);
    };
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}