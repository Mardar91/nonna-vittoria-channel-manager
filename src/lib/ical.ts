import ical from 'node-ical';
import { v4 as uuidv4 } from 'uuid';
import ICalGenerator from 'ical-generator';
import { IBooking } from '@/models/Booking';
import { IApartment } from '@/models/Apartment';

// Funzione per importare eventi da un feed iCal
export async function importICalEvents(url: string): Promise<Array<{ start: Date; end: Date; summary: string; uid: string }>> {
  try {
    const events = await ical.fromURL(url);
    const bookings = [];

    for (const event of Object.values(events)) {
      if (event.type !== 'VEVENT') continue;

      bookings.push({
        start: event.start,
        end: event.end,
        summary: event.summary || 'Booking',
        uid: event.uid || uuidv4(),
      });
    }

    return bookings;
  } catch (error) {
    console.error('Error importing iCal events:', error);
    throw new Error('Failed to import iCal events');
  }
}

// Funzione per generare un feed iCal dalle prenotazioni
export function generateICalFeed(apartment: IApartment, bookings: IBooking[]): string {
  const calendar = ICalGenerator({
    name: `${apartment.name} - Availability`,
    prodId: { company: 'Nonna Vittoria Apartments', product: 'Channel Manager' },
  });

  bookings.forEach((booking) => {
    calendar.createEvent({
      start: booking.checkIn,
      end: booking.checkOut,
      summary: `Booked: ${booking.guestName}`,
      description: `Booking from ${booking.source}. Guests: ${booking.numberOfGuests}`,
      id: booking._id || uuidv4(),
    });
  });

  return calendar.toString();
}

// Funzione per sincronizzare prenotazioni da più sorgenti
export async function syncCalendarsForApartment(apartment: IApartment): Promise<Array<{ start: Date; end: Date; summary: string; uid: string }>> {
  try {
    let allEvents = [];

    // Importa eventi da tutte le sorgenti configurate
    for (const icalSource of apartment.icalUrls) {
      const events = await importICalEvents(icalSource.url);
      allEvents = [...allEvents, ...events.map(event => ({ ...event, source: icalSource.source }))];
    }

    return allEvents;
  } catch (error) {
    console.error('Error syncing calendars:', error);
    throw new Error('Failed to sync calendars');
  }
}

// Verifica la disponibilità per un periodo specifico
export function checkAvailability(
  startDate: Date,
  endDate: Date,
  existingBookings: Array<{ start: Date; end: Date }>
): boolean {
  // Controlla sovrapposizioni
  for (const booking of existingBookings) {
    // Se la nuova prenotazione inizia prima che l'esistente finisca 
    // E finisce dopo che l'esistente inizia, c'è una sovrapposizione
    if (startDate < booking.end && endDate > booking.start) {
      return false; // Non disponibile
    }
  }
  
  return true; // Disponibile
}
