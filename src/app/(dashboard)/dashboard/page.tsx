import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel, { IBooking } from '@/models/Booking';
import DashboardStats from '@/components/DashboardStats';
import OccupancyChart from '@/components/OccupancyChart';
import RevenueWidget from '@/components/RevenueWidget';
import ApartmentStatusGrid from '@/components/ApartmentStatusGrid';
import TodayActivity from '@/components/TodayActivity';
import RecentBookings from '@/components/RecentBookings';
import PerformanceChart from '@/components/PerformanceChart';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  // Date utili
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Inizio e fine del mese corrente
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Ultimi 30 giorni per i grafici
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Ottieni tutti gli appartamenti
  const apartments = await ApartmentModel.find({}).sort({ name: 1 });
  
  // Ottieni tutte le prenotazioni
  const allBookings = await BookingModel.find({
    status: { $ne: 'cancelled' }
  });
  
  // Prenotazioni del mese corrente
  const monthBookings = await BookingModel.find({
    status: { $ne: 'cancelled' },
    $or: [
      { checkIn: { $gte: startOfMonth, $lte: endOfMonth } },
      { checkOut: { $gte: startOfMonth, $lte: endOfMonth } },
      {
        checkIn: { $lte: startOfMonth },
        checkOut: { $gte: endOfMonth }
      }
    ]
  });
  
  // Check-in e check-out di oggi
  const todayCheckIns = await BookingModel.find({
    checkIn: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' }
  }).populate('apartmentId');
  
  const todayCheckOuts = await BookingModel.find({
    checkOut: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' }
  }).populate('apartmentId');
  
  // Calcola l'occupazione per ogni appartamento
  const apartmentStatuses = await Promise.all(
    apartments.map(async (apartment) => {
      // Verifica se l'appartamento è occupato oggi
      const currentBooking = await BookingModel.findOne({
        apartmentId: apartment._id,
        checkIn: { $lte: today },
        checkOut: { $gt: today },
        status: { $ne: 'cancelled' }
      });
      
      // Prossima prenotazione
      const nextBooking = await BookingModel.findOne({
        apartmentId: apartment._id,
        checkIn: { $gt: today },
        status: { $ne: 'cancelled' }
      }).sort({ checkIn: 1 });
      
      return {
        id: apartment._id.toString(),
        name: apartment.name,
        status: currentBooking ? 'occupied' : 'available',
        currentGuest: currentBooking ? currentBooking.guestName : null,
        checkOutDate: currentBooking ? currentBooking.checkOut : null,
        nextCheckIn: nextBooking ? nextBooking.checkIn : null,
        price: apartment.price
      };
    })
  );
  
  // Calcola le statistiche
  const totalApartments = apartments.length;
  const occupiedToday = apartmentStatuses.filter(a => a.status === 'occupied').length;
  const occupancyRate = totalApartments > 0 ? Math.round((occupiedToday / totalApartments) * 100) : 0;
  
  // Calcola i ricavi del mese
  const monthRevenue = monthBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  
  // Calcola i ricavi totali
  const totalRevenue = allBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + booking.totalPrice, 0);
  
  // Prenotazioni pendenti
  const pendingBookings = await BookingModel.countDocuments({ status: 'pending' });
  
  // Prepara i dati per i grafici di occupazione (ultimi 30 giorni)
  const occupancyData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Conta appartamenti occupati in questa data
    const occupiedCount = await BookingModel.countDocuments({
      checkIn: { $lte: date },
      checkOut: { $gt: date },
      status: { $ne: 'cancelled' }
    });
    
    occupancyData.push({
      date: date.toISOString(),
      occupied: occupiedCount,
      available: totalApartments - occupiedCount,
      rate: totalApartments > 0 ? Math.round((occupiedCount / totalApartments) * 100) : 0
    });
  }
  
  // Prepara i dati per il grafico delle performance (ricavi giornalieri)
  const performanceData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Somma i ricavi delle prenotazioni che includono questa data
    const dayBookings = await BookingModel.find({
      checkIn: { $lte: date },
      checkOut: { $gt: date },
      status: { $ne: 'cancelled' },
      paymentStatus: 'paid'
    });
    
    // Calcola il ricavo giornaliero
    let dayRevenue = 0;
    for (const booking of dayBookings) {
      const nights = Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const revenuePerNight = booking.totalPrice / nights;
      dayRevenue += revenuePerNight;
    }
    
    performanceData.push({
      date: date.toISOString(),
      revenue: Math.round(dayRevenue)
    });
  }
  
  // Ottieni le prenotazioni recenti
  const recentBookings = await BookingModel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('apartmentId');
  
  const recentBookingsData = recentBookings.map(booking => ({
    id: booking._id.toString(),
    guestName: booking.guestName,
    apartmentName: booking.apartmentId ? (booking.apartmentId as any).name : 'Unknown',
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    totalPrice: booking.totalPrice,
    createdAt: booking.createdAt
  }));
  
  // Proiezione ricavi (basata sulla media degli ultimi 30 giorni)
  const avgDailyRevenue = performanceData.reduce((sum, day) => sum + day.revenue, 0) / 30;
  const projectedMonthRevenue = avgDailyRevenue * 30;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Genera Report
          </button>
        </div>
      </div>
      
      {/* Statistiche Principali */}
      <DashboardStats 
        totalApartments={totalApartments}
        occupiedToday={occupiedToday}
        occupancyRate={occupancyRate}
        monthRevenue={monthRevenue}
        pendingBookings={pendingBookings}
      />
      
      {/* Riga con Ricavi e Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Ricavi */}
        <RevenueWidget 
          totalRevenue={totalRevenue}
          monthRevenue={monthRevenue}
          projectedRevenue={projectedMonthRevenue}
          performanceData={performanceData}
        />
        
        {/* Grafico Performance */}
        <PerformanceChart data={performanceData} />
      </div>
      
      {/* Grafico Occupazione */}
      <OccupancyChart data={occupancyData} />
      
      {/* Stato Appartamenti e Attività di Oggi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Griglia Stato Appartamenti */}
        <ApartmentStatusGrid apartments={apartmentStatuses} />
        
        {/* Attività di Oggi */}
        <TodayActivity 
          checkIns={todayCheckIns.map(b => ({
            id: b._id.toString(),
            guestName: b.guestName,
            apartmentName: b.apartmentId ? (b.apartmentId as any).name : 'Unknown',
            time: b.checkIn
          }))}
          checkOuts={todayCheckOuts.map(b => ({
            id: b._id.toString(),
            guestName: b.guestName,
            apartmentName: b.apartmentId ? (b.apartmentId as any).name : 'Unknown',
            time: b.checkOut
          }))}
        />
      </div>
      
      {/* Prenotazioni Recenti */}
      <RecentBookings bookings={recentBookingsData} />
    </div>
  );
}
