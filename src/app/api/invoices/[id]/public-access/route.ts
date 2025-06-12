import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceModel from '@/models/Invoice';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Genera o rigenera link di accesso pubblico
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const expiryDays = data.expiryDays || 30; // Default 30 giorni
    const regenerate = data.regenerate || false; // Se true, rigenera anche se esiste

    await connectDB();
    
    const invoice = await InvoiceModel.findById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    // Verifica che non sia in bozza
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Non è possibile generare un link pubblico per una ricevuta in bozza' },
        { status: 400 }
      );
    }
    
    // Verifica che non sia annullata
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Non è possibile generare un link pubblico per una ricevuta annullata' },
        { status: 400 }
      );
    }
    
    // Se ha già un codice valido e non è richiesta la rigenerazione
    if (invoice.publicAccessCode && !regenerate) {
      // Verifica se è scaduto
      if (invoice.publicAccessExpiry && new Date(invoice.publicAccessExpiry) > new Date()) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || '';
        
        return NextResponse.json({
          success: true,
          accessCode: invoice.publicAccessCode,
          publicUrl: `${baseUrl}/invoices/download?code=${invoice.publicAccessCode}`,
          expiresAt: invoice.publicAccessExpiry,
          message: 'Link pubblico esistente ancora valido',
        });
      }
    }
    
    // Genera nuovo codice
    const newCode = await invoice.generatePublicAccessCode();
    
    // Imposta scadenza personalizzata se diversa dal default
    if (expiryDays !== 30) {
      invoice.publicAccessExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      await invoice.save();
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || '';
    const publicUrl = `${baseUrl}/invoices/download?code=${newCode}`;
    
    return NextResponse.json({
      success: true,
      accessCode: newCode,
      publicUrl,
      expiresAt: invoice.publicAccessExpiry,
      message: regenerate ? 'Link pubblico rigenerato con successo' : 'Link pubblico generato con successo',
    });
  } catch (error) {
    console.error('Error generating public access:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET: Ottieni informazioni sul link pubblico
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const invoice = await InvoiceModel.findById(params.id).select(
      'publicAccessCode publicAccessExpiry status'
    );
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || '';
    
    return NextResponse.json({
      hasPublicAccess: !!invoice.publicAccessCode,
      publicAccessCode: invoice.publicAccessCode,
      publicUrl: invoice.publicAccessCode ? `${baseUrl}/invoices/download?code=${invoice.publicAccessCode}` : null,
      expiresAt: invoice.publicAccessExpiry,
      isExpired: invoice.publicAccessExpiry ? new Date(invoice.publicAccessExpiry) < new Date() : false,
      canGenerate: invoice.status !== 'draft' && invoice.status !== 'cancelled',
    });
  } catch (error) {
    console.error('Error fetching public access info:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Revoca accesso pubblico
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
    
    if (!invoice.publicAccessCode) {
      return NextResponse.json(
        { error: 'Nessun link pubblico da revocare' },
        { status: 400 }
      );
    }
    
    // Revoca l'accesso
    invoice.publicAccessCode = undefined;
    invoice.publicAccessExpiry = undefined;
    await invoice.save();
    
    return NextResponse.json({
      success: true,
      message: 'Accesso pubblico revocato con successo',
    });
  } catch (error) {
    console.error('Error revoking public access:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
