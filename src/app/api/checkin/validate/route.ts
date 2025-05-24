// src/app/api/checkin/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import CheckInModel from '@/models/CheckIn';
import { BookingValidationRequest, BookingValidationResponse } from '@/types/checkin';
// Non serve mongoose qui se non per Types.ObjectId.isValid, ma non lo usiamo più per il reference

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
    bookingReference = bookingReference.trim(); // Non serve toLowerCase() per il reference se usiamo regex case-insensitive

    // Validazione di base della lunghezza del bookingReference se necessario
    // (es. se ti aspetti sempre 8 caratteri)
    if (bookingReference.length < 6 || bookingReference.length > 12) { // Adatta questi limiti se necessario
        return NextResponse.json({
            valid: false,
            error: 'Formato numero prenotazione non valido.'
        } as BookingValidationResponse, { status: 400 });
    }
    
    // Cerca la prenotazione il cui _id INIZIA con bookingReference
    // e corrisponde all'email.
    // La regex '^' indica l'inizio della stringa. 'i' per case-insensitive.
    const booking = await BookingModel.findOne({
      _id: new RegExp('^' + bookingReference, 'i'), // CERCA _id CHE INIZIA CON bookingReference
      guestEmail: email,
      status: 'confirmed',
      // paymentStatus: 'paid' // Riconsidera questa condizione come discusso prima
    });
    
    if (!booking) {
      // Potrebbe essere utile loggare cosa è stato cercato se non si trova nulla
      console.log(`Validazione fallita: _id LIKE '${bookingReference}%', email: '${email}'`);
      return NextResponse.json({
        valid: false,
        error: 'Prenotazione non trovata o non valida per il check-in. Controlla i dati inseriti o lo stato della prenotazione.'
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
      error: `Errore server durante la validazione: ${errorMessage}`, // Per debugging
    } as BookingValidationResponse, { status: 500 });
  }
}
