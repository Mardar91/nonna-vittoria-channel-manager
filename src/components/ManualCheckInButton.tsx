'use client';

import React, { useState } from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import CheckInModal from './CheckInModal';

interface ManualCheckInButtonProps {
  bookingId: string;
  bookingDetails: {
    guestName: string;
    numberOfGuests: number;
    apartmentName: string;
  };
}

export default function ManualCheckInButton({ 
  bookingId, 
  bookingDetails 
}: ManualCheckInButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1.5" />
        Check-in Manuale
      </button>
      
      <CheckInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingId={bookingId}
        bookingDetails={bookingDetails}
      />
    </>
  );
}
