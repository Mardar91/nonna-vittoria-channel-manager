import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import PublicProfileModel from '@/models/PublicProfile';
import mongoose from 'mongoose'; // Import mongoose per error handling

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

    if (!apartmentId && (!isGroupBooking || !groupApartments || !groupApartments.length)) {
      return NextResponse.json(
        { error: 'È necessario specificare un appartamento o un gruppo di appartamenti' },
        { status: 400 }
      );
    }

    await connectDB();

    const profile = await PublicProfileModel.findOne({});
    if (!profile || !profile.isActive) {
      return NextResponse.json(
        { error: 'Il sistema di prenotazione online non è attualmente disponibile' },
        { status: 403 }
      );
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    // Funzione per verificare la disponibilità (SOLO contro prenotazioni CONFERMATE)
    const checkAvailability = async (aptId: string, start: Date, end: Date): Promise<boolean> => {
      const conflictingBookings = await BookingModel.find({
        apartmentId: aptId,
        status: 'confirmed', // <-- MODIFICA CHIAVE: Solo 'confirmed' blocca
        $or: [
          // Logica di overlap:
          // Prenotazione esistente inizia prima che la nuova finisca E finisce dopo che la nuova inizia
          { checkIn: { $lt: end }, checkOut: { $gt: start } }
        ]
      });
      return conflictingBookings.length === 0; // True se non ci sono conflitti confermati
    };

    // Per prenotazione singola
    if (apartmentId && !isGroupBooking) {
      const apartment = await ApartmentModel.findById(apartmentId);
      if (!apartment) {
        return NextResponse.json({ error: 'Appartamento non trovato' }, { status: 404 });
      }

      // Verifica disponibilità (contro prenotazioni CONFERMATE)
      const isAvailable = await checkAvailability(apartmentId, startDate, endDate);
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'L\'appartamento non è più disponibile per le date selezionate (già confermato da altra prenotazione)' },
          { status: 409 } // 409 Conflict
        );
      }

      // Calcola prezzo totale (usa la tua logica se più complessa)
      const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalPrice = apartment.price * nights;

      // Crea la prenotazione IN STATO PENDING (Richiesta)
      const booking = await BookingModel.create({
        apartmentId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn: startDate,
        checkOut: endDate,
        totalPrice,
        numberOfGuests,
        status: 'pending', // Stato iniziale
        paymentStatus: 'pending',
        source: 'direct',
        notes
      });

      return NextResponse.json({
        success: true,
        booking // Ritorna la prenotazione 'pending' creata (utile per l'ID)
      }, { status: 201 });
    }

    // Per prenotazione di gruppo
    if (isGroupBooking && groupApartments && groupApartments.length > 0) {
      if (!profile.allowGroupBooking) {
        return NextResponse.json({ error: 'Le prenotazioni di gruppo non sono abilitate' }, { status: 403 });
      }

      const bookingsToCreate = [];
      let totalGroupPrice = 0;
      const apartmentDetails: { [key: string]: any } = {}; // Cache per dettagli appartamento

      for (const aptId of groupApartments) {
        let apartment = apartmentDetails[aptId];
        if (!apartment) {
             apartment = await ApartmentModel.findById(aptId);
             if (!apartment) {
                 return NextResponse.json({ error: `Appartamento ${aptId} non trovato` }, { status: 404 });
             }
             apartmentDetails[aptId] = apartment;
        }


        // Verifica disponibilità (contro prenotazioni CONFERMATE)
        const isAvailable = await checkAvailability(aptId, startDate, endDate);
        if (!isAvailable) {
          return NextResponse.json({
            error: `L'appartamento ${apartment.name} non è più disponibile per le date selezionate (già confermato)`,
            apartmentId: aptId
          }, { status: 409 }); // 409 Conflict
        }

        const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const priceForApartment = apartment.price * nights; // Semplificato
        totalGroupPrice += priceForApartment;

        bookingsToCreate.push({
          apartmentId: aptId,
          guestName,
          guestEmail,
          guestPhone,
          checkIn: startDate,
          checkOut: endDate,
          totalPrice: priceForApartment,
          numberOfGuests, // Rivedi se questo deve essere diviso o diverso per apt
          status: 'pending', // Stato iniziale
          paymentStatus: 'pending',
          source: 'direct',
          notes: `${notes ? notes + ' - ' : ''}Parte di prenotazione di gruppo`
        });
      }

      // Crea tutte le prenotazioni PENDING per il gruppo
      const createdBookings = await BookingModel.insertMany(bookingsToCreate);

      return NextResponse.json({
        success: true,
        bookings: createdBookings, // Ritorna le prenotazioni 'pending' create
        totalPrice: totalGroupPrice
      }, { status: 201 });
    }

    // Se nessuna logica corrisponde
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });

  } catch (error) {
    console.error('Error creating booking request:', error);
    // Gestione errori specifici Mongoose o generici
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: 'Dati della prenotazione non validi', details: error.errors }, { status: 400 });
    }
    if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json({ error: 'ID appartamento non valido' }, { status: 400 });
    }
    // Errore generico
    return NextResponse.json({ error: 'Errore interno del server durante la creazione della richiesta' }, { status: 500 });
  }
}
