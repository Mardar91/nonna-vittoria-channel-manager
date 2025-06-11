import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { uploadToStorage } from '@/lib/storage';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Genera PDF per una ricevuta
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
    
    // Se il PDF esiste già e non è richiesta la rigenerazione, restituiscilo
    const forceRegenerate = req.nextUrl.searchParams.get('force') === 'true';
    if (invoice.pdfUrl && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        pdfUrl: invoice.pdfUrl,
        pdfGeneratedAt: invoice.pdfGeneratedAt,
        message: 'PDF già generato',
      });
    }
    
    try {
      // Genera il PDF
      const pdfBuffer = await generateInvoicePDF(invoice);
      
      // Genera il nome del file
      const fileName = `invoices/${invoice.invoiceNumber.replace(/\//g, '-')}_${invoice._id}.pdf`;
      
      // Carica su storage (simulato per ora - in produzione useresti S3, Cloudinary, etc.)
      // Per ora salviamo in una cartella pubblica locale
      const pdfUrl = await uploadToStorage(pdfBuffer, fileName, 'application/pdf');
      
      // Aggiorna la ricevuta con l'URL del PDF
      invoice.pdfUrl = pdfUrl;
      invoice.pdfGeneratedAt = new Date();
      await invoice.save();
      
      return NextResponse.json({
        success: true,
        pdfUrl,
        pdfGeneratedAt: invoice.pdfGeneratedAt,
        message: 'PDF generato con successo',
      });
      
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return NextResponse.json(
        { 
          error: 'Errore nella generazione del PDF',
          details: pdfError instanceof Error ? pdfError.message : 'Errore sconosciuto'
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

// GET: Scarica il PDF di una ricevuta
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
    
    // Se non ha un PDF, generalo al volo
    if (!invoice.pdfUrl) {
      if (invoice.status === 'draft') {
        return NextResponse.json(
          { error: 'Non è possibile generare il PDF per una ricevuta in bozza' },
          { status: 400 }
        );
      }
      
      try {
        const pdfBuffer = await generateInvoicePDF(invoice);
        
        // Restituisci il PDF come stream
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${invoice.invoiceNumber.replace(/\//g, '-')}.pdf"`,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch (pdfError) {
        console.error('Error generating PDF on the fly:', pdfError);
        return NextResponse.json(
          { error: 'Errore nella generazione del PDF' },
          { status: 500 }
        );
      }
    }
    
    // Se ha un URL, reindirizza
    return NextResponse.redirect(invoice.pdfUrl);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
