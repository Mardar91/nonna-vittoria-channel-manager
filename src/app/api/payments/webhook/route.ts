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
      
      // Trova e aggiorna la prenotazione
      const bookingId = session.metadata.bookingId;
      if (bookingId) {
        const booking = await BookingModel.findById(bookingId);
        if (booking) {
          booking.status = 'confirmed';
          booking.paymentStatus = 'paid';
          await booking.save();
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      // Se la sessione è scaduta
      const session = event.data.object as any;
      
      await connectDB();
      
      // Trova la prenotazione
      const bookingId = session.metadata.bookingId;
      if (bookingId) {
        const booking = await BookingModel.findById(bookingId);
        if (booking && booking.status === 'pending') {
          booking.paymentStatus = 'failed';
          await booking.save();
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
