import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel, { IBooking } from '@/models/Booking'; // IBooking potrebbe non essere più necessario qui se usiamo tipi client

// Importa i componenti
import DashboardStats from '@/components/DashboardStats';
import OccupancyChart from '@/components/OccupancyChart';
import RevenueWidget from '@/components/RevenueWidget';
import ApartmentStatusGrid from '@/components/ApartmentStatusGrid';
import TodayActivity from '@/components/TodayActivity';
import RecentBookings from '@/components/RecentBookings';
import PerformanceChart from '@/components/PerformanceChart';

// Importa i tipi client definiti
import {
  ApartmentStatusClient,
  DataPointClient,
  ActivityClient,
  RecentBookingClient,
  DashboardStatsProps, // Importa anche le props se definite nel file dei tipi
  RevenueWidgetProps,
  PerformanceChartProps,
  OccupancyChartProps,
  ApartmentStatusGridProps,
  TodayActivityProps,
  RecentBookingsProps
} from '@/types/dashboard.d'; // Assicurati che il percorso sia corretto

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    // In un'app reale, potresti reindirizzare o mostrare un messaggio più esplicito
    return <p>Accesso negato.</p>;
  }
  
  await connectDB();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // --- USA .lean() PER TUTTE LE QUERY MONGOOSE ---
  const apartments = await ApartmentModel.find({}).sort({ name: 1 }).lean();
  
  const allBookings = await BookingModel.find({
    status: { $ne: 'cancelled' }
  }).lean();
  
  const monthBookings = await BookingModel.find({
    status: { $ne: 'cancelled' },
    $or: [
      { checkIn: { $gte: startOfMonth, $lte: endOfMonth } },
      { checkOut: { $gte: startOfMonth, $lte: endOfMonth } },
      { checkIn: { $lte: startOfMonth }, checkOut: { $gte: endOfMonth } }
    ]
  }).lean();
  
  const todayCheckInsRaw = await BookingModel.find({
    checkIn: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' }
  }).populate('apartmentId').lean();
  
  const todayCheckOutsRaw = await BookingModel.find({
    checkOut: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' }
  }).populate('apartmentId').lean();
  
  const apartmentStatusesPromises = apartments.map(async (apartment) => {
    const currentBooking = await BookingModel.findOne({
      apartmentId: apartment._id,
      checkIn: { $lte: today },
      checkOut: { $gt: today },
      status: { $ne: 'cancelled' }
    }).lean();
    
    const nextBooking = await BookingModel.findOne({
      apartmentId: apartment._id,
      checkIn: { $gt: today },
      status: { $ne: 'cancelled' }
    }).sort({ checkIn: 1 }).lean();
    
    // --- CORREGGI LA TIPizzazione DELLO STATO ---
    const statusValue: 'occupied' | 'available' = currentBooking ? 'occupied' : 'available';
      
    return {
      id: apartment._id.toString(), // ObjectId a stringa
      name: apartment.name,
      status: statusValue,
      currentGuest: currentBooking ? currentBooking.guestName : null,
      checkOutDate: currentBooking ? currentBooking.checkOut : null, // Manteniamo Date per ora
      nextCheckIn: nextBooking ? nextBooking.checkIn : null,       // Manteniamo Date per ora
      price: apartment.price
    };
  });
  const apartmentStatusesRaw = await Promise.all(apartmentStatusesPromises);

  // --- SERIALIZZA I DATI PER I COMPONENTI CLIENT ---
  const apartmentStatusesForGrid: ApartmentStatusClient[] = apartmentStatusesRaw.map(as => ({
    ...as,
    checkOutDate: as.checkOutDate ? new Date(as.checkOutDate).toISOString() : null,
    nextCheckIn: as.nextCheckIn ? new Date(as.nextCheckIn).toISOString() : null,
  }));
  
  const totalApartments = apartments.length;
  const occupiedToday = apartmentStatusesRaw.filter(a => a.status === 'occupied').length;
  const occupancyRate = totalApartments > 0 ? Math.round((occupiedToday / totalApartments) * 100) : 0;
  const monthRevenue = monthBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const totalRevenue = allBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + booking.totalPrice, 0);
  const pendingBookingsCount = await BookingModel.countDocuments({ status: 'pending' });
  
  const occupancyDataForChart: DataPointClient[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0);
    const occupiedCount = await BookingModel.countDocuments({
      checkIn: { $lte: date }, checkOut: { $gt: date }, status: { $ne: 'cancelled' }
    });
    occupancyDataForChart.push({
      date: date.toISOString(),
      occupied: occupiedCount,
      available: totalApartments - occupiedCount,
      rate: totalApartments > 0 ? Math.round((occupiedCount / totalApartments) * 100) : 0
    });
  }
  
  const performanceDataForChart: DataPointClient[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0);
    const dayBookings = await BookingModel.find({
      checkIn: { $lte: date }, checkOut: { $gt: date }, status: { $ne: 'cancelled' }, paymentStatus: 'paid'
    }).lean();
    let dayRevenue = 0;
    for (const booking of dayBookings) {
      const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      dayRevenue += nights > 0 ? booking.totalPrice / nights : 0;
    }
    performanceDataForChart.push({ date: date.toISOString(), revenue: Math.round(dayRevenue) });
  }
  
  const recentBookingsRaw = await BookingModel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('apartmentId')
    .lean();
  
  const recentBookingsForList: RecentBookingClient[] = recentBookingsRaw.map(booking => ({
    id: booking._id.toString(),
    guestName: booking.guestName,
    // apartmentId è un ObjectId se non popolato, o un oggetto se popolato.
    // .lean() con populate restituisce l'oggetto popolato.
    apartmentName: booking.apartmentId && typeof booking.apartmentId === 'object' && 'name' in booking.apartmentId
                   ? (booking.apartmentId as { name: string }).name
                   : 'Unknown',
    checkIn: new Date(booking.checkIn).toISOString(),
    checkOut: new Date(booking.checkOut).toISOString(),
    status: booking.status,
    totalPrice: booking.totalPrice,
    createdAt: booking.createdAt ? new Date(booking.createdAt).toISOString() : undefined
  }));
  
  const avgDailyRevenue = performanceDataForChart.length > 0 
    ? performanceDataForChart.reduce((sum, day) => sum + (day.revenue || 0), 0) / performanceDataForChart.length 
    : 0;
  const projectedMonthRevenue = avgDailyRevenue * 30;
  
  const todayCheckInsForActivity: ActivityClient[] = todayCheckInsRaw.map(b => ({
    id: b._id.toString(),
    guestName: b.guestName,
    apartmentName: b.apartmentId && typeof b.apartmentId === 'object' && 'name' in b.apartmentId
                   ? (b.apartmentId as { name: string }).name
                   : 'Unknown',
    time: new Date(b.checkIn).toISOString()
  }));

  const todayCheckOutsForActivity: ActivityClient[] = todayCheckOutsRaw.map(b => ({
    id: b._id.toString(),
    guestName: b.guestName,
    apartmentName: b.apartmentId && typeof b.apartmentId === 'object' && 'name' in b.apartmentId
                   ? (b.apartmentId as { name: string }).name
                   : 'Unknown',
    time: new Date(b.checkOut).toISOString()
  }));

  // Prepara le props per ogni componente
  const dashboardStatsData: DashboardStatsProps = {
    totalApartments,
    occupiedToday,
    occupancyRate,
    monthRevenue,
    pendingBookings: pendingBookingsCount,
  };

  const revenueWidgetData: RevenueWidgetProps = {
    totalRevenue,
    monthRevenue,
    projectedRevenue,
    performanceData: performanceDataForChart,
  };

  const performanceChartData: PerformanceChartProps = {
    data: performanceDataForChart,
  };

  const occupancyChartData: OccupancyChartProps = {
    data: occupancyDataForChart,
  };
  
  const apartmentStatusGridData: ApartmentStatusGridProps = {
    apartments: apartmentStatusesForGrid,
  };

  const todayActivityData: TodayActivityProps = {
    checkIns: todayCheckInsForActivity,
    checkOuts: todayCheckOutsForActivity,
  };

  const recentBookingsDataProps: RecentBookingsProps = {
    bookings: recentBookingsForList,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8"> {/* Aggiunto padding se non presente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('it-IT', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Genera Report
          </button>
        </div>
      </div>
      
      <DashboardStats {...dashboardStatsData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueWidget {...revenueWidgetData} />
        <PerformanceChart {...performanceChartData} />
      </div>
      
      <OccupancyChart {...occupancyChartData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ApartmentStatusGrid {...apartmentStatusGridData} />
        <TodayActivity {...todayActivityData} />
      </div>
      
      <RecentBookings {...recentBookingsDataProps} />
    </div>
  );
}
