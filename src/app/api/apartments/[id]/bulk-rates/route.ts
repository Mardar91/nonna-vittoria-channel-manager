import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import DailyRateModel from '@/models/DailyRate';
import { generateICalFeed } from '@/lib/ical';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';

// POST: Aggiorna o crea tariffe per un intervallo di date
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
    
    if (!data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const startDateString = data.startDate;
    let normalizedStartDate;
    if (typeof startDateString === 'string') {
      const parts = startDateString.split(/[-T]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) {
        return NextResponse.json({ error: 'Invalid startDate components after parsing' }, { status: 400 });
      }
      normalizedStartDate = new Date(Date.UTC(year, month, day));
    } else {
      return NextResponse.json({ error: 'Invalid startDate format, expected YYYY-MM-DD string' }, { status: 400 });
    }

    const endDateString = data.endDate;
    let normalizedEndDate;
    if (typeof endDateString === 'string') {
      const parts = endDateString.split(/[-T]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) {
        return NextResponse.json({ error: 'Invalid endDate components after parsing' }, { status: 400 });
      }
      normalizedEndDate = new Date(Date.UTC(year, month, day));
    } else {
      return NextResponse.json({ error: 'Invalid endDate format, expected YYYY-MM-DD string' }, { status: 400 });
    }
    
    const dates = [];
    if (normalizedStartDate && normalizedEndDate && normalizedStartDate.getTime() <= normalizedEndDate.getTime()) { // Check if dates are valid
        let currentIterDate = new Date(normalizedStartDate.getTime()); // Start with UTC normalized date
        while (currentIterDate.getTime() <= normalizedEndDate.getTime()) {
            dates.push(new Date(currentIterDate.getTime())); // Add a UTC normalized date
            currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1); // Increment day in UTC
        }
    }

    // Gestisce il reset dei prezzi - modifica solo le tariffe esistenti
    if (data.resetPrices) {
      // Otteniamo le tariffe esistenti nell'intervallo
      const existingRatesToResetPrice = await DailyRateModel.find({ // Renamed for clarity
        apartmentId: params.id,
        date: { $gte: normalizedStartDate, $lte: normalizedEndDate }
      });

      // Operazioni di aggiornamento solo per le tariffe esistenti
      const operations = existingRatesToResetPrice.map(rate => ({
        updateOne: {
          filter: { _id: rate._id },
          update: {
            $unset: { price: "" } // Rimuove il campo prezzo
          }
        }
      }));

      if (operations.length > 0) {
        const result = await DailyRateModel.bulkWrite(operations);
        return NextResponse.json({
          success: true,
          modifiedCount: result.modifiedCount,
          message: 'Prezzi resettati con successo'
        });
      }

      return NextResponse.json({
        success: true,
        modifiedCount: 0,
        message: 'Nessun prezzo da resettare'
      });
    }
    
    // Gestisce il reset del soggiorno minimo - modifica solo le tariffe esistenti
    if (data.resetMinStay) {
      // Otteniamo le tariffe esistenti nell'intervallo
      const existingRatesToResetMinStay = await DailyRateModel.find({ // Renamed for clarity
        apartmentId: params.id,
        date: { $gte: normalizedStartDate, $lte: normalizedEndDate },
        minStay: { $exists: true }
      });

      // Operazioni di aggiornamento solo per le tariffe esistenti
      const operations = existingRatesToResetMinStay.map(rate => ({
        updateOne: {
          filter: { _id: rate._id },
          update: {
            $set: { minStay: data.minStay || 1 }
          }
        }
      }));

      if (operations.length > 0) {
        const result = await DailyRateModel.bulkWrite(operations);
        return NextResponse.json({
          success: true,
          modifiedCount: result.modifiedCount,
          message: 'Soggiorno minimo resettato con successo'
        });
      }

      return NextResponse.json({
        success: true,
        modifiedCount: 0,
        message: 'Nessun soggiorno minimo da resettare'
      });
    }
    
    // Comportamento standard: aggiorna o crea tariffe per tutte le date
    const operations = dates.map(date => ({
      updateOne: {
        filter: { apartmentId: params.id, date },
        update: {
          $set: {
            apartmentId: params.id,
            date,
            ...(data.price !== undefined && { price: data.price }),
            ...(data.isBlocked !== undefined && { isBlocked: data.isBlocked }),
            ...(data.minStay !== undefined && { minStay: data.minStay }),
            ...(data.notes !== undefined && { notes: data.notes })
          }
        },
        upsert: true
      }
    }));
    
    const result = await DailyRateModel.bulkWrite(operations);
    
    // Se stiamo bloccando date, aggiorna anche il feed iCal
    if (data.isBlocked) {
      // Questo è un esempio di come potremmo aggiornare il feed iCal
      // Nella pratica, potremmo voler implementare una soluzione più complessa
      const apartment = await ApartmentModel.findById(params.id);
      const bookings = await BookingModel.find({
        apartmentId: params.id,
        status: { $ne: 'cancelled' }
      });
      
      // Rigenerazione del feed iCal non necessaria qui, ma inclusa per completezza
      // In un'implementazione reale, potremmo voler rigenerare il feed e salvarlo in cache
      const icalFeed = generateICalFeed(apartment, bookings);
    }
    
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });
  } catch (error) {
    console.error('Error updating bulk rates:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
