'use client';

import { useState, useEffect, useRef } from 'react';
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
  const dropdownRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Crea una data con il fuso orario italiano
  const currentDateItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  const [currentMonth, setCurrentMonth] = useState(currentDateItaly.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateItaly.getFullYear());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Effetto per gestire i click fuori dai menu contestuali
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([key, dropdown]) => {
        if (dropdown && !dropdown.contains(event.target as Node)) {
          dropdown.classList.add('hidden');
        }
      });
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Funzione per generare i giorni del calendario
  useEffect(() => {
    generateCalendarDays(currentYear, currentMonth);
  }, [currentMonth, currentYear]);
  
  // Funzione per generare i giorni del calendario per il mese corrente
  const generateCalendarDays = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Numero di giorni nel mese
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Calcola il primo giorno della settimana (0 = Lunedì nella nostra griglia)
    const firstWeekdayOfMonth = (firstDayOfMonth.getDay() + 6) % 7; // Adatta da Domenica(0) a Lunedì(0)
    
    // Calcola quanti giorni del mese precedente mostrare
    const daysFromPrevMonth = firstWeekdayOfMonth;
    
    // Calcola quanti giorni totali mostrare nella griglia (massimo 42 = 6 settimane)
    const totalDaysToShow = Math.min(42, daysFromPrevMonth + daysInMonth + (42 - daysFromPrevMonth - daysInMonth));
    
    const days: Date[] = [];
    
    // Aggiungi i giorni dal mese precedente
    for (let i = 0; i < daysFromPrevMonth; i++) {
      const day = new Date(year, month, 1 - (daysFromPrevMonth - i));
      days.push(day);
    }
    
    // Aggiungi i giorni del mese corrente
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Calcola quanti giorni del mese successivo aggiungere per completare la griglia
    const remainingDays = totalDaysToShow - days.length;
    
    // Aggiungi i giorni del mese successivo
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    setCalendarDays(days);
  };
  
  // Funzione per passare al mese precedente
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  // Funzione per passare al mese successivo
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Funzione per tornare alla data corrente
  const goToToday = () => {
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    toast.success('Visualizzazione impostata alla data corrente');
  };
  
  const handleApartmentClick = (apartmentId: string) => {
    router.push(`/apartments/${apartmentId}`);
  };
  
  const handleDateClick = (apartmentId: string, date: Date) => {
    if (isPastDate(date)) return; // Non fare nulla se la data è passata
    router.push(`/apartments/${apartmentId}/calendar?date=${date.toISOString().split('T')[0]}`);
  };
  
  const handleQuickAction = async (apartmentId: string, date: Date, action: 'block' | 'unblock' | 'book') => {
    if (isPastDate(date)) return; // Non fare nulla se la data è passata
    
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
  
  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Chiudi tutti gli altri dropdown
    Object.entries(dropdownRefs.current).forEach(([key, dropdown]) => {
      if (key !== id && dropdown) {
        dropdown.classList.add('hidden');
      }
    });
    
    // Apri o chiudi questo dropdown
    const dropdown = dropdownRefs.current[id];
    if (dropdown) {
      dropdown.classList.toggle('hidden');
    }
  };
  
  // Verifica se una data è nel passato
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  // Raggruppa i giorni in settimane
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  
  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold mr-6">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded-full hover:bg-gray-200"
              disabled={loading}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-full hover:bg-gray-200"
              disabled={loading}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tasto "Oggi" */}
        <button
          onClick={goToToday}
          className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
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
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 mr-2"></div>
          <span>Data Passata</span>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold mr-2">
            1
          </div>
          <span>Oggi</span>
        </div>
      </div>
      
      {/* Tabella del calendario */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-100 p-2 font-medium text-left min-w-[180px]">
                Appartamento
              </th>
              {/* Intestazione con i giorni della settimana */}
              {weeks.length > 0 && weeks[0].map((day, index) => (
                <th key={`week-day-${index}`} className="border border-gray-200 bg-gray-100 p-2 font-medium text-center min-w-[40px]">
                  {weekdayNames[index % 7]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Riga con i numeri dei giorni */}
            <tr>
              <td className="border border-gray-200 bg-gray-50 p-2 font-medium text-left">
                {/* Prima cella vuota */}
              </td>
              {calendarDays.map((day, index) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = isPastDate(day);
                const isCurrentMonth = day.getMonth() === currentMonth;
                
                return (
                  <td 
                    key={`day-number-${index}`} 
                    className={`
                      border border-gray-200 p-2 text-center font-medium
                      ${isCurrentMonth ? 'bg-gray-50' : 'bg-gray-100/50 text-gray-400'}
                      ${isPast ? 'text-gray-400' : ''}
                      ${isToday ? 'relative' : ''}
                    `}
                  >
                    {isToday ? (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white mx-auto">
                        {day.getDate()}
                      </span>
                    ) : (
                      day.getDate()
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Righe per ogni appartamento */}
            {apartments.map((apartment) => (
              <tr key={apartment.id}>
                <td
                  className="border border-gray-200 p-2 font-medium bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleApartmentClick(apartment.id)}
                >
                  {apartment.data.name}
                </td>
                {/* Celle per ogni giorno */}
                {calendarDays.map((date, index) => {
                  // Funzione per determinare se c'è una prenotazione per questa data
                  const hasBooking = apartment.bookings.some(booking => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    const dateString = date.toISOString().split('T')[0];
                    const checkInString = checkIn.toISOString().split('T')[0];
                    const checkOutString = checkOut.toISOString().split('T')[0];
                    return dateString >= checkInString && dateString < checkOutString;
                  });
                  
                  // Funzione per determinare se c'è una tariffa personalizzata per questa data
                  const hasPriceRate = apartment.rates.some(rate => {
                    const rateDate = new Date(rate.date);
                    const dateString = date.toISOString().split('T')[0];
                    const rateDateString = rateDate.toISOString().split('T')[0];
                    return dateString === rateDateString && rate.price !== undefined;
                  });
                  
                  // Funzione per determinare se la data è bloccata
                  const isBlocked = apartment.rates.some(rate => {
                    const rateDate = new Date(rate.date);
                    const dateString = date.toISOString().split('T')[0];
                    const rateDateString = rateDate.toISOString().split('T')[0];
                    return dateString === rateDateString && rate.isBlocked;
                  });
                  
                  const isPast = isPastDate(date);
                  const isCurrentMonth = date.getMonth() === currentMonth;
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  // Determinare la classe della cella in base al suo stato
                  let cellClass = "border border-gray-200 p-2 text-center relative cursor-pointer h-10";
                  
                  if (isPast) {
                    cellClass += " bg-gray-200 text-gray-500 cursor-not-allowed";
                  } else if (hasBooking) {
                    cellClass += " bg-green-100";
                  } else if (isBlocked) {
                    cellClass += " bg-red-100";
                  } else if (hasPriceRate) {
                    cellClass += " bg-purple-100";
                  } else {
                    cellClass += " bg-blue-100";
                  }
                  
                  if (!isCurrentMonth) {
                    cellClass += " opacity-70";
                  }
                  
                  if (isToday) {
                    cellClass += " ring-2 ring-blue-500";
                  }
                  
                  const dropdownId = `dropdown-${apartment.id}-${date.getTime()}`;
                  
                  return (
                    <td
                      key={`cell-${apartment.id}-${index}`}
                      className={cellClass}
                      onClick={(e) => {
                        if (!isPast) {
                          // Evita di navigare quando si clicca sul pulsante del menu
                          if (!(e.target as HTMLElement).closest('.action-button')) {
                            handleDateClick(apartment.id, date);
                          }
                        }
                      }}
                    >
                      {!isPast && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white bg-opacity-70">
                          <button 
                            className="action-button w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg hover:bg-gray-700 focus:outline-none"
                            onClick={(e) => toggleDropdown(dropdownId, e)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          </button>
                          <div 
                            id={dropdownId}
                            ref={el => dropdownRefs.current[dropdownId] = el}
                            className="hidden absolute z-50 mt-1 w-40 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 top-full"
                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateClick(apartment.id, date);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100"
                            >
                              Vai al calendario
                            </button>
                            {!hasBooking && !isBlocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(apartment.id, date, 'block');
                                  if (dropdownRefs.current[dropdownId]) {
                                    dropdownRefs.current[dropdownId]!.classList.add('hidden');
                                  }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-100"
                              >
                                Blocca
                              </button>
                            )}
                            {!hasBooking && isBlocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(apartment.id, date, 'unblock');
                                  if (dropdownRefs.current[dropdownId]) {
                                    dropdownRefs.current[dropdownId]!.classList.add('hidden');
                                  }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-100"
                              >
                                Sblocca
                              </button>
                            )}
                            {!hasBooking && !isBlocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(apartment.id, date, 'book');
                                  if (dropdownRefs.current[dropdownId]) {
                                    dropdownRefs.current[dropdownId]!.classList.add('hidden');
                                  }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-100"
                              >
                                Prenota
                              </button>
                            )}
                          </div>
                        </div>
                      )}
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
