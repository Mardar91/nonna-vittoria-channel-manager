import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  XCircleIcon,
  CurrencyEuroIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface InvoiceStatusBadgeProps {
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
}

interface PaymentStatusBadgeProps {
  status: 'pending' | 'paid' | 'partial' | 'refunded';
  size?: 'sm' | 'md' | 'lg';
}

export function InvoiceStatusBadge({ status, size = 'md' }: InvoiceStatusBadgeProps) {
  const config = {
    draft: {
      icon: ClockIcon,
      class: 'bg-gray-100 text-gray-800',
      text: 'Bozza'
    },
    issued: {
      icon: CheckCircleIcon,
      class: 'bg-green-100 text-green-800',
      text: 'Emessa'
    },
    sent: {
      icon: EnvelopeIcon,
      class: 'bg-blue-100 text-blue-800',
      text: 'Inviata'
    },
    cancelled: {
      icon: XCircleIcon,
      class: 'bg-red-100 text-red-800',
      text: 'Annullata'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const { icon: Icon, class: className, text } = config[status];

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${className} ${sizeClasses[size]}`}>
      <Icon className={`${iconSizes[size]} mr-1`} />
      {text}
    </span>
  );
}

export function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const config = {
    pending: {
      icon: ClockIcon,
      class: 'bg-yellow-100 text-yellow-800',
      text: 'In attesa'
    },
    paid: {
      icon: CheckCircleIcon,
      class: 'bg-green-100 text-green-800',
      text: 'Pagato'
    },
    partial: {
      icon: ExclamationTriangleIcon,
      class: 'bg-orange-100 text-orange-800',
      text: 'Parziale'
    },
    refunded: {
      icon: CurrencyEuroIcon,
      class: 'bg-gray-100 text-gray-800',
      text: 'Rimborsato'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const { icon: Icon, class: className, text } = config[status];

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${className} ${sizeClasses[size]}`}>
      <Icon className={`${iconSizes[size]} mr-1`} />
      {text}
    </span>
  );
}

// Badge combinato per mostrare sia stato che pagamento
export function InvoiceCombinedBadge({ 
  invoiceStatus, 
  paymentStatus,
  size = 'md' 
}: {
  invoiceStatus: 'draft' | 'issued' | 'sent' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="flex items-center space-x-2">
      <InvoiceStatusBadge status={invoiceStatus} size={size} />
      <PaymentStatusBadge status={paymentStatus} size={size} />
    </div>
  );
}

// Badge per tipo documento
export function DocumentTypeBadge({ 
  type,
  activityType,
  size = 'md' 
}: {
  type: 'receipt' | 'invoice';
  activityType: 'business' | 'tourist_rental';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const isInvoice = type === 'invoice';
  const text = isInvoice ? 'Fattura' : 'Ricevuta';
  const subText = activityType === 'business' ? 'con IVA' : 'Cedolare Secca';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium bg-purple-100 text-purple-800 ${sizeClasses[size]}`}>
      {text}
      {size !== 'sm' && (
        <span className="ml-1 text-purple-600">({subText})</span>
      )}
    </span>
  );
}
