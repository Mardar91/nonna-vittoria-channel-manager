'use client';

import React from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface CheckInStatusBadgeProps {
  hasCheckedIn: boolean;
  checkInDate?: Date;
  size?: 'sm' | 'md' | 'lg';
}

export default function CheckInStatusBadge({ 
  hasCheckedIn, 
  checkInDate,
  size = 'md' 
}: CheckInStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  if (hasCheckedIn) {
    return (
      <span className={`inline-flex items-center ${sizeClasses[size]} rounded-full bg-green-100 text-green-800`}>
        <CheckCircleIcon className={`${iconSizes[size]} mr-1`} />
        Check-in effettuato
        {checkInDate && size !== 'sm' && (
          <span className="ml-1 text-green-600">
            ({new Date(checkInDate).toLocaleDateString('it-IT')})
          </span>
        )}
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} rounded-full bg-yellow-100 text-yellow-800`}>
      <ClockIcon className={`${iconSizes[size]} mr-1`} />
      In attesa di check-in
    </span>
  );
}
