import mongoose, { Schema } from 'mongoose';

export interface INotification {
  _id?: string;
  userId: string; // ID dell'utente admin che riceve la notifica
  type: 'new_booking' | 'new_checkin' | 'ical_import' | 'booking_inquiry' | 'new_invoice'; // AGGIUNTO 'new_invoice'
  title: string;
  message: string;
  relatedModel: 'Booking' | 'CheckIn' | 'Invoice'; // AGGIUNTO 'Invoice'
  relatedId: string; // ID della prenotazione o check-in correlato
  apartmentId?: string; // Per facilitare il filtraggio per appartamento
  isRead: boolean;
  readAt?: Date;
  metadata?: {
    guestName?: string;
    checkIn?: Date;
    checkOut?: Date;
    source?: string;
    apartmentName?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: ['new_booking', 'new_checkin', 'ical_import', 'booking_inquiry', 'new_invoice'], // AGGIUNTO 'new_invoice'
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedModel: {
      type: String,
      enum: ['Booking', 'CheckIn', 'Invoice'], // AGGIUNTO 'Invoice'
      required: true
    },
    relatedId: { type: String, required: true },
    apartmentId: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    metadata: {
      guestName: { type: String },
      checkIn: { type: Date },
      checkOut: { type: Date },
      source: { type: String },
      apartmentName: { type: String }
    }
  },
  { timestamps: true }
);

// Indici per query efficienti
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ relatedId: 1, relatedModel: 1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
