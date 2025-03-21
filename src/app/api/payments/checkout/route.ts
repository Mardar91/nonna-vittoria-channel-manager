import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import stripe from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova la prenotazione
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Trova l'appartamento
    const apartment = await ApartmentModel.findById(booking.apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }

    // Calcola le date per il titolo
    const checkInDate = new Date(booking.checkIn).toLocaleDateString('it-IT');
    const checkOutDate = new Date(booking.checkOut).toLocaleDateString('it-IT');

    // Crea la sessione di checkout Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${apartment.name} (${checkInDate} - ${checkOutDate})`,
              description: `${booking.numberOfGuests} ospiti, ${booking.guestName}`,
            },
            unit_amount: Math.round(booking.totalPrice * 100), // Stripe richiede centesimi
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/cancel?id=${booking._id}`,
      client_reference_id: booking._id.toString(),
      customer_email: booking.guestEmail,
      metadata: {
        bookingId: booking._id.toString(),
        apartmentId: apartment._id.toString(),
        checkIn: checkInDate,
        checkOut: checkOutDate,
      },
    });

    // Aggiorna la prenotazione con l'ID della sessione Stripe
    booking.paymentId = session.id;
    await booking.save();

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
