'use client';

import { useState } from 'react';
import { IBooking } from '@/models/Booking';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import CheckInStatusBadge from './CheckInStatusBadge';

interface BookingInquiriesProps {
  inquiries: (IBooking & { apartmentName: string })[];
}

export default function BookingInquiries({ inquiries }: BookingInquiriesProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Funzione per formattare le date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Funzione per confermare manualmente una richiesta
  const confirmInquiry = async (id: string) => {
    if (confirm('Sei sicuro di voler confermare questa richiesta?')) {
      setLoading(id);
      
      try {
        const response = await fetch(`/api/bookings/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'confirmed'
          }),
        });
        
        if (!response.ok) {
          throw new Error('Errore durante la conferma della richiesta');
        }
        
        toast.success('Richiesta confermata con successo');
        router.refresh();
      } catch (error) {
        console.error('Error confirming inquiry:', error);
        toast.error('Errore durante la conferma della richiesta');
      } finally {
        setLoading(null);
      }
    }
  };

  // Funzione per annullare una richiesta
  const cancelInquiry = async (id: string) => {
    if (confirm('Sei sicuro di voler annullare questa richiesta?')) {
      setLoading(id);
      
      try {
        const response = await fetch(`/api/bookings/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled'
          }),
        });
        
        if (!response.ok) {
          throw new Error('Errore durante l\'annullamento della richiesta');
        }
        
        toast.success('Richiesta annullata con successo');
        router.refresh();
      } catch (error) {
        console.error('Error cancelling inquiry:', error);
        toast.error('Errore durante l\'annullamento della richiesta');
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      {inquiries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nessuna richiesta di prenotazione trovata</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Ospite
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Appartamento
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Check-in
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Check-out
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Stato Pagamento
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Check-in
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Prezzo
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inquiries.map((inquiry) => (
              <tr key={inquiry._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {inquiry.guestName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {inquiry.guestEmail}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {inquiry.apartmentName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(inquiry.checkIn)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(inquiry.checkOut)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      inquiry.paymentStatus === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : inquiry.paymentStatus === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {inquiry.paymentStatus === 'pending' ? 'In attesa' : 
                     inquiry.paymentStatus === 'failed' ? 'Fallito' : 
                     inquiry.paymentStatus === 'refunded' ? 'Rimborsato' : 
                     'Sconosciuto'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <CheckInStatusBadge 
                    hasCheckedIn={inquiry.hasCheckedIn || false}
                    checkInDate={inquiry.checkInDate}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  €{inquiry.totalPrice.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Link
                      href={`/bookings/${inquiry._id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Dettagli
                    </Link>
                    <button
                      onClick={() => confirmInquiry(inquiry._id as string)}
                      disabled={loading === inquiry._id}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      {loading === inquiry._id ? 'In corso...' : 'Conferma'}
                    </button>
                    <button
                      onClick={() => cancelInquiry(inquiry._id as string)}
                      disabled={loading === inquiry._id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {loading === inquiry._id ? 'In corso...' : 'Annulla'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
