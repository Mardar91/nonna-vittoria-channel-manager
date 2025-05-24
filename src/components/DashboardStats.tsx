'use client';

import {
  BuildingOffice2Icon,
  CalendarIcon,
  CurrencyEuroIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

interface DashboardStatsProps {
  apartmentCount: number;
  totalBookings: number;
  activeToday: number;
  monthlyRevenue: number;
}

export default function DashboardStats({
  apartmentCount,
  totalBookings,
  activeToday,
  monthlyRevenue,
}: DashboardStatsProps) {
  const stats = [
    {
      name: 'Appartamenti',
      value: apartmentCount,
      icon: BuildingOffice2Icon,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: null,
    },
    {
      name: 'Prenotazioni Totali',
      value: totalBookings,
      icon: CalendarIcon,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: null,
    },
    {
      name: 'Occupati Oggi',
      value: activeToday,
      icon: HomeIcon,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      suffix: `/${apartmentCount}`,
    },
    {
      name: 'Ricavi del Mese',
      value: `€${monthlyRevenue.toFixed(2)}`,
      icon: CurrencyEuroIcon,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative bg-white overflow-hidden rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.bgColor} rounded-md p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      {stat.suffix}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
