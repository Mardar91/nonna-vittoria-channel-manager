'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ViewColumnsIcon, 
  BuildingOffice2Icon, 
  PlusIcon, 
  ClipboardDocumentCheckIcon, 
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon
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
      name: 'Check-ins',
      href: '/checkins',
      icon: ClipboardDocumentCheckIcon,
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
                  href="/checkins"
                  className="block py-2 text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Check-ins
                </Link>
                <Link
                  href="/online-profile"
                  className="block py-2 text-base font-medium text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profilo Online
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
    </>
  );
}
