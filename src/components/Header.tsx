'use client';

import { Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { BellIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  
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
    if (path[0] === 'payments') return 'Pagamenti';
    if (path[0] === 'settings') return 'Impostazioni';
    
    // Capitalizza la prima lettera
    return path[0].charAt(0).toUpperCase() + path[0].slice(1);
  };

  return (
    <Disclosure as="nav" className="bg-white shadow">
      {({ open }) => (
        <>
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <span className="text-lg font-semibold hidden md:block">Nonna Vittoria CM</span>
                  {/* Titolo pagina per mobile */}
                  <span className="text-xl font-bold md:hidden">{getPageTitle()}</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 flex items-center">
                  {/* Notifiche e profilo - visibili solo su desktop */}
                  <div className="hidden md:ml-4 md:flex md:items-center">
                    <button
                      type="button"
                      className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <span className="sr-only">View notifications</span>
                      <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Profile dropdown */}
                    <Menu as="div" className="relative ml-3">
                      <div>
                        <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                          <span className="sr-only">Open user menu</span>
                          <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white">
                            {session?.user?.name?.charAt(0) || 'A'}
                          </div>
                        </Menu.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              
                                href="/profile"
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } block px-4 py-2 text-sm text-gray-700`}
                              >
                                Profilo
                              </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              
                                href="/settings"
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } block px-4 py-2 text-sm text-gray-700`}
                              >
                                Impostazioni
                              </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              
                                href="/api/auth/signout"
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } block px-4 py-2 text-sm text-gray-700`}
                              >
                                Logout
                              </a>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                  
                  {/* Elemento placeholder per mobile, per mantenere allineamento */}
                  <div className="md:hidden">
                    <div className="h-8 w-8 rounded-full bg-transparent flex items-center justify-center">
                      <span className="sr-only">Placeholder</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Disclosure>
  );
}
