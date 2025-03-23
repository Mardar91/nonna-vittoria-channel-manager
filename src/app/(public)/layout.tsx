import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {children}
    </div>
  );
}
