import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel, { IBooking } from '@/models/Booking';
import ApartmentModel, { IApartment } from '@/models/Apartment';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { checkInId, bookingId } = await req.json();
    
    if (!checkInId || !bookingId) {
      return NextResponse.json({
        success: false,
        error: 'ID Check-in e ID Prenotazione sono obbligatori'
      }, { status: 400 });
    }

    // Trova il check-in
    const checkIn = await CheckInModel.findById(checkInId);
    
    if (!checkIn) {
      return NextResponse.json({
        success: false,
        error: 'Check-in non trovato'
      }, { status: 404 });
    }

    // Verifica che il check-in sia da assegnare
    if (checkIn.status !== 'pending_assignment') {
      return NextResponse.json({
        success: false,
        error: 'Questo check-in non è in attesa di assegnazione'
      }, { status: 400 });
    }

    // Trova la prenotazione
    const booking = await BookingModel.findById(bookingId);
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Prenotazione non trovata'
      }, { status: 404 });
    }

    // Verifica che la prenotazione non abbia già un check-in completato
    const existingCheckIn = await CheckInModel.findOne({
      bookingId: booking._id.toString(),
      status: 'completed',
      _id: { $ne: checkInId } // Escludi il check-in corrente
    });
    
    if (existingCheckIn) {
      return NextResponse.json({
        success: false,
        error: 'Questa prenotazione ha già un check-in completato'
      }, { status: 400 });
    }

    // Verifica la compatibilità delle date (se disponibili)
    if (checkIn.requestedCheckIn && checkIn.requestedCheckOut) {
      const requestedCheckIn = new Date(checkIn.requestedCheckIn);
      const requestedCheckOut = new Date(checkIn.requestedCheckOut);
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);
      
      // Verifica che le date siano ragionevolmente compatibili (con un margine di 1 giorno)
      const oneDay = 24 * 60 * 60 * 1000;
      const checkInDiff = Math.abs(requestedCheckIn.getTime() - bookingCheckIn.getTime());
      const checkOutDiff = Math.abs(requestedCheckOut.getTime() - bookingCheckOut.getTime());
      
      if (checkInDiff > oneDay || checkOutDiff > oneDay) {
        return NextResponse.json({
          success: false,
          error: 'Le date del check-in non corrispondono con quelle della prenotazione selezionata',
          details: {
            requestedDates: {
              checkIn: requestedCheckIn.toISOString().split('T')[0],
              checkOut: requestedCheckOut.toISOString().split('T')[0]
            },
            bookingDates: {
              checkIn: bookingCheckIn.toISOString().split('T')[0],
              checkOut: bookingCheckOut.toISOString().split('T')[0]
            }
          }
        }, { status: 400 });
      }
    }

    // Aggiorna il check-in con l'ID della prenotazione e dell'appartamento
    checkIn.bookingId = booking._id.toString();
    checkIn.apartmentId = booking.apartmentId.toString();
    checkIn.status = 'completed';
    checkIn.checkInDate = booking.checkIn;
    
    // Aggiungi una nota per tracciare l'assegnazione
    const assignmentNote = `Check-in assegnato manualmente alla prenotazione ${booking._id} il ${new Date().toLocaleString('it-IT')}`;
    checkIn.notes = checkIn.notes ? `${checkIn.notes}\n\n${assignmentNote}` : assignmentNote;
    
    await checkIn.save();

    // Aggiorna la prenotazione per indicare che il check-in è stato completato
    booking.hasCheckedIn = true;
    await booking.save();

    // Recupera i dettagli dell'appartamento per la risposta
    const apartment = await ApartmentModel.findById(booking.apartmentId);

    return NextResponse.json({
      success: true,
      message: 'Check-in assegnato con successo',
      checkIn: {
        _id: checkIn._id,
        bookingId: checkIn.bookingId,
        apartmentId: checkIn.apartmentId,
        apartmentName: apartment?.name || 'N/A',
        status: checkIn.status
      },
      booking: {
        _id: booking._id,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut
      }
    });

  } catch (error) {
    console.error('Error assigning check-in:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({
      success: false,
      error: `Errore nell'assegnazione del check-in: ${errorMessage}`
    }, { status: 500 });
  }
}

// GET: Ottenere prenotazioni disponibili per l'assegnazione
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const url = new URL(req.url);
    const checkInDate = url.searchParams.get('checkInDate');
    const checkOutDate = url.searchParams.get('checkOutDate');
    
    if (!checkInDate || !checkOutDate) {
      return NextResponse.json({
        success: false,
        error: 'Date di check-in e check-out sono obbligatorie'
      }, { status: 400 });
    }

    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    
    // Imposta le ore per confronto più preciso
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Trova tutte le prenotazioni che corrispondono approssimativamente alle date
    // con un margine di tolleranza di 1 giorno
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const bookings = await BookingModel.find({
      status: 'confirmed',
      checkIn: {
        $gte: new Date(startDate.getTime() - oneDayMs),
        $lte: new Date(startDate.getTime() + oneDayMs)
      },
      checkOut: {
        $gte: new Date(endDate.getTime() - oneDayMs),
        $lte: new Date(endDate.getTime() + oneDayMs)
      }
    }).lean() as unknown as IBooking[];

    // Per ogni prenotazione, verifica se ha già un check-in completato
    const bookingsWithCheckInStatus = await Promise.all(
      bookings.map(async (booking: IBooking) => {
        if (!booking._id) {
          console.warn(`Booking processed in GET checkin/assign API without an _id. Booking data: ${JSON.stringify(booking)}. Returning as unavailable.`);
          // Restituisci un oggetto che corrisponda alla struttura di ritorno attesa,
          // ma segnalando che non è valido o non disponibile.
          return {
            _id: booking._id || `invalid-${Date.now()}`, // Usa l'ID se esiste (improbabile qui), o genera uno temporaneo
            guestName: booking.guestName || 'N/A (Missing ID)',
            guestEmail: booking.guestEmail || 'N/A',
            checkIn: booking.checkIn || new Date(0), // Data placeholder
            checkOut: booking.checkOut || new Date(0), // Data placeholder
            apartmentId: booking.apartmentId || 'N/A',
            apartmentName: 'N/A (Booking Missing ID)',
            numberOfGuests: booking.numberOfGuests || 0,
            source: booking.source || 'N/A',
            hasExistingCheckIn: true, // Consideralo come se avesse già un check-in per escluderlo
            isAvailableForAssignment: false 
          };
        }

        // Il resto del codice originale del map callback va qui, 
        // iniziando con la dichiarazione di existingCheckIn:
        const existingCheckIn = await CheckInModel.findOne({
          bookingId: booking._id.toString(), // Ora è sicuro chiamare toString()
          status: 'completed'
        });
        
        const apartment = await ApartmentModel.findById(booking.apartmentId).lean() as unknown as IApartment | null;
        
        return {
          _id: booking._id, // Assicurati che questo sia l'ID originale
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          apartmentId: booking.apartmentId,
          apartmentName: apartment?.name || 'N/A',
          numberOfGuests: booking.numberOfGuests,
          source: booking.source,
          hasExistingCheckIn: !!existingCheckIn,
          isAvailableForAssignment: !existingCheckIn
        };
      })
    );

    // Filtra solo le prenotazioni disponibili per l'assegnazione
    const availableBookings = bookingsWithCheckInStatus.filter(b => b.isAvailableForAssignment);

    return NextResponse.json({
      success: true,
      bookings: availableBookings,
      totalFound: bookings.length,
      availableCount: availableBookings.length
    });

  } catch (error) {
    console.error('Error fetching available bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero delle prenotazioni disponibili'
    }, { status: 500 });
  }
}
