import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import { generateICalFeed } from '@/lib/ical';

// GET: Esportazione del feed iCal per un appartamento
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Trova l'appartamento con l'ID del feed
    const apartment = await ApartmentModel.findOne({ 
      icalFeed: { $regex: new RegExp(params.id, 'i') } 
    });
    
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }
    
    // Ottieni tutte le prenotazioni confermate per questo appartamento
    const bookings = await BookingModel.find({
      apartmentId: apartment._id,
      status: { $in: ['confirmed', 'pending'] },
    });
    
    // Genera il feed iCal
    const icalFeed = generateICalFeed(apartment, bookings);
    
    // Restituisci il feed con il MIME type corretto
    return new NextResponse(icalFeed, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${apartment.name}.ics"`,
      },
    });
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
