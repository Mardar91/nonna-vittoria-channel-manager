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
    email = email.trim().toLowerCase();
    bookingReference = bookingReference.trim(); // Trim, but don't lowercase if external IDs can be case-sensitive

    let booking = null;

    // Attempt 1: Search by _id prefix (if bookingReference looks like a MongoDB ID prefix)
    if (/^[a-f0-9]{6,24}$/i.test(bookingReference)) { // Check for hex and typical mongo ID prefix length
      booking = await BookingModel.findOne({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: `^${bookingReference}`,
            options: "i"
          }
        },
        guestEmail: email, // Email must match for this search
        status: 'confirmed',
      });
    }

    // Attempt 2: If not found by _id prefix, try by externalId
    if (!booking) {
      const externalBooking = await BookingModel.findOne({
        // Use case-insensitive regex for externalId.
        // Anchor with ^ and $ to ensure the whole string matches.
        externalId: { $regex: new RegExp(`^${bookingReference}$`, 'i') },
        status: 'confirmed',
        // No email constraint here initially
      });

      if (externalBooking) {
        booking = externalBooking;
        // Update guestEmail on the booking object if the provided one is different.
        // This change is not saved to DB here, but reflected in the response.
        // Actual save should occur upon final check-in submission.
        if (booking.guestEmail.toLowerCase() !== email) {
          booking.guestEmail = email; 
        }
      }
    }
    
    if (!booking) {
      console.log(`Validazione fallita per: ref: '${bookingReference}', email: '${email}'. Non trovata né come ID interno né come externalId.`);
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
        guestEmail: booking.guestEmail, // Ensure updated email is included
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
