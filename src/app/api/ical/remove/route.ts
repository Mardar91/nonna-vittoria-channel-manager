import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { apartmentId, source } = await req.json();
    
    if (!apartmentId || !source) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const apartment = await ApartmentModel.findById(apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }
    
    // Rimuovi l'URL iCal dall'appartamento
    apartment.icalUrls = apartment.icalUrls.filter(
      (item: { source: string }) => item.source !== source
    );
    
    await apartment.save();
    
    // Cerca le prenotazioni importate da questa fonte
    const importedBookings = await BookingModel.find({
      apartmentId,
      source: source.toLowerCase(), // Match case insensitive
      externalId: { $exists: true } // Assicurati di eliminare solo prenotazioni importate
    });
    
    // Elimina le prenotazioni importate
    if (importedBookings.length > 0) {
      await BookingModel.deleteMany({
        apartmentId,
        source: source.toLowerCase(),
        externalId: { $exists: true }
      });
    }
    
    return NextResponse.json({
      success: true,
      deletedBookings: importedBookings.length,
      message: `Successfully removed iCal feed from ${source} and deleted ${importedBookings.length} imported bookings`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
