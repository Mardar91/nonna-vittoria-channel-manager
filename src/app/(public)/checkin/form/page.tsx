'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CheckInForm from '@/components/CheckInForm';
import { CheckInFormData, CheckInSubmitRequest } from '@/types/checkin'; // Aggiornato per usare CheckInSubmitRequest
import { IPublicProfile } from '@/models/PublicProfile';

interface BookingData {
  id: string;
  apartmentId: string;
  apartmentName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  hasCheckedIn: boolean;
  // Aggiungere source se necessario per CheckInForm, es. bookingData?.source
}

export default function CheckInFormPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<IPublicProfile | null>(null);
  const [bookingData, setBookingData] = useState<any>(null); // Can be BookingData or context data
  const [checkInMode, setCheckInMode] = useState<'normal' | 'unassigned_checkin'>('normal');
  const [requestedDates, setRequestedDates] = useState<{ checkIn: string, checkOut: string } | null>(null);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [originalBookingRef, setOriginalBookingRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInTerms, setCheckInTerms] = useState<string | undefined>(undefined);
  const [identificationEmail, setIdentificationEmail] = useState<string | null>(null); // Email usata per identificarsi

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const profileResponse = await fetch('/api/public-profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
          if (profileData.checkInTerms) {
            setCheckInTerms(profileData.checkInTerms);
          }
        }

        const storedBooking = sessionStorage.getItem('checkInBooking');
        const storedContext = sessionStorage.getItem('checkInContext');
        const storedIdentificationEmail = sessionStorage.getItem('checkInIdentificationEmail'); // Recupera l'email di identificazione

        if (storedContext) {
          const context = JSON.parse(storedContext);
          if (context.mode === 'unassigned_checkin') {
            setCheckInMode('unassigned_checkin');
            setRequestedDates(context.requestedDates);
            setOriginalEmail(context.email);
            setOriginalBookingRef(context.bookingReference);
            setBookingData({ 
              numberOfGuests: context.numberOfGuests || 1, 
              guestName: `Check-in per ${context.email}`,
              apartmentName: 'N/A (Richiesta da Assegnare)',
              checkIn: context.requestedDates.checkIn,
              checkOut: context.requestedDates.checkOut,
            });
            // Non impostare identificationEmail per unassigned_checkin,
            // l'API userà originalEmail per questo caso
            setIsLoading(false);
            return;
          }
        }

        if (storedBooking) {
          setCheckInMode('normal');
          const parsedBooking = JSON.parse(storedBooking);
          setBookingData(parsedBooking);
          if (storedIdentificationEmail) { // Imposta l'email di identificazione se presente
            setIdentificationEmail(storedIdentificationEmail);
          }
        } else if (!storedContext) { // Solo se non c'è né storedBooking né storedContext
          toast.error('Dati di check-in non trovati. Verrai reindirizzato.');
          router.push('/checkin');
          return;
        }
      } catch (error) {
        console.error('Error loading data for check-in form:', error);
        toast.error('Errore nel caricamento dei dati. Verrai reindirizzato.');
        router.push('/checkin');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [router]);
  
  const handleSubmit = async (formData: CheckInFormData) => {
    setIsSubmitting(true);
    
    const submissionData: CheckInSubmitRequest = {
      guests: [ 
        { ...formData.mainGuest, isMainGuest: true },
        ...formData.additionalGuests.map(guest => ({ ...guest, isMainGuest: false }))
      ],
      mode: checkInMode,
      acceptTerms: formData.acceptTerms, 
      notes: formData.notes,
      numberOfGuests: formData.numberOfGuests 
    };

    if (checkInMode === 'unassigned_checkin') {
      submissionData.requestedCheckIn = requestedDates?.checkIn;
      submissionData.requestedCheckOut = requestedDates?.checkOut;
      submissionData.originalEmail = originalEmail;
      submissionData.originalBookingRef = originalBookingRef;
    } else { // Normal mode
      if (!bookingData || !bookingData.id) {
        toast.error("ID Prenotazione mancante. Impossibile procedere.");
        setIsSubmitting(false);
        return;
      }
      submissionData.bookingId = bookingData.id;
      submissionData.apartmentId = bookingData.apartmentId;
      if (identificationEmail) { // Passa l'email di identificazione nel payload
        submissionData.identificationEmail = identificationEmail;
      }
    }

    try {
      const response = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'Check-in completato con successo!'); // Usa il messaggio dall'API
        sessionStorage.removeItem('checkInBooking');
        sessionStorage.removeItem('checkInContext');
        sessionStorage.removeItem('checkInIdentificationEmail'); // Rimuovi l'email di identificazione da sessionStorage
        router.push(result.redirectUrl || '/checkin/success');
      } else {
        toast.error(result.error || 'Errore durante il salvataggio del check-in.');
      }
    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast.error(error instanceof Error ? error.message : 'Errore di rete o server.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!bookingData) {
    return (
         <div className="min-h-screen flex items-center justify-center bg-gray-100">
           <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
             <h1 className="text-2xl font-bold text-red-600 mb-4">Errore Caricamento Dati</h1>
             <p className="text-gray-600 mb-6">Non è stato possibile caricare i dati necessari per il check-in. Riprova.</p>
             <Link href="/checkin" className="text-blue-600 hover:underline">
               Torna alla pagina di validazione
             </Link>
           </div>
         </div>
       );
  }

  const headerStyle = {
    backgroundColor: profile?.headerColor || '#1d4ed8',
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('it-IT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) {
      return dateString; // Ritorna la stringa originale se non è una data valida
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="py-4 px-4 sm:px-6 lg:px-8 text-white" style={headerStyle}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center">
            {profile?.logo && (
              <img src={profile.logo} alt="Logo" className="h-10 w-10 rounded-full mr-3" />
            )}
            <h1 className="text-xl font-bold">{profile?.name || 'Check-in Online'}</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {checkInMode === 'unassigned_checkin' && requestedDates ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md mb-8">
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">Check-in da Assegnare</h2>
              <p className="text-yellow-700">
                Stai compilando il check-in per le date: <br />
                <strong>Check-in:</strong> {formatDate(requestedDates.checkIn)} <br />
                <strong>Check-out:</strong> {formatDate(requestedDates.checkOut)} <br />
                Email originale: {originalEmail} <br />
                Riferimento originale: {originalBookingRef}
              </p>
              <p className="text-yellow-700 mt-2">
                Il tuo check-in verrà registrato e sarà verificato e assegnato manualmente dal nostro staff.
                Riceverai una conferma non appena l'assegnazione sarà completata.
              </p>
            </div>
          ) : bookingData && (
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold mb-4">Dettagli Prenotazione</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-600">Ospite</p><p className="font-medium">{bookingData.guestName}</p></div>
                <div><p className="text-sm text-gray-600">Appartamento</p><p className="font-medium">{bookingData.apartmentName}</p></div>
                <div><p className="text-sm text-gray-600">Check-in</p><p className="font-medium">{formatDate(bookingData.checkIn)}</p></div>
                <div><p className="text-sm text-gray-600">Check-out</p><p className="font-medium">{formatDate(bookingData.checkOut)}</p></div>
                <div><p className="text-sm text-gray-600">Numero ospiti</p><p className="font-medium">{bookingData.numberOfGuests}</p></div>
              </div>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-6">Dati degli ospiti</h2>
            <p className="text-sm text-gray-600 mb-6">
              Per legge, siamo tenuti a registrare i dati di tutti gli ospiti. 
              Per famiglie o gruppi, è necessario fornire i dettagli completi del documento 
              solo per l'ospite principale (se non diversamente specificato dai termini).
            </p>
            
            <CheckInForm
              numberOfGuests={bookingData?.numberOfGuests || 1}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              checkInTerms={checkInTerms}
              mode={checkInMode}
              // bookingSource={bookingData?.source} // Per futura implementazione se CheckInForm lo richiede
            />
          </div>
        </div>
      </main>
      
      <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} {profile?.name || 'La Tua Struttura'}. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
