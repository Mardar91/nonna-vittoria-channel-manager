'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate?: number;
  vatAmount?: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    province?: string;
    country?: string;
    vatNumber?: string;
    taxCode?: string;
  };
  issuer: {
    businessName: string;
    vatNumber?: string;
  };
  stayDetails: {
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    apartmentName: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  vatAmount?: number;
  total: number;
  status: string;
  paymentInfo: {
    method: string;
    status: string;
    paidAmount: number;
    paidDate?: string;
    notes?: string;
  };
  documentType: string;
  activityType: 'business' | 'tourist_rental';
  notes?: string;
  internalNotes?: string;
  isLocked: boolean;
}

interface InvoiceSettings {
  activityType: 'business' | 'tourist_rental';
  vatRate: number;
  vatIncluded: boolean;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Contanti' },
  { value: 'bank_transfer', label: 'Bonifico' },
  { value: 'credit_card', label: 'Carta di Credito' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'platform', label: 'Piattaforma' },
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'In attesa' },
  { value: 'paid', label: 'Pagato' },
  { value: 'partial', label: 'Parziale' },
  { value: 'refunded', label: 'Rimborsato' },
];

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  
  // Form state
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    province: '',
    country: 'Italia',
    vatNumber: '',
    taxCode: '',
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  const [paymentInfo, setPaymentInfo] = useState({
    method: 'cash',
    status: 'pending',
    paidAmount: 0,
    paidDate: '',
    notes: '',
  });
  
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) throw new Error('Errore nel caricamento della ricevuta');
      
      const data = await response.json();
      
      // Verifica che la ricevuta sia modificabile
      if (data.isLocked) {
        toast.error('Questa ricevuta è bloccata e non può essere modificata');
        router.push(`/invoices/${params.id}`);
        return;
      }
      
      if (data.status !== 'draft') {
        toast.error('Solo le ricevute in bozza possono essere modificate');
        router.push(`/invoices/${params.id}`);
        return;
      }
      
      setInvoice(data);
      
      // Popola i form con i dati esistenti
      setCustomerData(data.customer);
      setItems(data.items);
      setPaymentInfo({
        method: data.paymentInfo.method,
        status: data.paymentInfo.status,
        paidAmount: data.paymentInfo.paidAmount,
        paidDate: data.paymentInfo.paidDate ? format(new Date(data.paymentInfo.paidDate), 'yyyy-MM-dd') : '',
        notes: data.paymentInfo.notes || '',
      });
      setNotes(data.notes || '');
      setInternalNotes(data.internalNotes || '');
      
      // Imposta le settings base
      setSettings({
        activityType: data.activityType,
        vatRate: data.activityType === 'business' ? 22 : 0,
        vatIncluded: true,
      });
      
    } catch (error) {
      toast.error('Errore nel caricamento della ricevuta');
      console.error(error);
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Aggiungi almeno una voce alla ricevuta');
      return;
    }
    
    setSaving(true);
    
    try {
      const payload = {
        customer: customerData,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
        })),
        paymentInfo: {
          ...paymentInfo,
          paidDate: paymentInfo.paidDate || undefined,
        },
        notes,
        internalNotes,
      };
      
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nell\'aggiornamento');
      }
      
      toast.success('Ricevuta aggiornata con successo');
      router.push(`/invoices/${params.id}`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nell\'aggiornamento della ricevuta');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      vatRate: settings?.activityType === 'business' ? settings.vatRate : undefined,
      vatAmount: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    
    // Ricalcola totali
    const item = newItems[index];
    item.totalPrice = item.quantity * item.unitPrice;
    
    if (settings?.activityType === 'business' && item.vatRate) {
      if (settings.vatIncluded) {
        // Prezzo include IVA, scorporala
        const priceWithoutVat = item.totalPrice / (1 + item.vatRate / 100);
        item.vatAmount = item.totalPrice - priceWithoutVat;
      } else {
        // Prezzo non include IVA, calcolala
        item.vatAmount = item.totalPrice * (item.vatRate / 100);
      }
    } else {
      item.vatAmount = 0;
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let vatAmount = 0;
    
    items.forEach(item => {
      subtotal += item.totalPrice;
      vatAmount += item.vatAmount || 0;
    });
    
    const total = settings?.activityType === 'business' && !settings.vatIncluded
      ? subtotal + vatAmount
      : subtotal;
    
    return { subtotal, vatAmount, total };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ricevuta non trovata</p>
        <Link href="/invoices" className="mt-4 text-blue-600 hover:text-blue-500">
          Torna alla lista
        </Link>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/invoices/${invoice._id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Torna al dettaglio
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            Modifica Ricevuta {invoice.invoiceNumber}
          </h1>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Stai modificando una ricevuta in bozza. Le modifiche saranno salvate ma la ricevuta 
              rimarrà in bozza fino a quando non verrà bloccata.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informazioni ricevuta (read-only) */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informazioni Ricevuta
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Numero</p>
                <p className="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data</p>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo Attività</p>
                <p className="mt-1 text-sm text-gray-900">
                  {invoice.activityType === 'business' ? 'Imprenditoriale (con IVA)' : 'Locazione Turistica'}
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700">Dettagli Soggiorno</h4>
              <p className="mt-1 text-sm text-gray-600">
                {invoice.stayDetails.apartmentName} • 
                {format(new Date(invoice.stayDetails.checkIn), 'dd/MM/yyyy')} - 
                {format(new Date(invoice.stayDetails.checkOut), 'dd/MM/yyyy')} • 
                {invoice.stayDetails.nights} notti • 
                {invoice.stayDetails.guests} ospiti
              </p>
            </div>
          </div>
        </div>

        {/* Dati Cliente */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Dati Cliente
            </h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Nome / Ragione Sociale
                </label>
                <input
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
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
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  required
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={customerData.phone || ''}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Codice Fiscale
                </label>
                <input
                  type="text"
                  value={customerData.taxCode || ''}
                  onChange={(e) => setCustomerData({ ...customerData, taxCode: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              {invoice.activityType === 'business' && (
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Partita IVA
                  </label>
                  <input
                    type="text"
                    value={customerData.vatNumber || ''}
                    onChange={(e) => setCustomerData({ ...customerData, vatNumber: e.target.value })}
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
                  value={customerData.address || ''}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Città
                </label>
                <input
                  type="text"
                  value={customerData.city || ''}
                  onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  CAP
                </label>
                <input
                  type="text"
                  value={customerData.zip || ''}
                  onChange={(e) => setCustomerData({ ...customerData, zip: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Provincia
                </label>
                <input
                  type="text"
                  value={customerData.province || ''}
                  onChange={(e) => setCustomerData({ ...customerData, province: e.target.value })}
                  maxLength={2}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Paese
                </label>
                <input
                  type="text"
                  value={customerData.country || ''}
                  onChange={(e) => setCustomerData({ ...customerData, country: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Voci Ricevuta */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Voci Ricevuta
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Aggiungi Voce
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nessuna voce presente. Aggiungi almeno una voce alla ricevuta.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-5">
                        <label className="block text-sm font-medium text-gray-700">
                          Descrizione
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          required
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Quantità
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                          required
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Prezzo Unit.
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">€</span>
                          </div>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            required
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      
                      {invoice.activityType === 'business' && (
                        <div className="sm:col-span-1">
                          <label className="block text-sm font-medium text-gray-700">
                            IVA %
                          </label>
                          <input
                            type="number"
                            value={item.vatRate || 0}
                            onChange={(e) => updateItem(index, 'vatRate', parseInt(e.target.value) || 0)}
                            min="0"
                            max="100"
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      
                      <div className={invoice.activityType === 'business' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                        <label className="block text-sm font-medium text-gray-700">
                          Totale
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 py-2">
                          €{item.totalPrice.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Riepilogo totali */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between text-sm">
                    <span>Subtotale:</span>
                    <span className="font-medium">€{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {invoice.activityType === 'business' && totals.vatAmount > 0 && (
                    <div className="flex justify-between text-sm mt-2">
                      <span>IVA:</span>
                      <span className="font-medium">€{totals.vatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-medium mt-2 pt-2 border-t border-gray-200">
                    <span>Totale:</span>
                    <span>€{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informazioni Pagamento */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informazioni Pagamento
            </h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Metodo di Pagamento
                </label>
                <select
                  value={paymentInfo.method}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, method: e.target.value })}
                  className="mt-1 block w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm border-gray-300 rounded-md"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Stato Pagamento
                </label>
                <select
                  value={paymentInfo.status}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, status: e.target.value })}
                  className="mt-1 block w-full focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm border-gray-300 rounded-md"
                >
                  {PAYMENT_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Importo Pagato
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    value={paymentInfo.paidAmount}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, paidAmount: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    min="0"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {paymentInfo.status === 'paid' && (
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Data Pagamento
                  </label>
                  <input
                    type="date"
                    value={paymentInfo.paidDate}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, paidDate: e.target.value })}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              )}
              
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Note Pagamento
                </label>
                <input
                  type="text"
                  value={paymentInfo.notes}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, notes: e.target.value })}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="es. Riferimento bonifico, numero transazione..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Note
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Note (visibili sulla ricevuta)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Note aggiuntive da includere nella ricevuta..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Note Interne (non visibili al cliente)
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Note per uso interno..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-end space-x-3">
          <Link
            href={`/invoices/${invoice._id}`}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvataggio...
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Salva Modifiche
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
