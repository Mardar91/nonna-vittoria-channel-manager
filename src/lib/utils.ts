export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function calculateTotalPrice(
  apartment: {
    price: number;
    priceType: 'flat' | 'per_person';
    baseGuests: number;
    extraGuestPrice: number;
    extraGuestPriceType: 'fixed' | 'percentage';
  },
  numGuests: number,
  nights: number
): number {
  // Se il prezzo è per persona, moltiplica il prezzo base per il numero di ospiti
  if (apartment.priceType === 'per_person') {
    return numGuests * apartment.price * nights;
  }

  // Altrimenti, calcola il prezzo base + sovrapprezzo per ospiti extra
  let totalPrice = apartment.price * nights;
  
  // Calcola il numero di ospiti extra
  const extraGuests = Math.max(0, numGuests - apartment.baseGuests);
  
  if (extraGuests > 0 && apartment.extraGuestPrice > 0) {
    if (apartment.extraGuestPriceType === 'fixed') {
      // Sovrapprezzo fisso per ogni ospite aggiuntivo
      totalPrice += extraGuests * apartment.extraGuestPrice * nights;
    } else {
      // Sovrapprezzo percentuale per ogni ospite aggiuntivo
      // Per ogni ospite extra, aggiungiamo la percentuale specificata
      for (let i = 0; i < extraGuests; i++) {
        const extraCharge = apartment.price * (apartment.extraGuestPrice / 100);
        totalPrice += extraCharge * nights;
      }
    }
  }
  
  return totalPrice;
}
