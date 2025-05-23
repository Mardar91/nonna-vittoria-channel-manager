'use client';

import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Booking {
  id: string;
  guestName: string;
  apartmentName: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalPrice: number;
  createdAt?: Date;
}

interface RecentBookingsProps {
  bookings: Booking[];
}

export default function RecentBookings({ bookings }: RecentBookingsProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inquiry':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata';
      case 'pending':
        return 'In attesa';
      case 'cancelled':
        return 'Cancellata';
      case 'inquiry':
        return 'Richiesta';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 rounded-xl p-3">
              <CalendarIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Prenotazioni Recenti</h2>
              <p className="text-sm text-gray-500">Ultime prenotazioni ricevute</p>
            </div>
          </div>
          <Link 
            href="/bookings" 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Vedi tutte →
          </Link>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {bookings.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Nessuna prenotazione recente</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <Link 
              key={booking.id}
              href={`/bookings/${booking.id}`}
              className="block hover:bg-gray-50 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {booking.guestName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                        {translateStatus(booking.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{booking.apartmentName}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</span>
                      </div>
                      {booking.createdAt && (
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span>{formatTime(booking.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-semibold text-gray-900">
                      €{booking.totalPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))} notti
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
