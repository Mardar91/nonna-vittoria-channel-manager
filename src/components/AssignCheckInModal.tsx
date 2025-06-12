'use client';

import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface CheckInData {
  id: string;
  mainGuestName: string;
  guestCount: number;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  notes?: string;
}

interface BookingOption {
  _id: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  apartmentName: string;
  numberOfGuests: number;
  source: string;
  hasExistingCheckIn: boolean;
  isAvailableForAssignment: boolean;
}

interface AssignCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkIn: CheckInData;
  onAssignmentComplete: () => void;
}

export default function AssignCheckInModal({
  isOpen,
  onClose,
  checkIn,
  onAssignmentComplete
}: AssignCheckInModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fetchAvailableBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        checkInDate: checkIn.requestedCheckIn || '',
        checkOutDate: checkIn.requestedCheckOut || ''
      });
      
      const response = await fetch(`/api/checkin/assign?${params}`);
      
      if (!response.ok) {
        throw new Error('Errore nel recupero delle prenotazioni');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
        if (data.bookings.length === 0) {
          setError('Nessuna prenotazione disponibile per le date specificate');
        }
      } else {
        setError(data.error || 'Errore nel caricamento delle prenotazioni');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Errore nel caricamento delle prenotazioni disponibili');
    } finally {
      setLoading(false);
    }
  }, [checkIn.requestedCheckIn, checkIn.requestedCheckOut, setLoading, setError, setBookings]); // Specific properties of checkIn

  useEffect(() => {
    if (isOpen && checkIn.requestedCheckIn && checkIn.requestedCheckOut) {
      fetchAvailableBookings();
    }
  }, [isOpen, checkIn.requestedCheckIn, checkIn.requestedCheckOut, fetchAvailableBookings]); // Also use specific props here
  
  const handleAssign = async () => {
    if (!selectedBookingId) {
      toast.error('Seleziona una prenotazione');
      return;
    }
    
    setAssigning(true);
    
    try {
      const response = await fetch('/api/checkin/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkInId: checkIn.id,
          bookingId: selectedBookingId
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Check-in assegnato con successo!');
        onAssignmentComplete();
        
        // Reindirizza alla prenotazione
        setTimeout(() => {
          router.push(`/bookings/${selectedBookingId}`);
        }, 1000);
      } else {
        // Gestione errori specifici
        if (data.details) {
          toast.error(
            <div>
              <p className="font-medium">{data.error}</p>
              <p className="text-sm mt-1">
                Date richieste: {data.details.requestedDates.checkIn} - {data.details.requestedDates.checkOut}
              </p>
              <p className="text-sm">
                Date prenotazione: {data.details.bookingDates.checkIn} - {data.details.bookingDates.checkOut}
              </p>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error(data.error || 'Errore nell\'assegnazione del check-in');
        }
      }
    } catch (error) {
      console.error('Error assigning check-in:', error);
      toast.error('Errore nell\'assegnazione del check-in');
    } finally {
      setAssigning(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const getSourceBadge = (source: string) => {
    const badges: Record<string, string> = {
      'direct': 'bg-blue-100 text-blue-800',
      'airbnb': 'bg-red-100 text-red-800',
      'booking': 'bg-green-100 text-green-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    
    return badges[source] || badges.other;
  };
  
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Smista Check-in
                      </Dialog.Title>
                      
                      <div className="mt-4">
                        {/* Informazioni Check-in */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Check-in da assegnare:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Ospite:</span> {checkIn.mainGuestName}
                            </div>
                            <div>
                              <span className="text-gray-500">N° Ospiti:</span> {checkIn.guestCount}
                            </div>
                            {checkIn.requestedCheckIn && (
                              <div>
                                <span className="text-gray-500">Check-in:</span> {formatDate(checkIn.requestedCheckIn)}
                              </div>
                            )}
                            {checkIn.requestedCheckOut && (
                              <div>
                                <span className="text-gray-500">Check-out:</span> {formatDate(checkIn.requestedCheckOut)}
                              </div>
                            )}
                          </div>
                          {checkIn.notes && (
                            <div className="mt-2">
                              <span className="text-gray-500 text-sm">Note:</span>
                              <p className="text-sm text-gray-700 mt-1">{checkIn.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Lista prenotazioni disponibili */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Seleziona una prenotazione compatibile:
                          </h4>
                          
                          {loading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                          ) : error ? (
                            <div className="text-center py-8">
                              <p className="text-red-600">{error}</p>
                              <button
                                onClick={fetchAvailableBookings}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                              >
                                Riprova
                              </button>
                            </div>
                          ) : bookings.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-500">Nessuna prenotazione disponibile</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {bookings.map((booking) => (
                                <div
                                  key={booking._id}
                                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                    selectedBookingId === booking._id
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={() => setSelectedBookingId(booking._id)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center">
                                        <input
                                          type="radio"
                                          name="booking"
                                          value={booking._id}
                                          checked={selectedBookingId === booking._id}
                                          onChange={() => setSelectedBookingId(booking._id)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                          <p className="font-medium text-gray-900">
                                            {booking.guestName}
                                          </p>
                                          <p className="text-sm text-gray-500">
                                            {booking.guestEmail}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="text-gray-500">Appartamento:</span> {booking.apartmentName}
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Ospiti:</span> {booking.numberOfGuests}
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Check-in:</span> {formatDate(booking.checkIn)}
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Check-out:</span> {formatDate(booking.checkOut)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${getSourceBadge(booking.source)}`}>
                                        {booking.source}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    disabled={!selectedBookingId || assigning}
                    onClick={handleAssign}
                    className="inline-flex w-full justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? 'Assegnazione in corso...' : 'Assegna Check-in'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={assigning}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Annulla
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
