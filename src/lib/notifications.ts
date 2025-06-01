import NotificationModel from '@/models/Notification';
import ApartmentModel from '@/models/Apartment';
import { IBooking } from '@/models/Booking';
import { ICheckIn } from '@/models/CheckIn';

interface CreateNotificationParams {
  type: 'new_booking' | 'new_checkin' | 'ical_import' | 'booking_inquiry';
  relatedModel: 'Booking' | 'CheckIn';
  relatedId: string;
  apartmentId?: string;
  guestName?: string;
  checkIn?: Date;
  checkOut?: Date;
  source?: string;
}

/**
 * Crea una notifica per l'admin
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const {
      type,
      relatedModel,
      relatedId,
      apartmentId,
      guestName,
      checkIn,
      checkOut,
      source
    } = params;

    // Recupera il nome dell'appartamento se fornito l'ID
    let apartmentName = '';
    if (apartmentId) {
      const apartment = await ApartmentModel.findById(apartmentId);
      apartmentName = apartment?.name || 'Appartamento sconosciuto';
    }

    // Genera titolo e messaggio in base al tipo
    let title = '';
    let message = '';

    switch (type) {
      case 'new_booking':
        title = '📅 Nuova Prenotazione Diretta';
        message = `${guestName || 'Ospite'} ha prenotato ${apartmentName}`;
        if (checkIn && checkOut) {
          const checkInDate = new Date(checkIn).toLocaleDateString('it-IT');
          const checkOutDate = new Date(checkOut).toLocaleDateString('it-IT');
          message += ` dal ${checkInDate} al ${checkOutDate}`;
        }
        break;

      case 'booking_inquiry':
        title = '📋 Nuova Richiesta di Prenotazione';
        message = `${guestName || 'Ospite'} ha inviato una richiesta per ${apartmentName}`;
        if (checkIn && checkOut) {
          const checkInDate = new Date(checkIn).toLocaleDateString('it-IT');
          const checkOutDate = new Date(checkOut).toLocaleDateString('it-IT');
          message += ` dal ${checkInDate} al ${checkOutDate}`;
        }
        break;

      case 'new_checkin':
        title = '✅ Nuovo Check-in Online';
        message = `${guestName || 'Ospite'} ha completato il check-in`;
        if (apartmentName) {
          message += ` per ${apartmentName}`;
        }
        break;

      case 'ical_import':
        title = '🔄 Nuova Prenotazione Importata';
        message = `Importata prenotazione da ${source || 'calendario esterno'}`;
        if (apartmentName) {
          message += ` per ${apartmentName}`;
        }
        if (guestName) {
          message += ` - ${guestName}`;
        }
        break;

      default:
        title = '📢 Nuova Notifica';
        message = 'Hai una nuova notifica';
    }

    // Crea la notifica
    const notification = await NotificationModel.create({
      userId: '1', // Default all'admin principale
      type,
      title,
      message,
      relatedModel,
      relatedId,
      apartmentId,
      isRead: false,
      metadata: {
        guestName,
        checkIn,
        checkOut,
        source,
        apartmentName
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Non far fallire l'operazione principale se la notifica non può essere creata
    return null;
  }
}

/**
 * Crea notifiche per prenotazioni multiple (es. prenotazioni di gruppo)
 */
export async function createBookingNotifications(bookings: IBooking[], isInquiry = false) {
  try {
    const notifications = [];
    
    for (const booking of bookings) {
      const notification = await createNotification({
        type: isInquiry ? 'booking_inquiry' : 'new_booking',
        relatedModel: 'Booking',
        relatedId: booking._id!.toString(),
        apartmentId: booking.apartmentId,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        source: booking.source
      });
      
      if (notification) {
        notifications.push(notification);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating booking notifications:', error);
    return [];
  }
}

/**
 * Crea una notifica per un check-in
 */
export async function createCheckInNotification(checkIn: ICheckIn, guestName?: string, apartmentId?: string) {
  try {
    return await createNotification({
      type: 'new_checkin',
      relatedModel: 'CheckIn',
      relatedId: checkIn._id!.toString(),
      apartmentId: apartmentId || checkIn.apartmentId,
      guestName: guestName || 'Ospite',
      checkIn: checkIn.checkInDate
    });
  } catch (error) {
    console.error('Error creating check-in notification:', error);
    return null;
  }
}
