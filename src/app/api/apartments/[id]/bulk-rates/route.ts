import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import DailyRateModel from '@/models/DailyRate';
import { generateICalFeed } from '@/lib/ical';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';

// POST: Aggiorna o crea tariffe per un intervallo di date
export async function POST(
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

    const data = await req.json();
    
    if (!data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Genera tutte le date nell'intervallo
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const dates = [];
    
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Aggiorna o crea tariffe per tutte le date
    const operations = dates.map(date => ({
      updateOne: {
        filter: { apartmentId: params.id, date },
        update: {
          $set: {
            apartmentId: params.id,
            date,
            price: data.price,
            isBlocked: data.isBlocked,
            minStay: data.minStay,
            notes: data.notes
          }
        },
        upsert: true
      }
    }));
    
    const result = await DailyRateModel.bulkWrite(operations);
    
    // Se stiamo bloccando date, aggiorna anche il feed iCal
    if (data.isBlocked) {
      // Questo è un esempio di come potremmo aggiornare il feed iCal
      // Nella pratica, potremmo voler implementare una soluzione più complessa
      const apartment = await ApartmentModel.findById(params.id);
      const bookings = await BookingModel.find({
        apartmentId: params.id,
        status: { $ne: 'cancelled' }
      });
      
      // Rigenerazione del feed iCal non necessaria qui, ma inclusa per completezza
      // In un'implementazione reale, potremmo voler rigenerare il feed e salvarlo in cache
      const icalFeed = generateICalFeed(apartment, bookings);
    }
    
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });
  } catch (error) {
    console.error('Error updating bulk rates:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
