// src/components/PaymentButton.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface PaymentButtonProps {
  bookingId: string;
}

export default function PaymentButton({ bookingId }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore durante la creazione del pagamento');
      }
      
      const data = await response.json();
      
      // Redirect alla pagina di checkout di Stripe
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error((error as Error).message || 'Si è verificato un errore');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? 'Creazione pagamento...' : 'Richiedi Pagamento'}
    </button>
  );
}
