import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import CheckInModel from '@/models/CheckIn';
import { IGuestData, CheckInSubmitRequest, CheckInSubmitResponse } from '@/types/checkin'; // Assuming IGuestData is part of types

interface ExtendedCheckInSubmitRequest extends CheckInSubmitRequest {
  mode: 'normal' | 'unassigned_checkin';
  guests: IGuestData[]; // Ensure this matches the structure from CheckInForm (mainGuest + additionalGuests combined)
  acceptTerms: boolean;
  notes?: string;
  // For 'unassigned_checkin'
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  originalEmail?: string;
  originalBookingRef?: string;
  numberOfGuests?: number; // This might be part of the main guests array or separate
  // For 'normal'
  // bookingId is already in CheckInSubmitRequest
  apartmentId?: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body: ExtendedCheckInSubmitRequest = await req.json();
    const { 
      mode, 
      guests: submittedGuests, // Renamed to avoid conflict with the processed 'guests' variable
      acceptTerms, 
      notes,
      requestedCheckIn, 
      requestedCheckOut, 
      originalEmail, 
      originalBookingRef,
      numberOfGuests: submittedNumberOfGuests, // Use the numberOfGuests from the payload
      bookingId, 
      apartmentId 
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

    const mainGuestData = submittedGuests.find(g => g.isMainGuest);
    if (!mainGuestData) {
      return NextResponse.json({
        success: false,
        error: 'Ospite principale non specificato.'
      } as CheckInSubmitResponse, { status: 400 });
    }

    // Common guest processing
    const processedGuests = submittedGuests.map(guest => ({
      ...guest,
      dateOfBirth: new Date(guest.dateOfBirth), // Convert date strings to Date objects
      // documentIssueDate: guest.documentIssueDate ? new Date(guest.documentIssueDate) : undefined, // Example if you add this
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
        checkInDate: new Date(requestedCheckIn), // Date of actual stay start
        requestedCheckIn: new Date(requestedCheckIn),
        requestedCheckOut: new Date(requestedCheckOut),
        notes: checkInNotes,
        // bookingId and apartmentId remain null/undefined
        ipAddress,
        userAgent,
        completedBy: 'guest',
        completedAt: new Date(), // Date of this submission event
      });

      await newCheckIn.save();
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
      
      // Update booking.guestEmail if mainGuest.email is provided and different
      // Assuming mainGuestData contains an 'email' field if applicable.
      // The type IGuestData should define if 'email' is part of mainGuest details.
      // For now, let's assume it's not directly part of mainGuestData for submission,
      // but was handled during validation phase. If it IS part of mainGuestData:
      // if (mainGuestData.email && mainGuestData.email.toLowerCase() !== booking.guestEmail.toLowerCase()) {
      //   booking.guestEmail = mainGuestData.email;
      // }
      // Given current structure, email update happens in validate, so we trust the email on booking object.

      // Update numberOfGuests for non-direct bookings if it has changed
      if (booking.source !== 'direct' &&
          typeof submittedNumberOfGuests === 'number' &&
          submittedNumberOfGuests > 0 &&
          booking.numberOfGuests !== submittedNumberOfGuests) {
        
        // Additional check: ensure submittedNumberOfGuests matches the actual number of guests provided
        if (submittedGuests.length === submittedNumberOfGuests) {
            booking.numberOfGuests = submittedNumberOfGuests;
            console.log(`Updated numberOfGuests for booking ${booking._id} to ${submittedNumberOfGuests}`);
        } else {
            // This case should ideally be caught by frontend validation (validator.ts)
            // but as a safeguard:
            console.warn(`Discrepancy in submitted guest count for booking ${booking._id}: payload says ${submittedNumberOfGuests}, guest list has ${submittedGuests.length}. Not updating numberOfGuests.`);
        }
      }

      booking.hasCheckedIn = true;
      // booking.checkInDate is the actual start of the stay, not new Date() here.
      // It's set at booking creation.

      await booking.save();

      const newCheckIn = new CheckInModel({
        bookingId: booking._id.toString(),
        apartmentId: booking.apartmentId.toString(),
        guests: processedGuests,
        status: 'completed',
        checkInDate: new Date(booking.checkIn), // Date of actual stay start
        notes: notes,
        ipAddress,
        userAgent,
        completedBy: 'guest',
        completedAt: new Date(), // Date of this submission event
      });

      await newCheckIn.save();
      return NextResponse.json({
        success: true,
        checkInId: newCheckIn._id.toString(),
        message: 'Check-in completato con successo!',
        redirectUrl: '/checkin/success' // Optional: can be used by client
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
