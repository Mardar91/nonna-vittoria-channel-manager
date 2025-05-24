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
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      // Carica il profilo
      const profileResponse = await fetch('/api/public-profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
      }
      
      // Recupera i dati della prenotazione dal sessionStorage
      const bookingData = sessionStorage.getItem('checkInBooking');
      if (!bookingData) {
        router.push('/checkin');
        return;
      }
      
      const parsedBooking = JSON.parse(bookingData);
      setBooking(parsedBooking);
      
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/checkin');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (formData: CheckInFormData) => {
    if (!booking) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepara i dati per l'API
      const guests = [
        {
          ...formData.mainGuest,
          isMainGuest: true
        },
        ...formData.additionalGuests.map(guest => ({
          ...guest,
          isMainGuest: false
        }))
      ];
      
      const response = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          guests
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Errore nel completamento del check-in');
      }
      
      // Rimuovi i dati dal sessionStorage
      sessionStorage.removeItem('checkInBooking');
      
      // Naviga alla pagina di successo
      router.push('/checkin/success');
      
    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast.error(error instanceof Error ? error.message : 'Errore nel completamento del check-in');
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Sessione scaduta</h1>
          <p className="text-gray-600 mb-6">La tua sessione è scaduta. Riprova.</p>
          <Link href="/checkin" className="text-blue-600 hover:underline">
            Torna al check-in
          </Link>
        </div>
      </div>
    );
  }
  
  // Stili dinamici basati sul profilo
  const headerStyle = {
    backgroundColor: profile?.headerColor || '#1d4ed8',
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
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
      
      {/* Contenuto principale */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Info prenotazione */}
          <div className="bg-blue-50 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Dettagli Prenotazione</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Ospite</p>
                <p className="font-medium">{booking.guestName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Appartamento</p>
                <p className="font-medium">{booking.apartmentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in</p>
                <p className="font-medium">{formatDate(booking.checkIn)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out</p>
                <p className="font-medium">{formatDate(booking.checkOut)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Numero ospiti</p>
                <p className="font-medium">{booking.numberOfGuests}</p>
              </div>
            </div>
          </div>
          
          {/* Form di check-in */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-6">Dati degli ospiti</h2>
            <p className="text-sm text-gray-600 mb-6">
              Per legge, siamo tenuti a registrare i dati di tutti gli ospiti. 
              Per famiglie o gruppi, è necessario fornire i dettagli completi del documento 
              solo per l'ospite principale.
            </p>
            
            <CheckInForm
              numberOfGuests={booking.numberOfGuests}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              checkInTerms={profile?.checkInTerms}
            />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} {profile?.name}. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
