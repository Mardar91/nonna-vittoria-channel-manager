interface EmailData {
  to: string;
  subject: string;
  invoiceNumber: string;
  customerName: string;
  issuerName: string;
  apartmentName: string;
  checkIn: Date | string;
  checkOut: Date | string;
  totalAmount: number;
  pdfUrl?: string;
  publicLink?: string;
  customMessage?: string;
  businessEmail?: string;
  businessPhone?: string;
}

// Funzione per inviare email con ricevuta
export async function sendInvoiceEmail(data: EmailData): Promise<void> {
  try {
    // In produzione, useresti un servizio email come:
    // - SendGrid
    // - Resend
    // - AWS SES
    // - Mailgun
    // - Postmark
    
    /*
    // Esempio con Resend:
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'noreply@tuodominio.com',
      to: data.to,
      subject: data.subject,
      html: generateEmailHTML(data),
      attachments: data.pdfUrl ? [{
        filename: `${data.invoiceNumber.replace(/\//g, '-')}.pdf`,
        path: data.pdfUrl,
      }] : [],
    });
    */
    
    // Simulazione per sviluppo
    console.log('📧 Email simulata:', {
      to: data.to,
      subject: data.subject,
      invoiceNumber: data.invoiceNumber,
      hasAttachment: !!data.pdfUrl,
      hasPublicLink: !!data.publicLink,
    });
    
    // In sviluppo, salva l'email in un log
    await logEmail(data);
    
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Errore nell\'invio dell\'email');
  }
}

// Genera HTML per l'email
function generateEmailHTML(data: EmailData): string {
  const checkInDate = new Date(data.checkIn).toLocaleDateString('it-IT');
  const checkOutDate = new Date(data.checkOut).toLocaleDateString('it-IT');
  
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1e40af;
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background-color: #f8f9fa;
      padding: 30px;
      border: 1px solid #dee2e6;
      border-top: none;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #1e40af;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .info-box {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border: 1px solid #dee2e6;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      font-size: 14px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.issuerName}</h1>
    <p style="margin: 0; font-size: 18px;">Ricevuta ${data.invoiceNumber}</p>
  </div>
  
  <div class="content">
    <p>Gentile ${data.customerName},</p>
    
    <p>
      Ti ringraziamo per aver scelto la nostra struttura per il tuo soggiorno.
      ${data.customMessage || 'In allegato trovi la ricevuta relativa alla tua prenotazione.'}
    </p>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">Dettagli del soggiorno:</h3>
      <p>
        <strong>Appartamento:</strong> ${data.apartmentName}<br>
        <strong>Check-in:</strong> ${checkInDate}<br>
        <strong>Check-out:</strong> ${checkOutDate}<br>
        <strong>Importo totale:</strong> €${data.totalAmount.toFixed(2)}
      </p>
    </div>
    
    ${data.publicLink ? `
      <div style="text-align: center;">
        <p>Puoi scaricare la ricevuta cliccando sul pulsante sottostante:</p>
        <a href="${data.publicLink}" class="button">Scarica Ricevuta</a>
        <p style="font-size: 14px; color: #6c757d;">
          Il link sarà valido per 30 giorni
        </p>
      </div>
    ` : data.pdfUrl ? `
      <p>
        La ricevuta è allegata a questa email in formato PDF.
      </p>
    ` : ''}
    
    <p>
      Per qualsiasi informazione o chiarimento, non esitare a contattarci.
    </p>
    
    <p>
      Cordiali saluti,<br>
      <strong>${data.issuerName}</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>
      ${data.businessEmail ? `Email: ${data.businessEmail}<br>` : ''}
      ${data.businessPhone ? `Telefono: ${data.businessPhone}<br>` : ''}
    </p>
    <p style="font-size: 12px;">
      Questa email è stata generata automaticamente. 
      Si prega di non rispondere a questo messaggio.
    </p>
  </div>
</body>
</html>
  `;
}

// Log email per debug in sviluppo
async function logEmail(data: EmailData): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    to: data.to,
    subject: data.subject,
    invoiceNumber: data.invoiceNumber,
    status: 'simulated',
  };
  
  console.log('📧 Email Log:', logEntry);
  
  // In sviluppo, potresti salvare in un file di log
  try {
    const { appendFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    const { existsSync } = await import('fs');
    
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }
    
    const logFile = join(logsDir, 'emails.log');
    await appendFile(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    // Ignora errori di logging
  }
}

// Template email di reminder
export async function sendInvoiceReminder(
  invoiceId: string,
  customerEmail: string,
  invoiceNumber: string,
  daysOverdue: number
): Promise<void> {
  const subject = `Promemoria: Ricevuta ${invoiceNumber} in attesa di pagamento`;
  
  const html = `
    <p>Gentile Cliente,</p>
    <p>
      Ti ricordiamo che la ricevuta n. ${invoiceNumber} risulta ancora in attesa di pagamento
      da ${daysOverdue} giorni.
    </p>
    <p>
      Ti preghiamo di procedere al pagamento al più presto possibile.
    </p>
    <p>Cordiali saluti</p>
  `;
  
  // Implementa l'invio come sopra
  console.log('📧 Reminder email:', { to: customerEmail, subject, daysOverdue });
}

// Template email di conferma pagamento
export async function sendPaymentConfirmation(
  invoiceId: string,
  customerEmail: string,
  invoiceNumber: string,
  amount: number
): Promise<void> {
  const subject = `Conferma pagamento - Ricevuta ${invoiceNumber}`;
  
  const html = `
    <p>Gentile Cliente,</p>
    <p>
      Confermiamo la ricezione del pagamento di €${amount.toFixed(2)} 
      per la ricevuta n. ${invoiceNumber}.
    </p>
    <p>
      Grazie per aver scelto la nostra struttura.
    </p>
    <p>Cordiali saluti</p>
  `;
  
  // Implementa l'invio come sopra
  console.log('📧 Payment confirmation:', { to: customerEmail, subject, amount });
}
