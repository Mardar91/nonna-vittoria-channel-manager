import mongoose, { Schema } from 'mongoose';

export interface IPublicProfile {
  _id?: string;
  isActive: boolean;
  name: string;
  description?: string;
  logo?: string;
  headerColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  allowGroupBooking: boolean;
  minDaysInAdvance?: number;
  maxDaysInAdvance?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const PublicProfileSchema = new Schema<IPublicProfile>(
  {
    isActive: { type: Boolean, default: false },
    name: { type: String, required: true, default: 'Nonna Vittoria Apartments' },
    description: { type: String },
    logo: { type: String },
    headerColor: { type: String, default: '#1d4ed8' },
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#eff6ff' },
    contactEmail: { type: String },
    contactPhone: { type: String },
    address: { type: String },
    termsAndConditions: { type: String },
    privacyPolicy: { type: String },
    allowGroupBooking: { type: Boolean, default: true },
    minDaysInAdvance: { type: Number, default: 1 },
    maxDaysInAdvance: { type: Number, default: 365 },
  },
  { timestamps: true }
);

export default mongoose.models.PublicProfile || mongoose.model<IPublicProfile>('PublicProfile', PublicProfileSchema);
