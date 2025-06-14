import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel, { IApartment } from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import { importICalEvents, extractGuestInfoFromEvent } from '@/lib/ical';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '@/lib/notifications';

// POST: Sincronizzare le prenotazioni da un feed iCal esterno
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { apartmentId, source, url } = await req.json();
    
    if (!apartmentId || !source || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const apartment = await ApartmentModel.findById(apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }
    
    // Verifica che l'URL sia valido
    let events;
    try {
      // Tenta di importare eventi dal feed per verificare che l'URL sia valido
      events = await importICalEvents(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid iCal URL or the feed is not accessible' },
        { status: 400 }
      );
    }
    
    // Aggiungi l'URL iCal all'appartamento se non esiste già
    const existingUrlIndex = apartment.icalUrls.findIndex(
      (item: { source: string }) => item.source === source
    );
    
    if (existingUrlIndex >= 0) {
      apartment.icalUrls[existingUrlIndex].url = url;
    } else {
      apartment.icalUrls.push({ source, url });
    }
    
    await apartment.save();
    
    // Crea prenotazioni per gli eventi importati
    const importedBookings = [];
    const errors = [];
    
    for (const event of events) {
      try {
        // Aggiungi il source all'evento prima di processarlo
        const eventWithSource = { ...event, source };
        
        // Verifica se la prenotazione esiste già
        // Check against extractedExternalId if available, otherwise fall back to uid
        const idToCheck = event.extractedExternalId || event.uid;
        const existingBooking = await BookingModel.findOne({
          apartmentId,
          $or: [
            { externalId: idToCheck },
            // Fallback for older bookings that might have used full UID before specific extraction logic
            { externalId: event.uid }, 
            {
              checkIn: { $eq: event.start },
              checkOut: { $eq: event.end }
            }
          ]
        });
        
        if (existingBooking) {
          // If booking exists, check if we need to update its externalId
          if (event.extractedExternalId && existingBooking.externalId !== event.extractedExternalId) {
            existingBooking.externalId = event.extractedExternalId;
            await existingBooking.save();
          }
          continue; // Salta questo evento se la prenotazione esiste già o è stata aggiornata
        }
        
        // Estrai informazioni dell'ospite dall'evento CON il source
        const guestInfo = extractGuestInfoFromEvent(eventWithSource);
        
        // Set totalPrice to 0 for iCal imports
        const totalPrice = 0;
        
        // Crea una nuova prenotazione - NON valida il soggiorno minimo per prenotazioni importate
        const booking = await BookingModel.create({
          apartmentId,
          guestName: guestInfo.name || 'Guest',
          // Usa l'email generata da extractGuestInfoFromEvent che ora include il canale
          guestEmail: guestInfo.email || `${source.replace(/[^a-zA-Z0-9]/g, '')}_${uuidv4().slice(0, 8)}@example.com`,
          guestPhone: guestInfo.phone || undefined,
          checkIn: event.start,
          checkOut: event.end,
          totalPrice, // Should be 0
          numberOfGuests: 1, // Default, non potendo sapere il numero esatto
          status: 'confirmed',
          paymentStatus: 'paid', // Consider changing this if totalPrice is 0
          source: source, // Use the original source string
          externalId: event.extractedExternalId || event.uid, // Usa extractedExternalId se disponibile
          notes: guestInfo.notes || `Importato da ${source} iCal feed`,
        });
        
        importedBookings.push(booking);
        
        // Crea notifica per ogni prenotazione importata
        await createNotification({
          type: 'ical_import',
          relatedModel: 'Booking',
          relatedId: booking._id.toString(),
          apartmentId: booking.apartmentId,
          guestName: booking.guestName,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          source: source
        });
        
      } catch (error) {
        errors.push({ 
          uid: event.uid,
          error: (error as Error).message,
          start: event.start,
          end: event.end,
          summary: event.summary
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      importedCount: importedBookings.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedBookings.length} bookings from ${source}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET: Recuperare tutti gli eventi dai feed iCal per un appartamento
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const apartmentId = url.searchParams.get('apartmentId');
    
    if (!apartmentId) {
      return NextResponse.json(
        { error: 'Missing apartmentId parameter' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const apartment = await ApartmentModel.findById(apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }
    
    // Verifica se ci sono feed iCal configurati
    if (!apartment.icalUrls || apartment.icalUrls.length === 0) {
      return NextResponse.json({
        events: [],
        message: "No iCal feeds configured for this apartment"
      });
    }
    
    // Sincronizza con tutti i feed iCal configurati
    try {
      // Modifica per includere il source negli eventi
      const eventsWithSource = [];
      for (const icalSource of apartment.icalUrls) {
        try {
          const events = await importICalEvents(icalSource.url);
          // Aggiungi il source a ogni evento
          const eventsFromSource = events.map(event => ({ ...event, source: icalSource.source }));
          eventsWithSource.push(...eventsFromSource);
        } catch (error) {
          console.error(`Failed to import from ${icalSource.source}:`, error);
          // Continua con gli altri feed anche se uno fallisce
        }
      }
      
      return NextResponse.json({
        events: eventsWithSource,
        message: `Successfully retrieved ${eventsWithSource.length} events from iCal feeds`
      });
    } catch (error) {
      return NextResponse.json({
        error: `Failed to import events: ${(error as Error).message}`,
        message: "There was an error retrieving events from the iCal feeds"
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
