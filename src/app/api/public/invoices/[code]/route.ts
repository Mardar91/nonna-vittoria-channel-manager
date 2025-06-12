import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

interface RouteParams {
  params: {
    code: string;
  };
}

// GET: Scarica PDF pubblicamente tramite codice di accesso
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
    
    // Se ha già un PDF, reindirizza a quello
    if (invoice.pdfUrl) {
      // Log dell'accesso per statistiche
      console.log(`Public PDF access for invoice ${invoice.invoiceNumber} via code ${accessCode}`);
      
      return NextResponse.redirect(invoice.pdfUrl);
    }
    
    // Altrimenti genera il PDF al volo
    try {
      const pdfBuffer = await generateInvoicePDF(invoice);
      
      // Log dell'accesso
      console.log(`Public PDF generated on-the-fly for invoice ${invoice.invoiceNumber} via code ${accessCode}`);
      
      // Restituisci il PDF come stream
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${invoice.invoiceNumber.replace(/\//g, '-')}.pdf"`,
          'Cache-Control': 'private, max-age=3600', // Cache per 1 ora
        },
      });
    } catch (pdfError) {
      console.error('Error generating PDF on the fly:', pdfError);
      return NextResponse.json(
        { error: 'Errore nella generazione del PDF' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in public PDF download:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
