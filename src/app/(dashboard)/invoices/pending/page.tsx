'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CurrencyEuroIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface PendingBooking {
  _id: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  numberOfGuests: number;
  status: string;
  source: string;
  apartmentId: string;
  apartment?: {
    _id: string;
    name: string;
  };
  invoiceSettings?: {
    priceConfirmed: boolean;
    invoiceEmitted: boolean;
  };
  createdAt: string;
}

interface PriceConfirmModal {
  isOpen: boolean;
  booking: PendingBooking | null;
  price: number;
}

export default function PendingInvoicesPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'zero_price' | 'unconfirmed'>('all');
  const [sortBy, setSortBy] = useState<'checkout' | 'days'>('days');
  
  // Modal conferma prezzo
  const [priceModal, setPriceModal] = useState<PriceConfirmModal>({
    isOpen: false,
    booking: null,
    price: 0,
  });

  const fetchPendingBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Costruisci la query in base al filtro
      let query = 'status=completed&invoiceSettings.invoiceEmitted=false';
      
      if (filter === 'zero_price') {
        query += '&totalPrice=0';
      } else if (filter === 'unconfirmed') {
        query += '&invoiceSettings.priceConfirmed=false';
      } else {
        // All: sia prezzo 0 che non confermato
        query += '&$or[0][totalPrice]=0&$or[1][invoiceSettings.priceConfirmed]=false';
      }
      
      const response = await fetch(`/api/bookings?${query}`);
      if (!response.ok) throw new Error('Errore nel caricamento');
      
      let data = await response.json();
      
      // Filtra solo le prenotazioni che sono effettivamente già passate
      const now = new Date();
      data = data.filter((booking: PendingBooking) => 
        new Date(booking.checkOut) < now
      );
      
      // Ordina i risultati
      data.sort((a: PendingBooking, b: PendingBooking) => {
        if (sortBy === 'checkout') {
          return new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime();
        } else {
          // Ordina per giorni dal checkout (più vecchie prima)
          const daysA = differenceInDays(now, new Date(a.checkOut));
          const daysB = differenceInDays(now, new Date(b.checkOut));
          return daysB - daysA;
        }
      });
      
      setBookings(data);
    } catch (error) {
      toast.error('Errore nel caricamento delle prenotazioni');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filter, sortBy, setLoading, setBookings]);

  useEffect(() => {
    fetchPendingBookings();
  }, [fetchPendingBookings]);

  const handleConfirmPrice = async () => {
    if (!priceModal.booking) return;
    
    try {
      const response = await fetch(`/api/bookings/${priceModal.booking._id}/confirm-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: priceModal.price }),
      });
      
      if (!response.ok) throw new Error('Errore nella conferma del prezzo');
      
      toast.success('Prezzo confermato con successo');
      
      // Chiudi il modal e ricarica
      setPriceModal({ isOpen: false, booking: null, price: 0 });
      fetchPendingBookings();
      
      // Chiedi se vuole creare subito la ricevuta
      if (confirm('Vuoi creare subito la ricevuta per questa prenotazione?')) {
        router.push(`/invoices/new?bookingId=${priceModal.booking._id}`);
      }
    } catch (error) {
      toast.error('Errore nella conferma del prezzo');
      console.error(error);
    }
  };

  const handleIgnoreBooking = async (bookingId: string) => {
    if (!confirm('Sei sicuro di voler ignorare questa prenotazione? Non verrà emessa alcuna ricevuta.')) return;
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}/ignore-invoice`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nell&apos;operazione');
      
      toast.success('Prenotazione marcata come da ignorare');
      fetchPendingBookings();
    } catch (error) {
      toast.error('Errore nell&apos;operazione');
      console.error(error);
    }
  };

  const getDaysAgo = (checkOut: string) => {
    return differenceInDays(new Date(), new Date(checkOut));
  };

  const getAlertLevel = (daysAgo: number) => {
    if (daysAgo > 30) return 'danger';
    if (daysAgo > 14) return 'warning';
    return 'info';
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'danger': return 'red';
      case 'warning': return 'yellow';
      default: return 'blue';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/invoices"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Torna alla fatturazione
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Prenotazioni in Attesa
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Prenotazioni completate che richiedono conferma prezzo prima dell&apos;emissione ricevuta
            </p>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Totale in Attesa
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {bookings.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyEuroIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Senza Prezzo
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {bookings.filter(b => b.totalPrice === 0).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Più Vecchia
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {bookings.length > 0 
                      ? `${getDaysAgo(bookings[0].checkOut)} giorni fa`
                      : '-'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tutte ({bookings.length})
              </button>
              <button
                onClick={() => setFilter('zero_price')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'zero_price'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Prezzo Zero
              </button>
              <button
                onClick={() => setFilter('unconfirmed')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'unconfirmed'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Non Confermate
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Ordina per:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'checkout' | 'days')}
                className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="days">Giorni dal checkout</option>
                <option value="checkout">Data checkout</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista prenotazioni */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500">
            Caricamento...
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nessuna prenotazione in attesa
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Tutte le prenotazioni hanno un prezzo confermato o una ricevuta emessa.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {bookings.map((booking) => {
              const daysAgo = getDaysAgo(booking.checkOut);
              const alertLevel = getAlertLevel(daysAgo);
              const alertColor = getAlertColor(alertLevel);
              
              return (
                <li key={booking._id}>
                  <div className={`px-6 py-4 ${alertLevel === 'danger' ? 'bg-red-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-2 w-2 rounded-full bg-${alertColor}-400`} />
                          <p className="ml-3 text-sm font-medium text-gray-900">
                            {booking.guestName}
                          </p>
                          <span className="ml-2 text-sm text-gray-500">
                            {booking.guestEmail}
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>
                            {booking.apartment?.name} • 
                            {format(new Date(booking.checkIn), 'dd/MM/yyyy')} - 
                            {format(new Date(booking.checkOut), 'dd/MM/yyyy')} • 
                            {booking.numberOfGuests} ospiti
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            Fonte: <span className="font-medium">{booking.source}</span>
                          </span>
                          
                          {booking.totalPrice === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <CurrencyEuroIcon className="w-3 h-3 mr-1" />
                              Prezzo mancante
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              €{booking.totalPrice.toFixed(2)}
                              {!booking.invoiceSettings?.priceConfirmed && (
                                <span className="ml-1 text-xs text-yellow-600">(da confermare)</span>
                              )}
                            </span>
                          )}
                          
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${alertColor}-100 text-${alertColor}-800`}>
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {daysAgo} giorni fa
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center space-x-2">
                        {booking.totalPrice === 0 || !booking.invoiceSettings?.priceConfirmed ? (
                          <button
                            onClick={() => setPriceModal({
                              isOpen: true,
                              booking,
                              price: booking.totalPrice || 0,
                            })}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <CurrencyEuroIcon className="h-4 w-4 mr-2" />
                            Conferma Prezzo
                          </button>
                        ) : (
                          <Link
                            href={`/invoices/new?bookingId=${booking._id}`}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            Crea Ricevuta
                          </Link>
                        )}
                        
                        <button
                          onClick={() => handleIgnoreBooking(booking._id)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          title="Ignora questa prenotazione"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal conferma prezzo */}
      {priceModal.isOpen && priceModal.booking && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CurrencyEuroIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Conferma Prezzo Prenotazione
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Inserisci il prezzo corretto per questa prenotazione:
                      </p>
                      
                      <div className="mt-4 space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Ospite:</span> {priceModal.booking.guestName}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Appartamento:</span> {priceModal.booking.apartment?.name}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Periodo:</span> {format(new Date(priceModal.booking.checkIn), 'dd/MM/yyyy')} - {format(new Date(priceModal.booking.checkOut), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Fonte:</span> {priceModal.booking.source}
                        </p>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Prezzo Totale
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">€</span>
                          </div>
                          <input
                            type="number"
                            value={priceModal.price}
                            onChange={(e) => setPriceModal({
                              ...priceModal,
                              price: parseFloat(e.target.value) || 0,
                            })}
                            step="0.01"
                            min="0"
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmPrice}
                  disabled={priceModal.price <= 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Conferma Prezzo
                </button>
                <button
                  type="button"
                  onClick={() => setPriceModal({ isOpen: false, booking: null, price: 0 })}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
