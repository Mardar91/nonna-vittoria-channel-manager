import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import InvoiceModel from '@/models/Invoice';

interface RouteParams {
  params: {
    groupId: string;
  };
}

// POST: Reset contatore numerazione
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { year } = await req.json();

    if (!year || year < 2020 || year > 2100) {
      return NextResponse.json(
        { error: 'Anno non valido' },
        { status: 400 }
      );
    }

    await connectDB();

    // Note: The original route used params.groupId as the MongoDB _id.
    // If groupId in InvoiceSettingsModel refers to the 'groupId' field, this needs adjustment.
    // Assuming params.groupId is indeed the MongoDB _id for InvoiceSettingsModel here.
    const settings = await InvoiceSettingsModel.findById(params.groupId);

    if (!settings) {
      return NextResponse.json(
        { error: 'Gruppo di fatturazione non trovato' },
        { status: 404 }
      );
    }

    // Verifica che non ci siano già ricevute per l'anno specificato
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Important: Use the actual settings.groupId for querying invoices,
    // not params.groupId if params.groupId is the MongoDB _id.
    const existingInvoices = await InvoiceModel.countDocuments({
      settingsGroupId: settings.groupId, // This assumes 'settings.groupId' is the field linking invoices to settings groups
      invoiceDate: { $gte: startOfYear, $lte: endOfYear }
    });

    if (existingInvoices > 0) {
      return NextResponse.json(
        {
          error: `Esistono già ${existingInvoices} ricevute per l'anno ${year}. Il reset del contatore non è possibile.`
        },
        { status: 400 }
      );
    }

    // Reset del contatore
    settings.lastInvoiceNumber = 0;
    settings.lastInvoiceYear = year;
    await settings.save();

    return NextResponse.json({
      success: true,
      message: `Contatore resettato per l'anno ${year}`,
      settings: {
        lastInvoiceNumber: settings.lastInvoiceNumber,
        lastInvoiceYear: settings.lastInvoiceYear,
      }
    });
  } catch (error) {
    console.error('Error resetting counter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
