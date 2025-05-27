'use client';

import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { calculateTotalPrice } from '@/lib/utils';

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
  const [defaultCheckInTime, setDefaultCheckInTime] = useState('15:00'); // Fallback
  const [defaultCheckOutTime, setDefaultCheckOutTime] = useState('10:00'); // Fallback
  const [formData, setFormData] = useState({
    apartmentId,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    numberOfGuests: 1,
    checkIn: startDate,
    checkOut: endDate,
    totalPrice: 0,
    status: 'confirmed',
    paymentStatus: 'pending',
    source: 'direct',
    notes: '',
  });

  // Calcola il prezzo totale quando cambiano le date o il numero di ospiti
  // This useEffect will now primarily react to formData.checkIn, formData.checkOut, and formData.numberOfGuests
  // The initialization of checkIn and checkOut with default times is handled in the next useEffect.
  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      const nights = Math.ceil((formData.checkOut.getTime() - formData.checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (nights >= 0) { // Ensure nights is not negative
        const totalPrice = calculateTotalPrice(
          apartmentData,
          formData.numberOfGuests,
          nights
        );
        setFormData(prev => ({ ...prev, totalPrice }));
      } else {
        // Handle invalid date range if necessary, though minDate should prevent this
        setFormData(prev => ({ ...prev, totalPrice: 0 }));
      }
    }
  }, [formData.checkIn, formData.checkOut, formData.numberOfGuests, apartmentData]);

  // useEffect to initialize checkIn and checkOut dates with default times when modal opens or relevant props change
  useEffect(() => {
    if (isOpen) {
      const initialCheckIn = applyTime(new Date(startDate), defaultCheckInTime);
      let initialCheckOut = applyTime(new Date(endDate), defaultCheckOutTime);

      const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
      
      const minCheckOutDateFromCheckIn = new Date(initialCheckIn);
      minCheckOutDateFromCheckIn.setDate(minCheckOutDateFromCheckIn.getDate() + minStay);
      // Set the time of minCheckOutDateFromCheckIn to the default checkout time for accurate comparison and setting
      minCheckOutDateFromCheckIn.setHours(parseInt(defaultCheckOutTime.split(':')[0]), parseInt(defaultCheckOutTime.split(':')[1]), 0, 0);

      if (initialCheckOut < minCheckOutDateFromCheckIn) {
        initialCheckOut = minCheckOutDateFromCheckIn;
      }
      
      // No need to calculate totalPrice here, the other useEffect will handle it
      // when checkIn and checkOut in formData are updated.
      setFormData(prev => ({
        ...prev,
        checkIn: initialCheckIn,
        checkOut: initialCheckOut,
        // totalPrice will be calculated by the other useEffect
      }));
    }
  // Ensure all dependencies that should trigger re-initialization are included.
  // formData.numberOfGuests is removed as it doesn't influence initial date settings.
  }, [isOpen, startDate, endDate, defaultCheckInTime, defaultCheckOutTime, apartmentData, customMinStay]);


  useEffect(() => {
    if (isOpen) {
      const fetchSettings = async () => {
        try {
          const response = await fetch('/api/settings'); 
          if (response.ok) {
            const data = await response.json();
            // Assuming data might be nested if it's the full settings object
            const settingsData = data.settings || data; 
            if (settingsData) {
              setDefaultCheckInTime(settingsData.defaultCheckInTime || '15:00');
              setDefaultCheckOutTime(settingsData.defaultCheckOutTime || '10:00');
            }
          }
        } catch (error) {
          console.error("Failed to fetch settings:", error);
          // Keep default fallbacks
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  const applyTime = (date: Date, timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  // Helper per verificare se la durata del soggiorno è valida
  const isValidStayDuration = (checkIn: Date, checkOut: Date): boolean => {
    // Usa customMinStay se disponibile, altrimenti usa apartmentData.minStay
    const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights >= minStay;
  };

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
      let newCheckIn = formData.checkIn;
      let newCheckOut = formData.checkOut;

      if (field === 'checkIn') {
        newCheckIn = date; // Date from DatePicker includes selected time
        const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
        
        const minCheckOutDt = new Date(newCheckIn);
        minCheckOutDt.setDate(minCheckOutDt.getDate() + minStay);
        // Preserve the time of the current checkOut or apply default if it needs to jump
        minCheckOutDt.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(), 0, 0);

        if (newCheckOut < minCheckOutDt) {
          newCheckOut = minCheckOutDt;
        }
      } else { // field === 'checkOut'
        newCheckOut = date; // Date from DatePicker includes selected time
        // Minimum stay check: Ensure newCheckOut is not before newCheckIn + minStay
        // This is mostly handled by minDate in DatePicker, but good to double check if time changes affect validity.
        const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
        const minValidCheckout = new Date(newCheckIn);
        minValidCheckout.setDate(minValidCheckout.getDate() + minStay);
        // Apply the time from the selected date (newCheckOut) to minValidCheckout for comparison
        minValidCheckout.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(), 0, 0);

        if (newCheckOut < minValidCheckout) {
          // If the selected checkout time on the selected date is still too early
          // (e.g. minDate for DatePicker was 00:00, but user selected 09:00 on a day that's valid
          // only from 10:00 due to check-in time + min_stay calculation)
          // For simplicity, we trust DatePicker's minDate for the date part.
          // The time part is trickier. If DatePicker's minDate handles the date part,
          // and we ensure checkOut time respects checkIn time + min_duration in hours/minutes,
          // it should be fine. The current logic primarily ensures date validity.
          // If newCheckOut date is before minValidCheckout date, it's an issue.
          // If it's the same date but earlier time, that's the complex part.
          // The DatePicker minDate for checkout should be set to the correct day at 00:00:00
          // to allow any time selection on that day. The submit validation will be the final check.
        }
      }
      
      // totalPrice will be recalculated by its own useEffect when checkIn/checkOut in formData update.
      setFormData(prev => ({ 
        ...prev, 
        checkIn: newCheckIn, 
        checkOut: newCheckOut,
        // totalPrice is handled by another useEffect
      }));
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
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Nuova Prenotazione: {apartmentData.name}
                    </Dialog.Title>
                    
                    {/* Informazione sul soggiorno minimo */}
                    {effectiveMinStay > 1 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                        Questo appartamento richiede un soggiorno minimo di {effectiveMinStay} notti.
                      </div>
                    )}
                    
                    {/* Informazione sul prezzo per persona, se applicabile */}
                    {apartmentData.priceType === 'per_person' && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                        Il prezzo è di €{apartmentData.price.toFixed(2)} per persona per notte.
                      </div>
                    )}
                    
                    {/* Informazione sul sovrapprezzo per ospiti, se applicabile */}
                    {apartmentData.priceType === 'flat' && apartmentData.extraGuestPrice > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                        {apartmentData.extraGuestPriceType === 'fixed' 
                          ? `Sovrapprezzo di €${apartmentData.extraGuestPrice.toFixed(2)} per ogni ospite oltre ${apartmentData.baseGuests}.`
                          : `Sovrapprezzo del ${apartmentData.extraGuestPrice}% per ogni ospite oltre ${apartmentData.baseGuests}.`}
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
                            dateFormat="dd/MM/yyyy HH:mm"
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
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
                            minDate={(() => {
                              const minCheckoutDate = new Date(formData.checkIn);
                              minCheckoutDate.setDate(minCheckoutDate.getDate() + effectiveMinStay);
                              minCheckoutDate.setHours(0, 0, 0, 0); // Allow any time on the min checkout day
                              return minCheckoutDate;
                            })()}
                            dateFormat="dd/MM/yyyy HH:mm"
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
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
                          {formData.numberOfGuests > apartmentData.maxGuests && (
                            <p className="mt-1 text-xs text-red-600">
                              Massimo {apartmentData.maxGuests} ospiti consentiti.
                            </p>
                          )}
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
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto"
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
