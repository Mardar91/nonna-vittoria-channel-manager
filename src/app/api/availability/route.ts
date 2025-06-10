import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ApartmentModel, { IApartment } from '@/models/Apartment'; // Import IApartment
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

  // Normalizza la data di checkIn a UTC mezzanotte per la query DailyRate del minStay
  const normalizedCheckInDateForMinStayQuery = new Date(checkIn);
  normalizedCheckInDateForMinStayQuery.setUTCHours(0, 0, 0, 0);

  // Verifica soggiorno minimo
  const minStayForCheckIn = await DailyRateModel.findOne({
    apartmentId,
    date: normalizedCheckInDateForMinStayQuery // Usa la data normalizzata qui
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

// Helper function for group booking guest distribution (backend)
interface ApartmentForDistribution {
  _id: string;
  name: string;
  maxGuests: number;
  price: number;
  priceType: 'per_night' | 'per_person' | 'flat';
  baseGuests?: number;
  extraGuestPrice?: number;
  extraGuestPriceType?: 'fixed' | 'percentage';
  seasonalPrices?: Array<{ startDate: Date; endDate: Date; price: number }>;
  minStay?: number; // Added minStay
  // Include any other properties of IApartment that calculateDynamicPriceForStay might need
  // For example, if specific amenities or policies affect pricing.
  // Also, ensure all fields required by IApartment for constructing the final object are here.
}

interface DistributedApartmentBackend extends ApartmentForDistribution {
  effectiveGuests: number;
  calculatedPriceForStay?: number | null;
  nights: number;
}

function distributeGuestsForCombination(
  combination: ApartmentForDistribution[], // Expects objects that include 'nights' already
  totalGuestsToDistribute: number
): DistributedApartmentBackend[] {
  let remainingGuests = totalGuestsToDistribute;

  // Map to ensure all properties are carried over and effectiveGuests is initialized.
  // The 'nights' property should already be part of each apt in 'combination'.
  const distributedApartments: DistributedApartmentBackend[] = combination.map(apt => ({
    ...(apt as IApartment), // Cast to IApartment or ensure all fields are there
    _id: apt._id.toString(), // Ensure _id is string
    effectiveGuests: 0,
    nights: (apt as any).nights, // Assuming nights is passed in or part of ApartmentForDistribution
  }));

  // Sort by maxGuests to prioritize larger apartments, can be adjusted
  distributedApartments.sort((a, b) => b.maxGuests - a.maxGuests);

  for (const apt of distributedApartments) {
    if (remainingGuests <= 0) break;
    const guestsToAssign = Math.min(remainingGuests, apt.maxGuests);
    apt.effectiveGuests = guestsToAssign;
    remainingGuests -= guestsToAssign;
  }

  return distributedApartments;
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

    // START: minDaysInAdvance and maxDaysInAdvance logic
    if (profile) {
      const currentDateUtc = new Date();
      currentDateUtc.setUTCHours(0, 0, 0, 0);

      let minBookingDate = new Date(currentDateUtc);
      if (profile.minDaysInAdvance && profile.minDaysInAdvance > 0) {
        minBookingDate.setUTCDate(currentDateUtc.getUTCDate() + profile.minDaysInAdvance);
      }

      let maxBookingDate: Date | null = null;
      if (profile.maxDaysInAdvance && profile.maxDaysInAdvance > 0) {
        maxBookingDate = new Date(currentDateUtc);
        maxBookingDate.setUTCDate(currentDateUtc.getUTCDate() + profile.maxDaysInAdvance);
      }

      const checkInDateNormalized = new Date(checkInDate);
      checkInDateNormalized.setUTCHours(0, 0, 0, 0);

      if (checkInDateNormalized < minBookingDate) {
        let message: string;
        const minDays = profile.minDaysInAdvance || 0;
        if (minDays > 0) {
          message = `La data di check-in deve essere almeno ${minDays} giorni dopo la data odierna.`;
        } else {
          // This condition implies checkInDateNormalized < currentDateUtc because minBookingDate is currentDateUtc when minDaysInAdvance is 0
          message = "Non è possibile prenotare per date passate.";
        }
        return NextResponse.json(
          { errorCode: 'ERR_TOO_EARLY', message: message },
          { status: 400 }
        );
      }

      if (maxBookingDate && checkInDateNormalized > maxBookingDate) {
        const message = "Per queste date future non è stata ancora stabilita la disponibilità. Prova a cercare per date più vicine o contattaci.";
        return NextResponse.json(
          { errorCode: 'ERR_TOO_LATE', message: message },
          { status: 400 }
        );
      }
    }
    // END: minDaysInAdvance and maxDaysInAdvance logic
    
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
      const potentialSourceApartmentsForGroup = [];
      for (const apartment of apartments) { // Using 'apartments' which are full IApartment documents
        const availabilityResult = await checkApartmentAvailability(
          apartment._id.toString(),
          checkInDate,
          checkOutDate
        );
        if (availabilityResult.available && availabilityResult.apartment) {
          // Push a lean version of the apartment, or the full one if needed by distribute/calculate functions
          potentialSourceApartmentsForGroup.push(availabilityResult.apartment.toObject() as IApartment);
        }
      }

      // --- Modified Combination Logic with Price Recalculation ---
      if (potentialSourceApartmentsForGroup.length > 0) { // Check if there are any available apartments at all
        // Sort available apartments by maxGuests to try to fill with fewer apartments
        potentialSourceApartmentsForGroup.sort((a, b) => b.maxGuests - a.maxGuests);
        
        let guestsToCoverByCombination = totalGuests;
        const combinationSourceAptsData: IApartment[] = [];

        for (const aptData of potentialSourceApartmentsForGroup) {
            combinationSourceAptsData.push(aptData);
            guestsToCoverByCombination -= aptData.maxGuests;
            if (guestsToCoverByCombination <= 0) break;
        }

        if (guestsToCoverByCombination <= 0 && combinationSourceAptsData.length > 0) {
            const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

            // FILTRA QUI per assicurarti che apt e apt._id siano definiti
            const validCombinationSourceAptsData = combinationSourceAptsData.filter(
                apt => apt && typeof apt._id !== 'undefined'
            );

            // Ora mappa usando validCombinationSourceAptsData
            const combinationForDistribution: ApartmentForDistribution[] = validCombinationSourceAptsData.map(apt => ({
              ...apt,
              _id: apt._id!.toString(), // Usare l'operatore 'non-null assertion' (!) qui è più sicuro dopo il filtro
              nights: nights,
              name: apt.name || 'Nome non disponibile',
              maxGuests: apt.maxGuests || 0,
              price: apt.price || 0,
              priceType: (apt.priceType as 'per_night' | 'per_person' | 'flat') || 'per_night',
              baseGuests: apt.baseGuests,
              extraGuestPrice: apt.extraGuestPrice,
              extraGuestPriceType: apt.extraGuestPriceType as 'fixed' | 'percentage' | undefined,
              seasonalPrices: apt.seasonalPrices || [],
              minStay: apt.minStay || 1, // Fallback per minStay se opzionale
            }));

            const distributedApartmentsInCombination = distributeGuestsForCombination(combinationForDistribution, totalGuests);

            const finalPricedCombination: DistributedApartmentBackend[] = [];
            let actualGuestsCoveredInCombination = 0;

            for (const aptInDistro of distributedApartmentsInCombination) {
                if (aptInDistro.effectiveGuests > 0) {
                    let priceForAptInDistro = null;
                    try {
                        priceForAptInDistro = await calculateDynamicPriceForStay(
                            aptInDistro._id.toString(),
                            checkInDate,
                            checkOutDate,
                            aptInDistro.effectiveGuests // Use actual assigned guests
                        );
                    } catch (priceError) {
                        console.error(`Error recalculating price for group apartment ${aptInDistro._id} with ${aptInDistro.effectiveGuests} guests:`, priceError);
                    }
                    finalPricedCombination.push({
                        ...aptInDistro,
                        calculatedPriceForStay: priceForAptInDistro,
                    });
                    actualGuestsCoveredInCombination += aptInDistro.effectiveGuests;
                } else {
                  // Optionally, include apartments with 0 guests if needed for display,
                  // but they won't contribute to price or guest count.
                  // For now, only adding if they have effective guests.
                }
            }
            // Add the combination if it effectively covers all guests
            if (actualGuestsCoveredInCombination >= totalGuests && finalPricedCombination.length > 0) {
                groupBookingOptions.push(finalPricedCombination);
            }
        }
      }
      // --- End Modified Combination Logic ---
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
