import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import BookingModel from '@/models/Booking'; // Questo import è necessario per la logica DELETE originale, ma non per la nuova
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { UpdateInvoiceDTO } from '@/types/invoice';
import { cancelDraftInvoice, cancelIssuedInvoice } from '@/lib/invoice-generator'; // Import aggiornato

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Ottieni singola ricevuta
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
    
    // Rimosso il primo findById che non veniva usato
    // const invoice = await InvoiceModel.findById(params.id);
    
    // if (!invoice) {
    //   return NextResponse.json(
    //     { error: 'Ricevuta non trovata' },
    //     { status: 404 }
    //   );
    // }

    const populatedInvoice = await InvoiceModel
      .findById(params.id)
      .populate('apartmentId', 'name address') // Popola anche i dati dell'appartamento
      .lean();

    if (!populatedInvoice) { // Controllo dopo il tentativo di popolamento
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(populatedInvoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Aggiorna ricevuta (solo se in bozza)
export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    
    if (invoice.isLocked) {
      return NextResponse.json(
        { error: 'La ricevuta è bloccata e non può essere modificata' },
        { status: 403 }
      );
    }
    
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo le ricevute in bozza possono essere modificate' },
        { status: 403 }
      );
    }
    
    const updateData: UpdateInvoiceDTO = await req.json();
    
    if (updateData.customer) {
      Object.assign(invoice.customer, updateData.customer);
    }
    
    if (updateData.items) {
      const settings = await InvoiceSettingsModel.findOne({ 
        groupId: invoice.settingsGroupId 
      });
      
      if (!settings) {
        return NextResponse.json(
          { error: 'Impostazioni di fatturazione non trovate per aggiornare le voci' },
          { status: 400 }
        );
      }
      
      invoice.items = [];
      let subtotal = 0;
      let vatAmount = 0;
      
      for (const item of updateData.items) {
        const itemTotalPrice = item.quantity * item.unitPrice; // Questo è il lordo per l'item
        let itemSubtotalForItem = itemTotalPrice; // Inizializza al lordo
        let itemVatAmountForItem = 0;
        
        if (invoice.activityType === 'business' && item.vatRate) {
          if (settings.vatIncluded) {
            itemSubtotalForItem = itemTotalPrice / (1 + item.vatRate / 100);
            itemVatAmountForItem = itemTotalPrice - itemSubtotalForItem;
          } else {
            // itemTotalPrice è già il netto in questo caso se vatIncluded è false
            itemVatAmountForItem = itemSubtotalForItem * (item.vatRate / 100);
          }
        }
        
        invoice.items.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice, // Prezzo unitario fornito (potrebbe essere lordo o netto a seconda di come UI lo gestisce)
          totalPrice: itemSubtotalForItem, // totalPrice dell'item dovrebbe essere netto
          vatRate: item.vatRate,
          vatAmount: itemVatAmountForItem,
        });
        
        subtotal += itemSubtotalForItem; // subtotal generale è sempre netto
        vatAmount += itemVatAmountForItem; // vatAmount generale
      }
      
      invoice.subtotal = subtotal;
      invoice.vatAmount = invoice.activityType === 'business' ? vatAmount : undefined;
      // Il totale generale è sempre subtotal + vatAmount (che è 0 se non business)
      invoice.total = subtotal + (invoice.vatAmount || 0);
    }
    
    if (updateData.paymentInfo) {
      Object.assign(invoice.paymentInfo, updateData.paymentInfo);
      if (updateData.paymentInfo.status === 'paid' && !invoice.paymentInfo.paidDate) {
        invoice.paymentInfo.paidDate = new Date();
      }
    }
    
    if (updateData.notes !== undefined) invoice.notes = updateData.notes;
    if (updateData.internalNotes !== undefined) invoice.internalNotes = updateData.internalNotes;
    if (updateData.footer !== undefined) invoice.footer = updateData.footer;
    if (updateData.invoiceDate) invoice.invoiceDate = new Date(updateData.invoiceDate); // Permetti modifica data
    
    // Non permettere cambio di status o lock tramite PUT generico, usare azioni dedicate
    // if (updateData.status && ['draft', 'issued', 'sent', 'cancelled'].includes(updateData.status)) {
    //   invoice.status = updateData.status;
    // }
    
    invoice.updatedBy = session.user?.id || '1';
    await invoice.save();
    
    return NextResponse.json({
      success: true,
      invoice: invoice.toObject(), // Restituisci l'oggetto aggiornato
      message: 'Ricevuta aggiornata con successo',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    // Aggiungi più dettagli all'errore se possibile
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      { error: `Internal Server Error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE: Cancella bozza di fattura o annulla fattura emessa
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const invoiceId = params.id;
    const userId = session.user?.id || '1'; // Assicurati che ci sia un fallback per userId

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 });
    }

    // Modificato il controllo per isLocked: le bozze non dovrebbero essere bloccate,
    // ma se lo sono e sono bozze, permettiamo la cancellazione.
    // Se è bloccata E NON è una bozza, allora è un errore.
    if (invoice.isLocked && invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'La fattura emessa è bloccata e non può essere annullata tramite questa API.' },
        { status: 403 }
      );
    }

    let result;
    let message: string;

    if (invoice.status === 'draft') {
      // Per le bozze, usa cancelDraftInvoice per l'eliminazione fisica e il rollback del contatore
      result = await cancelDraftInvoice(invoiceId, 'Eliminata dall\'utente come bozza', userId);
      message = 'Bozza di fattura eliminata con successo';
    } else {
      // Per fatture non in bozza (emesse, inviate, pagate, parziali), usa la cancellazione logica
      result = await cancelIssuedInvoice(invoiceId, 'Annullata dall\'utente', userId);
      message = 'Fattura annullata con successo';
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Operazione fallita durante la cancellazione/annullamento' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, message, invoice: result.invoice }); // Restituisci anche la fattura aggiornata

  } catch (error) {
    console.error('Error processing DELETE request for invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}
