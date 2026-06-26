import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Invoice, Quote, Receipt, Expense, CompanySettings, DocumentItem, StockItem, GeneralSale } from '../shared/types';

type TaxType = 'none' | 'ispc' | 'iva';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMT(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '0,00 MT';
  const fixed = Math.abs(n).toFixed(2);
  const [integer, decimal] = fixed.split('.');
  const thousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + thousands + ',' + decimal + ' MT';
}

function resolveCompany(settings: CompanySettings, companyProfileId?: string): CompanySettings {
  if (companyProfileId === 'secondary' && settings.secondaryCompany) {
    const s = settings.secondaryCompany;
    return {
      ...settings,
      companyName: s.companyName,
      nuit: s.nuit,
      address: s.address,
      city: s.city,
      phone: s.phone,
      email: s.email,
      logoBase64: s.logoBase64,
      stampBase64: s.stampBase64,
      bankAccounts: (s as any).bankAccounts ?? settings.bankAccounts,
      mobileContacts: (s as any).mobileContacts ?? settings.mobileContacts,
    };
  }
  return settings;
}

// ─── Valor por extenso (PT-MZ) ────────────────────────────────────────────────

function _below1000(n: number): string {
  const ones = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove',
    'Dez', 'Onze', 'Doze', 'Treze', 'Catorze', 'Quinze', 'Dezasseis', 'Dezassete', 'Dezoito', 'Dezanove'];
  const tens = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
  const hundreds = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos',
    'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];
  if (n === 0) return '';
  if (n === 100) return 'Cem';
  if (n < 20) return ones[n];
  if (n < 100) { const r = n % 10; return r === 0 ? tens[Math.floor(n / 10)] : `${tens[Math.floor(n / 10)]} e ${ones[r]}`; }
  const h = Math.floor(n / 100); const r = n % 100;
  return r === 0 ? hundreds[h] : `${hundreds[h]} e ${_below1000(r)}`;
}

function _n2w(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 1000) return _below1000(n);
  if (n < 1_000_000) {
    const t = Math.floor(n / 1000); const r = n % 1000;
    const tw = t === 1 ? 'Mil' : `${_below1000(t)} Mil`;
    return r === 0 ? tw : `${tw} e ${_below1000(r)}`;
  }
  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000); const r = n % 1_000_000;
    const mw = m === 1 ? 'Um Milhão' : `${_below1000(m)} Milhões`;
    return r === 0 ? mw : `${mw} e ${_n2w(r)}`;
  }
  return String(n);
}

function amountToWordsPt(amount: number): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const ww = _n2w(whole);
  const suffix = whole === 1 ? 'Metical' : 'Meticais';
  if (cents > 0) return `${ww} ${suffix} e ${_n2w(cents)} ${cents === 1 ? 'Centavo' : 'Centavos'}`;
  return `${ww} ${suffix}`;
}

function logoImg(base64?: string, size = 90): string {
  if (!base64) return '';
  return `<img src="${base64}" style="width:${size}px;height:auto;object-fit:contain;border:1px solid #e0dfdd;padding:4px;background:#fff;border-radius:6px;" />`;
}

function stampImg(base64?: string): string {
  if (!base64) return '';
  return `<img src="${base64}" style="width:100%;height:100%;object-fit:contain;display:block;" />`;
}

function checkBox(checked: boolean): string {
  return `<div style="display:inline-block;width:14px;height:14px;border:1.5px solid #000;text-align:center;line-height:12px;font-size:11px;font-weight:bold;vertical-align:middle;margin-right:8px;">${checked ? '✓' : ''}</div>`;
}

// ─── FACTURA PDF — A5 Horizontal ──────────────────────────────────────────────

export const generateInvoicePdf = async (
  invoice: Invoice,
  settings: CompanySettings,
  items: DocumentItem[],
  options: { includeStamp?: boolean; taxType?: TaxType } = {}
): Promise<string> => {
  const { includeStamp = true, taxType = 'ispc' } = options;
  const co = resolveCompany(settings, invoice.companyProfileId);

  const displayItems = items.length > 0
    ? items
    : [{ description: invoice.description || 'Serviços prestados', quantity: 1, unitPrice: invoice.amount }];

  const subtotal = displayItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const taxAmount = taxType === 'iva' ? subtotal * 0.16 : taxType === 'ispc' ? subtotal * 0.03 : 0;
  const total = subtotal + taxAmount;

  const taxRowHtml = taxType === 'none'
    ? `<div style="display:flex;justify-content:space-between;border-bottom:1.2px dotted #000;padding-bottom:4px;margin-bottom:6px;font-size:12px;color:#000;"><span>Imposto:</span><span>Isento</span></div>`
    : taxType === 'iva'
    ? `<div style="display:flex;justify-content:space-between;border-bottom:1.2px dotted #000;padding-bottom:4px;margin-bottom:6px;font-size:12px;color:#000;"><span>IVA 16%:</span><span>${fmtMT(taxAmount)}</span></div>`
    : `<div style="display:flex;justify-content:space-between;border-bottom:1.2px dotted #000;padding-bottom:4px;margin-bottom:6px;font-size:12px;color:#000;"><span>ISPC 3%:</span><span>${fmtMT(taxAmount)}</span></div>`;

  const exemptionText = taxType === 'iva'
    ? `<strong>Sujeito a IVA:</strong><br>Taxa legal de 16% sobre o valor líquido.`
    : `<strong>Motivo de não incidência do IVA:</strong><br>Tributação ISPC, Lei 5/2009 e 12 de Janeiro`;

  const itemRows = displayItems.map((item, i) => `
    <tr style="height:30px;">
      <td style="border:1.5px solid #000;padding:4px;text-align:center;font-weight:bold;font-size:12px;">${String(i + 1).padStart(2, '0')}</td>
      <td style="border:1.5px solid #000;padding:4px;text-align:center;font-weight:bold;font-size:12px;">${item.quantity}</td>
      <td style="border:1.5px solid #000;padding:4px 8px;text-align:left;font-weight:bold;font-size:12px;">${item.description}</td>
      <td style="border:1.5px solid #000;padding:4px 8px;text-align:right;font-weight:bold;font-size:12px;">${fmtMT(item.unitPrice)}</td>
      <td style="border:1.5px solid #000;padding:4px 8px;text-align:right;font-weight:bold;font-size:12px;">${fmtMT(item.quantity * item.unitPrice)}</td>
    </tr>`).join('');

  const emptyRows = Array.from({ length: Math.max(0, 4 - displayItems.length) }).map(() => `
    <tr style="height:30px;">
      <td style="border:1.5px solid #000;"></td><td style="border:1.5px solid #000;"></td>
      <td style="border:1.5px solid #000;"></td><td style="border:1.5px solid #000;"></td>
      <td style="border:1.5px solid #000;"></td>
    </tr>`).join('');

  const statusColor = invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Overdue' ? '#dc2626' : '#d97706';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A5 landscape; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 148mm; background: #fff; font-family: Arial, Helvetica, sans-serif; }
</style>
</head>
<body>
<div style="width:100%;height:100%;border:2.5px solid #000;padding:15px;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:10px;gap:16px;align-items:flex-start;">
      <div style="display:flex;gap:12px;align-items:flex-start;width:65%;">
        ${logoImg(co.logoBase64, 86)}
        <div style="flex:1;">
          <h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;color:#000;letter-spacing:-0.3px;line-height:1.2;">${co.companyName || '[Empresa]'}</h2>
          <p style="font-size:11px;line-height:1.5;margin-top:4px;color:#000;font-weight:bold;">
            ${[co.address, co.city ? co.city + ' — Moçambique' : ''].filter(Boolean).join(' | ')}<br>
            ${co.phone ? 'Tel: ' + co.phone : ''} ${co.email ? '| ' + co.email : ''}<br>
            NUIT: ${co.nuit || '—'}
          </p>
        </div>
      </div>
      <div style="width:33%;text-align:right;display:flex;gap:8px;align-items:center;justify-content:flex-end;">
        <div style="font-size:15px;font-weight:bold;color:#000;">FACTURA</div>
        <div style="border:1.5px solid #000;padding:4px 8px;font-size:10.5px;font-weight:bold;background:#fafafa;white-space:nowrap;">${invoice.date}</div>
        <div style="font-size:14px;font-weight:bold;color:#000;">Nº</div>
        <div style="border:1.5px solid #000;padding:4px 8px;min-width:80px;text-align:center;font-size:13px;font-weight:900;color:#c2410c;background:#fafafa;">${invoice.invoiceNumber}</div>
      </div>
    </div>
    <div style="border:1.5px solid #000;border-radius:6px;padding:8px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;background:#fafafa;">
      <div>
        <span style="font-size:10px;font-weight:bold;color:#333;text-transform:uppercase;margin-right:8px;">CLIENTE / ADQUIRENTE:</span>
        <strong style="font-size:13.5px;color:#000;">${invoice.client}${invoice.clientNuit ? ' &nbsp;·&nbsp; NUIT: ' + invoice.clientNuit : ''}</strong>
      </div>
      <div>
        <span style="font-size:10px;font-weight:bold;color:#333;text-transform:uppercase;margin-right:8px;">ESTADO:</span>
        <strong style="font-size:13px;color:${statusColor};text-transform:uppercase;">${invoice.statusPt}</strong>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f3f4f6;height:28px;">
          <th style="border:1.5px solid #000;padding:5px;text-align:center;width:7%;">ITEM</th>
          <th style="border:1.5px solid #000;padding:5px;text-align:center;width:8%;">QUANT.</th>
          <th style="border:1.5px solid #000;padding:5px 8px;text-align:left;width:49%;">DESIGNAÇÃO</th>
          <th style="border:1.5px solid #000;padding:5px 8px;text-align:right;width:18%;">Preço Unitário</th>
          <th style="border:1.5px solid #000;padding:5px 8px;text-align:right;width:18%;">VALOR</th>
        </tr>
      </thead>
      <tbody>${itemRows}${emptyRows}</tbody>
    </table>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;border-top:1.5px solid #000;padding-top:8px;">
    <div style="width:57%;display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:11px;color:#000;line-height:1.4;">${exemptionText}</div>
      <div style="font-size:11.5px;color:#000;font-weight:bold;display:flex;gap:14px;flex-wrap:wrap;">
        <span>[&nbsp;&nbsp;] Dinheiro</span>
        <span>[&nbsp;&nbsp;] Cheque nº __________</span>
        <span>[&nbsp;&nbsp;] Transferência</span>
      </div>
      ${co.bankAccounts?.length ? `<div style="font-size:10px;color:#555;">${co.bankAccounts.map((b: any) => `<span style="margin-right:14px;">${b.bank}: ${b.iban}</span>`).join('')}</div>` : ''}
    </div>
    <div style="width:40%;display:flex;flex-direction:column;gap:8px;position:relative;min-height:120px;">
      <div style="font-size:12px;color:#000;line-height:1.4;border:1.5px solid #000;padding:12px;border-radius:6px;background:#fafafa;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Sub-total:</span><span>${fmtMT(subtotal)}</span></div>
        ${taxRowHtml}
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;">
          <span>TOTAL:</span><span style="color:#c2410c;">${fmtMT(total)}</span>
        </div>
      </div>
      <div style="border:1.2px dashed #777;padding:10px 12px 6px;border-radius:8px;background:#fff;display:flex;flex-direction:column;align-items:center;min-height:60px;justify-content:flex-end;">
        <div style="width:80%;border-top:1.2px solid #333;margin-bottom:4px;"></div>
        <div style="font-size:9px;font-weight:700;color:#333;">Assinatura e Carimbo</div>
      </div>
      ${includeStamp && co.stampBase64
        ? `<div style="position:absolute;left:50%;bottom:5px;transform:translateX(-50%) rotate(-4deg);width:200px;height:100px;z-index:10;">${stampImg(co.stampBase64)}</div>`
        : ''}
    </div>
  </div>
</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── COTAÇÃO PDF — A4 Vertical ────────────────────────────────────────────────

export const generateQuotePdf = async (
  quote: Quote,
  settings: CompanySettings,
  items: DocumentItem[],
  options: { includeStamp?: boolean; taxType?: TaxType } = {}
): Promise<string> => {
  const { includeStamp = true, taxType = 'ispc' } = options;
  const co = resolveCompany(settings, quote.companyProfileId);

  const displayItems = items.length > 0
    ? items
    : [{ description: quote.description || 'Proposta de serviços', quantity: 1, unitPrice: quote.amount }];

  const subtotal = displayItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const taxAmount = taxType === 'iva' ? subtotal * 0.16 : taxType === 'ispc' ? subtotal * 0.03 : 0;
  const total = subtotal + taxAmount;
  const extenso = amountToWordsPt(total);

  const taxRowHtml = taxType === 'none'
    ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:#333;border-bottom:1.5px dotted #000;padding-bottom:4px;margin-bottom:4px;"><span>Imposto:</span><span>Isento</span></div>`
    : taxType === 'iva'
    ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:#333;border-bottom:1.5px dotted #000;padding-bottom:4px;margin-bottom:4px;"><span>IVA 16%:</span><span>${fmtMT(taxAmount)}</span></div>`
    : `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:#333;border-bottom:1.5px dotted #000;padding-bottom:4px;margin-bottom:4px;"><span>ISPC 3%:</span><span>${fmtMT(taxAmount)}</span></div>`;

  const exemptionText = taxType === 'iva'
    ? `<strong>Sujeito a IVA:</strong><br>Taxa legal de 16% sobre o valor líquido.`
    : `Tributação ISPC, Lei 5/2009 e 12 de Janeiro.<br>Isenção de IVA ao abrigo do regulamento simplificado de pequenos contribuintes (Moçambique).`;

  const itemRows = displayItems.map(item => `
    <tr style="height:35px;">
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 10px;font-size:13px;text-align:center;font-weight:bold;color:#000;">${item.quantity}</td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 12px;font-size:13px;text-align:left;font-weight:bold;color:#000;">${item.description}</td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 12px;font-size:13px;text-align:right;font-weight:bold;color:#000;">${fmtMT(item.unitPrice)}</td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 12px;font-size:13px;text-align:right;font-weight:bold;color:#000;">${fmtMT(item.quantity * item.unitPrice)}</td>
    </tr>`).join('');

  const idleCount = Math.max(1, 8 - displayItems.length);
  const blankRows = Array.from({ length: idleCount }).map((_, i) => {
    const b = i === idleCount - 1 ? '2px solid #000' : '1.5px dotted #ccc';
    return `<tr style="height:38px;">
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${b};"></td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${b};"></td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${b};"></td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${b};"></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4 portrait; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 297mm; background: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
</style>
</head>
<body>
<div style="width:100%;height:100%;border:3px solid #000;padding:20px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:15px;">
      <div style="border:2px solid #000;border-radius:8px;text-align:center;padding:8px;width:45%;background:#fafafa;">
        <div style="font-weight:900;font-size:17px;text-transform:uppercase;letter-spacing:1px;color:#000;">COTAÇÃO</div>
        <div style="font-size:16px;font-weight:900;color:#c2410c;margin-top:4px;font-family:monospace;">N.º ${quote.quoteNumber}</div>
      </div>
    </div>
    <div style="display:flex;gap:15px;margin-bottom:15px;align-items:flex-start;">
      <div style="width:14%;display:flex;align-items:center;justify-content:center;">
        ${co.logoBase64 ? `<img src="${co.logoBase64}" style="width:100%;max-width:110px;height:auto;object-fit:contain;border:1px solid #e0dfdd;background:#fff;padding:6px;border-radius:12px;" />` : ''}
      </div>
      <div style="width:31%;border:2px solid #000;border-radius:8px;padding:12px;text-align:center;background:#fafafa;">
        <div style="font-weight:900;font-size:13px;text-transform:uppercase;margin-bottom:6px;color:#000;line-height:1.2;">${co.companyName || '[Empresa]'}</div>
        <div style="font-size:11.5px;line-height:1.4;color:#000;font-weight:bold;">
          ${co.address ? co.address + '<br>' : ''}
          ${co.phone ? 'Tel: ' + co.phone + '<br>' : ''}
          NUIT: ${co.nuit || '—'}<br>
          ${co.city ? co.city + ' — Moçambique' : 'Moçambique'}
        </div>
      </div>
      <div style="width:55%;border:2px solid #000;border-radius:8px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:8px;">
        <div style="border-bottom:1.5px dotted #333;padding-bottom:4px;font-size:13px;display:flex;align-items:baseline;">
          <span style="font-weight:bold;margin-right:6px;white-space:nowrap;">Exmo.(s) Sr.(s):</span>
          <span style="font-weight:900;color:#000;font-size:14px;">${quote.client}</span>
        </div>
        ${quote.clientNuit ? `<div style="border-bottom:1.5px dotted #333;padding-bottom:4px;font-size:13px;display:flex;align-items:baseline;"><span style="font-weight:bold;margin-right:6px;white-space:nowrap;">NUIT:</span><span style="font-family:monospace;font-weight:900;color:#000;">${quote.clientNuit}</span></div>` : ''}
        ${quote.clientEmail ? `<div style="font-size:12px;display:flex;align-items:baseline;"><span style="font-weight:bold;margin-right:6px;white-space:nowrap;">Email:</span><span style="color:#333;">${quote.clientEmail}</span></div>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:15px;margin-bottom:20px;">
      <div style="width:45%;border:2px solid #000;border-radius:8px;text-align:center;font-weight:900;font-size:17px;letter-spacing:2px;padding:8px 0;text-transform:uppercase;background:#fafafa;color:#001;">
        ${co.city || 'Moçambique'}
      </div>
      <div style="width:55%;border:2px solid #000;border-radius:8px;padding:8px 14px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;background:#fff;">
        Data de Emissão:&nbsp;<strong style="color:#c2410c;">${quote.date}</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp; Validade:&nbsp;<strong style="color:#c2410c;">${quote.validityDays} dias</strong>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
      <thead>
        <tr style="background:#f3f4f6;height:32px;">
          <th style="border:2px solid #000;padding:6px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:center;width:10%;">Quant.</th>
          <th style="border:2px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:left;width:54%;">Designação</th>
          <th style="border:2px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:right;width:18%;">Preço Unit.</th>
          <th style="border:2px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:right;width:18%;">Preço Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}${blankRows}</tbody>
    </table>
    <div style="border:2px dotted #666;padding:10px;border-radius:6px;background:#fafafa;">
      <div style="font-weight:bold;font-size:11px;color:#374151;text-transform:uppercase;">Valor por extenso:</div>
      <div style="margin-top:6px;font-size:13.5px;font-weight:bold;font-style:italic;color:#111;line-height:1.4;">${extenso}</div>
    </div>
  </div>
  <div>
    <div style="display:flex;justify-content:space-between;margin-top:15px;gap:15px;">
      <div style="width:54%;border:2px solid #000;border-radius:8px;padding:10px;background:#fff;">
        <div style="font-weight:bold;font-size:11px;margin-bottom:8px;color:#000;text-transform:uppercase;">Motivos de Justificação da não Aplicação do Imposto:</div>
        <div style="font-size:12px;line-height:1.5;font-weight:bold;color:#374151;">${exemptionText}</div>
      </div>
      <div style="width:44%;display:flex;flex-direction:column;gap:5px;justify-content:center;border:2px solid #000;padding:10px;border-radius:8px;background:#fafafa;">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:#333;"><span>Sub-Total:</span><span>${fmtMT(subtotal)}</span></div>
        ${taxRowHtml}
        <div style="display:flex;justify-content:space-between;font-weight:900;font-size:15px;color:#000;"><span>TOTAL:</span><span style="color:#c2410c;">${fmtMT(total)}</span></div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:10px;border-top:1.5px solid #eaeaea;position:relative;min-height:110px;">
      <div style="width:50%;font-size:9px;color:#6b7280;font-weight:bold;line-height:1.4;display:flex;flex-direction:column;justify-content:flex-end;">
        <span>Documento informativo de cotação oficial.</span>
        ${co.email ? `<span>${co.email}</span>` : ''}
      </div>
      <div style="width:45%;display:flex;flex-direction:column;align-items:center;position:relative;">
        ${includeStamp && co.stampBase64
          ? `<div style="position:absolute;right:30px;top:-10px;width:260px;height:110px;transform:rotate(-3deg);z-index:10;">${stampImg(co.stampBase64)}</div>`
          : ''}
        <div style="width:100%;border-top:1.5px solid #000;text-align:center;padding-top:6px;font-size:13px;font-weight:bold;color:#000;margin-top:70px;">Assinatura e Carimbo</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── RECIBO PDF — A5 Horizontal ───────────────────────────────────────────────

export const generateReceiptPdf = async (
  receipt: Receipt,
  settings: CompanySettings,
  options: { includeStamp?: boolean } = {},
  relatedQuotes?: Quote[]
): Promise<string> => {
  const co = resolveCompany(settings, receipt.companyProfileId);

  let dayStr = '__', monthStr = '_____________', yearStr = '20__';
  try {
    const d = new Date(receipt.paymentDate + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      dayStr = String(d.getDate()).padStart(2, '0');
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      monthStr = months[d.getMonth()];
      yearStr = String(d.getFullYear());
    }
  } catch {}

  const extenso = amountToWordsPt(receipt.amount);
  const city = co.city || 'Moçambique';

  const quoteRefs = relatedQuotes?.length
    ? ' / Cotação ' + relatedQuotes.map(q => q.quoteNumber).join(', ')
    : '';
  const invoiceRefDisplay = receipt.invoiceRef && receipt.invoiceRef !== '—'
    ? receipt.invoiceRef + quoteRefs
    : quoteRefs || '—';

  const method = receipt.method;
  const isCash = method === 'Cash';
  const isBank = method === 'Bank Transfer';
  const isMobile = ['M-Pesa', 'E-Mola', 'Movitel', 'Vodacom'].includes(method);

  const bankDetail = isBank && co.bankAccounts?.length
    ? co.bankAccounts.map((b: any) => `${b.bank}: ${b.iban}`).join(' | ')
    : isBank ? '___________________________' : '';

  const mobileDetail = isMobile
    ? (co.mobileContacts?.find((m: any) => m.provider === method)?.number || method)
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A5 landscape; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 148mm; background: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; }
</style>
</head>
<body>
<div style="width:100%;height:100%;padding:20px;">
  <div style="width:100%;height:100%;border:1.5px solid #222;padding:22px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;position:relative;">

    <div style="display:flex;width:100%;gap:16px;align-items:flex-start;margin-bottom:16px;">
      <div style="display:flex;gap:12px;align-items:flex-start;width:60%;">
        ${co.logoBase64 ? `<img src="${co.logoBase64}" style="width:90px;height:auto;object-fit:contain;border:1px solid #e0dfdd;padding:4px;background:#fff;border-radius:8px;" />` : ''}
        <div>
          <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.5px;line-height:1.2;">${co.companyName || '[Empresa]'}</div>
          <div style="font-size:8.5pt;line-height:1.5;color:#333;">
            ${co.address ? co.address + '<br>' : ''}
            ${co.phone ? 'Tel: ' + co.phone + '<br>' : ''}
            NUIT: ${co.nuit || '—'}<br>
            ${co.city ? co.city + ' — Moçambique' : 'Moçambique'}
          </div>
        </div>
      </div>
      <div style="width:38%;display:flex;flex-direction:column;align-items:flex-end;">
        <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
          <span style="font-weight:bold;font-size:15pt;text-transform:uppercase;letter-spacing:1.5px;">Recibo</span>
          <div style="border:1.5px solid #111;padding:7px 11px;min-width:130px;background:#fff;display:flex;align-items:center;gap:4px;">
            <span style="color:#cc0000;font-weight:bold;font-size:9pt;">N.º</span>
            <span style="font-weight:bold;color:#cc0000;font-family:monospace;font-size:11pt;">${receipt.receiptNumber}</span>
          </div>
        </div>
        <div style="margin-top:10px;">
          <div style="border:1.5px solid #111;padding:6px 11px;min-width:180px;text-align:right;font-weight:bold;font-size:12pt;color:#cc0000;font-family:monospace;">${fmtMT(receipt.amount)}</div>
        </div>
      </div>
    </div>

    <div style="line-height:2.1;">
      <div style="margin-bottom:10px;position:relative;min-height:28px;">
        <div style="border-bottom:1.5px dotted #555;position:absolute;left:0;right:0;bottom:4px;"></div>
        <span style="background:#fff;padding-right:8px;position:relative;font-size:10.5pt;">
          Recebemos do (a) Exmo. Sr.(a).&nbsp;<strong style="font-size:11pt;text-transform:uppercase;">${receipt.client}</strong>
        </span>
      </div>
      <div style="margin-bottom:6px;position:relative;min-height:28px;">
        <div style="border-bottom:1.5px dotted #555;position:absolute;left:0;right:0;bottom:4px;"></div>
        <span style="background:#fff;padding-right:8px;position:relative;font-size:10.5pt;">
          a quantia de&nbsp;<strong style="font-size:10pt;font-style:italic;color:#333;">${extenso}</strong>
        </span>
      </div>
      <div style="border-bottom:1.5px dotted #555;margin:12px 0 6px;height:1px;"></div>
      <div style="margin-top:14px;margin-bottom:6px;position:relative;min-height:28px;">
        <div style="border-bottom:1.5px dotted #555;position:absolute;left:0;right:0;bottom:4px;"></div>
        <span style="background:#fff;padding-right:8px;position:relative;font-size:10.5pt;">
          referente ao pagamento da factura&nbsp;<span style="background:#f3f4f6;padding:3px 7px;border-radius:6px;font-size:10pt;font-weight:bold;">${invoiceRefDisplay}</span>
        </span>
      </div>
      <div style="border-bottom:1.5px dotted #555;margin:12px 0 6px;height:1px;"></div>
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:10.5pt;font-weight:bold;">de que passamos o presente recibo.</span>
        <span style="font-size:10pt;font-weight:bold;">${city}, ${dayStr}&nbsp;de&nbsp;${monthStr}&nbsp;de&nbsp;${yearStr}</span>
      </div>
    </div>

    <div style="display:table;width:100%;margin-top:20px;">
      <div style="display:table-row;">
        <div style="display:table-cell;width:55%;vertical-align:top;">
          <div style="font-size:10pt;font-weight:bold;margin-bottom:8px;text-transform:uppercase;color:#444;letter-spacing:0.5px;">Pago em:</div>
          <div style="display:flex;align-items:center;margin-bottom:10px;">
            ${checkBox(isBank)}<span style="font-size:10pt;">Transferência Bancária</span>
            ${bankDetail ? `<span style="font-family:monospace;font-size:9pt;margin-left:8px;color:#555;">${bankDetail}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;margin-bottom:10px;">
            ${checkBox(isMobile)}<span style="font-size:10pt;">Carteira Móvel (M-Pesa / E-Mola)</span>
            ${mobileDetail ? `<span style="font-family:monospace;font-size:9pt;margin-left:8px;color:#555;">${mobileDetail}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;">
            ${checkBox(isCash)}<span style="font-size:10pt;">Numerário (Dinheiro)</span>
          </div>
        </div>
        <div style="display:table-cell;width:45%;text-align:center;vertical-align:bottom;padding-bottom:5px;">
          <div style="display:inline-block;width:240px;border:1.5px dashed #777;padding:14px 12px 6px;text-align:center;background:#fafafa;position:relative;overflow:visible;">
            ${co.stampBase64
              ? `<div style="position:absolute;left:50%;top:-45px;transform:translateX(-50%) rotate(-3deg);width:260px;height:110px;z-index:10;">${stampImg(co.stampBase64)}</div>`
              : ''}
            <div style="border-top:1.5px solid #333;padding-top:5px;font-size:8.5pt;font-weight:bold;color:#333;">Assinatura e Carimbo</div>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top:16px;border-top:1.2px solid #e0e0e0;padding-top:6px;font-size:6.5pt;color:#777;text-transform:uppercase;letter-spacing:0.2px;">
      Processado por Computador • ERP Código AT/MZ • ${co.companyName} — NUIT: ${co.nuit}
    </div>
  </div>
</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── RELATÓRIO FINANCEIRO — A4 Horizontal ─────────────────────────────────────

export const generateReportPdf = async (
  settings: CompanySettings,
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[],
  expenses: Expense[]
): Promise<string> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-MZ', { year: 'numeric', month: 'long', day: 'numeric' }) || now.toLocaleDateString();

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending  = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const sc = (s: string) => s === 'Paid' || s === 'Pago' || s === 'Aprovado' ? '#16a34a'
    : s === 'Overdue' || s === 'Vencido' || s === 'Rejeitado' ? '#dc2626' : '#d97706';

  const invRows = invoices.slice(0, 20).map(inv => `
    <tr><td>${inv.invoiceNumber}</td><td>${inv.client}</td><td>${inv.date}</td>
    <td>${inv.dueDate || '—'}</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(inv.amount)}</td>
    <td style="color:${sc(inv.status)};font-weight:bold;">${inv.statusPt}</td></tr>`).join('');

  const qtRows = quotes.slice(0, 10).map(q => `
    <tr><td>${q.quoteNumber}</td><td>${q.client}</td><td>${q.date}</td>
    <td>${q.validityDays} dias</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(q.amount)}</td>
    <td style="color:${sc(q.status)};font-weight:bold;">${q.statusPt}</td></tr>`).join('');

  const recRows = receipts.slice(0, 10).map(r => `
    <tr><td>${r.receiptNumber}</td><td>${r.client}</td><td>${r.date}</td>
    <td>${r.invoiceRef || '—'}</td><td>${r.methodPt || r.method}</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(r.amount)}</td></tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1b1b1f; background: #fff; }
  h2 { font-size: 18px; text-align: center; color: #0c1c48; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 11px; color: #777; margin-bottom: 16px; }
  .kpis { display: flex; gap: 10px; margin-bottom: 18px; }
  .kpi { flex: 1; padding: 10px; border-radius: 6px; text-align: center; }
  .kpi-label { font-size: 9px; color: #555; margin-bottom: 4px; }
  .kpi-value { font-size: 13px; font-weight: bold; }
  .sec { font-size: 11px; font-weight: bold; color: #0c1c48; margin: 12px 0 5px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
  th { background: #0c1c48; color: #fff; padding: 5px 7px; text-align: left; }
  td { padding: 4px 7px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f8f8fc; }
  .empty { text-align: center; padding: 8px; color: #777; }
  .footer { margin-top: 16px; border-top: 1px solid #eee; padding-top: 5px; font-size: 7px; color: #aaa; text-align: center; }
</style>
</head>
<body>
  <h2>RELATÓRIO FINANCEIRO</h2>
  <div class="sub">${settings.companyName || ''} — ${dateStr}</div>
  <div class="kpis">
    <div class="kpi" style="background:#e0f2fe;"><div class="kpi-label">Total Facturado</div><div class="kpi-value" style="color:#0c1c48;">${fmtMT(totalInvoiced)}</div></div>
    <div class="kpi" style="background:#dcfce7;"><div class="kpi-label">Total Recebido</div><div class="kpi-value" style="color:#16a34a;">${fmtMT(totalPaid)}</div></div>
    <div class="kpi" style="background:#fef9c3;"><div class="kpi-label">Total Pendente</div><div class="kpi-value" style="color:#d97706;">${fmtMT(totalPending)}</div></div>
    <div class="kpi" style="background:#fee2e2;"><div class="kpi-label">Total Despesas</div><div class="kpi-value" style="color:#dc2626;">${fmtMT(totalExpenses)}</div></div>
  </div>
  <div class="sec">Facturas Emitidas</div>
  <table>
    <thead><tr><th>Nº Factura</th><th>Cliente</th><th>Data</th><th>Vencimento</th><th>Valor</th><th>Estado</th></tr></thead>
    <tbody>${invRows || `<tr><td colspan="6" class="empty">Sem registos</td></tr>`}</tbody>
  </table>
  <div class="sec">Cotações Emitidas</div>
  <table>
    <thead><tr><th>Nº Cotação</th><th>Cliente</th><th>Data</th><th>Validade</th><th>Valor</th><th>Estado</th></tr></thead>
    <tbody>${qtRows || `<tr><td colspan="6" class="empty">Sem registos</td></tr>`}</tbody>
  </table>
  <div class="sec">Recibos Emitidos</div>
  <table>
    <thead><tr><th>Nº Recibo</th><th>Cliente</th><th>Data</th><th>Ref. Factura</th><th>Método</th><th>Valor</th></tr></thead>
    <tbody>${recRows || `<tr><td colspan="6" class="empty">Sem registos</td></tr>`}</tbody>
  </table>
  <div class="footer">Processado por Computador • ERP Código AT/MZ • ${settings.companyName} — NUIT: ${settings.nuit} • ${now.toLocaleString()}</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

export const sharePdf = async (uri: string, filename?: string) => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;
  if (filename) {
    // Copy to a named file so the share sheet shows a readable name instead of a UUID path
    const dest = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    await Sharing.shareAsync(dest, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: filename });
  } else {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
};

// ─── RELATÓRIO FILTRADO (com período) ─────────────────────────────────────────

export const generateFilteredReportPdf = async (
  settings: CompanySettings,
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[],
  expenses: Expense[],
  periodLabel: string
): Promise<string> => {
  const now = new Date();

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending  = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue  = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const totalQuotes   = quotes.reduce((s, q) => s + q.amount, 0);
  const netResult     = totalPaid - totalExpenses;

  const sc = (s: string) =>
    s === 'Paid' || s === 'Pago' || s === 'Aprovado' ? '#16a34a'
    : s === 'Overdue' || s === 'Vencido' || s === 'Rejeitado' ? '#dc2626'
    : s === 'Liquidado' ? '#7c3aed' : '#d97706';

  const invRows = invoices.map(inv => `
    <tr><td>${inv.invoiceNumber}</td><td>${inv.client}</td><td>${inv.date}</td>
    <td>${inv.dueDate || '—'}</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(inv.amount)}</td>
    <td style="color:${sc(inv.status)};font-weight:bold;">${inv.statusPt}</td></tr>`).join('');

  const qtRows = quotes.map(q => `
    <tr><td>${q.quoteNumber}</td><td>${q.client}</td><td>${q.date}</td>
    <td>${q.validityDays} dias</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(q.amount)}</td>
    <td style="color:${sc(q.status)};font-weight:bold;">${q.statusPt}</td></tr>`).join('');

  const recRows = receipts.map(r => `
    <tr><td>${r.receiptNumber}</td><td>${r.client}</td><td>${r.date}</td>
    <td>${r.invoiceRef || '—'}</td><td>${r.methodPt || r.method}</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(r.amount)}</td></tr>`).join('');

  const expRows = expenses.map(e => `
    <tr><td>${e.ref}</td><td>${e.merchant}</td><td>${e.categoryPt}</td><td>${e.date}</td>
    <td style="text-align:right;font-weight:bold;">${fmtMT(e.amount)}</td>
    <td style="color:${sc(e.status)};font-weight:bold;">${e.statusPt}</td></tr>`).join('');

  const logoHtml = settings.logoBase64
    ? `<img src="${settings.logoBase64}" style="width:54px;height:54px;object-fit:contain;border-radius:8px;border:1px solid #e0dfdd;background:#fff;padding:3px;" />`
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1b1b1f; background: #fff; }
  .report-header { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
  .report-header-text { flex: 1; }
  h2 { font-size: 17px; color: #0c1c48; margin-bottom: 2px; }
  .sub { font-size: 10px; color: #555; margin-bottom: 2px; }
  .period { font-size: 11px; font-weight: bold; color: #0c1c48; }
  .kpis { display: flex; gap: 7px; margin-bottom: 16px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 100px; padding: 8px; border-radius: 6px; text-align: center; }
  .kpi-label { font-size: 8px; color: #555; margin-bottom: 3px; }
  .kpi-value { font-size: 11px; font-weight: bold; }
  .sec { font-size: 10px; font-weight: bold; color: #0c1c48; margin: 10px 0 4px; text-transform: uppercase; border-bottom: 1px solid #0c1c48; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8.5px; }
  th { background: #0c1c48; color: #fff; padding: 4px 6px; text-align: left; }
  td { padding: 3px 6px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f8f8fc; }
  .empty { text-align: center; padding: 6px; color: #777; font-style: italic; }
  .summary { margin-top: 14px; background: #0c1c48; color: #fff; padding: 10px 14px; border-radius: 8px; display: flex; gap: 20px; }
  .sum-item { text-align: center; flex: 1; }
  .sum-label { font-size: 8px; opacity: 0.7; margin-bottom: 3px; }
  .sum-value { font-size: 12px; font-weight: bold; }
  .footer { margin-top: 10px; font-size: 7px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 4px; }
</style>
</head>
<body>
  <div class="report-header">
    ${logoHtml}
    <div class="report-header-text">
      <h2>RELATÓRIO FINANCEIRO</h2>
      <div class="sub">${settings.companyName || ''} — NUIT: ${settings.nuit || '—'}</div>
      <div class="period">Período: ${periodLabel}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi" style="background:#e0f2fe;"><div class="kpi-label">Total Facturado</div><div class="kpi-value" style="color:#0c1c48;">${fmtMT(totalInvoiced)}</div></div>
    <div class="kpi" style="background:#dcfce7;"><div class="kpi-label">Total Recebido</div><div class="kpi-value" style="color:#16a34a;">${fmtMT(totalPaid)}</div></div>
    <div class="kpi" style="background:#fef9c3;"><div class="kpi-label">Pendente</div><div class="kpi-value" style="color:#d97706;">${fmtMT(totalPending)}</div></div>
    <div class="kpi" style="background:#fee2e2;"><div class="kpi-label">Vencido</div><div class="kpi-value" style="color:#dc2626;">${fmtMT(totalOverdue)}</div></div>
    <div class="kpi" style="background:#fce7f3;"><div class="kpi-label">Total Cotações</div><div class="kpi-value" style="color:#805522;">${fmtMT(totalQuotes)}</div></div>
    <div class="kpi" style="background:#f3e8ff;"><div class="kpi-label">Total Despesas</div><div class="kpi-value" style="color:#7c3aed;">${fmtMT(totalExpenses)}</div></div>
  </div>

  <div class="sec">Facturas Emitidas (${invoices.length})</div>
  <table>
    <thead><tr><th>Nº Factura</th><th>Cliente</th><th>Data Emissão</th><th>Vencimento</th><th style="text-align:right;">Valor</th><th>Estado</th></tr></thead>
    <tbody>
      ${invRows || `<tr><td colspan="6" class="empty">Sem registos neste período</td></tr>`}
      ${invoices.length > 0 ? `<tr style="background:#e8ebf5;"><td colspan="4" style="font-weight:bold;text-align:right;">Total:</td><td style="font-weight:bold;text-align:right;">${fmtMT(totalInvoiced)}</td><td></td></tr>` : ''}
    </tbody>
  </table>

  <div class="sec">Cotações Emitidas (${quotes.length})</div>
  <table>
    <thead><tr><th>Nº Cotação</th><th>Cliente</th><th>Data Emissão</th><th>Validade</th><th style="text-align:right;">Valor</th><th>Estado</th></tr></thead>
    <tbody>
      ${qtRows || `<tr><td colspan="6" class="empty">Sem registos neste período</td></tr>`}
      ${quotes.length > 0 ? `<tr style="background:#f5eed8;"><td colspan="4" style="font-weight:bold;text-align:right;">Total:</td><td style="font-weight:bold;text-align:right;">${fmtMT(totalQuotes)}</td><td></td></tr>` : ''}
    </tbody>
  </table>

  <div class="sec">Recibos Emitidos (${receipts.length})</div>
  <table>
    <thead><tr><th>Nº Recibo</th><th>Cliente</th><th>Data Pagamento</th><th>Ref. Factura</th><th>Método</th><th style="text-align:right;">Valor</th></tr></thead>
    <tbody>
      ${recRows || `<tr><td colspan="6" class="empty">Sem registos neste período</td></tr>`}
      ${receipts.length > 0 ? `<tr style="background:#dcfce7;"><td colspan="5" style="font-weight:bold;text-align:right;">Total:</td><td style="font-weight:bold;text-align:right;">${fmtMT(totalReceipts)}</td></tr>` : ''}
    </tbody>
  </table>

  <div class="sec">Despesas Registadas (${expenses.length})</div>
  <table>
    <thead><tr><th>Ref.</th><th>Comerciante</th><th>Categoria</th><th>Data</th><th style="text-align:right;">Valor</th><th>Estado</th></tr></thead>
    <tbody>
      ${expRows || `<tr><td colspan="6" class="empty">Sem registos neste período</td></tr>`}
      ${expenses.length > 0 ? `<tr style="background:#fce7f3;"><td colspan="4" style="font-weight:bold;text-align:right;">Total:</td><td style="font-weight:bold;text-align:right;">${fmtMT(totalExpenses)}</td><td></td></tr>` : ''}
    </tbody>
  </table>

  <div class="summary">
    <div class="sum-item"><div class="sum-label">FACTURADO</div><div class="sum-value">${fmtMT(totalInvoiced)}</div></div>
    <div class="sum-item"><div class="sum-label">RECEBIDO</div><div class="sum-value" style="color:#86efac;">${fmtMT(totalPaid)}</div></div>
    <div class="sum-item"><div class="sum-label">DESPESAS</div><div class="sum-value" style="color:#fca5a5;">${fmtMT(totalExpenses)}</div></div>
    <div class="sum-item"><div class="sum-label">RESULTADO LÍQUIDO</div><div class="sum-value" style="color:${netResult >= 0 ? '#86efac' : '#fca5a5'};">${fmtMT(netResult)}</div></div>
  </div>

  <div class="footer">Processado por Computador • ERP Código AT/MZ • ${settings.companyName} — NUIT: ${settings.nuit} • Gerado em: ${now.toLocaleString()}</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── LISTAGEM DE STOCK PDF ────────────────────────────────────────────────────

export const generateStockPdf = async (
  items: StockItem[],
  settings: CompanySettings,
  language: 'pt' | 'en'
): Promise<string> => {
  const isEn = language === 'en';
  const now = new Date();
  const dateStr = now.toLocaleDateString(isEn ? 'en-US' : 'pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' });

  const totalValue = items.reduce((s, i) => s + i.price * i.stockLevel, 0);
  const inStockCount = items.filter(i => i.status === 'In Stock').length;
  const lowCount = items.filter(i => i.status === 'Low Stock').length;
  const outCount = items.filter(i => i.status === 'Out of Stock').length;

  const rows = items.map(item => {
    const pct = item.maxStock > 0 ? Math.min(100, Math.floor((item.stockLevel / item.maxStock) * 100)) : 0;
    const barColor = pct === 0 ? '#dc2626' : pct <= 35 ? '#d97706' : '#16a34a';
    const statusClass = item.status === 'In Stock' ? 'status-in' : item.status === 'Low Stock' ? 'status-low' : 'status-out';
    return `
      <tr>
        <td>${item.name}</td>
        <td style="font-family:monospace;font-size:9px;">${item.sku}</td>
        <td>${isEn ? item.category : item.categoryPt}</td>
        <td style="text-align:right;">${item.stockLevel}</td>
        <td style="text-align:right;">${item.maxStock}</td>
        <td style="text-align:right;">
          <span style="display:inline-block;width:28px;height:5px;background:#e2e8f0;border-radius:3px;vertical-align:middle;margin-right:3px;overflow:hidden;">
            <span style="display:block;width:${pct}%;height:100%;background:${barColor};border-radius:3px;"></span>
          </span>${pct}%
        </td>
        <td style="text-align:right;">${fmtMT(item.price)}</td>
        <td class="${statusClass}">${isEn ? item.status : item.statusPt}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 24px; }
    .header { display: flex; align-items: flex-start; gap: 12px; border-bottom: 2px solid #0c1c48; padding-bottom: 12px; margin-bottom: 14px; }
    .company-name { font-size: 15px; font-weight: bold; text-transform: uppercase; color: #0c1c48; margin-bottom: 3px; }
    .company-meta { font-size: 9px; color: #64748b; line-height: 1.6; }
    .report-title { font-size: 17px; font-weight: bold; color: #0c1c48; text-transform: uppercase; margin-bottom: 3px; }
    .report-date { font-size: 9px; color: #94a3b8; margin-bottom: 14px; }
    .kpis { display: flex; gap: 6px; margin-bottom: 16px; }
    .kpi { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 4px; text-align: center; }
    .kpi-label { font-size: 7.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
    .kpi-value { font-size: 13px; font-weight: bold; color: #0c1c48; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #0c1c48; }
    th { color: #fff; font-size: 9px; text-align: left; padding: 8px 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
    td { padding: 7px 6px; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #f8fafc; }
    .status-in { color: #16a34a; font-weight: bold; }
    .status-low { color: #d97706; font-weight: bold; }
    .status-out { color: #dc2626; font-weight: bold; }
    .total-row td { font-weight: bold; background: #eff6ff !important; border-top: 2px solid #0c1c48; }
    .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    ${settings.logoBase64 ? `<img src="${settings.logoBase64}" style="width:60px;height:auto;object-fit:contain;border-radius:4px;" />` : ''}
    <div>
      <div class="company-name">${settings.companyName || '—'}</div>
      <div class="company-meta">
        ${settings.address ? settings.address + (settings.city ? ', ' + settings.city : '') + '<br>' : ''}
        NUIT: ${settings.nuit || '—'}${settings.phone ? ' · Tel: ' + settings.phone : ''}
      </div>
    </div>
  </div>

  <div class="report-title">${isEn ? 'Stock List' : 'Listagem de Stock'}</div>
  <div class="report-date">${isEn ? 'Generated: ' : 'Gerado em: '}${dateStr} · ${items.length} ${isEn ? 'items' : 'artigos'}</div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">${isEn ? 'Total' : 'Total'}</div>
      <div class="kpi-value">${items.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isEn ? 'In Stock' : 'Em Stock'}</div>
      <div class="kpi-value" style="color:#16a34a;">${inStockCount}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isEn ? 'Low Stock' : 'Baixo'}</div>
      <div class="kpi-value" style="color:#d97706;">${lowCount}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isEn ? 'Out of Stock' : 'Sem Stock'}</div>
      <div class="kpi-value" style="color:#dc2626;">${outCount}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${isEn ? 'Total Value' : 'Valor Total'}</div>
      <div class="kpi-value" style="font-size:10px;">${fmtMT(totalValue)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${isEn ? 'Name' : 'Nome'}</th>
        <th>SKU</th>
        <th>${isEn ? 'Category' : 'Categoria'}</th>
        <th style="text-align:right;">${isEn ? 'Stock' : 'Stock'}</th>
        <th style="text-align:right;">${isEn ? 'Max' : 'Máx.'}</th>
        <th style="text-align:right;">%</th>
        <th style="text-align:right;">${isEn ? 'Unit Price' : 'Preço Unit.'}</th>
        <th>${isEn ? 'Status' : 'Estado'}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="6">${isEn ? 'TOTAL' : 'TOTAL'} (${items.length} ${isEn ? 'items' : 'artigos'})</td>
        <td style="text-align:right;">${fmtMT(totalValue)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">${settings.companyName} · NUIT: ${settings.nuit} · ${isEn ? 'Generated by' : 'Gerado por'} Rest ERP · ${now.toLocaleString()}</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};

// ─── GENERAL SALES PDF ───────────────────────────────────────────────────────

export const generateGeneralSalesPdf = async (
  sales: GeneralSale[],
  settings: CompanySettings,
  language: 'pt' | 'en'
): Promise<string> => {
  const isEn = language === 'en';
  const now = new Date();
  const dateStr = now.toLocaleDateString(isEn ? 'en-US' : 'pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' });

  const totalRevenue = sales.reduce((s, sv) => s + sv.totalAmount, 0);
  const totalQty = sales.reduce((s, sv) => s + sv.quantity, 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = sales.filter(sv => sv.saleDate === todayStr).reduce((s, sv) => s + sv.totalAmount, 0);

  const rows = sales.map(sv => `
    <tr>
      <td style="font-family:monospace;font-size:9px;">${sv.ref}</td>
      <td>${sv.productName}</td>
      <td style="font-family:monospace;font-size:9px;">${sv.sku || '—'}</td>
      <td style="text-align:right;">${sv.quantity}</td>
      <td style="text-align:right;">${fmtMT(sv.unitPrice)}</td>
      <td style="text-align:right;font-weight:bold;">${fmtMT(sv.totalAmount)}</td>
      <td style="text-align:center;font-size:9px;">${sv.paymentMethod}</td>
      <td style="text-align:center;">${isEn ? sv.date : sv.datePt}</td>
      <td style="font-size:9px;color:#64748b;">${sv.notes || '—'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 24px; }
    .header { display: flex; align-items: flex-start; gap: 12px; border-bottom: 2px solid #0c1c48; padding-bottom: 12px; margin-bottom: 14px; }
    .company-name { font-size: 15px; font-weight: bold; text-transform: uppercase; color: #0c1c48; margin-bottom: 3px; }
    .company-meta { font-size: 9px; color: #64748b; line-height: 1.6; }
    .report-title { font-size: 17px; font-weight: bold; color: #0c1c48; text-transform: uppercase; margin-bottom: 3px; }
    .report-date { font-size: 9px; color: #94a3b8; margin-bottom: 14px; }
    .kpis { display: flex; gap: 6px; margin-bottom: 16px; }
    .kpi { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 4px; text-align: center; }
    .kpi-label { font-size: 7.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
    .kpi-value { font-size: 12px; font-weight: bold; color: #0c1c48; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #0c1c48; }
    th { color: #fff; font-size: 9px; text-align: left; padding: 8px 6px; font-weight: bold; text-transform: uppercase; }
    td { padding: 7px 6px; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #f8fafc; }
    .total-row td { font-weight: bold; background: #0c1c48 !important; color: #fff; }
    .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    ${settings.logoBase64 ? `<img src="${settings.logoBase64}" style="width:60px;height:auto;object-fit:contain;border-radius:4px;" />` : ''}
    <div>
      <div class="company-name">${settings.companyName || '—'}</div>
      <div class="company-meta">NUIT: ${settings.nuit || '—'}${settings.phone ? ' · Tel: ' + settings.phone : ''}</div>
    </div>
  </div>
  <div class="report-title">${isEn ? 'General Sales' : 'Vendas Gerais'}</div>
  <div class="report-date">${isEn ? 'Generated: ' : 'Gerado em: '}${dateStr} · ${sales.length} ${isEn ? 'sales' : 'vendas'}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">${isEn ? 'Total Sales' : 'Total Vendas'}</div><div class="kpi-value">${sales.length}</div></div>
    <div class="kpi"><div class="kpi-label">${isEn ? 'Items' : 'Itens'}</div><div class="kpi-value">${totalQty}</div></div>
    <div class="kpi"><div class="kpi-label">${isEn ? 'Revenue' : 'Receita'}</div><div class="kpi-value" style="font-size:10px;">${fmtMT(totalRevenue)}</div></div>
    <div class="kpi"><div class="kpi-label">${isEn ? 'Today' : 'Hoje'}</div><div class="kpi-value" style="font-size:10px;">${fmtMT(todayTotal)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Ref</th>
        <th>${isEn ? 'Product' : 'Produto'}</th>
        <th>SKU</th>
        <th style="text-align:right;">${isEn ? 'Qty' : 'Qtd'}</th>
        <th style="text-align:right;">${isEn ? 'Unit Price' : 'Preço Unit.'}</th>
        <th style="text-align:right;">Total</th>
        <th style="text-align:center;">${isEn ? 'Payment' : 'Pagamento'}</th>
        <th style="text-align:center;">${isEn ? 'Date' : 'Data'}</th>
        <th>${isEn ? 'Notes' : 'Notas'}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3">${isEn ? 'TOTAL' : 'TOTAL'}</td>
        <td style="text-align:right;">${totalQty}</td>
        <td></td>
        <td style="text-align:right;">${fmtMT(totalRevenue)}</td>
        <td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>
  <div class="footer">${settings.companyName} · ${isEn ? 'Generated by' : 'Gerado por'} Rest ERP · ${now.toLocaleString()}</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
};
