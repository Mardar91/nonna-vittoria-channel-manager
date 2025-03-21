import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingModel from '@/models/Booking';
import ICalSyncForm from '@/components/ICalSyncForm';

export default async function ApartmentDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni i dettagli dell'appartamento
  const apartment = await ApartmentModel.findById(params.id);
  
  if (!apartment) {
    return (
      <div className="text-center p-12">
        <h1 className="text-2xl font-bold text-red-600">Appartamento non trovato</h1>
        <Link href="/apartments" className="mt-4 inline-block text-blue-600 hover:underline">
          Torna agli appartamenti
        </Link>
      </div>
    );
  }
  
  // Ottieni le prenotazioni per questo appartamento
  const bookings = await BookingModel.find({ 
    apartmentId: params.id,
    status: { $ne: 'cancelled' }
  }).sort({ checkIn: 1 });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{apartment.name}</h1>
        <div className="flex space-x-4">
          <Link 
            href={`/apartments/${params.id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Modifica
          </Link>
          <button 
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            // La funzione di eliminazione verrà implementata lato client
          >
            Elimina
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dettagli Appartamento */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dettagli</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Indirizzo</p>
              <p className="mt-1">{apartment.address}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Prezzo</p>
              <p className="mt-1">€{apartment.price.toFixed(2)} / notte</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Camere da Letto</p>
              <p className="mt-1">{apartment.bedrooms}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Bagni</p>
              <p className="mt-1">{apartment.bathrooms}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Ospiti Massimi</p>
              <p className="mt-1">{apartment.maxGuests}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500">Descrizione</p>
            <p className="mt-1">{apartment.description}</p>
          </div>
          
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500">Servizi</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {(apartment.amenities || []).map((amenity: string) => (
                <span 
                  key={amenity}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Gestione iCal */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Integrazione Calendario</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Feed iCal da Esportare</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm break-all">{apartment.icalFeed}</p>
              <button
                className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                // Funzione per copiare negli appunti implementata lato client
              >
                Copia Link
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Usa questo link per sincronizzare le tue prenotazioni su altre piattaforme.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Feed iCal Importati</h3>
            {(apartment.icalUrls || []).length === 0 ? (
              <p className="text-sm text-gray-500">Nessun feed importato. Aggiungi un feed iCal sotto.</p>
            ) : (
              <ul className="space-y-2">
                {(apartment.icalUrls || []).map((ical: { source: string; url: string }, index: number) => (
                  <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                    <div>
                      <p className="font-medium">{ical.source}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{ical.url}</p>
                    </div>
                    <button
                      className="text-red-600 hover:text-red-800"
                      // Funzione per rimuovere implementata lato client
                    >
                      Rimuovi
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Aggiungi Feed iCal</h3>
            <ICalSyncForm apartmentId={params.id} />
          </div>
        </div>
      </div>
      
      {/* Prenotazioni per questo appartamento */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Prenotazioni</h2>
          <Link 
            href={`/bookings/new?apartmentId=${params.id}`}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
          >
            Aggiungi Prenotazione
          </Link>
        </div>
        
        {bookings.length === 0 ? (
          <p className="text-gray-500">Nessuna prenotazione trovata per questo appartamento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ospite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                      <div className="text-sm text-gray-500">{booking.guestEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.checkIn).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.checkOut).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : booking.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status === 'confirmed' 
                          ? 'Confermata' 
                          : booking.status === 'pending' 
                            ? 'In attesa' 
                            : booking.status === 'cancelled' 
                              ? 'Cancellata' 
                              : 'Completata'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link 
                        href={`/bookings/${booking._id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Dettagli
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
