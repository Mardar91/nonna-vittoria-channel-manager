'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';
import NotificationDropdown from '@/components/NotificationDropdown';

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Funzione per recuperare il conteggio delle notifiche non lette
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?unreadOnly=true&limit=1');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Polling per aggiornare il conteggio delle notifiche
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Ogni 30 secondi
    
    return () => clearInterval(interval);
  }, []);

  // Chiudi i menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aggiorna il conteggio quando il dropdown delle notifiche si chiude
  const handleNotificationClose = () => {
    setIsNotificationOpen(false);
    fetchUnreadCount(); // Ricarica il conteggio quando si chiude
  };
  
  // Estrai il titolo della pagina dal percorso
  const getPageTitle = () => {
    const path = pathname.split('/').filter(p => p);
    
    if (path.length === 0) return 'Dashboard';
    
    if (path[0] === 'multi-calendar') return 'Multi Calendar';
    if (path[0] === 'apartments') {
      if (path.length === 1) return 'Appartamenti';
      if (path[1] === 'new') return 'Nuovo Appartamento';
      return 'Dettagli Appartamento';
    }
    if (path[0] === 'bookings') {
      if (path.length === 1) return 'Prenotazioni';
      if (path[1] === 'new') return 'Nuova Prenotazione';
      return 'Dettagli Prenotazione';
    }
    if (path[0] === 'checkins') {
      if (path.length === 1) return 'Check-ins';
      return 'Dettagli Check-in';
    }
    if (path[0] === 'payments') return 'Pagamenti';
    if (path[0] === 'settings') return 'Impostazioni';
    if (path[0] === 'online-profile') return 'Profilo Online';
    
    // Capitalizza la prima lettera
    return path[0].charAt(0).toUpperCase() + path[0].slice(1);
  };

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-lg font-semibold hidden md:block">Nonna Vittoria CM</span>
              <span className="text-lg font-semibold md:hidden">{getPageTitle()}</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              {/* Notifiche - con badge per non lette */}
              <div ref={notificationRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen(!isNotificationOpen);
                    setIsMenuOpen(false);
                  }}
                  className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                
                <NotificationDropdown 
                  isOpen={isNotificationOpen} 
                  onClose={handleNotificationClose}
                />
              </div>

              {/* Profile button - visibile sempre */}
              <div ref={menuRef} className="relative">
                <div>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(!isMenuOpen);
                      setIsNotificationOpen(false);
                    }}
                    className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </div>
                  </button>
                </div>
                
                {isMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profilo
                    </Link>
                    <Link 
                      href="/settings" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Impostazioni
                    </Link>
                    <Link 
                      href="/api/auth/signout" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Logout
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
