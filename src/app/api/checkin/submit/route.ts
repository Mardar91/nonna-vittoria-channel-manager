import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import CheckInModel from '@/models/CheckIn';
import { IGuestData, CheckInSubmitRequest, CheckInSubmitResponse } from '@/types/checkin';
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
      identificationEmail
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

      // Logic to update booking with main guest's data
      const mainGuestFullName = `${mainGuestData.firstName} ${mainGuestData.lastName}`;
      booking.guestName = mainGuestFullName;

      if (identificationEmail && identificationEmail.trim() !== "") {
        if (booking.guestEmail !== identificationEmail) {
          booking.guestEmail = identificationEmail;
        }
      } else {
        console.warn(`Attempted online check-in for booking ID ${booking._id} without a valid identificationEmail. Booking email not updated.`);
      }
      
      const updateNote = `Dati aggiornati dopo check-in online: ${mainGuestFullName}`;
      booking.notes = booking.notes ? `${booking.notes}\n${updateNote}` : updateNote;

      booking.hasCheckedIn = true;
      await booking.save();

      const newCheckIn = new CheckInModel({
        bookingId: booking._id.toString(),
        apartmentId: booking.apartmentId.toString(),
        guests: processedGuests,
        status: 'completed',
        checkInDate: new Date(booking.checkIn),
        notes: notes,
        ipAddress,
        userAgent,
        completedBy: 'guest',
        completedAt: new Date(),
      });

      await newCheckIn.save();
      
      // Crea notifica per check-in completato
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
