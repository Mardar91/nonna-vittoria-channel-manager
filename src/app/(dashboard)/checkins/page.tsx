import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import { ClipboardDocumentCheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import mongoose from 'mongoose';

interface GuestInCheckIn {
  isMainGuest: boolean;
  firstName: string;
  lastName: string;
}

interface CheckInDocumentForPage {
  _id: mongoose.Types.ObjectId | string;
  bookingId?: mongoose.Types.ObjectId | string | null; // Reso opzionale/nullabile
  apartmentId?: mongoose.Types.ObjectId | string | null;
  guests: GuestInCheckIn[];
  checkInDate: Date | string;
  completedAt?: Date | string | null;
  completedBy?: 'guest' | string | null;
  status?: string;
  createdAt: Date | string; 
}

interface BookingDocumentForPage {
  _id: mongoose.Types.ObjectId | string;
  checkIn: Date | string;
  checkOut: Date | string;
}

interface ApartmentDocumentForPage {
  _id: mongoose.Types.ObjectId | string;
  name: string;
}


export default async function CheckInsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  const checkIns = await CheckInModel.find({})
    .sort({ createdAt: -1 }) 
    .limit(100)
    .lean<CheckInDocumentForPage[]>(); 
  
  // 1. Pulizia degli ID per le query
  const validBookingIdsForQuery = Array.from(
    new Set(
      checkIns
        .map(c => c.bookingId)
        .filter(id => id != null && mongoose.Types.ObjectId.isValid(String(id)))
        .map(id => String(id))
    )
  );
  const bookings = await BookingModel.find({ _id: { $in: validBookingIdsForQuery } })
    .lean<BookingDocumentForPage[]>(); 
  const bookingMap = new Map(bookings.map(b => [String(b._id), b]));
  
  const validApartmentIdsForQuery = Array.from(
    new Set(
      checkIns
        .map(c => c.apartmentId)
        .filter(id => id != null && mongoose.Types.ObjectId.isValid(String(id)))
        .map(id => String(id))
    )
  );
  const apartments = await ApartmentModel.find({ _id: { $in: validApartmentIdsForQuery } })
    .lean<ApartmentDocumentForPage[]>();
  const apartmentMap = new Map(apartments.map(a => [String(a._id), a]));
  
  // 2. Gestione di bookingId e apartmentId in checkInsWithDetails
  const checkInsWithDetails = checkIns.map(rawCheckIn => {
    const bookingIdAsString = rawCheckIn.bookingId != null ? String(rawCheckIn.bookingId) : null;
    const booking = bookingIdAsString ? bookingMap.get(bookingIdAsString) : undefined;

    const apartmentIdAsString = rawCheckIn.apartmentId != null ? String(rawCheckIn.apartmentId) : null;
    const apartment = apartmentIdAsString ? apartmentMap.get(apartmentIdAsString) : undefined;
    
    const mainGuest = rawCheckIn.guests.find(g => g.isMainGuest);
    
    return {
      id: String(rawCheckIn._id),
      bookingId: bookingIdAsString, // Sarà una stringa ID valida o null
      apartmentName: apartment?.name || 'Sconosciuto',
      mainGuestName: mainGuest ? `${mainGuest.firstName} ${mainGuest.lastName}` : 'N/A',
      guestCount: rawCheckIn.guests.length,
      checkInDate: rawCheckIn.checkInDate,
      completedAt: rawCheckIn.completedAt,
      completedBy: rawCheckIn.completedBy,
      status: rawCheckIn.status,
      bookingCheckIn: booking?.checkIn,
      bookingCheckOut: booking?.checkOut,
    };
  });
  
  const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return 'N/A';
    return new Date(dateInput).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatCompletedBy = (completedBy: 'guest' | string | undefined | null): string => {
    if (!completedBy) return 'N/A';
    return completedBy === 'guest' ? 'Ospite' : 'Manuale';
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <ClipboardDocumentCheckIcon className="h-8 w-8 mr-2 text-blue-600" />
          Check-ins
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Check-in Totali</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {checkInsWithDetails.length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Check-in Online</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {checkInsWithDetails.filter(c => c.completedBy === 'guest').length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Check-in Manuali</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {checkInsWithDetails.filter(c => c.completedBy !== 'guest' && c.completedBy).length}
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Ultimi Check-ins</h2>
        </div>
        
        <div className="overflow-x-auto">
          {checkInsWithDetails.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun check-in</h3>
              <p className="mt-1 text-sm text-gray-500">
                Non ci sono ancora check-in registrati.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ospite Principale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appartamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Ospiti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periodo Soggiorno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checkInsWithDetails.map((checkIn) => (
                  <tr key={checkIn.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(checkIn.checkInDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {checkIn.mainGuestName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {checkIn.apartmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {checkIn.guestCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkIn.bookingCheckIn && checkIn.bookingCheckOut ? (
                        <>
                          {new Date(checkIn.bookingCheckIn).toLocaleDateString('it-IT')} - 
                          {new Date(checkIn.bookingCheckOut).toLocaleDateString('it-IT')}
                        </>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkIn.completedAt ? formatDate(checkIn.completedAt) : 'Non completato'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        checkIn.completedBy === 'guest' 
                          ? 'bg-blue-100 text-blue-800' 
                          : (checkIn.completedBy ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      }`}>
                        {formatCompletedBy(checkIn.completedBy)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/checkins/${checkIn.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <MagnifyingGlassIcon className="h-5 w-5" />
                        </Link>
                        {/* 3. Condizionamento del Link */}
                        {checkIn.bookingId && mongoose.Types.ObjectId.isValid(checkIn.bookingId) ? (
                          <Link
                            href={`/bookings/${checkIn.bookingId}`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Prenotazione
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Pren. N/D</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
