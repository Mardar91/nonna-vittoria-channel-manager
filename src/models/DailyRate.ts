import mongoose, { Schema } from 'mongoose';

export interface IDailyRate {
  _id?: string;
  apartmentId: string;
  date: Date;
  price?: number;
  isBlocked: boolean;
  minStay?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DailyRateSchema = new Schema<IDailyRate>(
  {
    apartmentId: { type: String, required: true, ref: 'Apartment' },
    date: { type: Date, required: true },
    price: { type: Number },
    isBlocked: { type: Boolean, default: false },
    minStay: { type: Number, min: 1 },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indice composto per cercare rapidamente per apartmentId e date
DailyRateSchema.index({ apartmentId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyRate || mongoose.model<IDailyRate>('DailyRate', DailyRateSchema);
