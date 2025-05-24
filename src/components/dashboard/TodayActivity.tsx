'use client';

import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Booking {
  _id: string;
  guestName: string;
  apartmentId: string;
  numberOfGuests: number;
  checkIn: Date;
  checkOut: Date;
}

interface TodayActivityProps {
  checkIns: Booking[];
  checkOuts: Booking[];
}

export default function TodayActivity({ checkIns, checkOuts }: TodayActivityProps) {
  return (
    <div className="bg-white rounded-lg shadow h-full">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          ⚡ Attività di Oggi
        </h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {/* Check-ins */}
        <div className="p-6">
          <div className="flex items-center mb-3">
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-medium text-gray-900">Check-in ({checkIns.length})</h4>
          </div>
          
          {checkIns.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun check-in previsto</p>
          ) : (
            <ul className="space-y-2">
              {checkIns.map((booking) => (
                <li key={booking._id}>
                  <Link
                    href={`/bookings/${booking._id}`}
                    className="block hover:bg-gray-50 rounded p-2 -m-2"
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
            </ul>
          )}
        </div>
        
        {/* Check-outs */}
        <div className="p-6">
          <div className="flex items-center mb-3">
            <ArrowLeftOnRectangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="font-medium text-gray-900">Check-out ({checkOuts.length})</h4>
          </div>
          
          {checkOuts.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun check-out previsto</p>
          ) : (
            <ul className="space-y-2">
              {checkOuts.map((booking) => (
                <li key={booking._id}>
                  <Link
                    href={`/bookings/${booking._id}`}
                    className="block hover:bg-gray-50 rounded p-2 -m-2"
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
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
