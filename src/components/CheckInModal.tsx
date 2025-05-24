'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CheckInForm from './CheckInForm';
import { CheckInFormData } from '@/types/checkin';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingDetails: {
    guestName: string;
    numberOfGuests: number;
    apartmentName: string;
  };
}

export default function CheckInModal({ 
  isOpen, 
  onClose, 
  bookingId,
  bookingDetails 
}: CheckInModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  
  const handleSubmit = async (formData: CheckInFormData) => {
    setIsSubmitting(true);
    
    try {
      // Prepara i dati per l'API
      const guests = [
        {
          ...formData.mainGuest,
          isMainGuest: true
        },
        ...formData.additionalGuests.map(guest => ({
          ...guest,
          isMainGuest: false
        }))
      ];
      
      const response = await fetch('/api/checkin/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          guests,
          notes
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nel check-in');
      }
      
      const result = await response.json();
      
      toast.success('Check-in completato con successo!');
      onClose();
      router.refresh();
      
    } catch (error) {
      console.error('Error during manual check-in:', error);
      toast.error(error instanceof Error ? error.message : 'Errore nel completamento del check-in');
    } finally {
      setIsSubmitting(false);
    }
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-50 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <div className="flex justify-between items-center mb-4">
                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                          Check-in Manuale
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          onClick={onClose}
                        >
                          <span className="sr-only">Chiudi</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      
                      <div className="mt-2">
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Prenotazione:</strong> {bookingDetails.guestName}
                          </p>
                          <p className="text-sm text-blue-800">
                            <strong>Appartamento:</strong> {bookingDetails.apartmentName}
                          </p>
                          <p className="text-sm text-blue-800">
                            <strong>Numero ospiti:</strong> {bookingDetails.numberOfGuests}
                          </p>
                        </div>
                        
                        {/* Campo note aggiuntive */}
                        <div className="mb-4">
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                            Note (opzionale)
                          </label>
                          <textarea
                            id="notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="Eventuali note o osservazioni..."
                          />
                        </div>
                        
                        {/* Form di check-in */}
                        <div className="max-h-[60vh] overflow-y-auto">
                          <CheckInForm
                            numberOfGuests={bookingDetails.numberOfGuests}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
