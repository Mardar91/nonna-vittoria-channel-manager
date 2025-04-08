import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import Link from 'next/link';
import BookingList from '@/components/BookingList';

export default async function BookingsPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  try {
    // Ottieni tutte le prenotazioni
    const bookings = await BookingModel.find({}).sort({ createdAt: -1 });
    
    // Aggiungi le informazioni degli appartamenti
    const bookingsWithApartmentInfo: (IBooking & { apartmentName: string })[] = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject() as IBooking;
        const apartment = await ApartmentModel.findById(bookingObj.apartmentId);
        
        return {
          ...bookingObj,
          apartmentName: apartment ? apartment.name : 'Unknown',
        };
      })
    );
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <Link 
            href="/bookings/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Nuova Prenotazione
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Tutte le Prenotazioni ({bookingsWithApartmentInfo.length})</h2>
          </div>
          {bookingsWithApartmentInfo.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nessuna prenotazione trovata. Crea la tua prima prenotazione!
            </div>
          ) : (
            <BookingList bookings={bookingsWithApartmentInfo} />
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <Link 
            href="/bookings/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Nuova Prenotazione
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Tutte le Prenotazioni</h2>
          </div>
          <div className="p-4 text-center text-gray-500">
            Si è verificato un errore nel caricamento delle prenotazioni.
          </div>
        </div>
      </div>
    );
  }
}
