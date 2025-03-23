'use client';

import { useState, useEffect } from 'react';
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
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Centra automaticamente sulla data attuale all'avvio
  useEffect(() => {
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    
    // Genera il calendario quando si carica la pagina
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    generateCalendarDays(today.getFullYear(), today.getMonth(), daysInMonth);
  }, []);
  
  // Funzione per generare i giorni del calendario
  useEffect(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    generateCalendarDays(currentYear, currentMonth, daysInMonth);
  }, [currentMonth, currentYear]);
  
  // Funzione per generare i giorni del calendario solo per il mese corrente (senza celle vuote)
  const generateCalendarDays = (year: number, month: number, daysInMonth: number) => {
    const days: Date[] = [];
    
    // Aggiungi solo i giorni del mese corrente, senza giorni dei mesi precedenti o successivi
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
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
    router.push(`/apartments/${apartmentId}/calendar?date=${date.toISOString().split('T')[0]}`);
  };
  
  // Funzione per verificare se una data è nel passato
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
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
  
  // Ottieni i giorni della settimana per ogni giorno del mese corrente
  const dayLabels: { [key: number]: string } = {
    0: 'Lun',
    1: 'Mar',
    2: 'Mer',
    3: 'Gio',
    4: 'Ven',
    5: 'Sab',
    6: 'Dom'
  };
  
  // Crea un array con i giorni della settimana corrispondenti ai giorni del mese
  const weekdayHeaders = calendarDays.map(date => {
    const weekday = (date.getDay() + 6) % 7; // Converte 0-6 (Dom-Sab) in 0-6 (Lun-Dom)
    return dayLabels[weekday];
  });
  
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
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
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
          className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
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
          <span>Data passata</span>
        </div>
      </div>
      
      {/* Tabella del calendario - nuova implementazione senza celle vuote */}
      <div className="overflow-x-auto relative">
        <div className="min-w-[1500px]"> {/* Larghezza minima per il calendario */}
          <div className="grid" style={{
            gridTemplateColumns: `minmax(180px, auto) ${calendarDays.map(() => 'minmax(60px, 1fr)').join(' ')}`
          }}>
            {/* Intestazione con appartamento e giorni della settimana */}
            <div className="sticky left-0 z-30 border border-gray-200 bg-gray-100 p-3 font-medium text-left shadow-sm">
              Appartamento
            </div>
            
            {/* Intestazioni dei giorni - mostrano solo i giorni del mese corrente */}
            {calendarDays.map((date, i) => {
              const weekday = (date.getDay() + 6) % 7; // Converte 0-6 (Dom-Sab) in 0-6 (Lun-Dom)
              return (
                <div key={`header-${i}`} className="border border-gray-200 bg-gray-100 p-2 font-medium text-center">
                  <div>{dayLabels[weekday]}</div>
                  <div className="text-lg">{date.getDate()}</div>
                </div>
              );
            })}
            
            {/* Righe per ogni appartamento */}
            {apartments.map((apartment) => (
              <React.Fragment key={apartment.id}>
                <div 
                  className="sticky left-0 z-20 border border-gray-200 p-4 font-medium bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors shadow-sm"
                  onClick={() => handleApartmentClick(apartment.id)}
                >
                  {apartment.data.name}
                </div>
                
                {/* Celle per ogni giorno - senza celle vuote */}
                {calendarDays.map((date, dayIndex) => {
                  // Verifica se c'è una prenotazione per questa data
                  const hasBooking = apartment.bookings.some(booking => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    
                    // Normalizza le date per i confronti
                    checkIn.setHours(0, 0, 0, 0);
                    checkOut.setHours(0, 0, 0, 0);
                    
                    const dateToCheck = new Date(date);
                    dateToCheck.setHours(0, 0, 0, 0);
                    
                    // La data è compresa tra check-in e check-out (incluso il check-in, escluso il check-out)
                    return dateToCheck >= checkIn && dateToCheck < checkOut;
                  });
                  
                  // Trova la prenotazione per questa data (per mostrare dettagli)
                  const bookingForDate = apartment.bookings.find(booking => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    
                    checkIn.setHours(0, 0, 0, 0);
                    checkOut.setHours(0, 0, 0, 0);
                    
                    const dateToCheck = new Date(date);
                    dateToCheck.setHours(0, 0, 0, 0);
                    
                    return dateToCheck >= checkIn && dateToCheck < checkOut;
                  });
                  
                  // Verifica se c'è una tariffa personalizzata per questa data
                  const hasCustomRate = apartment.rates.some(rate => {
                    const rateDate = new Date(rate.date);
                    const dateString = date.toISOString().split('T')[0];
                    const rateDateString = rateDate.toISOString().split('T')[0];
                    return dateString === rateDateString && rate.price !== undefined;
                  });
                  
                  // Verifica se la data è bloccata
                  const isBlocked = apartment.rates.some(rate => {
                    const rateDate = new Date(rate.date);
                    const dateString = date.toISOString().split('T')[0];
                    const rateDateString = rateDate.toISOString().split('T')[0];
                    return dateString === rateDateString && rate.isBlocked;
                  });
                  
                  // Verifica se la data è nel passato
                  const isPast = isPastDate(date);
                  
                  // Verifica se è oggi
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isToday = date.getTime() === today.getTime();
                  
                  // Determina la classe della cella
                  let cellClass = "border border-gray-200 p-4 text-center relative h-20";
                  
                  if (isPast) {
                    cellClass += " bg-gray-200";
                    // Non aggiungiamo text-gray-500 per mantenere visibili le prenotazioni passate
                  } else if (hasBooking) {
                    cellClass += " bg-green-100 hover:bg-green-200 cursor-pointer";
                  } else if (isBlocked) {
                    cellClass += " bg-red-100 hover:bg-red-200 cursor-pointer";
                  } else if (hasCustomRate) {
                    cellClass += " bg-purple-100 hover:bg-purple-200 cursor-pointer";
                  } else {
                    cellClass += " bg-blue-100 hover:bg-blue-200 cursor-pointer";
                  }
                  
                  if (isToday) {
                    cellClass += " rounded-md ring-2 ring-inset ring-blue-500";
                  }
                  
                  return (
                    <div
                      key={`cell-${apartment.id}-${dayIndex}`}
                      className={cellClass}
                      onClick={() => handleDateClick(apartment.id, date)}
                    >
                      <div className="relative w-full h-full">
                        {/* Mostro le prenotazioni sempre, anche per date passate */}
                        {hasBooking && bookingForDate && (
                          <div className="absolute inset-0 flex flex-col justify-center items-center p-1">
                            <div className="text-xs font-medium truncate w-full text-center">
                              {bookingForDate.guestName}
                            </div>
                            <div className="text-xs truncate w-full text-center">
                              {bookingForDate.numberOfGuests} ospiti
                            </div>
                          </div>
                        )}
                        
                        {/* Menu contestuale - visibile al passaggio del mouse, solo per date future */}
                        {!isPast && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                            <div 
                              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white bg-opacity-90 shadow-md hover:bg-opacity-100 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Apri menu contestuale
                                  const dropdown = document.getElementById(`dropdown-${apartment.id}-${date.getDate()}`);
                                  if (dropdown) {
                                    // Nascondi tutti gli altri dropdown
                                    document.querySelectorAll('[id^="dropdown-"]').forEach(el => {
                                      if (el.id !== `dropdown-${apartment.id}-${date.getDate()}`) {
                                        el.classList.add('hidden');
                                      }
                                    });
                                    dropdown.classList.toggle('hidden');
                                  }
                                }}
                                className="flex h-full w-full items-center justify-center rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                              </button>
                              
                              <div 
                                id={`dropdown-${apartment.id}-${date.getDate()}`}
                                className="hidden absolute z-40 top-0 left-full ml-2 w-40 bg-white rounded-lg shadow-lg py-2 border border-gray-200"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDateClick(apartment.id, date);
                                  }}
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                >
                                  <span className="mr-2">📅</span> Calendario
                                </button>
                                
                                {!hasBooking && !isBlocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAction(apartment.id, date, 'block');
                                      document.getElementById(`dropdown-${apartment.id}-${date.getDate()}`)?.classList.add('hidden');
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                                  >
                                    <span className="mr-2">🔒</span> Blocca
                                  </button>
                                )}
                                
                                {!hasBooking && isBlocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAction(apartment.id, date, 'unblock');
                                      document.getElementById(`dropdown-${apartment.id}-${date.getDate()}`)?.classList.add('hidden');
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                  >
                                    <span className="mr-2">🔓</span> Sblocca
                                  </button>
                                )}
                                
                                {!hasBooking && !isBlocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAction(apartment.id, date, 'book');
                                      document.getElementById(`dropdown-${apartment.id}-${date.getDate()}`)?.classList.add('hidden');
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                  >
                                    <span className="mr-2">✅</span> Prenota
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* Script per chiudere i menu contestuali quando si clicca altrove */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('click', function(event) {
            const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
            const isMenuButton = (event.target.tagName === 'BUTTON' || event.target.tagName === 'SVG' || event.target.tagName === 'path') 
                              && event.target.closest('button')?.getAttribute('data-toggle') === 'dropdown';
            
            if (!isMenuButton) {
              dropdowns.forEach(dropdown => {
                if (!dropdown.contains(event.target)) {
                  dropdown.classList.add('hidden');
                }
              });
            }
          });
        `
      }} />
    </div>
  );
}
