'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { IApartment } from '@/models/Apartment';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { XCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

interface ApartmentFormProps {
  apartment?: IApartment;
  isEdit?: boolean;
}

interface SeasonalPrice {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  price: number;
}

export default function ApartmentForm({ apartment, isEdit = false }: ApartmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<IApartment>>({
    name: '',
    description: '',
    address: '',
    price: 0,
    priceType: 'flat',
    baseGuests: 1,
    extraGuestPrice: 0,
    extraGuestPriceType: 'fixed',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    minStay: 1,
    images: [],
    amenities: [],
    icalUrls: [],
    seasonalPrices: [],
  });

  // Stato per gestire l&apos;input del nuovo servizio personalizzato
  const [newAmenity, setNewAmenity] = useState('');
  
  // Stato per gestire i prezzi stagionali
  const [seasonalPrices, setSeasonalPrices] = useState<SeasonalPrice[]>([]);
  const [newSeason, setNewSeason] = useState<SeasonalPrice>({
    id: '',
    name: '',
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    price: 0
  });

  // Popola il form se stiamo modificando un appartamento esistente
  useEffect(() => {
    if (apartment && isEdit) {
      setFormData({
        name: apartment.name,
        description: apartment.description,
        address: apartment.address,
        price: apartment.price,
        priceType: apartment.priceType || 'flat',
        baseGuests: apartment.baseGuests || 1,
        extraGuestPrice: apartment.extraGuestPrice || 0,
        extraGuestPriceType: apartment.extraGuestPriceType || 'fixed',
        bedrooms: apartment.bedrooms,
        bathrooms: apartment.bathrooms,
        maxGuests: apartment.maxGuests,
        minStay: apartment.minStay || 1,
        images: apartment.images || [],
        amenities: apartment.amenities || [],
        icalUrls: apartment.icalUrls || [],
        seasonalPrices: apartment.seasonalPrices || [],
      });
      
      // Inizializza i prezzi stagionali se esistono
      if (apartment.seasonalPrices && apartment.seasonalPrices.length > 0) {
        const formattedSeasons = apartment.seasonalPrices.map((season, index) => ({
          id: index.toString(),
          name: season.name,
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate),
          price: season.price
        }));
        setSeasonalPrices(formattedSeasons);
      }
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
      // Aggiungi l&apos;amenity se selezionata
      setFormData({
        ...formData,
        amenities: [...(formData.amenities || []), value],
      });
    } else {
      // Rimuovi l&apos;amenity se deselezionata
      setFormData({
        ...formData,
        amenities: (formData.amenities || []).filter(amenity => amenity !== value),
      });
    }
  };

  // Funzione per gestire l&apos;aggiunta di un servizio personalizzato
  const handleAddCustomAmenity = () => {
    if (newAmenity.trim()) {
      setFormData({
        ...formData,
        amenities: [...(formData.amenities || []), newAmenity.trim()],
      });
      setNewAmenity('');
      toast.success(`Servizio "${newAmenity}" aggiunto`);
    }
  };

  // Funzione per gestire la rimozione di un servizio
  const handleRemoveAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: (formData.amenities || []).filter(a => a !== amenity),
    });
    toast.success(`Servizio "${amenity}" rimosso`);
  };

  // Gestione dei campi della nuova stagione
  const handleSeasonChange = (field: keyof SeasonalPrice, value: any) => {
    setNewSeason({
      ...newSeason,
      [field]: value
    });
  };

  // Aggiunta di una nuova stagione
  const handleAddSeason = () => {
    if (!newSeason.name) {
      toast.error('Inserisci un nome per la stagione');
      return;
    }

    if (newSeason.startDate >= newSeason.endDate) {
      toast.error('La data di fine deve essere successiva alla data di inizio');
      return;
    }

    if (newSeason.price <= 0) {
      toast.error('Il prezzo deve essere maggiore di zero');
      return;
    }

    const updatedSeasons = [
      ...seasonalPrices,
      {
        ...newSeason,
        id: Date.now().toString() // Genera un ID univoco
      }
    ];

    setSeasonalPrices(updatedSeasons);
    
    // Aggiorna anche il formData con le nuove stagioni
    setFormData({
      ...formData,
      seasonalPrices: updatedSeasons.map(season => ({
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        price: season.price
      }))
    });

    // Reset del form della nuova stagione
    setNewSeason({
      id: '',
      name: '',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      price: 0
    });

    toast.success('Stagione aggiunta con successo');
  };

  // Rimozione di una stagione
  const handleRemoveSeason = (id: string) => {
    const updatedSeasons = seasonalPrices.filter(season => season.id !== id);
    setSeasonalPrices(updatedSeasons);
    
    // Aggiorna anche il formData
    setFormData({
      ...formData,
      seasonalPrices: updatedSeasons.map(season => ({
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        price: season.price
      }))
    });

    toast.success('Stagione rimossa');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Assicurati che i prezzi stagionali siano formattati correttamente
      const finalFormData = {
        ...formData,
        seasonalPrices: seasonalPrices.map(season => ({
          name: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          price: season.price
        }))
      };

      const url = isEdit ? `/api/apartments/${apartment?._id}` : '/api/apartments';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalFormData),
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

  // Formatta una data per la visualizzazione
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
              Informazioni generali sull&apos;appartamento.
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

              {/* Inizio Nuova Sezione Prezzo */}
              <div className="col-span-6">
                <fieldset className="border border-gray-300 rounded-md p-4">
                  <legend className="text-sm font-medium text-gray-700 px-2">Configurazione Prezzo</legend>
                  
                  <div className="mb-4">
                    <label htmlFor="priceType" className="block text-sm font-medium text-gray-700">
                      Tipo di Prezzo
                    </label>
                    <select
                      id="priceType"
                      name="priceType"
                      value={formData.priceType}
                      onChange={handleChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="flat">Prezzo fisso per appartamento</option>
                      <option value="per_person">Prezzo per persona</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                        {formData.priceType === 'per_person' ? 'Prezzo per persona (€)' : 'Prezzo base (€)'}
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
                    
                    {formData.priceType === 'flat' && (
                      <div className="col-span-6 sm:col-span-3">
                        <label htmlFor="baseGuests" className="block text-sm font-medium text-gray-700">
                          Ospiti inclusi nel prezzo base
                        </label>
                        <input
                          type="number"
                          name="baseGuests"
                          id="baseGuests"
                          value={formData.baseGuests}
                          onChange={handleChange}
                          min="1"
                          max={formData.maxGuests || 1}
                          required
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    )}
                  </div>
                  
                  {formData.priceType === 'flat' && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Prezzo per ospiti aggiuntivi</h4>
                      
                      <div className="grid grid-cols-6 gap-6">
                        <div className="col-span-6 sm:col-span-3">
                          <label htmlFor="extraGuestPrice" className="block text-sm font-medium text-gray-700">
                            Sovrapprezzo per ospite aggiuntivo
                          </label>
                          <input
                            type="number"
                            name="extraGuestPrice"
                            id="extraGuestPrice"
                            value={formData.extraGuestPrice}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        
                        <div className="col-span-6 sm:col-span-3">
                          <label htmlFor="extraGuestPriceType" className="block text-sm font-medium text-gray-700">
                            Tipo di sovrapprezzo
                          </label>
                          <select
                            id="extraGuestPriceType"
                            name="extraGuestPriceType"
                            value={formData.extraGuestPriceType}
                            onChange={handleChange}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="fixed">Importo fisso</option>
                            <option value="percentage">Percentuale sul prezzo base</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-500">
                        {formData.extraGuestPriceType === 'fixed' 
                          ? `Ogni ospite oltre i ${formData.baseGuests} pagherà €${formData.extraGuestPrice} in più per notte.`
                          : `Ogni ospite oltre i ${formData.baseGuests} aumenterà il prezzo base del ${formData.extraGuestPrice}% per notte.`}
                      </div>
                    </div>
                  )}
                </fieldset>
              </div>
              {/* Fine Nuova Sezione Prezzo */}

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="minStay" className="block text-sm font-medium text-gray-700">
                  Soggiorno Minimo (notti)
                </label>
                <input
                  type="number"
                  name="minStay"
                  id="minStay"
                  value={formData.minStay}
                  onChange={handleChange}
                  min="1"
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
              Seleziona i servizi disponibili nell&apos;appartamento.
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

            {/* Servizi personalizzati */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Servizi Personalizzati</h4>
              
              {/* Lista dei servizi personalizzati */}
              <div className="space-y-2 mb-4">
                {(formData.amenities || [])
                  .filter(amenity => !commonAmenities.includes(amenity))
                  .map(amenity => (
                    <div key={amenity} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                      <span>{amenity}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
              </div>

              {/* Aggiungi nuovo servizio personalizzato */}
              <div className="flex">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  placeholder="Nuovo servizio personalizzato"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md rounded-r-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAmenity}
                  className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-1" />
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prezzi Stagionali */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Prezzi Stagionali</h3>
            <p className="mt-1 text-sm text-gray-500">
              Definisci prezzi diversi per periodi specifici.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            {/* Lista delle stagioni già definite */}
            {seasonalPrices.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Stagioni Configurate</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prezzo</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {seasonalPrices.map((season) => (
                        <tr key={season.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{season.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(season.startDate)} - {formatDate(season.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{season.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => handleRemoveSeason(season.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Rimuovi
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Form per aggiungere una nuova stagione */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Aggiungi Nuova Stagione</h4>
              
              <div>
                <label htmlFor="seasonName" className="block text-sm font-medium text-gray-700">
                  Nome Stagione
                </label>
                <input
                  type="text"
                  id="seasonName"
                  value={newSeason.name}
                  onChange={(e) => handleSeasonChange('name', e.target.value)}
                  placeholder="es. Estate, Natale, Alta Stagione"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Data Inizio
                  </label>
                  <DatePicker
                    selected={newSeason.startDate}
                    onChange={(date) => handleSeasonChange('startDate', date)}
                    selectsStart
                    startDate={newSeason.startDate}
                    endDate={newSeason.endDate}
                    dateFormat="dd/MM/yyyy"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    Data Fine
                  </label>
                  <DatePicker
                    selected={newSeason.endDate}
                    onChange={(date) => handleSeasonChange('endDate', date)}
                    selectsEnd
                    startDate={newSeason.startDate}
                    endDate={newSeason.endDate}
                    minDate={newSeason.startDate}
                    dateFormat="dd/MM/yyyy"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="seasonPrice" className="block text-sm font-medium text-gray-700">
                  Prezzo (€ per notte)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    id="seasonPrice"
                    value={newSeason.price || ''}
                    onChange={(e) => handleSeasonChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="pl-7 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={handleAddSeason}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-1" />
                  Aggiungi Stagione
                </button>
              </div>
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
