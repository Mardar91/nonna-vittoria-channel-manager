import { put } from '@vercel/blob';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium'; // Sostituito chrome-aws-lambda
import { IInvoice, IInvoiceItem } from '@/models/Invoice';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Funzione per generare l'HTML della fattura
async function getInvoiceHtml(invoiceData: IInvoice): Promise<string> {
  const formatDate = (date: string | Date) => format(new Date(date), 'dd MMMM yyyy', { locale: it });
  const formatCurrency = (amount: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

  let itemsHtml = '';
  invoiceData.items.forEach((item: IInvoiceItem) => {
    itemsHtml += `
      <tr>
        <td>${item.description}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
        ${invoiceData.activityType === 'business' && item.vatRate ? `<td style="text-align: right;">${item.vatRate}%</td>` : ''}
        ${invoiceData.activityType === 'business' && item.vatAmount ? `<td style="text-align: right;">${formatCurrency(item.vatAmount)}</td>` : ''}
        <td style="text-align: right;">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `;
  });

  const showVatColumns = invoiceData.activityType === 'business' && invoiceData.items.some(item => item.vatRate);

  return `
    <html>
      <head>
        <title>${invoiceData.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'} ${invoiceData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .container { border: 1px solid #eee; padding: 30px; }
          h1 { text-align: center; color: #1a237e; }
          .header, .section { margin-bottom: 20px; }
          .header div, .section div { margin-bottom: 5px; }
          .section h2 { color: #3f51b5; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .totals { margin-top: 20px; text-align: right; }
          .totals div { margin-bottom: 5px; font-size: 1.1em; }
          .totals .grand-total { font-weight: bold; font-size: 1.3em; color: #1a237e; }
          .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; }
          .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${invoiceData.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'} N. ${invoiceData.invoiceNumber}</h1>
          <div class="header">
            <div>Data: ${formatDate(invoiceData.invoiceDate)}</div>
          </div>

          <div class="grid-container">
            <div class="section">
              <h2>Emesso da:</h2>
              <div><strong>${invoiceData.issuer.businessName}</strong></div>
              <div>${invoiceData.issuer.address}, ${invoiceData.issuer.zip} ${invoiceData.issuer.city} (${invoiceData.issuer.province})</div>
              <div>Codice Fiscale: ${invoiceData.issuer.taxCode}</div>
              ${invoiceData.issuer.vatNumber ? `<div>Partita IVA: ${invoiceData.issuer.vatNumber}</div>` : ''}
              ${invoiceData.issuer.email ? `<div>Email: ${invoiceData.issuer.email}</div>` : ''}
              ${invoiceData.issuer.phone ? `<div>Tel: ${invoiceData.issuer.phone}</div>` : ''}
            </div>

            <div class="section">
              <h2>Intestato a:</h2>
              <div><strong>${invoiceData.customer.name}</strong></div>
              <div>Email: ${invoiceData.customer.email}</div>
              ${invoiceData.customer.phone ? `<div>Tel: ${invoiceData.customer.phone}</div>` : ''}
              ${invoiceData.customer.address ? `<div>${invoiceData.customer.address}, ${invoiceData.customer.zip} ${invoiceData.customer.city} (${invoiceData.customer.province || ''})</div>` : ''}
              ${invoiceData.customer.country ? `<div>Paese: ${invoiceData.customer.country}</div>` : ''}
              ${invoiceData.customer.taxCode ? `<div>Codice Fiscale: ${invoiceData.customer.taxCode}</div>` : ''}
              ${invoiceData.customer.vatNumber ? `<div>Partita IVA: ${invoiceData.customer.vatNumber}</div>` : ''}
            </div>
          </div>

          <div class="section">
            <h2>Dettagli Soggiorno:</h2>
            <div>Appartamento: ${invoiceData.stayDetails.apartmentName} (${invoiceData.stayDetails.apartmentAddress})</div>
            <div>Check-in: ${formatDate(invoiceData.stayDetails.checkIn)}</div>
            <div>Check-out: ${formatDate(invoiceData.stayDetails.checkOut)}</div>
            <div>Notti: ${invoiceData.stayDetails.nights}</div>
            <div>Ospiti: ${invoiceData.stayDetails.guests}</div>
          </div>

          <div class="section">
            <h2>Voci:</h2>
            <table>
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th style="text-align: right;">Qtà</th>
                  <th style="text-align: right;">Prezzo Un.</th>
                  ${showVatColumns ? '<th style="text-align: right;">IVA %</th>' : ''}
                  ${showVatColumns ? '<th style="text-align: right;">Importo IVA</th>' : ''}
                  <th style="text-align: right;">Totale Voce</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div>Subtotale: ${formatCurrency(invoiceData.subtotal)}</div>
            ${invoiceData.activityType === 'business' && invoiceData.vatAmount ? `<div>IVA Totale: ${formatCurrency(invoiceData.vatAmount)}</div>` : ''}
            <div class="grand-total">Totale: ${formatCurrency(invoiceData.total)}</div>
          </div>

          ${invoiceData.platformInfo?.withholdingTax ? `
            <div class="section">
              <h2>Informazioni Piattaforma:</h2>
              <div>Piattaforma: ${invoiceData.platformInfo.platform}</div>
              <div>${invoiceData.platformInfo.withholdingTax.text} (${formatCurrency(invoiceData.platformInfo.withholdingTax.amount)})</div>
            </div>
          ` : ''}

          ${invoiceData.paymentInfo ? `
            <div class="section">
                <h2>Pagamento:</h2>
                <div>Stato: ${invoiceData.paymentInfo.status === 'paid' ? 'Pagato' : 'In attesa'}</div>
                <div>Metodo: ${invoiceData.paymentInfo.method}</div>
            </div>
          ` : ''}

          ${invoiceData.notes ? `<div class="section"><h2>Note:</h2><p>${invoiceData.notes.replace(/\n/g, '<br>')}</p></div>` : ''}
          ${invoiceData.footer ? `<div class="footer">${invoiceData.footer.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      </body>
    </html>
  `;
}

export async function generateAndUploadPdfToBlob(
  invoiceData: IInvoice,
  invoiceId: string // L'ID della fattura, per il nome del file
): Promise<{ blobUrl: string | null; error?: string }> {
  let browser = null;
  try {
    const htmlContent = await getInvoiceHtml(invoiceData);

    // Non è più necessario specificare CHROME_EXECUTABLE_PATH per lo sviluppo locale con @sparticuz/chromium se si installano i font,
    // ma per Vercel è meglio essere espliciti.
    // @sparticuz/chromium si occupa di trovare il path corretto nell'ambiente Lambda/Vercel.
    // Per lo sviluppo locale, potresti aver bisogno di:
    // await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');
    // se usi caratteri speciali o emoji, ma per ora proviamo senza.

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(), // Nota: è una funzione asincrona
      headless: chromium.headless, // 'new' o true per il nuovo headless mode, chromium.headless per quello classico
      ignoreHTTPSErrors: true, // Aggiunto per robustezza, sebbene non strettamente necessario per HTML locale
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    await browser.close();
    browser = null;

    const safeInvoiceNumber = invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const blobFileName = `invoices/${invoiceId}/${safeInvoiceNumber}.pdf`;

    const { url: blobUrl } = await put(blobFileName, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    return { blobUrl };

  } catch (err) {
    console.error('Error generating or uploading PDF:', err);
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('Error closing browser after an error:', closeErr);
      }
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { blobUrl: null, error: `Failed to generate/upload PDF: ${errorMessage}` };
  }
}
