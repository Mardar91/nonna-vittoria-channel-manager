// src/app/api/checkin/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking'; // Importa IBooking
import ApartmentModel from '@/models/Apartment';
import CheckInModel from '@/models/CheckIn';
import { BookingValidationRequest, BookingValidationResponse } from '@/types/checkin';

// Funzione helper per cercare di estrarre un codice Airbnb da una stringa
// Questa funzione non è usata direttamente nella query MongoDB ma può essere utile per logica futura
function extractAirbnbCodeFromString(text?: string): string | null {
  if (!text) return null;
  // Regex per cercare un codice alfanumerico maiuscolo dopo specifici segmenti URL di Airbnb
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
    const rawBookingReference = bookingReference.trim(); // Manteniamo l'originale per il log e la ricerca _id
    
    let booking: IBooking | null = null; 
    let searchStrategyInfo = "Nessuna strategia applicabile";

    // --- Inizio Logica di Ricerca Biforcata ---

    // Strategia 1: Prova a cercare come codice Airbnb
    // I codici Airbnb sono tipicamente alfanumerici, lunghezza 8-12, spesso con lettere non-hex.
    const potentialAirbnbCode = rawBookingReference.toUpperCase(); // Normalizza per il confronto e regex
    const isTypicalAirbnbFormat = /^[A-Z0-9]{8,12}$/.test(potentialAirbnbCode);
    const containsNonHexChars = /[G-Z]/i.test(potentialAirbnbCode); // Controlla se ci sono lettere G-Z

    if (isTypicalAirbnbFormat || containsNonHexChars) { // Diamo priorità se il formato è tipico Airbnb o contiene lettere non-hex
      searchStrategyInfo = `Tentativo ricerca Airbnb con codice: ${potentialAirbnbCode}`;
      // Regex per trovare il codice specifico all'interno dell'URL nelle note
      // (?:...) è un gruppo non catturante.
      // Assicurati che il codice sia seguito da un delimitatore come /, ?, #, o fine stringa/spazio.
      const airbnbNoteRegex = new RegExp(
        `airbnb\\.com\\/(?:hosting\\/reservations\\/details|reservation\\/itinerary)\\/(${potentialAirbnbCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(\\/|\\?|#|\\s|$)`, 
        "i"
      );
      
      booking = await BookingModel.findOne({
        source: 'airbnb',
        guestEmail: email,
        notes: { $regex: airbnbNoteRegex },
        status: 'confirmed',
        // paymentStatus: 'paid' // Riconsidera questa condizione se necessario
      }).lean<IBooking>();

      if (booking) {
        searchStrategyInfo = `Trovato con Airbnb (codice nelle note): ${potentialAirbnbCode}`;
      } else {
        searchStrategyInfo = `Non trovato con Airbnb (codice nelle note): ${potentialAirbnbCode}`;
      }
    }

    // Strategia 2: Se non trovato come Airbnb, o se il formato non era chiaramente Airbnb, prova come porzione di _id
    if (!booking) {
      const referenceForObjectIdSearch = rawBookingReference.toLowerCase(); // Per _id, case-insensitive è gestito da 'i' nella regex
      // Valido formato esadecimale per ricerca _id (almeno 6 caratteri)
      if (/^[a-f0-9]{6,24}$/i.test(referenceForObjectIdSearch)) {
        const oldSearchStrategy = searchStrategyInfo;
        searchStrategyInfo = `${oldSearchStrategy} / Tentativo ricerca _id parziale: ${referenceForObjectIdSearch}`;
        
        booking = await BookingModel.findOne({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: `^${referenceForObjectIdSearch}`, // Ricerca all'inizio
              options: "i"
            }
          },
          guestEmail: email,
          status: 'confirmed',
          // paymentStatus: 'paid' // Riconsidera
          // Non filtriamo per source qui, così da poter trovare anche prenotazioni dirette/booking.com
          // o Airbnb che non sono state trovate tramite il codice nelle note (fallback).
        }).lean<IBooking>();

        if (booking) {
          searchStrategyInfo = `Trovato con _id parziale: ${referenceForObjectIdSearch}`;
        } else {
           searchStrategyInfo = `${oldSearchStrategy} / Non trovato con _id parziale: ${referenceForObjectIdSearch}`;
        }

      } else if (!isTypicalAirbnbFormat && !containsNonHexChars) { 
        // Se non era tipico Airbnb e non è neanche un formato esadecimale valido per la ricerca _id parziale
        searchStrategyInfo = `Formato non valido per ricerca Airbnb o _id: ${rawBookingReference}`;
      }
    }
    // --- Fine Logica di Ricerca Biforcata ---
    
    if (!booking) {
      console.log(`Validazione Check-in Fallita. Dati: ref='${rawBookingReference}', email='${email}'. Log strategia: ${searchStrategyInfo}`);
      return NextResponse.json({
        valid: false,
        error: 'Prenotazione non trovata o non valida. Controlla i dati inseriti e il formato del numero di prenotazione.'
      } as BookingValidationResponse, { status: 404 });
    }
    
    // --- Il resto della logica rimane per lo più uguale ---
    // Assicurati che booking._id sia una stringa o convertilo
    const bookingObjectId = typeof booking._id === 'string' ? booking._id : booking._id?.toString();
    if (!bookingObjectId) {
        // Questo non dovrebbe accadere se il booking è stato trovato
        console.error("Booking ID mancante dopo aver trovato la prenotazione.");
        return NextResponse.json({ valid: false, error: 'Errore interno: ID prenotazione mancante.' }, { status: 500 });
    }

    const existingCheckIn = await CheckInModel.findOne({
      bookingId: bookingObjectId, // Usa l'ID della prenotazione trovata
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
    const checkInDate = new Date(booking.checkIn); // booking.checkIn dovrebbe essere una Date
    checkInDate.setHours(0, 0, 0, 0);

    const sevenDaysBefore = new Date(checkInDate);
    sevenDaysBefore.setDate(checkInDate.getDate() - 7);

    const oneDayAfter = new Date(checkInDate);
    oneDayAfter.setDate(checkInDate.getDate() + 1); // Permetti check-in fino al giorno dopo l'arrivo incluso

    if (today < sevenDaysBefore || today > oneDayAfter) {
      const formattedCheckInDate = checkInDate.toLocaleDateString('it-IT');
      const formattedSevenDaysBefore = sevenDaysBefore.toLocaleDateString('it-IT');
      const formattedOneDayAfter = oneDayAfter.toLocaleDateString('it-IT');
      return NextResponse.json({
        valid: false,
        error: `Il check-in online per questa prenotazione (arrivo ${formattedCheckInDate}) è disponibile dal ${formattedSevenDaysBefore} al ${formattedOneDayAfter}.`
      } as BookingValidationResponse, { status: 400 });
    }
    
    const apartment = await ApartmentModel.findById(booking.apartmentId).lean(); // Aggiunto .lean()
    
    // L'oggetto `booking` restituito qui è quello che viene salvato in sessionStorage
    // e usato da `/checkin/form/page.tsx`.
    return NextResponse.json({
      valid: true,
      booking: {
        id: bookingObjectId,
        apartmentId: String(booking.apartmentId), // Assicura sia stringa
        apartmentName: apartment?.name || 'Appartamento',
        guestName: booking.guestName,
        checkIn: typeof booking.checkIn === 'string' ? booking.checkIn : booking.checkIn.toISOString(),
        checkOut: typeof booking.checkOut === 'string' ? booking.checkOut : booking.checkOut.toISOString(),
        numberOfGuests: booking.numberOfGuests,
        hasCheckedIn: !!existingCheckIn, // True se esiste un checkin, indipendentemente dallo stato per questa logica
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
