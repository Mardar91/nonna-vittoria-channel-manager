'use client';

import { useMemo } from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

interface MonthlyStatsProps {
  bookings: Array<{
    checkIn: Date;
    totalPrice: number;
    status: string;
    paymentStatus: string;
    numberOfGuests: number;
  }>;
}

export default function MonthlyStats({ bookings }: MonthlyStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filtra prenotazioni del mese corrente e precedente
    const currentMonthBookings = bookings.filter(b => {
      const checkIn = new Date(b.checkIn);
      return checkIn.getMonth() === currentMonth && 
             checkIn.getFullYear() === currentYear &&
             b.status === 'confirmed';
    });
    
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthBookings = bookings.filter(b => {
      const checkIn = new Date(b.checkIn);
      return checkIn.getMonth() === lastMonth.getMonth() && 
             checkIn.getFullYear() === lastMonth.getFullYear() &&
             b.status === 'confirmed';
    });
    
    // Calcola statistiche
    const currentRevenue = currentMonthBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    const lastRevenue = lastMonthBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    const currentGuests = currentMonthBookings
      .reduce((sum, b) => sum + b.numberOfGuests, 0);
    
    const lastGuests = lastMonthBookings
      .reduce((sum, b) => sum + b.numberOfGuests, 0);
    
    // Calcola variazioni percentuali
    const revenueChange = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
      : 0;
    
    const bookingChange = lastMonthBookings.length > 0
      ? ((currentMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100
      : 0;
    
    const guestChange = lastGuests > 0
      ? ((currentGuests - lastGuests) / lastGuests) * 100
      : 0;
    
    // Media ricavo per prenotazione
    const avgRevenue = currentMonthBookings.length > 0
      ? currentRevenue / currentMonthBookings.length
      : 0;
    
    return {
      revenue: currentRevenue,
      revenueChange,
      bookings: currentMonthBookings.length,
      bookingChange,
      guests: currentGuests,
      guestChange,
      avgRevenue
    };
  }, [bookings]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUpIcon className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDownIcon className="w-4 h-4 text-red-600" />;
    return <MinusIcon className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const metrics = [
    {
      label: 'Ricavi del Mese',
      value: `€${stats.revenue.toFixed(2)}`,
      change: stats.revenueChange,
      detail: `Media: €${stats.avgRevenue.toFixed(2)}`
    },
    {
      label: 'Prenotazioni',
      value: stats.bookings,
      change: stats.bookingChange,
      detail: 'Questo mese'
    },
    {
      label: 'Ospiti Totali',
      value: stats.guests,
      change: stats.guestChange,
      detail: 'Questo mese'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          📈 Performance del Mese
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <p className="text-sm font-medium text-gray-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metric.value}</p>
              <div className="mt-2 flex items-center justify-center">
                {getChangeIcon(metric.change)}
                <span className={`ml-1 text-sm font-medium ${getChangeColor(metric.change)}`}>
                  {Math.abs(metric.change).toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{metric.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
