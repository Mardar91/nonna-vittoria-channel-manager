import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel from '@/models/Booking';

// GET: Ottenere dettagli di un check-in specifico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const checkIn = await CheckInModel.findById(params.id).lean();
    
    if (!checkIn) {
      return NextResponse.json({
        success: false,
        error: 'Check-in non trovato'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      checkIn
    });

  } catch (error) {
    console.error('Error fetching check-in:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero del check-in'
    }, { status: 500 });
  }
}

// DELETE: Eliminare un check-in
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const checkIn = await CheckInModel.findById(params.id);
    
    if (!checkIn) {
      return NextResponse.json({
        success: false,
        error: 'Check-in non trovato'
      }, { status: 404 });
    }

    // Verifica che il check-in sia eliminabile
    // Solo i check-in in stato 'pending_assignment' o 'cancelled' possono essere eliminati
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
        // Verifica se ci sono altri check-in completati per questa prenotazione
        const otherCheckIns = await CheckInModel.find({
          bookingId: checkIn.bookingId,
          _id: { $ne: checkIn._id },
          status: 'completed'
        });
        
        // Se non ci sono altri check-in completati, aggiorna hasCheckedIn
        if (otherCheckIns.length === 0) {
          booking.hasCheckedIn = false;
          await booking.save();
        }
      }
    }

    // Elimina il check-in
    await CheckInModel.findByIdAndDelete(params.id);

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

// PUT: Aggiornare un check-in
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const updateData = await req.json();
    
    const checkIn = await CheckInModel.findById(params.id);
    
    if (!checkIn) {
      return NextResponse.json({
        success: false,
        error: 'Check-in non trovato'
      }, { status: 404 });
    }

    // Aggiorna i campi consentiti
    const allowedFields = ['status', 'notes', 'bookingId', 'apartmentId', 'checkInDate'];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        checkIn[field] = updateData[field];
      }
    }

    // Se si sta aggiornando lo stato a 'completed' e c'è un bookingId, aggiorna la prenotazione
    if (updateData.status === 'completed' && checkIn.bookingId) {
      const booking = await BookingModel.findById(checkIn.bookingId);
      if (booking) {
        booking.hasCheckedIn = true;
        await booking.save();
      }
    }

    await checkIn.save();

    return NextResponse.json({
      success: true,
      message: 'Check-in aggiornato con successo',
      checkIn
    });

  } catch (error) {
    console.error('Error updating check-in:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({
      success: false,
      error: `Errore nell'aggiornamento del check-in: ${errorMessage}`
    }, { status: 500 });
  }
}
