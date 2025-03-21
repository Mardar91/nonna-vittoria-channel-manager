'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface RateModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  apartmentData: any;
  rateData?: {
    _id?: string;
    price?: number;
    isBlocked: boolean;
    minStay?: number;
    notes?: string;
  };
  onSave: (data: any) => void;
}

export default function RateModal({
  isOpen,
  onClose,
  date,
  apartmentData,
  rateData,
  onSave
}: RateModalProps) {
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isBlocked, setIsBlocked] = useState(false);
  const [minStay, setMinStay] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  
  // Aggiorna i campi quando il modal viene aperto o quando cambiano i dati
  useEffect(() => {
    if (rateData) {
      setPrice(rateData.price);
      setIsBlocked(rateData.isBlocked);
      setMinStay(rateData.minStay);
      setNotes(rateData.notes || '');
    } else {
      // Valori predefiniti
      setPrice(apartmentData.price);
      setIsBlocked(false);
      setMinStay(1);
      setNotes('');
    }
  }, [rateData, apartmentData, isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      price,
      isBlocked,
      minStay,
      notes,
    });
  };
  
  // Formatta la data per la visualizzazione
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Chiudi</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Gestione Data: {formatDate(date)}
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                          Prezzo
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">€</span>
                          </div>
                          <input
                            type="number"
                            name="price"
                            id="price"
                            min="0"
                            step="0.01"
                            value={price === undefined ? '' : price}
                            onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder={apartmentData.price.toFixed(2)}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Prezzo di default: €{apartmentData.price.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="is-blocked"
                          name="is-blocked"
                          type="checkbox"
                          checked={isBlocked}
                          onChange={(e) => setIsBlocked(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is-blocked" className="ml-2 block text-sm text-gray-700">
                          Blocca questa data
                        </label>
                      </div>
                      
                      <div>
                        <label htmlFor="min-stay" className="block text-sm font-medium text-gray-700">
                          Soggiorno minimo (notti)
                        </label>
                        <input
                          type="number"
                          name="min-stay"
                          id="min-stay"
                          min="1"
                          value={minStay === undefined ? '' : minStay}
                          onChange={(e) => setMinStay(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Note
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                        >
                          Salva
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={onClose}
                        >
                          Annulla
                        </button>
                      </div>
                    </form>
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
