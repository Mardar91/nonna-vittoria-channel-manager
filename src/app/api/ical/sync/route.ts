import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel, { IApartment } from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import { importICalEvents, extractGuestInfoFromEvent } from '@/lib/ical';
import { v4 as uuidv4 } from 'uuid';

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
      console.error('Error validating iCal URL:', error);
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
        // Verifica se la prenotazione esiste già
        const existingBooking = await BookingModel.findOne({
          apartmentId,
          source,
          $or: [
            { externalId: event.uid },
            {
              checkIn: { $eq: event.start },
              checkOut: { $eq: event.end }
            }
          ]
        });
        
        if (!existingBooking) {
          // Estrai informazioni dell'ospite dall'evento
          const guestInfo = extractGuestInfoFromEvent(event);
          
          // Calcola un prezzo approssimativo basato sul prezzo dell'appartamento e la durata
          const nights = Math.max(1, Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24)));
          const totalPrice = apartment.price * nights;
          
          // Crea una nuova prenotazione
          const booking = await BookingModel.create({
            apartmentId,
            guestName: guestInfo.name || 'Guest',
            guestEmail: guestInfo.email || `${source.toLowerCase()}_${uuidv4().slice(0, 8)}@example.com`,
            guestPhone: guestInfo.phone || undefined,
            checkIn: event.start,
            checkOut: event.end,
            totalPrice,
            numberOfGuests: 1, // Default, non potendo sapere il numero esatto
            status: 'confirmed',
            paymentStatus: 'paid',
            source,
            externalId: event.uid,
            notes: guestInfo.notes || `Importato da ${source} iCal feed`,
          });
          
          importedBookings.push(booking);
        }
      } catch (error) {
        console.error('Error importing event:', error);
        errors.push({ 
          uid: event.uid,
          error: (error as Error).message,
          start: event.start,
          end: event.end
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
    console.error('Error syncing iCal feed:', error);
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
    
    // Sincronizza con tutti i feed iCal configurati
    const events = await importICalEvents(apartment.icalUrls[0].url);
    
    return NextResponse.json({
      events,
      message: `Successfully retrieved ${events.length} events from all iCal feeds`,
    });
  } catch (error) {
    console.error('Error fetching iCal events:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
