'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

// Componente che utilizza useSearchParams
function ConfirmationContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);

  useEffect(() => {
    const loadConfirmation = async () => {
      try {
        if (!sessionId) {
          setError('Sessione di pagamento non valida');
          setLoading(false);
          return;
        }
        
        // Ottieni dettagli della sessione di pagamento
        const response = await fetch(`/api/payments/session?id=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Errore nel caricamento dei dettagli del pagamento');
        }
        
        const sessionData = await response.json();
        setBookingDetails(sessionData);
        
        // Carica anche il profilo pubblico per personalizzare la pagina
        const profileResponse = await fetch('/api/public-profile');
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setPublicProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading confirmation:', error);
        setError('Si è verificato un errore nel caricamento dei dettagli della prenotazione');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfirmation();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/book" className="text-blue-600 hover:underline">
            Torna alla pagina di prenotazione
          </Link>
        </div>
      </div>
    );
  }
  
  // Stili dinamici basati sul profilo pubblico
  const headerStyle = {
    backgroundColor: publicProfile?.headerColor || '#1d4ed8',
  };
  
  const primaryButtonStyle = {
    backgroundColor: publicProfile?.primaryColor || '#2563eb',
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 text-white" style={headerStyle}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {publicProfile?.logo && (
              <img src={publicProfile.logo} alt="Logo" className="h-10 w-10 rounded-full mr-3" />
            )}
            <h1 className="text-xl font-bold">{publicProfile?.name || 'Nonna Vittoria Apartments'}</h1>
          </div>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col items-center text-center mb-6">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Prenotazione Confermata!</h1>
              <p className="text-lg text-gray-600 mt-2">
                Grazie, la tua prenotazione è stata completata con successo.
              </p>
            </div>
            
            {bookingDetails && (
              <div className="mt-6">
                {/* Riferimento prenotazione */}
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h2 className="text-lg font-medium mb-2">Riepilogo Prenotazione</h2>
                  <p className="text-gray-700">
                    <span className="font-medium">Numero di prenotazione:</span> {bookingDetails.referenceId || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Check-in:</span> {bookingDetails.checkIn ? new Date(bookingDetails.checkIn).toLocaleDateString('it-IT') : 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Check-out:</span> {bookingDetails.checkOut ? new Date(bookingDetails.checkOut).toLocaleDateString('it-IT') : 'N/A'}
                  </p>
                  {bookingDetails.isGroupBooking ? (
                    <p className="text-gray-700">
                      <span className="font-medium">Tipo:</span> Prenotazione di gruppo
                    </p>
                  ) : (
                    <p className="text-gray-700">
                      <span className="font-medium">Appartamento:</span> {bookingDetails.apartmentName || 'N/A'}
                    </p>
                  )}
                  <p className="text-gray-700">
                    <span className="font-medium">Totale pagato:</span> €{bookingDetails.amount ? (bookingDetails.amount / 100).toFixed(2) : 'N/A'}
                  </p>
                </div>
                
                {/* Informazioni aggiuntive */}
                <div className="mt-8">
                  <h2 className="text-lg font-medium mb-2">Cosa succede ora?</h2>
                  <p className="text-gray-700 mb-4">
                    Abbiamo inviato una email di conferma all'indirizzo {bookingDetails.email || 'fornito'}.
                    Ti contatteremo prima del tuo arrivo con istruzioni dettagliate per il check-in.
                  </p>
                  
                  {/* Check-in Online */}
                  {publicProfile?.enableOnlineCheckIn && (
                    <div className="bg-green-50 p-4 rounded-md mb-4">
                      <h3 className="font-medium text-green-800 mb-2 flex items-center">
                        <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                        Check-in Online Disponibile
                      </h3>
                      <p className="text-sm text-green-700 mb-3">
                        Risparmia tempo! Puoi effettuare il check-in online fino a 7 giorni prima del tuo arrivo.
                        Ti invieremo un link via email quando sarà disponibile.
                      </p>
                      <Link 
                        href="/checkin" // Assicurati che questo percorso esista e sia corretto
                        className="inline-flex items-center text-sm font-medium text-green-800 hover:text-green-900"
                      >
                        Vai al check-in online →
                      </Link>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">Informazioni Importanti</h3>
                    <ul className="list-disc list-inside text-blue-700 space-y-1">
                      <li>Check-in: dalle 14:00 alle 19:00</li>
                      <li>Check-out: entro le 10:00</li>
                      <li>Per check-in tardivi, contattaci in anticipo</li>
                      <li>Animali domestici non ammessi</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 text-center">
              <Link href="/book" className="inline-block px-4 py-2 text-white rounded-md shadow-sm" style={primaryButtonStyle}>
                Torna alla pagina principale
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold">{publicProfile?.name || 'Nonna Vittoria Apartments'}</h2>
            {publicProfile?.address && <p className="text-sm text-gray-300">{publicProfile.address}</p>}
          </div>
          
          <div className="text-sm">
            {publicProfile?.contactEmail && (
              <p>Email: <a href={`mailto:${publicProfile.contactEmail}`} className="hover:underline">{publicProfile.contactEmail}</a></p>
            )}
            {publicProfile?.contactPhone && (
              <p>Tel: <a href={`tel:${publicProfile.contactPhone}`} className="hover:underline">{publicProfile.contactPhone}</a></p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente principale che avvolge il contenuto in Suspense
export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
