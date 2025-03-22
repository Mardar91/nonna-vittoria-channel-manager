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
  isPastDate?: boolean; // Nuova prop per identificare le date passate
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
  isPastDate = false, // Default a false
  onClick
}: DayCellProps) {
  
  // Determinare lo stile del bordo e dello sfondo
  let cellClassName = "h-28 p-1 border relative ";
  
  if (isToday) {
    cellClassName += "border-blue-500 border-2 ";
  } else if (isSelected) {
    cellClassName += "border-purple-500 border-2 ";
  } else {
    cellClassName += "border-gray-200 ";
  }
  
  if (isPastDate) {
    // Stile per le date passate (grigio)
    cellClassName += "bg-gray-200 text-gray-500 ";
  } else if (!isCurrentMonth) {
    cellClassName += "bg-gray-50 text-gray-400 ";
  } else if (isSelected) {
    cellClassName += "bg-purple-50 ";
  } else if (isBlocked) {
    cellClassName += "bg-red-50 ";
  } else if (hasCustomPrice) {
    cellClassName += "bg-blue-50 ";
  }
  
  // Aggiunge cursor-pointer
  cellClassName += "cursor-pointer ";
  
  return (
    <div className={cellClassName} onClick={onClick}>
      <div className="flex flex-col h-full">
        <div className="text-right text-sm font-medium">
          {date.getDate()}
        </div>
        
        <div className="flex-grow">
          {/* Non mostriamo più le informazioni di prenotazione qui, 
              ora vengono mostrate solo nella striscia */}
          
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
