// src/app/(dashboard)/apartments/[id]/edit/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import ApartmentForm from '@/components/ApartmentForm';
import Link from 'next/link';

export default async function EditApartmentPage({ params }: { params: { id: string } }) {
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
  
  // Converti il documento Mongoose in un oggetto plain
  const apartmentData = apartment.toObject();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifica Appartamento</h1>
      <ApartmentForm apartment={apartmentData} isEdit={true} />
    </div>
  );
}
