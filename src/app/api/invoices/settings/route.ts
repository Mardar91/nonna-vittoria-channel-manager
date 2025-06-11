import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import InvoiceSettingsModel from '@/models/InvoiceSettings';
import ApartmentModel from '@/models/Apartment';

// GET: Ottieni tutte le configurazioni di fatturazione
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
    
    // Ottieni tutti i gruppi di impostazioni
    const settings = await InvoiceSettingsModel
      .find({})
      .sort({ name: 1 })
      .lean();
    
    // Per ogni gruppo, conta gli appartamenti assegnati
    const settingsWithCounts = await Promise.all(
      settings.map(async (setting) => {
        const apartmentCount = await ApartmentModel.countDocuments({
          _id: { $in: setting.apartmentIds }
        });
        
        return {
          ...setting,
          apartmentCount,
        };
      })
    );
    
    return NextResponse.json(settingsWithCounts);
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Crea nuovo gruppo di impostazioni
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    
    // Validazione base
    if (!data.groupId || !data.name || !data.businessName || !data.businessTaxCode) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }
    
    // Validazione appartamenti
    if (!data.apartmentIds || data.apartmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Seleziona almeno un appartamento per questo gruppo' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Verifica che il groupId sia univoco
    const existingGroup = await InvoiceSettingsModel.findOne({ 
      groupId: data.groupId 
    });
    
    if (existingGroup) {
      return NextResponse.json(
        { error: 'Un gruppo con questo ID esiste già' },
        { status: 400 }
      );
    }
    
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
    
    // Verifica che gli appartamenti non siano già assegnati ad un altro gruppo
    const assignedApartments = await InvoiceSettingsModel.find({
      apartmentIds: { $in: data.apartmentIds }
    });
    
    if (assignedApartments.length > 0) {
      const conflictingGroups = assignedApartments.map(s => s.name).join(', ');
      return NextResponse.json(
        { 
          error: `Alcuni appartamenti sono già assegnati ai gruppi: ${conflictingGroups}` 
        },
        { status: 400 }
      );
    }
    
    // Imposta valori di default se non forniti
    const settingsData = {
      ...data,
      lastInvoiceNumber: data.lastInvoiceNumber || 0,
      lastInvoiceYear: data.lastInvoiceYear || new Date().getFullYear(),
      resetNumberingYearly: data.resetNumberingYearly !== false, // Default true
      autoGenerateOnCheckout: data.autoGenerateOnCheckout !== false, // Default true
      autoGenerateOnPayment: data.autoGenerateOnPayment === true, // Default false
      sendEmailToGuest: data.sendEmailToGuest === true, // Default false
    };
    
    // Crea il nuovo gruppo
    const newSettings = await InvoiceSettingsModel.create(settingsData);
    
    return NextResponse.json(
      {
        success: true,
        settings: newSettings,
        message: 'Gruppo di fatturazione creato con successo',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invoice settings:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}

// GET per verificare appartamenti non assegnati
export async function getUnassignedApartments(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Ottieni tutti gli appartamenti
    const allApartments = await ApartmentModel.find({}).select('_id name').lean();
    
    // Ottieni tutti gli appartamenti già assegnati
    const assignedSettings = await InvoiceSettingsModel.find({}).select('apartmentIds').lean();
    const assignedApartmentIds = new Set(
      assignedSettings.flatMap(s => s.apartmentIds.map(id => id.toString()))
    );
    
    // Filtra gli appartamenti non assegnati
    const unassignedApartments = allApartments.filter(
      apt => !assignedApartmentIds.has(apt._id.toString())
    );
    
    return NextResponse.json({
      unassigned: unassignedApartments,
      total: allApartments.length,
      assigned: assignedApartmentIds.size,
    });
  } catch (error) {
    console.error('Error fetching unassigned apartments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
