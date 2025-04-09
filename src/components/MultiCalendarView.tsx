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
        // Usa UTC per evitare problemi di fuso orario nel calcolo dei giorni
        days.push(new Date(Date.UTC(currentYear, currentMonth, i)));
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
          block: 'nearest', // 'center' potrebbe non essere sempre ideale
          inline: 'center'
        });
      }
    }, 500); // Leggero ritardo per assicurarsi che tutto sia pronto
  }, [calendarDays]); // Dipendenza da calendarDays per rieseguire se cambiano i giorni

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
            block: 'nearest',
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
      // Verifica se l'elemento cliccato è un checkbox o parte della barra di prenotazione
      const targetElement = event.target as HTMLElement;
      if (targetElement.tagName === 'INPUT' || targetElement.closest('.booking-bar')) {
        return; // Non aprire il dropdown se si clicca sul checkbox o sulla barra
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

      // Posiziona il dropdown correttamente (logica esistente)
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const dropdownHeight = dropdown.offsetHeight > 0 ? dropdown.offsetHeight : 170; // Usa l'altezza reale se disponibile

          // Verifica se il dropdown andrebbe fuori dallo schermo nella parte inferiore
          const isNearBottom = rect.bottom + dropdownHeight > viewportHeight - 20; // Aggiungi un margine

          if (isNearBottom && rect.top > dropdownHeight) {
              // Posiziona il dropdown sopra la cella
              dropdown.style.top = `${rect.top + window.scrollY - dropdownHeight}px`;
          } else {
              // Posiziona il dropdown sotto la cella
              dropdown.style.top = `${rect.bottom + window.scrollY}px`;
          }

          // Posiziona orizzontalmente
          const viewportWidth = window.innerWidth;
          const dropdownWidth = dropdown.offsetWidth > 0 ? dropdown.offsetWidth : 160; // Usa larghezza reale
          let leftPosition = rect.left + window.scrollX;

          // Assicurati che il dropdown non vada fuori dalla parte destra dello schermo
          if (leftPosition + dropdownWidth > viewportWidth) {
              leftPosition = viewportWidth - dropdownWidth - 10; // 10px di margine
          }
          // Assicurati che il dropdown non vada fuori dalla parte sinistra
          if (leftPosition < 0) {
              leftPosition = 10;
          }

          dropdown.style.left = `${leftPosition}px`;
      }
    } catch (error) {
      console.error("Errore nel gestire il click sulla data:", error);
    }
  };

  // Funzione per chiudere il dropdown
  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Listener per chiudere il dropdown cliccando fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Se il click è su un elemento che apre il dropdown o dentro il dropdown, non chiudere
      if ((event.target as HTMLElement).closest('[id^="dropdown-"]') || (event.target as HTMLElement).closest('td[data-has-dropdown]')) {
        return;
      }
      closeDropdown();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Esegui solo al mount

  // Funzione per gestire il click sulla checkbox
  const handleCheckboxChange = (apartmentId: string, date: Date, isChecked: boolean) => {
    try {
      const dateKey = date.toISOString().split('T')[0]; // Usa solo la parte della data YYYY-MM-DD

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

  // Funzione per verificare se una data è nel passato (ignorando l'ora)
  const isPastDate = (date: Date): boolean => {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Confronta solo le date UTC
      const dateToCheck = new Date(date);
      dateToCheck.setUTCHours(0, 0, 0, 0);
      return dateToCheck < today;
    } catch (error) {
      console.error("Errore nel controllare se la data è passata:", error);
      return false;
    }
  };

  // Funzione per formattare la data nel formato "Mar 20"
  const formatDate = (date: Date): { weekday: string; day: number } => {
    try {
      // Usa le funzioni Intl per la localizzazione corretta
      const weekday = date.toLocaleDateString('it-IT', { weekday: 'short', timeZone: 'UTC' });
      const day = date.getUTCDate(); // Usa getUTCDate perché le date sono UTC
      return {
        weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), // Capitalizza
        day: day
      };
    } catch (error) {
      console.error("Errore nel formattare la data:", error);
      return { weekday: "", day: 0 };
    }
  };

  // Funzione per ottenere il prezzo per una data specifica
  const getPriceForDate = (apartment: ApartmentWithBookings, date: Date): number | null => {
    try {
      const dateString = date.toISOString().split('T')[0];
      // Verifica se c'è una tariffa personalizzata per questa data
      const customRate = apartment.rates.find(rate => {
        try {
          // Confronta le date come stringhe YYYY-MM-DD per evitare problemi di fuso orario/ora
          return new Date(rate.date).toISOString().split('T')[0] === dateString && rate.price !== undefined;
        } catch {
          return false;
        }
      });

      if (customRate && customRate.price !== undefined) {
        return customRate.price;
      }

      // Altrimenti restituisci il prezzo base dell'appartamento se esiste
      return apartment.data?.price ?? null; // Restituisci null se non c'è prezzo base
    } catch (error) {
      console.error("Errore nel calcolare il prezzo per la data:", error);
      return null; // Restituisci null in caso di errore
    }
  };

  // Funzione per salvare le modifiche in blocco
  const handleBulkEditSave = async () => {
    if (!bulkEditApartmentId) return;

    setLoading(true);

    try {
      const selectedApartmentDates = selectedDates[bulkEditApartmentId] || {};
      const dateKeys = Object.keys(selectedApartmentDates); // Array di stringhe YYYY-MM-DD

      if (dateKeys.length === 0) {
        toast.error("Nessuna data selezionata");
        return;
      }

      // Ordina le date stringa
      dateKeys.sort();

      // Crea l'oggetto dati per l'aggiornamento
      const updates: { date: string; price?: number; minStay?: number; isBlocked?: boolean }[] = [];

      dateKeys.forEach(dateKey => {
          const update: { date: string; price?: number; minStay?: number; isBlocked?: boolean } = { date: dateKey };
          if (bulkEditPrice !== '') update.price = Number(bulkEditPrice);
          if (bulkEditMinStay !== '') update.minStay = Number(bulkEditMinStay);
          if (bulkEditIsBlocked !== null) update.isBlocked = bulkEditIsBlocked;
          // Aggiungi solo se c'è almeno una modifica da fare per questa data
          if (Object.keys(update).length > 1) {
              updates.push(update);
          }
      });

      if (updates.length === 0) {
        toast.error("Nessuna modifica specificata");
        setLoading(false);
        return;
      }

      // Chiamata all'API per l'aggiornamento in blocco (assicurati che l'API supporti questo formato)
      const response = await fetch(`/api/apartments/${bulkEditApartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }), // Invia l'array di aggiornamenti
      });

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || "Errore nell'aggiornamento");
      }

      toast.success(`Modifiche applicate a ${updates.length} date`);

      // Chiudi il modal e resetta le selezioni
      setIsBulkEditModalOpen(false);
      setSelectedDates(prev => {
        const newSelectedDates = { ...prev };
        delete newSelectedDates[bulkEditApartmentId];
        return newSelectedDates;
      });

      // Aggiorna i dati visualizzati
      router.refresh();
    } catch (error: any) {
      console.error("Errore nell'aggiornamento in blocco:", error);
      toast.error(`Errore nell'aggiornamento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (apartmentId: string, date: Date, action: 'block' | 'unblock' | 'book') => {
    setLoading(true);
    const dateString = date.toISOString().split('T')[0];

    try {
      if (action === 'block' || action === 'unblock') {
        // Blocca/sblocca la data (singola data)
        const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: dateString, // Invia YYYY-MM-DD
            isBlocked: action === 'block',
            // Potresti voler inviare anche price: null e minStay: null per resettarli quando blocchi/sblocchi
          }),
        });

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.message || `Errore: ${response.statusText}`);
        }

        toast.success(action === 'block' ? 'Data bloccata' : 'Data sbloccata');
      } else if (action === 'book') {
        // Naviga alla pagina di creazione prenotazione
        router.push(`/bookings/new?apartmentId=${apartmentId}&checkIn=${dateString}`);
        closeDropdown(); // Chiudi il dropdown dopo la navigazione
        return; // Esce dalla funzione
      }

      // Chiudi il dropdown attivo
      closeDropdown();

      router.refresh(); // Aggiorna i dati
    } catch (error: any) {
      console.error('Errore nell\'azione rapida:', error);
      toast.error(`Si è verificato un errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Verifica se la data è oggi (ignorando l'ora)
  const isToday = (date: Date): boolean => {
    try {
      const today = new Date();
      // Confronta anno, mese e giorno in UTC per evitare problemi di fuso orario
      return date.getUTCFullYear() === today.getUTCFullYear() &&
             date.getUTCMonth() === today.getUTCMonth() &&
             date.getUTCDate() === today.getUTCDate();
    } catch (error) {
      console.error("Errore nel verificare se la data è oggi:", error);
      return false;
    }
  };

  // Verifica se una data è bloccata
  const isDateBlocked = (apartment: ApartmentWithBookings, date: Date): boolean => {
    try {
      const dateString = date.toISOString().split('T')[0];
      return apartment.rates.some(rate => {
        try {
          // Confronta YYYY-MM-DD
          return new Date(rate.date).toISOString().split('T')[0] === dateString && rate.isBlocked;
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error("Errore nel verificare se la data è bloccata:", error);
      return false;
    }
  };

   // Verifica se una data ha un prezzo personalizzato
   const hasCustomPrice = (apartment: ApartmentWithBookings, date: Date): boolean => {
     try {
       const dateString = date.toISOString().split('T')[0];
       return apartment.rates.some(rate => {
         try {
           return new Date(rate.date).toISOString().split('T')[0] === dateString && rate.price !== undefined && rate.price !== apartment.data?.price;
         } catch {
           return false;
         }
       });
     } catch (error) {
       console.error("Errore nel verificare prezzo personalizzato:", error);
       return false;
     }
   };


  // Verifica se una data è selezionata
  const isDateSelected = (apartmentId: string, date: Date): boolean => {
    try {
      const apartmentDates = selectedDates[apartmentId] || {};
      return !!apartmentDates[date.toISOString().split('T')[0]]; // Confronta YYYY-MM-DD
    } catch (error) P
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

  // FUNZIONE MODIFICATA: Raggruppa le prenotazioni per appartamento considerando il cambio di mese
  // Utilizza UTC per i confronti
  const processBookings = (apartment: ApartmentWithBookings) => {
    const result: Array<{
      booking: Booking;
      startIdx: number;
      endIdx: number;
      startsInPreviousMonth: boolean;
      endsInNextMonth: boolean;
    }> = [];

    const confirmedBookings = apartment.bookings.filter(booking => booking.status === 'confirmed');

    // Ottieni il primo e l'ultimo giorno del mese corrente in UTC
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    // Normalizza le ore per sicurezza, anche se UTC dovrebbe gestirlo
    firstDayOfMonth.setUTCHours(0, 0, 0, 0);
    lastDayOfMonth.setUTCHours(0, 0, 0, 0);

    for (const booking of confirmedBookings) {
      try {
        // Converti checkIn e checkOut in oggetti Date UTC a mezzanotte
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        const checkIn = new Date(Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate()));
        const checkOut = new Date(Date.UTC(checkOutDate.getUTCFullYear(), checkOutDate.getUTCMonth(), checkOutDate.getUTCDate()));

        // Verifica se la prenotazione è visibile nel mese corrente
        // checkOut è esclusivo, quindi la prenotazione finisce il giorno *prima* di checkOut
        // Visibile se: checkIn <= lastDayOfMonth E checkOut > firstDayOfMonth
        if (checkIn.getTime() <= lastDayOfMonth.getTime() && checkOut.getTime() > firstDayOfMonth.getTime()) {

          // Determina se la prenotazione inizia nel mese precedente
          const startsInPreviousMonth = checkIn < firstDayOfMonth;

          // Determina se la prenotazione finisce nel mese successivo
          // checkOut è il giorno *dopo* l'ultimo giorno di soggiorno
          const lastDayOfBooking = new Date(checkOut.getTime() - 86400000); // 24 * 60 * 60 * 1000 ms
          const endsInNextMonth = lastDayOfBooking > lastDayOfMonth;

          // Trova gli indici dei giorni nel calendario (che sono già UTC)
          let firstVisibleDayIdx = -1;
          if (startsInPreviousMonth) {
            firstVisibleDayIdx = 0; // Inizia dal primo giorno del mese visualizzato
          } else {
            firstVisibleDayIdx = calendarDays.findIndex(day => day.getTime() === checkIn.getTime());
          }

          if (firstVisibleDayIdx === -1) continue; // Salta se l'indice non è valido

          let lastVisibleDayIdx = -1;
           // Trova l'ultimo giorno *incluso* nella prenotazione visibile nel mese
           const actualLastDayOfBooking = new Date(checkOut.getTime() - 86400000); // Giorno prima del checkout

          if (endsInNextMonth) {
            lastVisibleDayIdx = calendarDays.length - 1; // Finisce all'ultimo giorno del mese visualizzato
          } else {
            // Cerca l'ultimo giorno della prenotazione nel calendario
             lastVisibleDayIdx = calendarDays.findIndex(day => day.getTime() === actualLastDayOfBooking.getTime());
          }

           // Se non trovato ma dovrebbe essere in questo mese, potrebbe esserci un problema
           // O se finisce esattamente l'ultimo giorno del mese.
          if (lastVisibleDayIdx === -1) {
             // Potrebbe finire l'ultimo giorno del mese, ricontrolla
             if (actualLastDayOfBooking.getTime() === lastDayOfMonth.getTime()) {
               lastVisibleDayIdx = calendarDays.length - 1;
             } else {
               console.warn("Indice ultimo giorno non trovato per", booking.id, actualLastDayOfBooking);
               continue; // Salta se l'indice non è valido
             }
           }


          result.push({
            booking,
            startIdx: firstVisibleDayIdx,
            endIdx: lastVisibleDayIdx,
            startsInPreviousMonth,
            endsInNextMonth
          });
        }
      } catch (error) {
        console.error(`Errore nell'elaborazione della prenotazione ${booking.id}:`, error);
      }
    }
    return result;
  };


  // Controlla se c'è almeno un giorno da visualizzare
  if (calendarDays.length === 0 && !loading) { // Mostra caricamento se calendarDays è vuoto E non stiamo già caricando altro
     return (
       <div className="p-4 text-center">
         <p>Caricamento del calendario...</p>
       </div>
     );
   }

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold mr-2 sm:mr-4">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={loading}
              aria-label="Mese precedente"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={loading}
              aria-label="Mese successivo"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tasto "Oggi" */}
        <button
          onClick={goToToday}
          className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
          disabled={loading}
        >
          <CalendarIcon className="w-4 h-4 mr-1" />
          Oggi
        </button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 px-1 text-xs md:text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-green-100 border border-green-500 mr-1 md:mr-2"></div>
          <span>Prenotato</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-red-100 border border-red-500 mr-1 md:mr-2"></div>
          <span>Bloccato</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-100 border border-blue-300 mr-1 md:mr-2"></div>
          <span>Disponibile</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-100 border border-purple-400 mr-1 md:mr-2"></div>
          <span>€ Pers.</span> {/* Abbreviato */}
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-indigo-100 border border-indigo-400 mr-1 md:mr-2"></div>
          <span>Selezionato</span>
        </div>
      </div>

      {/* Calendario principale */}
      <div className="overflow-x-auto pb-4 md:pb-6 relative"> {/* Aggiunto relative per positioning dropdown */}
        <table className="min-w-full border-collapse border border-gray-200 table-fixed"> {/* Table-fixed aiuta con layout */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {/* Intestazione appartamento */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 py-2 px-2 md:px-3 w-[110px] md:w-[160px] text-left text-sm font-semibold text-gray-700">
                Appartamento
              </th>

              {/* Intestazioni dei giorni */}
              {calendarDays.map((day, index) => {
                const dateInfo = formatDate(day);
                const isCurrentDay = isToday(day);

                return (
                  <th
                    key={index}
                    className={`border border-gray-200 py-1 px-1 w-[70px] md:w-[80px] text-center font-medium text-xs md:text-sm whitespace-nowrap ${
                      isCurrentDay ? "bg-blue-100" : "bg-gray-50" // Sfondo leggermente diverso per oggi nell'header
                    }`}
                    scope="col"
                  >
                    <div className="text-gray-600">{dateInfo.weekday}</div>
                    <div className={`text-base md:text-lg ${isCurrentDay ? "font-bold text-blue-600" : "text-gray-800"}`}>
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
              const selectedCount = getSelectedDatesCount(apartment.id);
              // Processa le prenotazioni per questo appartamento
              const processedBookings = processBookings(apartment);

              return (
                <tr key={apartment.id} className="relative hover:bg-gray-50 transition-colors duration-150">
                  {/* Nome appartamento */}
                  <td
                    className="sticky left-0 z-10 bg-white border border-gray-200 py-2 px-2 md:px-3 font-medium h-[70px]" // Altezza fissa per coerenza
                  >
                    <div className="flex flex-col justify-center h-full">
                      <div className="flex justify-between items-center">
                         <span
                           className="cursor-pointer hover:text-blue-600 truncate text-sm md:text-base font-semibold"
                           onClick={() => handleApartmentClick(apartment.id)}
                           title={apartment.data?.name || "Appartamento"}
                         >
                           {apartment.data?.name || "Appartamento"}
                         </span>

                         {/* Pulsante modifica in blocco */}
                         {selectedCount > 0 && (
                           <button
                             className="ml-1 p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs flex items-center flex-shrink-0"
                             onClick={() => openBulkEditModal(apartment.id)}
                             title={`Modifica ${selectedCount} date selezionate`}
                           >
                             <AdjustmentsHorizontalIcon className="w-4 h-4" />
                             <span className="ml-1 font-mono">{selectedCount}</span>
                           </button>
                         )}
                       </div>
                       {/* Puoi aggiungere qui il prezzo base se vuoi */}
                       {/* <span className="text-xs text-gray-500 mt-1">{apartment.data?.price}€ / notte</span> */}
                     </div>
                  </td>

                  {calendarDays.map((day, dayIndex) => {
                    const isPast = isPastDate(day);
                    const isCurrentDay = isToday(day);
                    const isBlocked = isDateBlocked(apartment, day);
                    const isSelected = isDateSelected(apartment.id, day);
                    const price = getPriceForDate(apartment, day);
                    const customPrice = hasCustomPrice(apartment, day);

                    // Trova se questa data fa parte di una prenotazione VISIBILE
                    const bookingInfo = processedBookings.find(b =>
                      dayIndex >= b.startIdx && dayIndex <= b.endIdx
                    );
                    const isPartOfBooking = !!bookingInfo;
                    const isFirstDayOfBooking = isPartOfBooking && bookingInfo.startIdx === dayIndex;

                    // --- INIZIO LOGICA CLASSE CELLA CORRETTA ---
                    let cellClass = "border border-gray-200 relative text-center h-[70px] "; // Altezza fissa e classe base

                    if (isSelected) {
                      cellClass += "bg-indigo-100"; // Selezionato ha alta priorità visiva
                    } else if (isPartOfBooking) {
                       // Se fa parte di una prenotazione E non è selezionato, lo sfondo deve essere trasparente
                       // per far vedere la barra verde. Aggiungiamo una classe specifica se necessario.
                       // Non aggiungiamo colore di sfondo qui.
                       cellClass += "bg-white"; // O bg-transparent, ma white evita sovrapposizioni strane con hover riga
                    } else if (isBlocked) {
                      cellClass += "bg-red-100"; // Bloccato
                    } else if (customPrice) {
                       cellClass += "bg-purple-100"; // Prezzo personalizzato
                    } else if (isCurrentDay) {
                      cellClass += "bg-blue-100"; // Giorno corrente (diverso da disponibile standard per evidenza)
                    } else if (isPast) {
                      cellClass += "bg-gray-100 text-gray-400"; // Passato
                    } else {
                      cellClass += "bg-blue-50"; // Disponibile normale
                    }

                    // Aggiungi cursore solo se non è passato e non è parte di una prenotazione (la barra avrà il suo)
                    if (!isPast && !isPartOfBooking) {
                        cellClass += " cursor-pointer";
                    }
                    // --- FINE LOGICA CLASSE CELLA ---

                    // ID del dropdown e stato attivo
                    const dropdownId = `dropdown-${apartment.id}-${day.getTime()}`;
                    const isDropdownActive = activeDropdown === dropdownId;

                    return (
                      <td
                        key={day.toISOString()} // Chiave univoca stabile
                        className={cellClass}
                        onClick={(e) => !isPast ? handleDateClick(apartment.id, day, e, isPartOfBooking ? bookingInfo.booking : null) : undefined}
                        ref={isCurrentDay ? todayCellRef : null}
                        style={{ padding: "4px 2px" }} // Padding interno ridotto
                        data-has-dropdown={!isPast} // Attributo per gestione click outside dropdown
                      >
                        <div className="flex flex-col items-center justify-center h-full text-xs md:text-sm">
                           {/* Mostra Prezzo o info Bloccato solo se NON fa parte di una prenotazione */}
                           {!isPartOfBooking && !isBlocked && price !== null && (
                             <span className={`font-medium ${customPrice ? 'text-purple-700' : 'text-gray-700'}`}>
                               {price}€
                             </span>
                           )}

                           {/* Testo Bloccato */}
                           {!isPartOfBooking && isBlocked && (
                             <span className="text-xs font-semibold text-red-600 mt-1">Bloccato</span>
                           )}

                           {/* Checkbox per selezione (solo se disponibile e non passato) */}
                           {!isPast && !isPartOfBooking && !isBlocked && (
                             <div className="mt-1">
                               <input
                                 type="checkbox"
                                 className="h-3 w-3 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                 checked={isSelected}
                                 onChange={(e) => {
                                   // Non serve stopPropagation qui perché l'abbiamo gestito nell'onClick della cella
                                   handleCheckboxChange(apartment.id, day, e.target.checked);
                                 }}
                                 onClick={(e) => e.stopPropagation()} // Evita che il click sul checkbox apra il dropdown
                                 aria-label={`Seleziona ${formatDate(day).day}/${currentMonth+1}`}
                               />
                             </div>
                           )}
                         </div>

                        {/* Visualizza la barra della prenotazione SOLO sulla prima cella visibile */}
                        {isFirstDayOfBooking && bookingInfo && (
                          <div
                            className="booking-bar absolute top-[2px] left-0 h-[calc(100%-4px)] bg-green-200 border border-green-500 rounded-md flex flex-col justify-center px-2 text-xs overflow-hidden z-[5] cursor-pointer hover:bg-green-300 transition-colors" // z-index inferiore al dropdown
                            style={{
                              // Calcola la larghezza basata sul numero di celle coperte
                              width: `calc(${(bookingInfo.endIdx - bookingInfo.startIdx + 1) * 100}% - 2px)`, // Sottrai 2px per non sovrapporre il bordo destro
                              // Aggiungi bordi laterali se la prenotazione continua fuori dal mese visibile
                              borderLeft: bookingInfo.startsInPreviousMonth ? '3px solid #16a34a' : undefined, // Bordo più scuro
                              borderRight: bookingInfo.endsInNextMonth ? '3px solid #16a34a' : undefined,
                            }}
                            onClick={(e) => {
                              e.stopPropagation(); // Non far propagare il click alla cella sottostante
                              router.push(`/bookings/${bookingInfo.booking.id}`);
                            }}
                            title={`Prenotazione: ${bookingInfo.booking.guestName} (${bookingInfo.booking.numberOfGuests} ospiti)`}
                          >
                            <div className="font-semibold text-gray-800 truncate">{bookingInfo.booking.guestName}</div>
                            <div className="text-gray-700 truncate">{bookingInfo.booking.numberOfGuests} ospiti</div>
                            <div className="font-medium text-gray-800 truncate">{bookingInfo.booking.totalPrice}€</div>
                          </div>
                        )}

                        {/* Menu contestuale dropdown (usando Portale o posizionamento fisso) */}
                        {/* Questo div è solo un placeholder logico, il rendering effettivo usa position:fixed */}
                        <div
                          id={dropdownId}
                          className={`fixed z-50 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 ${isDropdownActive ? 'block' : 'hidden'}`}
                          // Stile top/left applicato dinamicamente in handleDateClick
                        >
                          {/* Contenuto dropdown rimane invariato */}
                           <div className="px-3 py-2 border-b">
                               <p className="text-sm font-semibold">
                                   {apartment.data?.name}
                               </p>
                               <p className="text-xs text-gray-600">
                                   {formatDate(day).weekday} {formatDate(day).day} {monthNames[currentMonth]}
                               </p>
                           </div>
                           <div className="py-1">
                             {/* Link al calendario singolo */}
                             <button
                               className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                               onClick={() => {
                                 closeDropdown();
                                 router.push(`/apartments/${apartment.id}/calendar?date=${day.toISOString().split('T')[0]}`);
                               }}
                             >
                               <CalendarIcon className="w-4 h-4 mr-2" /> Calendario Singolo
                             </button>

                             {/* Opzioni per celle con prenotazione */}
                             {isPartOfBooking && bookingInfo && (
                               <>
                                 <button
                                   className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                   onClick={() => {
                                     closeDropdown();
                                     router.push(`/bookings/${bookingInfo.booking.id}`);
                                   }}
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                    Vedi Prenotazione
                                 </button>
                                 <button
                                     className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                     onClick={() => {
                                     closeDropdown();
                                     router.push(`/bookings/${bookingInfo.booking.id}/edit`);
                                     }}
                                 >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                     Modifica Prenotazione
                                 </button>
                               </>
                             )}

                             {/* Opzioni per celle disponibili/bloccate */}
                             {!isPartOfBooking && (
                               <>
                                 {isBlocked ? (
                                   <button
                                     className="flex w-full items-center px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                                     onClick={() => handleQuickAction(apartment.id, day, 'unblock')}
                                     disabled={loading}
                                   >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                     Sblocca Giorno
                                   </button>
                                 ) : (
                                   <button
                                     className="flex w-full items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                     onClick={() => handleQuickAction(apartment.id, day, 'block')}
                                     disabled={loading || isPast} // Disabilita se passato
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                     Blocca Giorno
                                   </button>
                                 )}
                                 {!isBlocked && ( // Mostra "Prenota" solo se non bloccato
                                     <button
                                         className="flex w-full items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                         onClick={() => handleQuickAction(apartment.id, day, 'book')}
                                         disabled={loading || isPast} // Disabilita se passato
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5v9a2 2 0 002 2h8a2 2 0 002-2V7H6z" clipRule="evenodd" /></svg>
                                         Crea Prenotazione
                                     </button>
                                 )}
                               </>
                             )}
                         </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pulsanti degli appartamenti - visibili solo su mobile */}
      <div className="md:hidden mt-6 mb-16 px-2"> {/* Aggiunto padding */}
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Calendari Singoli</h3>
          <div className="grid grid-cols-2 gap-3">
          {apartments.map((apt) => (
            <Link
              key={apt.id}
              href={`/apartments/${apt.id}/calendar`}
              className="flex flex-col items-center justify-center h-20 bg-white border border-gray-300 rounded-lg shadow-sm text-center px-2 py-3 hover:bg-gray-50 transition-colors"
            >
              <CalendarIcon className="h-5 w-5 mb-1 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">{apt.data?.name || "Appartamento"}</span>
            </Link>
          ))}
          {/* Link Aggiungi non necessario qui se c'è già nel menu principale */}
          {/* <Link ... Aggiungi ... /> */}
        </div>
      </div>

      {/* Modal per la modifica in blocco (invariato) */}
      <Transition.Root show={isBulkEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setIsBulkEditModalOpen(false)}> {/* Aumentato z-index */}
          {/* Overlay */}
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

          {/* Contenuto Modal */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
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
                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Modifica in blocco per {apartments.find(a => a.id === bulkEditApartmentId)?.data?.name}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 mt-1">
                          Applica modifiche a {getSelectedDatesCount(bulkEditApartmentId || '')} date selezionate.
                      </p>

                      <div className="mt-4 space-y-4">
                        {/* Prezzo */}
                        <div>
                          <label htmlFor="bulkPrice" className="block text-sm font-medium text-gray-700">
                            Nuovo Prezzo (€)
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
                            Nuovo Soggiorno minimo (notti)
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
                        <fieldset className="mt-4">
                             <legend className="text-sm font-medium text-gray-700 mb-1">Stato disponibilità</legend>
                             <div className="flex items-center space-x-4">
                                 <div className="flex items-center">
                                     <input id="bulk-blocked-unchanged" name="bulk-blocked" type="radio" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500" checked={bulkEditIsBlocked === null} onChange={() => setBulkEditIsBlocked(null)} />
                                     <label htmlFor="bulk-blocked-unchanged" className="ml-2 block text-sm text-gray-700">Non modificare</label>
                                 </div>
                                 <div className="flex items-center">
                                     <input id="bulk-blocked-true" name="bulk-blocked" type="radio" className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500" checked={bulkEditIsBlocked === true} onChange={() => setBulkEditIsBlocked(true)} />
                                     <label htmlFor="bulk-blocked-true" className="ml-2 block text-sm text-gray-700">Blocca date</label>
                                 </div>
                                 <div className="flex items-center">
                                     <input id="bulk-blocked-false" name="bulk-blocked" type="radio" className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500" checked={bulkEditIsBlocked === false} onChange={() => setBulkEditIsBlocked(false)} />
                                     <label htmlFor="bulk-blocked-false" className="ml-2 block text-sm text-gray-700">Sblocca date</label>
                                 </div>
                             </div>
                         </fieldset>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2 disabled:opacity-50"
                      onClick={handleBulkEditSave}
                      disabled={loading || (bulkEditPrice === '' && bulkEditMinStay === '' && bulkEditIsBlocked === null)} // Disabilita se non c'è nulla da salvare
                    >
                      {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                      onClick={() => setIsBulkEditModalOpen(false)}
                      disabled={loading}
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
