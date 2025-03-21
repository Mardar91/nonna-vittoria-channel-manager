// src/app/api/ical/sync/route.ts (versione migliorata)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel, { IApartment } from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import { importICalEvents, syncCalendarsForApartment, extractGuestInfoFromEvent } from '@/lib/ical';
import { v4 as uuidv4 } from 'uuid';

// Definizione del tipo per gli elementi dell'array icalUrls
interface ICalSource {
  source: string;
  url: string;
}

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
    
    // Aggiungi l'URL iCal all'appartamento se non esiste già
    const existingUrlIndex = apartment.icalUrls.findIndex(
      (item: ICalSource) => item.source === source
    );
    
    if (existingUrlIndex >= 0) {
      apartment.icalUrls[existingUrlIndex].url = url;
    } else {
      apartment.icalUrls.push({ source, url });
    }
    
    await apartment.save();
    
    // Importa gli eventi dal feed
    const events = await importICalEvents(url);
    
    // Crea prenotazioni per gli eventi importati
    const importedBookings = [];
    
    for (const event of events) {
      // Verifica se la prenotazione esiste già
      const existingBooking = await BookingModel.findOne({
        apartmentId,
        source,
        checkIn: event.start,
        checkOut: event.end,
      });
      
      if (!existingBooking) {
        // Estrai informazioni dell'ospite dall'evento
        const guestInfo = extractGuestInfoFromEvent(event);
        
        // Crea una nuova prenotazione
        const booking = await BookingModel.create({
          apartmentId,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone || undefined,
          checkIn: event.start,
          checkOut: event.end,
          totalPrice: 0, // Prezzo non disponibile da feed esterni
          numberOfGuests: 1, // Ospiti non disponibili da feed esterni
          status: 'confirmed',
          paymentStatus: 'paid',
          source,
          externalId: event.uid,
          notes: guestInfo.notes || `Importato da ${source} iCal feed`,
        });
        
        importedBookings.push(booking);
      }
    }
    
    return NextResponse.json({
      success: true,
      importedCount: importedBookings.length,
      message: `Successfully imported ${importedBookings.length} bookings from ${source}`,
    });
  } catch (error) {
    console.error('Error syncing iCal feed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
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
    const events = await syncCalendarsForApartment(apartment);
    
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
