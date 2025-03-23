import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import PublicProfileModel from '@/models/PublicProfile';

// GET: Ottenere il profilo pubblico
export async function GET() {
  try {
    await connectDB();
    
    // Troviamo l'unico profilo pubblico, o ne creiamo uno se non esiste
    let profile = await PublicProfileModel.findOne({});
    
    if (!profile) {
      profile = await PublicProfileModel.create({
        name: 'Nonna Vittoria Apartments',
        isActive: false,
        allowGroupBooking: true
      });
    }
    
    return NextResponse.json(profile);
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
