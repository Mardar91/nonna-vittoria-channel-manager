import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Blocca una ricevuta (rendendola immutabile)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const invoice = await InvoiceModel.findById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che non sia già bloccata
    if (invoice.isLocked) {
      return NextResponse.json(
        { error: 'La ricevuta è già bloccata' },
        { status: 400 }
      );
    }
    
    // Verifica che non sia annullata
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Non è possibile bloccare una ricevuta annullata' },
        { status: 400 }
      );
    }
    
    // Blocca la ricevuta
    await invoice.lock();
    
    return NextResponse.json({
      success: true,
      message: 'Ricevuta bloccata con successo',
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        isLocked: invoice.isLocked,
        lockedAt: invoice.lockedAt,
        status: invoice.status,
      },
    });
  } catch (error) {
    console.error('Error locking invoice:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
