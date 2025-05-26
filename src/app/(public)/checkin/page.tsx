'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { IPublicProfile } from '@/models/PublicProfile';

export default function CheckInPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<IPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  
  const [formData, setFormData] = useState({
    bookingReference: '',
    email: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New states for conditional date fields
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [showDateFields, setShowDateFields] = useState(false);
  const [isSecondAttempt, setIsSecondAttempt] = useState(false);
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      const response = await fetch('/api/public-profile');
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        
        // Verifica se il check-in online è abilitato
        if (!data.enableOnlineCheckIn) {
          router.push('/book');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'bookingReference' || name === 'email') {
      setShowDateFields(false);
      setIsSecondAttempt(false);
      setRequestedCheckIn('');
      setRequestedCheckOut('');
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.requestedCheckIn;
        delete newErrors.requestedCheckOut;
        return newErrors;
      });
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.bookingReference.trim()) {
      newErrors.bookingReference = 'Il numero di prenotazione è obbligatorio';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email è obbligatoria';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Inserisci un indirizzo email valido';
    }

    if (isSecondAttempt) {
      if (!requestedCheckIn) {
        newErrors.requestedCheckIn = 'La data di check-in è richiesta';
      }
      if (!requestedCheckOut) {
        newErrors.requestedCheckOut = 'La data di check-out è richiesta';
      }
      if (requestedCheckIn && requestedCheckOut && new Date(requestedCheckIn) >= new Date(requestedCheckOut)) {
        newErrors.requestedCheckOut = 'La data di check-out deve essere successiva a quella di check-in';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) { // validateForm now also handles date fields if isSecondAttempt is true
      return;
    }
    
    setValidating(true);
    
    try {
      const body: any = {
        bookingReference: formData.bookingReference.trim(),
        email: formData.email.trim().toLowerCase()
      };

      if (isSecondAttempt) {
        body.requestedCheckIn = requestedCheckIn;
        body.requestedCheckOut = requestedCheckOut;
      }

      const response = await fetch('/api/checkin/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.valid) {
        if (data.errorCode === 'BOOKING_NOT_FOUND_ASK_DATES') {
          setShowDateFields(true);
          setIsSecondAttempt(true);
          toast.error("Prenotazione non trovata. Inserisci le date del tuo soggiorno per una ricerca più precisa.");
          setValidating(false);
          return;
        }
        toast.error(data.error || 'Prenotazione non trovata o non valida.');
        setValidating(false); // Ensure validating is set to false on error
        return;
      }
      
      // Successful validation
      if (data.mode === 'unassigned_checkin') {
        sessionStorage.setItem('checkInContext', JSON.stringify({ 
          mode: 'unassigned_checkin', 
          requestedDates: {
            checkIn: requestedCheckIn, // Use the state values
            checkOut: requestedCheckOut, // Use the state values
          }, 
          email: formData.email.trim().toLowerCase(),
          bookingReference: formData.bookingReference.trim() // Include booking reference
        }));
      } else {
        sessionStorage.setItem('checkInBooking', JSON.stringify(data.booking));
        // IMPORTANTE: Salva l'email di identificazione per il check-in normale
        sessionStorage.setItem('checkInIdentificationEmail', formData.email.trim().toLowerCase());
      }
      
      router.push('/checkin/form');
      
    } catch (error) {
      console.error('Error validating booking:', error);
      toast.error('Si è verificato un errore durante la validazione. Riprova più tardi.');
    } finally {
      setValidating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!profile || !profile.enableOnlineCheckIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Servizio non disponibile</h1>
          <p className="text-gray-600 mb-6">Il check-in online non è attualmente disponibile.</p>
          <Link href="/book" className="text-blue-600 hover:underline">
            Torna alla pagina di prenotazione
          </Link>
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
          <Link href="/book" className="text-white hover:text-gray-200">
            Prenota
          </Link>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Check-in Online
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Completa il check-in per la tua prenotazione
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="bookingReference" className="sr-only">
                  Numero Prenotazione
                </label>
                <input
                  id="bookingReference"
                  name="bookingReference"
                  type="text"
                  required
                  value={formData.bookingReference}
                  onChange={handleInputChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.bookingReference ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Numero Prenotazione"
                />
                {errors.bookingReference && (
                  <p className="mt-1 text-xs text-red-600">{errors.bookingReference}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Email di prenotazione"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {showDateFields && (
              <div className="rounded-md shadow-sm -space-y-px mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2 text-center">
                  La prenotazione non è stata trovata. Inserisci le date del soggiorno per una ricerca più precisa.
                </p>
                <div>
                  <label htmlFor="requestedCheckIn" className="sr-only">
                    Data di Check-in
                  </label>
                  <input
                    id="requestedCheckIn"
                    name="requestedCheckIn"
                    type="date"
                    required={isSecondAttempt}
                    value={requestedCheckIn}
                    onChange={(e) => {
                      setRequestedCheckIn(e.target.value);
                      if (errors.requestedCheckIn) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.requestedCheckIn;
                          return newErrors;
                        });
                      }
                    }}
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.requestedCheckIn ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Data di Check-in"
                  />
                  {errors.requestedCheckIn && (
                    <p className="mt-1 text-xs text-red-600">{errors.requestedCheckIn}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="requestedCheckOut" className="sr-only">
                    Data di Check-out
                  </label>
                  <input
                    id="requestedCheckOut"
                    name="requestedCheckOut"
                    type="date"
                    required={isSecondAttempt}
                    value={requestedCheckOut}
                    onChange={(e) => {
                      setRequestedCheckOut(e.target.value);
                      if (errors.requestedCheckOut) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.requestedCheckOut;
                          return newErrors;
                        });
                      }
                    }}
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.requestedCheckOut ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Data di Check-out"
                  />
                  {errors.requestedCheckOut && (
                    <p className="mt-1 text-xs text-red-600">{errors.requestedCheckOut}</p>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={validating}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                style={primaryButtonStyle}
              >
                {validating ? 'Verifica in corso...' : (isSecondAttempt ? 'Cerca per Date' : 'Continua')}
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Il numero di prenotazione ti è stato inviato via email al momento della conferma.
              </p>
            </div>
          </form>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} {profile?.name || 'La tua Attività'}. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
