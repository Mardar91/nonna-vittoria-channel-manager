'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Switch } from '@headlessui/react';
import { GlobeAltIcon, QrCodeIcon, PencilIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { IPublicProfile } from '@/models/PublicProfile';
import CopyToClipboardButton from '@/components/CopyToClipboardButton';

export default function OnlineProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<IPublicProfile>({
    isActive: false,
    name: 'Nonna Vittoria Apartments',
    allowGroupBooking: true,
    description: '',
    enableOnlineCheckIn: false,
    checkInTerms: '',
  });
  
  const [publicUrl, setPublicUrl] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/public-profile');
        
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Errore nel caricamento del profilo');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
    
    // Imposta gli URL pubblici
    const baseUrl = window.location.origin;
    setPublicUrl(`${baseUrl}/book`);
    setCheckInUrl(`${baseUrl}/checkin`);
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'number') {
      setProfile({ ...profile, [name]: parseFloat(value) || 0 });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };
  
  const handleToggleActive = (isActive: boolean) => {
    setProfile({ ...profile, isActive });
  };
  
  const handleToggleGroupBooking = (allowGroupBooking: boolean) => {
    setProfile({ ...profile, allowGroupBooking });
  };
  
  const handleToggleOnlineCheckIn = (enableOnlineCheckIn: boolean) => {
    setProfile({ ...profile, enableOnlineCheckIn });
  };
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/public-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio del profilo');
      }
      
      toast.success('Profilo salvato con successo');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Errore nel salvataggio del profilo');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profilo Online</h1>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Configurazione Visibilità
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Attiva o disattiva la visibilità della tua pagina pubblica di prenotazione.
            </p>
          </div>
          
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <GlobeAltIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Stato del Profilo Online</div>
                  <div className="text-sm text-gray-500">{profile.isActive ? 'Attivo e visibile pubblicamente' : 'Non attivo - non visibile al pubblico'}</div>
                </div>
              </div>
              
              <Switch
                checked={profile.isActive}
                onChange={handleToggleActive}
                className={`${
                  profile.isActive ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    profile.isActive ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Link Pubblico Prenotazioni:</p>
                <div className="mt-1 flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <CopyToClipboardButton
                    textToCopy={publicUrl}
                    className="ml-2 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Link
                  href="/book"
                  target="_blank"
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 py-2 px-4 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <GlobeAltIcon className="mr-1.5 h-5 w-5 text-blue-600" />
                  Visualizza Pagina
                </Link>
                
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 py-2 px-4 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <QrCodeIcon className="mr-1.5 h-5 w-5 text-blue-600" />
                  Genera QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sezione Check-in Online */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Check-in Online
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Permetti ai tuoi ospiti di effettuare il check-in online prima dell'arrivo.
            </p>
          </div>
          
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Check-in Online</div>
                  <div className="text-sm text-gray-500">
                    {profile.enableOnlineCheckIn 
                      ? 'Attivo - gli ospiti possono fare il check-in online' 
                      : 'Non attivo - check-in solo di persona'}
                  </div>
                </div>
              </div>
              
              <Switch
                checked={profile.enableOnlineCheckIn || false}
                onChange={handleToggleOnlineCheckIn}
                className={`${
                  profile.enableOnlineCheckIn ? 'bg-green-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    profile.enableOnlineCheckIn ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
            
            {profile.enableOnlineCheckIn && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Link Check-in Online:</p>
                  <div className="mt-1 flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={checkInUrl}
                      className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <CopyToClipboardButton
                      textToCopy={checkInUrl}
                      className="ml-2 inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="checkInTerms" className="block text-sm font-medium text-gray-700">
                    Termini e Condizioni Check-in
                  </label>
                  <textarea
                    id="checkInTerms"
                    name="checkInTerms"
                    rows={4}
                    value={profile.checkInTerms || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Inserisci i termini e le condizioni che gli ospiti devono accettare durante il check-in online..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Questi termini verranno mostrati agli ospiti durante il processo di check-in online.
                  </p>
                </div>
                
                <div className="flex space-x-4">
                  <Link
                    href="/checkin"
                    target="_blank"
                    className="inline-flex justify-center rounded-md border border-transparent bg-green-100 py-2 px-4 text-sm font-medium text-green-700 shadow-sm hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <ClipboardDocumentCheckIcon className="mr-1.5 h-5 w-5 text-green-600" />
                    Test Check-in
                  </Link>
                  
                  <Link
                    href="/checkins"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Vedi Check-ins
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Informazioni Generali
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Queste informazioni saranno mostrate nella pagina pubblica di prenotazione.
            </p>
          </div>
          
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome Struttura
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descrizione
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={profile.description || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Breve descrizione della tua struttura..."
                />
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                  Email di Contatto
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  id="contactEmail"
                  value={profile.contactEmail || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                  Telefono di Contatto
                </label>
                <input
                  type="text"
                  name="contactPhone"
                  id="contactPhone"
                  value={profile.contactPhone || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Indirizzo
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={profile.address || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Impostazioni di Prenotazione
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Configura le opzioni per il sistema di prenotazione online.
            </p>
          </div>
          
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <Switch
                    checked={profile.allowGroupBooking}
                    onChange={handleToggleGroupBooking}
                    className={`${
                      profile.allowGroupBooking ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        profile.allowGroupBooking ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="allowGroupBooking" className="font-medium text-gray-700">
                    Prenotazioni di Gruppo
                  </label>
                  <p className="text-gray-500">
                    Consenti la prenotazione di più appartamenti per gruppi numerosi.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="minDaysInAdvance" className="block text-sm font-medium text-gray-700">
                    Giorni Minimi di Anticipo
                  </label>
                  <input
                    type="number"
                    name="minDaysInAdvance"
                    id="minDaysInAdvance"
                    min="0"
                    value={profile.minDaysInAdvance || 1}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Quanti giorni prima deve essere fatta una prenotazione.
                  </p>
                </div>
                
                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="maxDaysInAdvance" className="block text-sm font-medium text-gray-700">
                    Giorni Massimi di Anticipo
                  </label>
                  <input
                    type="number"
                    name="maxDaysInAdvance"
                    id="maxDaysInAdvance"
                    min="1"
                    value={profile.maxDaysInAdvance || 365}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Quanto tempo in anticipo si può prenotare (es. 365 = un anno).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Personalizzazione
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Personalizza l'aspetto della tua pagina di prenotazione.
            </p>
          </div>
          
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="headerColor" className="block text-sm font-medium text-gray-700">
                  Colore Intestazione
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    name="headerColor"
                    id="headerColor"
                    value={profile.headerColor || '#1d4ed8'}
                    onChange={handleChange}
                    className="h-10 w-10 rounded-l-md border-gray-300"
                  />
                  <input
                    type="text"
                    name="headerColor"
                    value={profile.headerColor || '#1d4ed8'}
                    onChange={handleChange}
                    className="flex-1 rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                  Colore Primario
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    name="primaryColor"
                    id="primaryColor"
                    value={profile.primaryColor || '#2563eb'}
                    onChange={handleChange}
                    className="h-10 w-10 rounded-l-md border-gray-300"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    value={profile.primaryColor || '#2563eb'}
                    onChange={handleChange}
                    className="flex-1 rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
                Logo
              </label>
              <div className="mt-1 flex items-center">
                <span className="inline-block h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </span>
                <button
                  type="button"
                  className="ml-5 rounded-md border border-gray-300 bg-white py-2 px-3 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Carica Logo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
