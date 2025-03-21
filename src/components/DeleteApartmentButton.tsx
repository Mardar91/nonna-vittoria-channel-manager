'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface DeleteApartmentButtonProps {
  id: string;
}

export default function DeleteApartmentButton({ id }: DeleteApartmentButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/apartments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore durante l\'eliminazione');
      }
      
      toast.success('Appartamento eliminato con successo');
      router.push('/apartments');
      router.refresh();
    } catch (error) {
      console.error('Error deleting apartment:', error);
      toast.error((error as Error).message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      {showConfirm ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 text-white px-3 py-2 text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Eliminazione...' : 'Conferma'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="bg-gray-200 text-gray-800 px-3 py-2 text-sm rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Annulla
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Elimina
        </button>
      )}
    </>
  );
}
