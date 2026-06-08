import RNHTMLtoPDF from 'react-native-html-to-pdf';
import * as Sharing from 'expo-sharing';
import { Invoice, Quote, Receipt, CompanySettings, DocumentItem } from '../shared/types';

function formatMZN(value: number): string {
  return value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MZN';
}

function generateItemsRows(items: DocumentItem[]): string {
  return items.map(item => {
    const total = item.quantity * item.unitPrice;
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMZN(item.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatMZN(total)}</td>
      </tr>`;
  }).join('');
}

export function generateInvoiceHTML(invoice: Invoice, settings: CompanySettings): string {
  const items = invoice.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const ispc = subtotal * 0.03;
  const total = subtotal + ispc;

  const profile = invoice.companyProfileId === 'secondary' && settings.secondaryCompany
    ? { ...settings, ...settings.secondaryCompany }
    : settings;

  const logoHtml = profile.logoBase64
    ? `<img src="${profile.logoBase64}" style="height:60px;object-fit:contain;" />`
    : `<span style="font-size:24px;font-weight:800;color:#0c1c48;">${profile.companyName}</span>`;

  const stampHtml = profile.stampBase64
    ? `<img src="${profile.stampBase64}" style="height:80px;opacity:0.7;" />`
    : '';

  const bankRows = (profile.bankAccounts ?? []).map(b =>
    `<p style="margin:2px 0;font-size:12px;">🏦 ${b.bank}: <strong>${b.iban}</strong></p>`
  ).join('');

  const mobileRows = (profile.mobileContacts ?? []).map(m =>
    `<p style="margin:2px 0;font-size:12px;">📱 ${m.provider}: <strong>${m.number}</strong></p>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;color:#111;margin:0;padding:0;background:#fff;}
  .page{padding:40px;max-width:800px;margin:auto;}
  table{width:100%;border-collapse:collapse;}
  th{background:#0c1c48;color:#fff;padding:10px 12px;text-align:left;font-size:13px;}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;}
  .badge-pending{background:#fef3c7;color:#92400e;}
  .badge-paid{background:#d1fae5;color:#065f46;}
  .badge-overdue{background:#fee2e2;color:#991b1b;}
</style>
</head><body><div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <div>${logoHtml}</div>
    <div style="text-align:right;">
      <h1 style="margin:0;font-size:28px;color:#0c1c48;font-weight:800;">FACTURA</h1>
      <p style="margin:4px 0;font-size:14px;color:#6b7280;">${invoice.invoiceNumber}</p>
      <span class="badge badge-${invoice.status.toLowerCase()}">${invoice.statusPt}</span>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:32px;">
    <div>
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:700;">De</p>
      <p style="margin:4px 0;font-weight:700;">${profile.companyName}</p>
      <p style="margin:2px 0;font-size:13px;color:#6b7280;">NUIT: ${profile.nuit}</p>
      <p style="margin:2px 0;font-size:13px;color:#6b7280;">${profile.address}, ${profile.city}</p>
      <p style="margin:2px 0;font-size:13px;color:#6b7280;">${profile.phone}</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:700;">Para</p>
      <p style="margin:4px 0;font-weight:700;">${invoice.client}</p>
      ${invoice.clientNuit ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">NUIT: ${invoice.clientNuit}</p>` : ''}
      ${invoice.clientPhone ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">${invoice.clientPhone}</p>` : ''}
      ${invoice.clientEmail ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">${invoice.clientEmail}</p>` : ''}
    </div>
  </div>

  <div style="display:flex;gap:32px;margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px;">
    <div>
      <p style="margin:0;font-size:11px;color:#9ca3af;">Data de emissão</p>
      <p style="margin:4px 0;font-weight:600;">${invoice.datePt}</p>
    </div>
    ${invoice.dueDate ? `<div>
      <p style="margin:0;font-size:11px;color:#9ca3af;">Data de vencimento</p>
      <p style="margin:4px 0;font-weight:600;">${invoice.dueDate}</p>
    </div>` : ''}
  </div>

  <table style="margin-bottom:24px;">
    <thead><tr>
      <th>Descrição</th><th style="text-align:center;">Qtd</th>
      <th style="text-align:right;">Preço Unit.</th><th style="text-align:right;">Total</th>
    </tr></thead>
    <tbody>${generateItemsRows(items)}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
    <div style="min-width:240px;">
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span style="color:#6b7280;">Subtotal</span><strong>${formatMZN(subtotal)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span style="color:#6b7280;">ISPC (3%)</span><strong>${formatMZN(ispc)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px;">
        <span style="font-weight:700;color:#0c1c48;">TOTAL</span>
        <strong style="color:#0c1c48;">${formatMZN(total)}</strong>
      </div>
    </div>
  </div>

  ${bankRows || mobileRows ? `<div style="padding:16px;background:#f9fafb;border-radius:8px;margin-bottom:24px;">
    <p style="margin:0 0 8px;font-weight:700;font-size:13px;">Dados de Pagamento</p>
    ${bankRows}${mobileRows}
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:16px;border-top:1px solid #e5e7eb;">
    <p style="font-size:11px;color:#9ca3af;">Documento gerado pelo Ugest ERP</p>
    ${stampHtml}
  </div>
</div></body></html>`;
}

export function generateReceiptHTML(receipt: Receipt, settings: CompanySettings): string {
  const profile = receipt.companyProfileId === 'secondary' && settings.secondaryCompany
    ? { ...settings, ...settings.secondaryCompany }
    : settings;

  const logoHtml = profile.logoBase64
    ? `<img src="${profile.logoBase64}" style="height:60px;object-fit:contain;" />`
    : `<span style="font-size:24px;font-weight:800;color:#0c1c48;">${profile.companyName}</span>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>body{font-family:Arial,sans-serif;color:#111;margin:0;padding:0;}</style>
</head><body>
<div style="padding:40px;max-width:600px;margin:auto;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
    <div>${logoHtml}</div>
    <div style="text-align:right;">
      <h1 style="margin:0;font-size:28px;color:#0c1c48;font-weight:800;">RECIBO</h1>
      <p style="margin:4px 0;color:#6b7280;">${receipt.receiptNumber}</p>
    </div>
  </div>
  <div style="background:#d1fae5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#065f46;">Pagamento Recebido</p>
    <p style="margin:8px 0;font-size:32px;font-weight:800;color:#065f46;">${formatMZN(receipt.amount)}</p>
    <p style="margin:0;font-size:14px;color:#065f46;">de ${receipt.client}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px;color:#6b7280;">Data</td><td style="padding:8px;font-weight:600;text-align:right;">${receipt.datePt}</td></tr>
    <tr><td style="padding:8px;color:#6b7280;">Método</td><td style="padding:8px;font-weight:600;text-align:right;">${receipt.methodPt}</td></tr>
    <tr><td style="padding:8px;color:#6b7280;">Ref. Factura</td><td style="padding:8px;font-weight:600;text-align:right;">${receipt.invoiceRef}</td></tr>
  </table>
  <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:32px;">Documento gerado pelo Ugest ERP</p>
</div></body></html>`;
}

export async function shareInvoicePDF(invoice: Invoice, settings: CompanySettings): Promise<void> {
  const html = generateInvoiceHTML(invoice, settings);
  const options = {
    html,
    fileName: `${invoice.invoiceNumber.replace('-', '_')}`,
    directory: 'Documents',
  };
  const file = await RNHTMLtoPDF.convert(options);
  if (file.filePath && await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `Partilhar ${invoice.invoiceNumber}`,
    });
  }
}

export async function shareReceiptPDF(receipt: Receipt, settings: CompanySettings): Promise<void> {
  const html = generateReceiptHTML(receipt, settings);
  const options = {
    html,
    fileName: `${receipt.receiptNumber.replace('-', '_')}`,
    directory: 'Documents',
  };
  const file = await RNHTMLtoPDF.convert(options);
  if (file.filePath && await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `Partilhar ${receipt.receiptNumber}`,
    });
  }
}
