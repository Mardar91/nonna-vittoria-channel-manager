import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { generateInvoiceHTML } from '@/lib/invoice-pdf';

interface RouteParams {
  params: {
    code: string;
  };
}

// GET: Scarica HTML pubblicamente tramite codice di accesso
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
    
    // Cerca la ricevuta con questo codice di accesso
    const invoice = await InvoiceModel.findOne({
      publicAccessCode: accessCode
    });
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Codice di accesso non valido' },
        { status: 404 }
      );
    }
    
    // Verifica che il codice non sia scaduto
    if (invoice.publicAccessExpiry && new Date(invoice.publicAccessExpiry) < new Date()) {
      return NextResponse.json(
        { error: 'Il link di accesso è scaduto' },
        { status: 403 }
      );
    }
    
    // Verifica che la ricevuta non sia annullata
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Questa ricevuta è stata annullata' },
        { status: 403 }
      );
    }
    
    // Verifica che la ricevuta non sia in bozza
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Questa ricevuta non è ancora stata emessa' },
        { status: 403 }
      );
    }
    
    // Genera o recupera l'HTML
    let html: string;
    
    if (invoice.htmlContent) {
      // Decodifica l'HTML dal base64
      html = Buffer.from(invoice.htmlContent, 'base64').toString('utf-8');
    } else {
      // Genera al volo
      try {
        html = await generateInvoiceHTML(invoice);
        
        // Salva per future richieste
        invoice.htmlContent = Buffer.from(html).toString('base64');
        invoice.htmlGeneratedAt = new Date();
        await invoice.save();
      } catch (error) {
        console.error('Error generating HTML on the fly:', error);
        return NextResponse.json(
          { error: 'Errore nella generazione del documento' },
          { status: 500 }
        );
      }
    }
    
    // Log dell'accesso per statistiche
    console.log(`Public access for invoice ${invoice.invoiceNumber} via code ${accessCode}`);
    
    // Restituisci l'HTML
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber.replace(/\//g, '-')}.html"`,
        'Cache-Control': 'private, max-age=3600', // Cache per 1 ora
      },
    });
    
  } catch (error) {
    console.error('Error in public invoice download:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
