import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InvoiceModel, { IInvoice } from '@/models/Invoice'; // Import IInvoice
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
    
    const typedInvoice = invoice as unknown as IInvoice; // Cast to IInvoice

    // Verifica che il codice non sia scaduto
    if (typedInvoice.publicAccessExpiry && new Date(typedInvoice.publicAccessExpiry) < new Date()) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Il link di accesso è scaduto' 
        } as PublicAccessValidation,
        { status: 403 }
      );
    }
    
    // Verifica che la ricevuta non sia annullata
    if (typedInvoice.status === 'cancelled') {
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
      _id: typedInvoice._id,
      invoiceNumber: typedInvoice.invoiceNumber,
      invoiceDate: typedInvoice.invoiceDate,
      customer: {
        name: typedInvoice.customer.name,
        email: typedInvoice.customer.email,
      },
      issuer: typedInvoice.issuer,
      stayDetails: typedInvoice.stayDetails,
      items: typedInvoice.items,
      subtotal: typedInvoice.subtotal,
      vatAmount: typedInvoice.vatAmount,
      total: typedInvoice.total,
      platformInfo: typedInvoice.platformInfo,
      pdfUrl: typedInvoice.pdfUrl,
      documentType: typedInvoice.documentType,
      activityType: typedInvoice.activityType,
      paymentInfo: {
        status: typedInvoice.paymentInfo.status,
        method: typedInvoice.paymentInfo.method,
      },
      notes: typedInvoice.notes, // Solo note pubbliche, non internalNotes
    };
    
    const response: PublicAccessValidation = {
      isValid: true,
      invoiceId: typedInvoice._id!.toString(), // Add non-null assertion for _id
      expiresAt: typedInvoice.publicAccessExpiry,
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
