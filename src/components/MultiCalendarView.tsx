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
      // Verifica se l'elemento cliccato è un checkbox o la striscia della prenotazione
      const targetElement = event.target as HTMLElement;
      if (targetElement.tagName === 'INPUT' || targetElement.closest('.booking-strip')) { // Aggiungi una classe se vuoi essere più specifico
        return;
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
        const dropdownHeight = 170; // Altezza stimata del dropdown in pixel (o calcolala)

        // Calcola posizionamento verticale
        let topPosition = window.scrollY + rect.bottom; // Default sotto
        if (rect.bottom + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
          // Posiziona sopra se non c'è spazio sotto e c'è spazio sopra
          topPosition = window.scrollY + rect.top - dropdownHeight;
        }
        dropdown.style.top = `${topPosition}px`;

        // Calcola posizionamento orizzontale
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 160; // Larghezza stimata
        let leftPosition = window.scrollX + rect.left; // Default a sinistra
        if (rect.left + dropdownWidth > viewportWidth) {
          // Sposta a sinistra se esce a destra
          leftPosition = window.scrollX + viewportWidth - dropdownWidth - 10;
        }
        // Assicurati che non esca a sinistra
        if (leftPosition < window.scrollX + 10) {
            leftPosition = window.scrollX + 10;
        }
        dropdown.style.left = `${leftPosition}px`;
      }
    } catch (error) {
      console.error("Errore nel gestire il click sulla data:", error);
    }
  };

  // Funzione per chiudere il dropdown quando il mouse esce dalla cella
  const handleCellMouseLeave = () => {
    // Chiudi il dropdown con un piccolo ritardo per gestire il movimento tra cella e dropdown
    // Potrebbe essere necessario un meccanismo più robusto se il dropdown si sovrappone alla cella
    setTimeout(() => {
       // Verifica se il mouse è finito sul dropdown prima di chiudere
       const activeEl = document.querySelector(':hover');
       if (!activeEl || !activeEl.closest(`[id^="dropdown-"]`)) {
           setActiveDropdown(null);
       }
    }, 300);
  };

  // Funzione per gestire il click sulla checkbox
  const handleCheckboxChange = (apartmentId: string, date: Date, isChecked: boolean) => {
    try {
      const dateKey = date.toISOString(); // Chiave originale

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
      // Confronta le date ignorando l'ora
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      return dateToCheck < today;
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
      const dateString = date.toDateString(); // Confronta usando toDateString per ignorare l'ora
      const customRate = apartment.rates.find(rate => {
        try {
          const rateDate = new Date(rate.date);
          return rateDate.toDateString() === dateString && rate.price !== undefined;
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
        setLoading(false); // Reset loading state
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
      // Assicurati che l'API gestisca correttamente start/end date
      // O invia l'array di date se l'API lo supporta
      const response = await fetch(`/api/apartments/${bulkEditApartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Invia le date specifiche se l'API lo supporta meglio
           dates: datesArray.map(d => d.toISOString().split('T')[0]), // Array di YYYY-MM-DD
           updates: updateData
          // Oppure usa startDate/endDate se l'API gestisce solo range contigui
          // startDate: datesArray[0].toISOString().split('T')[0],
          // endDate: datesArray[datesArray.length - 1].toISOString().split('T')[0],
          // ...updateData // In questo caso manda gli update direttamente
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Errore sconosciuto nell'aggiornamento" }));
        throw new Error(errorData.message || "Errore nell'aggiornamento");
      }

      toast.success(`Modifiche applicate a ${datesArray.length} date`);

      // Chiudi il modal e resetta le selezioni
      setIsBulkEditModalOpen(false);
      setSelectedDates(prev => {
        const newSelectedDates = { ...prev };
        delete newSelectedDates[bulkEditApartmentId];
        return newSelectedDates;
      });

      // Aggiorna la pagina per vedere le modifiche
      router.refresh();
    } catch (error: any) {
      console.error("Errore nell'aggiornamento in blocco:", error);
      toast.error(`Errore nell'aggiornamento: ${error.message}`);
    } finally {
      setLoading(false);
      setBulkEditApartmentId(null); // Resetta ID
    }
  };

  const handleQuickAction = async (apartmentId: string, date: Date, action: 'block' | 'unblock' | 'book') => {
    setLoading(true);
    setActiveDropdown(null); // Chiudi subito il dropdown

    try {
      if (action === 'block' || action === 'unblock') {
        // Blocca/sblocca la data
        const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: date.toISOString().split('T')[0], // Invia YYYY-MM-DD
            isBlocked: action === 'block',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Errore: ${response.statusText}` }));
          throw new Error(errorData.message || `Errore: ${response.statusText}`);
        }

        toast.success(action === 'block' ? 'Data bloccata' : 'Data sbloccata');
      } else if (action === 'book') {
        // Naviga alla pagina di creazione prenotazione
        router.push(`/bookings/new?apartmentId=${apartmentId}&checkIn=${date.toISOString().split('T')[0]}`);
        setLoading(false); // Non serve più loading, c'è navigazione
        return; // Esci qui
      }

      // Aggiorna i dati visualizzati
      router.refresh();
    } catch (error: any) {
      console.error('Errore nell\'azione rapida:', error);
      toast.error(`Si è verificato un errore: ${error.message}`);
    } finally {
      // Imposta loading a false solo se non c'è stata navigazione
       if (action !== 'book') {
           setLoading(false);
       }
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
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      const timeToCheck = dateToCheck.getTime();

      return apartment.bookings.find(booking => {
        try {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          checkIn.setHours(0, 0, 0, 0);
          checkOut.setHours(0, 0, 0, 0);

          return booking.status === 'confirmed' && timeToCheck >= checkIn.getTime() && timeToCheck < checkOut.getTime();
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

      const checkInTime = checkIn.getTime();
      const checkOutTime = checkOut.getTime();
      const dateToCheckTime = dateToCheck.getTime();

      // Caso di prenotazione di un solo giorno (check-out è il giorno *dopo*)
      if (checkOutTime - checkInTime <= 86400000) { // Usa <= per sicurezza
        return 'single';
      }

      if (dateToCheckTime === checkInTime) {
        return 'start';
      }

      // Il giorno prima del check-out
      const dayBeforeCheckoutTime = checkOutTime - 86400000;

      if (dateToCheckTime === dayBeforeCheckoutTime) {
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
        const dateString = date.toDateString();
      return apartment.rates.some(rate => {
        try {
          const rateDate = new Date(rate.date);
          return rateDate.toDateString() === dateString && rate.isBlocked;
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
      return !!apartmentDates[date.toISOString()]; // Usa la chiave originale
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

  // Raggruppa le prenotazioni per appartamento considerando il cambio di mese
  // QUESTA FUNZIONE È FONDAMENTALE E RIMANE INVARIATA
  const processBookings = (apartment: ApartmentWithBookings) => {
    const result: Array<{
      booking: Booking;
      startIdx: number; // Indice del primo giorno VISIBILE nel mese corrente
      endIdx: number;   // Indice dell'ultimo giorno VISIBILE nel mese corrente
      checkIn: Date;    // Data check-in originale
      checkOut: Date;   // Data check-out originale
      startsInPreviousMonth: boolean;
      endsInNextMonth: boolean;
    }> = [];

    const confirmedBookings = apartment.bookings.filter(booking => booking.status === 'confirmed');

    if (calendarDays.length === 0) return result;

    // Ottieni il primo e l'ultimo giorno del mese corrente (a mezzanotte locale)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    lastDayOfMonth.setHours(0, 0, 0, 0);
    const firstDayOfMonthTime = firstDayOfMonth.getTime();
    const lastDayOfMonthTime = lastDayOfMonth.getTime();

    for (const booking of confirmedBookings) {
      try {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        const checkInTime = checkIn.getTime();
        const checkOutTime = checkOut.getTime();

        // Verifica se la prenotazione è visibile nel mese corrente
        // checkOut (esclusivo) > inizio mese AND checkIn (inclusivo) <= fine mese
        if (checkOutTime > firstDayOfMonthTime && checkInTime <= lastDayOfMonthTime) {

          const startsInPreviousMonth = checkInTime < firstDayOfMonthTime;
          // Finisce nel mese successivo se checkOut è dopo la mezzanotte del giorno *successivo* all'ultimo del mese
          const endsInNextMonth = checkOutTime > (lastDayOfMonthTime + 86400000);

          // Trova gli indici nel calendario corrente
          let firstVisibleDayIdx = -1;
          let lastVisibleDayIdx = -1;

          if (startsInPreviousMonth) {
            firstVisibleDayIdx = 0;
          } else {
            firstVisibleDayIdx = calendarDays.findIndex(day => {
              const d = new Date(day);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === checkInTime;
            });
          }

          // Se non troviamo l'inizio (improbabile se la condizione sopra è vera), saltiamo
          if (firstVisibleDayIdx === -1) continue;

          if (endsInNextMonth) {
            lastVisibleDayIdx = calendarDays.length - 1;
          } else {
            // Trova l'indice del giorno PRIMA del check-out
            const dayBeforeCheckoutTime = checkOutTime - 86400000;
            lastVisibleDayIdx = calendarDays.findIndex(day => {
              const d = new Date(day);
              d.setHours(0, 0, 0, 0);
              return d.getTime() === dayBeforeCheckoutTime;
            });
          }

           // Se non troviamo la fine (improbabile), saltiamo
           if (lastVisibleDayIdx === -1) continue;

           // Assicurati che endIdx non sia minore di startIdx (può capitare se la logica ha un bug)
           if (lastVisibleDayIdx < firstVisibleDayIdx) continue;


          result.push({
            booking,
            startIdx: firstVisibleDayIdx,
            endIdx: lastVisibleDayIdx,
            checkIn,
            checkOut,
            startsInPreviousMonth,
            endsInNextMonth
          });
        }
      } catch (error) {
        console.error("Errore nell'elaborazione della prenotazione:", booking.id, error);
      }
    }
    return result;
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
      {/* Header del calendario */}
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

      {/* Legenda */}
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

      {/* Calendario principale */}
      <div className="overflow-x-auto pb-4 md:pb-6">
        <table className="min-w-full border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {/* Intestazione appartamento */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 py-3 px-2 md:px-4 min-w-[100px] md:min-w-[180px] text-left font-medium">
                Appartamento
              </th>

              {/* Intestazioni dei giorni */}
              {calendarDays.map((day, index) => {
                const dateInfo = formatDate(day);
                const isCurrentDay = isToday(day);

                return (
                  <th
                    key={index}
                    className={`border border-gray-200 py-1 min-w-[75px] md:min-w-[80px] text-center ${
                      isCurrentDay ? "bg-blue-50" : "bg-gray-100" // Sfondo header
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

              // Processa le prenotazioni per questo appartamento con la funzione aggiornata
              const processedBookings = processBookings(apartment);

              return (
                <tr key={apartment.id} className="relative">
                  {/* Nome appartamento */}
                  <td
                    className="sticky left-0 z-10 bg-white border border-gray-200 py-3 px-2 md:px-4 font-medium"
                     style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }} // Fix rendering issues on scroll with sticky
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className="cursor-pointer hover:text-blue-600 truncate text-sm md:text-base"
                        onClick={() => handleApartmentClick(apartment.id)}
                         title={apartment.data?.name || "Appartamento"}
                      >
                        {apartment.data?.name || "Appartamento"}
                      </span>

                      {/* Pulsante modifica in blocco */}
                      {selectedCount > 0 && (
                        <button
                          className="ml-1 md:ml-2 p-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs flex items-center flex-shrink-0" // Aggiunto flex-shrink-0
                           onClick={(e) => { e.stopPropagation(); openBulkEditModal(apartment.id); }} // Stop propagation
                           title={`Modifica ${selectedCount} date`}
                        >
                          <AdjustmentsHorizontalIcon className="w-4 h-4 md:mr-1" />
                          <span className="hidden sm:inline">{selectedCount}</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* MAPPA DEI GIORNI - Qui la modifica */}
                  {calendarDays.map((day, dayIndex) => {
                    const isPast = isPastDate(day);
                    const isCurrentDay = isToday(day);
                    // 'booking' qui è il risultato della ricerca per il SINGOLO giorno (usato nel dropdown)
                    const booking = getBookingForDate(apartment, day);
                    const isBlocked = isDateBlocked(apartment, day);
                    const isSelected = isDateSelected(apartment.id, day);
                    const price = getPriceForDate(apartment, day);

                    // 'bookingInfo' è il risultato che copre l'INTERO SPAN della prenotazione visibile nel mese
                    const bookingInfo = processedBookings.find(b =>
                      dayIndex >= b.startIdx && dayIndex <= b.endIdx
                    );

                    // Determina se questa è la PRIMA cella VISIBILE della prenotazione
                    const isFirstDayOfBooking = bookingInfo && bookingInfo.startIdx === dayIndex;

                    // *** INIZIO MODIFICA LOGICA cellClass ***
                    let cellClass = "border border-gray-200 relative ";

                    // 1. Se la cella fa parte di uno span di prenotazione (`bookingInfo` esiste)
                    if (bookingInfo) {
                        // Applica sfondo trasparente alla cella TD per far vedere il DIV assoluto sotto
                        cellClass += "bg-transparent ";
                    }
                    // 2. Altrimenti (se non fa parte di una prenotazione), applica gli altri stili
                    else if (isSelected) {
                      cellClass += "bg-indigo-100 ";
                    } else if (isBlocked) {
                      cellClass += "bg-red-50 "; // Era bg-red-100 nella legenda, ma nel codice è 50
                    } else if (isCurrentDay) {
                      cellClass += "bg-blue-50 ";
                    } else if (isPast) {
                      cellClass += "bg-gray-100 ";
                    } else {
                       // Disponibile futuro (era bg-blue-50, manteniamo l'originale)
                      cellClass += "bg-blue-50 ";
                    }
                    // *** FINE MODIFICA LOGICA cellClass ***

                    // ID del dropdown
                    const dropdownId = `dropdown-${apartment.id}-${day.getTime()}`;
                    const isDropdownActive = activeDropdown === dropdownId;

                    return (
                      <td
                        key={dayIndex}
                        className={cellClass}
                        onClick={(e) => handleDateClick(apartment.id, day, e, booking)} // Passa 'booking' (del giorno) al dropdown
                        onMouseLeave={handleCellMouseLeave}
                        ref={isCurrentDay ? todayCellRef : null}
                        style={{ height: "60px", padding: "2px", position: "relative" }} // Stile originale
                      >
                        {/* Contenuto della cella standard (prezzo o bloccato) */}
                        {/* Mostra prezzo solo se NON prenotato e NON bloccato */}
                        {!bookingInfo && !isBlocked && (
                            <div className="text-center text-xs md:text-sm pt-1">
                                {`${price}€`}
                            </div>
                        )}

                        {/* Visualizza scritta "Bloccato" */}
                        {isBlocked && !bookingInfo && ( // Mostra solo se bloccato E non parte di una prenotazione
                          <div className="h-full flex items-center justify-center">
                            <div className="text-xs font-medium text-red-600">Bloccato</div>
                          </div>
                        )}

                        {/* Checkbox per selezione */}
                        {/* Mostra checkbox solo se NON passato, NON prenotato, NON bloccato */}
                        {!isPast && !bookingInfo && !isBlocked && (
                          <div className="text-center mt-1">
                            <input
                              type="checkbox"
                              className="h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" // Stile checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation(); // Impedisce al click di raggiungere la cella
                                handleCheckboxChange(apartment.id, day, e.target.checked);
                              }}
                              onClick={(e) => e.stopPropagation()} // Impedisce al click di raggiungere la cella
                               aria-label={`Seleziona ${formatDate(day).day} ${monthNames[currentMonth]}`}
                            />
                          </div>
                        )}

                        {/* Visualizza la striscia della prenotazione (DIV assoluto) */}
                        {/* RIMANE INVARIATO: Renderizzato solo sulla prima cella visibile */}
                        {isFirstDayOfBooking && bookingInfo && (
                          <div
                            className="absolute top-0 left-0 h-full bg-green-100 border border-green-300 rounded-md flex flex-col justify-center px-2 text-xs overflow-hidden z-5 cursor-pointer booking-strip" // Aggiunta classe booking-strip
                            style={{
                              // Calcola larghezza per coprire le celle necessarie
                              width: `${(bookingInfo.endIdx - bookingInfo.startIdx + 1) * 100}%`,
                              // Larghezza minima basata sulla larghezza della cella (circa 75px)
                              minWidth: `${(bookingInfo.endIdx - bookingInfo.startIdx + 1) * 75}px`, // Adatta se la larghezza cella è diversa
                              // Bordi speciali se la prenotazione continua fuori dal mese
                              borderLeft: bookingInfo.startsInPreviousMonth ? '3px solid #16a34a' : '', // Verde più scuro
                              borderRight: bookingInfo.endsInNextMonth ? '3px solid #16a34a' : '',     // Verde più scuro
                            }}
                            onClick={(e) => {
                              e.stopPropagation(); // Impedisce al click di raggiungere la cella
                              router.push(`/bookings/${bookingInfo.booking.id}`);
                            }}
                             title={`Vai a prenotazione ${bookingInfo.booking.guestName}`} // Tooltip
                          >
                            <div className="font-semibold truncate">{bookingInfo.booking.guestName}</div>
                            <div className="truncate">{bookingInfo.booking.numberOfGuests} ospiti</div>
                            <div className="font-medium truncate">{bookingInfo.booking.totalPrice}€</div>
                          </div>
                        )}

                        {/* Menu contestuale dropdown (RIMASTO INVARIATO) */}
                        <div
                          id={dropdownId}
                           className={`fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 ${isDropdownActive ? '' : 'hidden'}`}
                           // Aggiunta gestione mouse per evitare chiusura passando sul dropdown
                           onMouseEnter={() => { /* Potrebbe servire a non far scattare il timeout di handleCellMouseLeave */ }}
                           onMouseLeave={handleCellMouseLeave}
                        >
                          <div className="py-1">
                             {/* Titolo Dropdown */}
                             <div className="px-4 pb-1 mb-1 border-b border-gray-100">
                                 <p className="text-sm font-medium text-gray-800">
                                     {formatDate(day).weekday} {formatDate(day).day} {monthNames[currentMonth]}
                                 </p>
                             </div>

                            <button
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => {
                                setActiveDropdown(null);
                                router.push(`/apartments/${apartment.id}/calendar?date=${day.toISOString().split('T')[0]}`);
                              }}
                            >
                              <span className="mr-2 text-xs">📅</span> Calendario
                            </button>

                            {/* Opzioni per celle con prenotazione (usa 'booking' del giorno) */}
                            {booking && (
                              <>
                                <button
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    router.push(`/bookings/${booking.id}`);
                                  }}
                                >
                                  <span className="mr-2 text-xs">👁️</span> Dettagli
                                </button>
                                <button
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    router.push(`/bookings/${booking.id}/edit`);
                                  }}
                                >
                                  <span className="mr-2 text-xs">✏️</span> Modifica
                                </button>
                              </>
                            )}

                            {/* Opzioni per celle disponibili/bloccate (usa 'booking' del giorno) */}
                            {!booking && !isPast && ( // Non mostrare su date passate
                                <>
                                {isBlocked ? (
                                    <button
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => handleQuickAction(apartment.id, day, 'unblock')}
                                    disabled={loading}
                                    >
                                    <span className="mr-2 text-xs">🔓</span> Sblocca
                                    </button>
                                ) : (
                                    <button
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleQuickAction(apartment.id, day, 'block')}
                                    disabled={loading}
                                    >
                                    <span className="mr-2 text-xs">🔒</span> Blocca
                                    </button>
                                )}
                                {!isBlocked && ( // Mostra "Prenota" solo se disponibile
                                    <button
                                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                                        onClick={() => handleQuickAction(apartment.id, day, 'book')}
                                        disabled={loading}
                                    >
                                        <span className="mr-2 text-xs">✅</span> Prenota
                                    </button>
                                )}
                                </>
                            )}
                             {/* Messaggio per date passate senza prenotazione */}
                             {isPast && !booking && (
                                 <span className="block px-4 py-2 text-xs text-gray-400 italic">Data passata</span>
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

      {/* Pulsanti degli appartamenti - visibili solo su mobile (RIMASTO INVARIATO) */}
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

      {/* Modal per la modifica in blocco (RIMASTO INVARIATO) */}
      <Transition.Root show={isBulkEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !loading && setIsBulkEditModalOpen(false)}>
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
                              name="bulkPrice"
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
                              name="bulkMinStay"
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
                           <legend className="block text-sm font-medium text-gray-700">Stato Disponibilità</legend>
                           <div className="mt-2 space-y-2 sm:flex sm:items-center sm:space-x-6 sm:space-y-0">
                             <div className="flex items-center">
                               <input
                                 id="bulk-blocked-unchanged"
                                 name="bulk-blocked"
                                 type="radio"
                                 checked={bulkEditIsBlocked === null}
                                 onChange={() => setBulkEditIsBlocked(null)}
                                 className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                               />
                               <label htmlFor="bulk-blocked-unchanged" className="ml-2 block text-sm text-gray-900">
                                 Non modificare
                               </label>
                             </div>
                             <div className="flex items-center">
                               <input
                                 id="bulk-blocked-false"
                                 name="bulk-blocked"
                                 type="radio"
                                 checked={bulkEditIsBlocked === false}
                                 onChange={() => setBulkEditIsBlocked(false)}
                                 className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                               />
                               <label htmlFor="bulk-blocked-false" className="ml-2 block text-sm text-gray-900">
                                 Sblocca
                               </label>
                             </div>
                             <div className="flex items-center">
                               <input
                                 id="bulk-blocked-true"
                                 name="bulk-blocked"
                                 type="radio"
                                 checked={bulkEditIsBlocked === true}
                                 onChange={() => setBulkEditIsBlocked(true)}
                                 className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                               />
                               <label htmlFor="bulk-blocked-true" className="ml-2 block text-sm text-gray-900">
                                 Blocca
                               </label>
                             </div>
                           </div>
                         </fieldset>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-start-2 ${
                        loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600'
                      }`}
                      onClick={handleBulkEditSave}
                      disabled={loading}
                    >
                      {loading ? 'Salvataggio...' : 'Salva modifiche'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 disabled:opacity-50"
                      onClick={() => setIsBulkEditModalOpen(false)}
                       disabled={loading} // Disabilita annulla durante il save
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
