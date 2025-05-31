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
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const normalizedQueryStartDate = new Date(startDateParam);
    normalizedQueryStartDate.setUTCHours(0,0,0,0);

    const normalizedQueryEndDate = new Date(endDateParam);
    normalizedQueryEndDate.setUTCHours(0,0,0,0);
    
    await connectDB();
    
    const rates = await DailyRateModel.find({
      apartmentId: params.id,
      date: {
        $gte: normalizedQueryStartDate,
        $lte: normalizedQueryEndDate
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

    // !! LOG AGGIUNTO QUI !!
    console.log(`[Rates API POST] Received data.date: ${data.date}, Type: ${typeof data.date}`);
    if (data.date && typeof data.date === 'object' && data.date.toISOString) {
      // If data.date is already a Date object or something that behaves like one (e.g. from Firestore timestamp)
      console.log(`[Rates API POST] data.date as Date object methods: toISOString: ${new Date(data.date).toISOString()}, toString: ${new Date(data.date).toString()}`);
    } else if (typeof data.date === 'string') {
      // If data.date is a string, log its value and how new Date() would parse it by default.
      try {
        console.log(`[Rates API POST] data.date as string, default new Date() parse attempt: ${new Date(data.date).toISOString()}`);
      } catch (e) {
        console.log(`[Rates API POST] data.date as string, could not be parsed by new Date(): ${data.date}`);
      }
    }
    // !! FINE LOG AGGIUNTO !!
    
    if (!data.date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Refined date parsing for POST
    const dateStringFromRequest = data.date;
    let normalizedDate;

    if (typeof dateStringFromRequest === 'string') {
      const parts = dateStringFromRequest.split(/[-T]/); // Split by '-' or 'T'
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Invalid date string format. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM...' }, { status: 400 });
      }
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return NextResponse.json({ error: 'Invalid date components after parsing string.' }, { status: 400 });
      }
      normalizedDate = new Date(Date.UTC(year, month, day));
    } else if (dateStringFromRequest instanceof Date) {
      const receivedDateObj = new Date(dateStringFromRequest);
      normalizedDate = new Date(Date.UTC(receivedDateObj.getUTCFullYear(), receivedDateObj.getUTCMonth(), receivedDateObj.getUTCDate()));
    } else {
      return NextResponse.json({ error: 'Invalid date format received. Expected string or Date object.' }, { status: 400 });
    }
    // End of refined date parsing
    
    await connectDB();
    
    // Cerca se esiste già una tariffa per questa data
    const existingRate = await DailyRateModel.findOne({
      apartmentId: params.id,
      date: normalizedDate // Use normalizedDate here
    });
    
    if (existingRate) {
      // Aggiorna la tariffa esistente
      // The query to find existingRate used normalizedDate.
      // The date field itself is not being updated here, which is fine.
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
        date: normalizedDate, // Use normalizedDate here
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
    const dateParam = url.searchParams.get('date'); // Renamed to dateParam for clarity
    
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Refined date parsing for DELETE
    let normalizedUrlDate;

    if (typeof dateParam === 'string') {
      const parts = dateParam.split(/[-T]/); // Split by '-' or 'T'
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Invalid date string format in query parameters. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM...' }, { status: 400 });
      }
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return NextResponse.json({ error: 'Invalid date components after parsing string from query parameters.' }, { status: 400 });
      }
      normalizedUrlDate = new Date(Date.UTC(year, month, day));
    } else {
      // This case should ideally not be reached if dateParam is always a string from URL
      return NextResponse.json({ error: 'Invalid date format in query parameters. Expected a string.' }, { status: 400 });
    }
    // End of refined date parsing
    
    await connectDB();
    
    // Elimina la tariffa esistente
    await DailyRateModel.findOneAndDelete({
      apartmentId: params.id,
      date: normalizedUrlDate // Use normalizedUrlDate here
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
