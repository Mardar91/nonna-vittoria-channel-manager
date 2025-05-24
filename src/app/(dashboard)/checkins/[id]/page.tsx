import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import { UserIcon, IdentificationIcon, CalendarIcon, HomeIcon, ClockIcon } from '@heroicons/react/24/outline';

// Definisci il tipo per un singolo ospite
interface GuestType {
  isMainGuest: boolean;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F' | string; // Puoi essere più specifico se conosci tutti i valori possibili
  dateOfBirth: Date | string; // Mongoose potrebbe restituire stringa, new Date() la gestisce
  placeOfBirth: string;
  provinceOfBirth?: string;
  countryOfBirth: string;
  citizenship: string;
  documentType?: string;
  documentNumber?: string;
  documentIssuePlace?: string;
  documentIssueProvince?: string;
  documentIssueCountry?: string;
}

// Interfaccia per il documento CheckIn (opzionale, ma buona pratica per il futuro)
// Questo aiuta a tipizzare 'checkIn' stesso se lo desideri
// interface CheckInDocument {
//   _id: string; // o mongoose.Types.ObjectId
//   bookingId: string; // o mongoose.Types.ObjectId
//   apartmentId: string; // o mongoose.Types.ObjectId
//   guests: GuestType[];
//   checkInDate: Date | string;
//   completedAt?: Date | string;
//   completedBy?: string;
//   ipAddress?: string;
//   userAgent?: string;
//   notes?: string;
//   createdAt?: Date | string;
//   updatedAt?: Date | string;
//   // Aggiungi altre proprietà del CheckInModel se necessario
// }


export default async function CheckInDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni i dettagli del check-in
  // Idealmente, anche CheckInModel.findById dovrebbe restituire un tipo definito
  // const checkIn = await CheckInModel.findById(params.id).lean<CheckInDocument | null>(); 
  // Se usi .lean() con un tipo, assicurati che CheckInDocument sia corretto.
  // Per ora, lasciamo che TypeScript inferisca 'checkIn' ma tipizziamo 'guest'
  const checkIn = await CheckInModel.findById(params.id).lean(); // .lean() è buono per le prestazioni se non modifichi il doc
  
  if (!checkIn) {
    return (
      <div className="text-center p-12">
        <h1 className="text-2xl font-bold text-red-600">Check-in non trovato</h1>
        <Link href="/checkins" className="mt-4 inline-block text-blue-600 hover:underline">
          Torna ai check-ins
        </Link>
      </div>
    );
  }
  
  // Ottieni informazioni correlate
  const booking = await BookingModel.findById(checkIn.bookingId).lean();
  const apartment = await ApartmentModel.findById(checkIn.apartmentId).lean();
  
  // Funzione per formattare le date
  const formatDate = (date: Date | string) => { // Accetta Date o string per flessibilità
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatDateTime = (date: Date | string) => { // Accetta Date o string
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Funzione per calcolare l'età
  const calculateAge = (birthDate: Date | string) => { // Accetta Date o string
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Funzione per formattare il tipo di documento
  const formatDocumentType = (type: string) => {
    const types: Record<string, string> = {
      'identity_card': 'Carta d\'Identità',
      'passport': 'Passaporto',
      'driving_license': 'Patente di Guida',
      'other': 'Altro'
    };
    return types[type] || type;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Dettagli Check-in
        </h1>
        <div className="flex space-x-4">
          <Link 
            href={`/bookings/${checkIn.bookingId}`}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Vedi Prenotazione
          </Link>
          <Link 
            href="/checkins"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Torna alla Lista
          </Link>
        </div>
      </div>
      
      {/* Informazioni generali */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <HomeIcon className="h-5 w-5 mr-2 text-gray-500" />
          Informazioni Check-in
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Appartamento</p>
            <p className="mt-1 text-lg">{apartment?.name || 'Sconosciuto'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Data Check-in</p>
            <p className="mt-1 text-lg">{formatDateTime(checkIn.checkInDate)}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Completato il</p>
            <p className="mt-1 text-lg">
              {checkIn.completedAt ? formatDateTime(checkIn.completedAt) : 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Completato da</p>
            <p className="mt-1 text-lg">
              {checkIn.completedBy === 'guest' ? 'Ospite (online)' : `Operatore: ${checkIn.completedBy}`}
            </p>
          </div>
          
          {booking && (
            <>
              <div>
                <p className="text-sm font-medium text-gray-500">Periodo Soggiorno</p>
                <p className="mt-1">
                  {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Email Prenotazione</p>
                <p className="mt-1">{booking.guestEmail}</p>
              </div>
            </>
          )}
        </div>
        
        {/* Metadati tecnici */}
        {checkIn.ipAddress && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Informazioni Tecniche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">IP Address:</span> {checkIn.ipAddress}
              </div>
              <div>
                <span className="text-gray-500">User Agent:</span> 
                <span className="text-xs">{checkIn.userAgent?.substring(0, 50)}...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Lista ospiti */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
          Ospiti Registrati ({checkIn.guests.length})
        </h2>
        
        <div className="space-y-4">
          {/* MODIFICA CHIAVE QUI SOTTO */}
          {checkIn.guests.map((guest: GuestType, index: number) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg ${
                guest.isMainGuest ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center mb-2">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                    <h3 className="font-medium">
                      {guest.firstName} {guest.lastName}
                      {guest.isMainGuest && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          Ospite principale
                        </span>
                      )}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Sesso:</span> {guest.sex === 'M' ? 'Maschio' : 'Femmina'}
                    </div>
                    <div>
                      <span className="text-gray-500">Età:</span> {calculateAge(guest.dateOfBirth)} anni
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Data di nascita:</span> {formatDate(guest.dateOfBirth)}
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Luogo di nascita:</span> {guest.placeOfBirth}
                      {guest.provinceOfBirth && ` (${guest.provinceOfBirth})`}, {guest.countryOfBirth}
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Cittadinanza:</span> {guest.citizenship}
                    </div>
                  </div>
                </div>
                
                {guest.isMainGuest && guest.documentType && (
                  <div>
                    <div className="flex items-center mb-2">
                      <IdentificationIcon className="h-5 w-5 mr-2 text-gray-500" />
                      <h4 className="font-medium">Documento</h4>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Tipo:</span> {formatDocumentType(guest.documentType)}
                      </div>
                      {guest.documentNumber && (
                        <div>
                          <span className="text-gray-500">Numero:</span> {guest.documentNumber}
                        </div>
                      )}
                      {guest.documentIssuePlace && (
                         <div>
                           <span className="text-gray-500">Rilasciato a:</span> {guest.documentIssuePlace}
                           {guest.documentIssueProvince && ` (${guest.documentIssueProvince})`}
                           {guest.documentIssueCountry && `, ${guest.documentIssueCountry}`}
                         </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Note */}
      {checkIn.notes && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Note</h2>
          <p className="text-gray-700 whitespace-pre-line">{checkIn.notes}</p>
        </div>
      )}
      
      {/* Timeline */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
          Timeline
        </h2>
        
        <div className="space-y-4">
          {checkIn.createdAt && (
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Check-in creato</p>
                <p className="text-sm text-gray-500">
                  {formatDateTime(checkIn.createdAt)}
                </p>
              </div>
            </div>
          )}
          
          {checkIn.completedAt && (
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Check-in completato</p>
                <p className="text-sm text-gray-500">
                  {formatDateTime(checkIn.completedAt)} da {checkIn.completedBy === 'guest' ? 'ospite' : checkIn.completedBy}
                </p>
              </div>
            </div>
          )}
          
          {checkIn.updatedAt && checkIn.createdAt && new Date(checkIn.updatedAt).getTime() !== new Date(checkIn.createdAt).getTime() && (
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Ultima modifica</p>
                <p className="text-sm text-gray-500">
                  {formatDateTime(checkIn.updatedAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
