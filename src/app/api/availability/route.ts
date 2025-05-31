import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import DailyRateModel from '@/models/DailyRate';
import PublicProfileModel from '@/models/PublicProfile';
import { checkAvailability } from '@/lib/ical';
import { calculateDynamicPriceForStay } from '@/lib/pricing';

// Funzione per verificare la disponibilità di un appartamento
async function checkApartmentAvailability(
  apartmentId: string,
  checkIn: Date,
  checkOut: Date
) {
  // Date normalization removed - This comment refers to the overall function's direct params
  // Define UTC Normalized Dates for Queries (Bookings and Blocked Dates)
  const dateForBlockedQueryCheckIn = new Date(checkIn);
  dateForBlockedQueryCheckIn.setUTCHours(0, 0, 0, 0);

  const dateForBlockedQueryCheckOut = new Date(checkOut);
  dateForBlockedQueryCheckOut.setUTCHours(0, 0, 0, 0);

  // Create effectiveCheckInForComparison, set to 12:00 PM UTC of the check-in day
  const effectiveCheckInForComparison = new Date(dateForBlockedQueryCheckIn);
  effectiveCheckInForComparison.setUTCHours(12, 0, 0, 0); // Set to 12:00 PM UTC

  // Verifica prenotazioni esistenti using UTC normalized dates
  const existingBookings = await BookingModel.find({
    apartmentId,
    status: { $ne: 'cancelled' },
    $or: [
      {
        checkIn: { $lt: dateForBlockedQueryCheckOut },     // Compares DB check-in with the request's check-out (normalized to UTC midnight)
        checkOut: { $gt: effectiveCheckInForComparison } // Compares DB check-out with the request's check-in (normalized to UTC noon)
      }
    ]
  });

  if (existingBookings.length > 0) {
    return { available: false };
  }

  // Verifica se ci sono date bloccate nel periodo
  const blockedDates = await DailyRateModel.find({
    apartmentId,
    date: { $gte: dateForBlockedQueryCheckIn, $lt: dateForBlockedQueryCheckOut }, // Use normalized dates
    isBlocked: true
  });

    // UPDATED TEMPORARY LOGGING for Blocked Dates Query
    console.log(`[Availability Check - Blocked Dates Query] Apartment ID: ${apartmentId}`);
    console.log(`[Availability Check - Blocked Dates Query] Querying for blocked dates between: ${dateForBlockedQueryCheckIn.toISOString()} (inclusive) and ${dateForBlockedQueryCheckOut.toISOString()} (exclusive)`);
    console.log(`[Availability Check - Blocked Dates Query] Found ${blockedDates.length} blocked date(s):`, JSON.stringify(blockedDates.map(d => ({ date: d.date, isBlocked: d.isBlocked }))));
    // END UPDATED LOGGING

  if (blockedDates.length > 0) {
    return { available: false };
  }

  // Verifica soggiorno minimo
  const minStayForCheckIn = await DailyRateModel.findOne({
    apartmentId,
    date: checkIn
  });

  // Calcola le notti
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  
  const apartment = await ApartmentModel.findById(apartmentId);
  
  // Usa il soggiorno minimo personalizzato o quello predefinito dell'appartamento
  const minimumStay = minStayForCheckIn?.minStay || (apartment?.minStay || 1);
  
  if (nights < minimumStay) {
    return { 
      available: false, 
      reason: 'min_stay', 
      minStay: minimumStay 
    };
  }

  // Se arriviamo qui, l'appartamento è disponibile
  return { 
    available: true,
    apartment: apartment 
  };
}

// POST: Verificare la disponibilità degli appartamenti
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { checkIn, checkOut, guests, children = 0 } = data;
    
    // Validazione
    if (!checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Verifica che le date siano valide
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid dates' },
        { status: 400 }
      );
    }
    
    // Verifica che il check-out sia dopo il check-in
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out must be after check-in' },
        { status: 400 }
      );
    }
    
    // Calcola il totale degli ospiti
    const totalGuests = parseInt(guests) + parseInt(children.toString());
    
    await connectDB();
    
    // Ottieni il profilo pubblico per verificare se il booking di gruppo è consentito
    const profile = await PublicProfileModel.findOne({});
    const allowGroupBooking = profile?.allowGroupBooking || false;
    
    // Ottieni tutti gli appartamenti
    const apartments = await ApartmentModel.find({}).sort({ maxGuests: -1 });
    
    // Risultati
    const availableApartments = [];
    const groupBookingOptions = [];
    
    // Verifica la disponibilità per ciascun appartamento
    for (const apartment of apartments) {
      // Verifica che l'appartamento possa ospitare tutti gli ospiti
      if (apartment.maxGuests >= totalGuests) {
        const result = await checkApartmentAvailability(
          apartment._id.toString(),
          checkInDate,
          checkOutDate
        );
        
        if (result.available) {
          const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

          let priceForStay;
          try {
            priceForStay = await calculateDynamicPriceForStay(
              apartment._id.toString(),
              checkInDate, // This is the Date object from the request
              checkOutDate, // This is the Date object from the request
              totalGuests
            );
          } catch (priceError) {
            console.error(`Error calculating dynamic price for apartment ${apartment._id}:`, priceError);
            priceForStay = null;
          }

          availableApartments.push({
            ...apartment.toObject(),
            nights: nights,
            calculatedPriceForStay: priceForStay, // Add the new calculated price
          });
        }
      }
    }
    
    // Se non ci sono appartamenti disponibili per tutti gli ospiti insieme, ma il booking di gruppo è consentito
    if (availableApartments.length === 0 && allowGroupBooking && totalGuests > 1) {
      // Ottieni tutti gli appartamenti disponibili
      const allAvailableApts = [];
      
      for (const apartment of apartments) {
        const result = await checkApartmentAvailability(
          apartment._id.toString(),
          checkInDate,
          checkOutDate
        );
        
        if (result.available) {
          const nightsForGroupApt = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
          let priceForGroupAptStay = null;
          try {
              priceForGroupAptStay = await calculateDynamicPriceForStay(
                  apartment._id.toString(),
                  checkInDate,
                  checkOutDate,
                  Math.min(totalGuests, apartment.maxGuests)
              );
          } catch (priceError) {
              console.error(`Error calculating dynamic price for group option apartment ${apartment._id}:`, priceError);
          }

          allAvailableApts.push({
            ...apartment.toObject(),
            nights: nightsForGroupApt,
            calculatedPriceForStay: priceForGroupAptStay, // Add calculated price
          });
        }
      }
      
      // Crea combinazioni di appartamenti per ospitare tutti gli ospiti
      if (allAvailableApts.length >= 2) {
        // Ordina gli appartamenti per capacità
        allAvailableApts.sort((a, b) => b.maxGuests - a.maxGuests);
        
        // Algoritmo semplice per trovare combinazioni
        let remainingGuests = totalGuests;
        const combination = [];
        
        for (const apt of allAvailableApts) {
          if (remainingGuests <= 0) break;
          
          // Aggiungi questo appartamento alla combinazione
          combination.push(apt);
          
          // Aggiorna gli ospiti rimanenti
          remainingGuests -= apt.maxGuests;
        }
        
        // Se abbiamo trovato una combinazione che può ospitare tutti
        if (remainingGuests <= 0) {
          groupBookingOptions.push(combination);
        }
      }
    }
    
    return NextResponse.json({
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: totalGuests,
      availableApartments,
      groupBookingOptions,
      allowGroupBooking
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
