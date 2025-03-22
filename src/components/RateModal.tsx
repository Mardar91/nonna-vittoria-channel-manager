'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface SeasonalPrice {
  name: string;
  startDate: Date;
  endDate: Date;
  price: number;
}

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
  seasonData?: SeasonalPrice | null;
  booking?: {
    id: string;
    guestName: string;
    checkIn: Date;
    checkOut: Date;
    numberOfGuests: number;
    status: string;
  } | null;
  onSave: (data: any) => void;
  onCreateBooking: (date: Date) => void;
}

export default function RateModal({
  isOpen,
  onClose,
  date,
  apartmentData,
  rateData,
  seasonData,
  booking,
  onSave,
  onCreateBooking
}: RateModalProps) {
  const router = useRouter();
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isBlocked, setIsBlocked] = useState(false);
  const [minStay, setMinStay] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  
  // Determina il soggiorno minimo effettivo per questa data (personalizzato o predefinito)
  const effectiveMinStay = rateData?.minStay !== undefined ? rateData.minStay : (apartmentData.minStay || 1);
  
  // Aggiorna i campi quando il modal viene aperto o quando cambiano i dati
  useEffect(() => {
    if (rateData) {
      setPrice(rateData.price);
      setIsBlocked(rateData.isBlocked);
      setMinStay(rateData.minStay);
      setNotes(rateData.notes || '');
    } else {
      // Valori predefiniti
      // Se esiste un prezzo stagionale, usa quello come valore predefinito
      setPrice(seasonData ? seasonData.price : apartmentData.price);
      setIsBlocked(false);
      setMinStay(apartmentData.minStay || 1);
      setNotes('');
    }
  }, [rateData, seasonData, apartmentData, isOpen]);
  
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
    // Usa il fuso orario italiano (CET/CEST)
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Rome'
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

                    {/* Sezione stagione */}
                    {seasonData && (
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <h4 className="font-medium text-purple-800">Stagione: {seasonData.name}</h4>
                        <p className="text-sm text-purple-700">
                          Periodo: {formatDate(seasonData.startDate)} - {formatDate(seasonData.endDate)}
                        </p>
                        <p className="text-sm text-purple-700">
                          Prezzo stagionale: €{seasonData.price.toFixed(2)}
                        </p>
                      </div>
                    )}
                    
                    {/* Sezione soggiorno minimo - Mostrato solo se >= 2 notti */}
                    {effectiveMinStay >= 2 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="font-medium text-yellow-800">Soggiorno Minimo</h4>
                        <p className="text-sm text-yellow-700">
                          L'appartamento richiede un soggiorno minimo di {effectiveMinStay} notti.
                        </p>
                      </div>
                    )}
                    
                    {/* Sezione prenotazione esistente */}
                    {booking && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="font-medium text-green-800">Prenotazione esistente</h4>
                        <p className="text-sm text-green-700 mt-1">
                          <span className="font-medium">Ospite:</span> {booking.guestName}
                        </p>
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Check-in:</span> {new Date(booking.checkIn).toLocaleDateString('it-IT', {timeZone: 'Europe/Rome'})}
                        </p>
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Check-out:</span> {new Date(booking.checkOut).toLocaleDateString('it-IT', {timeZone: 'Europe/Rome'})}
                        </p>
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Ospiti:</span> {booking.numberOfGuests}
                        </p>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/bookings/${booking.id}`)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                          >
                            Vedi dettagli prenotazione
                          </button>
                        </div>
                      </div>
                    )}
                    
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
                            placeholder={seasonData ? seasonData.price.toFixed(2) : apartmentData.price.toFixed(2)}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {seasonData 
                            ? `Prezzo stagionale: €${seasonData.price.toFixed(2)}`
                            : `Prezzo di default: €${apartmentData.price.toFixed(2)}`}
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
                        <p className="mt-1 text-xs text-gray-500">
                          Soggiorno minimo dell'appartamento: {apartmentData.minStay || 1} notti
                        </p>
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
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                        <button
                          type="submit"
                          className="inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
                        >
                          Salva
                        </button>
                        
                        {!booking && (
                          <button
                            type="button"
                            onClick={() => onCreateBooking(date)}
                            className="inline-flex justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:w-auto"
                          >
                            Nuova Prenotazione
                          </button>
                        )}
                        
                        <button
                          type="button"
                          className="mt-3 inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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
