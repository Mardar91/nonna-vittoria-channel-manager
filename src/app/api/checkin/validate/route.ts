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
    
    const body: BookingValidationRequest & { requestedCheckIn?: string; requestedCheckOut?: string } = await req.json();
    let { bookingReference, email, requestedCheckIn, requestedCheckOut } = body;
    
    if (!bookingReference || !email) {
      return NextResponse.json({
        valid: false,
        error: 'Numero prenotazione e email sono obbligatori'
      } as BookingValidationResponse, { status: 400 });
    }

    email = email.trim().toLowerCase();
    bookingReference = bookingReference.trim();

    let booking: any = null; // Use 'any' for booking to allow adding guestEmail later if needed

    // Attempt 1: Search by _id prefix (if bookingReference looks like a MongoDB ID prefix)
    if (/^[a-f0-9]{6,24}$/i.test(bookingReference)) {
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
      }).lean(); // Use lean if not modifying here, but we might update email
    }

    // Attempt 2: If not found by _id prefix, try by externalId
    if (!booking) {
      const externalBooking = await BookingModel.findOne({
        externalId: { $regex: new RegExp(`^${bookingReference}$`, 'i') },
        status: 'confirmed',
      }).lean(); // Use lean if not modifying here, but we might update email

      if (externalBooking) {
        booking = { ...externalBooking }; // Clone to make it modifiable
        if (booking.guestEmail.toLowerCase() !== email) {
          booking.guestEmail = email; // Update email on the cloned object
        }
      }
    }
    
    // --- Start of new logic flow ---
    if (booking) {
      // Booking found by ID or externalId, proceed with standard validation
      const existingCheckIn = await CheckInModel.findOne({
        bookingId: booking._id.toString(),
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
          hasCheckedIn: !!existingCheckIn, // Will be false or undefined if no pending/completed
        }
      } as BookingValidationResponse);

    } else {
      // No booking found by ID or externalId
      if (!requestedCheckIn || !requestedCheckOut) {
        // Dates not provided, ask UI to request them
        console.log(`Validazione fallita per: ref: '${bookingReference}', email: '${email}'. Non trovata. Chiedere date.`);
        return NextResponse.json({
          valid: false,
          error: 'Prenotazione non trovata. Prova inserendo le date del soggiorno.',
          errorCode: 'BOOKING_NOT_FOUND_ASK_DATES'
        } as BookingValidationResponse, { status: 404 });
      }

      // Dates ARE provided, proceed with date-based search (Second Attempt)
      const startDate = new Date(requestedCheckIn);
      const endDate = new Date(requestedCheckOut);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
        return NextResponse.json({
          valid: false,
          error: 'Date di check-in o check-out non valide.'
        } as BookingValidationResponse, { status: 400 });
      }

      const potentialBookings = await BookingModel.find({
        status: 'confirmed',
        checkIn: { $gte: startDate, $lt: new Date(startDate.getTime() + 24 * 60 * 60 * 1000) },
        checkOut: { $gte: endDate, $lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000) },
      }).lean();

      if (!potentialBookings.length) {
        console.log(`Nessuna prenotazione trovata per le date: ${requestedCheckIn} - ${requestedCheckOut}`);
        return NextResponse.json({
          valid: false,
          error: 'Nessuna prenotazione trovata per le date specificate.'
        } as BookingValidationResponse, { status: 404 });
      }

      const availableBookings = [];
      for (const pBooking of potentialBookings) {
        const existingCheckIn = await CheckInModel.findOne({
          bookingId: pBooking._id.toString(),
          status: 'completed'
        });
        if (!existingCheckIn) {
          availableBookings.push(pBooking);
        }
      }

      if (!availableBookings.length) {
        console.log(`Tutte le prenotazioni per le date ${requestedCheckIn} - ${requestedCheckOut} sono già check-inate.`);
        return NextResponse.json({
          valid: false,
          error: 'Tutte le prenotazioni per le date specificate risultano già check-inate.'
        } as BookingValidationResponse, { status: 400 });
      }
      
      // At least one booking available for "unassigned check-in"
      console.log(`Trovate ${availableBookings.length} prenotazioni disponibili per le date ${requestedCheckIn} - ${requestedCheckOut}. Modalità 'unassigned_checkin'.`);
      return NextResponse.json({
        valid: true,
        mode: 'unassigned_checkin',
        requestedDates: {
          checkIn: requestedCheckIn,
          checkOut: requestedCheckOut
        },
        email: email, 
        bookingReference: bookingReference 
      } as BookingValidationResponse);
    }
    // --- End of new logic flow ---

    // The following old logic for "if (!booking)" and subsequent processing is now handled above.
    // So, it should be removed or ensured it's unreachable if the new flow is complete.
    // For safety, I am commenting out the old "if (!booking)" block and its direct aftermath,
    // as the new logic should cover all scenarios.

    /*
    if (!booking) {
      console.log(`Validazione fallita per: ref: '${bookingReference}', email: '${email}'. Non trovata né come ID interno né come externalId.`);
      return NextResponse.json({
        valid: false,
        error: 'Prenotazione non trovata o non valida. Controlla i dati inseriti.'
      } as BookingValidationResponse, { status: 404 });
    }
    */
    
    // --- Il resto della logica rimane uguale --- (This part is now inside the "if (booking)" block above)
    // The code from this point was part of the old structure and has been integrated into the new if/else flow.
    // It's effectively unreachable if the new logic is correct.
    // No further processing should happen here.
    
  } catch (error) {
    console.error('Error validating booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore interno del server';
    return NextResponse.json({
      valid: false,
      error: `Errore server durante la validazione: ${errorMessage}`, 
    } as BookingValidationResponse, { status: 500 });
  }
}
