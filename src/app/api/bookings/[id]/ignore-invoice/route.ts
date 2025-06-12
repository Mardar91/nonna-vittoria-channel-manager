import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import NotificationModel from '@/models/Notification';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Marca una prenotazione per non emettere ricevuta
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reason, revertIgnore } = await req.json();

    await connectDB();
    
    // Trova la prenotazione
    const booking = await BookingModel.findById(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che non abbia già una ricevuta emessa
    if (booking.invoiceSettings?.invoiceEmitted) {
      return NextResponse.json(
        { 
          error: `Questa prenotazione ha già una ricevuta emessa (${booking.invoiceSettings.invoiceNumber})` 
        },
        { status: 400 }
      );
    }
    
    // Se revertIgnore è true, riabilita la richiesta di ricevuta
    if (revertIgnore) {
      if (!booking.invoiceSettings) {
        booking.invoiceSettings = {} as any;
      }
      
      booking.invoiceSettings.requiresInvoice = true;
      
      // Rimuovi la nota di esclusione
      if (booking.notes) {
        booking.notes = booking.notes
          .split('\n')
          .filter(line => !line.includes('[Esclusa da fatturazione]'))
          .join('\n')
          .trim();
      }
      
      await booking.save();
      
      // Log dell'operazione
      console.log(`Booking ${booking._id} re-enabled for invoicing by user ${session.user?.id}`);
      
      return NextResponse.json({
        success: true,
        message: 'Prenotazione riabilitata per la fatturazione',
        booking: {
          _id: booking._id,
          requiresInvoice: booking.invoiceSettings.requiresInvoice,
        },
      });
    }
    
    // Marca come non richiede ricevuta
    if (!booking.invoiceSettings) {
      booking.invoiceSettings = {} as any;
    }
    
    booking.invoiceSettings.requiresInvoice = false;
    
    // Aggiungi nota con il motivo
    const timestamp = new Date().toLocaleString('it-IT');
    const ignoreNote = `[Esclusa da fatturazione - ${timestamp}] ${reason || 'Nessun motivo specificato'}`;
    
    booking.notes = booking.notes 
      ? `${booking.notes}\n\n${ignoreNote}`
      : ignoreNote;
    
    // Se il prezzo era 0 o non confermato, confermalo a 0 per evitare alert futuri
    if (booking.totalPrice === 0 || !booking.invoiceSettings.priceConfirmed) {
      booking.invoiceSettings.priceConfirmed = true;
      booking.invoiceSettings.priceConfirmedAt = new Date();
      booking.invoiceSettings.priceConfirmedBy = session.user?.id || '1';
    }
    
    await booking.save();
    
    // Crea una notifica
    await NotificationModel.create({
      userId: '1', // Admin
      type: 'new_booking',
      title: 'Prenotazione Esclusa da Fatturazione',
      message: `La prenotazione di ${booking.guestName} è stata esclusa dalla fatturazione${reason ? `: ${reason}` : ''}`,
      relatedModel: 'Booking',
      relatedId: booking._id,
      apartmentId: booking.apartmentId,
    });
    
    // Log dell'operazione
    console.log(`Booking ${booking._id} marked as no invoice required by user ${session.user?.id}. Reason: ${reason}`);
    
    return NextResponse.json({
      success: true,
      message: 'Prenotazione esclusa dalla fatturazione',
      booking: {
        _id: booking._id,
        requiresInvoice: booking.invoiceSettings.requiresInvoice,
        notes: booking.notes,
      },
    });
    
  } catch (error) {
    console.error('Error ignoring invoice for booking:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// GET: Verifica lo stato di esclusione fatturazione
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
    
    const booking = await BookingModel
      .findById(params.id)
      .select('invoiceSettings notes status totalPrice');
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      );
    }
    
    // Estrai il motivo dalle note se presente
    let ignoreReason = null;
    if (booking.notes) {
      const match = booking.notes.match(/\[Esclusa da fatturazione[^\]]*\]\s*(.+?)(?:\n|$)/);
      if (match) {
        ignoreReason = match[1].trim();
      }
    }
    
    return NextResponse.json({
      requiresInvoice: booking.invoiceSettings?.requiresInvoice ?? true,
      invoiceEmitted: booking.invoiceSettings?.invoiceEmitted || false,
      invoiceNumber: booking.invoiceSettings?.invoiceNumber,
      isIgnored: booking.invoiceSettings?.requiresInvoice === false,
      ignoreReason,
      canIgnore: !booking.invoiceSettings?.invoiceEmitted && booking.status !== 'cancelled',
      totalPrice: booking.totalPrice,
      status: booking.status,
    });
    
  } catch (error) {
    console.error('Error checking invoice ignore status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
