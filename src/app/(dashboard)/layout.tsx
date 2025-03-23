import { ReactNode } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileNavigation from '@/components/MobileNavigation';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  await connectDB();
  // Ottieni tutti gli appartamenti per passarli alla navigazione mobile
  const apartments = await ApartmentModel.find({}).sort({ name: 1 });
  const apartmentsData = apartments.map(apt => ({
    id: apt._id.toString(),
    data: apt.toObject()
  }));

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
        <MobileNavigation apartments={apartmentsData} />
      </div>
    </div>
  );
}
