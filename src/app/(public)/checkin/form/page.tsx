'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CheckInForm from '@/components/CheckInForm';
import { CheckInFormData } from '@/types/checkin';
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
}

export default function CheckInFormPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<IPublicProfile | null>(null);
  // const [booking, setBooking] = useState<BookingData | null>(null); // Replaced by bookingData
  const [bookingData, setBookingData] = useState<any>(null); // Can be BookingData or context data
  const [checkInMode, setCheckInMode] = useState<'normal' | 'unassigned_checkin'>('normal');
  const [requestedDates, setRequestedDates] = useState<{ checkIn: string, checkOut: string } | null>(null);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [originalBookingRef, setOriginalBookingRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Renamed from loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInTerms, setCheckInTerms] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Carica il profilo pubblico per i termini di check-in
        const profileResponse = await fetch('/api/public-profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData); // Save the full profile
          if (profileData.checkInTerms) {
            setCheckInTerms(profileData.checkInTerms);
          }
        }

        const storedBooking = sessionStorage.getItem('checkInBooking');
        const storedContext = sessionStorage.getItem('checkInContext');

        if (storedContext) {
          const context = JSON.parse(storedContext);
          if (context.mode === 'unassigned_checkin') {
            setCheckInMode('unassigned_checkin');
            setRequestedDates(context.requestedDates);
            setOriginalEmail(context.email);
            setOriginalBookingRef(context.bookingReference);
            // For CheckInForm compatibility, ensure numberOfGuests is set.
            // Default to 1, but allow override if context provides it (future enhancement).
            setBookingData({ 
              numberOfGuests: context.numberOfGuests || 1, 
              // Add other fields that CheckInForm might minimally expect, or make them optional in CheckInForm
              guestName: context.email, // Use email as a placeholder for guestName
              apartmentName: 'N/A (Richiesta da Assegnare)',
              checkIn: context.requestedDates.checkIn,
              checkOut: context.requestedDates.checkOut,
            });
            setIsLoading(false);
            return;
          }
        }

        if (storedBooking) {
          setCheckInMode('normal');
          const parsedBooking = JSON.parse(storedBooking);
          setBookingData(parsedBooking);
        } else if (!storedContext) {
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
    
    // Prepara i dati per l'API - guests are already prepared by CheckInForm
    // CheckInFormData should contain mainGuest and additionalGuests
    const submissionData: any = {
      guests: [ // Ensure guests are structured correctly
        { ...formData.mainGuest, isMainGuest: true },
        ...formData.additionalGuests.map(guest => ({ ...guest, isMainGuest: false }))
      ],
      mode: checkInMode,
      acceptTerms: formData.acceptTerms, 
      notes: formData.notes,
      numberOfGuests: formData.numberOfGuests // Always send numberOfGuests from the form
    };

    if (checkInMode === 'unassigned_checkin') {
      submissionData.requestedCheckIn = requestedDates?.checkIn;
      submissionData.requestedCheckOut = requestedDates?.checkOut;
      submissionData.originalEmail = originalEmail;
      submissionData.originalBookingRef = originalBookingRef;
      // numberOfGuests is already set from formData above
    } else { // Normal mode
      if (!bookingData || !bookingData.id) {
        toast.error("ID Prenotazione mancante. Impossibile procedere.");
        setIsSubmitting(false);
        return;
      }
      submissionData.bookingId = bookingData.id;
      submissionData.apartmentId = bookingData.apartmentId;
    }

    try {
      const response = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Check-in completato con successo!');
        sessionStorage.removeItem('checkInBooking');
        sessionStorage.removeItem('checkInContext');
        router.push(result.redirectUrl || '/checkin/success'); // Use redirectUrl from API if available
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
  
  // if (!bookingData && checkInMode === 'normal') { // Already handled in useEffect by redirecting
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-100">
  //       <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
  //         <h1 className="text-2xl font-bold text-red-600 mb-4">Dati non validi</h1>
  //         <p className="text-gray-600 mb-6">Impossibile caricare i dati per il check-in. Riprova.</p>
  //         <Link href="/checkin" className="text-blue-600 hover:underline">
  //           Torna alla pagina di validazione
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }
  if (!bookingData) { // General check if bookingData is null after loading (covers unassigned not setting default)
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
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
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
              // bookingSource={bookingData?.source} // For Phase 2
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
