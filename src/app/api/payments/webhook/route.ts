import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking'; // Importa anche IBooking
import stripe from '@/lib/stripe';
import mongoose from 'mongoose'; // Importa mongoose

// Funzione helper per verificare la disponibilità finale PRIMA di confermare
// Controlla se esistono ALTRE prenotazioni CONFERMATE nello stesso periodo
const checkFinalAvailability = async (bookingToCheck: IBooking): Promise<boolean> => {
  try {
    const conflictingBooking = await BookingModel.findOne({
      _id: { $ne: bookingToCheck._id }, // Escludi la prenotazione corrente
      apartmentId: bookingToCheck.apartmentId,
      status: 'confirmed', // Controlla solo contro altre prenotazioni GIA' confermate
      $or: [ // Logica di overlap
        { checkIn: { $lt: bookingToCheck.checkOut }, checkOut: { $gt: bookingToCheck.checkIn } }
      ]
    });
    // console.log(`Final availability check for booking ${bookingToCheck._id}: Conflict found?`, !!conflictingBooking);
    return !conflictingBooking; // Ritorna true se NON ci sono conflitti (disponibile)
  } catch (error) {
      console.error(`Error during final availability check for booking ${bookingToCheck._id}:`, error);
      return false; // Se c'è errore nel check, considera non disponibile per sicurezza
  }
};


export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ FATAL: Missing Stripe webhook secret');
    // Non rispondere con dettagli interni
    return NextResponse.json({ error: 'Webhook configuration error.' }, { status: 500 });
  }

  let event;
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature') || '';
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`🔔 Received Stripe event: ${event.type} (ID: ${event.id})`);

  try {
      await connectDB(); // Connetti al DB DOPO la verifica della firma

      // --- Gestione checkout.session.completed ---
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any; // Usa tipo Stripe.Checkout.Session se installato
        const metadata = session.metadata;

        if (!metadata) {
            console.error(`❌ Webhook Error: Missing metadata for completed session ${session.id}`);
            return NextResponse.json({ received: true, status: 'error', message: 'Missing metadata' });
        }

        console.log(`✅ Processing checkout.session.completed for session: ${session.id}`);
        const isGroupBooking = metadata.isGroupBooking === 'true';

        if (isGroupBooking) {
            // --- Gestione Gruppo ---
            const groupBookingIds = metadata.groupBookingIds ? metadata.groupBookingIds.split(',') : [];
            if (groupBookingIds.length === 0) {
                 console.error(`❌ Webhook Error: Group booking session ${session.id} completed but no groupBookingIds in metadata.`);
                 return NextResponse.json({ received: true, status: 'error', message: 'Missing group booking IDs' });
            }

            const validGroupIds = groupBookingIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validGroupIds.length !== groupBookingIds.length) {
                console.error(`❌ Webhook Error: Invalid ObjectIds in groupBookingIds for session ${session.id}: ${groupBookingIds.join(',')}`);
                return NextResponse.json({ received: true, status: 'error', message: 'Invalid group booking IDs format' });
            }

            // Trova tutte le prenotazioni PENDING del gruppo associate a questa sessione
            // Usa $in per efficienza
            const groupBookings = await BookingModel.find({
                _id: { $in: validGroupIds },
                paymentId: session.id,
                status: 'pending'
            });

            if (groupBookings.length === 0) {
                console.warn(`⚠️ Webhook Warning: No pending bookings found for group session ${session.id} and IDs ${validGroupIds.join(',')}. Already processed or cancelled?`);
                return NextResponse.json({ received: true, status: 'warning', message: 'No matching pending group bookings found (maybe processed?)' });
            }
            // Log se mancano alcune prenotazioni previste
            if (groupBookings.length < validGroupIds.length) {
                 const foundIds = groupBookings.map(b => b._id.toString());
                 const missingIds = validGroupIds.filter(id => !foundIds.includes(id));
                 console.warn(`⚠️ Webhook Warning: Found only ${groupBookings.length}/${validGroupIds.length} bookings for group session ${session.id}. Missing IDs: ${missingIds.join(',')}`);
            }

            // Verifica disponibilità finale per OGNI prenotazione nel gruppo
            let allAvailable = true;
            const availabilityChecks = await Promise.all(
                groupBookings.map(async (booking) => {
                    const isAvailable = await checkFinalAvailability(booking);
                    if (!isAvailable) {
                        console.error(`❌ Availability Conflict Detected for booking ${booking._id} (Part of group session ${session.id})`);
                        allAvailable = false;
                    }
                    return isAvailable;
                })
            );

            if (!allAvailable) {
                // CONFLITTO GRUPPO: Cancella TUTTE le prenotazioni PENDING associate a questa sessione
                console.error(`❌ Availability Conflict in group session ${session.id}. Cancelling all related pending bookings.`);
                const updateResult = await BookingModel.updateMany(
                    { _id: { $in: groupBookings.map(b => b._id) } }, // Solo quelle trovate pending
                    {
                        status: 'cancelled',
                        paymentStatus: 'failed', // Pagamento ricevuto ma prenotazione fallita
                        notes: `Cancellata automaticamente per conflitto disponibilità post-pagamento (gruppo sessione ${session.id}). Richiede rimborso.`
                    }
                );
                console.log(`Cancelled ${updateResult.modifiedCount} bookings due to group conflict.`);
                 // !!! IMPORTANTE: Notifica admin/utente per RIMBORSO !!!
                 // await sendRefundNotification(session.id, groupBookings);

            } else {
                // NESSUN CONFLITTO GRUPPO: Conferma tutte le prenotazioni
                 console.log(`✅ Group ${validGroupIds.join(',')} availability confirmed. Updating status to confirmed/paid.`);
                const confirmResult = await BookingModel.updateMany(
                    { _id: { $in: groupBookings.map(b => b._id) } },
                    {
                        status: 'confirmed',
                        paymentStatus: 'paid',
                        paymentId: session.id // Assicura sia l'ID della sessione completata
                    }
                );
                 console.log(`Confirmed ${confirmResult.modifiedCount} group bookings for session ${session.id}`);
                 // await sendConfirmationEmails(groupBookings);
            }

        } else {
            // --- Gestione Singola ---
            const bookingId = metadata.bookingId;
            if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
                console.error(`❌ Webhook Error: Missing or invalid bookingId in metadata for single booking session ${session.id}`);
                return NextResponse.json({ received: true, status: 'error', message: 'Missing or invalid booking ID' });
            }

            // Trova la prenotazione PENDING associata
            const booking = await BookingModel.findOne({
                _id: bookingId,
                paymentId: session.id,
                status: 'pending'
            });

            if (!booking) {
                console.warn(`⚠️ Webhook Warning: No pending booking found for session ${session.id}, bookingId ${bookingId}. Already processed or cancelled?`);
                return NextResponse.json({ received: true, status: 'warning', message: 'No matching pending booking found (maybe processed?)' });
            }

            // VERIFICA FINALE DISPONIBILITA'
            const isAvailable = await checkFinalAvailability(booking);

            if (!isAvailable) {
                // CONFLITTO SINGOLO: Cancella e marca per rimborso
                console.error(`❌ Availability Conflict Detected for booking ${bookingId} (session ${session.id}). Cannot confirm.`);
                booking.status = 'cancelled';
                booking.paymentStatus = 'failed';
                booking.notes = `Cancellata automaticamente per conflitto disponibilità post-pagamento (sessione ${session.id}). Richiede rimborso.`;
                await booking.save();
                 console.log(`Cancelled booking ${bookingId} due to conflict.`);
                 // !!! IMPORTANTE: Notifica admin/utente per RIMBORSO !!!
                 // await sendRefundNotification(session.id, [booking]);
            } else {
                // NESSUN CONFLITTO SINGOLO: Conferma
                console.log(`✅ Booking ${bookingId} availability confirmed. Updating status to confirmed/paid.`);
                booking.status = 'confirmed';
                booking.paymentStatus = 'paid';
                booking.paymentId = session.id; // Assicura ID corretto
                await booking.save();
                 console.log(`Confirmed booking ${bookingId} for session ${session.id}`);
                 // await sendConfirmationEmail(booking);
            }
        }
        // Risposta di successo generica per l'evento completato
        return NextResponse.json({ received: true, status: 'success', message: 'Webhook processed successfully.' });

      // --- Gestione checkout.session.expired ---
      } else if (event.type === 'checkout.session.expired') {
        const session = event.data.object as any;
        const metadata = session.metadata;

        if (!metadata) {
            console.warn(`⚠️ Webhook Warning: Missing metadata for expired session ${session.id}`);
             // Non è un errore critico, ma loggalo
            return NextResponse.json({ received: true, status: 'warning', message: 'Missing metadata for expired session' });
        }

        console.log(`⌛ Processing checkout.session.expired for session: ${session.id}`);
        const isGroupBooking = metadata.isGroupBooking === 'true';

        if (isGroupBooking) {
            const groupBookingIds = metadata.groupBookingIds ? metadata.groupBookingIds.split(',') : [];
            const validGroupIds = groupBookingIds.filter(id => mongoose.Types.ObjectId.isValid(id));

            if (validGroupIds.length > 0) {
                // Aggiorna paymentStatus a 'failed' per le prenotazioni PENDING del gruppo
                // Lo stato della prenotazione rimane 'pending' (o potresti cambiarlo a 'cancelled')
                 const result = await BookingModel.updateMany(
                    { _id: { $in: validGroupIds }, paymentId: session.id, status: 'pending' },
                    { paymentStatus: 'failed' } // Non cambia lo stato a 'cancelled' qui
                 );
                 console.log(`Updated ${result.modifiedCount} group bookings to paymentStatus: failed for expired session ${session.id}`);
            } else {
                 console.warn(`⚠️ Expired group session ${session.id} had no valid groupBookingIds in metadata.`);
            }
        } else {
            const bookingId = metadata.bookingId;
            if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
                // Trova la prenotazione PENDING e aggiorna paymentStatus
                 const result = await BookingModel.updateOne(
                     { _id: bookingId, paymentId: session.id, status: 'pending' },
                     { paymentStatus: 'failed' }
                 );
                 if (result.modifiedCount > 0) {
                    console.log(`Updated booking ${bookingId} to paymentStatus: failed for expired session ${session.id}`);
                 } else {
                    console.warn(`⚠️ No pending booking found or updated for expired session ${session.id}, bookingId ${bookingId}`);
                 }
            } else {
                 console.warn(`⚠️ Expired session ${session.id} had missing or invalid bookingId in metadata.`);
            }
        }
        return NextResponse.json({ received: true, status: 'processed_expiry' });

      // --- Gestisci altri eventi (es. pagamento fallito inizialmente) ---
      } else if (event.type === 'checkout.session.async_payment_failed') {
          const session = event.data.object as any;
          console.log(`❌ Async payment failed for session: ${session.id}`);
          // Simile a expired, aggiorna paymentStatus a 'failed'
           const metadata = session.metadata;
           if(metadata?.bookingId || metadata?.groupBookingIds) {
               // Implementa logica simile a 'expired' per aggiornare paymentStatus
               // ... (codice omesso per brevità, ma è simile a quello di 'expired')
           }
          return NextResponse.json({ received: true, status: 'processed_async_fail' });

      } else {
        console.log(`🤷 Unhandled Stripe event type: ${event.type}`);
      }

      // Risposta di default per eventi gestiti o non gestiti (ma ricevuti)
      return NextResponse.json({ received: true });

  } catch (dbError) {
      // Errore durante connessione DB o operazioni DB
      console.error(`❌ Database or processing error during webhook handling for event ${event.id}:`, dbError);
      // Ritorna 500 per indicare a Stripe di riprovare (se applicabile)
      return NextResponse.json({ error: 'Internal server error during webhook processing.' }, { status: 500 });
  }
}
