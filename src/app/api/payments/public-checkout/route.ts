import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import stripe from '@/lib/stripe';
import mongoose from 'mongoose'; // Import mongoose

export async function POST(req: NextRequest) {
  try {
    const { bookingId, isGroupBooking, groupBookingIds = [] } = await req.json();

    // Validazione input più robusta
    if (!bookingId && (!isGroupBooking || !Array.isArray(groupBookingIds) || groupBookingIds.length === 0)) {
      return NextResponse.json(
        { error: 'Missing or invalid booking information' },
        { status: 400 }
      );
    }
     if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
       return NextResponse.json({ error: 'Invalid booking ID format' }, { status: 400 });
     }
     if (isGroupBooking && groupBookingIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
       return NextResponse.json({ error: 'Invalid group booking ID format' }, { status: 400 });
     }

    await connectDB();

    // Gestisci prenotazione singola
    if (bookingId && !isGroupBooking) {
      const booking = await BookingModel.findById(bookingId);

      // La prenotazione deve esistere ed essere PENDING per procedere al pagamento
      if (!booking || booking.status !== 'pending' || booking.paymentStatus !== 'pending') {
        console.warn(`Checkout attempt for non-pending booking: ${bookingId}, status: ${booking?.status}, paymentStatus: ${booking?.paymentStatus}`);
        return NextResponse.json(
          { error: 'Booking not found or not in a state ready for payment' },
          { status: 404 } // O 400 Bad Request, a seconda della semantica preferita
        );
      }

      const apartment = await ApartmentModel.findById(booking.apartmentId);
      if (!apartment) {
         console.error(`Apartment ${booking.apartmentId} not found for pending booking ${bookingId}. Cancelling booking.`);
         // La prenotazione non può essere completata, cancellala
         await BookingModel.findByIdAndDelete(bookingId);
        return NextResponse.json(
          { error: 'Associated apartment not found, booking cancelled' },
          { status: 404 }
        );
      }

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
                description: `${booking.numberOfGuests} ospiti. ID Prenotazione: ${booking._id.toString()}`,
              },
              unit_amount: Math.round(booking.totalPrice * 100), // Prezzo in centesimi
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?booking_id=${booking._id.toString()}`,
        metadata: {
          bookingId: booking._id.toString(),
          apartmentId: apartment._id.toString(),
          isGroupBooking: 'false'
        },
        customer_email: booking.guestEmail, // Precompila email
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Scade tra 1 ora
      });

      // Aggiorna la prenotazione PENDING con l'ID della sessione Stripe
      booking.paymentId = session.id;
      await booking.save();
      console.log(`Stripe checkout session ${session.id} created for booking ${bookingId}`);

      return NextResponse.json({ url: session.url });
    }

    // Gestisci prenotazione di gruppo
    if (isGroupBooking && groupBookingIds.length > 0) {
       const validGroupIds = groupBookingIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if(validGroupIds.length !== groupBookingIds.length) {
            console.error("Invalid ObjectIds in groupBookingIds:", groupBookingIds);
            return NextResponse.json({ error: 'Invalid IDs in group booking request' }, { status: 400 });
        }


      const groupBookings = await BookingModel.find({
        _id: { $in: validGroupIds },
        status: 'pending', // Assicurati che siano tutte pending
        paymentStatus: 'pending'
      });

      // Verifica se tutte le prenotazioni richieste sono state trovate e sono nello stato corretto
      if (groupBookings.length !== validGroupIds.length) {
         console.warn(`Group checkout attempt: Mismatch in pending bookings found. Expected ${validGroupIds.length}, found ${groupBookings.length}. IDs: ${validGroupIds.join(',')}`);
        return NextResponse.json(
          { error: 'Some bookings in the group are not found or not ready for payment' },
          { status: 404 }
        );
      }

      // Controlli aggiuntivi (stesso guest, periodo, ecc.) - opzionale ma consigliato
      const firstBooking = groupBookings[0];
      const guestEmail = firstBooking.guestEmail;
      const checkInDate = new Date(firstBooking.checkIn).toLocaleDateString('it-IT');
      const checkOutDate = new Date(firstBooking.checkOut).toLocaleDateString('it-IT');
      // Aggiungi controllo che tutte abbiano lo stesso guestEmail/date se necessario

      const apartmentIds = groupBookings.map(b => b.apartmentId);
      const apartments = await ApartmentModel.find({ _id: { $in: apartmentIds } });

      if (apartments.length !== apartmentIds.length) {
        console.error(`Could not find all apartments for group booking IDs: ${apartmentIds.join(',')}. Cancelling bookings.`);
        // Cancella le prenotazioni del gruppo perché non possono procedere
        await BookingModel.deleteMany({ _id: { $in: validGroupIds } });
        return NextResponse.json({ error: 'Could not find all associated apartments, group booking cancelled' }, { status: 500 });
      }

      const apartmentsMap = apartments.reduce((map, apt) => {
        map[apt._id.toString()] = apt;
        return map;
      }, {} as Record<string, any>);

      // Crea line_items per Stripe
      const lineItems = groupBookings.map(booking => {
        const apt = apartmentsMap[booking.apartmentId.toString()];
        if (!apt) {
            // Questo check è ridondante se il precedente ha funzionato, ma per sicurezza
            throw new Error(`Apartment data missing for booking ${booking._id} during line item creation`);
        }
        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${apt.name} (${checkInDate} - ${checkOutDate})`,
              description: `Parte di prenotazione gruppo. ID: ${booking._id.toString()}`,
            },
            unit_amount: Math.round(booking.totalPrice * 100),
          },
          quantity: 1,
        };
      });

      // Crea la sessione di checkout Stripe per il gruppo
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirmation?session_id={CHECKOUT_SESSION_ID}&group=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?group=true`, // Potrebbe servire passare gli ID qui?
        metadata: {
          groupBookingIds: validGroupIds.join(','),
          isGroupBooking: 'true'
        },
        customer_email: guestEmail,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Scade tra 1 ora
      });

      // Aggiorna tutte le prenotazioni PENDING del gruppo con l'ID della sessione
      await BookingModel.updateMany(
        { _id: { $in: validGroupIds } },
        { paymentId: session.id }
      );
       console.log(`Stripe checkout session ${session.id} created for group booking IDs: ${validGroupIds.join(',')}`);

      return NextResponse.json({ url: session.url });
    }

    // Se nessuna delle condizioni è soddisfatta
    console.warn("Invalid request structure in public-checkout");
    return NextResponse.json( { error: 'Invalid request parameters' }, { status: 400 } );

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    // Ritorna un errore generico per sicurezza
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
