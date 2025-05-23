'use client';

import {
  BuildingOffice2Icon,
  ChartBarIcon,
  CurrencyEuroIcon,
  ClockIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';

interface DashboardStatsProps {
  totalApartments: number;
  occupiedToday: number;
  occupancyRate: number;
  monthRevenue: number;
  pendingBookings: number;
}

export default function DashboardStats({
  totalApartments,
  occupiedToday,
  occupancyRate,
  monthRevenue,
  pendingBookings,
}: DashboardStatsProps) {
  const stats = [
    {
      id: 1,
      name: 'Tasso di Occupazione',
      value: `${occupancyRate}%`,
      icon: ChartBarIcon,
      change: occupancyRate > 70 ? '+12%' : '-5%',
      changeType: occupancyRate > 70 ? 'positive' : 'negative',
      description: `${occupiedToday} su ${totalApartments} occupati`,
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-blue-600/20',
      textColor: 'text-blue-600',
    },
    {
      id: 2,
      name: 'Ricavi del Mese',
      value: `€${monthRevenue.toLocaleString('it-IT')}`,
      icon: CurrencyEuroIcon,
      change: '+23%',
      changeType: 'positive',
      description: 'Rispetto al mese scorso',
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      iconBg: 'bg-green-600/20',
      textColor: 'text-green-600',
    },
    {
      id: 3,
      name: 'Appartamenti Liberi',
      value: totalApartments - occupiedToday,
      icon: HomeIcon,
      change: '0',
      changeType: 'neutral',
      description: 'Disponibili oggi',
      bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconBg: 'bg-purple-600/20',
      textColor: 'text-purple-600',
    },
    {
      id: 4,
      name: 'Prenotazioni in Attesa',
      value: pendingBookings,
      icon: ClockIcon,
      change: pendingBookings > 0 ? `${pendingBookings}` : '0',
      changeType: pendingBookings > 0 ? 'warning' : 'neutral',
      description: 'Da confermare',
      bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600',
      iconBg: 'bg-orange-600/20',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.id}
          className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className={`rounded-xl p-3 ${item.iconBg}`}>
                <item.icon className={`h-6 w-6 ${item.textColor}`} aria-hidden="true" />
              </div>
              {item.change !== '0' && (
                <div
                  className={`inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium ${
                    item.changeType === 'positive'
                      ? 'bg-green-100 text-green-800'
                      : item.changeType === 'negative'
                      ? 'bg-red-100 text-red-800'
                      : item.changeType === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.changeType === 'positive' && (
                    <ArrowUpIcon
                      className="-ml-0.5 mr-0.5 h-4 w-4 flex-shrink-0 self-center text-green-500"
                      aria-hidden="true"
                    />
                  )}
                  {item.changeType === 'negative' && (
                    <ArrowDownIcon
                      className="-ml-0.5 mr-0.5 h-4 w-4 flex-shrink-0 self-center text-red-500"
                      aria-hidden="true"
                    />
                  )}
                  <span>{item.change}</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">{item.name}</h3>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
            </div>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${item.bgColor}`}
          />
        </div>
      ))}
    </div>
  );
}
