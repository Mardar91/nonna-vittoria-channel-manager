import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { generateInvoiceHTML, generateInvoiceBase64 } from '@/lib/invoice-pdf';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Genera HTML per una ricevuta e salvalo nel database
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Carica la ricevuta
    const invoice = await InvoiceModel.findById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che la ricevuta non sia in bozza
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Non è possibile generare il PDF per una ricevuta in bozza' },
        { status: 400 }
      );
    }
    
    // Se l'HTML esiste già e non è richiesta la rigenerazione, restituiscilo
    const forceRegenerate = req.nextUrl.searchParams.get('force') === 'true';
    if (invoice.htmlContent && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        hasHtml: true,
        htmlGeneratedAt: invoice.htmlGeneratedAt,
        message: 'HTML già generato',
      });
    }
    
    try {
      // Genera l'HTML
      const htmlBase64 = await generateInvoiceBase64(invoice);
      
      // Salva nel database
      invoice.htmlContent = htmlBase64;
      invoice.htmlGeneratedAt = new Date();
      await invoice.save();
      
      return NextResponse.json({
        success: true,
        hasHtml: true,
        htmlGeneratedAt: invoice.htmlGeneratedAt,
        message: 'HTML generato con successo',
      });
      
    } catch (error) {
      console.error('Error generating HTML:', error);
      return NextResponse.json(
        { 
          error: 'Errore nella generazione del documento',
          details: error instanceof Error ? error.message : 'Errore sconosciuto'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in PDF generation endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET: Visualizza o scarica l'HTML della ricevuta
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
    
    const invoice = await InvoiceModel.findById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    // Se non ha HTML, generalo al volo
    let html: string;
    
    if (!invoice.htmlContent) {
      if (invoice.status === 'draft') {
        return NextResponse.json(
          { error: 'Non è possibile generare il PDF per una ricevuta in bozza' },
          { status: 400 }
        );
      }
      
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
    } else {
      // Decodifica l'HTML dal base64
      html = Buffer.from(invoice.htmlContent, 'base64').toString('utf-8');
    }
    
    // Determina se è una richiesta di download o visualizzazione
    const download = req.nextUrl.searchParams.get('download') === 'true';
    
    // Restituisci l'HTML
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': download 
          ? `attachment; filename="${invoice.invoiceNumber.replace(/\//g, '-')}.html"`
          : 'inline',
        'Cache-Control': 'private, max-age=3600',
      },
    });
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
