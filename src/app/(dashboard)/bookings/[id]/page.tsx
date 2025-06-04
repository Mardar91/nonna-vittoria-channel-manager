// src/app/(dashboard)/bookings/[id]/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import CheckInModel from '@/models/CheckIn';
import DeleteBookingButton from '@/components/DeleteBookingButton';
import PaymentButton from '@/components/PaymentButton';
import CheckInStatusBadge from '@/components/CheckInStatusBadge';
import CheckInDetails from '@/components/CheckInDetails';
import ManualCheckInButton from '@/components/ManualCheckInButton';
import { extractReservationUrl } from '@/utils/stringUtils';

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni i dettagli della prenotazione
  const booking = await BookingModel.findById(params.id);
  
  if (!booking) {
    return (
      <div className="text-center p-12">
        <h1 className="text-2xl font-bold text-red-600">Prenotazione non trovata</h1>
        <Link href="/bookings" className="mt-4 inline-block text-blue-600 hover:underline">
          Torna alle prenotazioni
        </Link>
      </div>
    );
  }
  
  // Ottieni le informazioni dell'appartamento
  const apartment = await ApartmentModel.findById(booking.apartmentId);
  
  // Verifica se esiste un check-in per questa prenotazione
  const checkIn = await CheckInModel.findOne({ 
    bookingId: params.id,
    status: 'completed'
  });
  
  // Helper per formattare le date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  // Helper per ottenere il colore dello stato
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Helper per tradurre lo stato
  const translateStatus = (status: string) => {
    switch(status) {
      case 'confirmed': return 'Confermata';
      case 'pending': return 'In attesa';
      case 'cancelled': return 'Cancellata';
      case 'completed': return 'Completata';
      default: return status;
    }
  };
  
  // Helper per tradurre lo stato del pagamento
  const translatePaymentStatus = (status: string) => {
    switch(status) {
      case 'paid': return 'Pagato';
      case 'pending': return 'In attesa';
      case 'refunded': return 'Rimborsato';
      case 'failed': return 'Fallito';
      default: return status;
    }
  };
  
  // Helper per ottenere il colore dello stato del pagamento
  const getPaymentStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const reservationUrl = extractReservationUrl(booking.notes);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Prenotazione {booking._id?.toString().substring(0, 8)}
        </h1>
        <div className="flex space-x-4">
          <Link 
            href={`/bookings/${params.id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Modifica
          </Link>
          <DeleteBookingButton id={params.id} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                {translateStatus(booking.status)}
              </span>
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                {translatePaymentStatus(booking.paymentStatus)}
              </span>
            </div>
            {booking.paymentStatus === 'pending' && (
              <PaymentButton bookingId={params.id} />
            )}
          </div>
          
          {/* Stato Check-in */}
          <div className="mb-4">
            <CheckInStatusBadge 
              hasCheckedIn={booking.hasCheckedIn || false}
              checkInDate={booking.checkInDate}
              size="md"
            />
            {booking.completedCheckInId && (
              <div className="mt-2">
                <Link href={`/checkins/${booking.completedCheckInId}`} legacyBehavior>
                  <a className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                    Visualizza Dettagli Check-in &rarr;
                  </a>
                </Link>
              </div>
            )}
            {booking.status === 'confirmed' && booking.paymentStatus === 'paid' && !booking.hasCheckedIn && (
              <div className="mt-2 flex space-x-2">
                <ManualCheckInButton 
                  bookingId={params.id}
                  bookingDetails={{
                    guestName: booking.guestName,
                    numberOfGuests: booking.numberOfGuests,
                    apartmentName: apartment?.name || 'Appartamento'
                  }}
                />
                {booking.source !== 'direct' && reservationUrl && (
                  <a
                    href={reservationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                  >
                    Apri in {booking.source ? booking.source.charAt(0).toUpperCase() + booking.source.slice(1) : 'link'}
                  </a>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Appartamento</p>
              <p className="mt-1 text-lg font-semibold">
                {apartment ? apartment.name : 'Sconosciuto'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Ospite</p>
              <p className="mt-1 text-lg font-semibold">{booking.guestName}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Check-in</p>
              <p className="mt-1">{formatDate(booking.checkIn)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Check-out</p>
              <p className="mt-1">{formatDate(booking.checkOut)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Numero Ospiti</p>
              <p className="mt-1">{booking.numberOfGuests}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Prezzo Totale</p>
              <p className="mt-1 font-semibold">€{booking.totalPrice.toFixed(2)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Fonte</p>
              <p className="mt-1">{booking.source === 'direct' ? 'Diretta' : booking.source}</p>
            </div>
            
            {booking.externalId && (
              <div>
                <p className="text-sm font-medium text-gray-500">ID Esterno</p>
                <p className="mt-1">{booking.externalId}</p>
              </div>
            )}

              {/* Display Access Code */}
              {booking.accessCode && (
                <div className="col-span-2 mt-4 pt-4 border-t border-gray-200"> {/* col-span-2 to take full width if needed, or adjust */}
                  <h3 className="text-md font-semibold text-gray-700">Codice di Accesso Appartamento:</h3>
                  <p className="text-xl font-bold text-blue-600 bg-blue-50 p-3 rounded-md inline-block mt-1 tracking-wider">
                    {booking.accessCode}
                  </p>
                </div>
              )}
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Informazioni Contatto</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1">{booking.guestEmail}</p>
            </div>
            
            {booking.guestPhone && (
              <div>
                <p className="text-sm font-medium text-gray-500">Telefono</p>
                <p className="mt-1">{booking.guestPhone}</p>
              </div>
            )}
            
            {booking.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">Note</p>
                <p className="mt-1 whitespace-pre-line">{booking.notes}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-medium mb-4">Log Attività</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500">
                    Prenotazione creata il {new Date(booking.createdAt!).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {booking.hasCheckedIn && booking.checkInDate && (
                <div className="flex items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500">
                      Check-in effettuato il {new Date(booking.checkInDate).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
              
              {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                <div className="flex items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500">
                      Ultima modifica il {new Date(booking.updatedAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Link all'appartamento */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Informazioni Appartamento</h2>
          <Link 
            href={`/apartments/${booking.apartmentId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            Vedi dettagli
          </Link>
        </div>
        
        <div className="mt-4">
          {apartment ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Nome</p>
                <p className="mt-1">{apartment.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Indirizzo</p>
                <p className="mt-1">{apartment.address}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Capacità</p>
                <p className="mt-1">Max {apartment.maxGuests} ospiti</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Informazioni sull'appartamento non disponibili.</p>
          )}
        </div>
      </div>
      
      {/* Sezione Check-in se disponibile */}
      {checkIn && (
        <CheckInDetails bookingId={params.id} />
      )}
    </div>
  );
}
