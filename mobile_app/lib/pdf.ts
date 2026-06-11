import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Invoice, Quote, Receipt, Expense, CompanySettings, DocumentItem } from '../shared/types';
import { formatCurrency, numberToWords, formatDate } from '../shared/i18n';

type TaxType = 'none' | 'ispc' | 'iva';

const taxRate = (t: TaxType) => t === 'ispc' ? 0.03 : t === 'iva' ? 0.16 : 0;
const taxLabel = (t: TaxType) => t === 'ispc' ? 'ISPC 3%' : t === 'iva' ? 'IVA 16%' : '';

const statusColor = (s: string) => {
  if (s === 'Paid' || s === 'Pago') return '#16a34a';
  if (s === 'Overdue' || s === 'Vencido') return '#ba1a1a';
  return '#d97706';
};

const companyBlock = (c: CompanySettings, secondary?: boolean) => {
  const co = secondary && c.secondaryCompany ? c.secondaryCompany : c;
  const logo = (co as any).logoBase64 ?? c.logoBase64;
  const stamp = (co as any).stampBase64 ?? c.stampBase64;
  return { co, logo, stamp };
};

// ─── INVOICE PDF ─────────────────────────────────────────────────────────────

export const generateInvoicePdf = async (
  invoice: Invoice,
  settings: CompanySettings,
  items: DocumentItem[],
  options: { includeStamp?: boolean; taxType?: TaxType } = {}
): Promise<string> => {
  const { includeStamp = true, taxType = 'ispc' } = options;
  const useSecondary = invoice.companyProfileId === 'secondary';
  const { co, logo, stamp } = companyBlock(settings, useSecondary);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * taxRate(taxType);
  const total = subtotal + tax;

  const banks = ((co as any).bankAccounts ?? settings.bankAccounts ?? [])
    .map((b: any) => `<div style="font-size:10px">${b.bank}: <b>${b.iban}</b></div>`)
    .join('');
  const mobiles = ((co as any).mobileContacts ?? settings.mobileContacts ?? [])
    .map((m: any) => `<div style="font-size:10px">${m.provider}: <b>${m.number}</b></div>`)
    .join('');

  const itemRows = items.map((it, i) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.description}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(it.unitPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right"><b>${formatCurrency(it.quantity * it.unitPrice)}</b></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:0;color:#1b1b1f}
  .page{width:210mm;padding:16mm 18mm;box-sizing:border-box}
  table{border-collapse:collapse;width:100%}
  th{background:#0c1c48;color:white;padding:8px;font-size:10px}
</style>
</head>
<body>
<div class="page">
  <table style="margin-bottom:20px">
    <tr>
      <td style="width:50%">
        ${logo ? `<img src="${logo}" style="height:64px;margin-bottom:8px"/>` : `<div style="font-size:20px;font-weight:bold;color:#0c1c48">${(co as any).companyName || 'EMPRESA'}</div>`}
        <div style="font-size:11px;color:#555">${(co as any).companyName || ''}</div>
        <div style="font-size:10px;color:#777">NUIT: ${(co as any).nuit || ''}</div>
        <div style="font-size:10px;color:#777">${(co as any).address || ''}, ${(co as any).city || ''}</div>
        <div style="font-size:10px;color:#777">${(co as any).phone || ''} | ${(co as any).email || ''}</div>
      </td>
      <td style="text-align:right;vertical-align:top">
        <div style="font-size:24px;font-weight:bold;color:#0c1c48">FACTURA</div>
        <div style="font-size:14px;color:#805522;font-weight:bold">${invoice.invoiceNumber}</div>
        <div style="font-size:10px;color:#777;margin-top:4px">Data: ${formatDate(invoice.issueDate, 'pt')}</div>
        ${invoice.dueDate ? `<div style="font-size:10px;color:#777">Vencimento: ${formatDate(invoice.dueDate, 'pt')}</div>` : ''}
        <div style="margin-top:8px;display:inline-block;padding:4px 12px;border-radius:4px;background:${statusColor(invoice.status)};color:white;font-size:10px;font-weight:bold">${invoice.statusPt}</div>
      </td>
    </tr>
  </table>

  <div style="background:#f5f3f7;padding:12px;border-radius:6px;margin-bottom:16px">
    <div style="font-size:10px;color:#777;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Cliente</div>
    <div style="font-size:13px;font-weight:bold">${invoice.client}</div>
    ${invoice.clientNuit ? `<div style="font-size:10px;color:#555">NUIT: ${invoice.clientNuit}</div>` : ''}
    ${invoice.clientPhone ? `<div style="font-size:10px;color:#555">Tel: ${invoice.clientPhone}</div>` : ''}
    ${invoice.clientEmail ? `<div style="font-size:10px;color:#555">Email: ${invoice.clientEmail}</div>` : ''}
  </div>

  <table style="margin-bottom:16px">
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th style="width:50px">Qtd</th>
        <th>Descrição</th>
        <th style="width:100px;text-align:right">P. Unit.</th>
        <th style="width:100px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table style="margin-bottom:24px">
    <tr>
      <td style="width:60%">
        <div style="font-size:10px;font-weight:bold;margin-bottom:6px;color:#0c1c48">PAGAMENTO</div>
        ${banks}
        ${mobiles}
      </td>
      <td style="text-align:right">
        <div style="border:1px solid #e5e5e5;border-radius:6px;padding:12px;display:inline-block;min-width:180px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#777">Subtotal:</span><span>${formatCurrency(subtotal)}</span>
          </div>
          ${taxType !== 'none' ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#777">${taxLabel(taxType)}:</span><span>${formatCurrency(tax)}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;border-top:2px solid #0c1c48;padding-top:8px">
            <span>TOTAL:</span><span style="color:#0c1c48">${formatCurrency(total)}</span>
          </div>
        </div>
      </td>
    </tr>
  </table>

  ${invoice.notes ? `<div style="margin-bottom:16px;padding:8px;border-left:3px solid #805522;font-size:10px;color:#555">${invoice.notes}</div>` : ''}

  <div style="display:flex;justify-content:space-between;margin-top:24px">
    <div style="width:200px;border-top:1px dashed #999;text-align:center;padding-top:4px;font-size:10px;color:#777">Assinatura do Cliente</div>
    <div style="position:relative;text-align:center">
      ${includeStamp && stamp ? `<img src="${stamp}" style="position:absolute;right:0;bottom:0;width:80px;opacity:0.7;transform:rotate(-4deg)"/>` : ''}
      <div style="width:200px;border-top:1px dashed #999;text-align:center;padding-top:4px;font-size:10px;color:#777">Emitido por ${(co as any).companyName || ''}</div>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px">
    Processado por Computador · ${(co as any).companyName} · NUIT ${(co as any).nuit} · Sistema Rest ERP
  </div>
</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── QUOTE PDF ───────────────────────────────────────────────────────────────

export const generateQuotePdf = async (
  quote: Quote,
  settings: CompanySettings,
  items: DocumentItem[],
  options: { includeStamp?: boolean; taxType?: TaxType } = {}
): Promise<string> => {
  const { includeStamp = true, taxType = 'ispc' } = options;
  const useSecondary = quote.companyProfileId === 'secondary';
  const { co, logo, stamp } = companyBlock(settings, useSecondary);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * taxRate(taxType);
  const total = subtotal + tax;
  const inWords = numberToWords(total);

  const itemRows = items.map((it, i) => `
    <tr>
      <td style="padding:6px 8px;border:1px dotted #ccc">${i + 1}</td>
      <td style="padding:6px 8px;border:1px dotted #ccc">${it.quantity}</td>
      <td style="padding:6px 8px;border:1px dotted #ccc">${it.description}</td>
      <td style="padding:6px 8px;border:1px dotted #ccc;text-align:right">${formatCurrency(it.unitPrice)}</td>
      <td style="padding:6px 8px;border:1px dotted #ccc;text-align:right"><b>${formatCurrency(it.quantity * it.unitPrice)}</b></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:0;color:#1b1b1f}.page{width:210mm;padding:16mm 18mm;box-sizing:border-box}table{border-collapse:collapse;width:100%}th{background:#0c1c48;color:white;padding:8px;font-size:10px}</style>
</head>
<body>
<div class="page">
  <table style="margin-bottom:20px">
    <tr>
      <td style="width:55%">
        ${logo ? `<img src="${logo}" style="height:64px;margin-bottom:8px"/>` : `<div style="font-size:20px;font-weight:bold;color:#0c1c48">${(co as any).companyName || ''}</div>`}
        <div style="font-size:10px;color:#777">NUIT: ${(co as any).nuit || ''}</div>
        <div style="font-size:10px;color:#777">${(co as any).address || ''}, ${(co as any).city || ''}</div>
      </td>
      <td style="text-align:right;vertical-align:top">
        <div style="border:2px solid #0c1c48;padding:8px 16px;display:inline-block;border-radius:4px">
          <div style="font-size:10px;color:#777">Orçamento Nº</div>
          <div style="font-size:16px;font-weight:bold;color:#0c1c48">${quote.quoteNumber}</div>
        </div>
        <div style="font-size:10px;color:#777;margin-top:8px">Data: ${formatDate(quote.issueDate, 'pt')}</div>
        <div style="font-size:10px;color:#777">Validade: ${quote.validityDays} dias</div>
      </td>
    </tr>
  </table>

  <div style="margin-bottom:16px;display:flex;gap:16px">
    <div style="flex:1;background:#f5f3f7;padding:12px;border-radius:6px">
      <div style="font-size:10px;color:#777;margin-bottom:4px">Para:</div>
      <div style="font-weight:bold">${quote.client}</div>
      ${quote.clientNuit ? `<div style="font-size:10px">NUIT: ${quote.clientNuit}</div>` : ''}
      ${quote.clientPhone ? `<div style="font-size:10px">Tel: ${quote.clientPhone}</div>` : ''}
    </div>
    <div style="flex:1;background:#f5f3f7;padding:12px;border-radius:6px">
      <div style="font-size:10px;color:#777;margin-bottom:4px">De:</div>
      <div style="font-weight:bold">${(co as any).companyName}</div>
      <div style="font-size:10px">${(co as any).phone || ''}</div>
      <div style="font-size:10px">${(co as any).email || ''}</div>
    </div>
  </div>

  <table style="margin-bottom:16px">
    <thead>
      <tr><th>#</th><th>Qtd</th><th>Descrição</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Total</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <div style="border:1px solid #e5e5e5;border-radius:6px;padding:12px;min-width:200px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:#777">Subtotal:</span><span>${formatCurrency(subtotal)}</span>
      </div>
      ${taxType !== 'none' ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#777">${taxLabel(taxType)}:</span><span>${formatCurrency(tax)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;border-top:2px solid #0c1c48;padding-top:8px">
        <span>TOTAL:</span><span style="color:#0c1c48">${formatCurrency(total)}</span>
      </div>
    </div>
  </div>

  <div style="background:#f5f3f7;padding:8px;border-radius:4px;font-size:10px;margin-bottom:16px">
    <b>Por extenso:</b> ${inWords}
  </div>

  ${quote.notes ? `<div style="margin-bottom:16px;padding:8px;border-left:3px solid #805522;font-size:10px;color:#555">${quote.notes}</div>` : ''}

  <div style="display:flex;justify-content:space-between;margin-top:32px">
    <div style="text-align:center">
      <div style="width:180px;border-top:1px dashed #999;padding-top:4px;font-size:10px;color:#777">Assinatura do Cliente</div>
    </div>
    <div style="text-align:center;position:relative">
      ${includeStamp && stamp ? `<img src="${stamp}" style="position:absolute;right:8px;bottom:8px;width:72px;opacity:0.7;transform:rotate(-4deg)"/>` : ''}
      <div style="width:180px;border-top:1px dashed #999;padding-top:4px;font-size:10px;color:#777">${(co as any).companyName}</div>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px">
    ${(co as any).companyName} · NUIT ${(co as any).nuit} · Sistema Rest ERP
  </div>
</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── RECEIPT PDF ─────────────────────────────────────────────────────────────

export const generateReceiptPdf = async (
  receipt: Receipt,
  settings: CompanySettings,
  options: { includeStamp?: boolean } = {}
): Promise<string> => {
  const { includeStamp = true } = options;
  const useSecondary = receipt.companyProfileId === 'secondary';
  const { co, logo, stamp } = companyBlock(settings, useSecondary);
  const inWords = numberToWords(receipt.amount);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:0;color:#1b1b1f}.page{width:210mm;padding:14mm 18mm;box-sizing:border-box}.dotted{border-bottom:1px dashed #999;min-width:200px;display:inline-block;padding-bottom:2px}</style>
</head>
<body>
<div class="page">
  <div style="text-align:center;margin-bottom:20px">
    ${logo ? `<img src="${logo}" style="height:56px;margin-bottom:8px"/>` : ''}
    <div style="font-size:13px;font-weight:bold;color:#0c1c48">${(co as any).companyName}</div>
    <div style="font-size:10px;color:#777">NUIT: ${(co as any).nuit} · ${(co as any).address}, ${(co as any).city}</div>
    <div style="font-size:10px;color:#777">${(co as any).phone} · ${(co as any).email}</div>
  </div>

  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:20px;font-weight:bold;color:#ba1a1a">RECIBO</div>
    <div style="font-size:14px;font-weight:bold;color:#ba1a1a">${receipt.receiptNumber}</div>
  </div>

  <div style="font-size:22px;font-weight:bold;color:#ba1a1a;text-align:center;margin-bottom:20px">
    ${formatCurrency(receipt.amount)}
  </div>

  <div style="margin-bottom:12px">
    <span>Recebemos de: </span><span class="dotted">${receipt.client}</span>
  </div>
  <div style="margin-bottom:12px">
    <span>A quantia de: </span><span class="dotted">${inWords}</span>
  </div>
  <div style="margin-bottom:12px">
    <span>Referente à Factura: </span><span class="dotted">${receipt.invoiceRef || '—'}</span>
  </div>
  <div style="margin-bottom:12px">
    <span>Data: </span><span class="dotted">${formatDate(receipt.paymentDate, 'pt')}</span>
  </div>

  <div style="margin-bottom:20px">
    <span>Forma de Pagamento: </span><b>${receipt.methodPt || receipt.method}</b>
  </div>

  ${receipt.notes ? `<div style="margin-bottom:16px;padding:8px;border-left:3px solid #805522;font-size:10px">${receipt.notes}</div>` : ''}

  <div style="display:flex;justify-content:space-between;margin-top:32px">
    <div style="text-align:center">
      <div style="width:160px;border-top:1px dashed #999;padding-top:4px;font-size:10px;color:#777">Assinatura do Cliente</div>
    </div>
    <div style="text-align:center;position:relative">
      ${includeStamp && stamp ? `<img src="${stamp}" style="position:absolute;right:4px;bottom:4px;width:72px;opacity:0.7;transform:rotate(-3deg)"/>` : ''}
      <div style="width:160px;border-top:1px dashed #999;padding-top:4px;font-size:10px;color:#777">${(co as any).companyName}</div>
    </div>
  </div>

  <div style="margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:6px">
    Processado por Computador · Sistema Rest ERP
  </div>
</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── FINANCIAL REPORT PDF ────────────────────────────────────────────────────

export const generateReportPdf = async (
  settings: CompanySettings,
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[],
  expenses: Expense[]
): Promise<string> => {
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const invRows = invoices.slice(0, 20).map(inv => `
    <tr>
      <td style="padding:5px 8px;border-bottom:1px solid #eee">${inv.invoiceNumber}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #eee">${inv.client}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #eee">${formatDate(inv.issueDate, 'pt')}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(inv.amount)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #eee;color:${statusColor(inv.status)}">${inv.statusPt}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:0}.page{padding:16mm;box-sizing:border-box}table{border-collapse:collapse;width:100%;margin-bottom:24px}th{background:#0c1c48;color:white;padding:8px;font-size:10px;text-align:left}.kpi{display:inline-block;width:22%;padding:12px;margin:4px;border-radius:6px;text-align:center}</style>
</head>
<body>
<div class="page">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:22px;font-weight:bold;color:#0c1c48">RELATÓRIO FINANCEIRO</div>
    <div style="font-size:12px;color:#777">${settings.companyName} · ${new Date().toLocaleDateString('pt-MZ')}</div>
  </div>

  <div style="margin-bottom:24px;display:flex;gap:12px;flex-wrap:wrap">
    <div class="kpi" style="background:#e0f2fe">
      <div style="font-size:10px;color:#555">Total Facturado</div>
      <div style="font-size:16px;font-weight:bold;color:#0c1c48">${formatCurrency(totalInvoiced)}</div>
    </div>
    <div class="kpi" style="background:#dcfce7">
      <div style="font-size:10px;color:#555">Total Pago</div>
      <div style="font-size:16px;font-weight:bold;color:#16a34a">${formatCurrency(totalPaid)}</div>
    </div>
    <div class="kpi" style="background:#fef9c3">
      <div style="font-size:10px;color:#555">Total Pendente</div>
      <div style="font-size:16px;font-weight:bold;color:#d97706">${formatCurrency(totalPending)}</div>
    </div>
    <div class="kpi" style="background:#fee2e2">
      <div style="font-size:10px;color:#555">Total Despesas</div>
      <div style="font-size:16px;font-weight:bold;color:#ba1a1a">${formatCurrency(totalExpenses)}</div>
    </div>
  </div>

  <div style="font-size:13px;font-weight:bold;color:#0c1c48;margin-bottom:8px">Facturas</div>
  <table>
    <thead><tr><th>Nº</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Estado</th></tr></thead>
    <tbody>${invRows || '<tr><td colspan="5" style="text-align:center;padding:12px;color:#777">Sem registos</td></tr>'}</tbody>
  </table>

  <div style="margin-top:24px;text-align:center;font-size:9px;color:#aaa">
    Gerado em ${new Date().toLocaleString('pt-MZ')} · Sistema Rest ERP
  </div>
</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

export const sharePdf = async (uri: string) => {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
};
