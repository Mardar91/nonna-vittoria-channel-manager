'use client';

import { HomeIcon, UserIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ApartmentWithStatus {
  _id: string;
  name: string;
  address: string;
  status: 'available' | 'in_uscita' | 'reserved'; // Replaced 'freeing_soon' with 'in_uscita'
  currentBooking?: {
    guestName: string;
    checkOut: Date;
    numberOfGuests: number;
  } | null;
  nextBooking?: {
    guestName: string;
    checkIn: Date;
    numberOfGuests: number;
  } | null;
}

interface ApartmentStatusGridProps {
  apartments: ApartmentWithStatus[];
}

export default function ApartmentStatusGrid({ apartments }: ApartmentStatusGridProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          🏠 Stato Appartamenti
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apartments.map((apartment) => (
            <Link
              key={apartment._id}
              href={`/apartments/${apartment._id}`}
              className={`relative rounded-lg border-2 p-4 hover:shadow-md transition-all ${
                apartment.status === 'reserved'
                  ? 'border-green-200 bg-green-50'
                  : apartment.status === 'in_uscita' // Changed from freeing_soon
                  ? 'border-red-200 bg-red-50'      // Red style for in_uscita
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{apartment.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{apartment.address}</p>
                  
                  {/* Reserved Status */}
                  {apartment.status === 'reserved' && apartment.currentBooking && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center text-sm text-green-700">
                        <UserIcon className="w-4 h-4 mr-1" />
                        <span className="font-medium">{apartment.currentBooking.guestName}</span>
                      </div>
                      <div className="flex items-center text-xs text-green-600">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        <span>Check-out: {formatDate(apartment.currentBooking.checkOut)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Available Status */}
                  {apartment.status === 'available' && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Disponibile
                      </span>
                    </div>
                  )}
                  
                  {/* 'In Uscita' Status */}
                  {apartment.status === 'in_uscita' && (
                    <div className="mt-3 space-y-1">
                      <div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
                          In Uscita
                        </span>
                      </div>
                      {apartment.currentBooking && (
                        <>
                          <div className="flex items-center text-sm text-red-700">
                            <UserIcon className="w-4 h-4 mr-1" />
                            <span className="font-medium">{apartment.currentBooking.guestName}</span>
                          </div>
                          <div className="flex items-center text-xs text-red-600">
                            <CalendarDaysIcon className="w-4 h-4 mr-1" />
                            <span>Check-out: {new Date(apartment.currentBooking.checkOut).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {apartment.nextBooking && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Prossimo: <span className="font-medium">{apartment.nextBooking.guestName}</span>
                        <span className="ml-1">({formatDate(apartment.nextBooking.checkIn)})</span>
                      </p>
                    </div>
                  )}
                </div>
                
                <div className={`ml-4 rounded-full p-2 ${
                  apartment.status === 'reserved'
                    ? 'bg-green-100'
                    : apartment.status === 'in_uscita' // Changed from freeing_soon
                    ? 'bg-red-100'                   // Red style for in_uscita
                    : 'bg-gray-100'
                }`}>
                  <HomeIcon className={`w-6 h-6 ${
                    apartment.status === 'reserved'
                      ? 'text-green-600'
                      : apartment.status === 'in_uscita' // Changed from freeing_soon
                      ? 'text-red-600'                 // Red style for in_uscita
                      : 'text-gray-400'
                  }`} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
