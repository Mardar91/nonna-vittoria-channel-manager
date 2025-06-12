import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking'; // Import IBooking
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { generateInvoiceBatch, checkBookingsNeedingInvoice } from '@/lib/invoice-generator';
import { GenerateInvoiceBatch } from '@/types/invoice';

// Define an interface for the objects in bookingsWithSettings
interface BookingWithSettings extends IBooking {
  settingsGroup: {
    _id: any; // Consider using mongoose.Types.ObjectId if available and appropriate
    name: string;
    groupId: string;
  };
}

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
    const bookingsQueryResult = await BookingModel
      .find(query)
      .select('+totalPrice +invoiceSettings') // Explicitly select potentially missing fields
      .populate('apartmentId', 'name')
      .sort({ checkOut: -1 })
      .lean(); // Plain lean, result type is likely any[] or (Document & {_id: Types.ObjectId})[]
    
    // Ensure bookingsQueryResult is treated as an array
    const bookingsArray = Array.isArray(bookingsQueryResult) ? bookingsQueryResult : [];

    // Per ogni prenotazione, verifica se ha impostazioni di fatturazione configurate
    const bookingsWithSettings: BookingWithSettings[] = []; // Explicitly type here
    const bookingsWithoutSettings: IBooking[] = [];         // And here for consistency
    
    for (const booking of bookingsArray) {
      // Cast the individual 'booking' object (from plain lean()) to IBooking.
      // Use 'as unknown as IBooking' if direct cast fails due to type mismatch.
      const currentBooking = booking as unknown as IBooking;
      const settings = await InvoiceSettingsModel.findOne({
        // apartmentId from lean booking might be ObjectId, ensure it's string for query
        apartmentIds: typeof currentBooking.apartmentId === 'string' ? currentBooking.apartmentId : String(currentBooking.apartmentId)
      });
      
      if (settings) {
        bookingsWithSettings.push({
          ...(currentBooking as any), // Spread as any to avoid intermediate type conflicts
          settingsGroup: {
            _id: settings._id,
            name: settings.name,
            groupId: settings.groupId,
          }
        });
      } else {
        bookingsWithoutSettings.push(currentBooking);
      }
    }
    
    return NextResponse.json({
      bookings: bookingsWithSettings,
      bookingsWithoutSettings,
      summary: {
        total: bookingsArray.length, // Corrected variable name
        withSettings: bookingsWithSettings.length,
        withoutSettings: bookingsWithoutSettings.length,
        readyToGenerate: bookingsWithSettings.filter(b => 
          b.totalPrice && b.totalPrice > 0 && b.invoiceSettings?.priceConfirmed
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
