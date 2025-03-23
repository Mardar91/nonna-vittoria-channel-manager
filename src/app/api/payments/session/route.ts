// src/app/api/payments/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import stripe from '@/lib/stripe';

// Questa riga è importante! Indica a Next.js che questa route è sempre dinamica
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }
    
    // Ottieni dettagli della sessione da Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    await connectDB();
    
    // Verifica se è una prenotazione di gruppo
    const isGroupBooking = session.metadata?.isGroupBooking === 'true';
    
    if (isGroupBooking) {
      // Per prenotazioni di gruppo
      const groupBookingIds = session.metadata?.groupBookingIds?.split(',') || [];
      
      if (groupBookingIds.length === 0) {
        return NextResponse.json(
          { error: 'No group booking IDs found' },
          { status: 404 }
        );
      }
      
      // Trova tutte le prenotazioni del gruppo
      const groupBookings = await BookingModel.find({
        _id: { $in: groupBookingIds }
      });
      
      // Trova tutti gli appartamenti
      const apartmentIds = groupBookings.map(booking => booking.apartmentId);
      const apartments = await ApartmentModel.find({
        _id: { $in: apartmentIds }
      });
      
      // Mappa appartamenti per ID per un accesso facile
      const apartmentsMap = apartments.reduce((map, apt) => {
        map[apt._id.toString()] = apt;
        return map;
      }, {} as Record<string, any>);
      
      // Formatta la risposta
      return NextResponse.json({
        referenceId: groupBookingIds[0].substring(0, 8),
        email: session.customer_details?.email,
        isGroupBooking: true,
        checkIn: session.metadata?.checkIn,
        checkOut: session.metadata?.checkOut,
        amount: session.amount_total,
        date: new Date(session.created * 1000).toLocaleDateString('it-IT'),
        apartments: groupBookings.map(booking => ({
          id: booking._id,
          name: apartmentsMap[booking.apartmentId.toString()]?.name || 'Appartamento',
          price: booking.totalPrice
        }))
      });
    } else {
      // Per prenotazione singola
      const bookingId = session.metadata?.bookingId;
      
      if (!bookingId) {
        return NextResponse.json(
          { error: 'No booking ID found' },
          { status: 404 }
        );
      }
      
      // Trova la prenotazione
      const booking = await BookingModel.findById(bookingId);
      
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }
      
      // Trova l'appartamento
      const apartment = await ApartmentModel.findById(booking.apartmentId);
      
      // Formatta la risposta
      return NextResponse.json({
        referenceId: booking._id.toString().substring(0, 8),
        email: session.customer_details?.email,
        isGroupBooking: false,
        checkIn: session.metadata?.checkIn,
        checkOut: session.metadata?.checkOut,
        amount: session.amount_total,
        date: new Date(session.created * 1000).toLocaleDateString('it-IT'),
        apartmentName: apartment?.name || 'Appartamento'
      });
    }
  } catch (error) {
    console.error('Error fetching session details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
