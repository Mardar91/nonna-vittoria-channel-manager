import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel, { ICheckIn, IGuest } from '@/models/CheckIn';
import BookingModel, { IBooking } from '@/models/Booking';
import ApartmentModel, { IApartment } from '@/models/Apartment';
import mongoose from 'mongoose';

// GET: Ottenere tutti i check-ins con informazioni correlate
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
    
    // Parametri di query opzionali
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    // Costruisci la query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    
    // Ottieni i check-ins
    const checkIns = await CheckInModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as ICheckIn[];
    
    // Ottieni gli ID unici per booking e apartment
    const validBookingIds = Array.from(
      new Set(
        checkIns
          .map(c => c.bookingId)
          .filter(id => id != null && mongoose.Types.ObjectId.isValid(String(id)))
          .map(id => String(id))
      )
    );
    
    const validApartmentIds = Array.from(
      new Set(
        checkIns
          .map(c => c.apartmentId)
          .filter(id => id != null && mongoose.Types.ObjectId.isValid(String(id)))
          .map(id => String(id))
      )
    );
    
    // Carica booking e apartment in batch
    const [bookings, apartments] = await Promise.all([
      BookingModel.find({ _id: { $in: validBookingIds } }).lean() as unknown as IBooking[],
      ApartmentModel.find({ _id: { $in: validApartmentIds } }).lean() as unknown as IApartment[]
    ]);
    
    // Crea mappe per lookup rapido
    const bookingMap = new Map(bookings.map((b: IBooking) => [String(b._id), b]));
    const apartmentMap = new Map(apartments.map((a: IApartment) => [String(a._id), a]));
    
    // Formatta i dati per il frontend
    const formattedCheckIns = checkIns.map((checkIn: ICheckIn) => {
      const booking = checkIn.bookingId ? bookingMap.get(String(checkIn.bookingId)) : null;
      const apartment = checkIn.apartmentId ? apartmentMap.get(String(checkIn.apartmentId)) : null;
      
      // Trova l'ospite principale
      const mainGuest = checkIn.guests.find((g: IGuest) => g.isMainGuest);
      
      return {
        id: String(checkIn._id),
        bookingId: checkIn.bookingId ? String(checkIn.bookingId) : null,
        apartmentName: apartment?.name || (checkIn.status === 'pending_assignment' ? 'Da Assegnare' : 'Sconosciuto'),
        mainGuestName: mainGuest ? `${mainGuest.firstName} ${mainGuest.lastName}` : 'N/A',
        guestCount: checkIn.guests.length,
        checkInDate: checkIn.checkInDate,
        completedAt: checkIn.completedAt,
        completedBy: checkIn.completedBy,
        status: checkIn.status || 'completed',
        bookingCheckIn: booking?.checkIn,
        bookingCheckOut: booking?.checkOut,
        requestedCheckIn: checkIn.requestedCheckIn,
        requestedCheckOut: checkIn.requestedCheckOut,
        notes: checkIn.notes,
        createdAt: checkIn.createdAt,
        updatedAt: checkIn.updatedAt
      };
    });
    
    return NextResponse.json(formattedCheckIns);
    
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Creare un nuovo check-in (per check-in manuali)
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
    
    const data = await req.json();
    
    // Validazione base
    if (!data.guests || data.guests.length === 0) {
      return NextResponse.json(
        { error: 'Almeno un ospite è richiesto' },
        { status: 400 }
      );
    }
    
    // Verifica che ci sia un ospite principale
    const hasMainGuest = data.guests.some((g: any) => g.isMainGuest);
    if (!hasMainGuest) {
      return NextResponse.json(
        { error: 'Un ospite principale è richiesto' },
        { status: 400 }
      );
    }
    
    // Se è un check-in normale, verifica booking e apartment
    if (data.status !== 'pending_assignment') {
      if (!data.bookingId || !data.apartmentId) {
        return NextResponse.json(
          { error: 'BookingId e ApartmentId sono richiesti per check-in normali' },
          { status: 400 }
        );
      }
      
      // Verifica che la prenotazione esista
      const booking = await BookingModel.findById(data.bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: 'Prenotazione non trovata' },
          { status: 404 }
        );
      }
      
      // Verifica che non ci sia già un check-in completato
      const existingCheckIn = await CheckInModel.findOne({
        bookingId: data.bookingId,
        status: 'completed'
      });
      
      if (existingCheckIn) {
        return NextResponse.json(
          { error: 'Esiste già un check-in completato per questa prenotazione' },
          { status: 400 }
        );
      }
    }
    
    // Crea il check-in
    const checkIn = new CheckInModel({
      ...data,
      completedBy: session.user?.email || 'manual',
      completedAt: data.status === 'completed' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await checkIn.save();
    
    // Se è un check-in completato, aggiorna la prenotazione
    if (data.status === 'completed' && data.bookingId) {
      await BookingModel.findByIdAndUpdate(data.bookingId, {
        hasCheckedIn: true
      });
    }
    
    return NextResponse.json({
      success: true,
      checkIn: {
        id: checkIn._id,
        ...checkIn.toObject()
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating check-in:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
