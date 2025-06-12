import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceSettingsModel, { IInvoiceSettings } from '@/models/InvoiceSettings'; // Import IInvoiceSettings
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
    
    // Force cast the lean object to IInvoiceSettings
    const typedSettings = settings as unknown as IInvoiceSettings;

    // Aggiungi statistiche sul gruppo
    const [invoiceCount, totalRevenue] = await Promise.all([
      InvoiceModel.countDocuments({ settingsGroupId: typedSettings.groupId }),
      InvoiceModel.aggregate([
        { $match: { settingsGroupId: typedSettings.groupId } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);
    
    return NextResponse.json({
      // Ensure all necessary properties from IInvoiceSettings are spread if typedSettings is used directly
      // Or access them individually:
      _id: typedSettings._id,
      groupId: typedSettings.groupId,
      name: typedSettings.name,
      apartmentIds: typedSettings.apartmentIds,
      businessName: typedSettings.businessName,
      businessAddress: typedSettings.businessAddress,
      businessCity: typedSettings.businessCity,
      businessZip: typedSettings.businessZip,
      businessProvince: typedSettings.businessProvince,
      businessCountry: typedSettings.businessCountry,
      businessVat: typedSettings.businessVat,
      businessTaxCode: typedSettings.businessTaxCode,
      businessEmail: typedSettings.businessEmail,
      businessPhone: typedSettings.businessPhone,
      activityType: typedSettings.activityType,
      vatRate: typedSettings.vatRate,
      vatIncluded: typedSettings.vatIncluded,
      withholdingTaxInfo: typedSettings.withholdingTaxInfo,
      numberingFormat: typedSettings.numberingFormat,
      numberingPrefix: typedSettings.numberingPrefix,
      lastInvoiceNumber: typedSettings.lastInvoiceNumber,
      lastInvoiceYear: typedSettings.lastInvoiceYear,
      resetNumberingYearly: typedSettings.resetNumberingYearly,
      platformSettings: typedSettings.platformSettings,
      invoiceFooter: typedSettings.invoiceFooter,
      paymentTerms: typedSettings.paymentTerms,
      bankDetails: typedSettings.bankDetails,
      autoGenerateOnCheckout: typedSettings.autoGenerateOnCheckout,
      autoGenerateOnPayment: typedSettings.autoGenerateOnPayment,
      sendEmailToGuest: typedSettings.sendEmailToGuest,
      emailTemplate: typedSettings.emailTemplate,
      logoUrl: typedSettings.logoUrl,
      primaryColor: typedSettings.primaryColor,
      createdAt: typedSettings.createdAt,
      updatedAt: typedSettings.updatedAt,
      statistics: {
        invoiceCount,
        totalRevenue: totalRevenue[0]?.total || 0,
        apartmentCount: typedSettings.apartmentIds?.length || 0, // Add null check for safety
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
    
    // Force cast the lean object to IInvoiceSettings for the DELETE operation as well
    // Note: In DELETE, `settings` comes from `InvoiceSettingsModel.findById(params.groupId)` without `.lean()`
    // So, it's a full Mongoose document. Accessing `settings.groupId` should be fine.
    // The original error was in GET. If DELETE also had an error, it might need a different fix.
    // For now, assuming the problem was primarily with the .lean() object in GET.
    // If `settings` in DELETE is a full document, `settings.groupId` is fine.
    // If it were also a lean object, it would need `as unknown as IInvoiceSettings`.
    // The error message pointed to the GET handler, so let's stick to that.
    // The original code for DELETE was:
    // const settings = await InvoiceSettingsModel.findById(params.groupId);
    // ...
    // settingsGroupId: settings.groupId
    // This should be okay if `settings` is a full Mongoose document.
    // I will only change the GET part as per the error.
    // Re-confirming: The build error was specific to settings.groupId in the GET handler's lean object.
    // The DELETE handler uses a full Mongoose document for `settings`.

    // For DELETE, if `settings` is a full Mongoose document, direct access is fine.
    // The previous solution had `const typedSettings = settings as IInvoiceSettings;`
    // which would also work for a full document. Let's keep it consistent if it helps.
    const typedSettingsForDelete = settings as IInvoiceSettings;


    // Verifica che non ci siano ricevute associate
    const invoiceCount = await InvoiceModel.countDocuments({ 
      settingsGroupId: typedSettingsForDelete.groupId
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
