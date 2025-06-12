'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  ShareIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

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
    address: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    vatNumber?: string;
    taxCode: string;
    email?: string;
    phone?: string;
  };
  stayDetails: {
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    apartmentName: string;
    apartmentAddress: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate?: number;
    vatAmount?: number;
  }>;
  subtotal: number;
  vatAmount?: number;
  total: number;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  paymentInfo: {
    method: string;
    status: string;
    paidAmount: number;
    paidDate?: string;
    stripePaymentId?: string;
    notes?: string;
  };
  platformInfo?: {
    platform: string;
    bookingReference?: string;
    withholdingTax?: {
      rate: number;
      amount: number;
      text: string;
    };
  };
  documentType: 'receipt' | 'invoice';
  activityType: 'business' | 'tourist_rental';
  emailSent: boolean;
  emailSentAt?: string;
  emailSentTo?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  publicAccessCode?: string;
  publicAccessExpiry?: string;
  notes?: string;
  internalNotes?: string;
  isLocked: boolean;
  lockedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  const fetchInvoice = useCallback(async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) throw new Error('Errore nel caricamento della ricevuta');
      
      const data = await response.json();
      setInvoice(data);
      
      // Se ha un codice di accesso pubblico, genera l'URL
      if (data.publicAccessCode) {
        const baseUrl = window.location.origin;
        setPublicUrl(`${baseUrl}/invoices/download?code=${data.publicAccessCode}`);
      }
    } catch (error) {
      toast.error('Errore nel caricamento della ricevuta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [params.id, setInvoice, setPublicUrl, setLoading]); // setLoading is stable, but good to list if ESLint complains

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleLock = async () => {
    if (!confirm('Sei sicuro di voler bloccare questa ricevuta? Non sarà più possibile modificarla.')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/lock`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nel blocco della ricevuta');
      
      toast.success('Ricevuta bloccata con successo');
      fetchInvoice();
    } catch (error) {
      toast.error('Errore nel blocco della ricevuta');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa ricevuta?')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Errore nell\'eliminazione');
      
      toast.success('Ricevuta eliminata con successo');
      router.push('/invoices');
    } catch (error) {
      toast.error('Errore nell\'eliminazione della ricevuta');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/send-email`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nell\'invio email');
      
      toast.success('Email inviata con successo');
      fetchInvoice();
    } catch (error) {
      toast.error('Errore nell\'invio dell\'email');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/pdf`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nella generazione del PDF');
      
      const data = await response.json();
      
      // Apri il PDF in una nuova scheda
      window.open(data.pdfUrl, '_blank');
      
      toast.success('PDF generato con successo');
      fetchInvoice();
    } catch (error) {
      toast.error('Errore nella generazione del PDF');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePublicLink = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/public-access`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nella generazione del link');
      
      const data = await response.json();
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/invoices/download?code=${data.accessCode}`;
      
      setPublicUrl(url);
      setShowShareModal(true);
      
      toast.success('Link pubblico generato con successo');
      fetchInvoice();
    } catch (error) {
      toast.error('Errore nella generazione del link pubblico');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!confirm('Vuoi duplicare questa ricevuta?')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/duplicate`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Errore nella duplicazione');
      
      const data = await response.json();
      toast.success('Ricevuta duplicata con successo');
      router.push(`/invoices/${data.invoiceId}/edit`);
    } catch (error) {
      toast.error('Errore nella duplicazione della ricevuta');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiato negli appunti');
  };

  const getStatusBadge = () => {
    if (!invoice) return null;
    
    const badges = {
      draft: { icon: ClockIcon, class: 'bg-gray-100 text-gray-800', text: 'Bozza' },
      issued: { icon: CheckCircleIcon, class: 'bg-green-100 text-green-800', text: 'Emessa' },
      sent: { icon: EnvelopeIcon, class: 'bg-blue-100 text-blue-800', text: 'Inviata' },
      cancelled: { icon: XCircleIcon, class: 'bg-red-100 text-red-800', text: 'Annullata' },
    };
    
    const badge = badges[invoice.status];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.class}`}>
        <Icon className="w-4 h-4 mr-2" />
        {badge.text}
      </span>
    );
  };

  const getPaymentBadge = () => {
    if (!invoice) return null;
    
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    
    const text = {
      pending: 'In attesa',
      paid: 'Pagato',
      partial: 'Parziale',
      refunded: 'Rimborsato',
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[invoice.paymentInfo.status as keyof typeof badges]}`}>
        {text[invoice.paymentInfo.status as keyof typeof text]}
      </span>
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/invoices"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Torna alla lista
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {invoice.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'} {invoice.invoiceNumber}
          </h1>
          {getStatusBadge()}
          {invoice.isLocked && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              <LockClosedIcon className="h-3 w-3 mr-1" />
              Bloccata
            </span>
          )}
        </div>
        
        {/* Azioni */}
        <div className="flex items-center space-x-2">
          {invoice.status === 'draft' && !invoice.isLocked && (
            <>
              <Link
                href={`/invoices/${invoice._id}/edit`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Modifica
              </Link>
              
              <button
                onClick={handleLock}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <LockClosedIcon className="h-4 w-4 mr-2" />
                Blocca
              </button>
            </>
          )}
          
          <button
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            Duplica
          </button>
          
          {!invoice.pdfUrl && (
            <button
              onClick={handleGeneratePdf}
              disabled={actionLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Genera PDF
            </button>
          )}
          
          {invoice.pdfUrl && (
            <>
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Scarica PDF
              </a>
              
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Stampa
              </button>
            </>
          )}
          
          {!invoice.emailSent && invoice.status !== 'draft' && (
            <button
              onClick={handleSendEmail}
              disabled={actionLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              Invia Email
            </button>
          )}
          
          <button
            onClick={handleGeneratePublicLink}
            disabled={actionLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            Condividi
          </button>
          
          {invoice.status === 'draft' && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Elimina
            </button>
          )}
        </div>
      </div>

      {/* Corpo della ricevuta */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg print:shadow-none">
        <div className="px-4 py-5 sm:p-6">
          {/* Intestazione */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {invoice.documentType === 'invoice' ? 'FATTURA' : 'RICEVUTA'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                N. {invoice.invoiceNumber} del {format(new Date(invoice.invoiceDate), 'dd MMMM yyyy', { locale: it })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{invoice.issuer.businessName}</p>
              <p className="text-sm text-gray-600">{invoice.issuer.address}</p>
              <p className="text-sm text-gray-600">{invoice.issuer.zip} {invoice.issuer.city} ({invoice.issuer.province})</p>
              <p className="text-sm text-gray-600">C.F.: {invoice.issuer.taxCode}</p>
              {invoice.issuer.vatNumber && (
                <p className="text-sm text-gray-600">P.IVA: {invoice.issuer.vatNumber}</p>
              )}
            </div>
          </div>

          {/* Dati cliente */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dati Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{invoice.customer.name}</p>
                <p className="text-sm text-gray-600">{invoice.customer.email}</p>
                {invoice.customer.phone && (
                  <p className="text-sm text-gray-600">Tel: {invoice.customer.phone}</p>
                )}
              </div>
              <div>
                {invoice.customer.address && (
                  <>
                    <p className="text-sm text-gray-600">{invoice.customer.address}</p>
                    <p className="text-sm text-gray-600">
                      {invoice.customer.zip} {invoice.customer.city} 
                      {invoice.customer.province && ` (${invoice.customer.province})`}
                    </p>
                    <p className="text-sm text-gray-600">{invoice.customer.country}</p>
                  </>
                )}
                {invoice.customer.taxCode && (
                  <p className="text-sm text-gray-600">C.F.: {invoice.customer.taxCode}</p>
                )}
                {invoice.customer.vatNumber && (
                  <p className="text-sm text-gray-600">P.IVA: {invoice.customer.vatNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dettagli soggiorno */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dettagli Soggiorno</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Appartamento:</span> {invoice.stayDetails.apartmentName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Indirizzo:</span> {invoice.stayDetails.apartmentAddress}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Periodo:</span> dal {format(new Date(invoice.stayDetails.checkIn), 'dd/MM/yyyy')} al {format(new Date(invoice.stayDetails.checkOut), 'dd/MM/yyyy')} ({invoice.stayDetails.nights} notti)
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Ospiti:</span> {invoice.stayDetails.guests}
              </p>
              {invoice.platformInfo && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Piattaforma:</span> {invoice.platformInfo.platform}
                  {invoice.platformInfo.bookingReference && ` - Rif: ${invoice.platformInfo.bookingReference}`}
                </p>
              )}
            </div>
          </div>

          {/* Voci */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dettaglio</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrizione
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtà
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prezzo Unit.
                  </th>
                  {invoice.activityType === 'business' && (
                    <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IVA %
                    </th>
                  )}
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Totale
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-4 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-900 text-right">
                      €{item.unitPrice.toFixed(2)}
                    </td>
                    {invoice.activityType === 'business' && (
                      <td className="px-2 py-4 text-sm text-gray-900 text-right">
                        {item.vatRate || 0}%
                      </td>
                    )}
                    <td className="px-2 py-4 text-sm text-gray-900 text-right">
                      €{item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={invoice.activityType === 'business' ? 4 : 3} className="px-2 py-3 text-right font-medium">
                    Subtotale:
                  </td>
                  <td className="px-2 py-3 text-right font-medium">
                    €{invoice.subtotal.toFixed(2)}
                  </td>
                </tr>
                {invoice.activityType === 'business' && invoice.vatAmount !== undefined && (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-right font-medium">
                      IVA:
                    </td>
                    <td className="px-2 py-3 text-right font-medium">
                      €{invoice.vatAmount.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={invoice.activityType === 'business' ? 4 : 3} className="px-2 py-3 text-right text-lg font-bold">
                    TOTALE:
                  </td>
                  <td className="px-2 py-3 text-right text-lg font-bold">
                    €{invoice.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cedolare secca */}
          {invoice.platformInfo?.withholdingTax && (
            <div className="border-t border-gray-200 pt-6 mb-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {invoice.platformInfo.withholdingTax.text}
                    </p>
                    <p className="mt-2 text-sm text-yellow-700">
                      Importo cedolare secca ({invoice.platformInfo.withholdingTax.rate}%): 
                      <span className="font-medium ml-1">€{invoice.platformInfo.withholdingTax.amount.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Stato:</span> {getPaymentBadge()}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Metodo:</span> {
                    invoice.paymentInfo.method === 'cash' ? 'Contanti' :
                    invoice.paymentInfo.method === 'bank_transfer' ? 'Bonifico' :
                    invoice.paymentInfo.method === 'credit_card' ? 'Carta di Credito' :
                    invoice.paymentInfo.method === 'stripe' ? 'Stripe' :
                    invoice.paymentInfo.method === 'platform' ? 'Piattaforma' : 
                    invoice.paymentInfo.method
                  }
                </p>
              </div>
              <div>
                {invoice.paymentInfo.paidAmount > 0 && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Importo Pagato:</span> €{invoice.paymentInfo.paidAmount.toFixed(2)}
                  </p>
                )}
                {invoice.paymentInfo.paidDate && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Data Pagamento:</span> {format(new Date(invoice.paymentInfo.paidDate), 'dd/MM/yyyy')}
                  </p>
                )}
                {invoice.paymentInfo.stripePaymentId && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">ID Stripe:</span> {invoice.paymentInfo.stripePaymentId}
                  </p>
                )}
              </div>
            </div>
            {invoice.paymentInfo.notes && (
              <p className="text-sm text-gray-600 mt-4">
                <span className="font-medium">Note:</span> {invoice.paymentInfo.notes}
              </p>
            )}
          </div>

          {/* Note */}
          {invoice.notes && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Note</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Note interne (solo per admin) */}
          {invoice.internalNotes && (
            <div className="border-t border-gray-200 pt-6 print:hidden">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Note Interne</h3>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.internalNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con metadata */}
        <div className="bg-gray-50 px-4 py-4 sm:px-6 print:hidden">
          <div className="text-sm text-gray-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p>Creata il: {format(new Date(invoice.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                <p>Ultima modifica: {format(new Date(invoice.updatedAt), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <div>
                {invoice.emailSent && (
                  <p>
                    Email inviata il: {format(new Date(invoice.emailSentAt!), 'dd/MM/yyyy HH:mm')}
                    {invoice.emailSentTo && ` a ${invoice.emailSentTo}`}
                  </p>
                )}
                {invoice.pdfGeneratedAt && (
                  <p>PDF generato il: {format(new Date(invoice.pdfGeneratedAt), 'dd/MM/yyyy HH:mm')}</p>
                )}
              </div>
              <div>
                {invoice.isLocked && invoice.lockedAt && (
                  <p>Bloccata il: {format(new Date(invoice.lockedAt), 'dd/MM/yyyy HH:mm')}</p>
                )}
                {invoice.cancelledAt && (
                  <p>
                    Annullata il: {format(new Date(invoice.cancelledAt), 'dd/MM/yyyy HH:mm')}
                    {invoice.cancelReason && ` - Motivo: ${invoice.cancelReason}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal condivisione */}
      {showShareModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ShareIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Condividi Ricevuta
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Usa questo link per permettere al cliente di scaricare la ricevuta. 
                        Il link scadrà tra 30 giorni.
                      </p>
                      <div className="mt-3">
                        <div className="flex rounded-md shadow-sm">
                          <input
                            type="text"
                            readOnly
                            value={publicUrl}
                            className="focus:ring-blue-500 focus:border-blue-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(publicUrl)}
                            className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            Copia
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
