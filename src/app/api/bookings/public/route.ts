import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import PublicProfileModel from '@/models/PublicProfile';
import { checkAvailability } from '@/lib/ical';

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
    if (!guestName || !guestEmail || !checkIn || !checkOut || !numberOfGuests) {
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
      
      // Crea la prenotazione
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
        notes
      });
      
      return NextResponse.json({
        success: true,
        booking
      }, { status: 201 });
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
      
      // Verifica la disponibilità per tutti gli appartamenti del gruppo
      const bookingsToCreate = [];
      let totalGroupPrice = 0;
      
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
        
        // Calcola prezzo totale per questo appartamento
        const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const totalPrice = apartment.price * nights;
        totalGroupPrice += totalPrice;
        
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
          notes: `${notes ? notes + ' - ' : ''}Parte di prenotazione di gruppo`
        });
      }
      
      // Crea tutte le prenotazioni
      const createdBookings = await BookingModel.insertMany(bookingsToCreate);
      
      return NextResponse.json({
        success: true,
        bookings: createdBookings,
        totalPrice: totalGroupPrice
      }, { status: 201 });
    }
    
    return NextResponse.json(
      { error: 'Richiesta non valida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
