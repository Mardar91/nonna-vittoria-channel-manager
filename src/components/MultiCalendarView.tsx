'use client';

import React, { useState, useEffect } from 'react';
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
  
  // Crea una data con il fuso orario italiano
  const currentDateItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  const [currentMonth, setCurrentMonth] = useState(currentDateItaly.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateItaly.getFullYear());
  const [visibleDays, setVisibleDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Genera i giorni visibili (14 giorni partendo da oggi) all'avvio
  useEffect(() => {
    try {
      const today = new Date();
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
    } catch (error) {
      console.error("Errore nella generazione dei giorni:", error);
      // Se c'è un errore, genera almeno un mese di base
      const fallbackDays: Date[] = [];
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        fallbackDays.push(new Date(today.getFullYear(), today.getMonth(), i));
      }
      
      setVisibleDays(fallbackDays);
    }
  }, []);
  
  // Funzione per navigare a giorni precedenti
  const goToPreviousWeek = () => {
    if (visibleDays.length === 0) return;
    
    try {
      const newDays = visibleDays.map(day => {
        const newDay = new Date(day);
        newDay.setDate(newDay.getDate() - 7);
        return newDay;
      });
      
      setVisibleDays(newDays);
      
      // Aggiorna mese e anno se necessario
      if (newDays.length > 0) {
        const firstDay = newDays[0];
        setCurrentMonth(firstDay.getMonth());
        setCurrentYear(firstDay.getFullYear());
      }
    } catch (error) {
      console.error("Errore nel navigare alla settimana precedente:", error);
      toast.error("Errore nel cambiare settimana");
    }
  };
  
  // Funzione per navigare a giorni successivi
  const goToNextWeek = () => {
    if (visibleDays.length === 0) return;
    
    try {
      const newDays = visibleDays.map(day => {
        const newDay = new Date(day);
        newDay.setDate(newDay.getDate() + 7);
        return newDay;
      });
      
      setVisibleDays(newDays);
      
      // Aggiorna mese e anno se necessario
      if (newDays.length > 0) {
        const firstDay = newDays[0];
        setCurrentMonth(firstDay.getMonth());
        setCurrentYear(firstDay.getFullYear());
      }
    } catch (error) {
      console.error("Errore nel navigare alla settimana successiva:", error);
      toast.error("Errore nel cambiare settimana");
    }
  };
  
  // Funzione per tornare alla data corrente
  const goToToday = () => {
    try {
      const today = new Date();
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
    } catch (error) {
      console.error("Errore nel tornare ad oggi:", error);
      toast.error("Errore nel tornare ad oggi");
    }
  };
  
  const handleApartmentClick = (apartmentId: string) => {
    router.push(`/apartments/${apartmentId}`);
  };
  
  const handleDateClick = (apartmentId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      router.push(`/apartments/${apartmentId}/calendar?date=${dateStr}`);
    } catch (error) {
      console.error("Errore nel navigare alla data:", error);
      toast.error("Errore nel navigare alla data");
    }
  };
  
  // Funzione per verificare se una data è nel passato
  const isPastDate = (date: Date): boolean => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    } catch (error) {
      console.error("Errore nel controllare se la data è passata:", error);
      return false;
    }
  };
  
  // Funzione per formattare la data nel formato "Mar 20"
  const formatDate = (date: Date): { weekday: string; day: number } => {
    try {
      const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      return {
        weekday: weekdays[date.getDay()],
        day: date.getDate()
      };
    } catch (error) {
      console.error("Errore nel formattare la data:", error);
      return { weekday: "", day: 0 };
    }
  };
  
  // Funzione per ottenere il prezzo per una data specifica
  const getPriceForDate = (apartment: ApartmentWithBookings, date: Date): number => {
    try {
      // Verifica se ci sono prenotazioni per questa data
      const booking = getBookingForDate(apartment, date);
      
      if (booking) {
        // Per semplicità, restituisci il prezzo totale della prenotazione
        return booking.totalPrice;
      }
      
      // Verifica se c'è una tariffa personalizzata
      const customRate = apartment.rates.find(rate => {
        try {
          const rateDate = new Date(rate.date);
          return rateDate.toDateString() === date.toDateString() && rate.price !== undefined;
        } catch {
          return false;
        }
      });
      
      if (customRate && customRate.price !== undefined) {
        return customRate.price;
      }
      
      // Altrimenti restituisci il prezzo base dell'appartamento
      return apartment.data.price || 0;
    } catch (error) {
      console.error("Errore nel calcolare il prezzo per la data:", error);
      return 0;
    }
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
  
  // Determina il mese o i mesi visualizzati
  const getDisplayedMonthText = (): string => {
    try {
      if (visibleDays.length === 0) {
        return `${monthNames[currentMonth]} ${currentYear}`;
      }
      
      const firstDay = visibleDays[0];
      const lastDay = visibleDays[visibleDays.length - 1];
      
      if (firstDay.getMonth() === lastDay.getMonth() && 
          firstDay.getFullYear() === lastDay.getFullYear()) {
        return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
      } else {
        if (firstDay.getFullYear() === lastDay.getFullYear()) {
          return `${monthNames[firstDay.getMonth()]} - ${monthNames[lastDay.getMonth()]} ${firstDay.getFullYear()}`;
        } else {
          return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()} - ${monthNames[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
        }
      }
    } catch (error) {
      console.error("Errore nel determinare il testo del mese:", error);
      return `${monthNames[currentMonth]} ${currentYear}`;
    }
  };
  
  // Verifica se la data è oggi
  const isToday = (date: Date): boolean => {
    try {
      const today = new Date();
      return date.getDate() === today.getDate() && 
             date.getMonth() === today.getMonth() && 
             date.getFullYear() === today.getFullYear();
    } catch (error) {
      console.error("Errore nel verificare se la data è oggi:", error);
      return false;
    }
  };
  
  // Trova la prenotazione per una data specifica
  const getBookingForDate = (apartment: ApartmentWithBookings, date: Date): Booking | null => {
    try {
      return apartment.bookings.find(booking => {
        try {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          
          checkIn.setHours(0, 0, 0, 0);
          checkOut.setHours(0, 0, 0, 0);
          
          const dateToCheck = new Date(date);
          dateToCheck.setHours(0, 0, 0, 0);
          
          return dateToCheck >= checkIn && dateToCheck < checkOut;
        } catch {
          return false;
        }
      }) || null;
    } catch (error) {
      console.error("Errore nel trovare la prenotazione per la data:", error);
      return null;
    }
  };
  
  // Verifica la posizione di una data in una prenotazione (inizio, centro, fine)
  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' => {
    try {
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
    } catch (error) {
      console.error("Errore nel determinare la posizione della prenotazione:", error);
      return 'middle';
    }
  };
  
  // Verifica se una data è bloccata
  const isDateBlocked = (apartment: ApartmentWithBookings, date: Date): boolean => {
    try {
      return apartment.rates.some(rate => {
        try {
          const rateDate = new Date(rate.date);
          return rateDate.toDateString() === date.toDateString() && rate.isBlocked;
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error("Errore nel verificare se la data è bloccata:", error);
      return false;
    }
  };
  
  // Controlla se c'è almeno un giorno da visualizzare
  if (visibleDays.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>Caricamento del calendario...</p>
      </div>
    );
  }
  
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
      <div className="overflow-x-auto pb-4">
        <table className="min-w-full border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {/* Intestazione appartamento */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 py-3 px-4 min-w-[160px] text-left font-medium">
                Appartamento
              </th>
              
              {/* Intestazioni dei giorni */}
              {visibleDays.map((day, index) => {
                const dateInfo = formatDate(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <th 
                    key={index} 
                    className={`border border-gray-200 py-1 min-w-[80px] text-center ${
                      isCurrentDay ? "bg-blue-50" : "bg-gray-100"
                    }`}
                  >
                    <div className="font-medium">{dateInfo.weekday}</div>
                    <div className={`text-lg ${isCurrentDay ? "font-bold text-blue-600" : ""}`}>
                      {dateInfo.day}
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
                  {apartment.data?.name || "Appartamento"}
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
                        
                        {/* Solo per celle future - controllo prenotazione */}
                        {!isPast && !booking && !isBlocked && (
                          <div className="text-center">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-blue-600 transition duration-150 ease-in-out" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAction(apartment.id, day, 'book');
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
