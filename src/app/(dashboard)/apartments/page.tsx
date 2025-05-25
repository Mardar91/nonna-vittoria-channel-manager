import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/db';
import ApartmentModel from '@/models/Apartment';
import Link from 'next/link';
import ApartmentCardItem from '@/components/ApartmentCardItem';

export default async function ApartmentsPage() {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }
  
  await connectDB();
  
  // Ottieni tutti gli appartamenti
  const apartments = await ApartmentModel.find({}).sort({ createdAt: -1 });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appartamenti</h1>
        <Link 
          href="/apartments/new" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nuovo Appartamento
        </Link>
      </div>
      
      {apartments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Nessun appartamento trovato. Crea il tuo primo appartamento!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apartments.map((apt) => {
            // Ensure all necessary props are passed and apt is a plain object
            const apartmentData = {
              _id: apt._id.toString(), // Convert ObjectId to string
              name: apt.name,
              address: apt.address,
              price: apt.price,
              priceType: apt.priceType,
              baseGuests: apt.baseGuests,
              maxGuests: apt.maxGuests,
              bedrooms: apt.bedrooms,
              // Ensure any other fields expected by ApartmentCardItemProps are included
              // For example, if amenities or description were part of the card, they'd be here.
            };
            return <ApartmentCardItem key={apartmentData._id} apartment={apartmentData} />;
          })}
        </div>
      )}
    </div>
  );
}
