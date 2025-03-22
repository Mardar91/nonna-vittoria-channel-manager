'use client';

import { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: string;
  numberOfGuests: number;
  totalPrice: number;
}

interface Rate {
  _id: string;
  date: Date;
  price?: number;
  isBlocked: boolean;
  minStay?: number;
  notes?: string;
}

interface MultiCalendarRowProps {
  apartment: any;
  bookings: Booking[];
  rates: Rate[];
  days: Date[];
  currentMonth: number;
  onApartmentClick: () => void;
  onDateClick: (date: Date) => void;
  onQuickAction: (date: Date, action: 'block' | 'unblock' | 'book') => void;
  loading: boolean;
}

export default function MultiCalendarRow({
  apartment,
  bookings,
  rates,
  days,
  currentMonth,
  onApartmentClick,
  onDateClick,
  onQuickAction,
  loading
}: MultiCalendarRowProps) {
  
  // Verifica se una data appartiene a una prenotazione
  const getBookingForDate = (date: Date): Booking | null => {
    const dateStr = dateToString(date);
    
    return bookings.find(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      const checkInStr = dateToString(checkIn);
      const checkOutStr = dateToString(checkOut);
      
      // La data è compresa tra check-in e check-out (incluso il check-in, escluso il check-out)
      return (dateStr >= checkInStr && dateStr < checkOutStr);
    }) || null;
  };
  
  // Verifica se una data ha tariffe personalizzate o è bloccata
  const getRateForDate = (date: Date): Rate | null => {
    const dateStr = dateToString(date);
    
    return rates.find(rate => {
      const rateDate = new Date(rate.date);
      return dateToString(rateDate) === dateStr;
    }) || null;
  };
  
  // Formattazione date
  const dateToString = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Determina lo stato di una cella di un giorno
  const getCellStatus = (date: Date) => {
    const booking = getBookingForDate(date);
    const rate = getRateForDate(date);
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isToday = dateToString(date) === dateToString(new Date());
    
    if (booking) {
      // Data prenotata
      return {
        status: 'booked',
        className: `${isCurrentMonth ? 'bg-green-100' : 'bg-green-50'} ${isToday ? 'ring-2 ring-blue-500' : 'border border-green-300'}`,
        booking,
        rate
      };
    }
    
    if (rate?.isBlocked) {
      // Data bloccata
      return {
        status: 'blocked',
        className: `${isCurrentMonth ? 'bg-red-100' : 'bg-red-50'} ${isToday ? 'ring-2 ring-blue-500' : 'border border-red-300'}`,
        booking: null,
        rate
      };
    }
    
    if (rate?.price !== undefined) {
      // Data con prezzo personalizzato
      return {
        status: 'custom-price',
        className: `${isCurrentMonth ? 'bg-purple-100' : 'bg-purple-50'} ${isToday ? 'ring-2 ring-blue-500' : 'border border-purple-300'}`,
        booking: null,
        rate
      };
    }
    
    // Data disponibile
    return {
      status: 'available',
      className: `${isCurrentMonth ? 'bg-blue-100' : 'bg-blue-50'} ${isToday ? 'ring-2 ring-blue-500' : 'border border-blue-300'}`,
      booking: null,
      rate: null
    };
  };
  
  // Ottieni il prezzo per una data specifica
  const getPriceForDate = (date: Date): number => {
    const rate = getRateForDate(date);
    if (rate?.price !== undefined) {
      return rate.price;
    }
    return apartment.price;
  };
  
  // Funzione per ottenere il tooltip per una cella
  const getCellTooltip = (date: Date): string => {
    const { status, booking, rate } = getCellStatus(date);
    const dateFormatted = date.toLocaleDateString('it-IT');
    
    if (status === 'booked') {
      return `${dateFormatted}: ${booking?.guestName} (${booking?.numberOfGuests} ospiti)`;
    }
    
    if (status === 'blocked') {
      return `${dateFormatted}: Bloccato${rate?.notes ? ` - ${rate.notes}` : ''}`;
    }
    
    if (status === 'custom-price') {
      return `${dateFormatted}: €${rate?.price} per notte`;
    }
    
    return `${dateFormatted}: Disponibile - €${apartment.price} per notte`;
  };
  
  return (
    <div className="grid grid-cols-[minmax(180px,auto)_repeat(31,minmax(40px,1fr))] gap-px">
      {/* Nome appartamento */}
      <div 
        className="truncate p-2 bg-gray-50 font-medium border border-gray-200 cursor-pointer hover:bg-gray-100 flex items-center"
        onClick={onApartmentClick}
        title={apartment.name}
      >
        <span className="truncate">{apartment.name}</span>
      </div>
      
      {/* Celle dei giorni */}
      {days.map((day, index) => {
        const { status, className, booking, rate } = getCellStatus(day);
        const price = getPriceForDate(day);
        
        return (
          <div
            key={index}
            className={`relative h-10 ${className} flex flex-col items-center justify-center cursor-pointer text-xs group`}
            onClick={() => !loading && onDateClick(day)}
            title={getCellTooltip(day)}
          >
            <div className="font-medium">{day.getDate()}</div>
            
            {/* Menu contestuale - visibile al passaggio del mouse */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white bg-opacity-80">
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button
                  className="inline-flex items-center justify-center p-1 rounded-full text-gray-700 hover:bg-gray-200 focus:outline-none"
                  disabled={loading}
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute z-10 right-0 mt-1 w-36 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="p-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDateClick(day);
                            }}
                            className={`${
                              active ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            Vai al calendario
                          </button>
                        )}
                      </Menu.Item>
                      
                      {status !== 'booked' && !rate?.isBlocked && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickAction(day, 'block');
                              }}
                              className={`${
                                active ? 'bg-red-100 text-red-900' : 'text-gray-700'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                            >
                              Blocca
                            </button>
                          )}
                        </Menu.Item>
                      )}
                      
                      {status !== 'booked' && rate?.isBlocked && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickAction(day, 'unblock');
                              }}
                              className={`${
                                active ? 'bg-green-100 text-green-900' : 'text-gray-700'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                            >
                              Sblocca
                            </button>
                          )}
                        </Menu.Item>
                      )}
                      
                      {status !== 'booked' && !rate?.isBlocked && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickAction(day, 'book');
                              }}
                              className={`${
                                active ? 'bg-green-100 text-green-900' : 'text-gray-700'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                            >
                              Prenota
                            </button>
                          )}
                        </Menu.Item>
                      )}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
