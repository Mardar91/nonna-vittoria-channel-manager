'use client';

import { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { calculateDynamicPriceForStay } from '@/lib/pricing';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  apartmentId: string;
  apartmentData: any;
  customMinStay?: number; // Nuova prop per il soggiorno minimo personalizzato
}

const timeOptions: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0');
    const minute = m.toString().padStart(2, '0');
    timeOptions.push(`${hour}:${minute}`);
  }
}

const formatTimeForSelect = (date: Date): string => {
  if (!date || !(date instanceof Date)) return '00:00'; // Fallback
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

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
    const calculatePrice = async () => {
      if (formData.checkIn && formData.checkOut && formData.numberOfGuests !== undefined && apartmentId) {
        try {
          const checkInDate = new Date(formData.checkIn);
          const checkOutDate = new Date(formData.checkOut);

          const dynamicPrice = await calculateDynamicPriceForStay(
            apartmentId, // Use apartmentId from props
            checkInDate,
            checkOutDate,
            formData.numberOfGuests
          );

          setFormData(prev => ({ ...prev, totalPrice: dynamicPrice }));
        } catch (error) {
          console.error("Error calculating dynamic price in modal:", error);
          toast.error("Errore nel calcolo del prezzo. Si prega di riprovare.");
          setFormData(prev => ({ ...prev, totalPrice: 0 })); // Fallback price
        }
      }
    };

    calculatePrice();
  }, [formData.checkIn, formData.checkOut, formData.numberOfGuests, apartmentId]);

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
    if (date) { // This 'date' is the date part from DatePicker, time is from select
      let newCheckIn = formData.checkIn;
      let newCheckOut = formData.checkOut;

      if (field === 'checkIn') {
        // Apply existing time from formData.checkIn to the new date from DatePicker
        const timeString = formatTimeForSelect(formData.checkIn);
        newCheckIn = applyTime(date, timeString);
        
        const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
        const minCheckOutDt = new Date(newCheckIn);
        minCheckOutDt.setDate(minCheckOutDt.getDate() + minStay);
        minCheckOutDt.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(), 0, 0); // Preserve existing checkout time

        if (newCheckOut < minCheckOutDt) {
          newCheckOut = minCheckOutDt;
        }
      } else { // field === 'checkOut'
        // Apply existing time from formData.checkOut to the new date from DatePicker
        const timeString = formatTimeForSelect(formData.checkOut);
        newCheckOut = applyTime(date, timeString);

        // Additional check to ensure checkout is not before checkin + minStay (already handled by DatePicker minDate for date part)
        // This primarily ensures if someone picks an early time on the minimum valid day, it's respected or corrected if needed.
        // For now, we trust minDate on DatePicker handles the date part.
      }
      
      setFormData(prev => ({ 
        ...prev, 
        checkIn: newCheckIn, 
        checkOut: newCheckOut,
      }));
    }
  };

  const handleTimeChange = (selectedTime: string, field: 'checkIn' | 'checkOut') => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const originalDate = formData[field];
    const newDateWithUpdatedTime = new Date(originalDate);
    newDateWithUpdatedTime.setHours(hours, minutes, 0, 0);

    let newCheckIn = field === 'checkIn' ? newDateWithUpdatedTime : formData.checkIn;
    let newCheckOut = field === 'checkOut' ? newDateWithUpdatedTime : formData.checkOut;

    if (field === 'checkIn') {
      const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
      const minCheckOutDateAfterUpdate = new Date(newCheckIn);
      minCheckOutDateAfterUpdate.setDate(minCheckOutDateAfterUpdate.getDate() + minStay);
      minCheckOutDateAfterUpdate.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(), 0, 0);

      if (newCheckOut < minCheckOutDateAfterUpdate) {
        newCheckOut = minCheckOutDateAfterUpdate;
      }
    } else if (field === 'checkOut') {
      const minStay = customMinStay !== undefined ? customMinStay : (apartmentData.minStay || 1);
      const minValidCheckoutDate = new Date(newCheckIn);
      minValidCheckoutDate.setDate(minValidCheckoutDate.getDate() + minStay);
      minValidCheckoutDate.setHours(0,0,0,0); 

      const newCheckOutDateOnly = new Date(newCheckOut);
      newCheckOutDateOnly.setHours(0,0,0,0);

      if (newCheckOutDateOnly < minValidCheckoutDate) {
         const correctedDate = new Date(minValidCheckoutDate);
         correctedDate.setHours(hours, minutes, 0,0);
         newCheckOut = correctedDate;
      } else if (newCheckOut.getTime() <= newCheckIn.getTime()) {
          // If same day checkout, ensure checkout time is after checkin time.
          // This simple check might need refinement for minStay=0 scenarios.
          // For minStay >= 1, the date part check (minValidCheckoutDate) is more critical.
          if (newCheckOut.toDateString() === newCheckIn.toDateString() && newCheckOut.getTime() <= newCheckIn.getTime()) {
            // Attempt to push checkout to next valid slot or indicate error
            // For now, this will be caught by isValidStayDuration on submit if it results in < minStay nights
          }
      }
    }

    setFormData(prev => ({
      ...prev,
      checkIn: newCheckIn,
      checkOut: newCheckOut,
    }));
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
                      <div className="space-y-4"> {/* Main container for date/time rows */}
                        {/* Check-in Row */}
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <label htmlFor="checkInDate" className="block text-sm font-medium text-gray-700">Data Check-in</label>
                            <DatePicker
                              id="checkInDate"
                              selected={formData.checkIn}
                              onChange={(date) => handleDateChange(date, 'checkIn')}
                              selectsStart
                              startDate={formData.checkIn}
                              endDate={formData.checkOut}
                              dateFormat="dd/MM/yyyy" // Reverted
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="checkInTime" className="block text-sm font-medium text-gray-700">Ora Check-in</label>
                            <select
                              id="checkInTime"
                              name="checkInTime"
                              value={formatTimeForSelect(formData.checkIn)}
                              onChange={(e) => handleTimeChange(e.target.value, 'checkIn')}
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              {timeOptions.map(time => (
                                <option key={`ci-${time}`} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Check-out Row */}
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <label htmlFor="checkOutDate" className="block text-sm font-medium text-gray-700">Data Check-out</label>
                            <DatePicker
                              id="checkOutDate"
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
                              dateFormat="dd/MM/yyyy" // Reverted
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="checkOutTime" className="block text-sm font-medium text-gray-700">Ora Check-out</label>
                            <select
                              id="checkOutTime"
                              name="checkOutTime"
                              value={formatTimeForSelect(formData.checkOut)}
                              onChange={(e) => handleTimeChange(e.target.value, 'checkOut')}
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              {timeOptions.map(time => (
                                <option key={`co-${time}`} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
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
