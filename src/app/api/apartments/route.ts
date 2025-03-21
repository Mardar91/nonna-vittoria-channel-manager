import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel, { IApartment } from '@/models/Apartment';
import { v4 as uuidv4 } from 'uuid';

// GET: Ottenere tutti gli appartamenti
export async function GET() {
  try {
    await connectDB();
    const apartments = await ApartmentModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json(apartments);
  } catch (error) {
    console.error('Error fetching apartments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Creare un nuovo appartamento
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
    
    await connectDB();
    
    // Genera un ID univoco per il feed iCal
    const icalId = uuidv4();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const icalFeed = `${baseUrl}/api/ical/${icalId}`;
    
    const apartment = await ApartmentModel.create({
      ...data,
      icalFeed,
    });
    
    return NextResponse.json(apartment, { status: 201 });
  } catch (error) {
    console.error('Error creating apartment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
