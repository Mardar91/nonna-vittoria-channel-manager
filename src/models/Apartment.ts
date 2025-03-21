import mongoose, { Schema } from 'mongoose';

export interface IApartment {
  _id?: string;
  name: string;
  description: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  images: string[];
  amenities: string[];
  icalUrls: { source: string; url: string }[];
  icalFeed?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ApartmentSchema = new Schema<IApartment>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    price: { type: Number, required: true },
    bedrooms: { type: Number, required: true, default: 1 },
    bathrooms: { type: Number, required: true, default: 1 },
    maxGuests: { type: Number, required: true, default: 2 },
    images: [{ type: String }],
    amenities: [{ type: String }],
    icalUrls: [
      {
        source: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    icalFeed: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Apartment || mongoose.model<IApartment>('Apartment', ApartmentSchema);
