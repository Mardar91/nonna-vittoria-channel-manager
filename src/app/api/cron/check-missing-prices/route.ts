import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import NotificationModel from '@/models/Notification';
import ApartmentModel from '@/models/Apartment';
import { checkBookingsMissingPrice } from '@/lib/invoice-generator';

// GET: Controlla prenotazioni con prezzi mancanti (può essere chiamato da cron job)
export async function GET(req: NextRequest) {
  try {
    // Verifica autorizzazione (in produzione usa una chiave API segreta)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Trova prenotazioni che necessitano attenzione
    const bookingsWithMissingPrice = await checkBookingsMissingPrice();
    
    // Crea notifiche per prenotazioni critiche (checkout > 30 giorni fa)
    const criticalBookings = [];
    const warningBookings = [];
    
    for (const booking of bookingsWithMissingPrice) {
      const daysSinceCheckout = Math.floor(
        (new Date().getTime() - new Date(booking.checkOut).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceCheckout > 30) {
        criticalBookings.push({
          booking,
          daysSinceCheckout
        });
        
        // Verifica se esiste già una notifica recente
        const recentNotification = await NotificationModel.findOne({
          relatedId: booking._id,
          type: 'booking_inquiry',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 giorni
        });
        
        if (!recentNotification) {
          // Crea notifica solo se non ne esiste una recente
          const apartment = await ApartmentModel.findById(booking.apartmentId).select('name');
          
          await NotificationModel.create({
            userId: '1', // Admin
            type: 'booking_inquiry',
            title: 'Prenotazione con prezzo mancante - URGENTE',
            message: `La prenotazione di ${booking.guestName} per ${apartment?.name} è conclusa da ${daysSinceCheckout} giorni ma non ha ancora un prezzo confermato.`,
            relatedModel: 'Booking',
            relatedId: booking._id,
            apartmentId: booking.apartmentId,
            metadata: {
              guestName: booking.guestName,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              source: booking.source,
              apartmentName: apartment?.name,
            },
          });
        }
      } else if (daysSinceCheckout > 14) {
        warningBookings.push({
          booking,
          daysSinceCheckout
        });
      }
    }
    
    // Log risultati
    console.log(`[CRON] Check missing prices completed:`, {
      totalMissingPrices: bookingsWithMissingPrice.length,
      critical: criticalBookings.length,
      warning: warningBookings.length,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        totalChecked: bookingsWithMissingPrice.length,
        critical: criticalBookings.length,
        warning: warningBookings.length,
        notificationsCreated: criticalBookings.length
      },
      criticalBookings: criticalBookings.map(cb => ({
        bookingId: cb.booking._id,
        guestName: cb.booking.guestName,
        checkOut: cb.booking.checkOut,
        daysSinceCheckout: cb.daysSinceCheckout,
        source: cb.booking.source
      })),
      message: `Trovate ${criticalBookings.length} prenotazioni critiche senza prezzo`
    });
    
  } catch (error) {
    console.error('[CRON] Error checking missing prices:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// POST: Forza il controllo manuale (per admin)
export async function POST(req: NextRequest) {
  try {
    // Verifica sessione admin
    const { getServerSession } = await import('next-auth/next');
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Esegui lo stesso controllo del GET
    return GET(req);
    
  } catch (error) {
    console.error('Error in manual check:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
