import { IInvoice } from '@/models/Invoice';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Genera HTML per la ricevuta
export async function generateInvoiceHTML(invoice: IInvoice): Promise<string> {
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
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    
    .invoice-container {
      background: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
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
    
    .payment-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    
    .paid { background: #d1fae5; color: #065f46; }
    .pending { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="invoice-container">
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
        ${invoice.issuer.email ? `<br>Email: ${invoice.issuer.email}` : ''}
        ${invoice.issuer.phone ? `<br>Tel: ${invoice.issuer.phone}` : ''}
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
        ${invoice.platformInfo?.bookingReference ? `<br><strong>Riferimento:</strong> ${invoice.platformInfo.bookingReference}` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Dettaglio</div>
      <table>
        <thead>
          <tr>
            <th>Descrizione</th>
            <th style="text-align: center; width: 80px;">Qtà</th>
            <th style="text-align: right; width: 120px;">Prezzo Unit.</th>
            ${invoice.activityType === 'business' ? '<th style="text-align: center; width: 80px;">IVA %</th>' : ''}
            <th style="text-align: right; width: 120px;">Totale</th>
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
            <td colspan="${invoice.activityType === 'business' ? 4 : 3}" style="text-align: right; padding-top: 10px;">Subtotale:</td>
            <td style="text-align: right; padding-top: 10px;">€ ${invoice.subtotal.toFixed(2)}</td>
          </tr>
          ${invoice.activityType === 'business' && invoice.vatAmount ? `
            <tr>
              <td colspan="4" style="text-align: right;">IVA:</td>
              <td style="text-align: right;">€ ${invoice.vatAmount.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="${invoice.activityType === 'business' ? 4 : 3}" style="text-align: right; padding-top: 10px;">TOTALE:</td>
            <td style="text-align: right; padding-top: 10px;">€ ${invoice.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${invoice.platformInfo?.withholdingTax ? `
      <div class="warning-box">
        <strong>Nota Fiscale:</strong><br>
        ${invoice.platformInfo.withholdingTax.text}<br>
        <strong>Importo cedolare secca (${invoice.platformInfo.withholdingTax.rate}%):</strong> € ${invoice.platformInfo.withholdingTax.amount.toFixed(2)}
      </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Informazioni Pagamento</div>
      <div class="info-box">
        <strong>Stato:</strong> 
        <span class="payment-badge ${invoice.paymentInfo.status === 'paid' ? 'paid' : 'pending'}">
          ${invoice.paymentInfo.status === 'paid' ? 'PAGATO' : 'IN ATTESA'}
        </span><br>
        <strong>Metodo:</strong> ${
          invoice.paymentInfo.method === 'cash' ? 'Contanti' :
          invoice.paymentInfo.method === 'bank_transfer' ? 'Bonifico' :
          invoice.paymentInfo.method === 'credit_card' ? 'Carta di Credito' :
          invoice.paymentInfo.method === 'stripe' ? 'Pagamento Online' :
          invoice.paymentInfo.method === 'platform' ? invoice.platformInfo?.platform || 'Piattaforma' :
          invoice.paymentInfo.method
        }<br>
        ${invoice.paymentInfo.paidDate ? `<strong>Data pagamento:</strong> ${format(new Date(invoice.paymentInfo.paidDate), 'dd/MM/yyyy')}` : ''}
        ${invoice.paymentInfo.notes ? `<br><strong>Note:</strong> ${invoice.paymentInfo.notes}` : ''}
      </div>
    </div>

    ${invoice.notes ? `
      <div class="section">
        <div class="section-title">Note</div>
        <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
      </div>
    ` : ''}

    <div class="footer">
      <p>Documento generato elettronicamente il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      ${invoice.activityType === 'tourist_rental' ? 
        '<p>Operazione non soggetta ad IVA ai sensi dell\'art. 10, comma 1, n. 20, D.P.R. 633/72</p>' : 
        '<p>Operazione soggetta ad IVA</p>'
      }
      ${invoice.footer ? `<p>${invoice.footer}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

// Genera PDF usando base64 HTML (per salvare nel database)
export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
  try {
    // Genera l'HTML
    const html = await generateInvoiceHTML(invoice);
    
    // Converti l'HTML in un buffer
    // In produzione potresti usare una libreria come puppeteer-core con browserless
    // Per ora restituiamo l'HTML come buffer
    const buffer = Buffer.from(html, 'utf-8');
    
    return buffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Errore nella generazione del PDF');
  }
}

// Genera una versione base64 dell'HTML per salvare nel database
export async function generateInvoiceBase64(invoice: IInvoice): Promise<string> {
  const html = await generateInvoiceHTML(invoice);
  return Buffer.from(html).toString('base64');
}

// Decodifica HTML da base64
export function decodeInvoiceHTML(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8');
}
