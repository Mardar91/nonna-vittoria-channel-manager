import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db';
import CheckInModel from '@/models/CheckIn'; // Assumi che CheckInModel sia un modello Mongoose
import BookingModel from '@/models/Booking'; // Assumi che BookingModel sia un modello Mongoose
import ApartmentModel from '@/models/Apartment'; // Assumi che ApartmentModel sia un modello Mongoose
import { UserIcon, IdentificationIcon, CalendarIcon, HomeIcon, ClockIcon } from '@heroicons/react/24/outline';
import mongoose from 'mongoose'; // Importa mongoose per Types.ObjectId se i tuoi ID sono ObjectId

// Definisci il tipo per un singolo ospite
interface GuestType {
  isMainGuest: boolean;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F' | string;
  dateOfBirth: Date | string;
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

// Definisci l'interfaccia per il documento CheckIn
interface CheckInDocument {
  _id: mongoose.Types.ObjectId | string; // O solo string se convertito da .lean()
  bookingId: mongoose.Types.ObjectId | string; // O solo string
  apartmentId: mongoose.Types.ObjectId | string; // O solo string
  guests: GuestType[];
  checkInDate: Date | string;
  completedAt?: Date | string | null; // Può essere null se non completato
  completedBy?: 'guest' | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Aggiungi qui altre proprietà del tuo CheckInModel se presenti
  // ad esempio __v?: number; se vuoi includerlo
}

// Opzionale: definisci tipi simili per Booking e Apartment se vuoi maggiore type safety
interface BookingDocument {
  _id: mongoose.Types.ObjectId | string;
  checkIn: Date | string;
  checkOut: Date | string;
  guestEmail: string;
  // ...altre proprietà del booking
}

interface ApartmentDocument {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  // ...altre proprietà dell'appartamento
}


export default async function CheckInDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni i dettagli del check-in specificando il tipo atteso con .lean()
  const checkIn = await CheckInModel.findById(params.id).lean<CheckInDocument | null>();
  
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
  // Ora checkIn.bookingId e checkIn.apartmentId dovrebbero essere riconosciuti
  const booking = await BookingModel.findById(checkIn.bookingId).lean<BookingDocument | null>();
  const apartment = await ApartmentModel.findById(checkIn.apartmentId).lean<ApartmentDocument | null>();
  
  // Funzione per formattare le date
  const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return 'N/A';
    return new Date(dateInput).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatDateTime = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return 'N/A';
    return new Date(dateInput).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Funzione per calcolare l'età
  const calculateAge = (birthDateInput: Date | string | undefined | null): number | string => {
    if (!birthDateInput) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDateInput);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  
  // Funzione per formattare il tipo di documento
  const formatDocumentType = (type: string | undefined | null): string => {
    if (!type) return 'Sconosciuto';
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
          {/* Converto checkIn.bookingId a stringa esplicitamente per href se è ObjectId */}
          <Link 
            href={`/bookings/${String(checkIn.bookingId)}`}
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
              {checkIn.completedBy === 'guest' ? 'Ospite (online)' : (checkIn.completedBy ? `Operatore: ${checkIn.completedBy}` : 'N/A')}
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
              {checkIn.userAgent && (
                <div>
                  <span className="text-gray-500">User Agent:</span> 
                  <span className="text-xs">{checkIn.userAgent.substring(0, 50)}...</span>
                </div>
              )}
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
                      <span className="text-gray-500">Sesso:</span> {guest.sex === 'M' ? 'Maschio' : (guest.sex === 'F' ? 'Femmina' : 'N/D')}
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
                  {formatDateTime(checkIn.completedAt)} da {checkIn.completedBy === 'guest' ? 'ospite' : (checkIn.completedBy || 'N/D')}
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
