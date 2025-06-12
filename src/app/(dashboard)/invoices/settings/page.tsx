'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  CogIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface InvoiceSettings {
  _id: string;
  groupId: string;
  name: string;
  apartmentIds: string[];
  businessName: string;
  businessAddress: string;
  businessCity: string;
  businessZip: string;
  businessProvince: string;
  businessCountry: string;
  businessVat?: string;
  businessTaxCode: string;
  businessEmail?: string;
  businessPhone?: string;
  activityType: 'business' | 'tourist_rental';
  vatRate?: number;
  vatIncluded?: boolean;
  withholdingTaxInfo?: {
    showInfo: boolean;
    defaultText: string;
  };
  numberingFormat: string;
  numberingPrefix?: string;
  lastInvoiceNumber: number;
  lastInvoiceYear: number;
  resetNumberingYearly: boolean;
  platformSettings: {
    platform: string;
    emitInvoice: boolean;
    invoiceType: 'standard' | 'withholding';
    defaultWithholdingText?: string;
  }[];
  autoGenerateOnCheckout: boolean;
  autoGenerateOnPayment: boolean;
  sendEmailToGuest: boolean;
}

interface Apartment {
  _id: string;
  name: string;
}

const DEFAULT_PLATFORMS = [
  { name: 'Booking.com', withholding: true },
  { name: 'Airbnb', withholding: true },
  { name: 'Expedia', withholding: true },
  { name: 'Direct', withholding: false },
  { name: 'VRBO', withholding: true },
  { name: 'Hotels.com', withholding: true },
];

const NUMBERING_FORMATS = [
  { value: '{{year}}/{{number}}', label: '2024/001' },
  { value: '{{number}}/{{year}}', label: '001/2024' },
  { value: '{{prefix}}-{{year}}-{{number}}', label: 'RIC-2024-001' },
  { value: '{{prefix}}{{year}}{{number}}', label: 'RIC2024001' },
  { value: '{{number}}', label: '001' },
];

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<InvoiceSettings[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<InvoiceSettings>>({
    groupId: '',
    name: '',
    apartmentIds: [],
    businessName: '',
    businessAddress: '',
    businessCity: '',
    businessZip: '',
    businessProvince: '',
    businessCountry: 'Italia',
    businessTaxCode: '',
    activityType: 'tourist_rental',
    vatRate: 22,
    vatIncluded: true,
    withholdingTaxInfo: {
      showInfo: true,
      defaultText: 'Cedolare secca (21%) assolta dalla piattaforma in qualità di sostituto d&apos;imposta ai sensi dell&apos;art. 4, comma 1, lett. c) del DL 50/2017.',
    },
    numberingFormat: '{{year}}/{{number}}',
    resetNumberingYearly: true,
    platformSettings: DEFAULT_PLATFORMS.map(p => ({
      platform: p.name,
      emitInvoice: true,
      invoiceType: p.withholding ? 'withholding' : 'standard',
      defaultWithholdingText: p.withholding ? 'Cedolare secca (21%) assolta dalla piattaforma' : undefined,
    })),
    autoGenerateOnCheckout: true,
    autoGenerateOnPayment: false,
    sendEmailToGuest: false,
  });

  useEffect(() => {
    fetchSettings();
    fetchApartments();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/invoices/settings');
      if (!response.ok) throw new Error('Errore nel caricamento delle impostazioni');
      
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      toast.error('Errore nel caricamento delle impostazioni');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApartments = async () => {
    try {
      const response = await fetch('/api/apartments');
      if (!response.ok) throw new Error('Errore nel caricamento degli appartamenti');
      
      const data = await response.json();
      setApartments(data);
    } catch (error) {
      console.error('Errore nel caricamento degli appartamenti:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId 
        ? `/api/invoices/settings/${editingId}`
        : '/api/invoices/settings';
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Genera un groupId univoco se è una nuova configurazione
      if (!editingId && !formData.groupId) {
        formData.groupId = `group_${Date.now()}`;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Errore nel salvataggio');
      
      toast.success(editingId ? 'Impostazioni aggiornate' : 'Gruppo creato con successo');
      
      setEditingId(null);
      setShowNewForm(false);
      resetForm();
      fetchSettings();
    } catch (error) {
      toast.error('Errore nel salvataggio delle impostazioni');
      console.error(error);
    }
  };

  const handleEdit = (setting: InvoiceSettings) => {
    setFormData(setting);
    setEditingId(setting._id);
    setShowNewForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo gruppo di fatturazione?')) return;
    
    try {
      const response = await fetch(`/api/invoices/settings/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Errore nell&apos;eliminazione');
      
      toast.success('Gruppo eliminato con successo');
      fetchSettings();
    } catch (error) {
      toast.error('Errore nell&apos;eliminazione del gruppo');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      groupId: '',
      name: '',
      apartmentIds: [],
      businessName: '',
      businessAddress: '',
      businessCity: '',
      businessZip: '',
      businessProvince: '',
      businessCountry: 'Italia',
      businessTaxCode: '',
      activityType: 'tourist_rental',
      vatRate: 22,
      vatIncluded: true,
      withholdingTaxInfo: {
        showInfo: true,
        defaultText: 'Cedolare secca (21%) assolta dalla piattaforma in qualità di sostituto d&apos;imposta ai sensi dell&apos;art. 4, comma 1, lett. c) del DL 50/2017.',
      },
      numberingFormat: '{{year}}/{{number}}',
      resetNumberingYearly: true,
      platformSettings: DEFAULT_PLATFORMS.map(p => ({
        platform: p.name,
        emitInvoice: true,
        invoiceType: p.withholding ? 'withholding' : 'standard',
        defaultWithholdingText: p.withholding ? 'Cedolare secca (21%) assolta dalla piattaforma' : undefined,
      })),
      autoGenerateOnCheckout: true,
      autoGenerateOnPayment: false,
      sendEmailToGuest: false,
    });
  };

  const updatePlatformSetting = (index: number, field: string, value: any) => {
    const newPlatformSettings = [...(formData.platformSettings || [])];
    newPlatformSettings[index] = {
      ...newPlatformSettings[index],
      [field]: value,
    };
    setFormData({ ...formData, platformSettings: newPlatformSettings });
  };

  const addPlatform = () => {
    const newPlatform = {
      platform: '',
      emitInvoice: true,
      invoiceType: 'standard' as const,
    };
    setFormData({
      ...formData,
      platformSettings: [...(formData.platformSettings || []), newPlatform],
    });
  };

  const removePlatform = (index: number) => {
    const newPlatformSettings = formData.platformSettings?.filter((_, i) => i !== index);
    setFormData({ ...formData, platformSettings: newPlatformSettings });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Impostazioni Fatturazione</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configura gruppi di appartamenti con diverse impostazioni di fatturazione
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => {
              setShowNewForm(true);
              resetForm();
              setEditingId(null);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuovo Gruppo
          </button>
        )}
      </div>

      {/* Form nuovo/modifica gruppo */}
      {showNewForm && (
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              {/* Informazioni base */}
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {editingId ? 'Modifica Gruppo' : 'Nuovo Gruppo di Fatturazione'}
                </h3>
                
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Nome Gruppo
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="es. Appartamenti Centro"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo Attività
                    </label>
                    <select
                      value={formData.activityType || 'tourist_rental'}
                      onChange={(e) => setFormData({ ...formData, activityType: e.target.value as 'business' | 'tourist_rental' })}
                      className="mt-1 block w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="tourist_rental">Locazione Turistica (Cedolare Secca)</option>
                      <option value="business">Attività Imprenditoriale (con IVA)</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Appartamenti nel Gruppo
                    </label>
                    <div className="mt-2 space-y-2">
                      {apartments.map((apartment) => (
                        <label key={apartment._id} className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={formData.apartmentIds?.includes(apartment._id) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  apartmentIds: [...(formData.apartmentIds || []), apartment._id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  apartmentIds: formData.apartmentIds?.filter(id => id !== apartment._id),
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{apartment.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dati aziendali */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Dati Intestatario</h3>
                
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Ragione Sociale / Nome
                    </label>
                    <input
                      type="text"
                      value={formData.businessName || ''}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Codice Fiscale
                    </label>
                    <input
                      type="text"
                      value={formData.businessTaxCode || ''}
                      onChange={(e) => setFormData({ ...formData, businessTaxCode: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  {formData.activityType === 'business' && (
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Partita IVA
                      </label>
                      <input
                        type="text"
                        value={formData.businessVat || ''}
                        onChange={(e) => setFormData({ ...formData, businessVat: e.target.value })}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                  
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Indirizzo
                    </label>
                    <input
                      type="text"
                      value={formData.businessAddress || ''}
                      onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Città
                    </label>
                    <input
                      type="text"
                      value={formData.businessCity || ''}
                      onChange={(e) => setFormData({ ...formData, businessCity: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      CAP
                    </label>
                    <input
                      type="text"
                      value={formData.businessZip || ''}
                      onChange={(e) => setFormData({ ...formData, businessZip: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={formData.businessProvince || ''}
                      onChange={(e) => setFormData({ ...formData, businessProvince: e.target.value })}
                      required
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.businessEmail || ''}
                      onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={formData.businessPhone || ''}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Impostazioni IVA (solo per business) */}
              {formData.activityType === 'business' && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900">Impostazioni IVA</h3>
                  
                  <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Aliquota IVA (%)
                      </label>
                      <input
                        type="number"
                        value={formData.vatRate || 22}
                        onChange={(e) => setFormData({ ...formData, vatRate: parseInt(e.target.value) })}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="sm:col-span-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Prezzi
                      </label>
                      <div className="mt-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.vatIncluded || false}
                            onChange={(e) => setFormData({ ...formData, vatIncluded: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            I prezzi includono già l&apos;IVA
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Numerazione */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Numerazione Ricevute</h3>
                
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Formato Numerazione
                    </label>
                    <select
                      value={formData.numberingFormat || '{{year}}/{{number}}'}
                      onChange={(e) => setFormData({ ...formData, numberingFormat: e.target.value })}
                      className="mt-1 block w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      {NUMBERING_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.numberingFormat?.includes('{{prefix}}') && (
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Prefisso
                      </label>
                      <input
                        type="text"
                        value={formData.numberingPrefix || ''}
                        onChange={(e) => setFormData({ ...formData, numberingPrefix: e.target.value })}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="es. RIC"
                      />
                    </div>
                  )}
                  
                  <div className="sm:col-span-6">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.resetNumberingYearly || false}
                        onChange={(e) => setFormData({ ...formData, resetNumberingYearly: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Resetta numerazione ogni anno
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Piattaforme */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Gestione Piattaforme</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configura come gestire le ricevute per ogni piattaforma
                </p>
                
                <div className="mt-6 space-y-4">
                  {formData.platformSettings?.map((platform, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Piattaforma
                          </label>
                          <input
                            type="text"
                            value={platform.platform}
                            onChange={(e) => updatePlatformSetting(index, 'platform', e.target.value)}
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Tipo Ricevuta
                          </label>
                          <select
                            value={platform.invoiceType}
                            onChange={(e) => updatePlatformSetting(index, 'invoiceType', e.target.value)}
                            className="mt-1 block w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm border-gray-300 rounded-md"
                          >
                            <option value="standard">Standard</option>
                            <option value="withholding">Con Cedolare Secca</option>
                          </select>
                        </div>
                        
                        <div className="sm:col-span-1 flex items-end">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={platform.emitInvoice}
                              onChange={(e) => updatePlatformSetting(index, 'emitInvoice', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Emetti</span>
                          </label>
                        </div>
                        
                        <div className="sm:col-span-1 flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removePlatform(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {platform.invoiceType === 'withholding' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Testo Cedolare Secca
                          </label>
                          <textarea
                            value={platform.defaultWithholdingText || ''}
                            onChange={(e) => updatePlatformSetting(index, 'defaultWithholdingText', e.target.value)}
                            rows={2}
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addPlatform}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Aggiungi Piattaforma
                  </button>
                </div>
              </div>

              {/* Automazione */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Automazione</h3>
                
                <div className="mt-6 space-y-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.autoGenerateOnCheckout || false}
                      onChange={(e) => setFormData({ ...formData, autoGenerateOnCheckout: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Genera ricevuta automaticamente al checkout
                    </span>
                  </label>
                  
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.autoGenerateOnPayment || false}
                      onChange={(e) => setFormData({ ...formData, autoGenerateOnPayment: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Genera ricevuta quando il pagamento è confermato
                    </span>
                  </label>
                  
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.sendEmailToGuest || false}
                      onChange={(e) => setFormData({ ...formData, sendEmailToGuest: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Invia ricevuta via email all&apos;ospite automaticamente
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingId ? 'Aggiorna' : 'Crea Gruppo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista gruppi esistenti */}
      {!showNewForm && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {loading ? (
              <li className="px-6 py-4 text-center text-sm text-gray-500">
                Caricamento...
              </li>
            ) : settings.length === 0 ? (
              <li className="px-6 py-4 text-center text-sm text-gray-500">
                Nessun gruppo di fatturazione configurato
              </li>
            ) : (
              settings.map((setting) => (
                <li key={setting._id}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BuildingOffice2Icon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {setting.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {setting.businessName} - {setting.activityType === 'business' ? 'Attività Imprenditoriale' : 'Locazione Turistica'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {setting.apartmentIds.length} appartamenti - 
                          Ultimo numero: {setting.lastInvoiceNumber}/{setting.lastInvoiceYear}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(setting)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(setting._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
