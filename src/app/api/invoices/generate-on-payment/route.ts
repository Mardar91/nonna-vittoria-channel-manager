import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import { generateInvoiceBatch } from '@/lib/invoice-generator';

// POST: Genera automaticamente per pagamenti confermati
export async function POST(req: NextRequest) {
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
