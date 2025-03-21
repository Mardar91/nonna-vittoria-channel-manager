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
  let cellClassName = "h-28 p-1 border ";
  
  if (isToday) {
    cellClassName += "border-blue-500 border-2 ";
  } else if (isSelected) {
    cellClassName += "border-purple-500 border-2 ";
  } else {
    cellClassName += "border-gray-200 ";
  }
  
  if (!isCurrentMonth) {
    cellClassName += "bg-gray-50 text-gray-400 ";
  } else if (isSelected) {
    cellClassName += "bg-purple-50 ";
  } else if (booking) {
    cellClassName += "bg-green-50 ";
  } else if (isBlocked) {
    cellClassName += "bg-red-50 ";
  } else if (hasCustomPrice) {
    cellClassName += "bg-blue-50 ";
  }
  
  // Aggiunge cursor-pointer quando siamo in modalità selezione o c'è una prenotazione
  if (isSelectionMode || booking) {
    cellClassName += "cursor-pointer ";
  }
  
  // Stili specifici per i bordi delle prenotazioni continue
  if (booking) {
    if (bookingPosition === 'start') {
      cellClassName += "rounded-l-lg border-l-2 border-t-2 border-b-2 border-green-500 ";
    } else if (bookingPosition === 'middle') {
      cellClassName += "border-t-2 border-b-2 border-green-500 border-l-0 border-r-0 ";
    } else if (bookingPosition === 'end') {
      cellClassName += "rounded-r-lg border-r-2 border-t-2 border-b-2 border-green-500 ";
    } else if (bookingPosition === 'single') {
      cellClassName += "rounded-lg border-2 border-green-500 ";
    }
  }
  
  return (
    <div
      className={cellClassName}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="text-right text-sm font-medium">
          {date.getDate()}
        </div>
        
        <div className="flex-grow">
          {booking && (
            <div className={`mt-1 text-xs p-1 rounded ${
              bookingPosition === 'start' ? 'rounded-l-lg bg-green-100' :
              bookingPosition === 'middle' ? 'rounded-none bg-green-100' :
              bookingPosition === 'end' ? 'rounded-r-lg bg-green-100' :
              'rounded-lg bg-green-100'
            }`}>
              <div className="font-medium truncate">{booking.guestName}</div>
              <div>{booking.numberOfGuests} ospiti</div>
              
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
