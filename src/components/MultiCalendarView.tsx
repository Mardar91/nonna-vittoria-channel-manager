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
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Stato per la selezione multipla di date
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{date: Date, apartmentId: string}[]>([]);
  
  // Genera i giorni del calendario per il mese corrente
  useEffect(() => {
    try {
      generateCalendarForMonth(currentYear, currentMonth);
    } catch (error) {
      console.error("Errore nella generazione del calendario:", error);
      // In caso di errore, creare un array di date vuoto
      setCalendarDays([]);
    }
  }, [currentYear, currentMonth]);
  
  // Funzione per generare il calendario di un mese specifico
  const generateCalendarForMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month, daysInMonth);
    
    // Calcola il primo giorno della settimana (0 = Lunedì nella nostra griglia)
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Converte da domenica = 0 a lunedì = 0
    
    const calendarDays: Date[] = [];
    
    // Aggiungi i giorni del mese precedente per completare la prima settimana
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = new Date(year, month, 1 - (firstDayOfWeek - i));
      calendarDays.push(day);
    }
    
    // Aggiungi tutti i giorni del mese corrente
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(year, month, i));
    }
    
    // Aggiungi i giorni del mese successivo per completare l'ultima settimana
    const lastDayOfWeek = (lastDayOfMonth.getDay() + 6) % 7;
    const daysToAdd = 6 - lastDayOfWeek;
    
    for (let i = 1; i <= daysToAdd; i++) {
      calendarDays.push(new Date(year, month + 1, i));
    }
    
    setCalendarDays(calendarDays);
  };
  
  // Vai al mese precedente
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  // Vai al mese successivo
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Vai al mese corrente
  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    toast.success('Visualizzazione impostata al mese corrente');
  };
  
  // Funzione per gestire il click su una cella
  const handleCellClick = (date: Date, apartmentId: string) => {
    if (selectionMode) {
      // Modalità selezione: aggiungi o rimuovi dalla selezione
      const existingSelection = selectedDates.findIndex(
        item => isSameDay(item.date, date) && item.apartmentId === apartmentId
      );
      
      if (existingSelection >= 0) {
        // Rimuovi dalla selezione
        const newSelection = [...selectedDates];
        newSelection.splice(existingSelection, 1);
        setSelectedDates(newSelection);
      } else {
        // Aggiungi alla selezione
        setSelectedDates([...selectedDates, { date, apartmentId }]);
      }
    } else {
      // Mostra il menu contestuale
      // Invece di navigare direttamente, apriamo un menu o un popup
      openContextMenu(date, apartmentId);
    }
  };
  
  // Funzione per aprire il menu contestuale
  const openContextMenu = (date: Date, apartmentId: string) => {
    try {
      // Trova e visualizza il menu contestuale per questa cella
      const menuId = `dropdown-${apartmentId}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const menu = document.getElementById(menuId);
      
      // Nascondi tutti gli altri menu prima di mostrare questo
      document.querySelectorAll('[id^="dropdown-"]').forEach(el => {
        if (el.id !== menuId) {
          el.classList.add('hidden');
        }
      });
      
      // Mostra o nascondi il menu
      if (menu) {
        menu.classList.toggle('hidden');
      }
    } catch (error) {
      console.error("Errore nell'apertura del menu contestuale:", error);
    }
  };
  
  // Funzione per verificare se due date sono uguali (ignora l'ora)
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
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
  
  // Funzione per ottenere il prezzo per una data specifica
  const getPriceForDate = (apartment: ApartmentWithBookings, date: Date): number => {
    try {
      // Verifica se ci sono prenotazioni per questa data
      const booking = getBookingForDate(apartment, date);
      
      if (booking) {
        // Calcola il prezzo giornaliero dalla prenotazione
        const days = Math.max(1, (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
        return booking.totalPrice / days;
      }
      
      // Verifica se c'è una tariffa personalizzata
      const customRate = apartment.rates.find(rate => {
        try {
          const rateDate = new Date(rate.date);
          return isSameDay(rateDate, date) && rate.price !== undefined;
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
      
      if (isSameDay(dateToCheck, checkIn)) {
        return 'start';
      }
      
      const dayBeforeCheckout = new Date(checkOut);
      dayBeforeCheckout.setDate(dayBeforeCheckout.getDate() - 1);
      
      if (isSameDay(dateToCheck, dayBeforeCheckout)) {
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
          return isSameDay(rateDate, date) && rate.isBlocked;
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
  const isDateSelected = (date: Date, apartmentId: string): boolean => {
    return selectedDates.some(item => 
      isSameDay(item.date, date) && item.apartmentId === apartmentId
    );
  };
  
  // Verifica se la data è oggi
  const isToday = (date: Date): boolean => {
    try {
      const today = new Date();
      return isSameDay(date, today);
    } catch (error) {
      console.error("Errore nel verificare se la data è oggi:", error);
      return false;
    }
  };
  
  // Funzione per applicare modifiche in blocco alle date selezionate
  const applyBulkChanges = async (changes: {price?: number, minStay?: number, isBlocked?: boolean}) => {
    setLoading(true);
    
    try {
      // Raggruppa le date selezionate per appartamento
      const groupedByApartment: {[key: string]: Date[]} = {};
      
      selectedDates.forEach(item => {
        if (!groupedByApartment[item.apartmentId]) {
          groupedByApartment[item.apartmentId] = [];
        }
        groupedByApartment[item.apartmentId].push(item.date);
      });
      
      // Applica le modifiche per ogni appartamento
      const promises = Object.entries(groupedByApartment).map(async ([apartmentId, dates]) => {
        // Ordina le date
        dates.sort((a, b) => a.getTime() - b.getTime());
        
        // Per ogni data, applica le modifiche
        const updatePromises = dates.map(date => 
          fetch(`/api/apartments/${apartmentId}/rates`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: date.toISOString(),
              ...changes
            }),
          })
        );
        
        return Promise.all(updatePromises);
      });
      
      await Promise.all(promises);
      
      toast.success(`Modifiche applicate a ${selectedDates.length} date`);
      
      // Esci dalla modalità selezione e pulisci la selezione
      setSelectionMode(false);
      setSelectedDates([]);
      
      // Aggiorna la pagina
      router.refresh();
    } catch (error) {
      console.error("Errore nell'applicare le modifiche in blocco:", error);
      toast.error("Si è verificato un errore nell'applicare le modifiche");
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per gestire le azioni rapide
  const handleQuickAction = async (apartmentId: string, date: Date, action: 'calendar' | 'block' | 'unblock' | 'book') => {
    try {
      if (action === 'calendar') {
        // Naviga alla vista calendario dell'appartamento
        router.push(`/apartments/${apartmentId}/calendar?date=${date.toISOString().split('T')[0]}`);
      } else if (action === 'block' || action === 'unblock') {
        setLoading(true);
        
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
        router.refresh();
      } else if (action === 'book') {
        // Naviga alla pagina di creazione prenotazione
        router.push(`/bookings/new?apartmentId=${apartmentId}&checkIn=${date.toISOString().split('T')[0]}`);
      }
    } catch (error) {
      console.error("Errore nell'eseguire l'azione rapida:", error);
      toast.error("Si è verificato un errore");
    } finally {
      if (action === 'block' || action === 'unblock') {
        setLoading(false);
      }
    }
  };
  
  // Nomi dei giorni della settimana
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  // Nomi dei mesi
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  // Formatta il giorno in numero
  const formatDay = (date: Date): number => {
    return date.getDate();
  };
  
  // Controlla se il giorno appartiene al mese corrente
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };
  
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
        
        <div className="flex space-x-2">
          {/* Pulsante modalità selezione */}
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedDates([]);
              }
            }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectionMode 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
            disabled={loading}
          >
            {selectionMode ? 'Annulla Selezione' : 'Seleziona Date'}
          </button>
          
          {/* Bottoni per applicare modifiche in blocco */}
          {selectionMode && selectedDates.length > 0 && (
            <>
              <button
                onClick={() => applyBulkChanges({ isBlocked: true })}
                className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                disabled={loading}
              >
                Blocca Selezionate
              </button>
              <button
                onClick={() => applyBulkChanges({ isBlocked: false })}
                className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                disabled={loading}
              >
                Sblocca Selezionate
              </button>
              <button
                onClick={() => {
                  // Apri una finestra modale per inserire prezzo e soggiorno minimo
                  const price = prompt('Inserisci il nuovo prezzo (lascia vuoto per non modificare):');
                  const minStay = prompt('Inserisci il nuovo soggiorno minimo (lascia vuoto per non modificare):');
                  
                  const changes: {price?: number, minStay?: number} = {};
                  if (price && !isNaN(parseFloat(price))) {
                    changes.price = parseFloat(price);
                  }
                  if (minStay && !isNaN(parseInt(minStay))) {
                    changes.minStay = parseInt(minStay);
                  }
                  
                  if (Object.keys(changes).length > 0) {
                    applyBulkChanges(changes);
                  }
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                Modifica Prezzo/Soggiorno
              </button>
            </>
          )}
          
          {/* Tasto "Oggi" */}
          <button
            onClick={goToCurrentMonth}
            className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors shadow-sm"
            disabled={loading}
          >
            <CalendarIcon className="w-4 h-4 mr-1" />
            Oggi
          </button>
        </div>
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
        {selectionMode && (
          <div className="flex items-center">
            <div className="w-4 h-4 bg-indigo-100 border border-indigo-500 mr-2"></div>
            <span>Selezionato ({selectedDates.length})</span>
          </div>
        )}
      </div>
      
      {/* Calendario */}
      <div className="overflow-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {/* Intestazione appartamento */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 py-3 px-4 min-w-[160px] text-left font-medium">
                Appartamento
              </th>
              
              {/* Intestazioni dei giorni della settimana */}
              {weekdayNames.map((day, i) => (
                <th key={i} className="border border-gray-200 py-2 px-2 text-center font-medium bg-gray-100">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* Intestazioni dei numeri dei giorni */}
            <tr>
              <td className="sticky left-0 z-10 bg-white border border-gray-200 py-2 px-4 font-medium">
                Giorno
              </td>
              
              {calendarDays.slice(0, 7).map((_, dayOfWeekIndex) => {
                // Trova i giorni corrispondenti a questa colonna
                const daysInThisColumn = calendarDays.filter((_, i) => i % 7 === dayOfWeekIndex);
                
                return (
                  <td key={dayOfWeekIndex} className="border border-gray-200 p-0 align-top">
                    <div className="grid grid-cols-1 divide-y divide-gray-200">
                      {daysInThisColumn.map((day, weekIndex) => {
                        const dayNum = formatDay(day);
                        const isThisMonth = isCurrentMonth(day);
                        const isCurrentDay = isToday(day);
                        
                        return (
                          <div 
                            key={weekIndex} 
                            className={`p-1 text-center font-medium ${
                              isThisMonth ? 'bg-white' : 'bg-gray-100 text-gray-500'
                            } ${
                              isCurrentDay ? 'text-blue-600 font-bold' : ''
                            }`}
                          >
                            {dayNum}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Righe per ogni appartamento */}
            {apartments.map((apartment) => (
              <tr key={apartment.id}>
                {/* Nome appartamento */}
                <td 
                  className="sticky left-0 z-10 bg-white border border-gray-200 py-3 px-4 font-medium hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/apartments/${apartment.id}`)}
                >
                  {apartment.data?.name || "Appartamento"}
                </td>
                
                {/* Celle per ogni giorno della settimana */}
                {calendarDays.slice(0, 7).map((_, dayOfWeekIndex) => {
                  // Trova i giorni corrispondenti a questa colonna
                  const daysInThisColumn = calendarDays.filter((_, i) => i % 7 === dayOfWeekIndex);
                  
                  return (
                    <td key={dayOfWeekIndex} className="border border-gray-200 p-0 align-top">
                      <div className="grid grid-cols-1 divide-y divide-gray-200">
                        {daysInThisColumn.map((day, weekIndex) => {
                          const isPast = isPastDate(day);
                          const isCurrentDay = isToday(day);
                          const isThisMonth = isCurrentMonth(day);
                          const booking = getBookingForDate(apartment, day);
                          const isBlocked = isDateBlocked(apartment, day);
                          const isSelected = isDateSelected(day, apartment.id);
                          
                          // Ottieni il prezzo per questa data
                          const price = isThisMonth ? getPriceForDate(apartment, day) : 0;
                          
                          // Determina la classe della cella
                          let cellClass = "p-1 relative h-16 ";
                          
                          if (!isThisMonth) {
                            cellClass += "bg-gray-100 text-gray-400 ";
                          } else if (isSelected) {
                            cellClass += "bg-indigo-100 ";
                          } else if (isCurrentDay) {
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
                            <div 
                              key={weekIndex} 
                              className={cellClass}
                              onClick={() => isThisMonth && !isPast && handleCellClick(day, apartment.id)}
                            >
                              <div className="flex flex-col h-full">
                                {/* Prezzo - solo per date di questo mese */}
                                {isThisMonth && !booking && !isBlocked && (
                                  <div className="text-center text-sm font-medium">
                                    {price}€
                                  </div>
                                )}
                                
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
                                      </div>
                                    </div>
                                  )}
                                  
                                  {isBlocked && !booking && (
                                    <div className="text-xs font-medium text-red-600">Bloccato</div>
                                  )}
                                </div>
                                
                                {/* Menu contestuale - visibile al passaggio del mouse */}
                                {isThisMonth && !isPast && !selectionMode && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                                    <div 
                                      className="relative z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white bg-opacity-90 shadow-md hover:bg-opacity-100"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button 
                                        className="flex h-full w-full items-center justify-center rounded-full text-gray-700 hover:text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openContextMenu(day, apartment.id);
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                        </svg>
                                      </button>
                                      
                                      {/* Menu contestuale */}
                                      <div 
                                        id={`dropdown-${apartment.id}-${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                                        className="hidden absolute z-40 top-0 left-full ml-2 w-40 bg-white rounded-lg shadow-lg py-2 border border-gray-200"
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickAction(apartment.id, day, 'calendar');
                                          }}
                                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                        >
                                          <span className="mr-2">📅</span> Calendario
                                        </button>
                                        
                                        {!booking && !isBlocked && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleQuickAction(apartment.id, day, 'block');
                                            }}
                                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700"
                                          >
                                            <span className="mr-2">🔒</span> Blocca
                                          </button>
                                        )}
                                        
                                        {!booking && isBlocked && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleQuickAction(apartment.id, day, 'unblock');
                                            }}
                                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                                          >
                                            <span className="mr-2">🔓</span> Sblocca
                                          </button>
                                        )}
                                        
                                        {!booking && !isBlocked && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleQuickAction(apartment.id, day, 'book');
                                            }}
                                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
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
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Script per chiudere i menu contestuali quando si clicca altrove */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('click', function(event) {
            const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
            const isMenuButton = (event.target.tagName === 'BUTTON' || event.target.tagName === 'SVG' || event.target.tagName === 'path') 
                              && event.target.closest('button');
            
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
