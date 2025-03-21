// src/app/(dashboard)/bookings/new/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import BookingForm from '@/components/BookingForm';

export default async function NewBookingPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  await connectDB();
  
  // Ottieni tutti gli appartamenti per il form
  const apartments = await ApartmentModel.find({}).sort({ name: 1 });
  const apartmentsData = apartments.map(apartment => apartment.toObject());
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuova Prenotazione</h1>
      <BookingForm apartments={apartmentsData} />
    </div>
  );
}
