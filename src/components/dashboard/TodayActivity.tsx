'use client';

import { useState, useEffect } from 'react';
import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Booking {
  _id: string;
  guestName: string;
  apartmentId: string;
  numberOfGuests: number;
  checkIn: Date;
  checkOut: Date;
}

interface PendingCheckIn {
  _id: string;
  mainGuestName: string;
  guestCount: number;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  checkInDate: Date;
}

interface TodayActivityProps {
  checkIns: Booking[];
  checkOuts: Booking[];
}

export default function TodayActivity({ checkIns, checkOuts }: TodayActivityProps) {
  const [pendingCheckIns, setPendingCheckIns] = useState<PendingCheckIn[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  
  useEffect(() => {
    fetchPendingCheckIns();
  }, []);
  
  const fetchPendingCheckIns = async () => {
    try {
      const response = await fetch('/api/checkins/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingCheckIns(data);
      }
    } catch (error) {
      console.error('Error fetching pending check-ins:', error);
    } finally {
      setLoadingPending(false);
    }
  };
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow h-full">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          ⚡ Attività di Oggi
        </h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {/* Check-ins da smistare */}
        {!loadingPending && pendingCheckIns.length > 0 && (
          <div className="p-6 bg-yellow-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
                <h4 className="font-medium text-gray-900">
                  Check-in da Smistare ({pendingCheckIns.length})
                </h4>
              </div>
              <Link
                href="/checkins?filterStatus=pending_assignment"
                className="text-xs text-yellow-600 hover:text-yellow-800"
              >
                Vedi tutti
              </Link>
            </div>
            
            <ul className="space-y-2">
              {pendingCheckIns.slice(0, 3).map((checkIn) => (
                <li key={checkIn._id}>
                  <Link
                    href={`/checkins/${checkIn._id}`}
                    className="block hover:bg-yellow-100 rounded p-2 -m-2 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {checkIn.mainGuestName}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{checkIn.guestCount} ospiti</span>
                      {checkIn.requestedCheckIn && (
                        <span className="ml-2">
                          • {formatDate(checkIn.requestedCheckIn)} - {formatDate(checkIn.requestedCheckOut || '')}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
              {pendingCheckIns.length > 3 && (
                <li className="text-xs text-gray-500 text-center pt-1">
                  e altri {pendingCheckIns.length - 3}...
                </li>
              )}
            </ul>
          </div>
        )}
        
        {/* Check-ins */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <ArrowRightOnRectangleIcon className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-medium text-gray-900">Check-in ({checkIns.length})</h4>
            </div>
            {checkIns.length > 0 && (
              <Link
                href="/bookings?filter=today-checkin"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Vedi tutti
              </Link>
            )}
          </div>
          
          {checkIns.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun check-in previsto</p>
          ) : (
            <ul className="space-y-2">
              {checkIns.slice(0, 3).map((booking) => (
                <li key={booking._id}>
                  <Link
                    href={`/bookings/${booking._id}`}
                    className="block hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {booking.guestName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.numberOfGuests} ospiti
                    </p>
                  </Link>
                </li>
              ))}
              {checkIns.length > 3 && (
                <li className="text-xs text-gray-500 text-center pt-1">
                  e altri {checkIns.length - 3}...
                </li>
              )}
            </ul>
          )}
        </div>
        
        {/* Check-outs */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <ArrowLeftOnRectangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <h4 className="font-medium text-gray-900">Check-out ({checkOuts.length})</h4>
            </div>
            {checkOuts.length > 0 && (
              <Link
                href="/bookings?filter=today-checkout"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Vedi tutti
              </Link>
            )}
          </div>
          
          {checkOuts.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun check-out previsto</p>
          ) : (
            <ul className="space-y-2">
              {checkOuts.slice(0, 3).map((booking) => (
                <li key={booking._id}>
                  <Link
                    href={`/bookings/${booking._id}`}
                    className="block hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {booking.guestName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.numberOfGuests} ospiti
                    </p>
                  </Link>
                </li>
              ))}
              {checkOuts.length > 3 && (
                <li className="text-xs text-gray-500 text-center pt-1">
                  e altri {checkOuts.length - 3}...
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
