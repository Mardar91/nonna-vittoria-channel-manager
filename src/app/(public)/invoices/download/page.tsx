'use client';

import { Suspense, useState, useEffect, useCallback } from 'react'; // Added Suspense
import { useSearchParams } from 'next/navigation';
import {
  DocumentTextIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LockClosedIcon,
  CalendarIcon,
  BuildingOffice2Icon,
  UserIcon,
  CurrencyEuroIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: {
    name: string;
    email: string;
  };
  issuer: {
    businessName: string;
    address: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    taxCode: string;
    vatNumber?: string;
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
  platformInfo?: {
    platform: string;
    withholdingTax?: {
      rate: number;
      amount: number;
      text: string;
    };
  };
  pdfUrl?: string;
  documentType: string;
  activityType: string;
  paymentInfo: {
    status: string;
    method: string;
  };
}

interface ValidationResponse {
  isValid: boolean;
  invoice?: Invoice;
  expiresAt?: string;
  error?: string;
}

// Renamed from PublicInvoiceDownloadPage
function InvoiceDownloadContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  const accessCode = searchParams.get('code');

  const validateAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/public/invoices/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });
      
      const data: ValidationResponse = await response.json();
      
      if (!response.ok || !data.isValid) {
        setError(data.error || 'Codice di accesso non valido o scaduto');
        setInvoice(null);
      } else if (data.invoice) {
        setInvoice(data.invoice);
        if (data.expiresAt) {
          setExpiresAt(new Date(data.expiresAt));
        }
        setError(null);
      }
    } catch (err) {
      setError('Errore nella validazione del codice di accesso');
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
      setLoading(false);
    }
  }, [accessCode, setError, setInvoice, setExpiresAt, setLoading, setValidating]);

  useEffect(() => {
    if (accessCode) {
      validateAccess();
    } else {
      setError('Codice di accesso mancante');
      setLoading(false);
      setValidating(false);
    }
  }, [accessCode, validateAccess, setError, setLoading, setValidating]);

  const handleDownload = async () => {
    if (!invoice || !accessCode) return;
    
    try {
      const response = await fetch(`/api/public/invoices/${accessCode}`);
      
      if (!response.ok) {
        throw new Error('Errore nel download del PDF');
      }
      
      if (response.redirected) {
        window.open(response.url, '_blank');
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Errore nel download del PDF. Riprova più tardi.');
    }
  };

  if (loading || validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Validazione in corso...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Verifica del codice di accesso
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Accesso non valido
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Se hai bisogno di assistenza, contatta la struttura.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <DocumentTextIcon className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            La tua {invoice.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'}
          </h1>
          <p className="mt-2 text-gray-600">
            Scarica il documento relativo al tuo soggiorno
          </p>
        </div>

        {/* Alert scadenza */}
        {expiresAt && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Questo link scadrà il {format(expiresAt, 'dd MMMM yyyy', { locale: it })}.
                  Scarica il documento prima di tale data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Riepilogo ricevuta */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Riepilogo Documento
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {invoice.documentType === 'invoice' ? 'Fattura' : 'Ricevuta'} N. {invoice.invoiceNumber} del {format(new Date(invoice.invoiceDate), 'dd MMMM yyyy', { locale: it })}
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            <dl>
              {/* Intestatario */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <BuildingOffice2Icon className="h-5 w-5 mr-2 text-gray-400" />
                  Emesso da
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div>{invoice.issuer.businessName}</div>
                  <div className="text-gray-500">
                    {invoice.issuer.address}, {invoice.issuer.zip} {invoice.issuer.city} ({invoice.issuer.province})
                  </div>
                  <div className="text-gray-500">
                    C.F.: {invoice.issuer.taxCode}
                    {invoice.issuer.vatNumber && ` - P.IVA: ${invoice.issuer.vatNumber}`}
                  </div>
                </dd>
              </div>

              {/* Intestato a */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Intestato a
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div>{invoice.customer.name}</div>
                  <div className="text-gray-500">{invoice.customer.email}</div>
                </dd>
              </div>

              {/* Soggiorno */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Soggiorno
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="font-medium">{invoice.stayDetails.apartmentName}</div>
                  <div className="text-gray-500">{invoice.stayDetails.apartmentAddress}</div>
                  <div className="mt-1">
                    Dal {format(new Date(invoice.stayDetails.checkIn), 'dd/MM/yyyy')} al {format(new Date(invoice.stayDetails.checkOut), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-gray-500">
                    {invoice.stayDetails.nights} notti • {invoice.stayDetails.guests} ospiti
                  </div>
                </dd>
              </div>

              {/* Importo */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CurrencyEuroIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Importo Totale
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="text-2xl font-bold">
                    €{invoice.total.toFixed(2)}
                  </div>
                  {invoice.vatAmount !== undefined && invoice.vatAmount > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      di cui IVA: €{invoice.vatAmount.toFixed(2)}
                    </div>
                  )}
                  {invoice.platformInfo?.withholdingTax && (
                    <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                      {invoice.platformInfo.withholdingTax.text}
                    </div>
                  )}
                </dd>
              </div>

              {/* Stato pagamento */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Stato Pagamento
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {invoice.paymentInfo.status === 'paid' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Pagato
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In attesa
                    </span>
                  )}
                  <span className="ml-3 text-gray-500">
                    Metodo: {
                      invoice.paymentInfo.method === 'cash' ? 'Contanti' :
                      invoice.paymentInfo.method === 'bank_transfer' ? 'Bonifico' :
                      invoice.paymentInfo.method === 'credit_card' ? 'Carta di Credito' :
                      invoice.paymentInfo.method === 'stripe' ? 'Pagamento Online' :
                      invoice.paymentInfo.method === 'platform' ? invoice.platformInfo?.platform || 'Piattaforma' :
                      invoice.paymentInfo.method
                    }
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Azioni */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="text-center">
            {invoice.pdfUrl ? (
              <>
                <DocumentArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Documento Disponibile
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Clicca il pulsante qui sotto per scaricare il PDF
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Scarica PDF
                  </button>
                </div>
              </>
            ) : (
              <>
                <LockClosedIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  PDF non ancora disponibile
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Il documento PDF è in fase di generazione. Riprova tra qualche minuto.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer informativo */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Questo documento è fornito a titolo di ricevuta per il tuo soggiorno.
          </p>
          <p className="mt-2">
            Per qualsiasi domanda, contatta la struttura all&apos;indirizzo email indicato nel documento.
          </p>
        </div>
      </div>
    </div>
  );
}

// New LoadingIndicator component
function LoadingIndicator() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Using DocumentTextIcon as suggested, or a simple text */}
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
          <p className="mt-6 text-3xl font-extrabold text-gray-900">
            Caricamento pagina...
          </p>
        </div>
      </div>
    </div>
  );
}

// New default export PublicInvoiceDownloadPage using Suspense
export default function PublicInvoiceDownloadPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <InvoiceDownloadContent />
    </Suspense>
  );
}
