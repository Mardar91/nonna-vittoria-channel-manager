import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import CheckInModel from '@/models/CheckIn';
import { CheckInSubmitRequest } from '@/types/checkin';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    await connectDB();
    
    const body: CheckInSubmitRequest & { notes?: string; identificationEmail?: string } = await req.json();
    const { bookingId, guests, notes, identificationEmail } = body; // Added identificationEmail here
    
    if (!bookingId || !guests || guests.length === 0) {
      return NextResponse.json({
        error: 'Dati mancanti'
      }, { status: 400 });
    }
    
    // Verifica che ci sia almeno un ospite principale
    const mainGuest = guests.find(g => g.isMainGuest);
    if (!mainGuest) {
      return NextResponse.json({
        error: 'Deve esserci almeno un ospite principale'
      }, { status: 400 });
    }
    
    // Verifica che la prenotazione esista
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return NextResponse.json({
        error: 'Prenotazione non trovata'
      }, { status: 404 });
    }
    
    // Verifica che non ci sia già un check-in completato
    const existingCheckIn = await CheckInModel.findOne({
      bookingId: booking._id,
      status: 'completed'
    });
    
    if (existingCheckIn) {
      return NextResponse.json({
        error: 'Il check-in è già stato completato'
      }, { status: 400 });
    }
    
    // Crea il record di check-in
    const checkIn = new CheckInModel({
      bookingId: booking._id,
      apartmentId: booking.apartmentId,
      checkInDate: new Date(),
      guests: guests.map(guest => ({
        lastName: guest.lastName,
        firstName: guest.firstName,
        sex: guest.sex,
        dateOfBirth: new Date(guest.dateOfBirth),
        placeOfBirth: guest.placeOfBirth,
        provinceOfBirth: guest.provinceOfBirth,
        countryOfBirth: guest.countryOfBirth,
        citizenship: guest.citizenship,
        documentType: guest.documentType,
        documentNumber: guest.documentNumber,
        documentIssuePlace: guest.documentIssuePlace,
        documentIssueProvince: guest.documentIssueProvince,
        documentIssueCountry: guest.documentIssueCountry,
        isMainGuest: guest.isMainGuest
      })),
      status: 'completed',
      completedAt: new Date(),
      completedBy: session.user?.email || 'admin',
      notes
    });
    
    await checkIn.save();
    
    // Aggiorna la prenotazione
    // mainGuest is already defined and validated earlier in the function
    if (mainGuest) {
        const mainGuestFullName = `${mainGuest.firstName} ${mainGuest.lastName}`;
        booking.guestName = mainGuestFullName;

        if (identificationEmail && typeof identificationEmail === 'string' && identificationEmail.trim() !== "") {
            if (booking.guestEmail !== identificationEmail.trim()) {
                booking.guestEmail = identificationEmail.trim();
            }
        } else {
            console.warn(`Manual check-in for booking ID ${booking._id}: identificationEmail not provided or empty. Booking email not updated.`);
        }

        const updateNote = `Dati aggiornati dopo check-in manuale: ${mainGuestFullName}`;
        booking.notes = booking.notes ? `${booking.notes}\n${updateNote}` : updateNote;
    }

    booking.hasCheckedIn = true;
    booking.checkInDate = checkIn.completedAt; // Use checkIn.completedAt for consistency
    await booking.save();
    
    return NextResponse.json({
      success: true,
      checkInId: checkIn._id.toString(),
      message: 'Check-in manuale completato con successo'
    });
    
  } catch (error) {
    console.error('Error in manual check-in:', error);
    return NextResponse.json({
      error: 'Errore nel check-in manuale'
    }, { status: 500 });
  }
}
