import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import CheckInModel from '@/models/CheckIn';
import { CheckInSubmitRequest, CheckInSubmitResponse } from '@/types/checkin';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body: CheckInSubmitRequest = await req.json();
    const { bookingId, guests } = body;
    
    if (!bookingId || !guests || guests.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Dati mancanti'
      } as CheckInSubmitResponse, { status: 400 });
    }
    
    // Verifica che ci sia almeno un ospite principale
    const mainGuest = guests.find(g => g.isMainGuest);
    if (!mainGuest) {
      return NextResponse.json({
        success: false,
        error: 'Deve esserci almeno un ospite principale'
      } as CheckInSubmitResponse, { status: 400 });
    }
    
    // Verifica che la prenotazione esista
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Prenotazione non trovata'
      } as CheckInSubmitResponse, { status: 404 });
    }
    
    // Verifica che non ci sia già un check-in completato
    const existingCheckIn = await CheckInModel.findOne({
      bookingId: booking._id,
      status: 'completed'
    });
    
    if (existingCheckIn) {
      return NextResponse.json({
        success: false,
        error: 'Il check-in è già stato completato'
      } as CheckInSubmitResponse, { status: 400 });
    }
    
    // Ottieni informazioni sulla richiesta
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
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
      completedBy: 'guest',
      ipAddress,
      userAgent
    });
    
    await checkIn.save();
    
    // Aggiorna la prenotazione
    booking.hasCheckedIn = true;
    booking.checkInDate = new Date();
    await booking.save();
    
    return NextResponse.json({
      success: true,
      checkInId: checkIn._id.toString(),
      message: 'Check-in completato con successo'
    } as CheckInSubmitResponse);
    
  } catch (error) {
    console.error('Error submitting check-in:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel salvataggio del check-in'
    } as CheckInSubmitResponse, { status: 500 });
  }
}
