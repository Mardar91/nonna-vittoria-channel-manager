import mongoose, { Schema } from 'mongoose';

export interface IGuest {
  lastName: string;
  firstName: string;
  sex: 'M' | 'F';
  dateOfBirth: Date;
  placeOfBirth: string;
  provinceOfBirth?: string; // Solo per luoghi italiani
  countryOfBirth: string;
  citizenship: string;
  documentType?: 'identity_card' | 'passport' | 'driving_license' | 'other';
  documentNumber?: string;
  documentIssuePlace?: string;
  documentIssueProvince?: string; // Solo per luoghi italiani
  documentIssueCountry?: string;
  isMainGuest: boolean;
}

export interface ICheckIn {
  _id?: string;
  bookingId?: string;
  apartmentId?: string;
  checkInDate: Date;
  guests: IGuest[];
  status: 'pending' | 'completed' | 'cancelled' | 'pending_assignment';
  completedAt?: Date;
  completedBy?: string; // 'guest' o userId se fatto manualmente
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const GuestSchema = new Schema<IGuest>({
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  sex: { type: String, required: true, enum: ['M', 'F'] },
  dateOfBirth: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  provinceOfBirth: { type: String }, // Solo per luoghi italiani
  countryOfBirth: { type: String, required: true },
  citizenship: { type: String, required: true },
  documentType: { 
    type: String, 
    enum: ['identity_card', 'passport', 'driving_license', 'other'] 
  },
  documentNumber: { type: String },
  documentIssuePlace: { type: String },
  documentIssueProvince: { type: String }, // Solo per luoghi italiani
  documentIssueCountry: { type: String },
  isMainGuest: { type: Boolean, default: false }
});

const CheckInSchema = new Schema<ICheckIn>(
  {
    bookingId: { type: String, ref: 'Booking' }, // Rimosso required: true
    apartmentId: { type: String, ref: 'Apartment' }, // Rimosso required: true
    checkInDate: { type: Date, required: true },
    guests: { type: [GuestSchema], required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'pending_assignment'], // Aggiunto 'pending_assignment'
      default: 'pending',
    },
    requestedCheckIn: { type: Date },
    requestedCheckOut: { type: Date },
    completedAt: { type: Date },
    completedBy: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indici per ricerche efficienti
CheckInSchema.index({ bookingId: 1 });
CheckInSchema.index({ apartmentId: 1, checkInDate: 1 });
CheckInSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', CheckInSchema);

