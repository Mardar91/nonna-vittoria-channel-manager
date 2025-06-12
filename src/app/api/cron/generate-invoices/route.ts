import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import NotificationModel from '@/models/Notification';
import { generateInvoiceBatch } from '@/lib/invoice-generator';

// GET: Genera automaticamente ricevute per checkout di oggi (chiamato da cron job)
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
    
    // Trova tutte le impostazioni con generazione automatica attiva
    const autoGenerateSettings = await InvoiceSettingsModel.find({
      autoGenerateOnCheckout: true
    });
    
    if (autoGenerateSettings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessuna configurazione con generazione automatica attiva',
        generated: 0,
      });
    }
    
    // Data di oggi per i checkout
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const results = [];
    let totalGenerated = 0;
    let totalFailed = 0;
    
    // Per ogni gruppo di impostazioni
    for (const settings of autoGenerateSettings) {
      // Trova prenotazioni con checkout oggi
      const bookings = await BookingModel.find({
        apartmentId: { $in: settings.apartmentIds },
        checkOut: {
          $gte: today,
          $lt: tomorrow
        },
        status: 'completed',
        'invoiceSettings.invoiceEmitted': false,
        'invoiceSettings.priceConfirmed': true,
        'invoiceSettings.requiresInvoice': { $ne: false }, // Escludi quelle marcate come "ignora"
        totalPrice: { $gt: 0 }
      }).populate('apartmentId', 'name');
      
      console.log(`[CRON] Found ${bookings.length} bookings for auto-generation in group ${settings.name}`);
      
      // Genera ricevute per ogni prenotazione
      if (bookings.length > 0) {
        const bookingIds = bookings.map(b => b._id.toString());
        
        const batchResults = await generateInvoiceBatch(
          bookingIds,
          {
            skipExisting: true,
            sendEmails: settings.sendEmailToGuest,
            generatePdfs: true,
            lockImmediately: true,
            userId: 'system-cron',
          }
        );
        
        // Conta successi e fallimenti
        const succeeded = batchResults.filter(r => r.success);
        const failed = batchResults.filter(r => !r.success);
        
        totalGenerated += succeeded.length;
        totalFailed += failed.length;
        
        results.push({
          groupName: settings.name,
          groupId: settings.groupId,
          bookingsProcessed: bookings.length,
          succeeded: succeeded.length,
          failed: failed.length,
          failures: failed.map(f => ({
            bookingId: f.bookingId,
            error: f.error
          }))
        });
        
        // Crea notifica riepilogativa se ci sono ricevute generate
        if (succeeded.length > 0) {
          await NotificationModel.create({
            userId: '1', // Admin
            type: 'new_booking',
            title: 'Ricevute Generate Automaticamente',
            message: `Generate ${succeeded.length} ricevute per il gruppo ${settings.name} (checkout oggi)`,
            relatedModel: 'Booking',
            relatedId: succeeded[0].bookingId || bookings[0]._id.toString(),
            metadata: {
              groupName: settings.name,
              totalGenerated: succeeded.length,
              apartmentName: bookings[0].apartmentId?.name || 'N/A'
            },
          });
        }
      }
    }
    
    // Log risultati
    console.log(`[CRON] Auto-generation completed:`, {
      totalGenerated,
      totalFailed,
      groupsProcessed: results.length,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        totalGenerated,
        totalFailed,
        groupsProcessed: results.length,
      },
      results,
      message: `Generate ${totalGenerated} ricevute automaticamente`,
    });
    
  } catch (error) {
    console.error('[CRON] Error in auto-generation:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// POST: Forza generazione manuale per una data specifica (per admin)
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
    
    const { date, groupId } = await req.json();
    
    await connectDB();
    
    // Se specificata una data, usa quella invece di oggi
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Filtra per gruppo specifico se fornito
    const settingsQuery: any = { autoGenerateOnCheckout: true };
    if (groupId) {
      settingsQuery.groupId = groupId;
    }
    
    const autoGenerateSettings = await InvoiceSettingsModel.find(settingsQuery);
    
    if (autoGenerateSettings.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nessuna configurazione trovata',
        generated: 0,
      });
    }
    
    const results = [];
    let totalGenerated = 0;
    
    for (const settings of autoGenerateSettings) {
      const bookings = await BookingModel.find({
        apartmentId: { $in: settings.apartmentIds },
        checkOut: {
          $gte: targetDate,
          $lt: nextDay
        },
        status: 'completed',
        'invoiceSettings.invoiceEmitted': false,
        'invoiceSettings.priceConfirmed': true,
        'invoiceSettings.requiresInvoice': { $ne: false },
        totalPrice: { $gt: 0 }
      });
      
      if (bookings.length > 0) {
        const bookingIds = bookings.map(b => b._id.toString());
        
        const batchResults = await generateInvoiceBatch(
          bookingIds,
          {
            skipExisting: true,
            sendEmails: false, // Non inviare email nella generazione manuale
            generatePdfs: true,
            lockImmediately: true,
            userId: session.user?.id || '1',
          }
        );
        
        const succeeded = batchResults.filter(r => r.success).length;
        totalGenerated += succeeded;
        
        results.push({
          groupName: settings.name,
          bookingsFound: bookings.length,
          invoicesGenerated: succeeded,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      totalGenerated,
      results,
      message: `Generate ${totalGenerated} ricevute per la data ${targetDate.toLocaleDateString('it-IT')}`,
    });
    
  } catch (error) {
    console.error('Error in manual generation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
