import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import { syncCalendarsForApartment, importICalEvents, extractGuestInfoFromEvent } from '@/lib/ical';
import SettingsModel from '@/models/Settings';
import { v4 as uuidv4 } from 'uuid';

// Supporta sia GET che POST per maggiore compatibilità con i servizi di cron
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  try {
    // Verifica header di autorizzazione
    const authHeader = req.headers.get('x-api-key') || '';
    const expectedApiKey = process.env.SYNC_API_KEY;
    
    // Ottieni l'origine della richiesta
    const origin = req.headers.get('origin') || '';
    const host = req.headers.get('host') || '';
    
    // Se la richiesta proviene dallo stesso host/origine (interno all'app), la consideriamo autorizzata
    // altrimenti, verifichiamo la chiave API
    const isInternalRequest = origin.includes(host) || 
                             (req.url && new URL(req.url).host === host);
    
    // Verifica la chiave API solo per richieste esterne
    if (!isInternalRequest && (!expectedApiKey || authHeader !== expectedApiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Verifica se la sincronizzazione automatica è abilitata
    const settings = await SettingsModel.findOne({});
    
    if (!settings || !settings.autoSync) {
      return NextResponse.json({
        success: false,
        message: 'La sincronizzazione automatica è disabilitata nelle impostazioni'
      });
    }
    
    // Ottieni tutti gli appartamenti
    const apartments = await ApartmentModel.find({});
    
    if (apartments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun appartamento trovato da sincronizzare'
      });
    }
    
    // Sincronizza ciascun appartamento
    const results = [];
    const allImportedBookings = []; // Per tenere traccia di tutte le prenotazioni importate
    
    for (const apartment of apartments) {
      try {
        // Salta appartamenti senza URL iCal configurati
        if (!apartment.icalUrls || apartment.icalUrls.length === 0) {
          results.push({
            apartmentId: apartment._id.toString(),
            name: apartment.name,
            success: true,
            message: 'Nessun feed iCal configurato',
            eventsCount: 0
          });
          continue;
        }
        
        let totalImported = 0;
        const errors = [];
        
        // Sincronizza ogni feed iCal
        for (const icalSource of apartment.icalUrls) {
          try {
            // Importa gli eventi dal feed iCal
            const events = await importICalEvents(icalSource.url);
            
            // Per ogni evento, crea o aggiorna una prenotazione
            for (const event of events) {
              try {
                // Verifica se la prenotazione esiste già
                // Check against extractedExternalId if available, otherwise fall back to uid
                const idToCheck = event.extractedExternalId || event.uid;
                const existingBooking = await BookingModel.findOne({
                  apartmentId: apartment._id,
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
                  // Prenotazione già esistente o aggiornata, salta
                  continue;
                }
                
                // Estrai informazioni dell'ospite dall'evento
                const guestInfo = extractGuestInfoFromEvent(event);
                
                // Calcola prezzo approssimativo
                const nights = Math.max(1, Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24)));
                const totalPrice = apartment.price * nights;
                
                // Determina la fonte corretta per l'enum
                let source = 'other';
                if (icalSource.source.toLowerCase().includes('airbnb')) {
                  source = 'airbnb';
                } else if (icalSource.source.toLowerCase().includes('booking')) {
                  source = 'booking';
                }
                
                // Crea una nuova prenotazione - Accetta sempre prenotazioni importate, anche con soggiorno minimo inferiore
                const booking = await BookingModel.create({
                  apartmentId: apartment._id,
                  guestName: guestInfo.name || 'Ospite',
                  guestEmail: guestInfo.email || `${source}_${uuidv4().slice(0, 8)}@example.com`,
                  guestPhone: guestInfo.phone || undefined,
                  checkIn: event.start,
                  checkOut: event.end,
                  totalPrice,
                  numberOfGuests: 1, // Default
                  status: 'confirmed',
                  paymentStatus: 'paid',
                  source,
                  externalId: event.extractedExternalId || event.uid, // Usa extractedExternalId se disponibile
                  notes: guestInfo.notes || `Importato da ${icalSource.source} iCal feed`,
                });
                
                allImportedBookings.push(booking);
                totalImported++;
              } catch (eventError) {
                errors.push({ 
                  uid: event.uid,
                  error: (eventError as Error).message,
                  start: event.start,
                  end: event.end,
                  summary: event.summary
                });
              }
            }
          } catch (sourceError) {
            errors.push({
              source: icalSource.source,
              url: icalSource.url,
              error: (sourceError as Error).message
            });
          }
        }
        
        results.push({
          apartmentId: apartment._id.toString(),
          name: apartment.name,
          success: true,
          importedCount: totalImported,
          errorsCount: errors.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (apartmentError) {
        console.error(`Error syncing apartment ${apartment._id}:`, apartmentError);
        
        results.push({
          apartmentId: apartment._id.toString(),
          name: apartment.name,
          success: false,
          error: (apartmentError as Error).message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Sincronizzati ${results.filter(r => r.success).length} su ${apartments.length} appartamenti`,
      totalImported: allImportedBookings.length,
      results
    });
  } catch (error) {
    console.error('Error in auto sync:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
