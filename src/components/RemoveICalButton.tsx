// src/components/RemoveICalButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface RemoveICalButtonProps {
  apartmentId: string;
  source: string;
}

export default function RemoveICalButton({ apartmentId, source }: RemoveICalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (confirm(`Sei sicuro di voler rimuovere il feed iCal da ${source}?`)) {
      setLoading(true);
      
      try {
        const response = await fetch('/api/ical/remove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apartmentId,
            source,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Si è verificato un errore');
        }
        
        toast.success(`Feed iCal da ${source} rimosso con successo!`);
        router.refresh();
      } catch (error) {
        console.error('Error removing iCal feed:', error);
        toast.error((error as Error).message || 'Si è verificato un errore');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Rimuovi feed iCal"
    >
      {loading ? 'Rimozione...' : 'Rimuovi'}
    </button>
  );
}
