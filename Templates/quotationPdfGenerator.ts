import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Quotation } from '../types';
import { numeroPorExtenso } from './numeroPorExtenso';

export async function downloadQuotationPDF(quote: Quotation) {
  // 1. Create temporary off-screen container matching A4 portrait dimensions
  const container = document.createElement('div');
  container.id = 'temp-pdf-quotation';
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '840px'; 
  container.style.height = '1140px'; 
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  container.style.padding = '35px';
  container.style.boxSizing = 'border-box';

  const logoUrl = '/logotipo_facturas.png';
  const hasItems = quote.items && quote.items.length > 0;
  let subtotal = 0;
  let itemRowHtml = '';
  let numberOfItems = 0;

  if (hasItems) {
    subtotal = quote.items!.reduce((sum, item) => sum + item.totalPrice, 0);
    numberOfItems = quote.items!.length;
    itemRowHtml = quote.items!.map((item) => {
      return `
        <tr style="height: 35px;">
          <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 10px; font-size: 13.5px; text-align: center; font-weight: bold; color: #000;">
            ${item.qty}
          </td>
          <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 12px; font-size: 13.5px; text-align: left; font-weight: bold; color: #000;">
            ${item.description}
          </td>
          <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 12px; font-size: 13.5px; text-align: right; font-weight: bold; color: #000;">
            ${item.unitPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
          </td>
          <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 12px; font-size: 13.5px; text-align: right; font-weight: bold; color: #000;">
            ${item.totalPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
          </td>
        </tr>
      `;
    }).join('');
  } else {
    const defaultQty = quote.qty || 1;
    const defaultPrice = quote.unitPrice || quote.amount;
    subtotal = defaultQty * defaultPrice;
    numberOfItems = 1;
    itemRowHtml = `
      <tr style="height: 35px;">
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 10px; font-size: 13.5px; text-align: center; font-weight: bold; color: #000;">
          ${defaultQty}
        </td>
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 12px; font-size: 13.5px; text-align: left; font-weight: bold; color: #000;">
          Serviço de Catering de Excelência: ${quote.designacao}
        </td>
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 12px; font-size: 13.5px; text-align: right; font-weight: bold; color: #000;">
          ${defaultPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
        </td>
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 1.5px dotted #999; padding: 6px 12px; font-size: 13.5px; text-align: right; font-weight: bold; color: #000;">
          ${subtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
        </td>
      </tr>
    `;
  }

  // const ispc = subtotal * 0.03;
  const total = subtotal;

  const amountExtensoString = numeroPorExtenso(total);

  // Fill empty space with dotted notepad lines up to 8 rows
  const idleRowsCount = Math.max(1, 8 - numberOfItems);
  const blankRowsHtml = Array.from({ length: idleRowsCount }).map((_, index) => {
    const isLast = index === (idleRowsCount - 1);
    return `
      <tr style="height: 38px;">
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: ${isLast ? '2px solid #000' : '1.5px dotted #ccc'};"></td>
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: ${isLast ? '2px solid #000' : '1.5px dotted #ccc'};"></td>
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: ${isLast ? '2px solid #000' : '1.5px dotted #ccc'};"></td>
        <td style="border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: ${isLast ? '2px solid #000' : '1.5px dotted #ccc'};"></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- MAIN PRECISE NOTEPAD OUTER WRAPPER CONTAINER -->
    <div style="width: 100%; height: 100%; border: 3px solid #000000; padding: 20px; box-sizing: border-box; background-color: #ffffff; display: flex; flex-direction: column; justify-content: space-between;">
      
      <div>
        <!-- TOP SECTION: Cotação ID Number Card -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
          <div style="border: 2px solid #000000; border-radius: 8px; text-align: center; padding: 8px; width: 45%; background: #fafafa;">
            <div style="font-weight: 900; font-size: 17px; text-transform: uppercase; letter-spacing: 1px; color: #000; font-family: sans-serif;">
              COTAÇÃO
            </div>
            <div style="font-size: 16px; font-weight: 900; color: #c2410c; margin-top: 4px; font-family: monospace;">
              N.º ${quote.id}
            </div>
          </div>
        </div>

        <!-- COMPANY & CLIENT HEADER BLOCKS -->
        <div style="display: flex; gap: 15px; margin-bottom: 15px; width: 100%; align-items: flex-start;">
          <!-- Logo block -->
          <div style="width: 14%; display: flex; align-items: center; justify-content: center; padding-top: 4px;">
            <img src="${logoUrl}" alt="Logotipo Catiça" style="width: 100%; max-width: 110px; height: auto; object-fit: contain; border: 1px solid #e0dfdd; background: #fff; padding: 6px; border-radius: 12px;" />
          </div>

          <!-- Company Info (Left Box) -->
          <div style="width: 31%; border: 2px solid #000000; border-radius: 8px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: center; background: #fafafa;">
            <div style="font-weight: 950; font-size: 14px; text-transform: uppercase; margin-bottom: 6px; color: #000; letter-spacing: -0.2px; line-height: 1.2;">
              Catiça Catering Doces e Salgados, Limitada
            </div>
            <div style="font-size: 12px; line-height: 1.4; color: #000; font-weight: bold;">
              Bairro Chalambe - 02<br>
              Cell: 865252587 / 875529382 / 879073935<br>
              NUIT: 401878319<br>
              Inhambane - Moçambique
            </div>
          </div>
          
          <!-- Client Info (Right Box) -->
          <div style="width: 55%; border: 2px solid #000000; border-radius: 8px; padding: 12px; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="border-bottom: 1.5px dotted #333; padding-bottom: 2px; font-size: 13.5px; display: flex; align-items: baseline;">
              <span style="font-weight: bold; margin-right: 6px; white-space: nowrap;">Exmo.(s) Sr.(s):</span>
              <span style="font-weight: 900; color: #000; font-size: 14.5px;">${quote.client}</span>
            </div>
            <div style="border-bottom: 1.5px dotted #333; padding-bottom: 2px; font-size: 13.5px; display: flex; align-items: baseline;">
              <span style="font-weight: bold; margin-right: 6px; white-space: nowrap;">Morada:</span>
              <span style="font-weight: bold; color: #333;">${quote.address || 'Inhambane, Moçambique'}</span>
            </div>
            <div style="border-bottom: 1.5px dotted #333; padding-bottom: 2px; font-size: 13.5px; display: flex; align-items: baseline; margin-bottom: 0;">
              <span style="font-weight: bold; margin-right: 6px; white-space: nowrap;">NUIT:</span>
              <span style="font-family: monospace; font-weight: 900; color: #000;">${quote.nuit || '401878319'}</span>
            </div>
          </div>
        </div>

        <!-- LOCATION AND DATE BAR ROW -->
        <div style="display: flex; gap: 15px; margin-bottom: 20px; width: 100%;">
          <div style="width: 45%; border: 2px solid #000000; border-radius: 8px; text-align: center; font-weight: 950; font-size: 17px; letter-spacing: 2px; padding: 8px 0; text-transform: uppercase; background: #fafafa; color: #001;">
            Inhambane
          </div>
          <div style="width: 55%; border: 2px solid #000000; border-radius: 8px; padding: 8px 14px; display: flex; align-items: center; justify-content: center; font-size: 13.5px; font-weight: bold; background: #ffffff;">
            <span>Data de Emissão: <strong style="color: #c2410c; margin-left: 5px;">${quote.date}</strong></span>
          </div>
        </div>

        <!-- ITEMS GRID TABLE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="background-color: #f3f4f6; height: 32px;">
              <th style="border: 2px solid #000; padding: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: center; width: 10%;">Quant.</th>
              <th style="border: 2px solid #000; padding: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: left; padding-left: 12px; width: 54%;">Designação</th>
              <th style="border: 2px solid #000; padding: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: right; padding-right: 12px; width: 18%;">Preço Unit.</th>
              <th style="border: 2px solid #000; padding: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: right; padding-right: 12px; width: 18%;">Preço Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowHtml}
            ${blankRowsHtml}
          </tbody>
        </table>

        <!-- AMOUNT IN WORDS (Extenso) BOX -->
        <div style="border: 2px dotted #666666; padding: 10px; margin-top: 15px; border-radius: 6px; background-color: #fafafa;">
          <div style="font-weight: bold; font-size: 12px; color: #374151; text-transform: uppercase;">Valor por extenso:</div>
          <div style="margin-top: 6px; font-size: 14px; font-weight: bold; font-style: italic; color: #111; line-height: 1.4;">
            ${amountExtensoString}
          </div>
        </div>
      </div>

      <!-- BOTTOM ROW / BREAKDOWN, LABELS, CARIMBO AND SIGNATURES -->
      <div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-top: 15px; gap: 15px;">
          <!-- Left Side Justification (Exemption) -->
          <div style="width: 54%; border: 2px solid #000000; border-radius: 8px; padding: 10px; background: #ffffff;">
            <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #000; text-transform: uppercase;">
              Motivos de Justificação da não Aplicação do Imposto:
            </div>
            <div style="font-size: 12.5px; line-height: 1.5; font-weight: bold; color: #374151;">
              Tributação ISPC, Lei 5/2009 e 12 de Janeiro.<br>
              Isenção de IVA ao abrigo do regulamento simplificado de pequenos contribuintes (Moçambique).
            </div>
          </div>
          
          <!-- Right Side Financial Summary Block -->
          <div style="width: 44%; display: flex; flex-direction: column; gap: 5px; justify-content: center; border: 2px solid #000; padding: 10px; border-radius: 8px; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #333;">
              <span>Sub-Total:</span>
              <span>${subtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #333; border-bottom: 1.5px dotted #000; padding-bottom: 4px; margin-bottom: 4px;">
              <span>ISPC 3%:</span>
              <span>Incluso</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; color: #000;">
              <span>TOTAL:</span>
              <span style="color: #c2410c;">${total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
            </div>
          </div>
        </div>

        <!-- SIGNATURE AND CARIMBO STAMP AREA -->
        <div style="display: flex; justify-content: space-between; items-center; margin-top: 25px; padding-top: 10px; border-top: 1.5px solid #eaeaea; position: relative; min-height: 120px;">
          
          <!-- Metadata footer -->
          <div style="width: 50%; font-size: 9px; color: #6b7280; font-weight: bold; line-height: 1.4; display: flex; flex-direction: column; justify-content: flex-end;">
            <span>Documento informativo de cotação oficial.</span>
            <span>Photocopy Technology - NUIT: 400562751 - Aut. 01/DAF2/2017 - Av. Acordos de Lusaka nº 27</span>
          </div>

          <!-- Signature box -->
          <div style="width: 45%; display: flex; flex-direction: column; align-items: center; position: relative;">
            <div style="width: 100%; border-top: 1.5px solid #000000; text-align: center; padding-top: 6px; font-size: 13px; font-weight: bold; color: #000; margin-top: 65px;">
              Assinatura e Carrimbo
            </div>

            <!-- OVERLAY CARIMBO IMAGE -->
            <div style="position: absolute; right: 40px; top: -2px; width: 200px; height: 105px; transform: rotate(-3deg); pointer-events: none; z-index: 50;">
              <img src="/carrimbo.webp" alt="Carimbo e Assinatura" style="width: 100%; height: 100%;  display: block;" />
            </div>
          </div>

        </div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    // 2. Render container page to high quality canvas
    const canvas = await html2canvas(container, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // 3. Make A4 portrait size page (210mm wide x 297mm high)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

    // 4. Force download saved document
    pdf.save(`Cotacao_Catiça_${quote.id.replace('#', '')}.pdf`);
  } catch (error) {
    console.error('Failed to generate A4 Portrait Quotation PDF:', error);
  } finally {
    // 5. Clean up temporary DOM placement
    document.body.removeChild(container);
  }
}
