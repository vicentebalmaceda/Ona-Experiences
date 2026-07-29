import type { QuoteNotification } from '../types.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUnixDate(unix?: number): string | undefined {
  if (unix == null || !Number.isFinite(unix)) return undefined;
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function formatMoney(value?: number): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return value.toLocaleString('es-CL');
}

function customerName(data: QuoteNotification): string {
  const first = data.customer?.firstName?.trim() ?? '';
  const last = data.customer?.lastName?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  return full || 'Cliente';
}

export function quoteEmailSubject(data: QuoteNotification): string {
  const number = data.documentNumber != null ? `#${data.documentNumber}` : `id ${data.documentId}`;
  const fromNote = data.items?.find((item) => item.description)?.description;
  const label = fromNote || customerName(data);
  return `Nueva cotización ${number} — ${label}`;
}

function itemsHtml(data: QuoteNotification): string {
  const items = data.items ?? [];
  if (items.length === 0) {
    return '<p><em>Sin detalle de ítems en la respuesta de BSale.</em></p>';
  }

  return items
    .map((item, index) => {
      const title = escapeHtml(item.description ?? `Ítem ${index + 1}`);
      const qty = item.quantity != null ? String(item.quantity) : '—';
      const unit = formatMoney(item.netUnitValue) ?? '—';
      const total = formatMoney(item.totalAmount) ?? '—';
      const note = item.note?.trim();

      return `<div style="margin-top:16px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <p style="margin:0 0 8px;"><strong>${title}</strong></p>
        <p style="margin:0;">Cantidad: ${qty} · Neto unit.: ${unit} · Total: ${total}</p>
        ${
          note
            ? `<p style="margin:12px 0 0;"><strong>Detalle de la cotización:</strong></p>
        <pre style="margin:8px 0 0;white-space:pre-wrap;font-family:inherit;background:#f8fafc;padding:12px;border-radius:6px;">${escapeHtml(note)}</pre>`
            : ''
        }
      </div>`;
    })
    .join('');
}

export function quoteEmailHtml(data: QuoteNotification): string {
  const emission = formatUnixDate(data.emissionDate);
  const customer = data.customer;
  const links: string[] = [];
  if (data.urlPublicView) {
    links.push(`<p><a href="${escapeHtml(data.urlPublicView)}">Ver cotización</a></p>`);
  }
  if (data.urlPdf) {
    links.push(`<p><a href="${escapeHtml(data.urlPdf)}">PDF</a></p>`);
  }

  return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
  <h1 style="font-size: 1.25rem;">Nueva cotización</h1>
  <p><strong>Document ID:</strong> ${data.documentId}</p>
  ${data.documentNumber != null ? `<p><strong>Número:</strong> ${data.documentNumber}</p>` : ''}
  ${data.salesId ? `<p><strong>Sales ID:</strong> ${escapeHtml(data.salesId)}</p>` : ''}
  ${emission ? `<p><strong>Fecha emisión:</strong> ${emission}</p>` : ''}
  <h2 style="font-size: 1.1rem; margin-top: 1.5rem;">Cliente</h2>
  <p><strong>Nombre:</strong> ${escapeHtml(customerName(data))}</p>
  ${customer?.email ? `<p><strong>Email:</strong> ${escapeHtml(customer.email)}</p>` : ''}
  ${customer?.phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(customer.phone)}</p>` : ''}
  ${customer?.code ? `<p><strong>RUT/código:</strong> ${escapeHtml(customer.code)}</p>` : ''}
  ${customer?.id != null ? `<p><strong>Client ID:</strong> ${customer.id}</p>` : ''}
  <h2 style="font-size: 1.1rem; margin-top: 1.5rem;">Ítems y detalle</h2>
  ${itemsHtml(data)}
  <h2 style="font-size: 1.1rem; margin-top: 1.5rem;">Totales</h2>
  ${formatMoney(data.netAmount) != null ? `<p><strong>Neto:</strong> ${formatMoney(data.netAmount)}</p>` : ''}
  ${formatMoney(data.taxAmount) != null ? `<p><strong>Impuesto:</strong> ${formatMoney(data.taxAmount)}</p>` : ''}
  ${formatMoney(data.totalAmount) != null ? `<p><strong>Total:</strong> ${formatMoney(data.totalAmount)}</p>` : ''}
  ${links.join('\n')}
</body>
</html>`;
}

export function quoteEmailText(data: QuoteNotification): string {
  const lines = [
    'Nueva cotización',
    '',
    `Document ID: ${data.documentId}`,
    data.documentNumber != null ? `Número: ${data.documentNumber}` : undefined,
    data.salesId ? `Sales ID: ${data.salesId}` : undefined,
    formatUnixDate(data.emissionDate)
      ? `Fecha emisión: ${formatUnixDate(data.emissionDate)}`
      : undefined,
    '',
    'Cliente',
    `Nombre: ${customerName(data)}`,
    data.customer?.email ? `Email: ${data.customer.email}` : undefined,
    data.customer?.phone ? `Teléfono: ${data.customer.phone}` : undefined,
    data.customer?.code ? `RUT/código: ${data.customer.code}` : undefined,
    data.customer?.id != null ? `Client ID: ${data.customer.id}` : undefined,
    '',
    'Ítems y detalle'
  ].filter((line): line is string => line !== undefined);

  const items = data.items ?? [];
  if (items.length === 0) {
    lines.push('(sin detalle de ítems)');
  } else {
    for (const [index, item] of items.entries()) {
      const desc = item.description ?? `Ítem ${index + 1}`;
      lines.push(
        `- ${desc} | cant=${item.quantity ?? '—'} | neto=${item.netUnitValue ?? '—'} | total=${item.totalAmount ?? '—'}`
      );
      if (item.note?.trim()) {
        lines.push('Detalle:');
        lines.push(item.note.trim());
      }
    }
  }

  lines.push('', 'Totales');
  if (data.netAmount != null) lines.push(`Neto: ${data.netAmount}`);
  if (data.taxAmount != null) lines.push(`Impuesto: ${data.taxAmount}`);
  if (data.totalAmount != null) lines.push(`Total: ${data.totalAmount}`);
  if (data.urlPublicView) lines.push(`Ver: ${data.urlPublicView}`);
  if (data.urlPdf) lines.push(`PDF: ${data.urlPdf}`);

  return lines.join('\n');
}
