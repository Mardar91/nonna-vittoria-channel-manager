import mongoose, { Schema } from 'mongoose';

export interface IBooking {
  _id?: string;
  apartmentId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  numberOfGuests: number;
  status: 'inquiry' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  source: 'direct' | 'airbnb' | 'booking' | 'other';
  externalId?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    apartmentId: { type: String, required: true, ref: 'Apartment' },
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    numberOfGuests: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ['inquiry', 'pending', 'confirmed', 'cancelled', 'completed'],
      default: 'inquiry',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentId: { type: String },
    source: {
      type: String,
      enum: ['direct', 'airbnb', 'booking', 'other'],
      default: 'direct',
    },
    externalId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indice per ricerche efficienti per date
BookingSchema.index({ apartmentId: 1, checkIn: 1, checkOut: 1 });

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
