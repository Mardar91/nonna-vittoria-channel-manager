'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Disclosure } from '@headlessui/react';
import { ChevronUpIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import Link from 'next/link';
import { IPublicProfile } from '@/models/PublicProfile';
import { IApartment } from '@/models/Apartment';
import { calculateTotalPrice } from '@/lib/utils';

interface SearchState {
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
}

interface AvailabilityResult {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  availableApartments: (IApartment & { nights: number })[];
  groupBookingOptions: any[];
  allowGroupBooking: boolean;
}

interface BookingFormData {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
}

export default function BookingPage() {
  // Stato per il profilo pubblico
  const [profile, setProfile] = useState<IPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [processingBooking, setProcessingBooking] = useState(false);

  // Stato per la ricerca
  const [search, setSearch] = useState<SearchState>({
    checkIn: new Date(),
    checkOut: new Date(new Date().setDate(new Date().getDate() + 2)),
    adults: 2,
    children: 0,
  });

  // Stato per i risultati
  const [results, setResults] = useState<AvailabilityResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Stato per il form di prenotazione
  const [selectedApartment, setSelectedApartment] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [groupBookingSelection, setGroupBookingSelection] = useState<any>(null);
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Carica il profilo pubblico
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/public-profile');
        
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          
          // Se il profilo non è attivo, reindirizza a una pagina di errore
          if (!data.isActive) {
            // Per ora, mostra solo un messaggio
            console.error('Booking page is not active');
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, []);
  
  // Gestisci cambio date
  const handleDateChange = (date: Date | null, type: 'checkIn' | 'checkOut') => {
    if (!date) return;
    
    if (type === 'checkIn') {
      // Assicurati che il checkout sia almeno un giorno dopo il checkin
      const newCheckOut = new Date(date);
      newCheckOut.setDate(newCheckOut.getDate() + 1);
      
      if (newCheckOut > search.checkOut) {
        setSearch({ ...search, checkIn: date, checkOut: newCheckOut });
      } else {
        setSearch({ ...search, checkIn: date });
      }
    } else {
      setSearch({ ...search, checkOut: date });
    }
  };
  
  // Gestisci cambio numero ospiti
  const handleGuestsChange = (e: React.ChangeEvent<HTMLSelectElement>, type: 'adults' | 'children') => {
    const value = parseInt(e.target.value);
    setSearch({ ...search, [type]: value });
  };
  
  // Gestisci cambio nei campi del form di prenotazione
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Rimuovi l'errore quando l'utente inizia a digitare
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Cerca disponibilità
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSearchLoading(true);
    setShowResults(false);
    setResults(null);
    
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkIn: search.checkIn.toISOString(),
          checkOut: search.checkOut.toISOString(),
          guests: search.adults,
          children: search.children,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella ricerca');
      }
      
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching availability:', error);
      toast.error('Errore nella ricerca della disponibilità');
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Calcola il prezzo totale
  const getTotalPrice = (apartment: any): number => {
    if (!apartment || !apartment.nights) return 0;
    
    // Limita il numero di ospiti alla capacità massima dell'appartamento
    const effectiveGuests = Math.min(search.adults + search.children, apartment.maxGuests);
    
    // Usa la funzione di calcolo del prezzo con il numero effettivo di ospiti
    return calculateTotalPrice(
      apartment,
      effectiveGuests,
      apartment.nights
    );
  };
  
  // Calcola il prezzo totale per prenotazione di gruppo
  const calculateGroupTotalPrice = (apartments: any[]): number => {
    if (!apartments || apartments.length === 0) return 0;
    
    return apartments.reduce((total, apt) => {
      return total + getTotalPrice(apt);
    }, 0);
  };
  
  // Apri modal di prenotazione
  const openBookingModal = (apartment: any) => {
    setSelectedApartment(apartment);
    setGroupBookingSelection(null);
    setIsBookingModalOpen(true);
  };
  
  // Apri modal di prenotazione per gruppo
  const openGroupBookingModal = (combination: any[]) => {
    setSelectedApartment(null);
    setGroupBookingSelection(combination);
    setIsBookingModalOpen(true);
  };
  
  // Formatta date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  
  // Valida il form di prenotazione
  const validateBookingForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!bookingFormData.guestName.trim()) {
      errors.guestName = 'Il nome è obbligatorio';
    }
    
    if (!bookingFormData.guestEmail.trim()) {
      errors.guestEmail = 'L\'email è obbligatoria';
    } else if (!/\S+@\S+\.\S+/.test(bookingFormData.guestEmail)) {
      errors.guestEmail = 'Inserisci un indirizzo email valido';
    }
    
    if (!bookingFormData.guestPhone.trim()) {
      errors.guestPhone = 'Il telefono è obbligatorio';
    }
    
    setFormErrors(errors);
    
    return Object.keys(errors).length === 0;
  };
  
  // Completa la prenotazione
  const handleCompleteBooking = async () => {
    if (!validateBookingForm()) {
      return;
    }
    
    setProcessingBooking(true);
    
    try {
      let requestData;
      
      // Per prenotazione singola
      if (selectedApartment) {
        // Limita il numero di ospiti alla capacità massima
        const effectiveGuests = Math.min(search.adults + search.children, selectedApartment.maxGuests);
        
        requestData = {
          apartmentId: selectedApartment._id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          guestName: bookingFormData.guestName,
          guestEmail: bookingFormData.guestEmail,
          guestPhone: bookingFormData.guestPhone,
          numberOfGuests: effectiveGuests, // Limitato al massimo consentito
          notes: bookingFormData.notes,
          isGroupBooking: false
        };
      } 
      // Per prenotazione di gruppo
      else if (groupBookingSelection) {
        requestData = {
          isGroupBooking: true,
          groupApartments: groupBookingSelection.map((apt: any) => apt._id),
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          guestName: bookingFormData.guestName,
          guestEmail: bookingFormData.guestEmail,
          guestPhone: bookingFormData.guestPhone,
          numberOfGuests: search.adults + search.children,
          notes: bookingFormData.notes
        };
      } else {
        throw new Error('Nessun appartamento selezionato');
      }
      
      // Crea la prenotazione
      const response = await fetch('/api/bookings/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della prenotazione');
      }
      
      const bookingData = await response.json();
      
      // Procedi con il pagamento
      if (bookingData.success) {
        // Reindirizza alla pagina di pagamento
        const paymentResponse = await fetch('/api/payments/public-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: bookingData.booking?._id || bookingData.bookings?.[0]?._id,
            isGroupBooking: !!groupBookingSelection,
            groupBookingIds: bookingData.bookings?.map((b: any) => b._id) || []
          }),
        });
        
        if (!paymentResponse.ok) {
          throw new Error('Errore nella creazione del pagamento');
        }
        
        const paymentData = await paymentResponse.json();
        
        // Reindirizza alla pagina di checkout di Stripe
        window.location.href = paymentData.url;
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error((error as Error).message || 'Errore nella creazione della prenotazione');
      setProcessingBooking(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!profile || !profile.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Pagina non disponibile</h1>
          <p className="text-gray-600 mb-6">Ci dispiace, il sistema di prenotazione online è attualmente disattivato.</p>
        </div>
      </div>
    );
  }
  
  // Stili dinamici basati sul profilo
  const headerStyle = {
    backgroundColor: profile.headerColor || '#1d4ed8',
  };
  
  const primaryButtonStyle = {
    backgroundColor: profile.primaryColor || '#2563eb',
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 text-white" style={headerStyle}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {profile.logo && (
              <img src={profile.logo} alt="Logo" className="h-10 w-10 rounded-full mr-3" />
            )}
            <h1 className="text-xl font-bold">{profile.name}</h1>
          </div>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Descrizione */}
          {profile.description && (
            <div className="mb-8 text-center">
              <p className="text-lg text-gray-700">{profile.description}</p>
            </div>
          )}
          
          {/* Form di ricerca */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <form onSubmit={handleSearch} className="space-y-4 sm:space-y-0 sm:flex sm:space-x-4 items-end">
              <div className="flex-1">
                <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in
                </label>
                <DatePicker
                  selected={search.checkIn}
                  onChange={(date) => handleDateChange(date, 'checkIn')}
                  selectsStart
                  startDate={search.checkIn}
                  endDate={search.checkOut}
                  minDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex-1">
                <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out
                </label>
                <DatePicker
                  selected={search.checkOut}
                  onChange={(date) => handleDateChange(date, 'checkOut')}
                  selectsEnd
                  startDate={search.checkIn}
                  endDate={search.checkOut}
                  minDate={new Date(search.checkIn.getTime() + 24 * 60 * 60 * 1000)}
                  dateFormat="dd/MM/yyyy"
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="w-28">
                <label htmlFor="adults" className="block text-sm font-medium text-gray-700 mb-1">
                  Adulti
                </label>
                <select
                  id="adults"
                  name="adults"
                  value={search.adults}
                  onChange={(e) => handleGuestsChange(e, 'adults')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-28">
                <label htmlFor="children" className="block text-sm font-medium text-gray-700 mb-1">
                  Bambini
                </label>
                <select
                  id="children"
                  name="children"
                  value={search.children}
                  onChange={(e) => handleGuestsChange(e, 'children')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="w-full sm:w-auto px-6 py-2 border border-transparent text-base font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  style={primaryButtonStyle}
                >
                  {searchLoading ? 'Cerco...' : 'Cerca'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Risultati della ricerca */}
          {showResults && results && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Risultati per {formatDate(results.checkIn)} - {formatDate(results.checkOut)}
              </h2>
              
              {/* Risultati per appartamenti singoli */}
              {results.availableApartments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {results.availableApartments.map((apartment) => (
                    <div key={apartment._id} className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{apartment.name}</h3>
                        <div className="text-sm text-gray-500 mb-3">{apartment.address}</div>
                        
                        <div className="flex items-center justify-between border-t border-b border-gray-200 py-2 mb-3">
                          <div className="flex items-center">
                            <span className="text-gray-600 text-sm mr-2">Ospiti:</span>
                            <span className="font-semibold">{apartment.maxGuests}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600 text-sm mr-2">Camere:</span>
                            <span className="font-semibold">{apartment.bedrooms}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600 text-sm mr-2">Bagni:</span>
                            <span className="font-semibold">{apartment.bathrooms}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">
                          {apartment.description?.substring(0, 100)}
                          {apartment.description && apartment.description.length > 100 ? '...' : ''}
                        </p>
                        
                        {/* Informazioni sul prezzo */}
                        <div className="mt-2 text-sm text-gray-600">
                          {apartment.priceType === 'per_person' ? (
                            <p>€{apartment.price.toFixed(2)} per persona per notte (max {apartment.maxGuests} ospiti)</p>
                          ) : (
                            <>
                              <p>€{apartment.price.toFixed(2)} per notte (fino a {apartment.baseGuests} ospiti)</p>
                              {apartment.extraGuestPrice > 0 && (
                                <p className="text-xs text-gray-500">
                                  {apartment.extraGuestPriceType === 'fixed' 
                                    ? `+€${apartment.extraGuestPrice.toFixed(2)} per ogni ospite extra (max ${apartment.maxGuests} ospiti)`
                                    : `+${apartment.extraGuestPrice}% per ogni ospite extra (max ${apartment.maxGuests} ospiti)`}
                                </p>
                              )}
                            </>
                          )}
                          
                          {/* Avviso se il numero di ospiti totale è maggiore della capacità */}
                          {search.adults + search.children > apartment.maxGuests && (
                            <p className="mt-1 text-xs text-orange-600 font-semibold">
                              Questo appartamento può ospitare al massimo {apartment.maxGuests} ospiti.
                              Il prezzo mostrato è calcolato per {apartment.maxGuests} ospiti.
                            </p>
                          )}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-500">Prezzo per {apartment.nights} notti</div>
                            <div className="text-2xl font-bold">€{getTotalPrice(apartment).toFixed(2)}</div>
                            {search.adults + search.children > apartment.maxGuests && (
                              <div className="text-xs text-gray-600">
                                (per {apartment.maxGuests} ospiti)
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => openBookingModal(apartment)}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            style={primaryButtonStyle}
                          >
                            Prenota ora
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun appartamento disponibile</h3>
                  
                  {results.groupBookingOptions.length > 0 && profile.allowGroupBooking && (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Opzioni per gruppi</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Non abbiamo appartamenti singoli disponibili per il tuo gruppo, ma abbiamo queste combinazioni:
                      </p>
                      
                      {results.groupBookingOptions.map((combination, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                          <h4 className="font-medium text-gray-900 mb-2">Combinazione {index + 1}</h4>
                          <ul className="space-y-2 mb-4">
                            {combination.map((apt: any) => (
                              <li key={apt._id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <div>
                                  <div className="font-medium">{apt.name}</div>
                                  <div className="text-sm text-gray-600">Max {apt.maxGuests} ospiti</div>
                                </div>
                                <div className="font-medium">€{getTotalPrice(apt).toFixed(2)}</div>
                              </li>
                            ))}
                          </ul>
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="text-lg font-bold">
                              Totale: €{calculateGroupTotalPrice(combination).toFixed(2)}
                            </div>
                            <button
                              onClick={() => openGroupBookingModal(combination)}
                              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              style={primaryButtonStyle}
                            >
                              Prenota combinazione
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Suggerimenti se non ci sono risultati */}
              {results.availableApartments.length === 0 && results.groupBookingOptions.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">Nessuna disponibilità</h3>
                  <p className="text-yellow-700">
                    Non abbiamo trovato appartamenti disponibili per le date selezionate. Prova a cambiare le date o il numero di ospiti.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold">{profile.name}</h2>
            {profile.address && <p className="text-sm text-gray-300">{profile.address}</p>}
          </div>
          
          <div className="text-sm">
            {profile.contactEmail && (
              <p>Email: <a href={`mailto:${profile.contactEmail}`} className="hover:underline">{profile.contactEmail}</a></p>
            )}
            {profile.contactPhone && (
              <p>Tel: <a href={`tel:${profile.contactPhone}`} className="hover:underline">{profile.contactPhone}</a></p>
            )}
          </div>
        </div>
      </footer>
      
      {/* Modal di prenotazione */}
      <Transition.Root show={isBookingModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setIsBookingModalOpen}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          {selectedApartment 
                            ? `Prenota ${selectedApartment.name}` 
                            : 'Prenota combinazione appartamenti'}
                        </Dialog.Title>
                        <div className="mt-2">
                          {/* Dettagli prenotazione */}
                          <div className="mt-4 bg-gray-50 p-4 rounded-md">
                            <h4 className="font-medium text-gray-900 mb-2">Dettagli Prenotazione</h4>
                            <p><span className="font-medium">Check-in:</span> {formatDate(search.checkIn)}</p>
                            <p><span className="font-medium">Check-out:</span> {formatDate(search.checkOut)}</p>
                            <p>
                              <span className="font-medium">Ospiti:</span> {
                                selectedApartment ? 
                                  `${Math.min(search.adults + search.children, selectedApartment.maxGuests)} (max ${selectedApartment.maxGuests})` :
                                  `${search.adults} adulti${search.children > 0 ? `, ${search.children} bambini` : ''}`
                              }
                            </p>
                            {selectedApartment && search.adults + search.children > selectedApartment.maxGuests && (
                              <p className="text-xs text-orange-600 mt-1">
                                Nota: Questo appartamento può ospitare al massimo {selectedApartment.maxGuests} ospiti.
                              </p>
                            )}
                          </div>
                          
                          {/* Riepilogo appartamento */}
                          {selectedApartment && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-900 mb-2">Riepilogo Appartamento</h4>
                              <p className="text-sm text-gray-600 mb-2">{selectedApartment.description}</p>
                              
                              {/* Info prezzo dinamico */}
                              <div className="mt-2 text-sm text-gray-600">
                                {selectedApartment.priceType === 'per_person' ? (
                                  <p>€{selectedApartment.price.toFixed(2)} per persona per notte</p>
                                ) : (
                                  <>
                                    <p>€{selectedApartment.price.toFixed(2)} per notte (fino a {selectedApartment.baseGuests} ospiti)</p>
                                    {selectedApartment.extraGuestPrice > 0 && (
                                      <p className="text-xs text-gray-500">
                                        {selectedApartment.extraGuestPriceType === 'fixed' 
                                          ? `+€${selectedApartment.extraGuestPrice.toFixed(2)} per ogni ospite extra`
                                          : `+${selectedApartment.extraGuestPrice}% per ogni ospite extra`}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              <div className="flex justify-between items-center font-medium mt-2">
                                <span>Prezzo totale:</span>
                                <span>€{getTotalPrice(selectedApartment).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Riepilogo prenotazione di gruppo */}
                          {groupBookingSelection && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-900 mb-2">Riepilogo Apartamenti</h4>
                              {groupBookingSelection.map((apt: any, index: number) => (
                                <div key={apt._id} className="border-b border-gray-200 pb-2 mb-2">
                                  <p className="font-medium">{apt.name}</p>
                                  <div className="flex justify-between items-center text-sm text-gray-600">
                                    <span>Max {apt.maxGuests} ospiti</span>
                                    <span>€{getTotalPrice(apt).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between items-center font-medium mt-2">
                                <span>Prezzo totale:</span>
                                <span>€{calculateGroupTotalPrice(groupBookingSelection).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Informazioni metodo di pagamento */}
                          <div className="mt-4 bg-blue-50 p-4 rounded-md">
                            <div className="flex items-center mb-2">
                              <CreditCardIcon className="h-5 w-5 text-blue-600 mr-2" />
                              <h4 className="font-medium text-blue-900">Informazioni sul Pagamento</h4>
                            </div>
                            <p className="text-sm text-blue-700">
                              Al termine della prenotazione sarai reindirizzato alla pagina di pagamento sicura di Stripe.
                              Accettiamo tutte le principali carte di credito.
                            </p>
                          </div>
                          
                          {/* Form dati ospite */}
                          <form className="mt-6 space-y-4">
                            <div>
                              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                                Nome e Cognome
                              </label>
                              <input
                                type="text"
                                id="guestName"
                                name="guestName"
                                required
                                value={bookingFormData.guestName}
                                onChange={handleFormChange}
                                className={`mt-1 block w-full rounded-md border ${
                                  formErrors.guestName ? 'border-red-300' : 'border-gray-300'
                                } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm`}
                              />
                              {formErrors.guestName && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.guestName}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                                Email
                              </label>
                              <input
                                type="email"
                                id="guestEmail"
                                name="guestEmail"
                                required
                                value={bookingFormData.guestEmail}
                                onChange={handleFormChange}
                                className={`mt-1 block w-full rounded-md border ${
                                  formErrors.guestEmail ? 'border-red-300' : 'border-gray-300'
                                } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm`}
                              />
                              {formErrors.guestEmail && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.guestEmail}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
                                Telefono
                              </label>
                              <input
                                type="tel"
                                id="guestPhone"
                                name="guestPhone"
                                required
                                value={bookingFormData.guestPhone}
                                onChange={handleFormChange}
                                className={`mt-1 block w-full rounded-md border ${
                                  formErrors.guestPhone ? 'border-red-300' : 'border-gray-300'
                                } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm`}
                              />
                              {formErrors.guestPhone && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.guestPhone}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                                Note (opzionale)
                              </label>
                              <textarea
                                id="notes"
                                name="notes"
                                rows={3}
                                value={bookingFormData.notes}
                                onChange={handleFormChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                      style={primaryButtonStyle}
                      onClick={handleCompleteBooking}
                      disabled={processingBooking}
                    >
                      {processingBooking ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⏳</span>
                          Elaborazione...
                        </>
                      ) : (
                        'Procedi al pagamento'
                      )}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setIsBookingModalOpen(false)}
                      disabled={processingBooking}
                    >
                      Annulla
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
