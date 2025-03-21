// src/app/(dashboard)/apartments/new/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import ApartmentForm from '@/components/ApartmentForm';

export default async function NewApartmentPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuovo Appartamento</h1>
      <ApartmentForm />
    </div>
  );
}
