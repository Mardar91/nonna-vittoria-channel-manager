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
    const { bookingReference, email } = body;
    
    if (!bookingReference || !email) {
      return NextResponse.json({
        valid: false,
        error: 'Numero prenotazione e email sono obbligatori'
      } as BookingValidationResponse, { status: 400 });
    }
    
    // Cerca la prenotazione usando l'ID (ultime 8 cifre) e l'email
    const bookingId = bookingReference.length > 8 ? bookingReference : bookingReference.padStart(24, '0');
    
    const booking = await BookingModel.findOne({
      _id: new RegExp(bookingReference + '$', 'i'),
      guestEmail: email.toLowerCase(),
      status: 'confirmed',
      paymentStatus: 'paid'
    });
    
    if (!booking) {
      return NextResponse.json({
        valid: false,
        error: 'Prenotazione non trovata o non valida per il check-in'
      } as BookingValidationResponse, { status: 404 });
    }
    
    // Verifica che il check-in non sia già stato fatto
    const existingCheckIn = await CheckInModel.findOne({
      bookingId: booking._id,
      status: 'completed'
    });
    
    if (existingCheckIn) {
      return NextResponse.json({
        valid: false,
        error: 'Il check-in per questa prenotazione è già stato completato'
      } as BookingValidationResponse, { status: 400 });
    }
    
    // Verifica che la data di check-in sia vicina (entro 7 giorni prima o dopo)
    const today = new Date();
    const checkInDate = new Date(booking.checkIn);
    const daysDifference = Math.floor((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 7 || daysDifference < -7) {
      return NextResponse.json({
        valid: false,
        error: 'Il check-in online è disponibile solo nei 7 giorni prima o dopo la data di arrivo'
      } as BookingValidationResponse, { status: 400 });
    }
    
    // Ottieni i dettagli dell'appartamento
    const apartment = await ApartmentModel.findById(booking.apartmentId);
    
    return NextResponse.json({
      valid: true,
      booking: {
        id: booking._id.toString(),
        apartmentId: booking.apartmentId,
        apartmentName: apartment?.name || 'Appartamento',
        guestName: booking.guestName,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        numberOfGuests: booking.numberOfGuests,
        hasCheckedIn: booking.hasCheckedIn || false
      }
    } as BookingValidationResponse);
    
  } catch (error) {
    console.error('Error validating booking:', error);
    return NextResponse.json({
      valid: false,
      error: 'Errore nella validazione della prenotazione'
    } as BookingValidationResponse, { status: 500 });
  }
}
