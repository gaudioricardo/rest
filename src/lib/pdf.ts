/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quote, Receipt, Expense, DocumentItem, CompanySettings } from '../types';
import { formatValue } from '../data';

// Helper: add company header to a doc
function addHeader(
  doc: jsPDF,
  settings: CompanySettings,
  docType: string,
  docNumber: string,
  issueDate: string,
  extraInfo?: { label: string; value: string }[]
): number {
  const pageW = doc.internal.pageSize.getWidth();

  // Logo
  if (settings.logoBase64) {
    try {
      doc.addImage(settings.logoBase64, 'PNG', 14, 10, 30, 15);
    } catch { /* skip if image fails */ }
  }

  // Company name & info (left column)
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text((settings.companyName || '[Nome da Empresa]').toUpperCase(), 14, 32);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(settings.address || '[Endereço]', 14, 38);
  doc.text(`${settings.city || '[Cidade]'} - Moçambique`, 14, 43);
  doc.text(`Tel: ${settings.phone || '[Telefone]'}`, 14, 48);
  doc.text(`Email: ${settings.email || '[Email]'}`, 14, 53);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`NUIT DO EMITENTE: ${settings.nuit || '[NUIT]'}`, 14, 60);

  // Document type box (right column)
  const boxX = pageW - 80;
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(boxX, 10, 70, 55, 3, 3, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(boxX, 10, 70, 55, 3, 3, 'S');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(docType.toUpperCase(), boxX + 35, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`CÓDIGO: ${docNumber}`, boxX + 5, 31);
  doc.text(`EMISSÃO: ${issueDate}`, boxX + 5, 38);
  if (extraInfo) {
    extraInfo.forEach((info, i) => {
      doc.text(`${info.label}: ${info.value}`, boxX + 5, 45 + i * 7);
    });
  }
  doc.setFontSize(6.5);
  doc.text('DOCUMENTO DE REGISTO • ORIGINAL', boxX + 35, 62, { align: 'center' });

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 68, pageW - 14, 68);

  return 72; // return Y position after header
}

// Helper: add client section
function addClientSection(doc: jsPDF, clientName: string, clientNuit?: string, startY = 72): number {
  doc.setFillColor(251, 251, 251);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 22, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('ADQUIRENTE / CLIENTE', 18, startY + 7);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(clientName.toUpperCase(), 18, startY + 14);
  if (clientNuit) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`NUIT: ${clientNuit}`, 18, startY + 20);
  }
  return startY + 26;
}

// Helper: add items table
function addItemsTable(doc: jsPDF, items: DocumentItem[], startY: number): number {
  const tableItems = items.length > 0 ? items : [{ description: '—', quantity: 1, unitPrice: 0 }];
  autoTable(doc, {
    startY,
    head: [['Descrição', 'Qtd', 'Preço Unit. (MT)', 'Total (MT)']],
    body: tableItems.map(it => [
      it.description,
      it.quantity.toString(),
      formatValue(it.unitPrice, 'MZN'),
      formatValue(it.quantity * it.unitPrice, 'MZN'),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [240, 240, 245], textColor: [30, 30, 30], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
}

// Helper: add totals
function addTotals(doc: jsPDF, subtotal: number, taxRate: number, startY: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const x = pageW - 85;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal Líquido:', x, startY);
  doc.text(formatValue(subtotal, 'MZN'), pageW - 14, startY, { align: 'right' });
  doc.text(`ISPC (${Math.round(taxRate * 100)}%):`, x, startY + 7);
  doc.text(formatValue(tax, 'MZN'), pageW - 14, startY + 7, { align: 'right' });
  doc.setDrawColor(30, 30, 30);
  doc.line(x, startY + 10, pageW - 14, startY + 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 20, 20);
  doc.text('VALOR TOTAL:', x, startY + 17);
  doc.text(formatValue(total, 'MZN'), pageW - 14, startY + 17, { align: 'right' });
  doc.setTextColor(30, 30, 30);
  return startY + 22;
}

// Helper: add footer with banks + stamp
function addFooter(doc: jsPDF, settings: CompanySettings, startY: number) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setDrawColor(220, 220, 220);
  doc.line(14, startY, pageW - 14, startY);
  const y = startY + 6;

  // Bank accounts
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('DADOS BANCÁRIOS:', 14, y);
  doc.setFont('helvetica', 'normal');
  settings.bankAccounts.forEach((ba, i) => {
    doc.text(`${ba.bank}: ${ba.iban}`, 14, y + 5 + i * 5);
  });
  settings.mobileContacts.forEach((mc, i) => {
    doc.text(`${mc.provider}: ${mc.number}`, 14, y + 5 + (settings.bankAccounts.length + i) * 5);
  });

  // Signature + stamp
  const sigX = pageW - 70;
  doc.roundedRect(sigX, y, 56, 28, 2, 2, 'S');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('Assinatura / Carimbo Autorizado', sigX + 28, y + 14, { align: 'center' });
  if (settings.stampBase64) {
    try { doc.addImage(settings.stampBase64, 'PNG', sigX + 4, y + 2, 24, 24); } catch { /* skip */ }
  }

  // Footer meta
  const metaY = y + 38;
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  const now = new Date();
  doc.text(`Processado por Computador • ERP Código AT/MZ`, 14, metaY);
  doc.text(`Mês Fiscal: ${now.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' })}`, pageW - 14, metaY, { align: 'right' });
}

// ─── PUBLIC GENERATORS ────────────────────────────────────────────────────────

export function generateInvoicePDF(invoice: Invoice, items: DocumentItem[], settings: CompanySettings) {
  const doc = new jsPDF();
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) || invoice.amount;
  let y = addHeader(
    doc,
    settings,
    'FACTURA',
    invoice.invoiceNumber,
    invoice.date,
    invoice.dueDate ? [{ label: 'VENCIMENTO', value: invoice.dueDate }] : undefined
  );
  y = addClientSection(doc, invoice.client, invoice.clientNuit, y);
  y = addItemsTable(
    doc,
    items.length > 0
      ? items
      : [{ description: invoice.description || 'Serviços prestados', quantity: 1, unitPrice: invoice.amount }],
    y + 4
  );
  y = addTotals(doc, subtotal, 0.03, y + 4);
  addFooter(doc, settings, y + 8);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function generateQuotePDF(quote: Quote, items: DocumentItem[], settings: CompanySettings) {
  const doc = new jsPDF();
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) || quote.amount;
  let y = addHeader(doc, settings, 'COTAÇÃO', quote.quoteNumber, quote.date, [
    { label: 'VALIDADE', value: `${quote.validityDays} dias` },
  ]);
  y = addClientSection(doc, quote.client, quote.clientNuit, y);
  y = addItemsTable(
    doc,
    items.length > 0
      ? items
      : [{ description: quote.description || 'Proposta de serviços', quantity: 1, unitPrice: quote.amount }],
    y + 4
  );
  y = addTotals(doc, subtotal, 0.03, y + 4);
  addFooter(doc, settings, y + 8);
  doc.save(`${quote.quoteNumber}.pdf`);
}

export function generateReceiptPDF(receipt: Receipt, settings: CompanySettings) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, settings, 'RECIBO', receipt.receiptNumber, receipt.date, [
    { label: 'REF. FACTURA', value: receipt.invoiceRef },
  ]);
  y = addClientSection(doc, receipt.client, undefined, y);
  y += 8;
  doc.setFillColor(245, 248, 255);
  doc.roundedRect(14, y, pageW - 28, 20, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`A importância de `, 18, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 20, 20);
  doc.text(formatValue(receipt.amount, 'MZN'), 18 + doc.getTextWidth('A importância de '), y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`referente à liquidação da Factura ${receipt.invoiceRef}.`, 18, y + 15);
  y += 26;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Forma de Pagamento: `, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.methodPt, 14 + doc.getTextWidth('Forma de Pagamento: '), y);
  y += 8;
  doc.setFillColor(235, 240, 247);
  doc.roundedRect(14, y, 80, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`VALOR RECEBIDO: ${formatValue(receipt.amount, 'MZN')}`, 18, y + 8);
  addFooter(doc, settings, y + 18);
  doc.save(`${receipt.receiptNumber}.pdf`);
}

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

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO FINANCEIRO', pageW / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${settings.companyName || '[Empresa]'} — ${now.toLocaleDateString('pt-MZ', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageW / 2,
    28,
    { align: 'center' }
  );
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 33, pageW - 14, 33);

  // Summary stats
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices
    .filter(i => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const summaryY = 40;
  const colW = (pageW - 28) / 4;
  [
    { label: 'Total Facturado', value: formatValue(totalInvoiced, 'MZN') },
    { label: 'Total Recebido', value: formatValue(totalPaid, 'MZN') },
    { label: 'Total Pendente', value: formatValue(totalPending, 'MZN') },
    { label: 'Total Despesas', value: formatValue(totalExpenses, 'MZN') },
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

  // Invoices table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('FACTURAS EMITIDAS', 14, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº Factura', 'Cliente', 'Data', 'Vencimento', 'Valor (MT)', 'Estado']],
    body: invoices.map(inv => [
      inv.invoiceNumber,
      inv.client,
      inv.date,
      inv.dueDate || '—',
      formatValue(inv.amount, 'MZN'),
      inv.statusPt,
    ]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [50, 60, 100], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Quotes table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('COTAÇÕES EMITIDAS', 14, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº Cotação', 'Cliente', 'Data', 'Validade (dias)', 'Valor (MT)', 'Estado']],
    body: quotes.map(q => [
      q.quoteNumber,
      q.client,
      q.date,
      String(q.validityDays),
      formatValue(q.amount, 'MZN'),
      q.statusPt,
    ]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [100, 70, 20], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 250, 245] },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Receipts table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBOS EMITIDOS', 14, currentY);
  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº Recibo', 'Cliente', 'Data', 'Ref. Factura', 'Método', 'Valor (MT)']],
    body: receipts.map(r => [
      r.receiptNumber,
      r.client,
      r.date,
      r.invoiceRef,
      r.methodPt,
      formatValue(r.amount, 'MZN'),
    ]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [20, 100, 60], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 252, 248] },
    margin: { left: 14, right: 14 },
  });

  // Page footer
  const finalY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.setFont('helvetica', 'normal');
  doc.text('Processado por Computador • Gestão Comercial ERP Código AT/MZ', 14, finalY);
  doc.text(`Relatório gerado em: ${now.toLocaleString('pt-MZ')}`, pageW - 14, finalY, { align: 'right' });

  doc.save(`Relatorio_Financeiro_${now.toISOString().slice(0, 10)}.pdf`);
}
