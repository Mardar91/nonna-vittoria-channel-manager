import mongoose, { Schema } from 'mongoose';

export interface IBooking {
  _id?: string;
  apartmentId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestPhoneNumber?: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  numberOfGuests: number;
  status: 'inquiry' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  source: string;
  manualTotalPrice?: number;
  externalId?: string;
  notes?: string;
  hasCheckedIn?: boolean;
  checkInDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  accessCode?: string;
  completedCheckInId?: string;
  
  // Nuovi campi per fatturazione
  invoiceSettings?: {
    requiresInvoice: boolean; // Se la prenotazione richiede ricevuta
    invoiceEmitted: boolean; // Se la ricevuta è stata emessa
    invoiceId?: string; // ID della ricevuta associata
    invoiceNumber?: string; // Numero ricevuta per riferimento rapido
    emittedAt?: Date; // Data emissione
    priceConfirmed: boolean; // Se il prezzo è stato confermato (per prenotazioni iCal)
    priceConfirmedAt?: Date;
    priceConfirmedBy?: string; // userId di chi ha confermato
  };
  
  // Informazioni aggiuntive ospite per fatturazione
  guestDetails?: {
    address?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    vatNumber?: string; // Per clienti business
    taxCode?: string; // Codice fiscale
  };
  
  // Override piattaforma per fatturazione
  platformOverride?: {
    platform?: string; // Override del source per fatturazione
    withholdingTaxApplied?: boolean; // Se applicare cedolare secca
  };
}

const BookingSchema = new Schema<IBooking>(
  {
    apartmentId: { type: String, required: true, ref: 'Apartment' },
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String },
    guestPhoneNumber: { type: String, required: false },
    accessCode: { type: String, required: false },
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
      default: 'direct',
    },
    manualTotalPrice: { type: Number, required: false },
    externalId: { type: String },
    notes: { type: String },
    hasCheckedIn: { type: Boolean, default: false },
    checkInDate: { type: Date },
    completedCheckInId: { type: String, required: false },
    
    // Nuovi campi fatturazione
    invoiceSettings: {
      requiresInvoice: { type: Boolean, default: true },
      invoiceEmitted: { type: Boolean, default: false },
      invoiceId: { type: String, ref: 'Invoice' },
      invoiceNumber: { type: String },
      emittedAt: { type: Date },
      priceConfirmed: { type: Boolean, default: true }, // Default true per prenotazioni dirette
      priceConfirmedAt: { type: Date },
      priceConfirmedBy: { type: String }
    },
    
    guestDetails: {
      address: { type: String },
      city: { type: String },
      zip: { type: String },
      province: { type: String },
      country: { type: String },
      vatNumber: { type: String },
      taxCode: { type: String }
    },
    
    platformOverride: {
      platform: { type: String },
      withholdingTaxApplied: { type: Boolean }
    }
  },
  { timestamps: true }
);

// Indice per ricerche efficienti per date
BookingSchema.index({ apartmentId: 1, checkIn: 1, checkOut: 1 });
// Indice per ricerca tramite email per check-in
BookingSchema.index({ guestEmail: 1, status: 1 });
// Nuovi indici per fatturazione
BookingSchema.index({ 'invoiceSettings.invoiceEmitted': 1, status: 1 });
BookingSchema.index({ 'invoiceSettings.invoiceId': 1 });
BookingSchema.index({ 'invoiceSettings.priceConfirmed': 1, totalPrice: 1 });
BookingSchema.index({ checkOut: 1, 'invoiceSettings.invoiceEmitted': 1 });

// Metodi helper per fatturazione
BookingSchema.methods.needsInvoice = function(): boolean {
  return this.invoiceSettings?.requiresInvoice && 
         !this.invoiceSettings?.invoiceEmitted &&
         this.status === 'completed' &&
         this.invoiceSettings?.priceConfirmed;
};

BookingSchema.methods.needsPriceConfirmation = function(): boolean {
  return this.totalPrice === 0 || !this.invoiceSettings?.priceConfirmed;
};

BookingSchema.methods.confirmPrice = async function(price: number, userId: string) {
  this.totalPrice = price;
  if (!this.invoiceSettings) {
    this.invoiceSettings = {} as any;
  }
  this.invoiceSettings.priceConfirmed = true;
  this.invoiceSettings.priceConfirmedAt = new Date();
  this.invoiceSettings.priceConfirmedBy = userId;
  await this.save();
};

BookingSchema.methods.linkInvoice = async function(invoiceId: string, invoiceNumber: string) {
  if (!this.invoiceSettings) {
    this.invoiceSettings = {} as any;
  }
  this.invoiceSettings.invoiceEmitted = true;
  this.invoiceSettings.invoiceId = invoiceId;
  this.invoiceSettings.invoiceNumber = invoiceNumber;
  this.invoiceSettings.emittedAt = new Date();
  await this.save();
};

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
