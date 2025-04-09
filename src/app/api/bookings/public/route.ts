import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import PublicProfileModel from '@/models/PublicProfile';
import { checkAvailability } from '@/lib/ical';
import { calculateTotalPrice } from '@/lib/utils';

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
      groupApartments,
      totalGuests
    } = data;
    
    // Validazione dei dati di base
    if (!guestName || !guestEmail || !checkIn || !checkOut) {
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
      
      // Verifica prenotazioni esistenti - MODIFICA: verifica solo prenotazioni CONFERMATE
      const existingBookings = await BookingModel.find({
        apartmentId,
        status: 'confirmed', // Modifica: controlla solo le prenotazioni confermate
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
      
      // Calcola prezzo totale con la nuova funzione
      const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Limita il numero di ospiti alla capacità massima dell'appartamento
      const effectiveGuests = Math.min(numberOfGuests, apartment.maxGuests);
      
      const totalPrice = calculateTotalPrice(apartment, effectiveGuests, nights);
      
      // Crea la prenotazione con stato 'inquiry'
      const booking = await BookingModel.create({
        apartmentId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn: startDate,
        checkOut: endDate,
        totalPrice,
        numberOfGuests: effectiveGuests, // Salva il numero effettivo di ospiti
        status: 'inquiry', // Modifica: inizialmente è una richiesta, non una prenotazione in attesa
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
      
      // Nuova logica: ora groupApartments contiene oggetti con apartmentId e numberOfGuests
      for (const groupItem of groupApartments) {
        const { apartmentId, numberOfGuests } = groupItem;
        
        // Salta appartamenti che non hanno ospiti assegnati
        if (!numberOfGuests || numberOfGuests <= 0) continue;
        
        // Verifica che l'appartamento esista
        const apartment = await ApartmentModel.findById(apartmentId);
        if (!apartment) {
          return NextResponse.json(
            { error: `Appartamento ${apartmentId} non trovato` },
            { status: 404 }
          );
        }
        
        // Verifica prenotazioni esistenti - solo prenotazioni CONFERMATE
        const existingBookings = await BookingModel.find({
          apartmentId,
          status: 'confirmed',
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
            apartmentId
          }, { status: 400 });
        }
        
        // Calcola prezzo totale per questo appartamento con la nuova funzione
        const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const totalPrice = calculateTotalPrice(apartment, numberOfGuests, nights);
        totalGroupPrice += totalPrice;
        
        // Prepara la prenotazione da creare con stato 'inquiry'
        bookingsToCreate.push({
          apartmentId,
          guestName,
          guestEmail,
          guestPhone,
          checkIn: startDate,
          checkOut: endDate,
          totalPrice,
          numberOfGuests,
          status: 'inquiry',
          paymentStatus: 'pending',
          source: 'direct',
          notes: `${notes ? notes + ' - ' : ''}Parte di prenotazione di gruppo`
        });
      }
      
      if (bookingsToCreate.length === 0) {
        return NextResponse.json(
          { error: 'Nessun appartamento valido nella prenotazione di gruppo' },
          { status: 400 }
        );
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
