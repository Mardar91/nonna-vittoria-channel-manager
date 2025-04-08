'use client';

import { IBooking } from '@/models/Booking'; // Assumi che l'interfaccia sia importabile
import Link from 'next/link';
import { EyeIcon, PencilIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

// Interfaccia estesa per le props, aspettandosi apartmentName
interface BookingWithApartmentName extends IBooking {
  _id: string; // Assicurati che _id sia una stringa qui
  apartmentName?: string; // Opzionale se l'appartamento è stato cancellato
  createdAt: string | Date; // Può essere stringa dopo JSON.parse
  updatedAt: string | Date;
  checkIn: string | Date;
  checkOut: string | Date;
}

interface BookingListProps {
  bookings: BookingWithApartmentName[]; // Usa l'interfaccia estesa
}

export default function BookingList({ bookings }: BookingListProps) {

  // Funzione robusta per formattare date (gestisce stringhe o Date)
  const formatDate = (dateInput: string | Date | undefined): string => {
    if (!dateInput) return 'N/D';
    try {
      const date = new Date(dateInput);
      // Verifica se la data è valida
      if (isNaN(date.getTime())) return 'Data invalida';
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      console.error("Errore formattazione data:", dateInput, e);
      return 'Errore data';
    }
  };

   // Funzione per formattare date e ora
   const formatDateTime = (dateInput: string | Date | undefined): string => {
     if (!dateInput) return 'N/D';
     try {
       const date = new Date(dateInput);
       if (isNaN(date.getTime())) return 'Data invalida';
       return date.toLocaleString('it-IT', {
         day: '2-digit',
         month: '2-digit',
         year: 'numeric',
         hour: '2-digit',
         minute: '2-digit',
       });
     } catch (e) {
       console.error("Errore formattazione data/ora:", dateInput, e);
       return 'Errore data';
     }
   };

  // Funzioni per stile e traduzione stati (mantieni o sposta in utils)
  const getStatusClass = (status: string): string => {
     switch (status) {
       case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
       case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
       case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
       case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
       default: return 'bg-gray-100 text-gray-800 border-gray-200';
     }
  };
  const translateStatus = (status: string): string => {
     switch (status) {
       case 'confirmed': return 'Confermata';
       case 'pending': return 'In Attesa Pag.'; // Abbreviazione
       case 'cancelled': return 'Cancellata';
       case 'completed': return 'Completata';
       default: return status;
     }
  };
   const getPaymentStatusClass = (status?: string): string => {
       if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
       switch (status) {
           case 'paid': return 'bg-green-100 text-green-800 border-green-200';
           case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
           case 'failed': return 'bg-red-100 text-red-800 border-red-200';
           case 'refunded': return 'bg-purple-100 text-purple-800 border-purple-200';
           default: return 'bg-gray-100 text-gray-800 border-gray-200';
       }
   };
   const translatePaymentStatus = (status?: string): string => {
       if (!status) return 'N/D';
       switch (status) {
           case 'paid': return 'Pagato';
           case 'pending': return 'Attesa';
           case 'failed': return 'Fallito';
           case 'refunded': return 'Rimborsato';
           default: return status;
       }
   };


  return (
    <div className="overflow-x-auto">
      {bookings.length === 0 ? (
        <div className="text-center py-10 px-4">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Nessuna prenotazione</h3>
          <p className="mt-1 text-sm text-gray-500">Non ci sono prenotazioni che corrispondono ai criteri selezionati.</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ospite</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Appartamento</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Pagamento</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Prezzo</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                {/* Ospite */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate" title={booking.guestName}>{booking.guestName}</div>
                  <div className="text-xs text-gray-500 truncate" title={booking.guestEmail}>{booking.guestEmail || 'Email non fornita'}</div>
                </td>
                {/* Appartamento (nascosto su mobile piccolo) */}
                <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                  <div className="text-sm text-gray-800">{booking.apartmentName || 'N/D'}</div>
                   {/* Potresti aggiungere link all'appartamento se hai l'ID */}
                   {/* <Link href={`/apartments/${booking.apartmentId}`} className="text-xs text-blue-600 hover:underline">Vedi Apt</Link> */}
                </td>
                {/* Periodo */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(booking.checkIn)}</div>
                  <div className="text-xs text-gray-500">al {formatDate(booking.checkOut)}</div>
                </td>
                {/* Stato Prenotazione */}
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusClass(booking.status)}`}>
                    {translateStatus(booking.status)}
                  </span>
                </td>
                 {/* Stato Pagamento (nascosto su mobile extra piccolo) */}
                 <td className="px-4 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                   <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getPaymentStatusClass(booking.paymentStatus)}`}>
                       {translatePaymentStatus(booking.paymentStatus)}
                   </span>
                 </td>
                {/* Prezzo (nascosto su schermi medi) */}
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700 hidden lg:table-cell">
                  €{booking.totalPrice?.toFixed(2) ?? '0.00'}
                </td>
                {/* Azioni */}
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                   <div className="flex justify-end items-center space-x-2">
                       <Link href={`/bookings/${booking._id}`} title="Vedi Dettagli" className="text-blue-600 hover:text-blue-800">
                           <EyeIcon className="h-5 w-5" />
                           <span className="sr-only">Dettagli</span>
                       </Link>
                       {/* Mostra modifica solo se non cancellata o completata? */}
                       {(booking.status === 'pending' || booking.status === 'confirmed') && (
                           <Link href={`/bookings/${booking._id}/edit`} title="Modifica" className="text-yellow-600 hover:text-yellow-800">
                               <PencilIcon className="h-5 w-5" />
                               <span className="sr-only">Modifica</span>
                           </Link>
                       )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
       {/* Aggiungi paginazione se necessario */}
    </div>
  );
}
