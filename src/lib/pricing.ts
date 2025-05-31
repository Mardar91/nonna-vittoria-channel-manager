// src/lib/pricing.ts
import ApartmentModel, { IApartment } from '@/models/Apartment'; // Adjust IApartment if it has seasonalPrices structure
import DailyRateModel, { IDailyRate } from '@/models/DailyRate'; // Assuming IDailyRate exists
import { calculateTotalPrice as calculateBasePriceLogic } from '@/lib/utils'; // Rename for clarity

export async function calculateDynamicPriceForStay(
  apartmentId: string,
  checkInDateInput: Date,
  checkOutDateInput: Date,
  numGuests: number
): Promise<number> {
  const apartment = await ApartmentModel.findById(apartmentId).lean() as IApartment | null; // Use .lean() for plain JS object and cast
  if (!apartment) {
    throw new Error(`Apartment with ID ${apartmentId} not found.`);
  }

  // Ensure dates are Date objects
  const checkInDate = new Date(checkInDateInput);
  const checkOutDate = new Date(checkOutDateInput);

  const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
  let totalCalculatedPrice = 0;

  for (let i = 0; i < nights; i++) {
    const currentNightIterationDate = new Date(checkInDate);
    currentNightIterationDate.setUTCDate(currentNightIterationDate.getUTCDate() + i);

    const normalizedCurrentNightDate = new Date(Date.UTC(
      currentNightIterationDate.getUTCFullYear(),
      currentNightIterationDate.getUTCMonth(),
      currentNightIterationDate.getUTCDate()
    ));

    let nightPrice = -1; // Sentinel for not found, though logic below should always set it.

    // 1. Check for DailyRate
    const dailyRate = await DailyRateModel.findOne({
      apartmentId,
      date: normalizedCurrentNightDate,
      price: { $exists: true, $ne: null } // Ensure price is set
    }).lean() as IDailyRate | null;

    if (dailyRate && typeof dailyRate.price === 'number') {
      const dailyRateApartmentConfig = {
        price: dailyRate.price,
        priceType: apartment.priceType,
        baseGuests: apartment.baseGuests,
        extraGuestPrice: apartment.extraGuestPrice,
        extraGuestPriceType: apartment.extraGuestPriceType,
      };
      nightPrice = calculateBasePriceLogic(dailyRateApartmentConfig, numGuests, 1);

    } else {
      // 2. Check for SeasonalPrice
      let seasonalPriceForNight: number | null = null;
      if (apartment.seasonalPrices && apartment.seasonalPrices.length > 0) {
        for (const season of apartment.seasonalPrices) {
          // Ensure season.startDate and season.endDate are Date objects before calling getUTCFullYear etc.
          const seasonStartObj = new Date(season.startDate);
          const seasonEndObj = new Date(season.endDate);

          const seasonStart = new Date(Date.UTC(seasonStartObj.getUTCFullYear(), seasonStartObj.getUTCMonth(), seasonStartObj.getUTCDate()));
          const seasonEnd = new Date(Date.UTC(seasonEndObj.getUTCFullYear(), seasonEndObj.getUTCMonth(), seasonEndObj.getUTCDate()));

          if (normalizedCurrentNightDate.getTime() >= seasonStart.getTime() &&
              normalizedCurrentNightDate.getTime() <= seasonEnd.getTime() &&
              typeof season.price === 'number') {
            seasonalPriceForNight = season.price;
            break;
          }
        }
      }

      if (seasonalPriceForNight !== null) {
        const seasonalApartmentConfig = {
          price: seasonalPriceForNight,
          priceType: apartment.priceType,
          baseGuests: apartment.baseGuests,
          extraGuestPrice: apartment.extraGuestPrice,
          extraGuestPriceType: apartment.extraGuestPriceType,
        };
        nightPrice = calculateBasePriceLogic(seasonalApartmentConfig, numGuests, 1);
      } else {
        // 3. Use Base Price Logic
        const baseApartmentConfig = {
          price: apartment.price,
          priceType: apartment.priceType,
          baseGuests: apartment.baseGuests,
          extraGuestPrice: apartment.extraGuestPrice,
          extraGuestPriceType: apartment.extraGuestPriceType,
        };
        nightPrice = calculateBasePriceLogic(baseApartmentConfig, numGuests, 1);
      }
    }
    totalCalculatedPrice += nightPrice;
  }
  return totalCalculatedPrice;
}
