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
  extractedExternalId?: string;
  source?: string;
  location?: string;
  organizer?: string;
  contact?: string;
}

// Funzione per importare eventi da un feed iCal
export async function importICalEvents(url: string): Promise<ICalEvent[]> {
  try {
    const events = await ical.fromURL(url);
    const bookings: ICalEvent[] = [];

    for (const event of Object.values(events)) {
      if (event.type !== 'VEVENT') continue;
      
      // Ignora eventi che non hanno date di inizio o fine
      if (!event.start || !event.end) {
        continue;
      }

      // Normalizza le date rimuovendo l'informazione sul fuso orario
      // Imposta le ore a 12:00 per evitare problemi di fuso orario
      const startDate = new Date(event.start);
      startDate.setHours(12, 0, 0, 0);
      
      const endDate = new Date(event.end);
      endDate.setHours(12, 0, 0, 0);

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

      // Extract external booking ID
      let extractedExternalId: string | undefined = undefined;
      const descriptionOrUrl = event.description || (event.url && typeof event.url === 'string' ? event.url : '');
      if (descriptionOrUrl) {
        const match = descriptionOrUrl.match(/(?:reservations\/(?:details\/)?)([A-Z0-9]+)/i); // Case-insensitive match
        if (match && match[1]) {
          extractedExternalId = match[1];
        }
      }

      if (!extractedExternalId && event.uid && /^[A-Z0-9]{6,}$/i.test(event.uid.split('@')[0])) {
        extractedExternalId = event.uid.split('@')[0];
      }

      bookings.push({
        start: startDate,
        end: endDate,
        summary,
        description,
        uid: event.uid || uuidv4(),
        location: event.location || '',
        organizer,
        contact,
        extractedExternalId
      });
    }

    return bookings;
  } catch (error) {
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

    // Normalizza le date di check-in e check-out
    const checkIn = new Date(booking.checkIn);
    checkIn.setHours(12, 0, 0, 0);
    
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(12, 0, 0, 0);

    calendar.createEvent({
      start: checkIn,
      end: checkOut,
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
        // Continua con le altre sorgenti anche se una fallisce
      }
    }

    return allEvents;
  } catch (error) {
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

// Funzione per identificare il canale dal summary dell'evento
function identifyChannelFromSummary(summary: string): string {
  const summaryLower = summary.toLowerCase();
  
  // Cerca pattern comuni per identificare il canale
  if (summaryLower.includes('booking.com') || summaryLower.includes('booking')) {
    return 'Booking.com';
  } else if (summaryLower.includes('airbnb')) {
    return 'Airbnb';
  } else if (summaryLower.includes('expedia')) {
    return 'Expedia';
  } else if (summaryLower.includes('vrbo')) {
    return 'VRBO';
  } else if (summaryLower.includes('hotels.com')) {
    return 'Hotels.com';
  } else if (summaryLower.includes('agoda')) {
    return 'Agoda';
  } else if (summaryLower.includes('tripadvisor')) {
    return 'TripAdvisor';
  } else if (summaryLower.includes('homeaway')) {
    return 'HomeAway';
  } else if (summaryLower.includes('closed') || summaryLower.includes('not available')) {
    // Per i casi di "CLOSED - Not available", cerca di identificare il canale dal source
    return 'Importata';
  }
  
  return 'Importata'; // Default generico
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
  
  // Identifica il canale dal summary o dal source
  let channel = '';
  if (event.source) {
    // Capitalizza il source per renderlo più leggibile
    channel = event.source.charAt(0).toUpperCase() + event.source.slice(1).toLowerCase();
    // Gestisci casi specifici
    if (channel.toLowerCase() === 'booking' || channel.toLowerCase() === 'booking.com') {
      channel = 'Booking.com';
    } else if (channel.toLowerCase() === 'airbnb') {
      channel = 'Airbnb';
    }
  } else if (event.summary) {
    // Se non c'è source, prova a identificare dal summary
    channel = identifyChannelFromSummary(event.summary);
  }
  
  // Se abbiamo identificato un canale, usa "Prenotazione [Canale]"
  if (channel) {
    name = `Prenotazione ${channel}`;
  } else {
    // Altrimenti usa il summary pulito come fallback
    if (event.summary) {
      const cleanSummary = event.summary
        .replace(/^(prenotazione:|booking:|reservation:|booked:|reserved:|blocked:|unavailable:)/i, '')
        .replace(/closed\s*-\s*not\s*available/i, '')
        .trim();
      
      if (cleanSummary && cleanSummary.length > 0) {
        name = cleanSummary;
      } else {
        name = 'Prenotazione Importata';
      }
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
  
  // Se l'email non è disponibile, genera un'email fittizia usando il canale
  if (!email) {
    const sanitizedChannel = channel.toLowerCase().replace(/[^a-z0-9]/g, '');
    email = `${sanitizedChannel}_${uuidv4().slice(0, 8)}@guest.example.com`;
  }
  
  return {
    name,
    email,
    phone,
    notes
  };
}
