'use client';

interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: string;
  numberOfGuests: number;
  totalPrice: number;
}

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  booking: Booking | null;
  bookingPosition?: 'start' | 'middle' | 'end' | 'single';
  isBlocked: boolean;
  hasCustomPrice: boolean;
  price: number;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onClick: () => void;
}

export default function DayCell({
  date,
  isCurrentMonth,
  isToday,
  booking,
  bookingPosition = 'single',
  isBlocked,
  hasCustomPrice,
  price,
  isSelected = false,
  isSelectionMode = false,
  onClick
}: DayCellProps) {
  
  // Determinare lo stile del bordo e dello sfondo
  let cellClassName = "h-28 p-1 border relative ";
  
  if (isToday) {
    cellClassName += "border-blue-500 border-2 ";
  } else if (isSelected) {
    cellClassName += "border-purple-500 border-2 ";
  } else if (booking) {
    // Bordi specifici per le prenotazioni
    if (bookingPosition === 'start') {
      cellClassName += "border-l-2 border-t-2 border-b-2 border-r-0 border-green-500 ";
    } else if (bookingPosition === 'middle') {
      cellClassName += "border-t-2 border-b-2 border-l-0 border-r-0 border-green-500 ";
    } else if (bookingPosition === 'end') {
      cellClassName += "border-r-2 border-t-2 border-b-2 border-l-0 border-green-500 ";
    } else if (bookingPosition === 'single') {
      cellClassName += "border-2 border-green-500 ";
    }
  } else {
    cellClassName += "border-gray-200 ";
  }
  
  if (!isCurrentMonth) {
    cellClassName += "bg-gray-50 text-gray-400 ";
  } else if (isSelected) {
    cellClassName += "bg-purple-50 ";
  } else if (booking) {
    if (booking.status === 'blocked' || isBlocked) {
      cellClassName += "bg-red-50 ";
    } else {
      cellClassName += "bg-green-50 ";
    }
  } else if (isBlocked) {
    cellClassName += "bg-red-50 ";
  } else if (hasCustomPrice) {
    cellClassName += "bg-blue-50 ";
  }
  
  // Aggiunge cursor-pointer quando siamo in modalità selezione o c'è una prenotazione
  if (isSelectionMode || booking) {
    cellClassName += "cursor-pointer ";
  }
  
  // Determine la classe CSS per il box della prenotazione
  let bookingBoxClass = "mt-1 text-xs p-1 ";
  
  if (booking) {
    if (booking.status === 'blocked' || isBlocked) {
      bookingBoxClass += "bg-red-100 ";
    } else {
      bookingBoxClass += "bg-green-100 ";
    }
    
    // Aggiungi bordi arrotondati solo dove necessario
    if (bookingPosition === 'start') {
      bookingBoxClass += "rounded-l ";
    } else if (bookingPosition === 'end') {
      bookingBoxClass += "rounded-r ";
    } else if (bookingPosition === 'single') {
      bookingBoxClass += "rounded ";
    }
  } else if (isBlocked) {
    bookingBoxClass += "bg-red-100 rounded ";
  }
  
  return (
    <div className={cellClassName} onClick={onClick}>
      <div className="flex flex-col h-full">
        <div className="text-right text-sm font-medium">
          {date.getDate()}
        </div>
        
        <div className="flex-grow">
          {booking && (
            <div className={bookingBoxClass}>
              <div className="font-medium truncate">
                {booking.status === 'blocked' || isBlocked ? 'CLOSED - Not available' : booking.guestName}
              </div>
              <div>
                {booking.numberOfGuests} ospiti
              </div>
              
              {/* Mostra solo nelle date iniziali o singole */}
              {(bookingPosition === 'start' || bookingPosition === 'single') && (
                <div className="text-xs mt-1 font-medium text-green-800">
                  {new Date(booking.checkIn).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit'
                  })} - {new Date(booking.checkOut).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </div>
              )}
            </div>
          )}
          
          {isBlocked && !booking && (
            <div className="mt-1 text-xs bg-red-100 p-1 rounded">
              CLOSED - Not available
            </div>
          )}
          
          {isCurrentMonth && (
            <div className={`mt-auto text-xs font-medium ${hasCustomPrice ? 'text-blue-700' : ''}`}>
              €{price.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
