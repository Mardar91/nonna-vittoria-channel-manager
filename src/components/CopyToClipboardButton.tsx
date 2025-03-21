'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface CopyToClipboardButtonProps {
  textToCopy: string;
  className?: string;
}

export default function CopyToClipboardButton({ textToCopy, className }: CopyToClipboardButtonProps) {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    setCopying(true);
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Copiato negli appunti!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Impossibile copiare negli appunti');
    } finally {
      setCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={copying}
      className={className || "mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"}
    >
      {copying ? 'Copiando...' : 'Copia Link'}
    </button>
  );
}
