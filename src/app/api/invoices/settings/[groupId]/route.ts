import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import InvoiceModel from '@/models/Invoice';
import ApartmentModel from '@/models/Apartment';

interface RouteParams {
  params: {
    groupId: string;
  };
}

// GET: Ottieni impostazioni di un gruppo specifico
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
    
    // Usa l'_id del documento MongoDB, non il groupId
    const settings = await InvoiceSettingsModel
      .findById(params.groupId)
      .populate('apartmentIds', 'name address')
      .lean();
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Gruppo di fatturazione non trovato' },
        { status: 404 }
      );
    }
    
    // Aggiungi statistiche sul gruppo
    const [invoiceCount, totalRevenue] = await Promise.all([
      InvoiceModel.countDocuments({ settingsGroupId: settings.groupId }),
      InvoiceModel.aggregate([
        { $match: { settingsGroupId: settings.groupId } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);
    
    return NextResponse.json({
      ...settings,
      statistics: {
        invoiceCount,
        totalRevenue: totalRevenue[0]?.total || 0,
        apartmentCount: settings.apartmentIds.length,
      }
    });
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Aggiorna impostazioni di un gruppo
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    
    await connectDB();
    
    // Trova il gruppo esistente
    const existingSettings = await InvoiceSettingsModel.findById(params.groupId);
    
    if (!existingSettings) {
      return NextResponse.json(
        { error: 'Gruppo di fatturazione non trovato' },
        { status: 404 }
      );
    }
    
    // Se stanno cambiando gli appartamenti, verifica che non siano già assegnati altrove
    if (data.apartmentIds && data.apartmentIds.length > 0) {
      // Verifica che gli appartamenti esistano
      const apartmentCount = await ApartmentModel.countDocuments({
        _id: { $in: data.apartmentIds }
      });
      
      if (apartmentCount !== data.apartmentIds.length) {
        return NextResponse.json(
          { error: 'Uno o più appartamenti selezionati non esistono' },
          { status: 400 }
        );
      }
      
      // Verifica conflitti con altri gruppi
      const conflictingSettings = await InvoiceSettingsModel.find({
        _id: { $ne: params.groupId }, // Escludi il gruppo corrente
        apartmentIds: { $in: data.apartmentIds }
      });
      
      if (conflictingSettings.length > 0) {
        const conflictingGroups = conflictingSettings.map(s => s.name).join(', ');
        return NextResponse.json(
          { 
            error: `Alcuni appartamenti sono già assegnati ai gruppi: ${conflictingGroups}` 
          },
          { status: 400 }
        );
      }
    }
    
    // Non permettere la modifica del groupId
    delete data.groupId;
    
    // Non permettere il reset manuale dei contatori
    delete data.lastInvoiceNumber;
    delete data.lastInvoiceYear;
    
    // Aggiorna le impostazioni
    Object.assign(existingSettings, data);
    
    // Se il tipo di attività cambia da business a tourist_rental, rimuovi i campi IVA
    if (data.activityType === 'tourist_rental') {
      existingSettings.vatRate = undefined;
      existingSettings.vatIncluded = undefined;
      existingSettings.businessVat = undefined;
    }
    
    await existingSettings.save();
    
    return NextResponse.json({
      success: true,
      settings: existingSettings,
      message: 'Impostazioni aggiornate con successo',
    });
  } catch (error) {
    console.error('Error updating invoice settings:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// DELETE: Elimina un gruppo di impostazioni
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
    
    const settings = await InvoiceSettingsModel.findById(params.groupId);
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Gruppo di fatturazione non trovato' },
        { status: 404 }
      );
    }
    
    // Verifica che non ci siano ricevute associate
    const invoiceCount = await InvoiceModel.countDocuments({ 
      settingsGroupId: settings.groupId 
    });
    
    if (invoiceCount > 0) {
      return NextResponse.json(
        { 
          error: `Non è possibile eliminare questo gruppo perché ha ${invoiceCount} ricevute associate. Archiviale o eliminale prima di procedere.` 
        },
        { status: 400 }
      );
    }
    
    // Elimina il gruppo
    await InvoiceSettingsModel.findByIdAndDelete(params.groupId);
    
    return NextResponse.json({
      success: true,
      message: 'Gruppo di fatturazione eliminato con successo',
    });
  } catch (error) {
    console.error('Error deleting invoice settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Reset contatore numerazione (endpoint separato)
export async function resetCounter(req: NextRequest, { params }: RouteParams) {
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
    
    const existingInvoices = await InvoiceModel.countDocuments({
      settingsGroupId: settings.groupId,
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
