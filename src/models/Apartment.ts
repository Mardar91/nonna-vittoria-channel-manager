import mongoose, { Schema } from 'mongoose';

export interface IApartment {
  _id?: string;
  name: string;
  description: string;
  address: string;
  price: number;
  priceType: 'flat' | 'per_person'; // Tipo di prezzo: fisso o per persona
  baseGuests: number; // Numero di ospiti inclusi nel prezzo base
  extraGuestPrice: number; // Prezzo per ogni ospite aggiuntivo
  extraGuestPriceType: 'fixed' | 'percentage'; // Tipo di sovrapprezzo: fisso o percentuale
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  minStay: number;
  images: string[];
  amenities: string[];
  icalUrls: { source: string; url: string }[];
  icalFeed?: string;
  seasonalPrices?: {
    name: string;
    startDate: Date;
    endDate: Date;
    price: number;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ApartmentSchema = new Schema<IApartment>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    price: { type: Number, required: true },
    priceType: { type: String, enum: ['flat', 'per_person'], default: 'flat' },
    baseGuests: { type: Number, default: 1 },
    extraGuestPrice: { type: Number, default: 0 },
    extraGuestPriceType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    bedrooms: { type: Number, required: true, default: 1 },
    bathrooms: { type: Number, required: true, default: 1 },
    maxGuests: { type: Number, required: true, default: 2 },
    minStay: { type: Number, required: true, default: 1 },
    images: [{ type: String }],
    amenities: [{ type: String }],
    icalUrls: [
      {
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    icalFeed: { type: String },
    seasonalPrices: [
      {
        name: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        price: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Apartment || mongoose.model<IApartment>('Apartment', ApartmentSchema);
