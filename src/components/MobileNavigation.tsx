'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ViewColumnsIcon, 
  BuildingOffice2Icon, 
  PlusIcon, 
  CreditCardIcon, 
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

interface ApartmentData {
  id: string;
  data: {
    name: string;
    [key: string]: any;
  };
}

interface MobileNavigationProps {
  apartments: ApartmentData[];
}

export default function MobileNavigation({ apartments = [] }: MobileNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    {
      name: 'Multi Calendar',
      href: '/multi-calendar',
      icon: ViewColumnsIcon,
    },
    {
      name: 'Appartamenti',
      href: '/apartments',
      icon: BuildingOffice2Icon,
    },
    {
      name: 'Aggiungi',
      href: '/bookings/new',
      icon: PlusIcon,
      isCenter: true,
    },
    {
      name: 'Pagamenti',
      href: '/payments',
      icon: CreditCardIcon,
    },
    {
      name: 'Menu',
      action: () => setMobileMenuOpen(true),
      icon: Bars3Icon,
    },
  ];

  return (
    <>
      {/* Barra di navigazione mobile fissa in basso */}
      <div className="md:hidden fixed bottom-0 left-0 z-30 w-full bg-white border-t border-gray-200">
        <div className="grid h-16 grid-cols-5">
          {navItems.map((item, index) => {
            const isActive = item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`));
            
            if (item.isCenter) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center bg-blue-600 -mt-4 rounded-full mx-auto h-14 w-14"
                >
                  <item.icon className="h-7 w-7 text-white" />
                </Link>
              );
            }
            
            return (
              <div 
                key={item.name} 
                className="flex items-center justify-center"
                onClick={item.action ? () => item.action() : undefined}
              >
                {item.href ? (
                  <Link href={item.href} className="flex items-center justify-center">
                    <item.icon 
                      className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} 
                    />
                  </Link>
                ) : (
                  <button className="flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-gray-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Menu mobile slide-in semplificato */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Overlay scuro */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Pannello laterale */}
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-medium text-gray-900">Menu</h2>
              <button
                type="button"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Chiudi menu</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Menu items */}
            <div className="mt-6 px-4">
              <div className="space-y-4">
                <Link
                  href="/dashboard"
                  className="block py-2 text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/bookings"
                  className="block py-2 text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Prenotazioni
                </Link>
                <Link
                  href="/settings"
                  className="block py-2 text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Impostazioni
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="block w-full text-left py-2 text-base font-medium text-red-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pulsanti appartamenti sotto il MultiCalendar - visibili solo nella pagina del MultiCalendar */}
      {pathname === '/multi-calendar' && apartments.length > 0 && (
        <div className="md:hidden fixed bottom-20 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {apartments.map((apt) => (
              <Link
                key={apt.id}
                href={`/apartments/${apt.id}/calendar`}
                className="flex flex-col items-center justify-center h-16 bg-white border border-gray-300 rounded-lg shadow-sm text-center px-2 py-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{apt.data?.name || "Appartamento"}</span>
              </Link>
            ))}
            <Link
              href="/apartments/new"
              className="flex flex-col items-center justify-center h-16 bg-blue-600 text-white rounded-lg shadow-sm text-center px-2 py-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Aggiungi</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
