'use client';

import {
  BuildingOffice2Icon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface DashboardStatsProps {
  apartmentCount: number;
  bookingCount: number;
  pendingBookings: number;
}

export default function DashboardStats({
  apartmentCount,
  bookingCount,
  pendingBookings,
}: DashboardStatsProps) {
  const stats = [
    {
      name: 'Appartamenti Totali',
      value: apartmentCount,
      icon: BuildingOffice2Icon,
      change: '+4%',
      changeType: 'positive',
    },
    {
      name: 'Prenotazioni Totali',
      value: bookingCount,
      icon: CalendarIcon,
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Prenotazioni in Attesa',
      value: pendingBookings,
      icon: ClockIcon,
      change: '0',
      changeType: 'neutral',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
        >
          <dt>
            <div className="absolute rounded-md bg-blue-600 p-3">
              <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">
              {stat.name}
            </p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Vedi dettagli
                </a>
              </div>
            </div>
          </dd>
        </div>
      ))}
    </div>
  );
}
