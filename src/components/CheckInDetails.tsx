'use client';

import React, { useState, useEffect } from 'react';
import { UserIcon, IdentificationIcon, CalendarIcon, HomeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CheckInDetailsProps {
  bookingId: string;
}

interface Guest {
  fullName: string;
  dateOfBirth: string;
  documentInfo?: string;
  isMainGuest: boolean;
}

interface CheckInData {
  id: string;
  bookingId: string;
  apartmentName: string;
  checkInDate: string;
  guests: Guest[];
  status: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export default function CheckInDetails({ bookingId }: CheckInDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<CheckInData | null>(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    loadCheckInDetails();
  }, [bookingId]);
  
  const loadCheckInDetails = async () => {
    try {
      const response = await fetch(`/api/checkin/${bookingId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Check-in non ancora effettuato');
        } else {
          setError('Errore nel caricamento dei dettagli');
        }
        return;
      }
      
      const data = await response.json();
      setCheckIn(data);
    } catch (error) {
      console.error('Error loading check-in details:', error);
      setError('Errore nel caricamento dei dettagli');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500 text-center">{error}</p>
      </div>
    );
  }
  
  if (!checkIn) {
    return null;
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
          Dettagli Check-in
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm">
            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span className="font-medium text-gray-500 mr-2">Data check-in:</span>
            <span>{formatDate(checkIn.checkInDate)}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <HomeIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span className="font-medium text-gray-500 mr-2">Appartamento:</span>
            <span>{checkIn.apartmentName}</span>
          </div>
          
          {checkIn.completedAt && (
            <div className="text-sm text-gray-500">
              Completato il: {formatDate(checkIn.completedAt)}
            </div>
          )}
          
          {checkIn.completedBy && (
            <div className="text-sm text-gray-500">
              Completato da: {checkIn.completedBy === 'guest' ? 'Ospite' : checkIn.completedBy}
            </div>
          )}
        </div>
      </div>
      
      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Ospiti Registrati ({checkIn.guests.length})</h3>
        
        <div className="space-y-3">
          {checkIn.guests.map((guest, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg ${
                guest.isMainGuest ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">{guest.fullName}</span>
                    {guest.isMainGuest && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Ospite principale
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span>Nato il {new Date(guest.dateOfBirth).toLocaleDateString('it-IT')}</span>
                    <span className="ml-2">({calculateAge(guest.dateOfBirth)} anni)</span>
                  </div>
                  
                  {guest.documentInfo && (
                    <div className="flex items-center mt-1 text-sm text-gray-600">
                      <IdentificationIcon className="h-4 w-4 mr-1" />
                      <span>{guest.documentInfo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {checkIn.notes && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Note:</span> {checkIn.notes}
          </p>
        </div>
      )}
    </div>
  );
}
