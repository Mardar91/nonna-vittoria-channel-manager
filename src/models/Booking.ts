import mongoose, { Schema, Document } from 'mongoose';

// Interfaccia IBooking aggiornata per chiarezza con Document
export interface IBooking extends Document {
  apartmentId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  numberOfGuests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; // 'pending' ora significa "richiesta, in attesa di pagamento"
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string; // ID della sessione di Stripe o altro gateway
  source: 'direct' | 'airbnb' | 'booking' | 'other';
  externalId?: string;
  notes?: string;
  createdAt: Date; // Aggiunto per tipizzazione corretta da timestamps
  updatedAt: Date; // Aggiunto per tipizzazione corretta da timestamps
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
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      // 'pending' è lo stato iniziale, prima della conferma del pagamento.
      // Non blocca il calendario per altre richieste 'pending', ma lo farà se diventa 'confirmed'.
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentId: { type: String }, // Può essere l'ID della sessione di checkout Stripe
    source: {
      type: String,
      enum: ['direct', 'airbnb', 'booking', 'other'],
      default: 'direct',
    },
    externalId: { type: String },
    notes: { type: String },
  },
  { timestamps: true } // Aggiunge createdAt e updatedAt automaticamente
);

// Indice per ricerche efficienti per date (utile per disponibilità)
// Consideriamo solo le prenotazioni confermate per la disponibilità effettiva
BookingSchema.index({ apartmentId: 1, status: 1, checkIn: 1, checkOut: 1 });
// Indice separato per recuperare rapidamente le prenotazioni per paymentId
BookingSchema.index({ paymentId: 1 });

// Evita la ricompilazione del modello in ambienti di sviluppo Next.js
export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
