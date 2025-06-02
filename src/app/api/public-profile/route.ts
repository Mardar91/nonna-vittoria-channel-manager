import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import PublicProfileModel from '@/models/PublicProfile';
import SettingsModel from '@/models/Settings'; // Import SettingsModel

// GET: Ottenere il profilo pubblico
export async function GET() {
  try {
    await connectDB();
    
    // Troviamo l'unico profilo pubblico, o ne creiamo uno se non esiste
    let profile = await PublicProfileModel.findOne({}).lean(); // Use lean() for plain JS object
    
    if (!profile) {
      // Se il profilo non esiste, ne creiamo uno di default MA NON lo salviamo qui.
      // L'aggiornamento/creazione avviene tramite PUT. Qui forniamo solo dati di default.
      profile = {
        name: 'Nonna Vittoria Apartments',
        isActive: false,
        allowGroupBooking: true,
        // Aggiungi altri campi di default se necessario per IPublicProfile
      };
    }

    // Recupera le impostazioni generali
    let settings = await SettingsModel.findOne({}).lean();
    if (!settings) {
      // Se non esistono impostazioni, creane di default (ma non salvarle qui)
      // o usa valori di fallback
      settings = {
        defaultCheckInTime: '14:00', // Valore di fallback
        // Aggiungi altri campi di fallback se necessario
      };
    }
    
    // Combina i dati del profilo con defaultCheckInTime dalle impostazioni
    const responsePayload = {
      ...profile,
      defaultCheckInTime: settings?.defaultCheckInTime,
    };
    
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Aggiornare il profilo pubblico
export async function PUT(req: NextRequest) {
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
    
    // Troviamo l'unico profilo pubblico, o ne creiamo uno se non esiste
    const profile = await PublicProfileModel.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating public profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
