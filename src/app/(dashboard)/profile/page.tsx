'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react'; // Importa useState per gestire lo stato di caricamento/errore
import toast from 'react-hot-toast'; // Assumendo l&apos;uso di react-hot-toast per le notifiche

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleResetAccount = async () => {
    const confirmation = window.confirm(
      "Sei sicuro di voler ripristinare il tuo account? Tutti i dati (appartamenti, prenotazioni, check-in, impostazioni, ecc.) verranno eliminati permanentemente. Questa azione non può essere annullata."
    );
    if (confirmation) {
      setIsLoading(true);
      toast.loading('Ripristino dell&apos;account in corso...', { id: 'reset-toast' }); // Mostra notifica di caricamento

      try {
        const response = await fetch('/api/account/reset', {
          method: 'DELETE',
        });

        const result = await response.json();

        if (response.ok) {
          toast.success('Account ripristinato con successo! Tutti i dati sono stati cancellati.', { id: 'reset-toast' });
          // Reindirizza l&apos;utente o esegui il logout
          // È consigliabile fare il logout e reindirizzare alla pagina di login
          await signOut({ callbackUrl: '/login' });
        } else {
          toast.error(`Errore durante il ripristino: ${result.message || 'Errore sconosciuto'}`, { id: 'reset-toast' });
        }
      } catch (error) {
        console.error('Errore nella chiamata API di ripristino:', error);
        toast.error('Errore di connessione durante il ripristino dell&apos;account.', { id: 'reset-toast' });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('Azione di ripristino annullata.');
      toast.dismiss('reset-toast'); // Rimuovi la notifica se l&apos;utente annulla mentre era in caricamento (improbabile qui ma buona pratica)
    }
  };

  if (!session && !isLoading) { // Se non c&apos;è sessione e non sta caricando il reset
    return <p>Caricamento sessione...</p>;
  }

  if (isLoading && !session) { // Se sta resettando e la sessione è andata (dopo signOut)
     return <p>Ripristino in corso... Sarai reindirizzato a breve.</p>;
  }


  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Profilo Utente</h1>
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informazioni Utente</h2>
        <p><strong>Nome:</strong> {session?.user?.name || 'Non disponibile'}</p>
        <p><strong>Email:</strong> {session?.user?.email || 'Non disponibile'}</p>
        {session?.user?.role && (
          <p><strong>Ruolo:</strong> {session.user.role}</p>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Gestione Account</h2>
        <p className="mb-4 text-sm text-gray-600">
          Attenzione: Il ripristino dell&apos;account cancellerà permanentemente tutti i dati associati,
          inclusi appartamenti, prenotazioni, check-in e impostazioni.
          Questa azione non può essere annullata.
        </p>
        <button
          className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleResetAccount}
          disabled={isLoading} // Disabilita il pulsante durante il caricamento
        >
          {isLoading ? 'Ripristino in corso...' : 'Ripristina Account'}
        </button>
      </div>
    </div>
  );
}
