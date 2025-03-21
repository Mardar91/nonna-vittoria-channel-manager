import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
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
  
  // Ottieni le prenotazioni più recenti
  const recentBookings = await BookingModel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  
  // Preparare le prenotazioni per la visualizzazione
  const bookingsWithApartmentInfo = await Promise.all(
    recentBookings.map(async (booking) => {
      const apartment = await ApartmentModel.findById(booking.apartmentId);
      return {
        ...booking,
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
}
