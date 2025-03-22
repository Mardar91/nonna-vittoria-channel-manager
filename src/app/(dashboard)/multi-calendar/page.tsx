import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import DailyRateModel from '@/models/DailyRate';
import MultiCalendarView from '@/components/MultiCalendarView';

export default async function MultiCalendarPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni tutti gli appartamenti
  const apartments = await ApartmentModel.find({}).sort({ name: 1 });
  
  // Raccogliere tutti i dati delle prenotazioni per tutti gli appartamenti
  const bookings = await BookingModel.find({
    status: { $ne: 'cancelled' },
  }).sort({ checkIn: 1 });
  
  // Ottieni le date con tariffe personalizzate
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  
  // Ottieni tutte le tariffe giornaliere per il periodo corrente
  const dailyRates = await DailyRateModel.find({
    date: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  });
  
  // Prepara i dati per ciascun appartamento
  const apartmentsWithBookings = apartments.map(apartment => {
    const apartmentBookings = bookings.filter(b => 
      b.apartmentId.toString() === apartment._id.toString()
    ).map(booking => ({
      id: booking._id.toString(),
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guestName: booking.guestName,
      status: booking.status,
      numberOfGuests: booking.numberOfGuests,
      totalPrice: booking.totalPrice,
    }));
    
    // Filtra le tariffe giornaliere per questo appartamento
    const apartmentRates = dailyRates.filter(rate => 
      rate.apartmentId.toString() === apartment._id.toString()
    );
    
    return {
      id: apartment._id.toString(),
      data: apartment.toObject(),
      bookings: apartmentBookings,
      rates: apartmentRates.map(rate => rate.toObject())
    };
  });
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Multi Calendar</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <MultiCalendarView apartments={apartmentsWithBookings} />
      </div>
    </div>
  );
}
