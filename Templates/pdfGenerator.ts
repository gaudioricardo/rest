import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice } from '../types';

export async function downloadInvoicePDF(invoice: Invoice, qty = 1, unitPrice = 0) {
  // 1. Create temporary container styled exactly to A5 Landscape aspect ratio (approx 1.418 : 1)
  const container = document.createElement('div');
  container.id = 'temp-pdf-invoice';
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '1000px';
  container.style.height = '705px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = '"Arial", sans-serif';
  container.style.padding = '18px';
  container.style.boxSizing = 'border-box';

  const logoUrl = '/logotipo_facturas.png';
  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ qty, description: invoice.description, unitPrice, totalPrice: qty * unitPrice }];

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  // const ispc = subtotal * 0.00;
  const total = subtotal;

  const itemsRowsHtml = items.map((item, index) => `
    <tr style="height: 30px;">
      <td style="border: 1.5px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 13px;">${String(index + 1).padStart(2, '0')}</td>
      <td style="border: 1.5px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 13px;">${item.qty}</td>
      <td style="border: 1.5px solid #000; padding: 4px; text-align: left; font-weight: bold; padding-left: 8px; font-size: 13px;">${item.description}</td>
      <td style="border: 1.5px solid #000; padding: 4px; text-align: right; font-weight: bold; padding-right: 8px; font-size: 13px;">${item.unitPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
      <td style="border: 1.5px solid #000; padding: 4px; text-align: right; font-weight: bold; padding-right: 8px; font-size: 13px;">${item.totalPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</td>
    </tr>
  `).join('');

  const emptyRowsHtml = Array.from({ length: Math.max(0, 4 - items.length) }).map(() => `
    <tr style="height: 30px;">
      <td style="border: 1.5px solid #000; padding: 4px;"></td>
      <td style="border: 1.5px solid #000; padding: 4px;"></td>
      <td style="border: 1.5px solid #000; padding: 4px;"></td>
      <td style="border: 1.5px solid #000; padding: 4px;"></td>
      <td style="border: 1.5px solid #000; padding: 4px;"></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <!-- INVOICE OUTER WRAPPER IN RESILIENT LANDSCAPE FORMAT -->
    <div style="width: 100%; height: 100%; border: 2.5px solid #000; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
      
      <div>
        <!-- CABEÇALHO (A5 Landscape Optimized Header) -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; gap: 16px;">
          <!-- Left details -->
          <div style="display: flex; gap: 12px; align-items: flex-start; width: 70%;">
            <img src="${logoUrl}" alt="Logotipo Catiça" style="width: 96px; height: auto; object-fit: contain; border: 1px solid #e0dfdd; padding: 4px; background: #fff;" />
            <div style="flex: 1; min-width: 0;">
              <h2 style="margin: 0; font-size: 17.5px; font-weight: bold; text-transform: uppercase; color: #000; font-family: 'Arial', sans-serif; letter-spacing: -0.5px;">
                CATIÇA CATERING DOCES E SALGADOS, LIMITADA
              </h2>
              <p style="font-size: 12.5px; line-height: 1.4; margin: 4px 0 0 0; color: #000; font-weight: bold;">
                Bairro Chalambe - 02 | Cell: 865228382 / 875293837 - 070779333<br>
                NUIT: 401878319 | Inhambane - Moçambique
              </p>
            </div>
          </div>

          <!-- Right details -->
          <div style="width: 27%; text-align: right; display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
            <div style="text-align: right; font-size: 15px; font-weight: bold; color: #000; min-width: 90px;">
              FACTURA
            </div>
            <!-- Data stamp outline -->
            <div style="border: 1.5px solid #000; padding: 4px 8px; width: 105px; text-align: center; font-size: 11.5px; font-weight: bold; background: #fafafa; white-space: nowrap;">
              ${invoice.date}
            </div>
            <div style="font-size: 15px; font-weight: bold; color: #000;">
              Nº
            </div>
            <!-- Invoice ID stamp outline -->
            <div style="border: 1.5px solid #000; padding: 4px 8px; min-width: 80px; text-align: center; font-size: 13.5px; font-weight: 900; color: #c2410c; background: #fafafa;">
              ${invoice.id}
            </div>
          </div>
        </div>

        <!-- CLIENTE / DETALHES -->
        <div style="border: 1.5px solid #000; border-radius: 6px; padding: 8px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
          <div>
            <span style="font-size: 10px; font-weight: bold; color: #333; text-transform: uppercase; display: inline-block; margin-right: 8px;">CLIENTE / PRESTADOR:</span>
            <strong style="font-size: 14px; color: #000; display: inline-block;">${invoice.designacao}</strong>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: bold; color: #333; text-transform: uppercase; display: inline-block; margin-right: 8px;">ESTADO:</span>
            <strong style="font-size: 13px; color: #16a34a; text-transform: uppercase; display: inline-block;">${invoice.status}</strong>
          </div>
        </div>

        <!-- TABELA (Table) -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12.5px;">
          <thead>
            <tr style="background: #f3f4f6; height: 28px;">
              <th style="border: 1.5px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 8%;">ITEM</th>
              <th style="border: 1.5px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 8%;">QUANT.</th>
              <th style="border: 1.5px solid #000; padding: 5px; text-align: left; font-weight: bold; padding-left: 8px; width: 50%;">DESIGNAÇÃO</th>
              <th style="border: 1.5px solid #000; padding: 5px; text-align: right; font-weight: bold; padding-right: 8px; width: 17%;">Preço Unitário</th>
              <th style="border: 1.5px solid #000; padding: 5px; text-align: right; font-weight: bold; padding-right: 8px; width: 17%;">VALOR</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            ${emptyRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- FOOTER AREA COMPACTED YET GRAPHICALLY RICH FOR A5 LANDSCAPE -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; border-top: 1.5px solid #000; padding-top: 8px;">
        <!-- Left Footer: Exemption and payment boxes -->
        <div style="width: 58%; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 12px; color: #000; line-height: 1.4;">
            <strong>Motivo de não incidência do IVA:</strong><br>
            Tributação ISPC, Lei 5/2009 e 12 de Janeiro
          </div>

          <div style="font-size: 12px; color: #000; font-weight: bold; display: flex; gap: 15px; margin-top: 4px;">
            <span>[ X ] Dinheiro</span>
            <span>[  ] Cheque nº _________</span>
            <span>[  ] Outros _________</span>
          </div>
        </div>

        <!-- Right Footer: Totals and Signature/Stamp area (stamp positioned to not cover totals) -->
        <div style="width: 38%; display: flex; flex-direction: column; gap: 8px; position: relative; min-height: 140px;">

          <!-- Totais (Total Box) - bring to front with higher z-index -->
          <div style="position: relative; z-index: 60; font-size: 12px; color: #000; line-height: 1.4; border: 1.5px solid #000; padding: 12px; border-radius: 6px; background: #fafafa; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Sub-total:</span>
              <span>${subtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1.2px dotted #000; padding-bottom: 4px; margin-bottom: 6px;">
              <span>ISPC 3%:</span>
              <span>Incluso</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
              <span>TOTAL:</span>
              <span style="color: #c2410c;">${total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
            </div>
          </div>

          <!-- Signature box similar to receipt -->
          <div style="position: relative; z-index: 55;">
            <div style="border: 1.2px dashed #777777; padding: 12px; border-radius: 8px; background: #fff; display: flex; flex-direction: column; align-items: center; min-height: 72px; justify-content: center;">
              
              <div style="width: 75%; height: 14px; border-top: 1.2px solid #333; margin-top: 6px;"></div>
              <div style="font-size: 9px; font-weight: 700; color: #333; margin-bottom: 6px;">Assinatura e Carimbo</div>
            </div>
            
          </div>

          <!-- CARIMBO IMAGE OVERLAY -->
          <div style="position: absolute; right: 46px; bottom: -15px; width: 250px; height: 115px; transform: rotate(-4deg); pointer-events: none; z-index: 80;">
            <img src="/carrimbo.webp" alt="Carimbo e Assinatura" style="width: 100%; height: 100%;  display: block;" />
          </div>

        </div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    // 2. Render container to rich HTML canvas
    const canvas = await html2canvas(container, {
      scale: 2.5, // slightly higher scale for perfect readability in A5
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // 3. Make A5 size in Landscape posture (210mm wide x 148mm high)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });

    // Add image stretching completely bounds within A5 dimensions limits
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 148);

    // 4. Force download
    pdf.save(`Factura_Catiça_${invoice.id.replace('#', '')}.pdf`);
  } catch (error) {
    console.error('Failed to generate A5 Landscape PDF:', error);
  } finally {
    // 5. Cleanup DOM tree
    document.body.removeChild(container);
  }
}
