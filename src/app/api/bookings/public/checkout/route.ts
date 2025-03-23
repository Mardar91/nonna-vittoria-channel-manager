import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import PublicProfileModel from '@/models/PublicProfile';
import stripe from '@/lib/stripe';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      apartmentId, 
      guestName, 
      guestEmail, 
      guestPhone, 
      checkIn, 
      checkOut, 
      numberOfGuests,
      notes,
      isGroupBooking,
      groupApartments
    } = data;
    
    // Validazione dei dati di base
    if (!guestName || !guestEmail || !guestPhone || !checkIn || !checkOut || !numberOfGuests) {
      return NextResponse.json(
        { error: 'Mancano campi obbligatori' },
        { status: 400 }
      );
    }
    
    // Valida che o apartmentId o groupApartments siano forniti
    if (!apartmentId && (!isGroupBooking || !groupApartments || !groupApartments.length)) {
      return NextResponse.json(
        { error: 'È necessario specificare un appartamento o un gruppo di appartamenti' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Verifica se il profilo pubblico è attivo
    const profile = await PublicProfileModel.findOne({});
    if (!profile || !profile.isActive) {
      return NextResponse.json(
        { error: 'Il sistema di prenotazione online non è attualmente disponibile' },
        { status: 403 }
      );
    }
    
    // Per prenotazione singola
    if (apartmentId && !isGroupBooking) {
      // Verifica che l'appartamento esista
      const apartment = await ApartmentModel.findById(apartmentId);
      if (!apartment) {
        return NextResponse.json(
          { error: 'Appartamento non trovato' },
          { status: 404 }
        );
      }
      
      // Verificare disponibilità
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      
      // Verifica prenotazioni esistenti
      const existingBookings = await BookingModel.find({
        apartmentId,
        status: { $ne: 'cancelled' },
        $or: [
          {
            checkIn: { $lt: endDate },
            checkOut: { $gt: startDate }
          }
        ]
      });
      
      if (existingBookings.length > 0) {
        return NextResponse.json(
          { error: 'L\'appartamento non è più disponibile per le date selezionate' },
          { status: 400 }
        );
      }
      
      // Calcola prezzo totale
      const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalPrice = apartment.price * nights;
      
      // Crea la prenotazione con stato 'pending'
      const booking = await BookingModel.create({
        apartmentId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn: startDate,
        checkOut: endDate,
        totalPrice,
        numberOfGuests,
        status: 'pending',
        paymentStatus: 'pending',
        source: 'direct',
        notes,
        bookingReference: `${profile.name.substring(0, 3).toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`
      });
      
      // Crea sessione di checkout Stripe
      const checkInString = startDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const checkOutString = endDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${apartment.name} (${checkInString} - ${checkOutString})`,
                description: `${booking.numberOfGuests} ospiti, ${nights} notti`
              },
              unit_amount: Math.round(totalPrice * 100) // Stripe usa i centesimi
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?booking_id=${booking._id}`,
        customer_email: guestEmail,
        metadata: {
          bookingId: booking._id.toString(),
          bookingType: 'single',
          bookingReference: booking.bookingReference
        }
      });
      
      // Aggiorna la prenotazione con il paymentId
      booking.paymentId = session.id;
      await booking.save();
      
      return NextResponse.json({
        success: true,
        bookingId: booking._id,
        url: session.url
      });
    }
    
    // Per prenotazione di gruppo
    if (isGroupBooking && groupApartments && groupApartments.length > 0) {
      // Verifica che groupBooking sia abilitato
      if (!profile.allowGroupBooking) {
        return NextResponse.json(
          { error: 'Le prenotazioni di gruppo non sono abilitate' },
          { status: 403 }
        );
      }
      
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Genera un riferimento di prenotazione comune per tutte le prenotazioni del gruppo
      const groupReference = `${profile.name.substring(0, 3).toUpperCase()}-GROUP-${uuidv4().substring(0, 6).toUpperCase()}`;
      
      // Verifica la disponibilità per tutti gli appartamenti del gruppo
      const bookingsToCreate = [];
      let totalGroupPrice = 0;
      const lineItems = [];
      
      for (const aptId of groupApartments) {
        // Verifica che l'appartamento esista
        const apartment = await ApartmentModel.findById(aptId);
        if (!apartment) {
          return NextResponse.json(
            { error: `Appartamento ${aptId} non trovato` },
            { status: 404 }
          );
        }
        
        // Verifica prenotazioni esistenti
        const existingBookings = await BookingModel.find({
          apartmentId: aptId,
          status: { $ne: 'cancelled' },
          $or: [
            {
              checkIn: { $lt: endDate },
              checkOut: { $gt: startDate }
            }
          ]
        });
        
        if (existingBookings.length > 0) {
          return NextResponse.json({
            error: `L'appartamento ${apartment.name} non è più disponibile per le date selezionate`,
            apartmentId: aptId
          }, { status: 400 });
        }
        
        // Calcola prezzo per questo appartamento
        const totalPrice = apartment.price * nights;
        totalGroupPrice += totalPrice;
        
        // Aggiungi line item per Stripe
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${apartment.name} (Gruppo: ${groupReference})`,
              description: `${nights} notti, dal ${startDate.toLocaleDateString('it-IT')} al ${endDate.toLocaleDateString('it-IT')}`
            },
            unit_amount: Math.round(totalPrice * 100) // Stripe usa i centesimi
          },
          quantity: 1
        });
        
        // Prepara la prenotazione da creare
        bookingsToCreate.push({
          apartmentId: aptId,
          guestName,
          guestEmail,
          guestPhone,
          checkIn: startDate,
          checkOut: endDate,
          totalPrice,
          numberOfGuests, // Questo sarà diviso tra gli appartamenti nella prenotazione reale
          status: 'pending',
          paymentStatus: 'pending',
          source: 'direct',
          notes: `${notes ? notes + ' - ' : ''}Parte di prenotazione di gruppo ${groupReference}`,
          groupBookingReference: groupReference,
          bookingReference: `${groupReference}-${apartment.name.substring(0, 3).toUpperCase()}`
        });
      }
      
      // Crea tutte le prenotazioni
      const createdBookings = await BookingModel.insertMany(bookingsToCreate);
      const bookingIds = createdBookings.map(booking => booking._id.toString());
      
      // Crea sessione di checkout Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?group_reference=${encodeURIComponent(groupReference)}`,
        customer_email: guestEmail,
        metadata: {
          bookingIds: JSON.stringify(bookingIds),
          bookingType: 'group',
          groupReference
        }
      });
      
      // Aggiorna le prenotazioni con il paymentId
      await BookingModel.updateMany(
        { _id: { $in: bookingIds } },
        { paymentId: session.id }
      );
      
      return NextResponse.json({
        success: true,
        bookingIds,
        groupReference,
        url: session.url
      });
    }
    
    return NextResponse.json(
      { error: 'Richiesta non valida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating booking and checkout:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
