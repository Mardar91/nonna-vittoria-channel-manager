'use client';

import { HomeIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ApartmentStatus {
  id: string;
  name: string;
  status: 'occupied' | 'available';
  currentGuest: string | null;
  checkOutDate: Date | null;
  nextCheckIn: Date | null;
  price: number;
}

interface ApartmentStatusGridProps {
  apartments: ApartmentStatus[];
}

export default function ApartmentStatusGrid({ apartments }: ApartmentStatusGridProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getDaysUntil = (date: Date | null) => {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 rounded-xl p-3">
            <HomeIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stato Appartamenti</h2>
            <p className="text-sm text-gray-500">Vista in tempo reale</p>
          </div>
        </div>
        <Link 
          href="/apartments" 
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Vedi tutti →
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {apartments.map((apartment) => (
          <div
            key={apartment.id}
            className={`relative rounded-xl border-2 p-4 transition-all hover:shadow-md ${
              apartment.status === 'occupied' 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-gray-200 bg-white'
            }`}
          >
            <Link href={`/apartments/${apartment.id}`} className="block">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{apartment.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">€{apartment.price}/notte</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                  apartment.status === 'occupied'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {apartment.status === 'occupied' ? 'Occupato' : 'Disponibile'}
                </div>
              </div>
              
              {apartment.status === 'occupied' && apartment.currentGuest && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <UserIcon className="h-4 w-4 mr-1.5" />
                    <span className="font-medium">{apartment.currentGuest}</span>
                  </div>
                  {apartment.checkOutDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-1.5" />
                      <span>Check-out: {formatDate(apartment.checkOutDate)}</span>
                      <span className="ml-1 text-blue-600 font-medium">
                        ({getDaysUntil(apartment.checkOutDate)} giorni)
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {apartment.status === 'available' && apartment.nextCheckIn && (
                <div className="mt-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                    <span>Prossimo check-in: {formatDate(apartment.nextCheckIn)}</span>
                    <span className="ml-1 text-orange-600 font-medium">
                      ({getDaysUntil(apartment.nextCheckIn)} giorni)
                    </span>
                  </div>
                </div>
              )}
              
              {apartment.status === 'available' && !apartment.nextCheckIn && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500">Nessuna prenotazione in programma</p>
                </div>
              )}
            </Link>
          </div>
        ))}
      </div>
      
      {/* Riepilogo rapido */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Disponibili</p>
          <p className="text-2xl font-semibold text-green-600">
            {apartments.filter(a => a.status === 'available').length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Occupati</p>
          <p className="text-2xl font-semibold text-blue-600">
            {apartments.filter(a => a.status === 'occupied').length}
          </p>
        </div>
      </div>
    </div>
  );
}
