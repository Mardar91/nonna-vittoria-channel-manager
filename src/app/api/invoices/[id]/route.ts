import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import BookingModel from '@/models/Booking';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { UpdateInvoiceDTO } from '@/types/invoice';
import { cancelInvoice } from '@/lib/invoice-generator';

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
    
    const invoice = await InvoiceModel.findById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    // Popola anche i dati dell'appartamento se necessario
    const populatedInvoice = await InvoiceModel
      .findById(params.id)
      .populate('apartmentId', 'name address')
      .lean();
    
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
    
    // Verifica che sia modificabile
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
    
    // Aggiorna i dati del cliente
    if (updateData.customer) {
      Object.assign(invoice.customer, updateData.customer);
    }
    
    // Aggiorna le voci e ricalcola i totali
    if (updateData.items) {
      const settings = await InvoiceSettingsModel.findOne({ 
        groupId: invoice.settingsGroupId 
      });
      
      if (!settings) {
        return NextResponse.json(
          { error: 'Impostazioni di fatturazione non trovate' },
          { status: 400 }
        );
      }
      
      // Ricrea le voci con i calcoli corretti
      invoice.items = [];
      let subtotal = 0;
      let vatAmount = 0;
      
      for (const item of updateData.items) {
        const totalPrice = item.quantity * item.unitPrice;
        let itemVatAmount = 0;
        
        if (invoice.activityType === 'business' && item.vatRate) {
          if (settings.vatIncluded) {
            // Prezzo include IVA, scorporala
            const priceWithoutVat = totalPrice / (1 + item.vatRate / 100);
            itemVatAmount = totalPrice - priceWithoutVat;
          } else {
            // Prezzo non include IVA, calcolala
            itemVatAmount = totalPrice * (item.vatRate / 100);
          }
        }
        
        invoice.items.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          vatRate: item.vatRate,
          vatAmount: itemVatAmount,
        });
        
        subtotal += totalPrice;
        vatAmount += itemVatAmount;
      }
      
      invoice.subtotal = subtotal;
      invoice.vatAmount = invoice.activityType === 'business' ? vatAmount : undefined;
      invoice.total = invoice.activityType === 'business' && !settings.vatIncluded 
        ? subtotal + vatAmount 
        : subtotal;
    }
    
    // Aggiorna informazioni pagamento
    if (updateData.paymentInfo) {
      Object.assign(invoice.paymentInfo, updateData.paymentInfo);
      
      // Se il pagamento è confermato, imposta la data se non presente
      if (updateData.paymentInfo.status === 'paid' && !invoice.paymentInfo.paidDate) {
        invoice.paymentInfo.paidDate = new Date();
      }
    }
    
    // Aggiorna note
    if (updateData.notes !== undefined) {
      invoice.notes = updateData.notes;
    }
    
    if (updateData.internalNotes !== undefined) {
      invoice.internalNotes = updateData.internalNotes;
    }
    
    if (updateData.footer !== undefined) {
      invoice.footer = updateData.footer;
    }
    
    // Aggiorna stato se specificato
    if (updateData.status && ['draft', 'issued', 'sent', 'cancelled'].includes(updateData.status)) {
      invoice.status = updateData.status;
    }
    
    // Imposta chi ha modificato
    invoice.updatedBy = session.user?.id || '1';
    
    // Salva le modifiche
    await invoice.save();
    
    return NextResponse.json({
      success: true,
      invoice,
      message: 'Ricevuta aggiornata con successo',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Elimina ricevuta (solo se in bozza)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
    
    // Verifica che sia eliminabile
    if (invoice.isLocked) {
      return NextResponse.json(
        { error: 'La ricevuta è bloccata e non può essere eliminata' },
        { status: 403 }
      );
    }
    
    if (invoice.status !== 'draft') {
      // Per ricevute non in bozza, usa la cancellazione logica
      const result = await cancelInvoice(
        params.id,
        'Cancellata dall\'utente',
        session.user?.id || '1'
      );
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Ricevuta annullata con successo',
      });
    }
    
    // Per bozze, elimina fisicamente
    await InvoiceModel.findByIdAndDelete(params.id);
    
    // Aggiorna la prenotazione per rimuovere il riferimento
    if (invoice.bookingId) {
      await BookingModel.findByIdAndUpdate(invoice.bookingId, {
        'invoiceSettings.invoiceEmitted': false,
        'invoiceSettings.invoiceId': null,
        'invoiceSettings.invoiceNumber': null,
        'invoiceSettings.emittedAt': null,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Ricevuta eliminata con successo',
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
