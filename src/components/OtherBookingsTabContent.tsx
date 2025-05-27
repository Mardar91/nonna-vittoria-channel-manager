'use client';

import { useState, useMemo } from 'react';
import { IBooking } from '@/models/Booking'; // Assuming IBooking is the correct type
import BookingList from '@/components/BookingList'; // Assuming BookingList can be reused

interface OtherBookingsTabContentProps {
  bookings: (IBooking & { apartmentName: string })[];
}

// Define the status options for filtering
const statusFilters = [
  { label: 'In Attesa', value: 'pending' },
  { label: 'Completate', value: 'completed' },
  { label: 'Cancellate', value: 'cancelled' },
];

export default function OtherBookingsTabContent({ bookings }: OtherBookingsTabContentProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'completed', 'cancelled']); // Default to all selected

  const handleStatusToggle = (statusValue: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusValue)
        ? prev.filter(s => s !== statusValue)
        : [...prev, statusValue]
    );
  };

  const filteredBookings = useMemo(() => {
    // If no statuses are selected, or all are selected, show all bookings for this tab
    if (selectedStatuses.length === 0 || selectedStatuses.length === statusFilters.length) {
      return bookings;
    }
    return bookings.filter(booking => selectedStatuses.includes(booking.status));
  }, [bookings, selectedStatuses]);

  return (
    <div className="p-4 space-y-4">
      {/* Filter UI */}
      <div className="flex flex-wrap gap-2 items-center border-b pb-4">
        <span className="text-sm font-medium mr-2">Filtra per stato:</span>
        {statusFilters.map(status => (
          <button
            key={status.value}
            onClick={() => handleStatusToggle(status.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
              ${selectedStatuses.includes(status.value)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
              }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {/* Booking List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Nessuna prenotazione trovata per i filtri selezionati.
        </div>
      ) : (
        <BookingList bookings={filteredBookings} />
      )}
    </div>
  );
}
