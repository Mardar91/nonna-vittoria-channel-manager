import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking'; // Assicurati che IBooking sia esportata correttamente
import ApartmentModel from '@/models/Apartment';
import Link from 'next/link';
import BookingList from '@/components/BookingList'; // Il componente verrà riutilizzato
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assumendo tu abbia Shadcn UI Tabs o simile

// Estendi IBooking per includere apartmentName opzionale
interface IBookingWithApartment extends IBooking {
  apartmentName?: string; // Rendi opzionale nel caso l'appartamento sia stato cancellato
}

export default async function BookingsPage() {
  const session = await getServerSession(); // Recupera la sessione server-side

  // Proteggi la pagina lato server
  if (!session) {
      // Potresti fare un redirect qui o mostrare un messaggio
      // import { redirect } from 'next/navigation';
      // redirect('/api/auth/signin');
      return (
           <div className="p-4 text-center text-red-600">
                Accesso non autorizzato. Effettua il login.
           </div>
      );
  }

  await connectDB(); // Connessione al DB

  let allBookingsWithApartmentInfo: IBookingWithApartment[] = [];
  let fetchError = false;

  try {
    // Ottieni TUTTE le prenotazioni, ordinandole (es. per data di creazione o check-in)
    // Popola direttamente l'appartamento per ottenere il nome in modo efficiente
    const allBookingsFromDB = await BookingModel.find({})
                                          .populate('apartmentId', 'name') // Popola solo il campo 'name' di Apartment
                                          .sort({ checkIn: -1 }); // Ordina per check-in più recente

    // Mappa i risultati per formattarli correttamente
    allBookingsWithApartmentInfo = allBookingsFromDB.map(booking => {
      const bookingObj = booking.toObject() as IBooking & { apartmentId: { _id: string, name: string } | null }; // Tipizza il risultato popolato

      return {
        ...bookingObj,
        _id: booking._id.toString(), // Assicura che _id sia una stringa
        apartmentId: bookingObj.apartmentId?._id?.toString() || 'N/A', // ID stringa o N/A
        apartmentName: bookingObj.apartmentId?.name || 'Appartamento Eliminato', // Nome o placeholder
        // Assicurati che le date siano oggetti Date (Mongoose a volte le ritorna come stringhe in toObject)
        checkIn: new Date(bookingObj.checkIn),
        checkOut: new Date(bookingObj.checkOut),
        createdAt: new Date(bookingObj.createdAt),
        updatedAt: new Date(bookingObj.updatedAt),
      } as IBookingWithApartment; // Cast finale all'interfaccia estesa
    });

  } catch (error) {
    console.error("Errore nel recupero delle prenotazioni:", error);
    fetchError = true;
  }

  // Filtra le prenotazioni per le diverse sezioni
  const confirmedAndCompletedBookings = allBookingsWithApartmentInfo.filter(
    b => b.status === 'confirmed' || b.status === 'completed'
  );

  // Le "Richieste" sono quelle 'pending' (indipendentemente da paymentStatus)
  // e quelle 'cancelled' O con paymentStatus 'failed' (che potrebbero essere state pending)
  const bookingRequests = allBookingsWithApartmentInfo.filter(
    b => b.status === 'pending' || b.status === 'cancelled' || b.paymentStatus === 'failed'
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Ordina richieste per creazione

  // --- Renderizza la pagina ---
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Gestione Prenotazioni</h1>
        <Link
          href="/bookings/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium shadow-sm"
        >
          Crea Nuova Prenotazione
        </Link>
      </div>

      {fetchError ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Errore!</strong>
          <span className="block sm:inline"> Si è verificato un problema nel caricamento delle prenotazioni. Riprova più tardi.</span>
        </div>
      ) : (
        // Usa i Tabs per separare le viste
        <Tabs defaultValue="confirmed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="confirmed">Prenotazioni Attive ({confirmedAndCompletedBookings.length})</TabsTrigger>
            <TabsTrigger value="requests">Richieste / Annullate ({bookingRequests.length})</TabsTrigger>
          </TabsList>

          {/* Tab Contenuto: Prenotazioni Confermate/Completate */}
          <TabsContent value="confirmed" className="mt-4">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-700">Prenotazioni Confermate e Completate</h2>
                <p className="text-sm text-gray-500">Prenotazioni con pagamento ricevuto che bloccano o hanno bloccato il calendario.</p>
              </div>
              {confirmedAndCompletedBookings.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nessuna prenotazione confermata o completata trovata.
                </div>
              ) : (
                // Passa i dati JSON serializzabili al componente client
                <BookingList bookings={JSON.parse(JSON.stringify(confirmedAndCompletedBookings))} />
              )}
            </div>
          </TabsContent>

          {/* Tab Contenuto: Richieste di Prenotazione */}
          <TabsContent value="requests" className="mt-4">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-700">Richieste di Prenotazione e Annullate</h2>
                 <p className="text-sm text-gray-500">Include prenotazioni in attesa di pagamento, con pagamento fallito/scaduto, o cancellate.</p>
              </div>
              {bookingRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nessuna richiesta di prenotazione o cancellazione trovata.
                </div>
              ) : (
                 // Passa i dati JSON serializzabili al componente client
                <BookingList bookings={JSON.parse(JSON.stringify(bookingRequests))} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
