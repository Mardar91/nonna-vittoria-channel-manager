import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import SettingsModel from '@/models/Settings'; // Added import
import DashboardStats from '@/components/DashboardStats';
import OccupancyChart from '@/components/dashboard/OccupancyChart';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ApartmentStatusGrid from '@/components/dashboard/ApartmentStatusGrid';
import TodayActivity from '@/components/dashboard/TodayActivity';
import RecentBookingsWidget from '@/components/dashboard/RecentBookingsWidget';
import MonthlyStats from '@/components/dashboard/MonthlyStats';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  // Fetch general settings
  const settings = await SettingsModel.findOne({});
  const defaultCheckoutTimeString = settings?.defaultCheckOutTime || '10:00'; // Default to '10:00' if no settings found

  // Data di oggi per i calcoli
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Statistiche di base
  const apartmentCount = await ApartmentModel.countDocuments();
  const totalBookings = await BookingModel.countDocuments();
  
  // Prenotazioni attive oggi - This will be recalculated later
  // const activeBookingsToday = await BookingModel.countDocuments({
  //   status: 'confirmed',
  //   checkIn: { $lte: today },
  //   checkOut: { $gt: today }
  // });
  
  // Check-in e check-out di oggi
  const checkInsToday = await BookingModel.find({
    status: 'confirmed',
    checkIn: { $gte: today, $lt: tomorrow }
  });
  
  const checkOutsToday = await BookingModel.find({
    status: 'confirmed',
    checkOut: { $gte: today, $lt: tomorrow }
  });
  
  // Ricavi totali del mese corrente
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const monthlyRevenue = await BookingModel.aggregate([
    {
      $match: {
        status: 'confirmed',
        paymentStatus: 'paid',
        checkIn: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalPrice' }
      }
    }
  ]);
  
  // Dati per i grafici - ultimi 6 mesi
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const bookingsForCharts = await BookingModel.find({
    status: 'confirmed',
    checkIn: { $gte: sixMonthsAgo }
  }).sort({ checkIn: 1 });
  
  // Appartamenti con il loro stato attuale
  const apartments = await ApartmentModel.find({});
  const now = new Date(); // Current date and time
  
  const apartmentsWithStatus = await Promise.all(
    apartments.map(async (apartment) => {
      const today_date_only = new Date();
      today_date_only.setHours(0, 0, 0, 0);

      const today_end_of_day = new Date(today_date_only);
      today_end_of_day.setHours(23, 59, 59, 999);

      // Fetch all confirmed bookings for the apartment that overlap with today
      const todaysBookingsModels = await BookingModel.find({
        apartmentId: apartment._id,
        status: 'confirmed',
        checkIn: { $lte: today_end_of_day },
        checkOut: { $gt: today_date_only }
      });

      let bookingToConsider = null;
      const today_date_only_string = today_date_only.toDateString();

      if (todaysBookingsModels.length > 0) {
        const todaysBookingsObjects = todaysBookingsModels.map(m => m.toObject());

        // Priority A: Active Now
        let activeBookings = todaysBookingsObjects.filter(b => {
          const ci = new Date(b.checkIn);
          const co = new Date(b.checkOut);
          return ci <= now && co > now;
        });
        if (activeBookings.length > 0) {
          activeBookings.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
          bookingToConsider = activeBookings[0];
        }

        // Priority B: Checking In Today Later
        if (!bookingToConsider) {
          let checkinTodayBookings = todaysBookingsObjects.filter(b => {
            const ci = new Date(b.checkIn);
            return ci.toDateString() === today_date_only_string && ci > now;
          });
          if (checkinTodayBookings.length > 0) {
            checkinTodayBookings.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
            bookingToConsider = checkinTodayBookings[0];
          }
        }

        // Priority C: Checking Out Today Later
        if (!bookingToConsider) {
          let checkoutTodayBookings = todaysBookingsObjects.filter(b => {
            const co = new Date(b.checkOut);
            // Ensure it's a checkout relevant for "occupying longer" - it must still be active
            return co.toDateString() === today_date_only_string && co > now;
          });
          if (checkoutTodayBookings.length > 0) {
            checkoutTodayBookings.sort((a, b) => new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime());
            bookingToConsider = checkoutTodayBookings[0];
          }
        }
      }
      
      let determinedStatus: 'available' | 'occupied' | 'freeing_soon' | 'reserved' = 'available';
      let bookingToDisplay = null;

      const currentBookingOnDate = bookingToConsider; // Use bookingToConsider here

      // 'now', 'today_date_only', 'defaultCheckoutTimeString' must be in scope.
      // 'currentBookingOnDate' is the result of the priority selection logic.

      if (currentBookingOnDate) {
        const localBookingCheckInDate = new Date(currentBookingOnDate.checkIn);
        const localBookingCheckOutDate = new Date(currentBookingOnDate.checkOut); // This contains the specific time for the booking
        const localCheckInDateOnly = new Date(localBookingCheckInDate);
        localCheckInDateOnly.setHours(0, 0, 0, 0);
        const localCheckOutDateOnly = new Date(localBookingCheckOutDate);
        localCheckOutDateOnly.setHours(0, 0, 0, 0);

        const isCheckoutToday = localCheckOutDateOnly.getTime() === today_date_only.getTime();
        const isCheckinToday = localCheckInDateOnly.getTime() === today_date_only.getTime();

        // Determine the effective checkout time for comparison (hour and minute)
        // The user wants to use the specific booking's checkout time.
        const effectiveCheckoutHour = localBookingCheckOutDate.getHours();
        const effectiveCheckoutMinute = localBookingCheckOutDate.getMinutes();

        if (isCheckoutToday) {
          // Booking is checking out today
          const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
          const effectiveCheckoutTimeInMinutes = effectiveCheckoutHour * 60 + effectiveCheckoutMinute;

          if (currentTimeInMinutes < effectiveCheckoutTimeInMinutes) {
            // Current time is before the booking's specific checkout time
            determinedStatus = 'in_uscita';
            // bookingToDisplay will be set below
          } else {
            // Current time is at or after the booking's specific checkout time
            determinedStatus = 'available';
            // bookingToDisplay will be null for 'available'
          }
        } else if (isCheckinToday || (localBookingCheckInDate < now && localBookingCheckOutDate > now)) {
          // Booking is checking in today (and not also checking out today),
          // OR it's an ongoing booking that spans across 'now'
          determinedStatus = 'reserved';
        } else {
          // This case should ideally not be reached if bookingToConsider is correctly selected
          // (as it implies a booking that's not for today, or already passed fully)
          // but as a fallback:
          determinedStatus = 'available';
        }
        
        // Set bookingToDisplay based on status
        if (determinedStatus === 'in_uscita' || determinedStatus === 'reserved') {
          bookingToDisplay = currentBookingOnDate;
        } else {
          bookingToDisplay = null;
        }

      } else {
        // No relevant booking found for today
        determinedStatus = 'available';
        bookingToDisplay = null;
      }
      
      const nextBookingModel = await BookingModel.findOne({
        apartmentId: apartment._id,
        status: 'confirmed',
        checkIn: { $gt: now } // Next booking starts after the current time
      }).sort({ checkIn: 1 });
      
      return {
        ...apartment.toObject(),
        status: determinedStatus,
        currentBooking: bookingToDisplay, // Already an object or null
        nextBooking: nextBookingModel ? nextBookingModel.toObject() : null,
      };
    })
  );
  
  // Calculate active bookings based on refined statuses
  const newActiveBookingsToday = apartmentsWithStatus.filter(
    apt => apt.status === 'reserved'
  ).length;

  // Prenotazioni recenti per il widget
  const recentBookings = await BookingModel.find({})
    .sort({ createdAt: -1 })
    .limit(5);
  
  // Calcola occupazione mensile
  const occupancyData = calculateOccupancyData(bookingsForCharts, apartments.length);
  
  // Prepara i dati per i componenti
  const dashboardData = {
    stats: {
      apartmentCount,
      totalBookings,
      activeBookingsToday: newActiveBookingsToday, // Use the new count
      monthlyRevenue: monthlyRevenue[0]?.total || 0
    },
    todayActivity: {
      checkIns: checkInsToday.map(b => b.toObject()),
      checkOuts: checkOutsToday.map(b => b.toObject())
    },
    apartments: apartmentsWithStatus,
    recentBookings: recentBookings.map(b => b.toObject()),
    chartData: {
      bookings: bookingsForCharts.map(b => b.toObject()),
      occupancy: occupancyData
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Panoramica di {today.toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>
      
      {/* Statistiche principali */}
      <DashboardStats 
        apartmentCount={dashboardData.stats.apartmentCount}
        totalBookings={dashboardData.stats.totalBookings}
        activeToday={dashboardData.stats.activeBookingsToday}
        monthlyRevenue={dashboardData.stats.monthlyRevenue}
      />
      
      {/* Grafici e Metriche */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico Occupazione */}
        <OccupancyChart data={dashboardData.chartData.occupancy} />
        
        {/* Grafico Ricavi */}
        <RevenueChart bookings={dashboardData.chartData.bookings} />
      </div>
      
      {/* Statistiche Mensili */}
      <MonthlyStats bookings={dashboardData.chartData.bookings} />
      
      {/* Stato Appartamenti e Attività */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Griglia Stato Appartamenti - 2 colonne */}
        <div className="lg:col-span-2">
          <ApartmentStatusGrid apartments={dashboardData.apartments} />
        </div>
        
        {/* Attività di Oggi - 1 colonna */}
        <div className="lg:col-span-1">
          <TodayActivity 
            checkIns={dashboardData.todayActivity.checkIns}
            checkOuts={dashboardData.todayActivity.checkOuts}
          />
        </div>
      </div>
      
      {/* Prenotazioni Recenti */}
      <RecentBookingsWidget 
        bookings={dashboardData.recentBookings} 
        apartments={dashboardData.apartments}
      />
    </div>
  );
}

// Funzione helper per calcolare i dati di occupazione
function calculateOccupancyData(bookings: any[], apartmentCount: number) {
  const monthlyOccupancy: { [key: string]: { bookedDays: number; month: string } } = {};
  
  // Inizializza gli ultimi 6 mesi
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
    monthlyOccupancy[monthKey] = { bookedDays: 0, month: monthName };
  }
  
  // Calcola i giorni occupati per ogni mese
  bookings.forEach(booking => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    
    // Per ogni giorno della prenotazione
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyOccupancy[monthKey]) {
        monthlyOccupancy[monthKey].bookedDays++;
      }
    }
  });
  
  // Converti in formato per il grafico
  return Object.entries(monthlyOccupancy).map(([key, data]) => {
    const [year, month] = key.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const maxPossibleDays = daysInMonth * apartmentCount;
    const occupancyRate = maxPossibleDays > 0 
      ? Math.round((data.bookedDays / maxPossibleDays) * 100) 
      : 0;
    
    return {
      month: data.month,
      occupancy: occupancyRate,
      bookedDays: data.bookedDays,
      totalDays: maxPossibleDays
    };
  });
}
