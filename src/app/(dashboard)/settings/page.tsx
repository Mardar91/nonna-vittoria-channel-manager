'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { ISettings } from '@/models/Settings';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [accountFormData, setAccountFormData] = useState({
    email: '',
    timezone: 'Europe/Rome',
  });
  
  const [channelManagerFormData, setChannelManagerFormData] = useState<Partial<ISettings>>({
    defaultCheckInTime: '14:00',
    defaultCheckOutTime: '10:00',
    autoSync: true,
    syncInterval: 10,
  });
  
  // Carica le impostazioni attuali
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Aggiorna email dall'utente
        if (session?.user?.email) {
          setAccountFormData(prev => ({
            ...prev,
            email: session.user?.email || '',
          }));
        }
        
        // Carica le impostazioni dal server
        const response = await fetch('/api/settings');
        
        if (response.ok) {
          const data = await response.json();
          setChannelManagerFormData({
            defaultCheckInTime: data.defaultCheckInTime,
            defaultCheckOutTime: data.defaultCheckOutTime,
            autoSync: data.autoSync,
            syncInterval: data.syncInterval,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Errore nel caricamento delle impostazioni');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [session]);
  
  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAccountFormData({ ...accountFormData, [name]: value });
  };
  
  const handleChannelManagerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setChannelManagerFormData({ ...channelManagerFormData, [name]: checked });
    } else if (type === 'number') {
      setChannelManagerFormData({ ...channelManagerFormData, [name]: parseInt(value) });
    } else {
      setChannelManagerFormData({ ...channelManagerFormData, [name]: value });
    }
  };
  
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      // Per ora, salviamo solo il fuso orario nelle impostazioni
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone: accountFormData.timezone }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio delle impostazioni');
      }
      
      toast.success('Impostazioni account salvate con successo');
    } catch (error) {
      console.error('Error saving account settings:', error);
      toast.error('Errore nel salvataggio delle impostazioni');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChannelManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelManagerFormData),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio delle impostazioni');
      }
      
      // Se abbiamo modificato autoSync o syncInterval, possiamo avviare/fermare la sincronizzazione
      if (channelManagerFormData.autoSync) {
        // Avvia la sincronizzazione manualmente una volta per testarla
        try {
          await fetch('/api/ical/sync/auto', { method: 'POST' });
          toast.success('Sincronizzazione avviata');
        } catch (syncError) {
          console.error('Error triggering sync:', syncError);
        }
      }
      
      toast.success('Impostazioni Channel Manager salvate con successo');
    } catch (error) {
      console.error('Error saving channel manager settings:', error);
      toast.error('Errore nel salvataggio delle impostazioni');
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per avviare manualmente la sincronizzazione
  const triggerManualSync = async () => {
    try {
      setLoading(true);
      toast.loading('Sincronizzazione in corso...');
      
      const response = await fetch('/api/ical/sync/auto', { method: 'POST' });
      
      if (!response.ok) {
        throw new Error('Errore durante la sincronizzazione');
      }
      
      const result = await response.json();
      
      toast.dismiss();
      toast.success(`Sincronizzazione completata: ${result.totalImported || 0} prenotazioni importate`);
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      toast.dismiss();
      toast.error('Errore durante la sincronizzazione');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && channelManagerFormData.autoSync === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Impostazioni</h1>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Impostazioni Account</h3>
            <p className="mt-1 text-sm text-gray-500">
              Gestisci le impostazioni principali del tuo account.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <form className="space-y-6" onSubmit={handleAccountSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={accountFormData.email}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Fuso Orario
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={accountFormData.timezone}
                  onChange={handleAccountChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Europe/Rome">Europe/Rome (CET/CEST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Impostazioni Channel Manager</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configura le impostazioni del Channel Manager.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <form className="space-y-6" onSubmit={handleChannelManagerSubmit}>
              <div>
                <label htmlFor="defaultCheckInTime" className="block text-sm font-medium text-gray-700">
                  Orario Default Check-in
                </label>
                <input
                  type="time"
                  name="defaultCheckInTime"
                  id="defaultCheckInTime"
                  value={channelManagerFormData.defaultCheckInTime}
                  onChange={handleChannelManagerChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="defaultCheckOutTime" className="block text-sm font-medium text-gray-700">
                  Orario Default Check-out
                </label>
                <input
                  type="time"
                  name="defaultCheckOutTime"
                  id="defaultCheckOutTime"
                  value={channelManagerFormData.defaultCheckOutTime}
                  onChange={handleChannelManagerChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="autoSync"
                      name="autoSync"
                      type="checkbox"
                      checked={channelManagerFormData.autoSync}
                      onChange={handleChannelManagerChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="autoSync" className="font-medium text-gray-700">
                      Sincronizzazione Automatica
                    </label>
                    <p className="text-gray-500">
                      Sincronizza automaticamente le prenotazioni da fonti esterne periodicamente.
                    </p>
                  </div>
                </div>
              </div>
              
              {channelManagerFormData.autoSync && (
                <div>
                  <label htmlFor="syncInterval" className="block text-sm font-medium text-gray-700">
                    Intervallo di Sincronizzazione (minuti)
                  </label>
                  <input
                    type="number"
                    name="syncInterval"
                    id="syncInterval"
                    min="10"
                    max="1440"
                    value={channelManagerFormData.syncInterval}
                    onChange={handleChannelManagerChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Valore consigliato: 10-60 minuti. Un intervallo più breve potrebbe causare problemi con i limiti delle API.
                  </p>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Salvataggio...' : 'Salva'}
                </button>
                
                <button
                  type="button"
                  onClick={triggerManualSync}
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Sincronizza Ora
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Status Sincronizzazione</h3>
            <p className="mt-1 text-sm text-gray-500">
              Stato attuale della sincronizzazione iCal.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${channelManagerFormData.autoSync ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <p className="text-sm font-medium">
                  Sincronizzazione automatica: {channelManagerFormData.autoSync ? 'Attiva' : 'Non attiva'}
                </p>
              </div>
              
              {channelManagerFormData.autoSync && (
                <p className="mt-2 text-sm text-gray-600">
                  Intervallo attuale: {channelManagerFormData.syncInterval} minuti
                </p>
              )}
              
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Per sincronizzare frequentemente (ogni 10 minuti) consigliamo di configurare un cron job esterno che chiami l'endpoint <code className="bg-gray-200 px-1 py-0.5 rounded">/api/ical/sync/auto</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
