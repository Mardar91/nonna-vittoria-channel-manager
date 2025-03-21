// src/components/ICalSyncForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ICalSyncFormProps {
  apartmentId: string;
}

export default function ICalSyncForm({ apartmentId }: ICalSyncFormProps) {
  const router = useRouter();
  const [source, setSource] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!source || !url) {
      toast.error('Compila tutti i campi');
      return;
    }
    
    if (!url.startsWith('http')) {
      toast.error('URL non valido');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/ical/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartmentId,
          source,
          url,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore');
      }
      
      const data = await response.json();
      toast.success(`Feed iCal aggiunto con successo! Importate ${data.importedCount} prenotazioni.`);
      
      // Resetta il form
      setSource('');
      setUrl('');
      
      // Aggiorna la pagina
      router.refresh();
    } catch (error) {
      console.error('Error syncing iCal:', error);
      toast.error((error as Error).message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  // Opzioni predefinite per le sorgenti comuni
  const sourceOptions = [
    { label: 'Seleziona sorgente', value: '' },
    { label: 'Airbnb', value: 'Airbnb' },
    { label: 'Booking.com', value: 'Booking.com' },
    { label: 'Expedia', value: 'Expedia' },
    { label: 'VRBO/HomeAway', value: 'VRBO' },
    { label: 'TripAdvisor', value: 'TripAdvisor' },
    { label: 'Google Calendar', value: 'Google' },
    { label: 'Altro', value: 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="source" className="block text-sm font-medium text-gray-700">
          Sorgente
        </label>
        <select
          id="source"
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          URL del Feed iCal
        </label>
        <input
          type="url"
          name="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://esempio.com/calendar.ics"
          required
          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
        />
      </div>
      
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Sincronizzazione...' : 'Aggiungi e Sincronizza'}
        </button>
      </div>
    </form>
  );
}
