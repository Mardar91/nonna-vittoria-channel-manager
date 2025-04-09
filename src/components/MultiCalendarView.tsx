'use client';

import React, { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
  const todayCellRef = useRef<HTMLTableCellElement>(null);
  
  // Crea una data con il fuso orario italiano
  const currentDateItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  const [currentMonth, setCurrentMonth] = useState(currentDateItaly.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateItaly.getFullYear());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Stato per le selezioni multiple
  const [selectedDates, setSelectedDates] = useState<{[key: string]: {[key: string]: Date}}>({});
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditApartmentId, setBulkEditApartmentId] = useState<string | null>(null);
  const [bulkEditPrice, setBulkEditPrice] = useState<number | ''>('');
  const [bulkEditMinStay, setBulkEditMinStay] = useState<number | ''>('');
  const [bulkEditIsBlocked, setBulkEditIsBlocked] = useState<boolean | null>(null);
  
  // Genera i giorni del calendario per il mese corrente
  useEffect(() => {
    try {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const days: Date[] = [];
      
      // Ottieni tutti i giorni del mese corrente
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentYear, currentMonth, i));
      }
      
      setCalendarDays(days);
      
      // Resetta le selezioni quando cambia il mese
      setSelectedDates({});
    } catch (error) {
      console.error("Errore nella generazione dei giorni:", error);
    }
  }, [currentMonth, currentYear]);
  
  // Effetto per scorrere alla data di oggi quando il componente è montato
  useEffect(() => {
    // Aspetta che il DOM sia completamente renderizzato
    setTimeout(() => {
      if (todayCellRef.current) {
        todayCellRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }, 500);
  }, [calendarDays]);
  
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
    try {
      const today = new Date();
      setCurrentMonth(today.getMonth());
      setCurrentYear(today.getFullYear());
      toast.success('Visualizzazione impostata al mese corrente');
      
      // Attendi che il calendario sia aggiornato, poi scorri alla data attuale
      setTimeout(() => {
        if (todayCellRef.current) {
          todayCellRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }, 300);
    } catch (error) {
      console.error("Errore nel tornare ad oggi:", error);
      toast.error("Errore nel tornare ad oggi");
    }
  };
  
  const handleApartmentClick = (apartmentId: string) => {
    router.push(`/apartments/${apartmentId}`);
  };
  
  const handleDateClick = (apartmentId: string, date: Date, event: React.MouseEvent, booking: Booking | null) => {
    try {
      // Verifica se l'elemento cliccato è un checkbox
      if ((event.target as HTMLElement).tagName === 'INPUT') {
        return; // Se è un checkbox, non fare nulla qui
      }
      
      // Crea l'ID del dropdown
      const dropdownId = `dropdown-${apartmentId}-${date.getTime()}`;
      
      // Se è già attivo, chiudilo
      if (activeDropdown === dropdownId) {
        setActiveDropdown(null);
        return;
      }
      
      // Altrimenti attiva questo dropdown
      setActiveDropdown(dropdownId);
      
      // Posiziona il dropdown correttamente
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 170; // Altezza stimata del dropdown in pixel
        
        // Verifica se il dropdown andrebbe fuori dallo schermo nella parte inferiore
        const isNearBottom = rect.bottom + dropdownHeight > viewportHeight;
        
        if (isNearBottom) {
          // Posiziona il dropdown sopra la cella
          dropdown.style.top = `${rect.top - dropdownHeight}px`;
        } else {
          // Posiziona il dropdown sotto la cella
          dropdown.style.top = `${rect.bottom}px`;
        }
        
        // Posiziona orizzontalmente
        dropdown.style.left = `${rect.left}px`;
        
        // Assicurati che il dropdown non vada fuori dalla parte destra dello schermo
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 160; // Larghezza stimata del dropdown in pixel
        
        if (rect.left + dropdownWidth > viewportWidth) {
          dropdown.style.left = `${viewportWidth - dropdownWidth - 10}px`; // 10px di margine
        }
      }
    } catch (error) {
      console.error("Errore nel gestire il click sulla data:", error);
    }
  };
  
  // Funzione per chiudere il dropdown quando il mouse esce dalla cella
  const handleCellMouseLeave = () => {
    // Chiudi il dropdown con un piccolo ritardo per gestire il movimento tra cella e dropdown
    setTimeout(() => {
      setActiveDropdown(null);
    }, 300);
  };
  
  // Funzione per gestire il click sulla checkbox
  const handleCheckboxChange = (apartmentId: string, date: Date, isChecked: boolean) => {
    try {
      const dateKey = date.toISOString();
      
      setSelectedDates(prev => {
        const newSelectedDates = { ...prev };
        
        if (!newSelectedDates[apartmentId]) {
          newSelectedDates[apartmentId] = {};
        }
        
        if (isChecked) {
          newSelectedDates[apartmentId][dateKey] = date;
        } else {
          delete newSelectedDates[apartmentId][dateKey];
          
          // Se non ci sono più date selezionate per questo appartamento, rimuovi l'appartamento
          if (Object.keys(newSelectedDates[apartmentId]).length === 0) {
            delete newSelectedDates[apartmentId];
          }
        }
        
        return newSelectedDates;
      });
    } catch (error) {
      console.error("Errore nel gestire la selezione della data:", error);
    }
  };
  
  // Funzione per aprire il modal di modifica in blocco
  const openBulkEditModal = (apartmentId: string) => {
    setBulkEditApartmentId(apartmentId);
    setBulkEditPrice('');
    setBulkEditMinStay('');
    setBulkEditIsBlocked(null);
    setIsBulkEditModalOpen(true);
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
  
  // Funzione per salvare le modifiche in blocco
  const handleBulkEditSave = async () => {
    if (!bulkEditApartmentId) return;
    
    setLoading(true);
    
    try {
      const selectedApartmentDates = selectedDates[bulkEditApartmentId] || {};
      const datesArray = Object.values(selectedApartmentDates);
      
      if (datesArray.length === 0) {
        toast.error("Nessuna data selezionata");
        return;
      }
      
      // Ordina le date
      datesArray.sort((a, b) => a.getTime() - b.getTime());
      
      // Crea l'oggetto dati per l'aggiornamento
      const updateData: any = {};
      
      if (bulkEditPrice !== '') {
        updateData.price = Number(bulkEditPrice);
      }
      
      if (bulkEditMinStay !== '') {
        updateData.minStay = Number(bulkEditMinStay);
      }
      
      if (bulkEditIsBlocked !== null) {
        updateData.isBlocked = bulkEditIsBlocked;
      }
      
      // Chiamata all'API per l'aggiornamento in blocco
      const response = await fetch(`/api/apartments/${bulkEditApartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: datesArray[0].toISOString(),
          endDate: datesArray[datesArray.length - 1].toISOString(),
          ...updateData
        }),
      });
      
      if (!response.ok) {
        throw new Error("Errore nell'aggiornamento");
      }
      
      toast.success(`Modifiche applicate a ${datesArray.length} date`);
      
      // Chiudi il modal e resetta le selezioni
      setIsBulkEditModalOpen(false);
      setSelectedDates(prev => {
        const newSelectedDates = { ...prev };
        delete newSelectedDates[bulkEditApartmentId];
        return newSelectedDates;
      });
      
      // Aggiorna la pagina
      router.refresh();
    } catch (error) {
      console.error("Errore nell'aggiornamento in blocco:", error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setLoading(false);
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
      
      // Chiudi il dropdown attivo
      setActiveDropdown(null);
      
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
          
          return booking.status === 'confirmed' && dateToCheck >= checkIn && dateToCheck < checkOut;
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
  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' | 'single' => {
    try {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      
      // Caso di prenotazione di un solo giorno
      if (new Date(checkOut).getTime() - new Date(checkIn).getTime() === 86400000) {
        return 'single';
      }
      
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
  
  // Verifica se una data è selezionata
  const isDateSelected = (apartmentId: string, date: Date): boolean => {
    try {
      const apartmentDates = selectedDates[apartmentId] || {};
      return !!apartmentDates[date.toISOString()];
    } catch (error) {
      console.error("Errore nel verificare se la data è selezionata:", error);
      return false;
    }
  };
  
  // Ottieni il numero di date selezionate per un appartamento
  const getSelectedDatesCount = (apartmentId: string): number => {
    try {
      const apartmentDates = selectedDates[apartmentId] || {};
      return Object.keys(apartmentDates).length;
    } catch (error) {
      console.error("Errore nel contare le date selezionate:", error);
      return 0;
    }
  };
  
  // Helper per ottenere l'indice di una data nell'array calendarDays
  const getDateIndex = (date: Date): number => {
    return calendarDays.findIndex(day => 
      day.getDate() === date.getDate() && 
      day.getMonth() === date.getMonth() && 
      day.getFullYear() === date.getFullYear()
    );
  };
  
  // NUOVO: Helper per raggruppare le prenotazioni per l'appartamento
  const getBookingStrips = (apartment: ApartmentWithBookings): Array<{booking: Booking, startIdx: number, endIdx: number}> => {
    try {
      const bookingStrips: Array<{booking: Booking, startIdx: number, endIdx: number}> = [];
      
      // Filtra solo le prenotazioni confermate
      const confirmedBookings = apartment.bookings.filter(booking => booking.status === 'confirmed');
      
      for (const booking of confirmedBookings) {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        
        // Trova l'indice nel calendario per check-in
        let startIdx = calendarDays.findIndex(day => {
          const dayDate = new Date(day);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate.getTime() === checkIn.getTime();
        });
        
        // Se il check-in è prima del mese visualizzato, imposta all'inizio
        if (startIdx === -1) {
          // Verifica se il check-in è prima del primo giorno del calendario
          if (checkIn < calendarDays[0]) {
            startIdx = 0;
          } else {
            // Il check-in è dopo l'ultimo giorno del calendario
            continue;
          }
        }
        
        // Trova l'indice nel calendario per il giorno prima del check-out
        const dayBeforeCheckout = new Date(checkOut);
        dayBeforeCheckout.setDate(dayBeforeCheckout.getDate() - 1);
        
        let endIdx = calendarDays.findIndex(day => {
          const dayDate = new Date(day);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate.getTime() === dayBeforeCheckout.getTime();
        });
        
        // Se il check-out è dopo il mese visualizzato, imposta alla fine
        if (endIdx === -1) {
          // Verifica se il check-out è dopo l'ultimo giorno del calendario
          if (dayBeforeCheckout > calendarDays[calendarDays.length - 1]) {
            endIdx = calendarDays.length - 1;
          } else {
            // Il check-out è prima del primo giorno del calendario
            continue;
          }
        }
        
        // Se la prenotazione è visibile nel mese corrente, aggiungila
        if (startIdx <= calendarDays.length - 1 && endIdx >= 0) {
          bookingStrips.push({
            booking,
            startIdx: Math.max(0, startIdx),
            endIdx: Math.min(calendarDays.length - 1, endIdx)
          });
        }
      }
      
      return bookingStrips;
    } catch (error) {
      console.error("Errore nel calcolare le strisce di prenotazione:", error);
      return [];
    }
  };
  
  // Controlla se c'è almeno un giorno da visualizzare
  if (calendarDays.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>Caricamento del calendario...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header del calendario - adattato per mobile */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold mr-6 hidden md:block">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          {/* Versione mobile del titolo del mese */}
          <div className="flex items-center md:hidden">
            <span className="text-lg font-semibold">
              {monthNames[currentMonth]} {currentYear}
            </span>
          </div>
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
          className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-600 transition-colors shadow-sm"
          disabled={loading}
        >
          <CalendarIcon className="w-4 h-4 mr-1" />
          Oggi
        </button>
      </div>
      
      {/* Legenda - nascondi su mobile */}
      <div className="flex flex-wrap items-center gap-4 mb-4 hidden md:flex">
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
          <div className="w-4 h-4 bg-indigo-100 border border-indigo-300 mr-2"></div>
          <span>Selezionato</span>
        </div>
      </div>
      
      {/* Calendario principale - adattato per mobile */}
      <div className="overflow-x-auto pb-4 md:pb-6">
        <table className="min-w-full border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {/* Intestazione appartamento - ridotta per mobile */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 py-3 px-2 md:px-4 min-w-[100px] md:min-w-[180px] text-left font-medium">
                Appartamento
              </th>
              
              {/* Intestazioni dei giorni - aumentata per mobile */}
              {calendarDays.map((day, index) => {
                const dateInfo = formatDate(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <th 
                    key={index} 
                    className={`border border-gray-200 py-1 min-w-[75px] md:min-w-[80px] text-center ${
                      isCurrentDay ? "bg-blue-50" : "bg-gray-100"
                    }`}
                  >
                    <div className="font-medium text-xs md:text-sm">{dateInfo.weekday}</div>
                    <div className={`text-base md:text-lg ${isCurrentDay ? "font-bold text-blue-600" : ""}`}>
                      {dateInfo.day}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody>
            {/* Righe per ogni appartamento */}
            {apartments.map((apartment) => {
              // Conta le date selezionate per questo appartamento
              const selectedCount = getSelectedDatesCount(apartment.id);
              
              // NUOVO: Ottieni le strisce di prenotazione per questo appartamento
              const bookingStrips = getBookingStrips(apartment);
              
              return (
                <tr key={apartment.id} className="relative">
                  {/* Nome appartamento - ridotta per mobile */}
                  <td 
                    className="sticky left-0 z-10 bg-white border border-gray-200 py-3 px-2 md:px-4 font-medium"
                  >
                    <div className="flex justify-between items-center">
                      <span 
                        className="cursor-pointer hover:text-blue-600 truncate text-sm md:text-base"
                        onClick={() => handleApartmentClick(apartment.id)}
                      >
                        {apartment.data?.name || "Appartamento"}
                      </span>
                      
                      {/* Pulsante modifica in blocco - visibile solo se ci sono date selezionate */}
                      {selectedCount > 0 && (
                        <button
                          className="ml-1 md:ml-2 p-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs flex items-center"
                          onClick={() => openBulkEditModal(apartment.id)}
                        >
                          <AdjustmentsHorizontalIcon className="w-4 h-4 md:mr-1" />
                          <span className="hidden sm:inline">{selectedCount}</span>
                        </button>
                      )}
                    </div>
                  </td>
                  
                  {/* Celle per ogni giorno */}
                  {calendarDays.map((day, dayIndex) => {
                    const isPast = isPastDate(day);
                    const isCurrentDay = isToday(day);
                    const isBlocked = isDateBlocked(apartment, day);
                    const isSelected = isDateSelected(apartment.id, day);
                    
                    // Cerca se questa data è dentro una prenotazione
                    const booking = getBookingForDate(apartment, day);
                    
                    // Ottieni il prezzo per questa data
                    const price = getPriceForDate(apartment, day);
                    
                    // Determina la classe della cella
                    let cellClass = "border border-gray-200 p-1 relative h-14 md:h-16 ";
                    
                    if (isSelected) {
                      cellClass += "bg-indigo-100 ";
                    } else if (isCurrentDay) {
                      cellClass += "bg-blue-50 ";
                    } else if (isPast) {
                      // Cella per data passata - stile più chiaro
                      cellClass += "bg-gray-100 ";
                    } else if (booking) {
                      // Cella prenotata - MODIFICATO: trasparente per mostrare le strisce
                      cellClass += "bg-transparent ";
                    } else if (isBlocked) {
                      // Cella bloccata - rossa
                      cellClass += "bg-red-50 ";
                    } else {
                      // Cella disponibile - blu chiaro
                      cellClass += "bg-blue-50 ";
                    }
                    
                    // Genera ID del dropdown
                    const dropdownId = `dropdown-${apartment.id}-${day.getTime()}`;
                    const isDropdownActive = activeDropdown === dropdownId;
                    
                    return (
                      <td 
                        key={dayIndex} 
                        className={cellClass}
                        onClick={(e) => handleDateClick(apartment.id, day, e, booking)}
                        onMouseLeave={handleCellMouseLeave}
                        ref={isCurrentDay ? todayCellRef : null}
                      >
                        <div className="flex flex-col h-full">
                          {/* Prezzo */}
                          <div className="text-center text-xs md:text-sm font-medium">
                            {!booking && !isBlocked && `${price}€`}
                          </div>
                          
                          {/* Checkbox per date future disponibili */}
                          {!isPast && !booking && !isBlocked && (
                            <div className="text-center mt-1">
                              <input 
                                type="checkbox" 
                                className="h-3 w-3 md:h-4 md:w-4 text-blue-600 transition duration-150 ease-in-out" 
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleCheckboxChange(apartment.id, day, e.target.checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          
                          {/* Visualizzazione delle date bloccate */}
                          {isBlocked && !booking && (
                            <div className="h-full flex items-center justify-center">
                              <div className="text-xs font-medium text-red-600">Bloccato</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Menu contestuale dropdown */}
                        <div 
                          id={dropdownId}
                          className={`fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 ${isDropdownActive ? '' : 'hidden'}`}
                        >
                          <div className="py-1">
                            <button
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => {
                                setActiveDropdown(null);
                                router.push(`/apartments/${apartment.id}/calendar?date=${day.toISOString().split('T')[0]}`);
                              }}
                            >
                              <span className="mr-2">📅</span> Calendario
                            </button>
                            
                            {/* Opzioni per celle con prenotazione */}
                            {booking && (
                              <button
                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => {
                                  setActiveDropdown(null);
                                  router.push(`/bookings/${booking.id}`);
                                }}
                              >
                                <span className="mr-2">👁️</span> Dettagli Prenotazione
                              </button>
                            )}
                            
                            {booking && (
                              <button
                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => {
                                  setActiveDropdown(null);
                                  router.push(`/bookings/${booking.id}/edit`);
                                }}
                              >
                                <span className="mr-2">✏️</span> Modifica Prenotazione
                              </button>
                            )}
                            
                            {/* Opzioni per celle disponibili */}
                            {!booking && !isBlocked && (
                              <button
                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700"
                                onClick={() => {
                                  handleQuickAction(apartment.id, day, 'block');
                                }}
                              >
                                <span className="mr-2">🔒</span> Blocca
                              </button>
                            )}
                            
                            {/* Opzioni per celle bloccate */}
                            {!booking && isBlocked && (
                              <button
                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                                onClick={() => {
                                  handleQuickAction(apartment.id, day, 'unblock');
                                }}
                              >
                                <span className="mr-2">🔓</span> Sblocca
                              </button>
                            )}
                            
                            {/* Opzione prenota sempre disponibile se non c'è prenotazione */}
                            {!booking && (
                              <button
                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                                onClick={() => {
                                  handleQuickAction(apartment.id, day, 'book');
                                }}
                              >
                                <span className="mr-2">✅</span> Prenota
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  
                  {/* NUOVO: Strisce di prenotazione sovrapposte */}
                  {bookingStrips.map((strip, stripIndex) => {
                    const { booking, startIdx, endIdx } = strip;
                    const stripWidth = (endIdx - startIdx + 1) * 100; // Larghezza percentuale basata sul numero di celle
                    
                    // Calcola la posizione left in base alle celle del calendario
                    const leftOffset = startIdx * 100 / calendarDays.length;
                    const widthPercentage = stripWidth / calendarDays.length;
                    
                    return (
                      <div 
                        key={`${apartment.id}-booking-${booking.id}-${stripIndex}`}
                        className="absolute z-5 top-0 h-14 md:h-16 flex items-center pointer-events-none"
                        style={{
                          left: `calc(180px + ${leftOffset}%)`, // 180px è la larghezza della prima colonna
                          width: `${widthPercentage}%`,
                          marginTop: '1px', // Piccolo margine per allineare con le celle
                        }}
                      >
                        <div className="h-full w-full bg-green-100 border border-green-300 rounded-md flex flex-col justify-center px-2 overflow-hidden">
                          {/* Contenuto della striscia */}
                          <div className="text-xs font-semibold truncate max-w-full">
                            {booking.guestName}
                          </div>
                          <div className="text-xs truncate">{booking.numberOfGuests} ospiti</div>
                          <div className="text-xs font-medium truncate">{booking.totalPrice}€</div>
                        </div>
                      </div>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pulsanti degli appartamenti - visibili solo su mobile */}
      <div className="md:hidden mt-6 mb-16">
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
      
      {/* Modal per la modifica in blocco */}
      <Transition.Root show={isBulkEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsBulkEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <div className="mt-3">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Modifica in blocco date selezionate
                      </Dialog.Title>
                      
                      <div className="mt-4 space-y-4">
                        {/* Prezzo */}
                        <div>
                          <label htmlFor="bulkPrice" className="block text-sm font-medium text-gray-700">
                            Prezzo (€)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              id="bulkPrice"
                              value={bulkEditPrice}
                              onChange={(e) => setBulkEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              min="0"
                              step="0.01"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Lascia vuoto per non modificare"
                            />
                          </div>
                        </div>
                        
                        {/* Soggiorno minimo */}
                        <div>
                          <label htmlFor="bulkMinStay" className="block text-sm font-medium text-gray-700">
                            Soggiorno minimo (notti)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              id="bulkMinStay"
                              value={bulkEditMinStay}
                              onChange={(e) => setBulkEditMinStay(e.target.value === '' ? '' : Number(e.target.value))}
                              min="1"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Lascia vuoto per non modificare"
                            />
                          </div>
                        </div>
                        
                        {/* Blocco date */}
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-3 items-center">
                            <input
                              type="radio"
                              id="bulk-blocked-true"
                              name="bulk-blocked"
                              checked={bulkEditIsBlocked === true}
                              onChange={() => setBulkEditIsBlocked(true)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="bulk-blocked-true" className="text-sm text-gray-700">
                              Blocca date
                            </label>
                          </div>
                          
                          <div className="flex space-x-3 items-center">
                            <input
                              type="radio"
                              id="bulk-blocked-false"
                              name="bulk-blocked"
                              checked={bulkEditIsBlocked === false}
                              onChange={() => setBulkEditIsBlocked(false)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="bulk-blocked-false" className="text-sm text-gray-700">
                              Sblocca date
                            </label>
                          </div>
                          
                          <div className="flex space-x-3 items-center">
                            <input
                              type="radio"
                              id="bulk-blocked-unchanged"
                              name="bulk-blocked"
                              checked={bulkEditIsBlocked === null}
                              onChange={() => setBulkEditIsBlocked(null)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="bulk-blocked-unchanged" className="text-sm text-gray-700">
                              Non modificare
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2"
                      onClick={handleBulkEditSave}
                      disabled={loading}
                    >
                      {loading ? 'Salvataggio...' : 'Salva modifiche'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                      onClick={() => setIsBulkEditModalOpen(false)}
                    >
                      Annulla
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
