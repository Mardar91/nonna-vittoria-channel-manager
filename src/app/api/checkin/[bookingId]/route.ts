import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import mongoose from 'mongoose';

interface GuestData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | string;
  isMainGuest: boolean;
  documentType?: string;
  documentNumber?: string;
}

interface CheckInDocumentAPI {
  _id: mongoose.Types.ObjectId | string;
  bookingId: mongoose.Types.ObjectId | string;
  apartmentId: mongoose.Types.ObjectId | string;
  checkInDate: Date | string;
  guests: GuestData[];
  status: string;
  completedAt?: Date | string | null;
  completedBy?: 'guest' | string | null;
  notes?: string | null;
  updatedAt?: Date | string;
}

interface ApartmentDocumentAPI {
  _id: mongoose.Types.ObjectId | string;
  name: string;
}

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
    }).lean<CheckInDocumentAPI | null>();
    
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in non trovato o non completato' }, { status: 404 });
    }
    
    const apartment = await ApartmentModel.findById(checkIn.apartmentId).lean<ApartmentDocumentAPI | null>();
    
    return NextResponse.json({
      id: String(checkIn._id),
      bookingId: String(checkIn.bookingId),
      apartmentName: apartment?.name || 'Appartamento',
      checkInDate: checkIn.checkInDate,
      guests: checkIn.guests.map((guest: GuestData) => ({
        fullName: `${guest.firstName} ${guest.lastName}`,
        dateOfBirth: guest.dateOfBirth,
        documentInfo: guest.isMainGuest && guest.documentType && guest.documentNumber ? 
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
    ).lean<CheckInDocumentAPI | null>();
    
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in non trovato' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      checkIn: {
        id: String(checkIn._id),
        notes: checkIn.notes,
        updatedAt: checkIn.updatedAt 
      }
    });
    
  } catch (error) {
    console.error('Error updating check-in:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del check-in' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminare un check-in (solo se pending_assignment)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Se il parametro è un ID MongoDB valido, cerca per _id
    // altrimenti cerca per bookingId
    let checkIn;
    
    if (mongoose.Types.ObjectId.isValid(params.bookingId)) {
      // Prima prova a cercare per _id (per check-in da smistare che non hanno bookingId)
      checkIn = await CheckInModel.findById(params.bookingId);
      
      // Se non trovato, cerca per bookingId
      if (!checkIn) {
        checkIn = await CheckInModel.findOne({ bookingId: params.bookingId });
      }
    } else {
      // Se non è un ObjectId valido, cerca solo per bookingId
      checkIn = await CheckInModel.findOne({ bookingId: params.bookingId });
    }
    
    if (!checkIn) {
      return NextResponse.json({
        success: false,
        error: 'Check-in non trovato'
      }, { status: 404 });
    }

    // Verifica che il check-in sia eliminabile
    if (checkIn.status !== 'pending_assignment' && checkIn.status !== 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Solo i check-in da assegnare o cancellati possono essere eliminati'
      }, { status: 400 });
    }

    // Se il check-in è collegato a una prenotazione, aggiorna la prenotazione
    if (checkIn.bookingId) {
      const booking = await BookingModel.findById(checkIn.bookingId);
      if (booking) {
        const otherCheckIns = await CheckInModel.find({
          bookingId: checkIn.bookingId,
          _id: { $ne: checkIn._id },
          status: 'completed'
        });
        
        if (otherCheckIns.length === 0) {
          booking.hasCheckedIn = false;
          await booking.save();
        }
      }
    }

    // Elimina il check-in
    await CheckInModel.findByIdAndDelete(checkIn._id);

    return NextResponse.json({
      success: true,
      message: 'Check-in eliminato con successo'
    });

  } catch (error) {
    console.error('Error deleting check-in:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({
      success: false,
      error: `Errore nell'eliminazione del check-in: ${errorMessage}`
    }, { status: 500 });
  }
}
