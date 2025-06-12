import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import NotificationModel from '@/models/Notification';
import ApartmentModel from '@/models/Apartment';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Conferma il prezzo di una prenotazione
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { price, notes } = await req.json();
    
    // Validazione prezzo
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Il prezzo deve essere un numero positivo' },
        { status: 400 }
      );
    }
    
    if (price > 999999) {
      return NextResponse.json(
        { error: 'Il prezzo inserito è troppo alto' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Trova la prenotazione
    const booking = await BookingModel.findById(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che la prenotazione non sia cancellata
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Non è possibile confermare il prezzo di una prenotazione cancellata' },
        { status: 400 }
      );
    }
    
    // Verifica che la prenotazione necessiti conferma prezzo
    if (booking.totalPrice > 0 && booking.invoiceSettings?.priceConfirmed) {
      return NextResponse.json(
        { error: 'Il prezzo di questa prenotazione è già stato confermato' },
        { status: 400 }
      );
    }
    
    // Ottieni info appartamento per la notifica
    const apartment = await ApartmentModel.findById(booking.apartmentId).select('name');
    
    // Aggiorna la prenotazione con il metodo del modello
    await booking.confirmPrice(price, session.user?.id || '1');
    
    // Aggiungi note se fornite
    if (notes) {
      booking.notes = booking.notes 
        ? `${booking.notes}\n\nPrezzo confermato: ${notes}`
        : `Prezzo confermato: ${notes}`;
      await booking.save();
    }
    
    // Crea una notifica
    await NotificationModel.create({
      userId: '1', // Admin
      type: 'new_booking',
      title: 'Prezzo Confermato',
      message: `Il prezzo per la prenotazione di ${booking.guestName} è stato confermato: €${price.toFixed(2)}`,
      relatedModel: 'Booking',
      relatedId: booking._id,
      apartmentId: booking.apartmentId,
      metadata: {
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        apartmentName: apartment?.name,
      },
    });
    
    // Log dell'operazione
    console.log(`Price confirmed for booking ${booking._id}: €${price} by user ${session.user?.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Prezzo confermato con successo',
      booking: {
        _id: booking._id,
        totalPrice: booking.totalPrice,
        invoiceSettings: booking.invoiceSettings,
      },
    });
    
  } catch (error) {
    console.error('Error confirming price:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// GET: Verifica se il prezzo necessita conferma
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
      .select('totalPrice invoiceSettings status manualTotalPrice source')
      .populate('apartmentId', 'name price');
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      );
    }
    
    const needsConfirmation = booking.needsPriceConfirmation();
    const suggestedPrice = booking.manualTotalPrice || booking.totalPrice || 0;
    
    return NextResponse.json({
      needsConfirmation,
      currentPrice: booking.totalPrice,
      suggestedPrice,
      priceConfirmed: booking.invoiceSettings?.priceConfirmed || false,
      priceConfirmedAt: booking.invoiceSettings?.priceConfirmedAt,
      priceConfirmedBy: booking.invoiceSettings?.priceConfirmedBy,
      source: booking.source,
      status: booking.status,
      canConfirm: booking.status !== 'cancelled',
    });
    
  } catch (error) {
    console.error('Error checking price confirmation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
