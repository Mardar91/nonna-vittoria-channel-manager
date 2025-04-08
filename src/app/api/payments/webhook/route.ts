import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import stripe from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature') || '';

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing Stripe webhook secret' },
        { status: 500 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Gestisci vari tipi di eventi
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      await connectDB();
      
      // Verifica se è una prenotazione di gruppo
      const isGroupBooking = session.metadata.isGroupBooking === 'true';
      
      if (isGroupBooking) {
        // Per prenotazioni di gruppo
        const groupBookingIds = session.metadata.groupBookingIds.split(',');
        
        // Aggiorna tutte le prenotazioni del gruppo
        await BookingModel.updateMany(
          { _id: { $in: groupBookingIds } },
          {
            status: 'confirmed',
            paymentStatus: 'paid'
          }
        );
      } else {
        // Per prenotazione singola
        const bookingId = session.metadata.bookingId;
        if (bookingId) {
          const booking = await BookingModel.findById(bookingId);
          if (booking) {
            booking.status = 'confirmed';
            booking.paymentStatus = 'paid';
            await booking.save();
          }
        }
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      // Se la sessione è scaduta o il pagamento è fallito
      const session = event.data.object as any;
      
      await connectDB();
      
      // Verifica se è una prenotazione di gruppo
      const isGroupBooking = session.metadata.isGroupBooking === 'true';
      
      if (isGroupBooking) {
        // Per prenotazioni di gruppo
        const groupBookingIds = session.metadata.groupBookingIds.split(',');
        
        // Marca tutte le prenotazioni del gruppo come cancellate
        await BookingModel.updateMany(
          { _id: { $in: groupBookingIds } },
          {
            status: 'cancelled',
            paymentStatus: 'failed',
            notes: booking => `${booking.notes || ''} Cancellata automaticamente: pagamento non completato`
          }
        );
      } else {
        // Per prenotazione singola
        const bookingId = session.metadata.bookingId;
        if (bookingId) {
          const booking = await BookingModel.findById(bookingId);
          if (booking && booking.status === 'inquiry') {
            booking.status = 'cancelled';
            booking.paymentStatus = 'failed';
            booking.notes = `${booking.notes || ''} Cancellata automaticamente: pagamento non completato`;
            await booking.save();
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
