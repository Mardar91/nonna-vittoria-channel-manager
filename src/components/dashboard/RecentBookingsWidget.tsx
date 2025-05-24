'use client';

import Link from 'next/link';
import { CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

interface Booking {
  _id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  apartmentId: string;
  status: string;
  totalPrice: number;
  createdAt: Date;
}

interface Apartment {
  _id: string;
  name: string;
}

interface RecentBookingsWidgetProps {
  bookings: Booking[];
  apartments: Apartment[];
}

export default function RecentBookingsWidget({ bookings, apartments }: RecentBookingsWidgetProps) {
  const getApartmentName = (apartmentId: string) => {
    const apartment = apartments.find(a => a._id === apartmentId);
    return apartment?.name || 'Sconosciuto';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; className: string } } = {
      confirmed: { label: 'Confermata', className: 'bg-green-100 text-green-800' },
      pending: { label: 'In attesa', className: 'bg-yellow-100 text-yellow-800' },
      cancelled: { label: 'Cancellata', className: 'bg-red-100 text-red-800' },
      completed: { label: 'Completata', className: 'bg-blue-100 text-blue-800' },
      inquiry: { label: 'Richiesta', className: 'bg-purple-100 text-purple-800' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          📋 Prenotazioni Recenti
        </h3>
        <Link
          href="/bookings"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Vedi tutte →
        </Link>
      </div>
      
      <div className="divide-y divide-gray-200">
        {bookings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nessuna prenotazione recente
          </div>
        ) : (
          bookings.map((booking) => (
            <Link
              key={booking._id}
              href={`/bookings/${booking._id}`}
              className="block p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    {getStatusBadge(booking.status)}
                  </div>
                  
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    <span>
                      {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{getApartmentName(booking.apartmentId)}</span>
                  </div>
                </div>
                
                <div className="ml-4 text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    €{booking.totalPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
