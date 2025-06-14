import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';

interface RouteParams {
  params: {
    code: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const accessCode = params.code;
    
    if (!accessCode) {
      return NextResponse.json(
        { error: 'Codice di accesso mancante' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const invoice = await InvoiceModel.findOne({
      publicAccessCode: accessCode,
    }).lean(); // Usiamo .lean() per un oggetto JS semplice, non serve salvare modifiche qui
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Codice di accesso non valido o fattura non trovata' },
        { status: 404 }
      );
    }
    
    if (invoice.publicAccessExpiry && new Date(invoice.publicAccessExpiry) < new Date()) {
      return NextResponse.json(
        { error: 'Il link di accesso è scaduto' },
        { status: 403 }
      );
    }
    
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Questa fattura è stata annullata' },
        { status: 403 }
      );
    }
    
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Questa fattura non è ancora stata emessa' },
        { status: 403 }
      );
    }

    // Verifica la presenza di pdfUrl
    if (invoice.pdfUrl) {
      // Log dell'accesso
      console.log(`Public PDF access for invoice ${invoice.invoiceNumber} via code ${accessCode}, redirecting to: ${invoice.pdfUrl}`);

      // Reindirizza all'URL del PDF su Vercel Blob
      return NextResponse.redirect(invoice.pdfUrl, 307); // 307 Temporary Redirect
    } else {
      // Se pdfUrl non esiste, significa che il PDF non è (ancora) disponibile.
      console.warn(`PDF non trovato per la fattura ${invoice.invoiceNumber} con codice ${accessCode}.`);
      return NextResponse.json(
        { error: 'PDF non disponibile per questa fattura. Potrebbe essere in fase di generazione o la generazione è fallita. Riprova più tardi o contatta l'assistenza.' },
        { status: 404 } // O 503 Service Unavailable se è temporaneo
      );
    }
    
  } catch (error) {
    console.error('Error in public invoice PDF download:', error);
    return NextResponse.json(
      { error: 'Internal Server Error durante il tentativo di accesso al PDF' },
      { status: 500 }
    );
  }
}
