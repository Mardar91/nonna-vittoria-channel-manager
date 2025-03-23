'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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

interface ApartmentWithBookings {
  id: string;
  data: any;
  bookings: Booking[];
  rates: Rate[];
}

interface MultiCalendarViewProps {
  apartments: ApartmentWithBookings[];
}

export default function MultiCalendarView({ apartments }: MultiCalendarViewProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Crea una data con il fuso orario italiano
  const currentDateItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  const [currentMonth, setCurrentMonth] = useState(currentDateItaly.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateItaly.getFullYear());
  const [visibleDays, setVisibleDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [todayCellRef, setTodayCellRef] = useState<HTMLElement | null>(null);
  
  // Genera i giorni visibili (14 giorni partendo da oggi)
  useEffect(() => {
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    today.setHours(0, 0, 0, 0);
    
    // Genera 14 giorni (2 settimane) a partire da oggi
    const days: Date[] = [];
    for (let i = -3; i < 11; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }
    
    setVisibleDays(days);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }, []);
  
  // Centra la visuale sulla cella di oggi quando il componente è montato
  useEffect(() => {
    if (todayCellRef && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayCell = todayCellRef;
      
      // Calcola la posizione di scorrimento per centrare la cella di oggi
      const containerWidth = container.offsetWidth;
      const cellLeft = todayCell.offsetLeft;
      const cellWidth = todayCell.offsetWidth;
      
      // Scorri per centrare la cella di oggi
      const scrollPosition = cellLeft - (containerWidth / 2) + (cellWidth / 2);
      container.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayCellRef]);
  
  // Funzione per navigare a una settimana precedente
  const goToPreviousWeek = () => {
    const firstDay = new Date(visibleDays[0]);
    const newDays = visibleDays.map(day => {
      const newDay = new Date(day);
      newDay.setDate(newDay.getDate() - 7);
      return newDay;
    });
    
    setVisibleDays(newDays);
    
    // Aggiorna mese e anno se necessario
    if (firstDay.getMonth() !== newDays[0].getMonth()) {
      setCurrentMonth(newDays[0].getMonth());
      setCurrentYear(newDays[0].getFullYear());
    }
  };
  
  // Funzione per navigare a una settimana successiva
  const goToNextWeek = () => {
    const firstDay = new Date(visibleDays[0]);
    const newDays = visibleDays.map(day => {
      const newDay = new Date(day);
      newDay.setDate(newDay.getDate() + 7);
      return newDay;
    });
    
    setVisibleDays(newDays);
    
    // Aggiorna mese e anno se necessario
    if (firstDay.getMonth() !== newDays[0].getMonth()) {
      setCurrentMonth(newDays[0].getMonth());
      setCurrentYear(newDays[0].getFullYear());
    }
  };
  
  // Funzione per tornare alla data corrente
  const goToToday = () => {
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    today.setHours(0, 0, 0, 0);
    
    // Genera 14 giorni (2 settimane) a partire da oggi
    const days: Date[] = [];
    for (let i = -3; i < 11; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }
    
    setVisibleDays(days);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    
    toast.success('Visualizzazione impostata alla data corrente');
  };
  
  const handleApartmentClick = (apartmentId: string) => {
    router.push(`/apartments/${apartmentId}`);
  };
  
  const handleDateClick = (apartmentId: string, date: Date) => {
    router.push(`/apartments/${apartmentId}/calendar?date=${date.toISOString().split('T')[0]}`);
  };
  
  // Funzione per verificare se una data è nel passato
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  // Funzione per formattare la data nel formato "Mar 20"
  const formatDate = (date: Date): { weekday: string; day: number } => {
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return {
      weekday: weekdays[date.getDay()],
      day: date.getDate()
    };
  };
  
  // Funzione per ottenere il prezzo per una data specifica
  const getPriceForDate = (apartment: ApartmentWithBookings, date: Date): number => {
    // Verifica se è una data di prenotazione
    const booking = apartment.bookings.find(b => {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      
      return dateToCheck >= checkIn && dateToCheck < checkOut;
    });
    
    if (booking) {
      return booking.totalPrice / Math.max(1, 
        Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))
      );
    }
    
    // Verifica se c'è una tariffa personalizzata
    const customRate = apartment.rates.find(rate => {
      const rateDate = new Date(rate.date);
      return rateDate.toDateString() === date.toDateString() && rate.price !== undefined;
    });
    
    if (customRate && customRate.price) {
      return customRate.price;
    }
    
    // Altrimenti restituisci il prezzo base dell'appartamento
    return apartment.data.price;
  };
  
  const handleQuickAction = async (apartmentId: string, date: Date, action: 'block' | 'unblock' | 'book') => {
    setLoading(true);
    
    try {
      if (action === 'block' || action === 'unblock') {
        // Blocca/sblocca la data
        const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: date.toISOString(),
            isBlocked: action === 'block',
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Errore: ${response.statusText}`);
        }
        
        toast.success(action === 'block' ? 'Data bloccata' : 'Data sbloccata');
      } else if (action === 'book') {
        // Naviga alla pagina di creazione prenotazione
        router.push(`/bookings/new?apartmentId=${apartmentId}&checkIn=${date.toISOString().split('T')[0]}`);
        return;
      }
      
      router.refresh();
    } catch (error) {
      console.error('Errore nell\'azione:', error);
      toast.error('Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };
  
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  // Verifica se due date sono nello stesso mese
  const isSameMonth = (date1: Date, date2: Date): boolean => {
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };
  
  // Determina il mese o i mesi visualizzati
  const getDisplayedMonthText = (): string => {
    const firstDay = visibleDays[0];
    const lastDay = visibleDays[visibleDays.length - 1];
    
    if (isSameMonth(firstDay, lastDay)) {
      return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
    } else {
      return `${monthNames[firstDay.getMonth()]} - ${monthNames[lastDay.getMonth()]} ${
        firstDay.getFullYear() === lastDay.getFullYear() 
          ? firstDay.getFullYear() 
          : `${firstDay.getFullYear()}/${lastDay.getFullYear()}`
      }`;
    }
  };
  
  // Verifica se la data è oggi
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // Trova la prenotazione per una data specifica
  const getBookingForDate = (apartment: ApartmentWithBookings, date: Date): Booking | null => {
    return apartment.bookings.find(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      
      return dateToCheck >= checkIn && dateToCheck < checkOut;
    }) || null;
  };
  
  // Verifica la posizione di una data in una prenotazione (inizio, centro, fine)
  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    if (dateToCheck.getTime() === checkIn.getTime()) {
      return 'start';
    }
    
    const dayBeforeCheckout = new Date(checkOut);
    dayBeforeCheckout.setDate(dayBeforeCheckout.getDate() - 1);
    
    if (dateToCheck.getTime() === dayBeforeCheckout.getTime()) {
      return 'end';
    }
    
    return 'middle';
  };
  
  // Verifica se una data è bloccata
  const isDateBlocked = (apartment: ApartmentWithBookings, date: Date): boolean => {
    return apartment.rates.some(rate => {
      const rateDate = new Date(rate.date);
      return rateDate.toDateString() === date.toDateString() && rate.isBlocked;
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold mr-6">
            {getDisplayedMonthText()}
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousWeek}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tasto "Oggi" */}
        <button
          onClick={goToToday}
          className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-600 transition-colors shadow-sm"
          disabled={loading}
        >
          <CalendarIcon className="w-4 h-4 mr-1" />
          Oggi
        </button>
      </div>
      
      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-500 mr-2"></div>
          <span>Prenotato</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 border border-red-500 mr-2"></div>
          <span>Bloccato</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 mr-2"></div>
          <span>Disponibile</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-purple-100 border border-purple-300 mr-2"></div>
          <span>Prezzo Personalizzato</span>
        </div>
      </div>
      
      {/* Calendario principale - usando una tabella per un layout più coerente */}
      <div className="overflow-x-auto pb-4" ref={scrollContainerRef}>
        <table className="min-w-full border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {/* Intestazione appartamento */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 py-3 px-4 min-w-[160px] text-left font-medium">
                Appartamento
              </th>
              
              {/* Intestazioni dei giorni */}
              {visibleDays.map((day, index) => {
                const { weekday, day: dayNum } = formatDate(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <th 
                    key={index} 
                    className={`border border-gray-200 py-1 min-w-[80px] text-center ${
                      isCurrentDay ? "bg-blue-50" : "bg-gray-100"
                    }`}
                    ref={isCurrentDay ? (el) => setTodayCellRef(el) : null}
                  >
                    <div className="font-medium">{weekday}</div>
                    <div className={`text-lg ${isCurrentDay ? "font-bold text-blue-600" : ""}`}>
                      {dayNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody>
            {/* Righe per ogni appartamento */}
            {apartments.map((apartment) => (
              <tr key={apartment.id}>
                {/* Nome appartamento */}
                <td 
                  className="sticky left-0 z-10 bg-white border border-gray-200 py-3 px-4 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleApartmentClick(apartment.id)}
                >
                  {apartment.data.name}
                </td>
                
                {/* Celle per ogni giorno */}
                {visibleDays.map((day, dayIndex) => {
                  const isPast = isPastDate(day);
                  const isCurrentDay = isToday(day);
                  const booking = getBookingForDate(apartment, day);
                  const isBlocked = isDateBlocked(apartment, day);
                  
                  // Ottieni il prezzo per questa data
                  const price = getPriceForDate(apartment, day);
                  
                  // Determina la classe della cella
                  let cellClass = "border border-gray-200 p-1 relative h-16 ";
                  
                  if (isCurrentDay) {
                    cellClass += "bg-blue-50 ";
                  } else if (isPast) {
                    // Cella per data passata - stile più chiaro
                    cellClass += "bg-gray-100 ";
                  } else if (booking) {
                    // Cella prenotata - verde
                    cellClass += "bg-green-50 ";
                  } else if (isBlocked) {
                    // Cella bloccata - rossa
                    cellClass += "bg-red-50 ";
                  } else {
                    // Cella disponibile - blu chiaro
                    cellClass += "bg-blue-50 ";
                  }
                  
                  // Per le date con prenotazione, determina la posizione
                  let bookingPosition = booking ? getBookingPosition(day, booking) : null;
                  
                  return (
                    <td 
                      key={dayIndex} 
                      className={cellClass}
                      onClick={() => !isPast && handleDateClick(apartment.id, day)}
                    >
                      <div className="flex flex-col h-full">
                        {/* Prezzo */}
                        <div className="text-center text-sm font-medium">
                          {!booking && !isBlocked && `${price}€`}
                        </div>
                        
                        {/* Contenuto della cella - prenotazione o stato */}
                        <div className="flex-grow flex items-center justify-center relative">
                          {booking && (
                            <div 
                              className={`absolute inset-0 flex items-center justify-center p-1 ${
                                isPast ? 'bg-gray-200 bg-opacity-50' : 'bg-green-100'
                              } ${bookingPosition === 'start' ? 'rounded-l-md' : ''} ${
                                bookingPosition === 'end' ? 'rounded-r-md' : ''
                              }`}
                            >
                              <div className="text-center text-xs">
                                <div className="font-semibold truncate max-w-full">
                                  {booking.guestName}
                                </div>
                                {bookingPosition === 'start' && (
                                  <div className="text-xs">{booking.numberOfGuests} ospiti</div>
                                )}
                                {bookingPosition === 'start' && (
                                  <div className="text-xs font-medium">{booking.totalPrice}€</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {isBlocked && !booking && (
                            <div className="text-xs font-medium text-red-600">Bloccato</div>
                          )}
                        </div>
                        
                        {/* Solo per celle future - menu contestuale */}
                        {!isPast && !booking && !isBlocked && (
                          <div className="text-center">
                            <input 
                              type="checkbox" 
                              className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out" 
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  handleQuickAction(apartment.id, day, 'book');
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
