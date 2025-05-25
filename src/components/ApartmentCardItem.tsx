'use client';

import Link from 'next/link';
import { HomeIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline'; // Using EyeIcon for "Vedi Dettagli"

interface ApartmentCardItemProps {
  apartment: {
    _id: string;
    name: string;
    address: string;
    price: number;
    priceType: 'per_night' | 'per_person';
    baseGuests?: number;
    maxGuests: number;
    bedrooms: number;
  };
}

export default function ApartmentCardItem({ apartment }: ApartmentCardItemProps) {
  const formatPrice = () => {
    if (apartment.priceType === 'per_person') {
      return `€${apartment.price.toFixed(2)} / persona`;
    }
    let priceString = `€${apartment.price.toFixed(2)} / notte`;
    if (apartment.baseGuests) {
      priceString += ` (fino a ${apartment.baseGuests} ospiti)`;
    }
    return priceString;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-all flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{apartment.name}</h3>
          {/* Optional: Could add an icon here like in ApartmentStatusGrid if needed */}
        </div>
        <p className="text-sm text-gray-600 mb-1">{apartment.address}</p>
        <p className="text-sm text-gray-800 font-medium mb-1">{formatPrice()}</p>
        <p className="text-sm text-gray-600 mb-1">Max {apartment.maxGuests} ospiti</p>
        <p className="text-sm text-gray-600">{apartment.bedrooms} camere da letto</p>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex justify-start space-x-3">
          <Link
            href={`/apartments/${apartment._id}`}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <EyeIcon className="h-4 w-4 mr-1.5" />
            Vedi Dettagli
          </Link>
          <Link
            href={`/apartments/${apartment._id}/edit`}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PencilIcon className="h-4 w-4 mr-1.5" />
            Modifica
          </Link>
        </div>
      </div>
    </div>
  );
}
