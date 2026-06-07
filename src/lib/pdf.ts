/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Invoice, Quote, Receipt, Expense, DocumentItem, CompanySettings } from '../types';
import { formatValue } from '../data';

// ─── Resolve company profile (primary vs secondary) ──────────────────────────

export function resolveCompanySettings(
  primary: CompanySettings,
  companyProfileId?: 'primary' | 'secondary'
): CompanySettings {
  if (companyProfileId === 'secondary' && primary.secondaryCompany) {
    const s = primary.secondaryCompany;
    return {
      companyName: s.companyName,
      nuit: s.nuit,
      address: s.address,
      city: s.city,
      phone: s.phone,
      email: s.email,
      logoBase64: s.logoBase64,
      stampBase64: s.stampBase64,
      bankAccounts: s.bankAccounts,
      mobileContacts: s.mobileContacts,
      setupComplete: true,
    };
  }
  return primary;
}

// ─── Amount in words (PT-MZ) ─────────────────────────────────────────────────

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

function _numberToWords(n: number): string {
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
    return r === 0 ? mw : `${mw} e ${_numberToWords(r)}`;
  }
  return n.toLocaleString('pt-MZ');
}

export function amountToWordsPt(amount: number): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const ww = _numberToWords(whole);
  const suffix = whole === 1 ? 'Metical' : 'Meticais';
  if (cents > 0) {
    return `${ww} ${suffix} e ${_numberToWords(cents)} ${cents === 1 ? 'Centavo' : 'Centavos'}`;
  }
  return `${ww} ${suffix}`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fmtMT(n: number): string {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MT';
}

function logoImg(base64?: string, size = 90): string {
  if (!base64) return '';
  return `<img src="${base64}" style="width:${size}px;height:auto;object-fit:contain;border:1px solid #e0dfdd;padding:4px;background:#fff;border-radius:6px;" crossorigin="anonymous" />`;
}

function stampImg(base64?: string): string {
  if (!base64) return '';
  return `<img src="${base64}" style="width:100%;height:100%;object-fit:contain;display:block;" crossorigin="anonymous" />`;
}

// ─── Core: render HTML → canvas → PDF ────────────────────────────────────────

async function renderToPDF(
  html: string,
  widthPx: number,
  heightPx: number,
  filename: string,
  orientation: 'landscape' | 'portrait',
  format: 'a5' | 'a4'
): Promise<void> {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '-20000px',
    left: '-20000px',
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    backgroundColor: '#ffffff',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    boxSizing: 'border-box',
  });
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: widthPx,
      height: heightPx,
    });
    const imgData = canvas.toDataURL('image/png');
    const [pw, ph]: [number, number] = format === 'a4'
      ? orientation === 'portrait' ? [210, 297] : [297, 210]
      : orientation === 'portrait' ? [148, 210] : [210, 148];
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    pdf.addImage(imgData, 'PNG', 0, 0, pw, ph);
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// ─── INVOICE PDF — A5 Landscape (design: pdfGenerator.ts) ────────────────────

export async function generateInvoicePDF(
  invoice: Invoice,
  items: DocumentItem[],
  settings: CompanySettings
): Promise<void> {
  const displayItems = items.length > 0
    ? items
    : [{ description: invoice.description || 'Serviços prestados', quantity: 1, unitPrice: invoice.amount }];

  const subtotal = displayItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const total = subtotal;

  const itemsRowsHtml = displayItems.map((item, i) => `
    <tr style="height:30px;">
      <td style="border:1.5px solid #000;padding:4px;text-align:center;font-weight:bold;font-size:12px;">${String(i + 1).padStart(2, '0')}</td>
      <td style="border:1.5px solid #000;padding:4px;text-align:center;font-weight:bold;font-size:12px;">${item.quantity}</td>
      <td style="border:1.5px solid #000;padding:4px 8px;text-align:left;font-weight:bold;font-size:12px;">${item.description}</td>
      <td style="border:1.5px solid #000;padding:4px 8px;text-align:right;font-weight:bold;font-size:12px;">${fmtMT(item.unitPrice)}</td>
      <td style="border:1.5px solid #000;padding:4px 8px;text-align:right;font-weight:bold;font-size:12px;">${fmtMT(item.quantity * item.unitPrice)}</td>
    </tr>
  `).join('');

  const emptyCount = Math.max(0, 4 - displayItems.length);
  const emptyRowsHtml = Array.from({ length: emptyCount }).map(() => `
    <tr style="height:30px;">
      <td style="border:1.5px solid #000;"></td>
      <td style="border:1.5px solid #000;"></td>
      <td style="border:1.5px solid #000;"></td>
      <td style="border:1.5px solid #000;"></td>
      <td style="border:1.5px solid #000;"></td>
    </tr>
  `).join('');

  const statusColor = invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Overdue' ? '#dc2626' : '#d97706';

  const html = `
    <div style="width:100%;height:100%;border:2.5px solid #000;padding:15px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;font-family:Arial,sans-serif;">

      <div>
        <!-- CABEÇALHO -->
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:10px;gap:16px;align-items:flex-start;">
          <div style="display:flex;gap:12px;align-items:flex-start;width:65%;">
            ${logoImg(settings.logoBase64, 86)}
            <div style="flex:1;min-width:0;">
              <h2 style="margin:0;font-size:16px;font-weight:bold;text-transform:uppercase;color:#000;letter-spacing:-0.3px;line-height:1.2;">${settings.companyName || '[Empresa]'}</h2>
              <p style="font-size:11px;line-height:1.5;margin:4px 0 0 0;color:#000;font-weight:bold;">
                ${[settings.address, settings.city ? settings.city + ' — Moçambique' : ''].filter(Boolean).join(' | ')}<br>
                ${settings.phone ? 'Tel: ' + settings.phone : ''} ${settings.email ? '| ' + settings.email : ''}<br>
                NUIT: ${settings.nuit || '—'}
              </p>
            </div>
          </div>
          <div style="width:33%;text-align:right;display:flex;gap:8px;align-items:center;justify-content:flex-end;">
            <div style="font-size:15px;font-weight:bold;color:#000;">FACTURA</div>
            <div style="border:1.5px solid #000;padding:4px 8px;text-align:center;font-size:10.5px;font-weight:bold;background:#fafafa;white-space:nowrap;">${invoice.date}</div>
            <div style="font-size:14px;font-weight:bold;color:#000;">Nº</div>
            <div style="border:1.5px solid #000;padding:4px 8px;min-width:80px;text-align:center;font-size:13px;font-weight:900;color:#c2410c;background:#fafafa;">${invoice.invoiceNumber}</div>
          </div>
        </div>

        <!-- CLIENTE -->
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

        <!-- TABELA -->
        <table style="width:100%;border-collapse:collapse;margin-top:4px;font-size:12px;">
          <thead>
            <tr style="background:#f3f4f6;height:28px;">
              <th style="border:1.5px solid #000;padding:5px;text-align:center;font-weight:bold;width:7%;">ITEM</th>
              <th style="border:1.5px solid #000;padding:5px;text-align:center;font-weight:bold;width:8%;">QUANT.</th>
              <th style="border:1.5px solid #000;padding:5px;text-align:left;font-weight:bold;padding-left:8px;width:49%;">DESIGNAÇÃO</th>
              <th style="border:1.5px solid #000;padding:5px;text-align:right;font-weight:bold;padding-right:8px;width:18%;">Preço Unitário</th>
              <th style="border:1.5px solid #000;padding:5px;text-align:right;font-weight:bold;padding-right:8px;width:18%;">VALOR</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            ${emptyRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- RODAPÉ -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;border-top:1.5px solid #000;padding-top:8px;">

        <!-- Esquerda: isenção + pagamento -->
        <div style="width:57%;display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:11px;color:#000;line-height:1.4;">
            <strong>Motivo de não incidência do IVA:</strong><br>
            Tributação ISPC, Lei 5/2009 e 12 de Janeiro
          </div>
          <div style="font-size:11.5px;color:#000;font-weight:bold;display:flex;gap:14px;flex-wrap:wrap;">
            <span>[&nbsp;&nbsp;] Dinheiro</span>
            <span>[&nbsp;&nbsp;] Cheque nº __________</span>
            <span>[&nbsp;&nbsp;] Transferência</span>
          </div>
          ${settings.bankAccounts && settings.bankAccounts.length > 0 ? `
            <div style="font-size:10px;color:#555;margin-top:2px;">
              ${settings.bankAccounts.map(b => `<span style="margin-right:14px;">${b.bank}: ${b.iban}</span>`).join('')}
            </div>` : ''}
        </div>

        <!-- Direita: totais + assinatura -->
        <div style="width:40%;display:flex;flex-direction:column;gap:8px;position:relative;min-height:140px;">
          <div style="position:relative;z-index:60;font-size:12px;color:#000;line-height:1.4;border:1.5px solid #000;padding:12px;border-radius:6px;background:#fafafa;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Sub-total:</span><span>${fmtMT(subtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1.2px dotted #000;padding-bottom:4px;margin-bottom:6px;">
              <span>ISPC 3%:</span><span>Incluso</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;">
              <span>TOTAL:</span><span style="color:#c2410c;">${fmtMT(total)}</span>
            </div>
          </div>
          <div style="position:relative;z-index:55;border:1.2px dashed #777;padding:10px 12px 6px 12px;border-radius:8px;background:#fff;display:flex;flex-direction:column;align-items:center;min-height:68px;justify-content:flex-end;">
            ${settings.stampBase64
              ? `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-4deg);width:240px;height:120px;pointer-events:none;z-index:80;">${stampImg(settings.stampBase64)}</div>`
              : ''}
            <div style="width:80%;height:1px;border-top:1.2px solid #333;margin-bottom:4px;position:relative;z-index:90;"></div>
            <div style="font-size:9px;font-weight:700;color:#333;position:relative;z-index:90;">Assinatura e Carimbo</div>
          </div>
        </div>

      </div>
    </div>
  `;

  await renderToPDF(html, 1000, 705, `${invoice.invoiceNumber}.pdf`, 'landscape', 'a5');
}

// ─── QUOTE PDF — A4 Portrait (design: quotationPdfGenerator.ts) ──────────────

export async function generateQuotePDF(
  quote: Quote,
  items: DocumentItem[],
  settings: CompanySettings
): Promise<void> {
  const displayItems = items.length > 0
    ? items
    : [{ description: quote.description || 'Proposta de serviços', quantity: 1, unitPrice: quote.amount }];

  const subtotal = displayItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const total = subtotal;
  const extenso = amountToWordsPt(total);

  const numberOfItems = displayItems.length;
  const itemRowHtml = displayItems.map(item => `
    <tr style="height:35px;">
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 10px;font-size:13px;text-align:center;font-weight:bold;color:#000;">${item.quantity}</td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 12px;font-size:13px;text-align:left;font-weight:bold;color:#000;">${item.description}</td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 12px;font-size:13px;text-align:right;font-weight:bold;color:#000;">${fmtMT(item.unitPrice)}</td>
      <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:1.5px dotted #999;padding:6px 12px;font-size:13px;text-align:right;font-weight:bold;color:#000;">${fmtMT(item.quantity * item.unitPrice)}</td>
    </tr>
  `).join('');

  const idleCount = Math.max(1, 8 - numberOfItems);
  const blankRowsHtml = Array.from({ length: idleCount }).map((_, i) => {
    const isLast = i === idleCount - 1;
    const border = isLast ? '2px solid #000' : '1.5px dotted #ccc';
    return `
      <tr style="height:38px;">
        <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${border};"></td>
        <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${border};"></td>
        <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${border};"></td>
        <td style="border-left:2px solid #000;border-right:2px solid #000;border-bottom:${border};"></td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="width:100%;height:100%;border:3px solid #000;padding:20px;box-sizing:border-box;background:#fff;display:flex;flex-direction:column;justify-content:space-between;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

      <div>
        <!-- Número da cotação (topo direito) -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:15px;">
          <div style="border:2px solid #000;border-radius:8px;text-align:center;padding:8px;width:45%;background:#fafafa;">
            <div style="font-weight:900;font-size:17px;text-transform:uppercase;letter-spacing:1px;color:#000;">COTAÇÃO</div>
            <div style="font-size:16px;font-weight:900;color:#c2410c;margin-top:4px;font-family:monospace;">N.º ${quote.quoteNumber}</div>
          </div>
        </div>

        <!-- Empresa + Cliente -->
        <div style="display:flex;gap:15px;margin-bottom:15px;width:100%;align-items:flex-start;">
          <!-- Logo -->
          <div style="width:14%;display:flex;align-items:center;justify-content:center;padding-top:4px;">
            ${settings.logoBase64
              ? `<img src="${settings.logoBase64}" style="width:100%;max-width:110px;height:auto;object-fit:contain;border:1px solid #e0dfdd;background:#fff;padding:6px;border-radius:12px;" crossorigin="anonymous" />`
              : ''}
          </div>
          <!-- Empresa -->
          <div style="width:31%;border:2px solid #000;border-radius:8px;padding:12px;text-align:center;display:flex;flex-direction:column;justify-content:center;background:#fafafa;">
            <div style="font-weight:900;font-size:13px;text-transform:uppercase;margin-bottom:6px;color:#000;line-height:1.2;">${settings.companyName || '[Empresa]'}</div>
            <div style="font-size:11.5px;line-height:1.4;color:#000;font-weight:bold;">
              ${settings.address ? settings.address + '<br>' : ''}
              ${settings.phone ? 'Tel: ' + settings.phone + '<br>' : ''}
              NUIT: ${settings.nuit || '—'}<br>
              ${settings.city ? settings.city + ' — Moçambique' : 'Moçambique'}
            </div>
          </div>
          <!-- Cliente -->
          <div style="width:55%;border:2px solid #000;border-radius:8px;padding:12px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;gap:8px;">
            <div style="border-bottom:1.5px dotted #333;padding-bottom:4px;font-size:13px;display:flex;align-items:baseline;">
              <span style="font-weight:bold;margin-right:6px;white-space:nowrap;">Exmo.(s) Sr.(s):</span>
              <span style="font-weight:900;color:#000;font-size:14px;">${quote.client}</span>
            </div>
            ${quote.clientNuit ? `
            <div style="border-bottom:1.5px dotted #333;padding-bottom:4px;font-size:13px;display:flex;align-items:baseline;">
              <span style="font-weight:bold;margin-right:6px;white-space:nowrap;">NUIT:</span>
              <span style="font-family:monospace;font-weight:900;color:#000;">${quote.clientNuit}</span>
            </div>` : ''}
            ${quote.clientEmail ? `
            <div style="font-size:12px;display:flex;align-items:baseline;">
              <span style="font-weight:bold;margin-right:6px;white-space:nowrap;">Email:</span>
              <span style="color:#333;">${quote.clientEmail}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Localidade + Data -->
        <div style="display:flex;gap:15px;margin-bottom:20px;width:100%;">
          <div style="width:45%;border:2px solid #000;border-radius:8px;text-align:center;font-weight:950;font-size:17px;letter-spacing:2px;padding:8px 0;text-transform:uppercase;background:#fafafa;color:#001;">
            ${settings.city || 'Moçambique'}
          </div>
          <div style="width:55%;border:2px solid #000;border-radius:8px;padding:8px 14px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;background:#fff;">
            <span>Data de Emissão:&nbsp;<strong style="color:#c2410c;">${quote.date}</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp; Validade:&nbsp;<strong style="color:#c2410c;">${quote.validityDays} dias</strong></span>
          </div>
        </div>

        <!-- Tabela de itens -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
          <thead>
            <tr style="background:#f3f4f6;height:32px;">
              <th style="border:2px solid #000;padding:6px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:center;width:10%;">Quant.</th>
              <th style="border:2px solid #000;padding:6px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:left;padding-left:12px;width:54%;">Designação</th>
              <th style="border:2px solid #000;padding:6px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:right;padding-right:12px;width:18%;">Preço Unit.</th>
              <th style="border:2px solid #000;padding:6px;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:right;padding-right:12px;width:18%;">Preço Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowHtml}
            ${blankRowsHtml}
          </tbody>
        </table>

        <!-- Valor por extenso -->
        <div style="border:2px dotted #666;padding:10px;margin-top:10px;border-radius:6px;background:#fafafa;">
          <div style="font-weight:bold;font-size:11px;color:#374151;text-transform:uppercase;">Valor por extenso:</div>
          <div style="margin-top:6px;font-size:13.5px;font-weight:bold;font-style:italic;color:#111;line-height:1.4;">${extenso}</div>
        </div>
      </div>

      <!-- Rodapé -->
      <div>
        <div style="display:flex;justify-content:space-between;width:100%;margin-top:15px;gap:15px;">
          <!-- Isenção -->
          <div style="width:54%;border:2px solid #000;border-radius:8px;padding:10px;background:#fff;">
            <div style="font-weight:bold;font-size:11px;margin-bottom:8px;color:#000;text-transform:uppercase;">Motivos de Justificação da não Aplicação do Imposto:</div>
            <div style="font-size:12px;line-height:1.5;font-weight:bold;color:#374151;">
              Tributação ISPC, Lei 5/2009 e 12 de Janeiro.<br>
              Isenção de IVA ao abrigo do regulamento simplificado de pequenos contribuintes (Moçambique).
            </div>
          </div>
          <!-- Totais -->
          <div style="width:44%;display:flex;flex-direction:column;gap:5px;justify-content:center;border:2px solid #000;padding:10px;border-radius:8px;background:#fafafa;">
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:#333;">
              <span>Sub-Total:</span><span>${fmtMT(subtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;color:#333;border-bottom:1.5px dotted #000;padding-bottom:4px;margin-bottom:4px;">
              <span>ISPC 3%:</span><span>Incluso</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:900;font-size:15px;color:#000;">
              <span>TOTAL:</span><span style="color:#c2410c;">${fmtMT(total)}</span>
            </div>
          </div>
        </div>

        <!-- Assinatura + Carimbo -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:10px;border-top:1.5px solid #eaeaea;position:relative;min-height:110px;">
          <div style="width:50%;font-size:9px;color:#6b7280;font-weight:bold;line-height:1.4;display:flex;flex-direction:column;justify-content:flex-end;">
            <span>Documento informativo de cotação oficial.</span>
            ${settings.email ? `<span>${settings.email}</span>` : ''}
          </div>
          <div style="width:45%;display:flex;flex-direction:column;align-items:center;position:relative;">
            ${settings.stampBase64
              ? `<div style="position:absolute;right:30px;top:-10px;width:300px;height:160px;transform:rotate(-3deg);pointer-events:none;z-index:50;">${stampImg(settings.stampBase64)}</div>`
              : ''}
            <div style="width:100%;border-top:1.5px solid #000;text-align:center;padding-top:6px;font-size:13px;font-weight:bold;color:#000;margin-top:70px;">Assinatura e Carimbo</div>
          </div>
        </div>
      </div>

    </div>
  `;

  await renderToPDF(html, 840, 1140, `${quote.quoteNumber}.pdf`, 'portrait', 'a4');
}

// ─── RECEIPT PDF — A5 Landscape (design: receiptPdfGenerator.ts) ─────────────

export async function generateReceiptPDF(
  receipt: Receipt,
  settings: CompanySettings,
  relatedQuotes?: Quote[]
): Promise<void> {
  // Parse date
  let dayStr = '__', monthStr = '_____________', yearStr = '20__';
  try {
    const d = new Date(receipt.paymentDate + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      dayStr = String(d.getDate()).padStart(2, '0');
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      monthStr = months[d.getMonth()];
      yearStr = String(d.getFullYear());
    }
  } catch { /* fallback blanks */ }

  const extenso = amountToWordsPt(receipt.amount);
  const city = settings.city || 'Moçambique';

  // Quote refs
  const quoteRefs = relatedQuotes && relatedQuotes.length > 0
    ? ' / Cotação ' + relatedQuotes.map(q => q.quoteNumber).join(', ')
    : '';

  const invoiceRefDisplay = receipt.invoiceRef && receipt.invoiceRef !== '—'
    ? receipt.invoiceRef + quoteRefs
    : quoteRefs || '—';

  // Payment method flags
  const method = receipt.method;
  const isCash = method === 'Cash';
  const isBank = method === 'Bank Transfer';
  const isMobile = ['M-Pesa', 'E-Mola', 'Movitel', 'Vodacom'].includes(method);

  const bankDetail = isBank && settings.bankAccounts.length > 0
    ? settings.bankAccounts.map(b => `${b.bank}: ${b.iban}`).join(' | ')
    : isBank ? '___________________________' : '';

  const mobileDetail = isMobile
    ? (settings.mobileContacts.find(m => m.provider === method)?.number || receipt.method)
    : '';

  const checkBox = (checked: boolean) =>
    `<div style="display:inline-block;width:14px;height:14px;border:1.5px solid #000;text-align:center;line-height:12px;font-size:11px;font-weight:bold;vertical-align:middle;margin-right:8px;">${checked ? '✓' : ''}</div>`;

  const html = `
    <style>
      *, *::before, *::after { box-sizing: border-box; }
    </style>

    <div style="width:100%;height:100%;background:#fff;padding:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111;">
      <div style="width:100%;height:100%;border:1.5px solid #222;padding:22px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;position:relative;">

        <!-- TOPO: empresa + título recibo -->
        <div style="display:flex;width:100%;gap:16px;align-items:flex-start;margin-bottom:16px;">
          <!-- Empresa (esquerda) -->
          <div style="display:flex;gap:12px;align-items:flex-start;width:60%;">
            ${settings.logoBase64
              ? `<img src="${settings.logoBase64}" style="width:90px;height:auto;object-fit:contain;border:1px solid #e0dfdd;padding:4px;background:#fff;border-radius:8px;" crossorigin="anonymous" />`
              : ''}
            <div>
              <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.5px;line-height:1.2;color:#111;">${settings.companyName || '[Empresa]'}</div>
              <div style="font-size:8.5pt;line-height:1.5;color:#333;">
                ${settings.address ? settings.address + '<br>' : ''}
                ${settings.phone ? 'Tel: ' + settings.phone + '<br>' : ''}
                NUIT: ${settings.nuit || '—'}<br>
                ${settings.city ? settings.city + ' — Moçambique' : 'Moçambique'}
              </div>
            </div>
          </div>
          <!-- Recibo + Número + Valor (direita) -->
          <div style="width:38%;display:flex;flex-direction:column;align-items:flex-end;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;width:100%;">
              <span style="font-weight:bold;font-size:15pt;text-transform:uppercase;letter-spacing:1.5px;">Recibo</span>
              <div style="border:1.5px solid #111;padding:7px 11px;min-width:130px;background:#fff;display:flex;align-items:center;gap:4px;">
                <span style="color:#cc0000;font-weight:bold;font-size:9pt;">N.º</span>
                <span style="font-weight:bold;color:#cc0000;font-family:monospace;font-size:11pt;">${receipt.receiptNumber}</span>
              </div>
            </div>
            <div style="margin-top:10px;">
              <div style="border:1.5px solid #111;padding:6px 11px;min-width:180px;text-align:right;font-weight:bold;font-size:12pt;color:#cc0000;font-family:monospace;">
                ${fmtMT(receipt.amount)}
              </div>
            </div>
          </div>
        </div>

        <!-- CORPO: linhas pontilhadas -->
        <div style="margin-top:6px;line-height:2.1;">

          <!-- Linha 1: cliente -->
          <div style="margin-bottom:10px;position:relative;min-height:28px;">
            <div style="border-bottom:1.5px dotted #555;position:absolute;left:0;right:0;bottom:4px;z-index:1;"></div>
            <span style="background:#fff;padding-right:8px;position:relative;z-index:2;font-size:10.5pt;">
              Recebemos do (a) Exmo. Sr.(a).&nbsp;<strong style="font-size:11pt;text-transform:uppercase;color:#111;font-family:'Helvetica Neue',Arial;">${receipt.client}</strong>
            </span>
          </div>

          <!-- Linha 2: quantia por extenso -->
          <div style="margin-bottom:6px;position:relative;min-height:28px;">
            <div style="border-bottom:1.5px dotted #555;position:absolute;left:0;right:0;bottom:4px;z-index:1;"></div>
            <span style="background:#fff;padding-right:8px;position:relative;z-index:2;font-size:10.5pt;">
              a quantia de&nbsp;<strong style="font-size:10pt;font-style:italic;color:#333;font-family:'Helvetica Neue',Arial;">${extenso}</strong>
            </span>
          </div>
          <div style="border-bottom:1.5px dotted #555;margin-top:12px;margin-bottom:6px;height:1px;"></div>

          <!-- Linha 3: referente ao pagamento da factura -->
          <div style="margin-top:14px;margin-bottom:6px;position:relative;min-height:28px;">
            <div style="border-bottom:1.5px dotted #555;position:absolute;left:0;right:0;bottom:4px;z-index:1;"></div>
            <span style="background:#fff;padding-right:8px;position:relative;z-index:2;font-size:10.5pt;">
              referente ao pagamento da factura&nbsp;<span style="background:#f3f4f6;padding:3px 7px;border-radius:6px;margin-left:4px;font-size:10pt;font-weight:bold;color:#111;">${invoiceRefDisplay}</span>
            </span>
          </div>
          <div style="border-bottom:1.5px dotted #555;margin-top:12px;margin-bottom:6px;height:1px;"></div>

          <!-- Linha 4: de que passamos + data -->
          <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:10.5pt;font-weight:bold;">de que passamos o presente recibo.</span>
            <span style="font-size:10pt;font-weight:bold;">${city}, ${dayStr}&nbsp;de&nbsp;${monthStr}&nbsp;de&nbsp;${yearStr}</span>
          </div>
        </div>

        <!-- MÉTODOS DE PAGAMENTO + ASSINATURA -->
        <div style="display:table;width:100%;margin-top:20px;">
          <div style="display:table-row;">
            <!-- Checkboxes (esquerda) -->
            <div style="display:table-cell;width:55%;vertical-align:top;">
              <div style="font-size:10pt;font-weight:bold;margin-bottom:8px;text-transform:uppercase;color:#444;letter-spacing:0.5px;">Pago em:</div>

              <div style="display:flex;align-items:center;margin-bottom:10px;">
                ${checkBox(isBank)}
                <span style="font-size:10pt;">Transferência Bancária</span>
                ${bankDetail ? `<span style="font-family:monospace;font-size:9pt;margin-left:8px;color:#555;">${bankDetail}</span>` : ''}
              </div>

              <div style="display:flex;align-items:center;margin-bottom:10px;">
                ${checkBox(isMobile)}
                <span style="font-size:10pt;">Carteira Móvel (M-Pesa / E-Mola)</span>
                ${mobileDetail ? `<span style="font-family:monospace;font-size:9pt;margin-left:8px;color:#555;">${mobileDetail}</span>` : ''}
              </div>

              <div style="display:flex;align-items:center;">
                ${checkBox(isCash)}
                <span style="font-size:10pt;">Numerário (Dinheiro)</span>
              </div>
            </div>

            <!-- Assinatura (direita) -->
            <div style="display:table-cell;width:45%;text-align:center;vertical-align:bottom;padding-bottom:5px;">
              <div style="display:inline-block;width:240px;border:1.5px dashed #777;padding:14px 12px 6px 12px;text-align:center;background:#fafafa;position:relative;overflow:visible;">
                ${settings.stampBase64
                  ? `<div style="position:absolute;left:50%;top:-45px;transform:translateX(-50%) rotate(-3deg);width:320px;height:170px;pointer-events:none;z-index:50;">${stampImg(settings.stampBase64)}</div>`
                  : ''}
                <div style="border-top:1.5px solid #333;padding-top:5px;font-size:8.5pt;font-weight:bold;color:#333;text-transform:capitalize;">Assinatura e Carimbo</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé meta -->
        <div style="margin-top:16px;border-top:1.2px solid #e0e0e0;padding-top:6px;font-size:6.5pt;color:#777;text-align:left;text-transform:uppercase;letter-spacing:0.2px;">
          Processado por Computador • ERP Código AT/MZ • ${settings.companyName} — NUIT: ${settings.nuit}
        </div>

      </div>
    </div>
  `;

  await renderToPDF(html, 842, 595, `${receipt.receiptNumber}.pdf`, 'landscape', 'a5');
}

// ─── FINANCIAL REPORT PDF (jsPDF directo, landscape A4) ──────────────────────

export function generateFinancialReportPDF(
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[],
  expenses: Expense[],
  settings: CompanySettings
) {
  const doc = new jsPDF('landscape');
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO FINANCEIRO', pageW / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${settings.companyName || '[Empresa]'} — ${now.toLocaleDateString('pt-MZ', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageW / 2, 28, { align: 'center' }
  );
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 33, pageW - 14, 33);

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending  = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const summaryY = 40;
  const colW = (pageW - 28) / 4;
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  [
    { label: 'Total Facturado', value: formatValue(totalInvoiced, 'MZN') },
    { label: 'Total Recebido',  value: formatValue(totalPaid,     'MZN') },
    { label: 'Total Pendente',  value: formatValue(totalPending,  'MZN') },
    { label: 'Total Despesas',  value: formatValue(totalExpenses, 'MZN') },
  ].forEach((stat, i) => {
    const x = 14 + i * colW;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x, summaryY, colW - 4, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(stat.label, x + (colW - 4) / 2, summaryY + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(stat.value, x + (colW - 4) / 2, summaryY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });

  let currentY = summaryY + 22;

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text('FACTURAS EMITIDAS', 14, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº Factura', 'Cliente', 'Data', 'Vencimento', 'Valor (MT)', 'Estado']],
    body: invoices.map(inv => [inv.invoiceNumber, inv.client, inv.date, inv.dueDate || '—', formatValue(inv.amount, 'MZN'), inv.statusPt]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [50, 60, 100], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('COTAÇÕES EMITIDAS', 14, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº Cotação', 'Cliente', 'Data', 'Validade (dias)', 'Valor (MT)', 'Estado']],
    body: quotes.map(q => [q.quoteNumber, q.client, q.date, String(q.validityDays), formatValue(q.amount, 'MZN'), q.statusPt]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [100, 70, 20], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 250, 245] },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('RECIBOS EMITIDOS', 14, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº Recibo', 'Cliente', 'Data', 'Ref. Factura', 'Método', 'Valor (MT)']],
    body: receipts.map(r => [r.receiptNumber, r.client, r.date, r.invoiceRef, r.methodPt, formatValue(r.amount, 'MZN')]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [20, 100, 60], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 252, 248] },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(6.5); doc.setTextColor(160, 160, 160); doc.setFont('helvetica', 'normal');
  doc.text('Processado por Computador • Gestão Comercial ERP Código AT/MZ', 14, finalY);
  doc.text(`Relatório gerado em: ${now.toLocaleString('pt-MZ')}`, pageW - 14, finalY, { align: 'right' });

  doc.save(`Relatorio_Financeiro_${now.toISOString().slice(0, 10)}.pdf`);
}
