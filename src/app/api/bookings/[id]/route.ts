import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking';
import { generateAccessCode, findActiveBookingByAccessCode } from '@/lib/accessCodeUtils';

// GET: Ottenere una prenotazione specifica
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
    const booking = await BookingModel.findById(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Aggiornare una prenotazione
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
    const existingBooking = await BookingModel.findById(params.id);

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const previousHasCheckedIn = existingBooking.hasCheckedIn;
    const dataToUpdate = await req.json();

    // Apply updates from dataToUpdate to existingBooking
    // Exclude _id from being updated, and potentially other sensitive fields if necessary
    for (const key in dataToUpdate) {
      if (Object.prototype.hasOwnProperty.call(dataToUpdate, key) && key !== '_id') {
        (existingBooking as any)[key] = dataToUpdate[key];
      }
    }

    // Check if check-in was just completed and no access code exists
    if (existingBooking.hasCheckedIn && !previousHasCheckedIn && !existingBooking.accessCode) {
      let uniqueAccessCode: string | null = null;
      const MAX_CODE_GENERATION_ATTEMPTS = 10;
      for (let i = 0; i < MAX_CODE_GENERATION_ATTEMPTS; i++) {
        const potentialCode = generateAccessCode();
        const conflictingBooking = await findActiveBookingByAccessCode(potentialCode) as IBooking | null;
        if (!conflictingBooking) {
          uniqueAccessCode = potentialCode;
          break;
        }
      }

      if (uniqueAccessCode) {
        existingBooking.accessCode = uniqueAccessCode;
      } else {
        console.error(`CRITICAL: Failed to generate a unique access code for booking ${existingBooking._id} during manual update after ${MAX_CODE_GENERATION_ATTEMPTS} attempts.`);
        // Decide if you want to mandare una notifica o gestire questo caso in modo specifico.
        // For now, the update will proceed without an access code if not generated.
      }
    }

    const updatedBooking = await existingBooking.save();
    
    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminare una prenotazione
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
    const booking = await BookingModel.findByIdAndDelete(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
