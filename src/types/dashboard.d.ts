// Per ApartmentStatusGrid
export interface ApartmentStatusClient {
  id: string;
  name: string;
  status: 'occupied' | 'available';
  currentGuest: string | null;
  checkOutDate: string | null; // Stringa ISO
  nextCheckIn: string | null;  // Stringa ISO
  price: number;
}

// Per OccupancyChart e PerformanceChart
export interface DataPointClient {
  date: string; // Stringa ISO
  [key: string]: any; // Per altre proprietà come 'occupied', 'available', 'rate', 'revenue'
}

// Per TodayActivity
export interface ActivityClient {
  id: string;
  guestName: string;
  apartmentName: string;
  time: string; // Stringa ISO
}

// Per RecentBookings
export interface RecentBookingClient {
  id: string;
  guestName: string;
  apartmentName: string;
  checkIn: string;  // Stringa ISO
  checkOut: string; // Stringa ISO
  status: string;
  totalPrice: number;
  createdAt?: string; // Stringa ISO
}

// Interfacce per le props dei componenti client
// (Queste potrebbero anche rimanere nei rispettivi file dei componenti,
// ma per coerenza le mettiamo qui se i dati sono definiti qui)

export interface DashboardStatsProps {
  totalApartments: number;
  occupiedToday: number;
  occupancyRate: number;
  monthRevenue: number;
  pendingBookings: number;
}

export interface OccupancyChartProps {
  data: DataPointClient[]; // Usiamo il tipo generico DataPointClient
}

export interface PerformanceChartProps {
  data: DataPointClient[]; // Usiamo il tipo generico DataPointClient
}

export interface RevenueWidgetProps {
  totalRevenue: number;
  monthRevenue: number;
  projectedRevenue: number;
  performanceData: DataPointClient[]; // Usiamo il tipo generico DataPointClient
}

export interface ApartmentStatusGridProps {
  apartments: ApartmentStatusClient[];
}

export interface TodayActivityProps {
  checkIns: ActivityClient[];
  checkOuts: ActivityClient[];
}

export interface RecentBookingsProps {
  bookings: RecentBookingClient[];
}
