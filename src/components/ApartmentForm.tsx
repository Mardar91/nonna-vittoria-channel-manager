// src/components/ApartmentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { IApartment } from '@/models/Apartment';

interface ApartmentFormProps {
  apartment?: IApartment;
  isEdit?: boolean;
}

export default function ApartmentForm({ apartment, isEdit = false }: ApartmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<IApartment>>({
    name: '',
    description: '',
    address: '',
    price: 0,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    images: [],
    amenities: [],
    icalUrls: [],
  });

  // Popola il form se stiamo modificando un appartamento esistente
  useEffect(() => {
    if (apartment && isEdit) {
      setFormData({
        name: apartment.name,
        description: apartment.description,
        address: apartment.address,
        price: apartment.price,
        bedrooms: apartment.bedrooms,
        bathrooms: apartment.bathrooms,
        maxGuests: apartment.maxGuests,
        images: apartment.images || [],
        amenities: apartment.amenities || [],
        icalUrls: apartment.icalUrls || [],
      });
    }
  }, [apartment, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      // Aggiungi l'amenity se selezionata
      setFormData({
        ...formData,
        amenities: [...(formData.amenities || []), value],
      });
    } else {
      // Rimuovi l'amenity se deselezionata
      setFormData({
        ...formData,
        amenities: (formData.amenities || []).filter(amenity => amenity !== value),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/apartments/${apartment?._id}` : '/api/apartments';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore');
      }

      const data = await response.json();
      
      toast.success(isEdit ? 'Appartamento aggiornato con successo!' : 'Appartamento creato con successo!');
      router.push(`/apartments/${data._id}`);
      router.refresh();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error((error as Error).message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  // Lista predefinita di amenità comuni
  const commonAmenities = [
    'Wi-Fi',
    'Aria Condizionata',
    'Riscaldamento',
    'Cucina',
    'Lavatrice',
    'TV',
    'Parcheggio',
    'Ascensore',
    'Balcone',
    'Terrazza',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Informazioni Base</h3>
            <p className="mt-1 text-sm text-gray-500">
              Informazioni generali sull'appartamento.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descrizione
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Indirizzo
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Prezzo (€ per notte)
                </label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700">
                  Ospiti Massimi
                </label>
                <input
                  type="number"
                  name="maxGuests"
                  id="maxGuests"
                  value={formData.maxGuests}
                  onChange={handleChange}
                  min="1"
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">
                  Camere da Letto
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  id="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  min="0"
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">
                  Bagni
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  id="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Servizi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seleziona i servizi disponibili nell'appartamento.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {commonAmenities.map((amenity) => (
                <div key={amenity} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={`amenity-${amenity}`}
                      name="amenities"
                      type="checkbox"
                      value={amenity}
                      checked={(formData.amenities || []).includes(amenity)}
                      onChange={handleAmenitiesChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`amenity-${amenity}`} className="font-medium text-gray-700">
                      {amenity}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Salvataggio...' : isEdit ? 'Aggiorna' : 'Crea'}
        </button>
      </div>
    </form>
  );
}
