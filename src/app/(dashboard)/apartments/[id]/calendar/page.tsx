import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import ApartmentCalendar from '@/components/ApartmentCalendar';

export default async function ApartmentCalendarPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni i dettagli dell'appartamento
  const apartment = await ApartmentModel.findById(params.id);
  
  if (!apartment) {
    return (
      <div className="text-center p-12">
        <h1 className="text-2xl font-bold text-red-600">Appartamento non trovato</h1>
        <Link href="/apartments" className="mt-4 inline-block text-blue-600 hover:underline">
          Torna agli appartamenti
        </Link>
      </div>
    );
  }

  // Ottieni le prenotazioni per questo appartamento
  const bookings = await BookingModel.find({
    apartmentId: params.id,
    status: { $ne: 'cancelled' },
  }).sort({ checkIn: 1 });
  
  // Converti in formato semplice per il client
  const bookingsData = bookings.map(booking => ({
    id: booking._id.toString(),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guestName: booking.guestName,
    status: booking.status,
    numberOfGuests: booking.numberOfGuests,
    totalPrice: booking.totalPrice,
  }));
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Calendario: {apartment.name}</h1>
        <div className="flex space-x-4">
          <Link 
            href={`/apartments/${params.id}`}
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200"
          >
            Torna ai Dettagli
          </Link>
          <Link 
            href={`/bookings/new?apartmentId=${params.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Nuova Prenotazione
          </Link>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <ApartmentCalendar 
          apartmentId={params.id} 
          apartmentData={apartment} 
          bookings={bookingsData} 
        />
      </div>
    </div>
  );
}
