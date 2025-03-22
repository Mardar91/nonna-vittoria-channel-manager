import mongoose, { Schema } from 'mongoose';

export interface ISettings {
  _id?: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  timezone: string;
  autoSync: boolean;
  syncInterval: number; // in minuti
  createdAt?: Date;
  updatedAt?: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    defaultCheckInTime: { type: String, default: '14:00' },
    defaultCheckOutTime: { type: String, default: '10:00' },
    timezone: { type: String, default: 'Europe/Rome' },
    autoSync: { type: Boolean, default: true },
    syncInterval: { type: Number, default: 10 }, // default: 10 minuti
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
