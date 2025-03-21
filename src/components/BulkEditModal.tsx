'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dates: Date[];
  apartmentData: any;
  onSave: (data: any) => void;
}

export default function BulkEditModal({
  isOpen,
  onClose,
  dates,
  apartmentData,
  onSave
}: BulkEditModalProps) {
  const [price, setPrice] = useState<number | undefined>(apartmentData.price);
  const [isBlocked, setIsBlocked] = useState(false);
  const [minStay, setMinStay] = useState<number | undefined>(1);
  const [notes, setNotes] = useState('');
  
  // Determina se il prezzo sarà modificato
  const [modifyPrice, setModifyPrice] = useState(false);
  const [modifyBlocked, setModifyBlocked] = useState(true);
  const [modifyMinStay, setModifyMinStay] = useState(false);
  const [modifyNotes, setModifyNotes] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {};
    
    if (modifyPrice) data.price = price;
    if (modifyBlocked) data.isBlocked = isBlocked;
    if (modifyMinStay) data.minStay = minStay;
    if (modifyNotes) data.notes = notes;
    
    onSave(data);
  };
  
  // Ordina le date e formatta per la visualizzazione
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  
  const dateRangeText = 
    dates.length === 1 
      ? formatDate(dates[0])
      : `${formatDate(firstDate)} - ${formatDate(lastDate)} (${dates.length} date)`;
  
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
                      Modifica in blocco
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">
                      {dateRangeText}
                    </p>
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            id="modify-price"
                            name="modify-price"
                            type="checkbox"
                            checked={modifyPrice}
                            onChange={(e) => setModifyPrice(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="modify-price" className="ml-2 block text-sm text-gray-700">
                            Modifica prezzo
                          </label>
                        </div>
                        
                        {modifyPrice && (
                          <div className="ml-6">
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
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            id="modify-blocked"
                            name="modify-blocked"
                            type="checkbox"
                            checked={modifyBlocked}
                            onChange={(e) => setModifyBlocked(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="modify-blocked" className="ml-2 block text-sm text-gray-700">
                            Modifica stato blocco
                          </label>
                        </div>
                        
                        {modifyBlocked && (
                          <div className="ml-6">
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
                                Blocca queste date
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            id="modify-min-stay"
                            name="modify-min-stay"
                            type="checkbox"
                            checked={modifyMinStay}
                            onChange={(e) => setModifyMinStay(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="modify-min-stay" className="ml-2 block text-sm text-gray-700">
                            Modifica soggiorno minimo
                          </label>
                        </div>
                        
                        {modifyMinStay && (
                          <div className="ml-6">
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
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            id="modify-notes"
                            name="modify-notes"
                            type="checkbox"
                            checked={modifyNotes}
                            onChange={(e) => setModifyNotes(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="modify-notes" className="ml-2 block text-sm text-gray-700">
                            Modifica note
                          </label>
                        </div>
                        
                        {modifyNotes && (
                          <div className="ml-6">
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
                        )}
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                        >
                          Applica a tutte le date
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
