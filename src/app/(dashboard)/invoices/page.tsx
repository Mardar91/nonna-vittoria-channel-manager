'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CogIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { InvoiceFilters, InvoiceStatistics, InvoiceStatus } from '@/types/invoice';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: {
    name: string;
    email: string;
  };
  stayDetails: {
    apartmentName: string;
    checkIn: string;
    checkOut: string;
  };
  total: number;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  paymentInfo: {
    status: 'pending' | 'paid' | 'partial' | 'refunded';
    method: string;
  };
  emailSent: boolean;
  pdfUrl?: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<InvoiceStatistics | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Filtri
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Paginazione
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      // Aggiungi filtri
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      // Aggiungi ricerca
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      // Paginazione
      queryParams.append('page', page.toString());
      queryParams.append('limit', '20');
      
      const response = await fetch(`/api/invoices?${queryParams}`);
      if (!response.ok) throw new Error('Errore nel caricamento delle ricevute');
      
      const data = await response.json();
      setInvoices(data.invoices);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (error) {
      toast.error('Errore nel caricamento delle ricevute');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, searchTerm, setLoading, setInvoices, setTotalPages, setTotalItems]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/invoices/statistics');
      if (!response.ok) throw new Error('Errore nel caricamento delle statistiche');
      
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Errore statistiche:', error);
    }
  }, [setStatistics]);

  const checkPendingBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings?hasPrice=false&status=completed');
      if (!response.ok) throw new Error('Errore nel controllo prenotazioni');
      
      const data = await response.json();
      setPendingCount(data.length);
    } catch (error) {
      console.error('Errore controllo prenotazioni:', error);
    }
  }, [setPendingCount]);

  useEffect(() => {
    fetchInvoices();
    fetchStatistics();
    checkPendingBookings();
  }, [fetchInvoices, fetchStatistics, checkPendingBookings]);

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa ricevuta?')) return;
    
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Errore nell\'eliminazione');
      
      toast.success('Ricevuta eliminata con successo');
      fetchInvoices();
      fetchStatistics();
    } catch (error) {
      toast.error('Errore nell\'eliminazione della ricevuta');
      console.error(error);
    }
  };

  const handleSendEmail = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/send-email`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nell\'invio email');
      
      toast.success('Email inviata con successo');
      fetchInvoices();
    } catch (error) {
      toast.error('Errore nell\'invio dell\'email');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { icon: ClockIcon, class: 'bg-gray-100 text-gray-800' },
      issued: { icon: CheckCircleIcon, class: 'bg-green-100 text-green-800' },
      sent: { icon: EnvelopeIcon, class: 'bg-blue-100 text-blue-800' },
      cancelled: { icon: XCircleIcon, class: 'bg-red-100 text-red-800' },
    };
    
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'draft' ? 'Bozza' : 
         status === 'issued' ? 'Emessa' :
         status === 'sent' ? 'Inviata' : 'Annullata'}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {status === 'pending' ? 'In attesa' :
         status === 'paid' ? 'Pagato' :
         status === 'partial' ? 'Parziale' : 'Rimborsato'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fatturazione</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestisci ricevute e fatture per le prenotazioni
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/invoices/settings"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Impostazioni
          </Link>
          <Link
            href="/invoices/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuova Ricevuta
          </Link>
        </div>
      </div>

      {/* Alert prenotazioni senza prezzo */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Ci sono <span className="font-medium">{pendingCount} prenotazioni</span> in attesa di conferma prezzo.
                <Link href="/invoices/pending" className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-2">
                  Visualizza
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiche */}
      {statistics && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Ricevute Emesse
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statistics.totalIssued}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Totale Fatturato
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      €{statistics.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Incassato
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      €{statistics.paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      In Attesa
                    </dt>
                    <dd className="text-lg font-medium text-yellow-600">
                      €{statistics.pendingAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra di ricerca e filtri */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Cerca per numero, cliente, email..."
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filtri
            </button>
          </div>
        </div>

        {/* Filtri espandibili */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Stato</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: (e.target.value as InvoiceStatus) || undefined })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Tutti</option>
                  <option value="draft">Bozza</option>
                  <option value="issued">Emessa</option>
                  <option value="sent">Inviata</option>
                  <option value="cancelled">Annullata</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Pagamento</label>
                <select
                  value={filters.paymentStatus || ''}
                  onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value || undefined })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Tutti</option>
                  <option value="pending">In attesa</option>
                  <option value="paid">Pagato</option>
                  <option value="partial">Parziale</option>
                  <option value="refunded">Rimborsato</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Periodo</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom as string || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                    className="block w-full border-gray-300 rounded-md shadow-sm"
                  />
                  <input
                    type="date"
                    value={filters.dateTo as string || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                    className="block w-full border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setFilters({});
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Resetta
              </button>
              <button
                onClick={fetchInvoices}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Applica Filtri
              </button>
            </div>
          </div>
        )}

        {/* Tabella ricevute */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appartamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Caricamento...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nessuna ricevuta trovata
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy', { locale: it })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.customer.name}</div>
                      <div className="text-sm text-gray-500">{invoice.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.stayDetails.apartmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{invoice.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(invoice.paymentInfo.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/invoices/${invoice._id}`}
                          className="text-gray-400 hover:text-gray-500"
                          title="Visualizza"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        
                        {invoice.status === 'draft' && (
                          <Link
                            href={`/invoices/${invoice._id}/edit`}
                            className="text-gray-400 hover:text-gray-500"
                            title="Modifica"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        )}
                        
                        {invoice.pdfUrl && (
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-500"
                            title="Scarica PDF"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </a>
                        )}
                        
                        {!invoice.emailSent && invoice.status === 'issued' && (
                          <button
                            onClick={() => handleSendEmail(invoice._id)}
                            className="text-gray-400 hover:text-gray-500"
                            title="Invia Email"
                          >
                            <EnvelopeIcon className="h-4 w-4" />
                          </button>
                        )}
                        
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(invoice._id)}
                            className="text-red-400 hover:text-red-500"
                            title="Elimina"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Precedente
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Successiva
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(page - 1) * 20 + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * 20, totalItems)}</span> di{' '}
                  <span className="font-medium">{totalItems}</span> risultati
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Precedente
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Successiva
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
