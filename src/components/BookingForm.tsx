'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import { IBooking } from '@/models/Booking';
import { IApartment } from '@/models/Apartment';
// import { calculateDynamicPriceForStay } from '@/lib/pricing'; // Rimosso

interface BookingFormProps {
  booking?: IBooking;
  isEdit?: boolean;
  apartments?: IApartment[];
}

const timeOptions: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0');
    const minute = m.toString().padStart(2, '0');
    timeOptions.push(`${hour}:${minute}`);
  }
}

const applyTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

const formatTimeForSelect = (date: Date): string => {
  if (!date || !(date instanceof Date)) return '00:00'; // Fallback
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function BookingForm({ booking, isEdit = false, apartments = [] }: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedApartmentId = searchParams.get('apartmentId');
  const preselectedCheckInDateString = searchParams.get('checkIn'); // AGGIUNGERE QUESTA RIGA

  // Source options - base
  const baseSourceOptions = [
    { label: 'Diretta', value: 'direct' },
    { label: 'Airbnb', value: 'airbnb' },
    { label: 'Booking.com', value: 'booking' },
    { label: 'Altro', value: 'other' },
  ];
  
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false); // STATO AGGIUNTO
  const [isIcalBookingEditMode, setIsIcalBookingEditMode] = useState(false);
  const [displaySourceOptions, setDisplaySourceOptions] = useState(baseSourceOptions);
  const [defaultCheckInTime, setDefaultCheckInTime] = useState('15:00');
  const [defaultCheckOutTime, setDefaultCheckOutTime] = useState('10:00');

  const [formData, setFormData] = useState<Partial<IBooking>>({
    apartmentId: preselectedApartmentId || '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: new Date(),
    checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
    totalPrice: 0,
    manualTotalPrice: undefined, // Initialize manualTotalPrice
    numberOfGuests: 1,
    status: 'pending',
    paymentStatus: 'pending',
    source: 'direct',
    notes: '',
  });

  // Ottieni l'appartamento selezionato
  const selectedApartment = apartments.find(a => a._id === formData.apartmentId);

  // Calcola il prezzo totale quando cambia l'appartamento, le date o il numero di ospiti
  useEffect(() => {
    if (isIcalBookingEditMode) return;

    const fetchPrice = async () => {
      setPriceLoading(true);
      try {
        // Validazione dati prima della chiamata API
        if (!formData.apartmentId || !formData.checkIn || !formData.checkOut ||
            formData.numberOfGuests === undefined || formData.numberOfGuests <= 0 ||
            !(formData.checkIn instanceof Date) || isNaN(new Date(formData.checkIn).getTime()) ||
            !(formData.checkOut instanceof Date) || isNaN(new Date(formData.checkOut).getTime()) ||
            new Date(formData.checkIn) >= new Date(formData.checkOut)
           ) {
          // console.warn("Dati non validi per il calcolo del prezzo, impostazione a 0.");
          setFormData(prev => ({ ...prev, totalPrice: 0 }));
          // Non mostrare toast per validazione fallita, l'utente sta ancora compilando
          return;
        }

        const response = await fetch('/api/calculate-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apartmentId: formData.apartmentId,
            checkInDate: new Date(formData.checkIn).toISOString(),
            checkOutDate: new Date(formData.checkOut).toISOString(),
            numGuests: formData.numberOfGuests,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, totalPrice: data.totalPrice }));
        } else {
          const errorData = await response.json();
          console.error("Error fetching price from API:", errorData);
          toast.error(errorData.error || "Errore nel calcolo del prezzo API.");
          setFormData(prev => ({ ...prev, totalPrice: 0 })); // Fallback
        }
      } catch (error) {
        console.error("Network error fetching price:", error);
        toast.error("Errore di rete nel calcolo del prezzo.");
        setFormData(prev => ({ ...prev, totalPrice: 0 })); // Fallback
      } finally {
        setPriceLoading(false);
      }
    };

    // Debounce o throttle potrebbero essere utili qui se l'utente cambia rapidamente i campi
    // Per ora, chiamiamo direttamente. Considerare di aggiungere un piccolo delay se necessario.
    if (formData.apartmentId && formData.checkIn && formData.checkOut && formData.numberOfGuests !== undefined) {
      fetchPrice();
    } else {
      // Se i campi fondamentali non sono settati, resetta il prezzo a 0 senza chiamare l'API
      setFormData(prev => ({ ...prev, totalPrice: 0 }));
    }
  }, [formData.apartmentId, formData.checkIn, formData.checkOut, formData.numberOfGuests, isIcalBookingEditMode]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          const settingsData = data.settings || data; // Adjust if settings are nested
          if (settingsData) {
            setDefaultCheckInTime(settingsData.defaultCheckInTime || '15:00');
            setDefaultCheckOutTime(settingsData.defaultCheckOutTime || '10:00');
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Popola il form se stiamo modificando una prenotazione esistente o creando una nuova
  useEffect(() => {
    if (isEdit && booking) {
      const isIcal = booking.source !== 'direct';
      setIsIcalBookingEditMode(isIcal);

      let currentSourceOptions = [...baseSourceOptions];
      const sourceExists = baseSourceOptions.some(opt => opt.value === booking.source);
      if (!sourceExists && booking.source) {
        currentSourceOptions = [{ label: booking.source, value: booking.source }, ...baseSourceOptions];
      }
      setDisplaySourceOptions(currentSourceOptions);
      
      setFormData(prev => ({
        ...prev, // Keep any pre-selected apartmentId if it was from query param
        apartmentId: booking.apartmentId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone || '',
        checkIn: new Date(booking.checkIn), // Times are preserved from booking
        checkOut: new Date(booking.checkOut),
        totalPrice: booking.totalPrice,
        manualTotalPrice: booking.manualTotalPrice,
        numberOfGuests: booking.numberOfGuests,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        source: booking.source,
        notes: booking.notes || '',
      }));
    } else if (!isEdit) {
      // New booking: apply defaults including times
      let initialCheckInDate = new Date(); // Default a oggi
      let initialCheckOutDate = new Date(initialCheckInDate);
      initialCheckOutDate.setDate(initialCheckInDate.getDate() + 1); // Default a domani

      // Logica per usare la data dalla URL se presente
      if (preselectedCheckInDateString) {
        // const parsedDate = new Date(preselectedCheckInDateString); // VECCHIA LOGICA

        // NUOVA LOGICA: Splitta la stringa YYYY-MM-DD e crea la data come locale
        const parts = preselectedCheckInDateString.split('-');
        let parsedDate = new Date(initialCheckInDate); // Default a initialCheckInDate in caso di parti non valide

        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10); // Mese è 1-12
          const day = parseInt(parts[2], 10);

          // Controlla se i componenti della data sono numeri validi
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // new Date(year, monthIndex, day) - monthIndex è 0-11
            parsedDate = new Date(year, month - 1, day);
          } else {
            console.warn('Invalid date components from preselectedCheckInDateString:', preselectedCheckInDateString);
            // parsedDate rimane initialCheckInDate (oggi)
          }
        } else {
          console.warn('Invalid date format from preselectedCheckInDateString, expected YYYY-MM-DD:', preselectedCheckInDateString);
          // parsedDate rimane initialCheckInDate (oggi)
        }

        // Verifica se la data parsata è valida.
        if (!isNaN(parsedDate.getTime())) {
          initialCheckInDate = parsedDate;

          let minStay = 1;
          if (preselectedApartmentId) {
            const tempSelectedApartment = apartments.find(a => a._id === preselectedApartmentId);
            if (tempSelectedApartment && tempSelectedApartment.minStay) {
              minStay = tempSelectedApartment.minStay;
            }
          }

          initialCheckOutDate = new Date(initialCheckInDate);
          initialCheckOutDate.setDate(initialCheckInDate.getDate() + minStay);
        } else {
          // Questo else potrebbe non essere più raggiunto se parsedDate è sempre inizializzata validamente
          // o se il parsing fallito la lascia come 'oggi'.
          console.warn('Invalid check-in date received from URL (getTime is NaN), defaulting to today:', preselectedCheckInDateString);
        }
      }

      setFormData(prev => ({
        ...prev,
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        checkIn: applyTime(initialCheckInDate, defaultCheckInTime),
        checkOut: applyTime(initialCheckOutDate, defaultCheckOutTime),
        numberOfGuests: 1,
        status: 'pending',
        paymentStatus: 'pending',
        source: 'direct',
        notes: '',
        manualTotalPrice: undefined,
        totalPrice: 0, // Sarà ricalcolato dall'altro useEffect
        apartmentId: preselectedApartmentId || prev.apartmentId || '',
      }));
      setDisplaySourceOptions(baseSourceOptions);
      setIsIcalBookingEditMode(false);
    }
  }, [booking, isEdit, defaultCheckInTime, defaultCheckOutTime, preselectedApartmentId, preselectedCheckInDateString, apartments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDateChange = (date: Date | null, field: 'checkIn' | 'checkOut') => {
    if (date) {
      const existingTime = formData[field] ? new Date(formData[field]!) : (field === 'checkIn' ? applyTime(new Date(), defaultCheckInTime) : applyTime(new Date(), defaultCheckOutTime));
      const newDateWithExistingTime = new Date(date);
      newDateWithExistingTime.setHours(existingTime.getHours(), existingTime.getMinutes(), 0, 0);
      
      let newCheckIn = field === 'checkIn' ? newDateWithExistingTime : (formData.checkIn ? new Date(formData.checkIn) : new Date());
      let newCheckOut = field === 'checkOut' ? newDateWithExistingTime : (formData.checkOut ? new Date(formData.checkOut) : new Date());

      const apartment = apartments.find(a => a._id === formData.apartmentId);
      const minStay = apartment?.minStay || 1;

      if (field === 'checkIn') {
        const minCheckOutDateAfterUpdate = new Date(newCheckIn);
        minCheckOutDateAfterUpdate.setDate(minCheckOutDateAfterUpdate.getDate() + minStay);
        minCheckOutDateAfterUpdate.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(),0,0);
        if (newCheckOut < minCheckOutDateAfterUpdate) {
          newCheckOut = minCheckOutDateAfterUpdate;
        }
      } else { // field === 'checkOut'
         const minValidCheckoutDate = new Date(newCheckIn);
         minValidCheckoutDate.setDate(minValidCheckoutDate.getDate() + minStay);
         minValidCheckoutDate.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(), 0,0);
         if (newCheckOut < minValidCheckoutDate) {
             newCheckOut = minValidCheckoutDate;
         }
      }
      setFormData(prev => ({ ...prev, checkIn: newCheckIn, checkOut: newCheckOut }));
    }
  };
  
  const handleTimeChange = (selectedTime: string, field: 'checkIn' | 'checkOut') => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const originalDate = formData[field] ? new Date(formData[field]!) : new Date();
    const newDateWithUpdatedTime = new Date(originalDate);
    newDateWithUpdatedTime.setHours(hours, minutes, 0, 0);

    let newCheckIn = field === 'checkIn' ? newDateWithUpdatedTime : (formData.checkIn ? new Date(formData.checkIn) : new Date());
    let newCheckOut = field === 'checkOut' ? newDateWithUpdatedTime : (formData.checkOut ? new Date(formData.checkOut) : new Date());

    const apartment = apartments.find(a => a._id === formData.apartmentId);
    const minStay = apartment?.minStay || 1; 

    if (field === 'checkIn') {
      const minCheckOutDateAfterUpdate = new Date(newCheckIn);
      minCheckOutDateAfterUpdate.setDate(minCheckOutDateAfterUpdate.getDate() + minStay);
      minCheckOutDateAfterUpdate.setHours(newCheckOut.getHours(), newCheckOut.getMinutes(), 0, 0);
      if (newCheckOut < minCheckOutDateAfterUpdate) {
        newCheckOut = minCheckOutDateAfterUpdate;
      }
    } else { // field === 'checkOut'
      const minValidCheckoutDate = new Date(newCheckIn);
      minValidCheckoutDate.setDate(minValidCheckoutDate.getDate() + minStay);
      minValidCheckoutDate.setHours(0,0,0,0); 

      const newCheckOutDateOnly = new Date(newCheckOut);
      newCheckOutDateOnly.setHours(0,0,0,0);

      if (newCheckOutDateOnly < minValidCheckoutDate || newCheckOut.getTime() <= newCheckIn.getTime()) {
        const correctedDate = new Date(newCheckIn);
        correctedDate.setDate(correctedDate.getDate() + minStay);
        correctedDate.setHours(hours, minutes, 0,0); 
        newCheckOut = correctedDate;
      }
    }
    setFormData(prev => ({ ...prev, checkIn: newCheckIn, checkOut: newCheckOut }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSubmit = { ...formData };

    if (isIcalBookingEditMode && dataToSubmit.manualTotalPrice !== undefined) {
      dataToSubmit.totalPrice = dataToSubmit.manualTotalPrice;
    }

    try {
      // Assicurati che le date siano valide
      if (new Date(dataToSubmit.checkIn!) >= new Date(dataToSubmit.checkOut!)) {
        throw new Error('La data di check-out deve essere successiva al check-in');
      }

      const url = isEdit ? `/api/bookings/${booking?._id}` : '/api/bookings';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit), // Send dataToSubmit
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore');
      }

      const data = await response.json();
      
      toast.success(isEdit ? 'Prenotazione aggiornata con successo!' : 'Prenotazione creata con successo!');
      router.push(`/bookings/${data._id}`);
      router.refresh();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error((error as Error).message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  // Status options
  const statusOptions = [
    { label: 'In attesa', value: 'pending' },
    { label: 'Confermata', value: 'confirmed' },
    { label: 'Cancellata', value: 'cancelled' },
    { label: 'Completata', value: 'completed' },
  ];

  // Payment status options
  const paymentStatusOptions = [
    { label: 'In attesa', value: 'pending' },
    { label: 'Pagato', value: 'paid' },
    { label: 'Rimborsato', value: 'refunded' },
    { label: 'Fallito', value: 'failed' },
  ];

  // Source options
  const sourceOptions = [
    // { label: 'Diretta', value: 'direct' }, // Now managed by displaySourceOptions
    // { label: 'Airbnb', value: 'airbnb' },
    // { label: 'Booking.com', value: 'booking' },
    // { label: 'Altro', value: 'other' },
  ]; // This const sourceOptions is no longer directly used for rendering

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Dettagli Prenotazione</h3>
            <p className="mt-1 text-sm text-gray-500">
              Informazioni generali sulla prenotazione.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="apartmentId" className="block text-sm font-medium text-gray-700">
                  Appartamento
                </label>
                <select
                  id="apartmentId"
                  name="apartmentId"
                  value={formData.apartmentId}
                  onChange={handleChange}
                  required
                  disabled={isEdit || !!preselectedApartmentId}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Seleziona un appartamento</option>
                  {apartments.map((apartment) => (
                    <option key={apartment._id} value={apartment._id}>
                      {apartment.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                  Fonte
                </label>
                <select
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  required
                  disabled={isIcalBookingEditMode} // Make read-only if iCal booking
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {displaySourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="checkInDate" className="block text-sm font-medium text-gray-700">Data Check-in</label>
                <div className="flex space-x-2 items-center mt-1">
                  <DatePicker
                    id="checkInDate"
                    selected={formData.checkIn ? new Date(formData.checkIn) : null}
                    onChange={(date) => handleDateChange(date, 'checkIn')}
                    selectsStart
                    startDate={formData.checkIn ? new Date(formData.checkIn) : null}
                    endDate={formData.checkOut ? new Date(formData.checkOut) : null}
                    dateFormat="dd/MM/yyyy"
                    className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <select
                    id="checkInTime"
                    name="checkInTime"
                    value={formData.checkIn ? formatTimeForSelect(new Date(formData.checkIn)) : defaultCheckInTime}
                    onChange={(e) => handleTimeChange(e.target.value, 'checkIn')}
                    className="block w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {timeOptions.map(time => <option key={`ci-${time}`} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="checkOutDate" className="block text-sm font-medium text-gray-700">Data Check-out</label>
                <div className="flex space-x-2 items-center mt-1">
                  <DatePicker
                    id="checkOutDate"
                    selected={formData.checkOut ? new Date(formData.checkOut) : null}
                    onChange={(date) => handleDateChange(date, 'checkOut')}
                    selectsEnd
                    startDate={formData.checkIn ? new Date(formData.checkIn) : null}
                    endDate={formData.checkOut ? new Date(formData.checkOut) : null}
                    minDate={formData.checkIn ? new Date(new Date(formData.checkIn).setDate(new Date(formData.checkIn).getDate() + (apartments.find(a=>a._id === formData.apartmentId)?.minStay || 1) )) : null}
                    dateFormat="dd/MM/yyyy"
                    className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                   <select
                    id="checkOutTime"
                    name="checkOutTime"
                    value={formData.checkOut ? formatTimeForSelect(new Date(formData.checkOut)) : defaultCheckOutTime}
                    onChange={(e) => handleTimeChange(e.target.value, 'checkOut')}
                    className="block w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {timeOptions.map(time => <option key={`co-${time}`} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="numberOfGuests" className="block text-sm font-medium text-gray-700">
                  Numero Ospiti
                </label>
                <input
                  type="number"
                  name="numberOfGuests"
                  id="numberOfGuests"
                  min="1"
                  max={selectedApartment?.maxGuests || 99}
                  value={formData.numberOfGuests}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
                {selectedApartment && formData.numberOfGuests !== undefined && formData.numberOfGuests > selectedApartment.maxGuests && (
                  <p className="mt-1 text-xs text-red-600">
                    Questo appartamento può ospitare al massimo {selectedApartment.maxGuests} ospiti.
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700">
                  Prezzo Totale (€)
                </label>
                {isIcalBookingEditMode ? (
                  <>
                    <input
                      type="number"
                      name="manualTotalPrice"
                      id="manualTotalPrice"
                      min="0"
                      step="0.01"
                      value={formData.manualTotalPrice || ''}
                      onChange={handleChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Inserisci prezzo manuale"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Prezzo per prenotazione importata da iCal (es. {formData.source}).
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      name="totalPrice"
                      id="totalPrice"
                      min="0"
                      step="0.01"
                      value={formData.totalPrice}
                      onChange={handleChange}
                      required
                      readOnly // Price is auto-calculated for direct bookings
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    />
                    {selectedApartment && (
                      <div className="mt-1 text-xs text-gray-500">
                        {selectedApartment.priceType === 'per_person' ? (
                          <p>Calcolato in base a {formData.numberOfGuests} ospiti a €{selectedApartment.price} per persona per notte.</p>
                        ) : (
                          <>
                            <p>Prezzo base: €{selectedApartment.price} per notte</p>
                            {formData.numberOfGuests !== undefined && formData.numberOfGuests > selectedApartment.baseGuests && (
                              <p>
                                {formData.numberOfGuests - selectedApartment.baseGuests} ospiti extra a{' '}
                                {selectedApartment.extraGuestPriceType === 'fixed' 
                                  ? `€${selectedApartment.extraGuestPrice} per notte ciascuno`
                                  : `${selectedApartment.extraGuestPrice}% di supplemento ciascuno`}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Stato
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700">
                  Stato Pagamento
                </label>
                <select
                  id="paymentStatus"
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {paymentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Informazioni Ospite</h3>
            <p className="mt-1 text-sm text-gray-500">
              Dettagli dell'ospite.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
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

              <div className="col-span-6 sm:col-span-3">
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

              <div className="col-span-6 sm:col-span-3">
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

              <div className="col-span-6">
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading || priceLoading}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Salvataggio...' : priceLoading ? 'Calcolo Prezzo...' : (isEdit ? 'Aggiorna' : 'Crea')}
        </button>
      </div>
    </form>
  );
}
