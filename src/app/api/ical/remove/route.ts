// src/app/api/ical/remove/route.ts
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
    
    // Opzionalmente: Elimina anche le prenotazioni importate da questa fonte
    await BookingModel.deleteMany({
      apartmentId,
      source,
      externalId: { $exists: true } // Assicurati di eliminare solo prenotazioni importate
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully removed iCal feed from ${source}`,
    });
  } catch (error) {
    console.error('Error removing iCal feed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
