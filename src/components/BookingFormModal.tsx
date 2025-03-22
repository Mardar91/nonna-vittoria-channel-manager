'use client';

import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  apartmentId: string;
  apartmentData: any;
  customMinStay?: number; // Nuova prop per il soggiorno minimo personalizzato
}

export default function BookingFormModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  apartmentId,
  apartmentData,
  customMinStay
}: BookingFormModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    apartmentId,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    numberOfGuests: 1,
    checkIn: startDate,
    checkOut: endDate,
    totalPrice: calculateTotalPrice(startDate, endDate, apartmentData.price),
    status: 'confirmed',
    paymentStatus: 'pending',
    source: 'direct',
    notes: '',
  });

  // Helper per verificare se la durata del soggiorno è valida
  const isValidStayDuration = (checkIn: Date, checkOut: Date): boolean => {
    // Usa customMinStay se disponibile, altrimenti usa apartmentData.minStay
    const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights >= minStay;
  };

  // Importante: useEffect invece di useState per reagire ai cambiamenti nelle date
  useEffect(() => {
    if (isOpen) { // Solo quando il modal è aperto
      setFormData(prev => ({
        ...prev,
        checkIn: startDate,
        checkOut: endDate,
        totalPrice: calculateTotalPrice(startDate, endDate, apartmentData.price)
      }));
    }
  }, [startDate, endDate, isOpen, apartmentData.price]);

  // Calcola il prezzo totale basato sulle date
  function calculateTotalPrice(checkIn: Date, checkOut: Date, pricePerNight: number): number {
    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return days * pricePerNight;
  }

  // Gestisci il cambio nei campi del form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Gestisci il cambio delle date
  const handleDateChange = (date: Date | null, field: 'checkIn' | 'checkOut') => {
    if (date) {
      let newCheckIn = field === 'checkIn' ? date : formData.checkIn;
      let newCheckOut = field === 'checkOut' ? date : formData.checkOut;
      
      // Se cambia il check-in, aggiorniamo il check-out se necessario 
      // per rispettare il soggiorno minimo
      if (field === 'checkIn') {
        // Usa customMinStay se disponibile, altrimenti usa apartmentData.minStay
        const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
        const minCheckOut = new Date(date);
        minCheckOut.setDate(minCheckOut.getDate() + minStay);
        
        if (newCheckOut < minCheckOut) {
          newCheckOut = minCheckOut;
        }
      }
      
      const newFormData = { 
        ...formData, 
        checkIn: newCheckIn, 
        checkOut: newCheckOut,
        totalPrice: calculateTotalPrice(newCheckIn, newCheckOut, apartmentData.price)
      };
      
      setFormData(newFormData);
    }
  };

  // Gestisci l'invio del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verifica la durata minima del soggiorno
      if (!isValidStayDuration(formData.checkIn, formData.checkOut)) {
        // Usa customMinStay se disponibile, altrimenti usa apartmentData.minStay
        const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
        throw new Error(`Il soggiorno minimo per questo appartamento è di ${minStay} notti`);
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore');
      }

      const data = await response.json();
      
      toast.success('Prenotazione creata con successo!');
      onClose();
      router.refresh();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error((error as Error).message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  // Determina il soggiorno minimo effettivo (personalizzato o predefinito)
  const effectiveMinStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);

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
                      Nuova Prenotazione: {apartmentData.name}
                    </Dialog.Title>
                    
                    {/* Informazione sul soggiorno minimo */}
                    {effectiveMinStay > 1 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                        Questo appartamento richiede un soggiorno minimo di {effectiveMinStay} notti.
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700">
                            Check-in
                          </label>
                          <DatePicker
                            selected={formData.checkIn}
                            onChange={(date) => handleDateChange(date, 'checkIn')}
                            selectsStart
                            startDate={formData.checkIn}
                            endDate={formData.checkOut}
                            dateFormat="dd/MM/yyyy"
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700">
                            Check-out
                          </label>
                          <DatePicker
                            selected={formData.checkOut}
                            onChange={(date) => handleDateChange(date, 'checkOut')}
                            selectsEnd
                            startDate={formData.checkIn}
                            endDate={formData.checkOut}
                            minDate={new Date(formData.checkIn.getTime() + 24 * 60 * 60 * 1000 * effectiveMinStay)}
                            dateFormat="dd/MM/yyyy"
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                          Nome Ospite
                        </label>
                        <input
                          type="text"
                          name="guestName"
                          id="guestName"
                          value={formData.guestName}
                          onChange={handleChange}
                          required
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            name="guestEmail"
                            id="guestEmail"
                            value={formData.guestEmail}
                            onChange={handleChange}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
                            Telefono
                          </label>
                          <input
                            type="tel"
                            name="guestPhone"
                            id="guestPhone"
                            value={formData.guestPhone}
                            onChange={handleChange}
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="numberOfGuests" className="block text-sm font-medium text-gray-700">
                            Numero Ospiti
                          </label>
                          <input
                            type="number"
                            name="numberOfGuests"
                            id="numberOfGuests"
                            min="1"
                            max={apartmentData.maxGuests}
                            value={formData.numberOfGuests}
                            onChange={handleChange}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700">
                            Prezzo Totale (€)
                          </label>
                          <input
                            type="number"
                            name="totalPrice"
                            id="totalPrice"
                            min="0"
                            step="0.01"
                            value={formData.totalPrice}
                            onChange={handleChange}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Note
                        </label>
                        <textarea
                          name="notes"
                          id="notes"
                          rows={3}
                          value={formData.notes}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading || !isValidStayDuration(formData.checkIn, formData.checkOut)}
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                        >
                          {loading ? 'Creazione...' : 'Crea Prenotazione'}
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
