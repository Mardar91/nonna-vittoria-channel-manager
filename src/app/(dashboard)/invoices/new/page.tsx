'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Booking {
  _id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  numberOfGuests: number;
  status: string;
  paymentStatus: string;
  source: string;
  apartmentId: string;
  invoiceSettings?: {
    invoiceEmitted: boolean;
    invoiceNumber?: string;
    priceConfirmed: boolean;
  };
  apartment?: {
    _id: string;
    name: string;
    address: string;
  };
}

interface InvoiceSettings {
  _id: string;
  groupId: string;
  name: string;
  apartmentIds: string[];
  activityType: 'business' | 'tourist_rental';
  businessName: string;
  vatRate?: number;
  platformSettings: {
    platform: string;
    invoiceType: 'standard' | 'withholding';
  }[];
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Ricerca prenotazioni
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Impostazioni fatturazione
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<InvoiceSettings | null>(null);
  
  // Form data
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    province: '',
    country: 'Italia',
    vatNumber: '',
    taxCode: '',
  });
  
  const [invoiceData, setInvoiceData] = useState({
    notes: '',
    internalNotes: '',
    sendEmail: false,
    lockImmediately: true,
  });
  
  // Override prezzo
  const [priceOverride, setPriceOverride] = useState(false);
  const [customPrice, setCustomPrice] = useState(0);

  useEffect(() => {
    fetchInvoiceSettings();
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      // Popola i dati del cliente dalla prenotazione
      setCustomerData({
        name: selectedBooking.guestName,
        email: selectedBooking.guestEmail,
        phone: selectedBooking.guestPhone || '',
        address: '',
        city: '',
        zip: '',
        province: '',
        country: 'Italia',
        vatNumber: '',
        taxCode: '',
      });
      
      // Trova le impostazioni appropriate per l'appartamento
      const settings = invoiceSettings.find(s => 
        s.apartmentIds.includes(selectedBooking.apartmentId)
      );
      setSelectedSettings(settings || null);
      
      // Imposta il prezzo
      setCustomPrice(selectedBooking.totalPrice);
    }
  }, [selectedBooking, invoiceSettings]);

  const fetchInvoiceSettings = async () => {
    try {
      const response = await fetch('/api/invoices/settings');
      if (!response.ok) throw new Error('Errore nel caricamento delle impostazioni');
      
      const data = await response.json();
      setInvoiceSettings(data);
    } catch (error) {
      toast.error('Errore nel caricamento delle impostazioni');
      console.error(error);
    }
  };

  const searchBookings = async () => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/bookings?search=${encodeURIComponent(searchTerm)}&status=confirmed,completed&limit=10`);
      if (!response.ok) throw new Error('Errore nella ricerca');
      
      const data = await response.json();
      
      // Filtra solo le prenotazioni senza ricevuta
      const availableBookings = data.filter((b: Booking) => 
        !b.invoiceSettings?.invoiceEmitted
      );
      
      setBookings(availableBookings);
      
      if (availableBookings.length === 0) {
        toast.error('Nessuna prenotazione trovata senza ricevuta');
      }
    } catch (error) {
      toast.error('Errore nella ricerca delle prenotazioni');
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBooking) {
      toast.error('Seleziona una prenotazione');
      return;
    }
    
    if (!selectedSettings) {
      toast.error('Nessuna configurazione di fatturazione trovata per questo appartamento');
      return;
    }
    
    // Verifica il prezzo
    if (selectedBooking.totalPrice === 0 && !priceOverride) {
      toast.error('La prenotazione non ha un prezzo. Attiva l\'override del prezzo per procedere.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Se necessario, aggiorna prima il prezzo della prenotazione
      if (priceOverride && customPrice !== selectedBooking.totalPrice) {
        const priceResponse = await fetch(`/api/bookings/${selectedBooking._id}/confirm-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: customPrice }),
        });
        
        if (!priceResponse.ok) {
          throw new Error('Errore nell\'aggiornamento del prezzo');
        }
      }
      
      // Genera la ricevuta
      const invoicePayload = {
        bookingId: selectedBooking._id,
        settingsGroupId: selectedSettings.groupId,
        customerOverride: customerData,
        notes: invoiceData.notes,
        internalNotes: invoiceData.internalNotes,
        sendEmail: invoiceData.sendEmail,
        lockImmediately: invoiceData.lockImmediately,
      };
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella creazione della ricevuta');
      }
      
      const result = await response.json();
      
      toast.success('Ricevuta creata con successo!');
      
      // Reindirizza alla pagina di dettaglio
      router.push(`/invoices/${result.invoice._id}`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nella creazione della ricevuta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return nights;
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
            Torna alla lista
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Nuova Ricevuta</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Selezione Prenotazione */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              1. Seleziona Prenotazione
            </h3>
            
            {/* Barra di ricerca */}
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchBookings()}
                    placeholder="Cerca per nome ospite, email o codice prenotazione..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchBookings}
                  disabled={searchLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {searchLoading ? 'Ricerca...' : 'Cerca'}
                </button>
              </div>
            </div>

            {/* Risultati ricerca */}
            {bookings.length > 0 && (
              <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <div
                    key={booking._id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedBooking?._id === booking._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{booking.guestName}</span>
                          <span className="ml-2 text-sm text-gray-500">{booking.guestEmail}</span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {format(new Date(booking.checkIn), 'dd/MM/yyyy')} - 
                          {format(new Date(booking.checkOut), 'dd/MM/yyyy')}
                          <span className="ml-2">({calculateNights(booking.checkIn, booking.checkOut)} notti)</span>
                        </div>
                        <div className="mt-1 flex items-center">
                          <span className="text-sm text-gray-500">
                            {booking.apartment?.name} • {booking.numberOfGuests} ospiti • {booking.source}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <div className="flex items-center">
                          <CurrencyEuroIcon className="h-5 w-5 text-gray-400 mr-1" />
                          <span className="text-lg font-medium text-gray-900">
                            €{booking.totalPrice.toFixed(2)}
                          </span>
                        </div>
                        {booking.totalPrice === 0 && (
                          <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Prezzo da confermare
                          </span>
                        )}
                        {selectedBooking?._id === booking._id && (
                          <CheckIcon className="h-5 w-5 text-blue-600 mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prenotazione selezionata */}
            {selectedBooking && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Prenotazione Selezionata</h4>
                <div className="text-sm text-blue-700">
                  <p>{selectedBooking.guestName} - {selectedBooking.apartment?.name}</p>
                  <p>{format(new Date(selectedBooking.checkIn), 'dd/MM/yyyy')} - {format(new Date(selectedBooking.checkOut), 'dd/MM/yyyy')}</p>
                  <p className="font-medium">Totale: €{selectedBooking.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Dati Cliente (solo se prenotazione selezionata) */}
        {selectedBooking && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                2. Dati Cliente
              </h3>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Nome / Ragione Sociale
                  </label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                    required
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    required
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    value={customerData.taxCode}
                    onChange={(e) => setCustomerData({ ...customerData, taxCode: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                {selectedSettings?.activityType === 'business' && (
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Partita IVA
                    </label>
                    <input
                      type="text"
                      value={customerData.vatNumber}
                      onChange={(e) => setCustomerData({ ...customerData, vatNumber: e.target.value })}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                )}
                
                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={customerData.address}
                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Città
                  </label>
                  <input
                    type="text"
                    value={customerData.city}
                    onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">
                    CAP
                  </label>
                  <input
                    type="text"
                    value={customerData.zip}
                    onChange={(e) => setCustomerData({ ...customerData, zip: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={customerData.province}
                    onChange={(e) => setCustomerData({ ...customerData, province: e.target.value })}
                    maxLength={2}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Paese
                  </label>
                  <input
                    type="text"
                    value={customerData.country}
                    onChange={(e) => setCustomerData({ ...customerData, country: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dettagli Ricevuta (solo se prenotazione selezionata) */}
        {selectedBooking && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                3. Dettagli Ricevuta
              </h3>
              
              {/* Override prezzo */}
              {(selectedBooking.totalPrice === 0 || !selectedBooking.invoiceSettings?.priceConfirmed) && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-yellow-700">
                        Questa prenotazione non ha un prezzo confermato. 
                        Devi specificare il prezzo per procedere con l\'emissione della ricevuta.
                      </p>
                      <div className="mt-3">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={priceOverride}
                            onChange={(e) => setPriceOverride(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Specifica il prezzo manualmente
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {priceOverride && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Prezzo Totale
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      required
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
              
              {/* Configurazione fatturazione */}
              {selectedSettings && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Configurazione Fatturazione</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Gruppo:</strong> {selectedSettings.name}</p>
                    <p><strong>Intestatario:</strong> {selectedSettings.businessName}</p>
                    <p><strong>Tipo:</strong> {selectedSettings.activityType === 'business' ? 'Attività Imprenditoriale (con IVA)' : 'Locazione Turistica (Cedolare Secca)'}</p>
                    {selectedSettings.activityType === 'business' && (
                      <p><strong>Aliquota IVA:</strong> {selectedSettings.vatRate}%</p>
                    )}
                  </div>
                </div>
              )}
              
              {!selectedSettings && selectedBooking && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        Nessuna configurazione di fatturazione trovata per questo appartamento.
                        <Link href="/invoices/settings" className="ml-2 underline">
                          Configura ora
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Note */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Note (visibili sulla ricevuta)
                  </label>
                  <textarea
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Note aggiuntive da includere nella ricevuta..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Note Interne (non visibili al cliente)
                  </label>
                  <textarea
                    value={invoiceData.internalNotes}
                    onChange={(e) => setInvoiceData({ ...invoiceData, internalNotes: e.target.value })}
                    rows={2}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Note per uso interno..."
                  />
                </div>
              </div>
              
              {/* Opzioni */}
              <div className="mt-6 space-y-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={invoiceData.lockImmediately}
                    onChange={(e) => setInvoiceData({ ...invoiceData, lockImmediately: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Emetti e blocca immediatamente la ricevuta
                  </span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={invoiceData.sendEmail}
                    onChange={(e) => setInvoiceData({ ...invoiceData, sendEmail: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Invia ricevuta via email al cliente
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Azioni */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/invoices"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={!selectedBooking || !selectedSettings || loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creazione in corso...
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Crea Ricevuta
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
