import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import PublicProfileModel, { IPublicProfile } from '@/models/PublicProfile';
import SettingsModel, { ISettings } from '@/models/Settings'; // Import SettingsModel

// GET: Ottenere il profilo pubblico
export async function GET() {
  try {
    await connectDB();
    
    // Troviamo l'unico profilo pubblico, o ne creiamo uno se non esiste
    let profile: IPublicProfile | null = await PublicProfileModel.findOne({}).lean<IPublicProfile>().exec();
    
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
    let settings: ISettings | null = await SettingsModel.findOne({}).lean<ISettings>().exec();
    if (!settings) {
      // Se non esistono impostazioni, creane di default (ma non salvarle qui)
      // o usa valori di fallback
      settings = {
        defaultCheckInTime: '14:00', // Valore di fallback
        // Aggiungi altri campi di fallback se necessario
        // defaultCheckOutTime, timezone, autoSync, syncInterval are not strictly needed here
        // as they have defaults in the schema and are not directly used in the responsePayload
        // However, to fully conform to ISettings if it were to be used more broadly here,
        // they would be needed if they were not optional or lacked schema defaults.
        // For current usage, this is sufficient.
        defaultCheckOutTime: '10:00', // Example, though schema default exists
        timezone: 'Europe/Rome', // Example, though schema default exists
        autoSync: true, // Example, though schema default exists
        syncInterval: 10, // Example, though schema default exists
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
