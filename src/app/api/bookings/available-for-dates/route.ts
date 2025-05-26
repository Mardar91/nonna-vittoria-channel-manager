import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import CheckInModel, { ICheckIn } from '@/models/CheckIn';
import mongoose from 'mongoose';
import { IBooking } from '@/models/Booking';

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
    
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);
    
    const toleranceMs = tolerance * 24 * 60 * 60 * 1000;
    
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
    
    if (apartmentId) {
      query.apartmentId = apartmentId;
    }
    
    const bookings = await BookingModel.find(query).lean() as unknown as IBooking[];
    
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        let hasCheckIn = false;
        let checkInStatus = null;
        
        if (excludeWithCheckIn) {
          const existingCheckIn = await CheckInModel.findOne({
            bookingId: String(booking._id), // Usato String() per maggiore sicurezza
            status: { $in: ['completed', 'pending'] }
          }).lean() as ICheckIn | null;
          
          hasCheckIn = !!existingCheckIn;
          checkInStatus = existingCheckIn?.status || null;
        }
        
        const apartment = await ApartmentModel.findById(booking.apartmentId).lean();
        
        const checkInDiff = Math.abs(checkInDate.getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24);
        const checkOutDiff = Math.abs(checkOutDate.getTime() - new Date(booking.checkOut).getTime()) / (1000 * 60 * 60 * 24);
        
        return {
          _id: String(booking._id), // Restituisce _id come stringa
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          numberOfGuests: booking.numberOfGuests,
          totalPrice: booking.totalPrice,
          source: booking.source,
          apartmentId: String(booking.apartmentId), // Restituisce apartmentId come stringa
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
    
    bookingsWithDetails.sort((a, b) => {
      if (a.matchScore.isExactMatch && !b.matchScore.isExactMatch) return -1;
      if (!a.matchScore.isExactMatch && b.matchScore.isExactMatch) return 1;
      return a.matchScore.totalDiff - b.matchScore.totalDiff;
    });
    
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
    
    const query: any = {
      status: 'confirmed'
    };
    
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
    
    if (apartmentId) {
      query.apartmentId = apartmentId;
    }
    
    if (numberOfGuests) {
      query.numberOfGuests = { $gte: numberOfGuests };
    }
    
    if (guestName) {
      query.guestName = { $regex: new RegExp(guestName, 'i') };
    }
    
    const bookings = await BookingModel.find(query).lean() as unknown as IBooking[];
    
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const apartment = await ApartmentModel.findById(booking.apartmentId).lean();
        
        const existingCheckIn = await CheckInModel.findOne({
          bookingId: String(booking._id) // Usato String() per maggiore sicurezza
        }).lean() as ICheckIn | null;
        
        let score = 100;
        
        const checkInDiff = Math.abs(checkInDate.getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24);
        const checkOutDiff = Math.abs(checkOutDate.getTime() - new Date(booking.checkOut).getTime()) / (1000 * 60 * 60 * 24);
        score -= (checkInDiff + checkOutDiff) * 10;
        
        if (guestName && booking.guestName.toLowerCase().includes(guestName.toLowerCase())) {
          score += 20;
        }
        
        if (numberOfGuests && booking.numberOfGuests === numberOfGuests) {
          score += 15;
        }
        
        if (existingCheckIn) {
          score -= 50;
        }
        
        return {
          ...booking,
          _id: String(booking._id), // Assicura che _id sia una stringa nel risultato finale
          apartmentId: String(booking.apartmentId), // Assicura che apartmentId sia una stringa
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
