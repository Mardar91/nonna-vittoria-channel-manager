// src/app/api/checkin/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import CheckInModel from '@/models/CheckIn';
import { BookingValidationRequest, BookingValidationResponse } from '@/types/checkin';
// Non serve mongoose qui se non usiamo più mongoose.Types.ObjectId.isValid() per la reference iniziale

// Funzione helper per cercare di estrarre un codice Airbnb da una stringa
function extractAirbnbCodeFromString(text?: string): string | null {
  if (!text) return null;
  const match = text.match(/airbnb\.com\/(?:hosting\/reservations\/details|reservation\/itinerary)\/([A-Z0-9]{8,12})/i);
  return match && match[1] ? match[1].toUpperCase() : null;
}


export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body: BookingValidationRequest = await req.json();
    let { bookingReference, email } = body;
    
    if (!bookingReference || !email) {
      return NextResponse.json({
        valid: false,
        error: 'Numero prenotazione e email sono obbligatori'
      } as BookingValidationResponse, { status: 400 });
    }

    email = email.trim().toLowerCase();
    const rawBookingReference = bookingReference.trim();
    
    let booking: IBooking | null = null; 
    let searchStrategyInfo = "Nessuna strategia applicabile";

    const potentialAirbnbCode = rawBookingReference.toUpperCase();
    const isTypicalAirbnbFormat = /^[A-Z0-9]{8,12}$/.test(potentialAirbnbCode);
    const containsNonHexChars = /[G-Z]/i.test(potentialAirbnbCode);

    if (isTypicalAirbnbFormat || containsNonHexChars) {
      searchStrategyInfo = `Tentativo ricerca Airbnb con codice: ${potentialAirbnbCode}`;
      const airbnbNoteRegex = new RegExp(
        `airbnb\\.com\\/(?:hosting\\/reservations\\/details|reservation\\/itinerary)\\/(${potentialAirbnbCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(\\/|\\?|#|\\s|$)`, 
        "i"
      );
      
      booking = await BookingModel.findOne({
        source: 'airbnb',
        guestEmail: email,
        notes: { $regex: airbnbNoteRegex },
        status: 'confirmed',
      }).lean<IBooking | null>(); // Specificare null per chiarezza

      if (booking) {
        searchStrategyInfo = `Trovato con Airbnb (codice nelle note): ${potentialAirbnbCode}`;
      } else {
        searchStrategyInfo = `Non trovato con Airbnb (codice nelle note): ${potentialAirbnbCode}`;
      }
    }

    if (!booking) {
      const referenceForObjectIdSearch = rawBookingReference.toLowerCase();
      if (/^[a-f0-9]{6,24}$/i.test(referenceForObjectIdSearch)) {
        const oldSearchStrategy = searchStrategyInfo;
        searchStrategyInfo = `${oldSearchStrategy} / Tentativo ricerca _id parziale: ${referenceForObjectIdSearch}`;
        
        booking = await BookingModel.findOne({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: `^${referenceForObjectIdSearch}`,
              options: "i"
            }
          },
          guestEmail: email,
          status: 'confirmed',
        }).lean<IBooking | null>(); // Specificare null

        if (booking) {
          searchStrategyInfo = `Trovato con _id parziale: ${referenceForObjectIdSearch}`;
        } else {
           searchStrategyInfo = `${oldSearchStrategy} / Non trovato con _id parziale: ${referenceForObjectIdSearch}`;
        }
      } else if (!isTypicalAirbnbFormat && !containsNonHexChars) { 
        searchStrategyInfo = `Formato non valido per ricerca Airbnb o _id: ${rawBookingReference}`;
      }
    }
    
    if (!booking) {
      console.log(`Validazione Check-in Fallita. Dati: ref='${rawBookingReference}', email='${email}'. Log strategia: ${searchStrategyInfo}`);
      return NextResponse.json({
        valid: false,
        error: 'Prenotazione non trovata o non valida. Controlla i dati inseriti e il formato del numero di prenotazione.'
      } as BookingValidationResponse, { status: 404 });
    }
    
    // --- Correzione per bookingObjectId ---
    let bookingObjectId: string | undefined;

    if (booking._id) {
      if (typeof booking._id === 'string') {
        bookingObjectId = booking._id;
      } else if (booking._id && typeof (booking._id as any).toString === 'function') { 
        // Se è un ObjectId (o qualcosa con un metodo toString), convertilo
        // Usiamo 'as any' per superare il controllo di tipo se _id è solo 'string' nell'interfaccia
        // ma sappiamo che da Mongoose potrebbe essere ObjectId.
        bookingObjectId = (booking._id as any).toString();
      } else {
        console.error("Tipo di booking._id inatteso:", booking._id);
        bookingObjectId = undefined;
      }
    } else {
      console.error("Booking trovato ma booking._id è undefined.");
      bookingObjectId = undefined;
    }
    // --- Fine Correzione ---
    
    if (!bookingObjectId) {
        console.error("Booking ID non determinato dopo aver trovato la prenotazione.");
        return NextResponse.json({ valid: false, error: 'Errore interno: ID prenotazione non determinato.' }, { status: 500 });
    }

    const existingCheckIn = await CheckInModel.findOne({
      bookingId: bookingObjectId,
    });
    
    if (existingCheckIn && existingCheckIn.status === 'completed') {
      return NextResponse.json({
        valid: false,
        error: 'Il check-in per questa prenotazione è già stato completato.'
      } as BookingValidationResponse, { status: 400 });
    }
    if (existingCheckIn && existingCheckIn.status === 'pending') {
        return NextResponse.json({
          valid: false,
          error: 'Un processo di check-in per questa prenotazione è già in corso.'
        } as BookingValidationResponse, { status: 400 });
      }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Assicurati che booking.checkIn sia una Date. .lean() dovrebbe restituire stringhe ISO per le date.
    const checkInDate = new Date(booking.checkIn); 
    checkInDate.setHours(0, 0, 0, 0);

    const sevenDaysBefore = new Date(checkInDate);
    sevenDaysBefore.setDate(checkInDate.getDate() - 7);

    const oneDayAfter = new Date(checkInDate);
    oneDayAfter.setDate(checkInDate.getDate() + 1);

    if (today < sevenDaysBefore || today > oneDayAfter) {
      const formattedCheckInDate = checkInDate.toLocaleDateString('it-IT');
      const formattedSevenDaysBefore = sevenDaysBefore.toLocaleDateString('it-IT');
      const formattedOneDayAfter = oneDayAfter.toLocaleDateString('it-IT');
      return NextResponse.json({
        valid: false,
        error: `Il check-in online per questa prenotazione (arrivo ${formattedCheckInDate}) è disponibile dal ${formattedSevenDaysBefore} al ${formattedOneDayAfter}.`
      } as BookingValidationResponse, { status: 400 });
    }
    
    const apartment = await ApartmentModel.findById(booking.apartmentId).lean();
    
    return NextResponse.json({
      valid: true,
      booking: {
        id: bookingObjectId,
        apartmentId: String(booking.apartmentId),
        apartmentName: apartment?.name || 'Appartamento',
        guestName: booking.guestName,
        checkIn: (typeof booking.checkIn === 'string' ? booking.checkIn : new Date(booking.checkIn).toISOString()),
        checkOut: (typeof booking.checkOut === 'string' ? booking.checkOut : new Date(booking.checkOut).toISOString()),
        numberOfGuests: booking.numberOfGuests,
        hasCheckedIn: !!existingCheckIn,
      }
    } as BookingValidationResponse);
    
  } catch (error) {
    console.error('Error validating booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore interno del server';
    return NextResponse.json({
      valid: false,
      error: `Errore server durante la validazione: ${errorMessage}`, 
    } as BookingValidationResponse, { status: 500 });
  }
}
