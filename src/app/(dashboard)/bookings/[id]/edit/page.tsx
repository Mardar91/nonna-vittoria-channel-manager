// src/app/(dashboard)/bookings/[id]/edit/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import BookingModel from '@/models/Booking';
import ApartmentModel from '@/models/Apartment';
import BookingForm from '@/components/BookingForm';
import Link from 'next/link';

export default async function EditBookingPage({ params }: { params: { id: string } }) {
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
  
  // Ottieni tutti gli appartamenti per il form
  const apartments = await ApartmentModel.find({}).sort({ name: 1 });
  const apartmentsData = apartments.map(apartment => apartment.toObject());
  
  // Converti il documento Mongoose in un oggetto plain
  const bookingData = booking.toObject();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifica Prenotazione</h1>
      <BookingForm booking={bookingData} isEdit={true} apartments={apartmentsData} />
    </div>
  );
}
