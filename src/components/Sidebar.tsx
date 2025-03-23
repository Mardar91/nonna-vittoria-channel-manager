'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ViewColumnsIcon,
  GlobeAltIcon, // Nuova icona per Profilo Online
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
    },
    {
      name: 'Appartamenti',
      href: '/apartments',
      icon: BuildingOffice2Icon,
    },
    {
      name: 'Multi Calendar',
      href: '/multi-calendar',
      icon: ViewColumnsIcon,
    },
    {
      name: 'Prenotazioni',
      href: '/bookings',
      icon: CalendarIcon,
    },
    {
      name: 'Profilo Online',
      href: '/online-profile',
      icon: GlobeAltIcon,
    },
    {
      name: 'Pagamenti',
      href: '/payments',
      icon: CreditCardIcon,
    },
    {
      name: 'Impostazioni',
      href: '/settings',
      icon: Cog6ToothIcon,
    },
  ];

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:bg-white md:shadow md:h-screen">
      <div className="p-4 border-b">
        <h1 className="text-lg font-semibold text-gray-900">
          Nonna Vittoria CM
        </h1>
      </div>
      <nav className="mt-5 px-4 flex-1">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm rounded-md ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-2" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md w-full"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
