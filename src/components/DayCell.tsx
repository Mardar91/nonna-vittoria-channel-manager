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
  
  // Aggiunge cursor-pointer quando siamo in modalità selezione
  if (isSelectionMode) {
    cellClassName += "cursor-pointer ";
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
            <div className="mt-1 text-xs bg-green-100 p-1 rounded">
              <div className="font-medium truncate">{booking.guestName}</div>
              <div>{booking.numberOfGuests} ospiti</div>
            </div>
          )}
          
          {isBlocked && !booking && (
            <div className="mt-1 text-xs bg-red-100 p-1 rounded">
              Bloccato
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
