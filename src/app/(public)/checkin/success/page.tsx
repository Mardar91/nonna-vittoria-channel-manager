'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { IPublicProfile } from '@/models/PublicProfile';

export default function CheckInSuccessPage() {
  const [profile, setProfile] = useState<IPublicProfile | null>(null);
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      const response = await fetch('/api/public-profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
  
  // Stili dinamici basati sul profilo
  const headerStyle = {
    backgroundColor: profile?.headerColor || '#1d4ed8',
  };
  
  const primaryButtonStyle = {
    backgroundColor: profile?.primaryColor || '#2563eb',
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 text-white" style={headerStyle}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {profile?.logo && (
              <img src={profile.logo} alt="Logo" className="h-10 w-10 rounded-full mr-3" />
            )}
            <h1 className="text-xl font-bold">{profile?.name || 'Check-in Online'}</h1>
          </div>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Check-in Completato!
            </h1>
            
            <p className="text-gray-600 mb-8">
              Il check-in è stato completato con successo. 
              Ti abbiamo inviato una email di conferma con tutti i dettagli.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-8">
              <h2 className="font-semibold text-blue-900 mb-2">Informazioni Importanti</h2>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• Orario check-in: dalle 14:00 alle 19:00</li>
                <li>• Per arrivi fuori orario, contattaci in anticipo</li>
                <li>• Riceverai le istruzioni per l'accesso via email</li>
                <li>• In caso di necessità, contatta la reception</li>
              </ul>
            </div>
            
            {profile?.contactPhone && (
              <div className="mb-6">
                <p className="text-sm text-gray-600">Per assistenza:</p>
                <a 
                  href={`tel:${profile.contactPhone}`} 
                  className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                >
                  {profile.contactPhone}
                </a>
              </div>
            )}
            
            <div className="space-y-3">
              <Link 
                href="/book" 
                className="block w-full py-2 px-4 text-center text-white rounded-md hover:opacity-90"
                style={primaryButtonStyle}
              >
                Torna alla Home
              </Link>
              
              <Link 
                href="/checkin" 
                className="block w-full py-2 px-4 text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Nuovo Check-in
              </Link>
            </div>
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
