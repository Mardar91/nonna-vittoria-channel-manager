import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { duplicateInvoice } from '@/lib/invoice-generator';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Duplica una ricevuta esistente
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
    const options = {
      asNewBooking: data.asNewBooking || false, // Se true, crea come nuova prenotazione
      keepOriginalDate: data.keepOriginalDate || false, // Se true, mantiene la data originale
      markAsDraft: data.markAsDraft ?? true, // Default: crea come bozza
      notes: data.notes, // Note aggiuntive per la duplicazione
    };

    await connectDB();
    
    // Verifica che la ricevuta originale esista
    const originalInvoice = await InvoiceModel.findById(params.id);
    
    if (!originalInvoice) {
      return NextResponse.json(
        { error: 'Ricevuta originale non trovata' },
        { status: 404 }
      );
    }
    
    // Se si sta duplicando come nuova prenotazione, usa il generatore
    if (options.asNewBooking) {
      const result = await duplicateInvoice(
        params.id,
        session.user?.id || '1'
      );
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Errore nella duplicazione' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        invoiceId: result.invoice?._id,
        invoiceNumber: result.invoice?.invoiceNumber,
        message: 'Ricevuta duplicata con successo',
        redirect: `/invoices/${result.invoice?._id}/edit`,
      });
    }
    
    // Altrimenti, duplica manualmente mantenendo la stessa prenotazione
    const duplicateData = {
      ...originalInvoice.toObject(),
      _id: undefined,
      invoiceNumber: undefined, // Verrà generato un nuovo numero
      invoiceDate: options.keepOriginalDate ? originalInvoice.invoiceDate : new Date(),
      status: options.markAsDraft ? 'draft' : originalInvoice.status,
      isLocked: false,
      lockedAt: undefined,
      emailSent: false,
      emailSentAt: undefined,
      emailSentTo: undefined,
      pdfUrl: undefined,
      pdfGeneratedAt: undefined,
      publicAccessCode: undefined,
      publicAccessExpiry: undefined,
      notes: options.notes || originalInvoice.notes,
      internalNotes: `Duplicata da ricevuta ${originalInvoice.invoiceNumber}. ${originalInvoice.internalNotes || ''}`,
      createdBy: session.user?.id || '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Genera un nuovo numero progressivo
    const InvoiceSettingsModel = (await import('@/models/InvoiceSettings')).default;
    const InvoiceCounterModel = (await import('@/models/InvoiceCounter')).default;
    
    const settings = await InvoiceSettingsModel.findOne({
      groupId: originalInvoice.settingsGroupId
    });
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Impostazioni di fatturazione non trovate' },
        { status: 400 }
      );
    }
    
    const currentYear = new Date().getFullYear();
    const { formatted } = await InvoiceCounterModel.getNextNumber(
      settings.groupId,
      currentYear,
      '', // L'ID verrà assegnato dopo la creazione
      settings.numberingPrefix
    );
    
    // Formatta il numero secondo il pattern
    let invoiceNumber = settings.numberingFormat;
    invoiceNumber = invoiceNumber.replace('{{year}}', currentYear.toString());
    invoiceNumber = invoiceNumber.replace('{{number}}', formatted);
    if (settings.numberingPrefix) {
      invoiceNumber = invoiceNumber.replace('{{prefix}}', settings.numberingPrefix);
    }
    
    duplicateData.invoiceNumber = invoiceNumber;
    
    // Crea la nuova ricevuta
    const duplicatedInvoice = await InvoiceModel.create(duplicateData);
    
    // Aggiorna il contatore con l'ID della ricevuta
    await InvoiceCounterModel.findOneAndUpdate(
      { settingsGroupId: settings.groupId, year: currentYear },
      { $set: { 'usedNumbers.$[elem].invoiceId': duplicatedInvoice._id } },
      { arrayFilters: [{ 'elem.invoiceId': '' }] }
    );
    
    return NextResponse.json({
      success: true,
      invoiceId: duplicatedInvoice._id,
      invoiceNumber: duplicatedInvoice.invoiceNumber,
      message: 'Ricevuta duplicata con successo',
      redirect: options.markAsDraft ? `/invoices/${duplicatedInvoice._id}/edit` : `/invoices/${duplicatedInvoice._id}`,
    });
    
  } catch (error) {
    console.error('Error duplicating invoice:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}
