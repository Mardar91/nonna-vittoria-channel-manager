import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import CheckInModel from '@/models/CheckIn';

// GET: Ottenere prenotazioni disponibili per un range di date
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
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');
    const apartmentId = url.searchParams.get('apartmentId');
    const excludeWithCheckIn = url.searchParams.get('excludeWithCheckIn') === 'true';
    const tolerance = parseInt(url.searchParams.get('tolerance') || '1'); // Giorni di tolleranza
    
    if (!checkIn || !checkOut) {
      return NextResponse.json({
        success: false,
        error: 'Date di check-in e check-out sono obbligatorie'
      }, { status: 400 });
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Imposta le ore per confronto più preciso
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);
    
    // Calcola il range con tolleranza
    const toleranceMs = tolerance * 24 * 60 * 60 * 1000;
    
    // Costruisci la query
    const query: any = {
      status: 'confirmed',
      checkIn: {
        $gte: new Date(checkInDate.getTime() - toleranceMs),
        $lte: new Date(checkInDate.getTime() + toleranceMs)
      },
      checkOut: {
        $gte: new Date(checkOutDate.getTime() - toleranceMs),
        $lte: new Date(checkOutDate.getTime() + toleranceMs)
      }
    };
    
    // Filtra per appartamento se specificato
    if (apartmentId) {
      query.apartmentId = apartmentId;
    }
    
    // Trova le prenotazioni
    const bookings = await BookingModel.find(query).lean();
    
    // Ottieni informazioni aggiuntive
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        // Controlla se ha già un check-in
        let hasCheckIn = false;
        let checkInStatus = null;
        
        if (excludeWithCheckIn) {
          const existingCheckIn = await CheckInModel.findOne({
            bookingId: booking._id.toString(),
            status: { $in: ['completed', 'pending'] }
          }).lean();
          
          hasCheckIn = !!existingCheckIn;
          checkInStatus = existingCheckIn?.status || null;
        }
        
        // Ottieni dettagli appartamento
        const apartment = await ApartmentModel.findById(booking.apartmentId).lean();
        
        // Calcola la differenza in giorni tra le date
        const checkInDiff = Math.abs(checkInDate.getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24);
        const checkOutDiff = Math.abs(checkOutDate.getTime() - new Date(booking.checkOut).getTime()) / (1000 * 60 * 60 * 24);
        
        return {
          _id: booking._id,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          numberOfGuests: booking.numberOfGuests,
          totalPrice: booking.totalPrice,
          source: booking.source,
          apartmentId: booking.apartmentId,
          apartmentName: apartment?.name || 'N/A',
          hasCheckIn,
          checkInStatus,
          isAvailable: !hasCheckIn || !excludeWithCheckIn,
          matchScore: {
            checkInDiff: Math.round(checkInDiff),
            checkOutDiff: Math.round(checkOutDiff),
            totalDiff: Math.round(checkInDiff + checkOutDiff),
            isExactMatch: checkInDiff === 0 && checkOutDiff === 0
          }
        };
      })
    );
    
    // Ordina per corrispondenza migliore (differenza minore)
    bookingsWithDetails.sort((a, b) => {
      // Prima le corrispondenze esatte
      if (a.matchScore.isExactMatch && !b.matchScore.isExactMatch) return -1;
      if (!a.matchScore.isExactMatch && b.matchScore.isExactMatch) return 1;
      
      // Poi per differenza totale
      return a.matchScore.totalDiff - b.matchScore.totalDiff;
    });
    
    // Filtra solo quelle disponibili se richiesto
    const availableBookings = excludeWithCheckIn 
      ? bookingsWithDetails.filter(b => b.isAvailable)
      : bookingsWithDetails;
    
    return NextResponse.json({
      success: true,
      bookings: availableBookings,
      totalFound: bookings.length,
      availableCount: availableBookings.length,
      searchParams: {
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
        tolerance,
        apartmentId: apartmentId || null
      }
    });
    
  } catch (error) {
    console.error('Error fetching available bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero delle prenotazioni disponibili'
    }, { status: 500 });
  }
}

// POST: Ricerca avanzata di prenotazioni per assegnazione
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
    
    const {
      checkIn,
      checkOut,
      guestName,
      numberOfGuests,
      apartmentId,
      flexibleDates = true,
      maxDaysDifference = 3
    } = await req.json();
    
    if (!checkIn || !checkOut) {
      return NextResponse.json({
        success: false,
        error: 'Date di check-in e check-out sono obbligatorie'
      }, { status: 400 });
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Query base
    const query: any = {
      status: 'confirmed'
    };
    
    // Se le date sono flessibili, cerca in un range più ampio
    if (flexibleDates) {
      const daysDiff = maxDaysDifference * 24 * 60 * 60 * 1000;
      query.checkIn = {
        $gte: new Date(checkInDate.getTime() - daysDiff),
        $lte: new Date(checkInDate.getTime() + daysDiff)
      };
      query.checkOut = {
        $gte: new Date(checkOutDate.getTime() - daysDiff),
        $lte: new Date(checkOutDate.getTime() + daysDiff)
      };
    } else {
      // Cerca corrispondenze esatte
      const startOfDayCheckIn = new Date(checkInDate);
      startOfDayCheckIn.setHours(0, 0, 0, 0);
      const endOfDayCheckIn = new Date(checkInDate);
      endOfDayCheckIn.setHours(23, 59, 59, 999);
      
      const startOfDayCheckOut = new Date(checkOutDate);
      startOfDayCheckOut.setHours(0, 0, 0, 0);
      const endOfDayCheckOut = new Date(checkOutDate);
      endOfDayCheckOut.setHours(23, 59, 59, 999);
      
      query.checkIn = { $gte: startOfDayCheckIn, $lte: endOfDayCheckIn };
      query.checkOut = { $gte: startOfDayCheckOut, $lte: endOfDayCheckOut };
    }
    
    // Filtri aggiuntivi opzionali
    if (apartmentId) {
      query.apartmentId = apartmentId;
    }
    
    if (numberOfGuests) {
      query.numberOfGuests = { $gte: numberOfGuests };
    }
    
    // Ricerca per nome ospite (case insensitive)
    if (guestName) {
      query.guestName = { $regex: new RegExp(guestName, 'i') };
    }
    
    const bookings = await BookingModel.find(query).lean();
    
    // Arricchisci con dettagli e calcola score
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const apartment = await ApartmentModel.findById(booking.apartmentId).lean();
        
        const existingCheckIn = await CheckInModel.findOne({
          bookingId: booking._id.toString()
        }).lean();
        
        // Calcola score di corrispondenza
        let score = 100;
        
        // Penalizza per differenza date
        const checkInDiff = Math.abs(checkInDate.getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24);
        const checkOutDiff = Math.abs(checkOutDate.getTime() - new Date(booking.checkOut).getTime()) / (1000 * 60 * 60 * 24);
        score -= (checkInDiff + checkOutDiff) * 10;
        
        // Bonus per corrispondenza nome
        if (guestName && booking.guestName.toLowerCase().includes(guestName.toLowerCase())) {
          score += 20;
        }
        
        // Bonus per numero ospiti esatto
        if (numberOfGuests && booking.numberOfGuests === numberOfGuests) {
          score += 15;
        }
        
        // Penalizza se ha già check-in
        if (existingCheckIn) {
          score -= 50;
        }
        
        return {
          ...booking,
          apartmentName: apartment?.name || 'N/A',
          hasExistingCheckIn: !!existingCheckIn,
          checkInStatus: existingCheckIn?.status || null,
          matchScore: Math.max(0, score),
          matchDetails: {
            checkInDiff: Math.round(checkInDiff),
            checkOutDiff: Math.round(checkOutDiff),
            nameMatch: guestName ? booking.guestName.toLowerCase().includes(guestName.toLowerCase()) : null,
            guestsMatch: numberOfGuests ? booking.numberOfGuests === numberOfGuests : null
          }
        };
      })
    );
    
    // Ordina per score migliore
    enrichedBookings.sort((a, b) => b.matchScore - a.matchScore);
    
    return NextResponse.json({
      success: true,
      bookings: enrichedBookings,
      totalFound: enrichedBookings.length,
      searchCriteria: {
        checkIn,
        checkOut,
        guestName,
        numberOfGuests,
        apartmentId,
        flexibleDates,
        maxDaysDifference
      }
    });
    
  } catch (error) {
    console.error('Error searching bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore nella ricerca delle prenotazioni'
    }, { status: 500 });
  }
}
