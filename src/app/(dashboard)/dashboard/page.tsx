import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel, { IBooking } from '@/models/Booking';
import DashboardStats from '@/components/DashboardStats';
import BookingList from '@/components/BookingList';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  // Ottieni statistiche di base
  const apartmentCount = await ApartmentModel.countDocuments();
  const bookingCount = await BookingModel.countDocuments();
  const pendingBookings = await BookingModel.countDocuments({ status: 'pending' });
  
  try {
    // Ottieni le prenotazioni più recenti (senza usare lean())
    const recentBookings = await BookingModel.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Converti i documenti Mongoose in oggetti semplici con la tipizzazione corretta
    const bookingsWithApartmentInfo: (IBooking & { apartmentName: string })[] = await Promise.all(
      recentBookings.map(async (booking) => {
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <DashboardStats 
          apartmentCount={apartmentCount}
          bookingCount={bookingCount}
          pendingBookings={pendingBookings}
        />
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Prenotazioni Recenti</h2>
          </div>
          <BookingList bookings={bookingsWithApartmentInfo} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching bookings:', error);
    
    // Fallback in caso di errore
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <DashboardStats 
          apartmentCount={apartmentCount}
          bookingCount={bookingCount}
          pendingBookings={pendingBookings}
        />
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Prenotazioni Recenti</h2>
          </div>
          <div className="p-4 text-center text-gray-500">
            Si è verificato un errore nel caricamento delle prenotazioni.
          </div>
        </div>
      </div>
    );
  }
}
