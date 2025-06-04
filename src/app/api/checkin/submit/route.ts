import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking';
import CheckInModel from '@/models/CheckIn';
import { IGuestData, CheckInSubmitRequest, CheckInSubmitResponse } from '@/types/checkin';
import { generateAccessCode, findActiveBookingByAccessCode } from '@/lib/accessCodeUtils';
import { createCheckInNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body: CheckInSubmitRequest = await req.json();
    const { 
      mode, 
      guests: submittedGuests,
      acceptTerms, 
      notes,
      requestedCheckIn, 
      requestedCheckOut, 
      originalEmail, 
      originalBookingRef,
      numberOfGuests: submittedNumberOfGuests,
      bookingId, 
      apartmentId,
      identificationEmail,
      expectedArrivalTime // <-- Added expectedArrivalTime
    } = body;

    if (!acceptTerms) {
      return NextResponse.json({
        success: false,
        error: 'Termini e condizioni non accettati.'
      } as CheckInSubmitResponse, { status: 400 });
    }

    if (!submittedGuests || submittedGuests.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Dati degli ospiti mancanti.'
      } as CheckInSubmitResponse, { status: 400 });
    }

    const mainGuestData = submittedGuests.find(g => g.isMainGuest === true); 
    if (!mainGuestData) {
      return NextResponse.json({
        success: false,
        error: 'Ospite principale non specificato.'
      } as CheckInSubmitResponse, { status: 400 });
    }

    // Common guest processing
    const processedGuests = submittedGuests.map(guest => ({
      ...guest,
      dateOfBirth: new Date(guest.dateOfBirth),
    }));

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (mode === 'unassigned_checkin') {
      if (!requestedCheckIn || !requestedCheckOut || !originalEmail || !originalBookingRef) {
        return NextResponse.json({
          success: false,
          error: 'Dati mancanti per check-in da assegnare (date, email originale, riferimento originale).'
        } as CheckInSubmitResponse, { status: 400 });
      }

      const checkInNotes = `Check-in da smistare. Riferimento originale: ${originalBookingRef}, Email originale: ${originalEmail}. ${notes ? `Note aggiuntive: ${notes}` : ''}`;
      
      const newCheckIn = new CheckInModel({
        guests: processedGuests,
        status: 'pending_assignment',
        checkInDate: new Date(requestedCheckIn),
        requestedCheckIn: new Date(requestedCheckIn),
        requestedCheckOut: new Date(requestedCheckOut),
        notes: checkInNotes,
        ipAddress,
        userAgent,
        completedBy: 'guest',
        completedAt: new Date(),
      });

      await newCheckIn.save();
      
      // Crea notifica per check-in da assegnare
      const mainGuestFullName = `${mainGuestData.firstName} ${mainGuestData.lastName}`;
      await createCheckInNotification(
        newCheckIn,
        mainGuestFullName,
        undefined // Nessun appartamento ancora assegnato
      );
      
      return NextResponse.json({
        success: true,
        checkInId: newCheckIn._id.toString(),
        message: 'Richiesta di check-in ricevuta. Sarà processata a breve.'
      } as CheckInSubmitResponse);

    } else if (mode === 'normal') {
      if (!bookingId || !apartmentId) {
        return NextResponse.json({
          success: false,
          error: 'ID Prenotazione o ID Appartamento mancanti per check-in normale.'
        } as CheckInSubmitResponse, { status: 400 });
      }

      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        return NextResponse.json({
          success: false,
          error: 'Prenotazione non trovata.'
        } as CheckInSubmitResponse, { status: 404 });
      }

      const existingCompletedCheckIn = await CheckInModel.findOne({
        bookingId: booking._id.toString(),
        status: 'completed'
      });
      
      if (existingCompletedCheckIn) {
        return NextResponse.json({
          success: false,
          error: 'Il check-in per questa prenotazione è già stato completato.'
        } as CheckInSubmitResponse, { status: 400 });
      }
      
      if (booking.source !== 'direct' &&
          typeof submittedNumberOfGuests === 'number' &&
          submittedNumberOfGuests > 0 &&
          booking.numberOfGuests !== submittedNumberOfGuests) {
        
        if (submittedGuests.length === submittedNumberOfGuests) {
            booking.numberOfGuests = submittedNumberOfGuests;
            console.log(`Updated numberOfGuests for booking ${booking._id} to ${submittedNumberOfGuests}`);
        } else {
            console.warn(`Discrepancy in submitted guest count for booking ${booking._id}: payload says ${submittedNumberOfGuests}, guest list has ${submittedGuests.length}. Not updating numberOfGuests.`);
        }
      }

      // Prepare expectedArrivalTimeAsDate
      let expectedArrivalTimeAsDate: Date | undefined = undefined;
      if (expectedArrivalTime && typeof expectedArrivalTime === 'string' && /^[0-9]{2}:[0-9]{2}$/.test(expectedArrivalTime)) {
        try {
          const [hours, minutes] = expectedArrivalTime.split(':').map(Number);
          // Ensure booking.checkIn is a valid date before using it
          const baseDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
          if (!isNaN(baseDate.getTime())) {
            baseDate.setHours(hours, minutes, 0, 0); // Imposta ora e minuti
            expectedArrivalTimeAsDate = baseDate;
          } else {
            console.warn(`Invalid booking.checkIn date for booking ${booking._id} when processing expectedArrivalTime. Current booking.checkIn: ${booking.checkIn}`);
            // Fallback: use current date with the provided time if booking.checkIn is invalid/missing
            const fallbackDate = new Date();
            fallbackDate.setHours(hours, minutes, 0, 0);
            expectedArrivalTimeAsDate = fallbackDate;
            console.warn(`Using fallback date for expectedArrivalTime: ${expectedArrivalTimeAsDate}`);
          }
        } catch (e) {
          console.error(`Error parsing expectedArrivalTime string "${expectedArrivalTime}" for booking ${booking._id}:`, e);
        }
      }

      // 1. Create and Save NewCheckIn first to get its ID
      const newCheckIn = new CheckInModel({
        bookingId: booking._id.toString(),
        apartmentId: booking.apartmentId.toString(),
        guests: processedGuests,
        status: 'completed',
        checkInDate: new Date(booking.checkIn), // This is the start of the day of the booking's checkIn
        expectedArrivalTime: expectedArrivalTimeAsDate, // <-- Assigned here
        notes: notes, // notes from the request body
        ipAddress,
        userAgent,
        completedBy: 'guest',
        completedAt: new Date(),
      });
      await newCheckIn.save();

      // 2. Now update the booking with all necessary information
      const mainGuestFullName = `${mainGuestData.firstName} ${mainGuestData.lastName}`;
      booking.guestName = mainGuestFullName;

      if (identificationEmail && identificationEmail.trim() !== "") {
        if (booking.guestEmail !== identificationEmail) {
          booking.guestEmail = identificationEmail;
        }
      } else {
        // It's a normal check-in, guestEmail on booking should be reliable.
        // If identificationEmail is missing, we don't update booking.guestEmail.
        // console.warn(`Online check-in for booking ID ${booking._id} without a new identificationEmail. Booking email not updated from form.`);
      }
      
      const updateNote = `Dati aggiornati dopo check-in online: ${mainGuestFullName}`;
      booking.notes = booking.notes ? `${booking.notes}\n${updateNote}` : updateNote;
      booking.hasCheckedIn = true;
      booking.completedCheckInId = newCheckIn._id.toString(); // Assign the ID of the completed check-in

      // Access Code Generation Logic
      let uniqueAccessCode: string | null = null;
      const MAX_CODE_GENERATION_ATTEMPTS = 10;
      for (let i = 0; i < MAX_CODE_GENERATION_ATTEMPTS; i++) {
        const potentialCode = generateAccessCode();
        const conflictingBooking = await findActiveBookingByAccessCode(potentialCode) as IBooking | null;
        if (!conflictingBooking) {
          uniqueAccessCode = potentialCode;
          break;
        }
      }

      if (uniqueAccessCode) {
        booking.accessCode = uniqueAccessCode;
      } else {
        console.error(`CRITICAL: Failed to generate a unique access code for booking ${booking._id} after ${MAX_CODE_GENERATION_ATTEMPTS} attempts.`);
        // For now, the check-in will proceed without an access code if not generated.
      }

      await booking.save(); // Salva tutti gli aggiornamenti della prenotazione
      
      // La creazione e il salvataggio di newCheckIn sono già stati fatti sopra.
      // Il blocco duplicato che era qui è stato rimosso.

      // Crea notifica per check-in completato
      // newCheckIn si riferisce all'istanza creata e salvata precedentemente (intorno alla riga 141)
      await createCheckInNotification(
        newCheckIn,
        mainGuestFullName,
        booking.apartmentId.toString()
      );
      
      return NextResponse.json({
        success: true,
        checkInId: newCheckIn._id.toString(),
        message: 'Check-in completato con successo!',
        redirectUrl: '/checkin/success' 
      } as CheckInSubmitResponse);

    } else {
      return NextResponse.json({
        success: false,
        error: 'Modalità di check-in non valida.'
      } as CheckInSubmitResponse, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error submitting check-in:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({
      success: false,
      error: `Errore nel salvataggio del check-in: ${errorMessage}`
    } as CheckInSubmitResponse, { status: 500 });
  }
}
