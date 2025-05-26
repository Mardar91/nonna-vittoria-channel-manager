"use client";

import React from 'react';

interface DeleteCheckInButtonProps {
  checkInId: string;
  onDeleteSuccess?: () => void; // Optional callback for successful deletion
  onDeleteError?: (error: Error) => void; // Optional callback for error
}

const DeleteCheckInButton: React.FC<DeleteCheckInButtonProps> = ({ 
  checkInId,
  onDeleteSuccess,
  onDeleteError 
}) => {
  const handleClick = async () => {
    if (confirm('Sei sicuro di voler eliminare questo check-in?')) {
      try {
        const response = await fetch(`/api/checkin/${checkInId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          if (onDeleteSuccess) {
            onDeleteSuccess();
          } else {
            // Default behavior if no callback is provided
            window.location.href = '/checkins'; 
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Errore sconosciuto durante l'eliminazione.' }));
          const error = new Error(errorData.message || 'Errore durante l'eliminazione del check-in');
          if (onDeleteError) {
            onDeleteError(error);
          } else {
            alert(error.message);
          }
        }
      } catch (error) {
        const fetchError = error instanceof Error ? error : new Error('Errore di rete o durante l'eliminazione del check-in');
        if (onDeleteError) {
          onDeleteError(fetchError);
        } else {
          alert(fetchError.message);
        }
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
    >
      Elimina Check-in
    </button>
  );
};

export default DeleteCheckInButton;
