// src/app/(dashboard)/payments/page.tsx
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import BookingModel, { IBooking } from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';

export default async function PaymentsPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  try {
    // Ottieni tutte le prenotazioni con informazioni di pagamento
    const bookings = await BookingModel.find({
      paymentId: { $exists: true, $ne: null }
    }).sort({ updatedAt: -1 });
    
    // Raggruppa per stato di pagamento
    const pendingPayments = bookings.filter(b => b.paymentStatus === 'pending');
    const paidPayments = bookings.filter(b => b.paymentStatus === 'paid');
    const failedPayments = bookings.filter(b => b.paymentStatus === 'failed');
    
    // Calcola totali
    const totalPaid = paidPayments.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const totalPending = pendingPayments.reduce((sum, booking) => sum + booking.totalPrice, 0);
    
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pagamenti</h1>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Totale Incassato</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">€{totalPaid.toFixed(2)}</dd>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">In Attesa</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">€{totalPending.toFixed(2)}</dd>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Transazioni Recenti</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{paidPayments.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Transazioni Recenti</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <li className="px-4 py-4 sm:px-6">
                <div className="text-center text-gray-500">Nessuna transazione trovata</div>
              </li>
            ) : (
              bookings.slice(0, 10).map((booking) => (
                <li key={booking._id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-blue-600 truncate">{booking.guestName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(booking.checkIn).toLocaleDateString('it-IT')} - 
                        {new Date(booking.checkOut).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-medium text-gray-900">€{booking.totalPrice.toFixed(2)}</p>
                      <p className={`text-sm ${
                        booking.paymentStatus === 'paid' 
                          ? 'text-green-600' 
                          : booking.paymentStatus === 'pending' 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`}>
                        {booking.paymentStatus === 'paid' 
                          ? 'Pagato' 
                          : booking.paymentStatus === 'pending' 
                            ? 'In attesa' 
                            : 'Fallito'}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching payments:', error);
    
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pagamenti</h1>
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 text-center text-gray-500">
            Si è verificato un errore nel caricamento dei pagamenti.
          </div>
        </div>
      </div>
    );
  }
}
