'use client';

import { useState, useEffect, Fragment, useRef, useCallback } from 'react'; // Added useRef and useCallback
import { Dialog, Transition, Disclosure } from '@headlessui/react';
// --- MODIFICA CHIAVE QUI ---
import { ChevronUpIcon, CreditCardIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import Link from 'next/link';
import { IPublicProfile } from '@/models/PublicProfile';
import { IApartment } from '@/models/Apartment';
import { calculateDynamicPriceForStay } from '@/lib/pricing';

interface SearchState {
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
}

// New interface for apartments with calculated price
interface ApartmentWithCalculatedPrice extends IApartment {
  nights: number;
  calculatedPriceForStay: number | null;
}

// New interface for distributed apartments in group bookings
interface DistributedApartment extends ApartmentWithCalculatedPrice {
  effectiveGuests: number;
}

interface AvailabilityResult {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  availableApartments: ApartmentWithCalculatedPrice[]; // Use the new type
  groupBookingOptions: ApartmentWithCalculatedPrice[][]; // Array of arrays of these objects
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
  const [selectedApartment, setSelectedApartment] = useState<ApartmentWithCalculatedPrice | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [groupBookingSelection, setGroupBookingSelection] = useState<DistributedApartment[] | null>(null);
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const hasManuallySearchedOnceRef = useRef(false);
  const firstMountRef = useRef(true);
  const [referenceNightlyPrices, setReferenceNightlyPrices] = useState<Record<string, number | null>>({});
  const [referencePriceLoading, setReferencePriceLoading] = useState<Record<string, boolean>>({});


  // Funzione per distribuire gli ospiti tra gli appartamenti
  const distributeGuests = (combination: ApartmentWithCalculatedPrice[], totalGuests: number): DistributedApartment[] => {
    let remainingGuests = totalGuests;
    
    // Copia degli appartamenti per non modificare l'originale
    const distributedApartments: DistributedApartment[] = combination.map(apt => ({
      ...apt,
      effectiveGuests: 0 // Quanti ospiti effettivamente assegnati a questo appartamento
    }));
    
    // Ordina gli appartamenti per prezzo (opzionale, può essere utile per ottimizzare i costi)
    distributedApartments.sort((a, b) => a.price - b.price);
    
    // Distribuisci gli ospiti
    for (let i = 0; i < distributedApartments.length && remainingGuests > 0; i++) {
      const apt = distributedApartments[i];
      const assignedGuests = Math.min(remainingGuests, apt.maxGuests);
      apt.effectiveGuests = assignedGuests;
      remainingGuests -= assignedGuests;
    }
    
    return distributedApartments;
  };

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
    setSearch(prevSearch => ({ ...prevSearch, [type]: value }));
    // Automatic search will be triggered by useEffect
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

  // Core search logic
  const executeSearch = useCallback(async () => {
    setSearchLoading(true);
    setShowResults(false);
    setResults(null);

    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: search.checkIn.toISOString(),
          checkOut: search.checkOut.toISOString(),
          guests: search.adults,
          children: search.children,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errorCode && (errorData.errorCode === 'ERR_TOO_EARLY' || errorData.errorCode === 'ERR_TOO_LATE')) {
          throw { errorCode: errorData.errorCode, message: errorData.message };
        } else {
          throw new Error(errorData.error || 'Errore sconosciuto dal server');
        }
      }

      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error: any) { // Added :any to allow checking for errorCode
      console.error('Error searching availability:', error);
      if (error.errorCode && (error.errorCode === 'ERR_TOO_EARLY' || error.errorCode === 'ERR_TOO_LATE')) {
        toast.error(error.message);
      } else {
        toast.error('Errore nella ricerca della disponibilità. Riprova o modifica i parametri.');
      }
      setShowResults(false);
    } finally {
      setSearchLoading(false);
    }
  }, [search.checkIn, search.checkOut, search.adults, search.children]); // include all dependencies of executeSearch

  // Handle manual search button click
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSearch();
    hasManuallySearchedOnceRef.current = true; // Set flag after first manual search
  };

  // useEffect for automatic search on guests change
  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }

    if (hasManuallySearchedOnceRef.current) {
      executeSearch();
    }
  }, [search.adults, search.children, executeSearch]); // Add executeSearch as a dependency
  
  useEffect(() => {
    if (results?.availableApartments && results.availableApartments.length > 0) {
      const fetchReferencePrices = async () => {
        setReferencePriceLoading(prev => {
          const newLoading: Record<string, boolean> = {};
          results.availableApartments.forEach(apt => {
            if (apt._id) { // <-- CONTROLLO AGGIUNTO QUI
              if (prev[apt._id] !== true) newLoading[apt._id] = true;
            }
          });
          return {...prev, ...newLoading};
        });

        const pricePromises = results.availableApartments.map(async (apartment) => {
          try {
            const refCheckIn = new Date(search.checkIn);
            const refCheckOut = new Date(refCheckIn);
            refCheckOut.setDate(refCheckIn.getDate() + 1); // For one night

            const effectiveGuestsInSearch = search.adults + search.children;
            // Use the lesser of search guests or apartment max guests for reference price
            const guestsForCalc = Math.min(effectiveGuestsInSearch, apartment.maxGuests);

            const price = await calculateDynamicPriceForStay(
              apartment._id,
              refCheckIn,
              refCheckOut,
              guestsForCalc
            );
            return { id: apartment._id, price };
          } catch (error) {
            console.error(`Error fetching reference price for ${apartment.name} (${apartment._id}):`, error);
            // Do not toast error here for individual price failures to avoid spamming
            // toast.error(`Errore nel calcolo del prezzo di riferimento per ${apartment.name}`);
            return { id: apartment._id, price: null };
          }
        });

        const settledPrices = await Promise.all(pricePromises);

        setReferenceNightlyPrices(prev => {
          const newPrices = {...prev};
          settledPrices.forEach(p => {
            if (p.id) { // <-- CONTROLLO AGGIUNTO QUI (p.id è apt._id)
              newPrices[p.id] = p.price;
            }
          });
          return newPrices;
        });

        setReferencePriceLoading(prev => {
          const newLoading: Record<string, boolean> = {};
          results.availableApartments.forEach(apt => {
            if (apt._id) { // <-- CONTROLLO AGGIUNTO QUI
              newLoading[apt._id] = false;
            }
          });
          return {...prev, ...newLoading};
        });
      };
      fetchReferencePrices();
    }
  }, [results?.availableApartments, search.checkIn, search.adults, search.children]); // Added search.adults, search.children
  
  // Calcola il prezzo totale per prenotazione di gruppo
  const calculateGroupTotalPrice = (combination: ApartmentWithCalculatedPrice[]): number => {
    if (!combination || combination.length === 0) return 0;
    
    const distributedApartments = distributeGuests(combination, search.adults + search.children);
    
    return distributedApartments.reduce((total, apt) => {
      if (apt.effectiveGuests === 0) return total;
      
      if (apt.calculatedPriceForStay !== null && apt.calculatedPriceForStay !== undefined) {
        return total + apt.calculatedPriceForStay;
      }
      // Fallback using reference nightly price if total stay price is missing
      const nightlyRefPrice = referenceNightlyPrices[apt._id];
      if (nightlyRefPrice !== null && nightlyRefPrice !== undefined && apt.nights > 0) {
        console.warn(`Approximated price for ${apt.name} in group calculation using reference nightly price. Effective guests: ${apt.effectiveGuests}, Reference guests: ${search.adults + search.children}`);
        return total + (nightlyRefPrice * apt.nights);
      }
      console.warn(`Missing calculatedPriceForStay and reference price for ${apt.name} in group total. Price will be inaccurate for this item.`);
      return total;
    }, 0);
  };
  
  // Apri modal di prenotazione
  const openBookingModal = (apartment: any) => {
    setSelectedApartment(apartment);
    setGroupBookingSelection(null);
    setIsBookingModalOpen(true);
  };
  
  // Apri modal di prenotazione per gruppo
  const openGroupBookingModal = (distributedApartments: any[]) => {
    setSelectedApartment(null);
    setGroupBookingSelection(distributedApartments);
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
      let finalPrice;
      let requestData;

      if (selectedApartment) {
        const effectiveGuests = Math.min(search.adults + search.children, selectedApartment.maxGuests);
        try {
          finalPrice = await calculateDynamicPriceForStay(
            selectedApartment._id,
            new Date(search.checkIn),
            new Date(search.checkOut),
            effectiveGuests
          );
        } catch (priceError) {
          console.error("Error calculating final price for single booking:", priceError);
          toast.error("Impossibile confermare il prezzo finale. Riprova o contatta l'assistenza.");
          setProcessingBooking(false);
          return;
        }
        
        requestData = {
          apartmentId: selectedApartment._id,
          checkIn: search.checkIn.toISOString(),
          checkOut: search.checkOut.toISOString(),
          guestName: bookingFormData.guestName,
          guestEmail: bookingFormData.guestEmail,
          guestPhone: bookingFormData.guestPhone,
          numberOfGuests: effectiveGuests,
          notes: bookingFormData.notes,
          totalPrice: finalPrice, // Use the dynamically calculated final price
          isGroupBooking: false
        };
      } else if (groupBookingSelection) {
        let groupTotalPrice = 0;
        const groupApartmentsData = [];

        for (const apt of groupBookingSelection.filter(a => a.effectiveGuests > 0)) {
          try {
            const apartmentPrice = await calculateDynamicPriceForStay(
              apt._id,
              new Date(search.checkIn),
              new Date(search.checkOut),
              apt.effectiveGuests
            );
            groupTotalPrice += apartmentPrice;
            groupApartmentsData.push({
              apartmentId: apt._id,
              numberOfGuests: apt.effectiveGuests,
            });
          } catch (priceError) {
            console.error(`Error calculating final price for apartment ${apt.name} in group booking:`, priceError);
            toast.error(`Impossibile confermare il prezzo finale per ${apt.name}. Riprova o contatta l'assistenza.`);
            setProcessingBooking(false);
            return;
          }
        }

        requestData = {
          isGroupBooking: true,
          groupApartments: groupApartmentsData,
          checkIn: search.checkIn.toISOString(),
          checkOut: search.checkOut.toISOString(),
          guestName: bookingFormData.guestName,
          guestEmail: bookingFormData.guestEmail,
          guestPhone: bookingFormData.guestPhone,
          totalGuests: search.adults + search.children,
          totalPrice: groupTotalPrice,
          notes: bookingFormData.notes
        };
      } else {
        toast.error('Nessun appartamento selezionato per la prenotazione.');
        setProcessingBooking(false);
        return;
      }
      
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
      
      if (bookingData.success) {
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
  
  const headerStyle = {
    backgroundColor: profile.headerColor || '#1d4ed8',
  };
  
  const primaryButtonStyle = {
    backgroundColor: profile.primaryColor || '#2563eb',
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
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
      
      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {profile.description && (
            <div className="mb-8 text-center">
              <p className="text-lg text-gray-700">{profile.description}</p>
            </div>
          )}
          
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
                  {Array.from({length: 20}, (_, i) => i + 1).map((num) => (
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
                  {Array.from({length: 11}, (_, i) => i).map((num) => (
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
          
          {showResults && results && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Risultati per {formatDate(results.checkIn)} - {formatDate(results.checkOut)}
              </h2>
              
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
                        
                        <div className="mt-2 text-sm text-gray-600">
                          {(() => {
                            const effectiveGuestsInSearch = search.adults + search.children;
                            const guestsForDisplay = Math.min(effectiveGuestsInSearch, apartment.maxGuests);
                            const nightlyPrice = referenceNightlyPrices[apartment._id];
                            const isLoading = referencePriceLoading[apartment._id];

                            if (isLoading) {
                              return <p>Calcolo prezzo per notte...</p>;
                            }

                            if (nightlyPrice === null || nightlyPrice === undefined) {
                              if (apartment.calculatedPriceForStay !== null && apartment.nights > 0) {
                                const averagePricePerNight = apartment.calculatedPriceForStay / apartment.nights;
                                if (apartment.priceType === 'per_person') {
                                  const perPersonAvg = guestsForDisplay > 0 ? averagePricePerNight / guestsForDisplay : averagePricePerNight;
                                  return <p>€{perPersonAvg.toFixed(2)} per persona per notte (media, per {guestsForDisplay} ospiti)</p>;
                                } else {
                                  return <p>€{averagePricePerNight.toFixed(2)} per notte (media, per {guestsForDisplay} ospiti)</p>;
                                }
                              }
                              return <p>Prezzo di riferimento per notte non disponibile.</p>;
                            }

                            if (apartment.priceType === 'per_person') {
                               const perPersonNightlyDynamic = guestsForDisplay > 0 ? nightlyPrice / guestsForDisplay : nightlyPrice;
                               return <p>€{perPersonNightlyDynamic.toFixed(2)} per persona per notte (dinamico, per {guestsForDisplay} ospiti)</p>;
                            } else {
                               return <p>€{nightlyPrice.toFixed(2)} per notte (dinamico, per {guestsForDisplay} ospiti)</p>;
                            }
                          })()}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-500">Prezzo per {apartment.nights} notti</div>
                            <div className="text-2xl font-bold">
                              {apartment.calculatedPriceForStay !== null
                                ? `€${apartment.calculatedPriceForStay.toFixed(2)}`
                                : 'Prezzo non disponibile'}
                            </div>
                            {search.adults + search.children > apartment.maxGuests && apartment.calculatedPriceForStay !== null && (
                              <div className="text-xs text-gray-600">
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
                          
                          {(() => {
                            const distributedApartments = distributeGuests(
                              combination, 
                              search.adults + search.children
                            );
                            
                            const totalAssignedGuests = distributedApartments.reduce(
                              (sum, apt) => sum + apt.effectiveGuests, 0
                            );
                            
                            return (
                              <>
                                <ul className="space-y-2 mb-4">
                                  {distributedApartments.map((apt: DistributedApartment) => (
                                    apt.effectiveGuests > 0 ? (
                                      <li key={apt._id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                                        <div>
                                          <div className="font-medium">{apt.name}</div>
                                          <div className="text-sm text-gray-600">
                                            {apt.effectiveGuests} ospiti
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          {(() => {
                                            let pricePerNightDisplay = "";
                                            if (apt.calculatedPriceForStay !== null && typeof apt.nights === 'number' && apt.nights > 0) {
                                              const averagePricePerNight = apt.calculatedPriceForStay / apt.nights;
                                              if (apt.priceType === 'per_person') {
                                                const perPersonNightly = apt.effectiveGuests > 0 ? averagePricePerNight / apt.effectiveGuests : apt.price;
                                                pricePerNightDisplay = `€${perPersonNightly.toFixed(2)} per persona/notte, per ${apt.effectiveGuests} ospiti`;
                                              } else {
                                                pricePerNightDisplay = `€${averagePricePerNight.toFixed(2)} per notte, per ${apt.effectiveGuests} ospiti`;
                                              }
                                            } else if (apt.calculatedPriceForStay !== null) {
                                               pricePerNightDisplay = `(dettaglio per notte non disp.)`;
                                            }

                                            const totalPriceForApartment = (apt.calculatedPriceForStay !== null && apt.calculatedPriceForStay !== undefined)
                                              ? apt.calculatedPriceForStay
                                              : 0;

                                            return (
                                              <>
                                                {pricePerNightDisplay && (
                                                  <div className="text-sm text-gray-600">{pricePerNightDisplay}</div>
                                                )}
                                                <div className="font-medium">
                                                  Tot. appartamento: €{totalPriceForApartment.toFixed(2)}
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </li>
                                    ) : null
                                  ))}
                                </ul>
                                
                                {totalAssignedGuests < search.adults + search.children && (
                                  <div className="text-sm text-orange-600 mb-3">
                                    Attenzione: Questa combinazione può ospitare al massimo {totalAssignedGuests} persone.
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center mt-4">
                                  <div className="text-lg font-bold">
                                    Totale: €{calculateGroupTotalPrice(combination).toFixed(2)}
                                  </div>
                                  <button
                                    onClick={() => openGroupBookingModal(distributedApartments)}
                                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    style={primaryButtonStyle}
                                  >
                                    Prenota combinazione
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
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
      
      <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
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
          
          {profile.enableOnlineCheckIn && (
            <div className="border-t border-gray-700 pt-4 text-center">
              <Link href="/checkin" className="inline-flex items-center text-sm text-gray-300 hover:text-white">
                <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                Hai già una prenotazione? Effettua il check-in online
              </Link>
            </div>
          )}
        </div>
      </footer>

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
                                  search.adults + search.children :
                                  `${search.adults} adulti${search.children > 0 ? `, ${search.children} bambini` : ''}`
                              }
                            </p>
                            {selectedApartment && search.adults + search.children > selectedApartment.maxGuests && (
                              <p className="text-xs text-orange-600 mt-1">
                                Nota: Questo appartamento può ospitare al massimo {selectedApartment.maxGuests} ospiti.
                              </p>
                            )}
                          </div>
                          
                          {selectedApartment && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-900 mb-2">Riepilogo Appartamento</h4>
                              <p className="text-sm text-gray-600 mb-2">{selectedApartment.description}</p>
                              
                              <div className="mt-2 text-sm text-gray-600">
                                {(() => {
                                  if (selectedApartment.calculatedPriceForStay !== null && typeof selectedApartment.nights === 'number' && selectedApartment.nights > 0) {
                                    const averagePricePerNightForModal = selectedApartment.calculatedPriceForStay / selectedApartment.nights;
                                    const guestsForModal = search.adults + search.children;

                                    if (selectedApartment.priceType === 'per_person') {
                                      const perPersonNightlyForModal = guestsForModal > 0 ? averagePricePerNightForModal / guestsForModal : selectedApartment.price;
                                      return <p>€{perPersonNightlyForModal.toFixed(2)} per persona per notte, per {guestsForModal} persone</p>;
                                    } else {
                                      return <p>€{averagePricePerNightForModal.toFixed(2)} per notte, per {guestsForModal} persone</p>;
                                    }
                                  } else {
                                    const guestsForModalFallback = search.adults + search.children;
                                    const modalRefNightlyPrice = selectedApartment ? referenceNightlyPrices[selectedApartment._id] : null;
                                    const isLoadingModalPrice = selectedApartment ? referencePriceLoading[selectedApartment._id] : false;

                                    if(isLoadingModalPrice) {
                                      return <p>Calcolo prezzo per notte...</p>;
                                    }

                                    if (modalRefNightlyPrice !== null && modalRefNightlyPrice !== undefined) {
                                       if (selectedApartment.priceType === 'per_person') {
                                           const perPersonModal = guestsForModalFallback > 0 ? modalRefNightlyPrice / guestsForModalFallback : modalRefNightlyPrice;
                                           return <p>€{perPersonModal.toFixed(2)} per persona per notte (dinamico, per {guestsForModalFallback} ospiti)</p>;
                                       } else {
                                           return <p>€{modalRefNightlyPrice.toFixed(2)} per notte (dinamico, per {guestsForModalFallback} ospiti)</p>;
                                       }
                                    } else if (selectedApartment.calculatedPriceForStay !== null && typeof selectedApartment.nights === 'number' && selectedApartment.nights > 0) {
                                       const averagePricePerNightForModal = selectedApartment.calculatedPriceForStay / selectedApartment.nights;
                                        if (selectedApartment.priceType === 'per_person') {
                                            const perPersonModalAvg = guestsForModalFallback > 0 ? averagePricePerNightForModal / guestsForModalFallback : selectedApartment.price;
                                            return <p>€{perPersonModalAvg.toFixed(2)} per persona per notte (media, per {guestsForModalFallback} ospiti)</p>;
                                        } else {
                                            return <p>€{averagePricePerNightForModal.toFixed(2)} per notte (media, per {guestsForModalFallback} ospiti)</p>;
                                        }
                                    } else {
                                      return <p>Dettaglio prezzo per notte non disponibile.</p>;
                                    }
                                  }
                                })()}
                              </div>
                              
                              <div className="flex justify-between items-center font-medium mt-2">
                                <span>Prezzo totale:</span>
                                <span>
                                  {selectedApartment.calculatedPriceForStay !== null
                                    ? `€${selectedApartment.calculatedPriceForStay.toFixed(2)}`
                                    : 'Prezzo non disponibile'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {groupBookingSelection && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-900 mb-2">Riepilogo Apartamenti</h4>
                              {groupBookingSelection
                                .filter((apt: DistributedApartment) => apt.effectiveGuests > 0)
                                .map((apt: DistributedApartment) => {
                                  let groupAptTotalModal = 0;
                                  const isLoadingGroupAptModalPrice = referencePriceLoading[apt._id];

                                  if (apt.calculatedPriceForStay !== null && apt.calculatedPriceForStay !== undefined) {
                                    groupAptTotalModal = apt.calculatedPriceForStay;
                                  } else if (referenceNightlyPrices[apt._id] !== null && referenceNightlyPrices[apt._id] !== undefined && apt.nights > 0) {
                                    groupAptTotalModal = referenceNightlyPrices[apt._id]! * apt.nights;
                                    console.warn(`Approximated total price for ${apt.name} in group modal using reference nightly price.`);
                                  }

                                  return (
                                    <div key={apt._id} className="border-b border-gray-200 pb-2 mb-2">
                                      <p className="font-medium">{apt.name}</p>
                                      <div className="flex justify-between items-center text-sm text-gray-600">
                                        <span>{apt.effectiveGuests} ospiti (max {apt.maxGuests})</span>
                                        <span>
                                          {isLoadingGroupAptModalPrice ? "Calcolo..." : `€${groupAptTotalModal.toFixed(2)}`}
                                          {groupAptTotalModal === 0 && apt.calculatedPriceForStay === null && !isLoadingGroupAptModalPrice && <span className="text-xs text-red-500"> (non calcolabile)</span>}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              <div className="flex justify-between items-center font-medium mt-2">
                                <span>Prezzo totale:</span>
                                <span>
                                  €{calculateGroupTotalPrice(groupBookingSelection.map(item => item as ApartmentWithCalculatedPrice)).toFixed(2)}
                                  { groupBookingSelection.some(gbs => {
                                      const isPriceMissing = gbs.calculatedPriceForStay === null || gbs.calculatedPriceForStay === undefined;
                                      const isRefPriceMissing = referenceNightlyPrices[gbs._id] === null || referenceNightlyPrices[gbs._id] === undefined;
                                      return isPriceMissing && isRefPriceMissing;
                                    }) && <span className="text-xs text-red-500"> (alcuni prezzi mancanti)</span> }
                                </span>
                              </div>
                            </div>
                          )}
                          
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
  ); // Corresponding closing parenthesis for the main return
}
