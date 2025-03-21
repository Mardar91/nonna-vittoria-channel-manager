'use client';

import React from 'react';

interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: string;
  numberOfGuests: number;
  totalPrice: number;
}

interface BookingStripProps {
  booking: Booking;
  style: React.CSSProperties;
  onClick?: () => void;
}

export default function BookingStrip({ booking, style, onClick }: BookingStripProps) {
  // Calcola la durata in giorni
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const durationMs = checkOut.getTime() - checkIn.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
  
  // Formatta il testo da visualizzare
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  const isBlocked = booking.status === 'blocked';
  
  return (
    <div 
      className={`absolute z-10 pointer-events-auto px-2 py-1 rounded-lg ${
        isBlocked ? 'bg-red-100 border border-red-500 text-red-800' : 'bg-green-100 border border-green-500 text-green-800'
      }`}
      style={style}
      onClick={onClick}
    >
      <div className="text-xs font-semibold truncate">
        {isBlocked ? 'CLOSED - Not available' : booking.guestName}
      </div>
      {!isBlocked && (
        <div className="text-xs">
          {booking.numberOfGuests} ospiti
        </div>
      )}
      <div className="text-xs font-medium">
        {formatDate(checkIn)} - {formatDate(checkOut)}
      </div>
    </div>
  );
}
