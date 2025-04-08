import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import stripe from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, isGroupBooking, groupBookingIds = [] } = await req.json();

    if (!bookingId && (!isGroupBooking || groupBookingIds.length === 0)) {
      return NextResponse.json(
        { error: 'Missing booking information' },
        { status: 400 }
      );
    }

    await connectDB();

    // Gestisci prenotazione singola
    if (bookingId) {
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
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?id=${booking._id}`,
        client_reference_id: booking._id.toString(),
        customer_email: booking.guestEmail,
        metadata: {
          bookingId: booking._id.toString(),
          apartmentId: apartment._id.toString(),
          checkIn: checkInDate,
          checkOut: checkOutDate,
          isGroupBooking: 'false'
        },
      });

      // Aggiorna la prenotazione con l'ID della sessione Stripe
      booking.paymentId = session.id;
      await booking.save();

      return NextResponse.json({ url: session.url });
    }
    
    // Gestisci prenotazione di gruppo
    if (isGroupBooking && groupBookingIds.length > 0) {
      // Trova tutte le prenotazioni del gruppo
      const groupBookings = await BookingModel.find({
        _id: { $in: groupBookingIds }
      });
      
      if (groupBookings.length === 0) {
        return NextResponse.json(
          { error: 'No group bookings found' },
          { status: 404 }
        );
      }
      
      // Verifica che tutte le prenotazioni abbiano lo stesso guest
      const guestEmail = groupBookings[0].guestEmail;
      const guestName = groupBookings[0].guestName;
      
      // Ottieni date per il titolo dalla prima prenotazione
      const checkInDate = new Date(groupBookings[0].checkIn).toLocaleDateString('it-IT');
      const checkOutDate = new Date(groupBookings[0].checkOut).toLocaleDateString('it-IT');
      
      // Ottieni i dettagli degli appartamenti
      const apartmentIds = groupBookings.map(booking => booking.apartmentId);
      const apartments = await ApartmentModel.find({
        _id: { $in: apartmentIds }
      });
      
      // Mappa appartamenti per ID per un accesso facile
      const apartmentsMap = apartments.reduce((map, apt) => {
        map[apt._id.toString()] = apt;
        return map;
      }, {} as Record<string, any>);
      
      // Calcola il prezzo totale del gruppo
      const totalPrice = groupBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
      
      // Crea la sessione di checkout Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: groupBookings.map(booking => {
          const apt = apartmentsMap[booking.apartmentId.toString()];
          return {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${apt.name} (${checkInDate} - ${checkOutDate})`,
                description: `Parte di prenotazione di gruppo, ${booking.numberOfGuests} ospiti`,
              },
              unit_amount: Math.round(booking.totalPrice * 100),
            },
            quantity: 1,
          };
        }),
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?group=true`,
        client_reference_id: groupBookingIds.join(','),
        customer_email: guestEmail,
        metadata: {
          groupBookingIds: groupBookingIds.join(','),
          checkIn: checkInDate,
          checkOut: checkOutDate,
          isGroupBooking: 'true'
        },
      });
      
      // Aggiorna tutte le prenotazioni con l'ID della sessione Stripe
      await BookingModel.updateMany(
        { _id: { $in: groupBookingIds } },
        { paymentId: session.id }
      );
      
      return NextResponse.json({ url: session.url });
    }
    
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
