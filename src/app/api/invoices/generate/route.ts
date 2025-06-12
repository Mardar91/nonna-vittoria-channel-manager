import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { generateInvoiceBatch, checkBookingsNeedingInvoice } from '@/lib/invoice-generator';
import { GenerateInvoiceBatch, InvoiceGenerationResult } from '@/types/invoice';

// POST: Genera ricevute in batch
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: GenerateInvoiceBatch = await req.json();
    
    // Validazione
    if (!data.bookingIds || !Array.isArray(data.bookingIds) || data.bookingIds.length === 0) {
      return NextResponse.json(
        { error: 'Fornire almeno un ID prenotazione' },
        { status: 400 }
      );
    }
    
    // Limita il batch a 50 ricevute per volta
    if (data.bookingIds.length > 50) {
      return NextResponse.json(
        { error: 'Massimo 50 ricevute per batch' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Genera le ricevute
    const results = await generateInvoiceBatch(
      data.bookingIds,
      {
        skipExisting: data.options?.skipExisting ?? true,
        sendEmails: data.options?.sendEmails ?? false,
        generatePdfs: data.options?.generatePdfs ?? true,
        lockImmediately: data.options?.lockImmediately ?? true,
        userId: session.user?.id || '1',
      }
    );
    
    // Conta successi e fallimenti
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
      message: `Generate ${successCount} ricevute su ${results.length} richieste`,
    });
  } catch (error) {
    console.error('Error in batch invoice generation:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// GET: Ottieni prenotazioni che necessitano ricevuta
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') || 'all';
    const apartmentId = url.searchParams.get('apartmentId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    
    // Query base per prenotazioni completate senza ricevuta
    let query: any = {
      status: 'completed',
      'invoiceSettings.invoiceEmitted': false,
    };
    
    // Applica filtri
    if (filter === 'confirmed_price') {
      query['invoiceSettings.priceConfirmed'] = true;
      query.totalPrice = { $gt: 0 };
    } else if (filter === 'missing_price') {
      query.$or = [
        { totalPrice: 0 },
        { totalPrice: null },
        { 'invoiceSettings.priceConfirmed': false }
      ];
    }
    
    if (apartmentId) {
      query.apartmentId = apartmentId;
    }
    
    if (dateFrom || dateTo) {
      query.checkOut = {};
      if (dateFrom) {
        query.checkOut.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.checkOut.$lte = new Date(dateTo);
      }
    }
    
    // Esegui la query
    const bookings = await BookingModel
      .find(query)
      .populate('apartmentId', 'name')
      .sort({ checkOut: -1 })
      .lean();
    
    // Per ogni prenotazione, verifica se ha impostazioni di fatturazione configurate
    const bookingsWithSettings = [];
    const bookingsWithoutSettings = [];
    
    for (const booking of bookings) {
      const settings = await InvoiceSettingsModel.findOne({
        apartmentIds: booking.apartmentId
      });
      
      if (settings) {
        bookingsWithSettings.push({
          ...booking,
          settingsGroup: {
            _id: settings._id,
            name: settings.name,
            groupId: settings.groupId,
          }
        });
      } else {
        bookingsWithoutSettings.push(booking);
      }
    }
    
    return NextResponse.json({
      bookings: bookingsWithSettings,
      bookingsWithoutSettings,
      summary: {
        total: bookings.length,
        withSettings: bookingsWithSettings.length,
        withoutSettings: bookingsWithoutSettings.length,
        readyToGenerate: bookingsWithSettings.filter(b => 
          b.totalPrice > 0 && b.invoiceSettings?.priceConfirmed
        ).length,
      }
    });
  } catch (error) {
    console.error('Error fetching bookings for invoice generation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Genera automaticamente per prenotazioni al checkout
export async function generateOnCheckout(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Trova tutte le impostazioni con generazione automatica al checkout attiva
    const autoGenerateSettings = await InvoiceSettingsModel.find({
      autoGenerateOnCheckout: true
    });
    
    if (autoGenerateSettings.length === 0) {
      return NextResponse.json({
        message: 'Nessuna configurazione con generazione automatica attiva',
        generated: 0,
      });
    }
    
    // Per ogni gruppo di impostazioni, trova le prenotazioni da processare
    const results: InvoiceGenerationResult[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const settings of autoGenerateSettings) {
      // Trova prenotazioni con checkout oggi
      const bookings = await BookingModel.find({
        apartmentId: { $in: settings.apartmentIds },
        checkOut: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: 'completed',
        'invoiceSettings.invoiceEmitted': false,
        'invoiceSettings.priceConfirmed': true,
        totalPrice: { $gt: 0 }
      });
      
      // Genera ricevute per ogni prenotazione
      for (const booking of bookings) {
        const result = await generateInvoiceBatch(
          [booking._id.toString()],
          {
            skipExisting: true,
            sendEmails: settings.sendEmailToGuest,
            generatePdfs: true,
            lockImmediately: true,
            userId: 'system',
          }
        );
        
        results.push(...result);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      message: `Generate ${successCount} ricevute automaticamente al checkout`,
    });
  } catch (error) {
    console.error('Error in automatic checkout generation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Genera automaticamente per pagamenti confermati
export async function generateOnPayment(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { bookingId } = await req.json();
    
    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId è obbligatorio' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Trova la prenotazione
    const booking = await BookingModel.findById(bookingId);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che il pagamento sia confermato
    if (booking.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Il pagamento non è stato confermato' },
        { status: 400 }
      );
    }
    
    // Verifica se ha già una ricevuta
    if (booking.invoiceSettings?.invoiceEmitted) {
      return NextResponse.json(
        { error: 'Ricevuta già emessa per questa prenotazione' },
        { status: 400 }
      );
    }
    
    // Trova le impostazioni per l'appartamento
    const settings = await InvoiceSettingsModel.findOne({
      apartmentIds: booking.apartmentId,
      autoGenerateOnPayment: true
    });
    
    if (!settings) {
      return NextResponse.json(
        { 
          error: 'Generazione automatica al pagamento non attiva per questo appartamento' 
        },
        { status: 400 }
      );
    }
    
    // Genera la ricevuta
    const result = await generateInvoiceBatch(
      [bookingId],
      {
        skipExisting: false,
        sendEmails: settings.sendEmailToGuest,
        generatePdfs: true,
        lockImmediately: true,
        userId: session.user?.id || '1',
      }
    );
    
    if (result[0]?.success) {
      return NextResponse.json({
        success: true,
        invoice: result[0],
        message: 'Ricevuta generata con successo al pagamento',
      });
    } else {
      return NextResponse.json(
        { 
          error: result[0]?.error || 'Errore nella generazione della ricevuta' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in payment-triggered generation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
