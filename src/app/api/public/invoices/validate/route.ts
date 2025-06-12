import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { PublicAccessValidation } from '@/types/invoice';

// POST: Valida codice di accesso pubblico
export async function POST(req: NextRequest) {
  try {
    const { accessCode } = await req.json();
    
    if (!accessCode) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Codice di accesso mancante' 
        } as PublicAccessValidation,
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Cerca la ricevuta con questo codice di accesso
    const invoice = await InvoiceModel.findOne({
      publicAccessCode: accessCode
    }).lean();
    
    if (!invoice) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Codice di accesso non valido' 
        } as PublicAccessValidation,
        { status: 404 }
      );
    }
    
    // Verifica che il codice non sia scaduto
    if (invoice.publicAccessExpiry && new Date(invoice.publicAccessExpiry) < new Date()) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Il link di accesso è scaduto' 
        } as PublicAccessValidation,
        { status: 403 }
      );
    }
    
    // Verifica che la ricevuta non sia annullata
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Questa ricevuta è stata annullata' 
        } as PublicAccessValidation,
        { status: 403 }
      );
    }
    
    // Rimuovi campi sensibili prima di inviare al client
    const publicInvoice = {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
      },
      issuer: invoice.issuer,
      stayDetails: invoice.stayDetails,
      items: invoice.items,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      total: invoice.total,
      platformInfo: invoice.platformInfo,
      pdfUrl: invoice.pdfUrl,
      documentType: invoice.documentType,
      activityType: invoice.activityType,
      paymentInfo: {
        status: invoice.paymentInfo.status,
        method: invoice.paymentInfo.method,
      },
      notes: invoice.notes, // Solo note pubbliche, non internalNotes
    };
    
    const response: PublicAccessValidation = {
      isValid: true,
      invoiceId: invoice._id.toString(),
      expiresAt: invoice.publicAccessExpiry,
    };
    
    // Aggiungi l'invoice all'oggetto di risposta
    return NextResponse.json({
      ...response,
      invoice: publicInvoice,
    });
    
  } catch (error) {
    console.error('Error validating public access:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Errore nella validazione del codice' 
      } as PublicAccessValidation,
      { status: 500 }
    );
  }
}
