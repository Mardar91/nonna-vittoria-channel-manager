import ical from 'node-ical';
import { v4 as uuidv4 } from 'uuid';
import ICalGenerator from 'ical-generator';
import { IBooking } from '@/models/Booking';
import { IApartment } from '@/models/Apartment';

// Definizione dell'interfaccia per gli eventi iCal
interface ICalEvent {
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  uid: string;
  source?: string;
  location?: string;
  organizer?: string;
  contact?: string;
}

// Funzione per importare eventi da un feed iCal
export async function importICalEvents(url: string): Promise<ICalEvent[]> {
  try {
    console.log(`Fetching iCal feed from: ${url}`);
    const events = await ical.fromURL(url);
    const bookings: ICalEvent[] = [];

    console.log(`Found ${Object.keys(events).length} events in the feed`);

    for (const event of Object.values(events)) {
      if (event.type !== 'VEVENT') continue;
      
      // Ignora eventi che non hanno date di inizio o fine
      if (!event.start || !event.end) {
        console.log('Skipping event without start or end date');
        continue;
      }

      // Estrai più informazioni possibili dall'evento
      const summary = event.summary || 'Prenotazione esterna';
      let description = event.description || '';
      let contact = '';
      let organizer = '';
      
      // Estrai informazioni di contatto dalla descrizione o da altri campi
      if (event.description) {
        // Cerca informazioni come email o telefono nella descrizione
        const emailMatch = event.description.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
        const phoneMatch = event.description.match(/(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g);
        
        if (emailMatch) contact = emailMatch[0];
        if (phoneMatch) contact = contact ? `${contact}, ${phoneMatch[0]}` : phoneMatch[0];
      }

      // Estrai l'organizzatore se disponibile
      if (event.organizer) {
        if (typeof event.organizer === 'string') {
          organizer = event.organizer;
        } else if (event.organizer.params && event.organizer.params.CN) {
          organizer = event.organizer.params.CN;
        }
      }

      console.log(`Adding event: ${summary} from ${event.start} to ${event.end}`);

      bookings.push({
        start: event.start,
        end: event.end,
        summary,
        description,
        uid: event.uid || uuidv4(),
        location: event.location || '',
        organizer,
        contact
      });
    }

    console.log(`Successfully processed ${bookings.length} bookings from feed`);
    return bookings;
  } catch (error) {
    console.error('Error importing iCal events:', error);
    throw new Error(`Failed to import iCal events: ${(error as Error).message}`);
  }
}

// Funzione per generare un feed iCal dalle prenotazioni
export function generateICalFeed(apartment: IApartment, bookings: IBooking[]): string {
  const calendar = ICalGenerator({
    name: `${apartment.name} - Disponibilità`,
    prodId: { company: 'Nonna Vittoria Apartments', product: 'Channel Manager' },
    timezone: 'Europe/Rome',
  });

  bookings.forEach((booking) => {
    // Crea un nome evento significativo
    const summary = `Prenotato: ${booking.guestName}`;
    
    // Crea una descrizione dettagliata con informazioni sulla prenotazione
    const description = [
      `Prenotazione da ${booking.source}`,
      `Ospiti: ${booking.numberOfGuests}`,
      booking.notes ? `Note: ${booking.notes}` : '',
    ].filter(Boolean).join('\n');

    calendar.createEvent({
      start: booking.checkIn,
      end: booking.checkOut,
      summary,
      description,
      id: booking._id?.toString() || uuidv4(),
      location: apartment.address,
      organizer: {
        name: 'Nonna Vittoria Apartments',
        email: process.env.ADMIN_EMAIL || 'info@example.com'
      },
    });
  });

  return calendar.toString();
}

// Funzione per sincronizzare prenotazioni da più sorgenti
export async function syncCalendarsForApartment(apartment: IApartment): Promise<ICalEvent[]> {
  try {
    let allEvents: ICalEvent[] = [];

    // Importa eventi da tutte le sorgenti configurate
    for (const icalSource of apartment.icalUrls) {
      try {
        const events = await importICalEvents(icalSource.url);
        allEvents = [...allEvents, ...events.map(event => ({ ...event, source: icalSource.source }))];
      } catch (error) {
        console.error(`Error importing events from ${icalSource.source}:`, error);
        // Continua con le altre sorgenti anche se una fallisce
      }
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

// Funzione per estrarre informazioni dell'ospite dagli eventi iCal
export function extractGuestInfoFromEvent(event: ICalEvent): {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
} {
  let name = 'Ospite';
  let email = '';
  let phone = '';
  let notes = '';
  
  // Estrai nome dall'oggetto summary
  if (event.summary) {
    // Rimuovi prefissi comuni come "Prenotazione:", "Booking:", ecc.
    const cleanSummary = event.summary
      .replace(/^(prenotazione:|booking:|reservation:|booked:|reserved:|blocked:|unavailable:)/i, '')
      .trim();
    
    if (cleanSummary) {
      name = cleanSummary;
    }
  }
  
  // Estrai email dalla descrizione o dal contatto
  if (event.contact) {
    const emailMatch = event.contact.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    if (emailMatch) {
      email = emailMatch[0];
    }
    
    // Estrai telefono
    const phoneMatch = event.contact.match(/(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g);
    if (phoneMatch) {
      phone = phoneMatch[0];
    }
  }
  
  // Verifica anche nella descrizione
  if (event.description) {
    notes = event.description;
    
    // Se non abbiamo trovato email o telefono nel contatto, cercali nella descrizione
    if (!email) {
      const emailMatch = event.description.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
      if (emailMatch) {
        email = emailMatch[0];
      }
    }
    
    if (!phone) {
      const phoneMatch = event.description.match(/(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g);
      if (phoneMatch) {
        phone = phoneMatch[0];
      }
    }
  }
  
  // Se l'email non è disponibile, genera un'email fittizia usando il nome dell'ospite
  if (!email) {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    email = `${sanitizedName}_${uuidv4().slice(0, 8)}@guest.example.com`;
  }
  
  return {
    name,
    email,
    phone,
    notes
  };
}
