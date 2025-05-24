import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    await connectDB();
    
    const checkIn = await CheckInModel.findOne({ 
      bookingId: params.bookingId,
      status: 'completed'
    });
    
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in non trovato' }, { status: 404 });
    }
    
    // Ottieni informazioni aggiuntive
    const booking = await BookingModel.findById(params.bookingId);
    const apartment = await ApartmentModel.findById(checkIn.apartmentId);
    
    return NextResponse.json({
      id: checkIn._id.toString(),
      bookingId: checkIn.bookingId,
      apartmentName: apartment?.name || 'Appartamento',
      checkInDate: checkIn.checkInDate,
      guests: checkIn.guests.map(guest => ({
        fullName: `${guest.firstName} ${guest.lastName}`,
        dateOfBirth: guest.dateOfBirth,
        documentInfo: guest.isMainGuest ? 
          `${guest.documentType}: ${guest.documentNumber}` : undefined,
        isMainGuest: guest.isMainGuest
      })),
      status: checkIn.status,
      completedAt: checkIn.completedAt,
      completedBy: checkIn.completedBy,
      notes: checkIn.notes
    });
    
  } catch (error) {
    console.error('Error fetching check-in:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero del check-in' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    await connectDB();
    
    const body = await req.json();
    const { notes } = body;
    
    const checkIn = await CheckInModel.findOneAndUpdate(
      { bookingId: params.bookingId },
      { notes, updatedAt: new Date() },
      { new: true }
    );
    
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in non trovato' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, checkIn });
    
  } catch (error) {
    console.error('Error updating check-in:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del check-in' },
      { status: 500 }
    );
  }
}
