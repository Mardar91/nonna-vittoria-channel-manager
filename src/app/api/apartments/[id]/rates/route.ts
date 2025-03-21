import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import DailyRateModel from '@/models/DailyRate';

// GET: Ottieni le tariffe per un intervallo di date di un appartamento
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const rates = await DailyRateModel.find({
      apartmentId: params.id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 });
    
    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Aggiorna o crea una tariffa giornaliera
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();
    
    if (!data.date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Cerca se esiste già una tariffa per questa data
    const existingRate = await DailyRateModel.findOne({
      apartmentId: params.id,
      date: new Date(data.date)
    });
    
    if (existingRate) {
      // Aggiorna la tariffa esistente
      const updatedRate = await DailyRateModel.findByIdAndUpdate(
        existingRate._id,
        {
          price: data.price,
          isBlocked: data.isBlocked,
          minStay: data.minStay,
          notes: data.notes
        },
        { new: true }
      );
      return NextResponse.json(updatedRate);
    } else {
      // Crea nuova tariffa
      const newRate = await DailyRateModel.create({
        apartmentId: params.id,
        date: new Date(data.date),
        price: data.price,
        isBlocked: data.isBlocked,
        minStay: data.minStay,
        notes: data.notes
      });
      return NextResponse.json(newRate, { status: 201 });
    }
  } catch (error) {
    console.error('Error updating rate:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Elimina una tariffa giornaliera
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Elimina la tariffa esistente
    await DailyRateModel.findOneAndDelete({
      apartmentId: params.id,
      date: new Date(date)
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rate:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
