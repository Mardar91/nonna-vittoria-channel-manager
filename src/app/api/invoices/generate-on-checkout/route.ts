import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { generateInvoiceBatch } from '@/lib/invoice-generator';
import { InvoiceGenerationResult } from '@/types/invoice';

// POST: Genera automaticamente per prenotazioni al checkout
export async function POST(req: NextRequest) {
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
