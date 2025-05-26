import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import CheckInModel, { ICheckIn, IGuest } from '@/models/CheckIn';

// GET: Ottenere check-ins da smistare (pending_assignment)
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
    
    const url = new URL(req.url);
    const includeToday = url.searchParams.get('includeToday') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Query base per check-in pending
    const query: any = {
      status: 'pending_assignment'
    };
    
    // Se richiesto, filtra solo quelli di oggi o con date richieste vicine
    if (includeToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.$or = [
        // Check-in creati oggi
        {
          createdAt: {
            $gte: today,
            $lt: tomorrow
          }
        },
        // Check-in con data richiesta oggi o domani
        {
          requestedCheckIn: {
            $gte: today,
            $lt: new Date(tomorrow.getTime() + (24 * 60 * 60 * 1000)) // +1 giorno extra
          }
        }
      ];
    }
    
    // Ottieni i check-in pending
    const pendingCheckIns = await CheckInModel.find(query)
      .sort({ 
        requestedCheckIn: 1, // Prima quelli con date più vicine
        createdAt: -1 // Poi i più recenti
      })
      .limit(limit)
      .lean() as unknown as ICheckIn[];
    
    // Formatta i dati per il frontend
    const formattedCheckIns = pendingCheckIns.map((checkIn: ICheckIn) => {
      // Trova l'ospite principale
      const mainGuest = checkIn.guests.find((g: IGuest) => g.isMainGuest);
      
      return {
        _id: String(checkIn._id),
        mainGuestName: mainGuest ? `${mainGuest.firstName} ${mainGuest.lastName}` : 'N/A',
        guestCount: checkIn.guests.length,
        requestedCheckIn: checkIn.requestedCheckIn,
        requestedCheckOut: checkIn.requestedCheckOut,
        checkInDate: checkIn.checkInDate,
        createdAt: checkIn.createdAt,
        notes: checkIn.notes,
        // Aggiungi indicatore di urgenza
        isUrgent: checkIn.requestedCheckIn ? 
          new Date(checkIn.requestedCheckIn).getTime() <= new Date().getTime() + (24 * 60 * 60 * 1000) : 
          false
      };
    });
    
    // Ordina per urgenza
    formattedCheckIns.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return 0;
    });
    
    return NextResponse.json(formattedCheckIns);
    
  } catch (error) {
    console.error('Error fetching pending check-ins:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Statistiche sui check-in pending
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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Ottieni statistiche
    const [
      totalPending,
      todayPending,
      thisWeekPending,
      overduePending
    ] = await Promise.all([
      // Totale pending
      CheckInModel.countDocuments({ status: 'pending_assignment' }),
      
      // Pending con check-in oggi
      CheckInModel.countDocuments({
        status: 'pending_assignment',
        requestedCheckIn: {
          $gte: today,
          $lt: tomorrow
        }
      }),
      
      // Pending questa settimana
      CheckInModel.countDocuments({
        status: 'pending_assignment',
        requestedCheckIn: {
          $gte: today,
          $lt: nextWeek
        }
      }),
      
      // Pending scaduti (check-in passato)
      CheckInModel.countDocuments({
        status: 'pending_assignment',
        requestedCheckIn: {
          $lt: today
        }
      })
    ]);
    
    return NextResponse.json({
      totalPending,
      todayPending,
      thisWeekPending,
      overduePending,
      lastUpdated: new Date()
    });
    
  } catch (error) {
    console.error('Error fetching pending check-ins stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
