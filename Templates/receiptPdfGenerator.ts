import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Receipt } from '../types';

export async function downloadReceiptPDF(receipt: Receipt) {
  // 1. Create temporary container in landscape format (matches A5 landscape aspect ratio)
  const container = document.createElement('div');
  container.id = 'temp-pdf-receipt';
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '1684px';  // A5 Landscape width in pixels at standard high-def scale
  container.style.height = '1190px'; // A5 Landscape height in pixels
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '20px';
  container.style.boxSizing = 'border-box';

  const logoUrl = '/logotipo_facturas.png';
  const isCheque = receipt.paymentMethod === 'Cheque';
  const isDinheiro = receipt.paymentMethod === 'Dinheiro';
  const isOutros = receipt.paymentMethod === 'Outros';

  // Parse receipt date into classic day, month name (in PT-PT), and year
  let dayStr = '__';
  let monthStr = '_________________';
  let yearStr = '20___';

  try {
    const cleanDateStr = receipt.date.replace(/de/gi, ' ').trim();
    const parsedDate = new Date(cleanDateStr);
    
    // Check if valid date
    if (!isNaN(parsedDate.getTime())) {
      dayStr = String(parsedDate.getDate()).padStart(2, '0');
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      monthStr = months[parsedDate.getMonth()];
      yearStr = String(parsedDate.getFullYear());
    } else {
      // Fallback regex parsers for formats like "20/05/2026" or "20-05-2026"
      const matchSlash = receipt.date.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (matchSlash) {
        dayStr = matchSlash[1].padStart(2, '0');
        const mIdx = parseInt(matchSlash[2], 10) - 1;
        const months = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        monthStr = months[mIdx] || '_________';
        yearStr = matchSlash[3];
      } else {
        // Simple word split fallback
        const parts = receipt.date.split(' ');
        if (parts.length >= 3) {
          dayStr = parts[0].padStart(2, '0');
          monthStr = parts[1];
          yearStr = parts[2];
        }
      }
    }
  } catch (e) {
    console.warn('Could not parse receipt date:', e);
  }

  container.innerHTML = `
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
        }
        .recibo-outer-canvas {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111111;
            width: 100%;
            height: 100%;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        /* Main Outline matching the Slip layout in Landscape */
        .recibo-container {
            width: 100%;
            height: 100%;
            border: 1.5px solid #222222;
            padding: 24px;
            background-color: #ffffff;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Top Bar Layout with Company Info and Recibo Title */
        .top-table {
            display: flex;
            flex-wrap: wrap;
            width: 100%;
            margin-bottom: 15px;
            gap: 16px;
            align-items: flex-start;
        }
        .top-row {
            display: flex;
            width: 100%;
            flex-wrap: wrap;
            gap: 16px;
            align-items: flex-start;
        }
        .company-header {
            display: flex;
            width: min(100%, 60%);
            gap: 12px;
            align-items: flex-start;
            min-width: 0;
        }
        .company-header img {
            max-width: 120px;
            width: 100%;
            height: auto;
            border-radius: 10px;
        }
        .company-title {
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
            line-height: 1.2;
            color: #111111;
        }
        .company-meta {
            font-size: 8.5pt;
            line-height: 1.4;
            color: #333333;
        }
        
        .recibo-header {
            display: flex;
            flex-direction: column;
            width: min(100%, 35%);
            text-align: right;
            align-items: flex-end;
            min-width: 0;
        }
        .title-group {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
            width: 100%;
        }
        .main-title {
            font-weight: bold;
            font-size: 15pt;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            display: inline-block;
            vertical-align: middle;
        }
        .number-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1.5px solid #111111;
            padding: 8px 12px;
            min-width: 130px;
            background: #ffffff;
        }
        .number-prefix {
            color: #cc0000;
            font-weight: bold;
            margin-right: 6px;
        }
        .number-line {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: none;
            min-width: 110px;
            padding: 6px 10px;
            border-radius: 10px;
            position: relative;
        }
        .number-value {
            position: static;
            left: auto;
            bottom: auto;
            font-weight: bold;
            color: #cc0000;
            font-family: monospace;
            font-size: 11pt;
            line-height: 1;
            z-index: 10;
        }

        /* Amount box right under number */
        .amount-container {
            margin-top: 10px;
            text-align: right;
        }
        .amount-box {
            display: inline-block;
            border: 1.5px solid #111111;
            padding: 6px 12px;
            min-width: 180px;
            text-align: right;
            font-weight: bold;
            font-size: 12pt;
            color: #cc0000;
            font-family: monospace;
        }

        /* Form Body fields with dotted lines */
        .form-section {
            margin-top: 14px;
            line-height: 2.1;
        }
        .form-line {
            margin-bottom: 10px;
            position: relative;
            word-wrap: break-word;
            min-height: 28px;
        }
        .dotted-fill {
            border-bottom: 1.5px dotted #555555;
            display: inline-block;
            position: absolute;
            left: 0;
            right: 0;
            bottom: 4px;
            z-index: 1;
        }
        .label-text {
            background-color: #ffffff;
            padding-right: 8px;
            position: relative;
            z-index: 2;
            font-size: 10.5pt;
        }
        .filled-value {
            display: inline-block;
            background-color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 8px;
            margin-left: 6px;
            font-size: 10.5pt;
            font-weight: bold;
            color: #111111;
        }

        /* Specific styles for multi-line spacing rows */
        .line-extended {
            border-bottom: 1.5px dotted #555555;
            margin-top: 14px;
            margin-bottom: 6px;
            height: 1px;
        }

        /* Payment methods section */
        .payment-methods {
            margin-top: 22px;
            display: table;
            width: 100%;
        }
        .payment-row {
            display: table-row;
        }
        .checkbox-cell {
            display: table-cell;
            width: 55%;
            vertical-align: top;
            line-height: 1.8;
        }
        .check-container {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        .square-box {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 1.5px solid #000000;
            margin-right: 10px;
            vertical-align: middle;
            text-align: center;
            line-height: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        .check-label {
            vertical-align: middle;
            font-size: 10pt;
            color: #111111;
        }
        .inline-dotted {
            border-bottom: 1.5px dotted #555555;
            display: inline-block;
            height: 15px;
            vertical-align: bottom;
            margin-left: 6px;
            font-family: monospace;
            font-weight: bold;
            font-size: 10pt;
            padding-left: 6px;
        }

        /* Signature and stamp side area */
        .stamp-signature-cell {
            display: table-cell;
            width: 45%;
            text-align: center;
            vertical-align: bottom;
            padding-bottom: 5px;
        }
        .signature-box-wrapper {
            display: inline-block;
            width: 240px;
            border: 1.5px dashed #777777;
            padding: 15px 12px 6px 12px;
            text-align: center;
            background-color: #fafafa;
            position: relative;
            overflow: visible;
        }
        .signature-line-text {
            border-top: 1.5px solid #333333;
            padding-top: 5px;
            font-size: 8.5pt;
            font-weight: bold;
            color: #333333;
            text-transform: capitalize;
        }

        /* Bottom Print house metadata */
        .footer-metadata {
            margin-top: 20px;
            border-top: 1.2px solid #e0e0e0;
            padding-top: 6px;
            font-size: 6.5pt;
            color: #777777;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
    </style>

    <div class="recibo-outer-canvas">
        <div class="recibo-container">
            <div>
                <!-- Top Block Header -->
                <div class="top-table">
                    <div class="top-row">
                        <!-- Left Info Component -->
                        <div class="company-header" style="display:flex; gap:12px; align-items:flex-start;">
                            <img src="${logoUrl}" alt="Logotipo Catiça" style="width: 98px; height: auto; object-fit: contain; border: 1px solid #e0dfdd; padding: 4px; background: #fff; border-radius: 10px;" />
                            <div>
                                <div class="company-title">Catiça Catering Doces e Salgados, Limitada</div>
                                <div class="company-meta">
                                    Bairro Chalambe - 02<br>
                                    Cell: 865252587 / 875529382 / 879073935<br>
                                    NUIT: 401878319<br>
                                    Inhambane - Moçambique
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right Title & Number Component -->
                        <div class="recibo-header">
                            <div class="title-group">
                                <span class="main-title">Recibo</span>
                                <span class="number-box">
                                    <span class="number-prefix">N.º</span>
                                    <span class="number-line">
                                        <span class="number-value">${receipt.id}</span>
                                    </span>
                                </span>
                            </div>
                            <div class="amount-container">
                                <div class="amount-box">
                                    ${receipt.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dotted Filled Receipt Content Body -->
                <div class="form-section">
                    <div class="form-line">
                        <span class="dotted-fill"></span>
                        <span class="label-text">
                            Recebemos do (a) Exmo. Sr.(a). <strong style="font-size: 11.5pt; text-transform: uppercase; color: #111111; font-family: 'Helvetica Neue', Arial; padding-left: 8px;">${receipt.clientName}</strong>
                        </span>
                    </div>
                    
                    <div class="form-line" style="margin-top: 6px;">
                        <span class="dotted-fill"></span>
                        <span class="label-text">
                            a quantia de <strong style="font-size: 10pt; font-style: italic; color: #333333; font-family: 'Helvetica Neue', Arial; padding-left: 8px;">${receipt.amountExtenso}</strong>
                        </span>
                    </div>
                    <div class="line-extended"></div>
                    
                    <div class="form-line" style="margin-top: 15px;">
                        <span class="dotted-fill"></span>
                        <span class="label-text">
                            referente a
                            <span class="filled-value">${receipt.referencia}</span>
                        </span>
                    </div>
                    <div class="line-extended"></div>
                    
                    <div class="form-line" style="margin-top: 20px; text-align: right;">
                        <span class="label-text" style="float: left; font-weight: bold;">de que passamos o presente recibo.</span>
                        <span style="font-size: 10pt; position: relative; z-index: 2; background: #ffffff; padding-left: 10px; font-weight: bold;">
                            &nbsp;&nbsp;Inhambane, ${dayStr}&nbsp;&nbsp; de &nbsp;&nbsp;${monthStr}&nbsp;&nbsp; de &nbsp;&nbsp;${yearStr}
                        </span>
                        <div class="dotted-fill" style="width: 50%; left: auto;"></div>
                    </div>
                </div>
            </div>

            <!-- Bottom Actions and Signatures Row -->
            <div class="payment-methods">
                <div class="payment-row">
                    <!-- Payment checkboxes on the left -->
                    <div class="checkbox-cell">
                        <div style="font-size: 10pt; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; color: #444444; letter-spacing: 0.5px;">Pago em:</div>
                        
                        <div class="check-container">
                            <div class="square-box" style="background-color: ${isCheque ? '#eaeaea' : 'transparent'};">${isCheque ? '✓' : ''}</div>
                            <span class="check-label">Cheque nº</span>
                            <div class="inline-dotted" style="width: 210px;">${isCheque ? receipt.chequeNumber || '________________' : ''}</div>
                        </div>
                        
                        <div class="check-container" style="margin-top: 8px;">
                            <div class="square-box" style="background-color: ${isDinheiro ? '#eaeaea' : 'transparent'};">${isDinheiro ? '✓' : ''}</div>
                            <span class="check-label">Em numerário</span>
                            
                            <div class="square-box" style="margin-left: 15px; background-color: ${isOutros ? '#eaeaea' : 'transparent'};">${isOutros ? '✓' : ''}</div>
                            <span class="check-label">Banco</span>
                            <div class="inline-dotted" style="width: 155px;">${isOutros ? receipt.bankName || '________________' : ''}</div>
                        </div>
                    </div>
                    
                    <!-- Stamp Box and Signature Line on the right -->
                    <div class="stamp-signature-cell">
                        <div class="signature-box-wrapper">
                            <div class="signature-line-text">Assinatura e Carimbo</div>

                            <!-- OVERLAY CARIMBO IMAGE -->
                            <div style="position: absolute; left: 50%; top: -50px; transform: translateX(-50%) rotate(-3deg); width: 800px; height: 420px; pointer-events: none; z-index: 50;">
                                <img src="/carrimbo.webp" alt="Carimbo e Assinatura" style="width: 100%; height: 100%; display: block;" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Graphic Press Metadata Footer -->
            <div class="footer-metadata">
                CEGRAF, S.A. | NUIT: 400073597 nº da autorização 03/MPF TIP/00 | Av. Angola, 2732-Maputo
            </div>
        </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // 2. Render container to canvas with high resolution scale
    const canvas = await html2canvas(container, {
      scale: 3, // High resolution scale for sharp vectors and text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // 3. Create A5 Document under Landscape aspect ratio
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });

    // 4. Fill complete A5 frame (210mm width x 148mm height)
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 148);

    // 5. Trigger download file save dialog
    pdf.save(`Recibo_Catiça_${receipt.id.replace('#', '')}.pdf`);
  } catch (error) {
    console.error('Failed to generate A5 Landscape Receipt PDF:', error);
  } finally {
    // 6. Cleanup DOM node
    document.body.removeChild(container);
  }
}
