import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import { checkAvailability, syncCalendarsForApartment } from '@/lib/ical';
import { calculateDynamicPriceForStay } from '@/lib/pricing';

// GET: Ottenere tutte le prenotazioni
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const apartmentId = url.searchParams.get('apartmentId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    const query: any = {};
    
    if (apartmentId) {
      query.apartmentId = apartmentId;
    }
    
    if (startDate && endDate) {
      query.$or = [
        {
          checkIn: { 
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        },
        {
          checkOut: { 
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        },
        {
          $and: [
            { checkIn: { $lte: new Date(startDate) } },
            { checkOut: { $gte: new Date(endDate) } }
          ]
        }
      ];
    }
    
    await connectDB();
    const bookings = await BookingModel.find(query).sort({ checkIn: 1 });
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Creare una nuova prenotazione
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    await connectDB();
    
    // Verifica che l'appartamento esista
    const apartment = await ApartmentModel.findById(data.apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }
    
    // Verificare disponibilità con prenotazioni attuali
    const existingBookings = await BookingModel.find({
      apartmentId: data.apartmentId,
      status: { $in: ['pending', 'confirmed'] }, // Changed line
      $or: [
        {
          checkIn: { 
            $lte: new Date(data.checkOut)
          },
          checkOut: {
            $gte: new Date(data.checkIn)
          }
        }
      ]
    });
    
    if (existingBookings.length > 0) {
      return NextResponse.json(
        { error: 'The apartment is not available for the selected dates' },
        { status: 400 }
      );
    }
    
    // Verificare disponibilità con eventi iCal esterni
    const externalEvents = await syncCalendarsForApartment(apartment);
    const isAvailable = checkAvailability(
      new Date(data.checkIn),
      new Date(data.checkOut),
      externalEvents.map(event => ({ start: event.start, end: event.end }))
    );
    
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'The apartment is not available for the selected dates due to external bookings' },
        { status: 400 }
      );
    }

    // Calcola il prezzo totale corretto lato server
    let serverCalculatedPrice;
    try {
      serverCalculatedPrice = await calculateDynamicPriceForStay(
        data.apartmentId,
        new Date(data.checkIn),
        new Date(data.checkOut),
        data.numberOfGuests
      );
    } catch (priceError: any) {
      console.error('Error calculating dynamic price during booking creation:', priceError);
      return NextResponse.json(
        { error: `Failed to calculate price: ${priceError.message || 'Unknown pricing error'}` },
        { status: 500 }
      );
    }

    // Log se il prezzo fornito dal client differisce da quello calcolato dal server
    if (data.totalPrice !== undefined && data.totalPrice !== serverCalculatedPrice) {
      console.warn(`Client totalPrice (${data.totalPrice}) differs from server-calculated price (${serverCalculatedPrice}) for apartment ${data.apartmentId}. Using server price.`);
    }

    // Usa sempre il prezzo calcolato dal server come autorevole
    const finalBookingData = {
      ...data,
      totalPrice: serverCalculatedPrice
    };
    
    // Creare la prenotazione
    const booking = await BookingModel.create(finalBookingData);
    
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
