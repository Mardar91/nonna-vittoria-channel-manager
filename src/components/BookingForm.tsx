'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import { IBooking } from '@/models/Booking';
import { IApartment } from '@/models/Apartment';
import { calculateTotalPrice } from '@/lib/utils';

interface BookingFormProps {
  booking?: IBooking;
  isEdit?: boolean;
  apartments?: IApartment[];
}

export default function BookingForm({ booking, isEdit = false, apartments = [] }: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedApartmentId = searchParams.get('apartmentId');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<IBooking>>({
    apartmentId: preselectedApartmentId || '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: new Date(),
    checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
    totalPrice: 0,
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
    if (formData.apartmentId && formData.checkIn && formData.checkOut && formData.numberOfGuests) {
      const apartment = apartments.find(a => a._id === formData.apartmentId);
      
      if (apartment) {
        const checkIn = new Date(formData.checkIn);
        const checkOut = new Date(formData.checkOut);
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Usa la funzione di calcolo del prezzo
        const totalPrice = calculateTotalPrice(
          apartment, 
          formData.numberOfGuests, 
          nights
        );
        
        setFormData(prev => ({ ...prev, totalPrice }));
      }
    }
  }, [formData.apartmentId, formData.checkIn, formData.checkOut, formData.numberOfGuests, apartments]);

  // Popola il form se stiamo modificando una prenotazione esistente
  useEffect(() => {
    if (booking && isEdit) {
      setFormData({
        apartmentId: booking.apartmentId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone || '',
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        totalPrice: booking.totalPrice,
        numberOfGuests: booking.numberOfGuests,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        source: booking.source,
        notes: booking.notes || '',
      });
    }
  }, [booking, isEdit]);

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
      setFormData({ ...formData, [field]: date });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Assicurati che le date siano valide
      if (new Date(formData.checkIn!) >= new Date(formData.checkOut!)) {
        throw new Error('La data di check-out deve essere successiva al check-in');
      }

      const url = isEdit ? `/api/bookings/${booking?._id}` : '/api/bookings';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
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
    { label: 'Diretta', value: 'direct' },
    { label: 'Airbnb', value: 'airbnb' },
    { label: 'Booking.com', value: 'booking' },
    { label: 'Altro', value: 'other' },
  ];

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
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700">
                  Check-in
                </label>
                <DatePicker
                  selected={formData.checkIn ? new Date(formData.checkIn) : null}
                  onChange={(date) => handleDateChange(date, 'checkIn')}
                  selectsStart
                  startDate={formData.checkIn ? new Date(formData.checkIn) : null}
                  endDate={formData.checkOut ? new Date(formData.checkOut) : null}
                  dateFormat="dd/MM/yyyy"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700">
                  Check-out
                </label>
                <DatePicker
                  selected={formData.checkOut ? new Date(formData.checkOut) : null}
                  onChange={(date) => handleDateChange(date, 'checkOut')}
                  selectsEnd
                  startDate={formData.checkIn ? new Date(formData.checkIn) : null}
                  endDate={formData.checkOut ? new Date(formData.checkOut) : null}
                  minDate={formData.checkIn ? new Date(formData.checkIn) : null}
                  dateFormat="dd/MM/yyyy"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
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
                {selectedApartment && formData.numberOfGuests > selectedApartment.maxGuests && (
                  <p className="mt-1 text-xs text-red-600">
                    Questo appartamento può ospitare al massimo {selectedApartment.maxGuests} ospiti.
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
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
                {selectedApartment && (
                  <div className="mt-1 text-xs text-gray-500">
                    {selectedApartment.priceType === 'per_person' ? (
                      <p>Calcolato in base a {formData.numberOfGuests} ospiti a €{selectedApartment.price} per persona per notte.</p>
                    ) : (
                      <>
                        <p>Prezzo base: €{selectedApartment.price} per notte</p>
                        {formData.numberOfGuests > selectedApartment.baseGuests && (
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
          disabled={loading}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea'}
        </button>
      </div>
    </form>
  );
}
