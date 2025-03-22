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
  hasSeasonalPrice?: boolean;
  seasonName?: string;
  price: number;
  minStay?: number;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  isPastDate?: boolean;
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
  hasSeasonalPrice = false,
  seasonName,
  price,
  minStay,
  isSelected = false,
  isSelectionMode = false,
  isPastDate = false,
  onClick
}: DayCellProps) {
  
  // Determinare lo stile del bordo e dello sfondo
  let cellClassName = "h-28 p-1 border relative ";
  
  if (isToday) {
    cellClassName += "border-blue-500 border-2 ";
  } else if (isSelected) {
    cellClassName += "border-indigo-500 border-2 ";
  } else {
    cellClassName += "border-gray-200 ";
  }
  
  if (isPastDate) {
    // Stile per le date passate (grigio)
    cellClassName += "bg-gray-200 text-gray-500 ";
  } else if (!isCurrentMonth) {
    cellClassName += "bg-gray-50 text-gray-400 ";
  } else if (isSelected) {
    cellClassName += "bg-indigo-50 ";
  } else if (isBlocked) {
    cellClassName += "bg-red-50 ";
  } else if (hasSeasonalPrice) {
    cellClassName += "bg-purple-50 ";
  } else if (hasCustomPrice) {
    cellClassName += "bg-blue-50 ";
  }
  
  // Aggiunge cursor-pointer
  cellClassName += "cursor-pointer ";
  
  return (
    <div className={cellClassName} onClick={onClick}>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            {date.getDate()}
          </span>
          {minStay && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
              Min: {minStay}
            </span>
          )}
        </div>
        
        <div className="flex-grow">
          {hasSeasonalPrice && seasonName && (
            <div className="mt-1 text-xs font-medium text-purple-600 truncate">
              {seasonName}
            </div>
          )}
          
          {isCurrentMonth && (
            <div className={`mt-auto text-xs font-medium ${
              hasCustomPrice ? 'text-blue-700' : 
              hasSeasonalPrice ? 'text-purple-700' : ''
            }`}>
              €{price.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
