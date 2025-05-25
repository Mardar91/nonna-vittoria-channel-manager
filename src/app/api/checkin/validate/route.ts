// src/app/api/checkin/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import CheckInModel from '@/models/CheckIn';
import { BookingValidationRequest, BookingValidationResponse } from '@/types/checkin';

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
    bookingReference = bookingReference.trim();

    // Validazione di base della lunghezza/formato del bookingReference
    // Deve essere una stringa esadecimale
    if (!/^[a-f0-9]+$/i.test(bookingReference) || bookingReference.length < 6 || bookingReference.length > 24) {
        return NextResponse.json({
            valid: false,
            error: 'Formato numero prenotazione non valido (deve essere esadecimale).'
        } as BookingValidationResponse, { status: 400 });
    }
    
    // Cerca la prenotazione usando $expr per confrontare l'inizio di _id (convertito in stringa)
    // con bookingReference, e corrisponde all'email.
    const booking = await BookingModel.findOne({
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" }, // Converte _id in stringa
          regex: `^${bookingReference}`, // La tua regex per l'inizio stringa
          options: "i" // Case-insensitive
        }
      },
      guestEmail: email,
      status: 'confirmed',
      // paymentStatus: 'paid' // Riconsidera questa condizione
    });
    
    if (!booking) {
      console.log(`Validazione fallita per: ref: '${bookingReference}', email: '${email}'. Query: $expr $regexMatch input: $toString: "$_id", regex: '^${bookingReference}', options: "i"`);
      return NextResponse.json({
        valid: false,
        error: 'Prenotazione non trovata o non valida. Controlla i dati inseriti.'
      } as BookingValidationResponse, { status: 404 });
    }
    
    // --- Il resto della logica rimane uguale ---
    const existingCheckIn = await CheckInModel.findOne({
      bookingId: booking._id,
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
        error: `Il check-in online è disponibile dal ${formattedSevenDaysBefore} al ${formattedOneDayAfter} (data arrivo: ${formattedCheckInDate}).`
      } as BookingValidationResponse, { status: 400 });
    }
    
    const apartment = await ApartmentModel.findById(booking.apartmentId);
    
    return NextResponse.json({
      valid: true,
      booking: {
        id: booking._id.toString(),
        apartmentId: String(booking.apartmentId),
        apartmentName: apartment?.name || 'Appartamento',
        guestName: booking.guestName,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
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
