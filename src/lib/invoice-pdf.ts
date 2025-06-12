import { IInvoice } from '@/models/Invoice';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Simulazione della generazione PDF
// In produzione, useresti una libreria come @react-pdf/renderer o puppeteer
export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
  try {
    // Per ora, generiamo un PDF simulato
    // In un'implementazione reale, useresti @react-pdf/renderer così:
    /*
    import ReactPDF from '@react-pdf/renderer';
    import InvoiceTemplate from '@/templates/invoice-template';
    
    const doc = <InvoiceTemplate invoice={invoice} />;
    const buffer = await ReactPDF.renderToBuffer(doc);
    return buffer;
    */
    
    // Simulazione: crea un contenuto HTML che rappresenta la ricevuta
    const html = generateInvoiceHTML(invoice);
    
    // Converti HTML in PDF (simulato)
    // In produzione useresti puppeteer o simili
    const pdfBuffer = Buffer.from(html, 'utf-8');
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Errore nella generazione del PDF');
  }
}

// Genera HTML per la ricevuta (usato per la simulazione)
function generateInvoiceHTML(invoice: IInvoice): string {
  const isInvoice = invoice.documentType === 'invoice';
  const documentTitle = isInvoice ? 'FATTURA' : 'RICEVUTA';
  
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle} ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 20px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
    }
    .invoice-info {
      text-align: right;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #1e40af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    .total-row {
      font-weight: bold;
      font-size: 18px;
      border-top: 2px solid #333;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .info-box {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${documentTitle}</div>
      <div>N. ${invoice.invoiceNumber}</div>
      <div>del ${format(new Date(invoice.invoiceDate), 'dd MMMM yyyy', { locale: it })}</div>
    </div>
    <div class="invoice-info">
      <strong>${invoice.issuer.businessName}</strong><br>
      ${invoice.issuer.address}<br>
      ${invoice.issuer.zip} ${invoice.issuer.city} (${invoice.issuer.province})<br>
      C.F.: ${invoice.issuer.taxCode}<br>
      ${invoice.issuer.vatNumber ? `P.IVA: ${invoice.issuer.vatNumber}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Destinatario</div>
    <div class="info-grid">
      <div class="info-box">
        <strong>${invoice.customer.name}</strong><br>
        ${invoice.customer.email}<br>
        ${invoice.customer.phone || ''}<br>
        ${invoice.customer.taxCode ? `C.F.: ${invoice.customer.taxCode}` : ''}<br>
        ${invoice.customer.vatNumber ? `P.IVA: ${invoice.customer.vatNumber}` : ''}
      </div>
      <div class="info-box">
        ${invoice.customer.address || ''}<br>
        ${invoice.customer.zip || ''} ${invoice.customer.city || ''} ${invoice.customer.province ? `(${invoice.customer.province})` : ''}<br>
        ${invoice.customer.country || ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dettagli Soggiorno</div>
    <div class="info-box">
      <strong>Appartamento:</strong> ${invoice.stayDetails.apartmentName}<br>
      <strong>Indirizzo:</strong> ${invoice.stayDetails.apartmentAddress}<br>
      <strong>Periodo:</strong> dal ${format(new Date(invoice.stayDetails.checkIn), 'dd/MM/yyyy')} 
                              al ${format(new Date(invoice.stayDetails.checkOut), 'dd/MM/yyyy')} 
                              (${invoice.stayDetails.nights} notti)<br>
      <strong>Ospiti:</strong> ${invoice.stayDetails.guests}<br>
      ${invoice.platformInfo?.platform ? `<strong>Piattaforma:</strong> ${invoice.platformInfo.platform}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dettaglio</div>
    <table>
      <thead>
        <tr>
          <th>Descrizione</th>
          <th style="text-align: center;">Qtà</th>
          <th style="text-align: right;">Prezzo Unit.</th>
          ${invoice.activityType === 'business' ? '<th style="text-align: center;">IVA %</th>' : ''}
          <th style="text-align: right;">Totale</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">€ ${item.unitPrice.toFixed(2)}</td>
            ${invoice.activityType === 'business' ? `<td style="text-align: center;">${item.vatRate || 0}%</td>` : ''}
            <td style="text-align: right;">€ ${item.totalPrice.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="${invoice.activityType === 'business' ? 4 : 3}" style="text-align: right;">Subtotale:</td>
          <td style="text-align: right;">€ ${invoice.subtotal.toFixed(2)}</td>
        </tr>
        ${invoice.activityType === 'business' && invoice.vatAmount ? `
          <tr>
            <td colspan="4" style="text-align: right;">IVA:</td>
            <td style="text-align: right;">€ ${invoice.vatAmount.toFixed(2)}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="${invoice.activityType === 'business' ? 4 : 3}" style="text-align: right;">TOTALE:</td>
          <td style="text-align: right;">€ ${invoice.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${invoice.platformInfo?.withholdingTax ? `
    <div class="warning-box">
      <strong>Nota Fiscale:</strong><br>
      ${invoice.platformInfo.withholdingTax.text}<br>
      Importo cedolare secca (${invoice.platformInfo.withholdingTax.rate}%): € ${invoice.platformInfo.withholdingTax.amount.toFixed(2)}
    </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Informazioni Pagamento</div>
    <div class="info-box">
      <strong>Stato:</strong> ${invoice.paymentInfo.status === 'paid' ? 'Pagato' : 'In attesa'}<br>
      <strong>Metodo:</strong> ${
        invoice.paymentInfo.method === 'cash' ? 'Contanti' :
        invoice.paymentInfo.method === 'bank_transfer' ? 'Bonifico' :
        invoice.paymentInfo.method === 'credit_card' ? 'Carta di Credito' :
        invoice.paymentInfo.method === 'stripe' ? 'Stripe' :
        invoice.paymentInfo.method === 'platform' ? 'Piattaforma' :
        invoice.paymentInfo.method
      }<br>
      ${invoice.paymentInfo.paidDate ? `<strong>Data pagamento:</strong> ${format(new Date(invoice.paymentInfo.paidDate), 'dd/MM/yyyy')}` : ''}
    </div>
  </div>

  ${invoice.notes ? `
    <div class="section">
      <div class="section-title">Note</div>
      <p>${invoice.notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>Documento generato elettronicamente il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
    ${invoice.activityType === 'tourist_rental' ? 
      '<p>Esente da IVA ai sensi dell\'art. 10, n. 1, D.P.R. 633/72</p>' : 
      '<p>Operazione soggetta ad IVA</p>'
    }
  </div>
</body>
</html>
  `;
}

// Genera un PDF vuoto di placeholder (per test)
export function generatePlaceholderPDF(): Buffer {
  const placeholder = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Invoice PDF) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000341 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
436
%%EOF`;
  
  return Buffer.from(placeholder);
}
