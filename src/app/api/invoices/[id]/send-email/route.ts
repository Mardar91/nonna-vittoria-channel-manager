import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { sendInvoiceEmail } from '@/lib/email';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { uploadToStorage } from '@/lib/storage';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Invia ricevuta via email al cliente
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const recipientEmail = data.email; // Email opzionale override
    const includePublicLink = data.includePublicLink ?? true;
    const customMessage = data.message; // Messaggio personalizzato opzionale

    await connectDB();
    
    const invoice = await InvoiceModel.findById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che non sia in bozza
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Non è possibile inviare una ricevuta in bozza' },
        { status: 400 }
      );
    }
    
    // Verifica che non sia annullata
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Non è possibile inviare una ricevuta annullata' },
        { status: 400 }
      );
    }
    
    // Determina l'email destinatario
    const toEmail = recipientEmail || invoice.customer.email;
    
    if (!toEmail) {
      return NextResponse.json(
        { error: 'Email destinatario non disponibile' },
        { status: 400 }
      );
    }
    
    // Genera PDF se non esiste
    if (!invoice.pdfUrl) {
      try {
        const pdfBuffer = await generateInvoicePDF(invoice);
        const fileName = `invoices/${invoice.invoiceNumber.replace(/\//g, '-')}_${invoice._id}.pdf`;
        const pdfUrl = await uploadToStorage(pdfBuffer, fileName, 'application/pdf');
        
        invoice.pdfUrl = pdfUrl;
        invoice.pdfGeneratedAt = new Date();
        await invoice.save();
      } catch (pdfError) {
        console.error('Error generating PDF for email:', pdfError);
        return NextResponse.json(
          { error: 'Errore nella generazione del PDF' },
          { status: 500 }
        );
      }
    }
    
    // Genera link pubblico se richiesto e non esiste
    let publicLink = '';
    if (includePublicLink) {
      if (!invoice.publicAccessCode) {
        await invoice.generatePublicAccessCode();
      }
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || '';
      publicLink = `${baseUrl}/invoices/download?code=${invoice.publicAccessCode}`;
    }
    
    // Carica le impostazioni per ottenere info aggiuntive
    const settings = await InvoiceSettingsModel.findOne({
      groupId: invoice.settingsGroupId
    });
    
    // Prepara i dati per l'email
    const emailData = {
      to: toEmail,
      subject: `${invoice.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'} ${invoice.invoiceNumber} - ${invoice.issuer.businessName}`,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      issuerName: invoice.issuer.businessName,
      apartmentName: invoice.stayDetails.apartmentName,
      checkIn: invoice.stayDetails.checkIn,
      checkOut: invoice.stayDetails.checkOut,
      totalAmount: invoice.total,
      pdfUrl: invoice.pdfUrl,
      publicLink,
      customMessage,
      businessEmail: settings?.businessEmail || invoice.issuer.email,
      businessPhone: settings?.businessPhone || invoice.issuer.phone,
    };
    
    try {
      // Invia l'email (questa funzione dovrà essere implementata in base al servizio email utilizzato)
      await sendInvoiceEmail(emailData);
      
      // Aggiorna lo stato della ricevuta
      invoice.emailSent = true;
      invoice.emailSentAt = new Date();
      invoice.emailSentTo = toEmail;
      invoice.status = 'sent';
      await invoice.save();
      
      return NextResponse.json({
        success: true,
        message: `Email inviata con successo a ${toEmail}`,
        emailDetails: {
          to: toEmail,
          sentAt: invoice.emailSentAt,
          includesPublicLink: !!publicLink,
        },
      });
      
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { 
          error: 'Errore nell\'invio dell\'email',
          details: emailError instanceof Error ? emailError.message : 'Errore sconosciuto'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in send email endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET: Ottieni stato invio email
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const invoice = await InvoiceModel.findById(params.id).select(
      'emailSent emailSentAt emailSentTo status customer.email'
    );
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      emailSent: invoice.emailSent,
      emailSentAt: invoice.emailSentAt,
      emailSentTo: invoice.emailSentTo,
      customerEmail: invoice.customer.email,
      canSend: invoice.status !== 'draft' && invoice.status !== 'cancelled',
    });
  } catch (error) {
    console.error('Error fetching email status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
