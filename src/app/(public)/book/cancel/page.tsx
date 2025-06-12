'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Added import
import { XCircleIcon } from '@heroicons/react/24/outline';

// Componente che utilizza useSearchParams
function CancelContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isGroup = searchParams.get('group');
  
  const [publicProfile, setPublicProfile] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileResponse = await fetch('/api/public-profile');
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setPublicProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
  }, []);

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
              <Image src={publicProfile.logo} alt="Logo" width={40} height={40} className="h-10 w-10 rounded-full mr-3" />
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
              <XCircleIcon className="h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Prenotazione Annullata</h1>
              <p className="text-lg text-gray-600 mt-2">
                La tua prenotazione non è stata completata perché il pagamento è stato annullato.
              </p>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-gray-700 mb-6">
                Se hai cambiato idea o hai riscontrato problemi durante il pagamento, puoi provare di nuovo a effettuare la prenotazione.
              </p>
              
              <Link href="/book" className="inline-block px-4 py-2 text-white rounded-md shadow-sm" style={primaryButtonStyle}>
                Torna alla ricerca
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
export default function BookingCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
