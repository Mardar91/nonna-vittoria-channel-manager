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
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [importDetails, setImportDetails] = useState<any>(null);

  const validateUrl = (url: string): boolean => {
    // Verifica che sia un URL valido
    try {
      new URL(url);
      // Verifica che sia un feed iCal (termina con .ics o /ics o simili)
      return url.toLowerCase().includes('.ics') || url.toLowerCase().includes('/ical') || 
             url.toLowerCase().includes('/calendar') || url.toLowerCase().includes('/feed');
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setImportDetails(null);
    setShowDetails(false);
    
    if (!source) {
      setError('Seleziona una sorgente');
      return;
    }
    
    if (!url) {
      setError('Inserisci l\'URL del feed iCal');
      return;
    }
    
    if (!validateUrl(url)) {
      setError('L\'URL inserito non sembra essere un feed iCal valido');
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Si è verificato un errore');
      }
      
      // Salva i dettagli dell'importazione
      setImportDetails(data);
      
      // Controlla se ci sono stati errori durante l'importazione
      if (data.errors && data.errors.length > 0) {
        toast(`Feed aggiunto, ma con ${data.errors.length} errori durante l'importazione`, {
          icon: '⚠️', // Emoji warning
          style: {
            borderRadius: '10px',
            background: '#FFF3CD',
            color: '#856404',
          },
        });
        setShowDetails(true);
      } else {
        toast.success(`Feed iCal aggiunto con successo! Importate ${data.importedCount} prenotazioni.`);
      }
      
      // Resetta il form
      setSource('');
      setUrl('');
      
      // Aggiorna la pagina
      router.refresh();
    } catch (error) {
      setError((error as Error).message || 'Si è verificato un errore');
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
    { label: 'Houfy', value: 'Houfy' },
    { label: 'Altro', value: 'Other' },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}
      
      {showDetails && importDetails && (
        <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-md">
          <div className="flex justify-between items-center">
            <p className="font-medium">Dettagli importazione:</p>
            <button 
              type="button" 
              onClick={() => setShowDetails(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              Chiudi
            </button>
          </div>
          <p>Prenotazioni importate: {importDetails.importedCount}</p>
          <p>Errori: {importDetails.errors?.length || 0}</p>
          
          {importDetails.errors && importDetails.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Errori:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                {importDetails.errors.slice(0, 5).map((err: any, idx: number) => (
                  <li key={idx} className="text-xs">
                    {err.summary || 'Evento'} ({formatDate(err.start)} - {formatDate(err.end)}): {err.error}
                  </li>
                ))}
                {importDetails.errors.length > 5 && (
                  <li className="text-xs">... e altri {importDetails.errors.length - 5} errori</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
      
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
        <p className="mt-1 text-xs text-gray-500">
          L'URL deve terminare con .ics o essere un feed iCal riconosciuto
        </p>
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
