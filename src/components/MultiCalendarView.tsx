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
        // Usiamo UTC per evitare problemi di fuso orario nella creazione delle date del mese
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
          block: 'center', // 'nearest' might be less disruptive if already visible
          inline: 'center' // 'nearest' might be better here too
        });
      }
    }, 500); // Increased delay slightly
  }, [calendarDays]); // Rerun when calendarDays changes

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
      // Usa la data italiana per centrare il mese giusto
      const todayItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
      setCurrentMonth(todayItaly.getMonth());
      setCurrentYear(todayItaly.getFullYear());
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
      // Verifica se l'elemento cliccato è un checkbox o parte di una prenotazione cliccabile
      const targetElement = event.target as HTMLElement;
      if (targetElement.tagName === 'INPUT' || targetElement.closest('[data-booking-clickable="true"]')) {
        return; // Non aprire il dropdown se si clicca su checkbox o sulla scritta della prenotazione
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

       // --- Posizionamento Dropdown (rimasto invariato) ---
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = dropdown.offsetHeight > 0 ? dropdown.offsetHeight : 180; // Usa altezza reale se disponibile

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          // Posiziona sopra
           dropdown.style.top = `${window.scrollY + rect.top - dropdownHeight}px`;
        } else {
          // Posiziona sotto (default)
          dropdown.style.top = `${window.scrollY + rect.bottom}px`;
        }

        // Posiziona orizzontalmente
        dropdown.style.left = `${window.scrollX + rect.left}px`;

        // Assicurati che il dropdown non vada fuori dalla parte destra dello schermo
        const viewportWidth = window.innerWidth;
        const dropdownWidth = dropdown.offsetWidth > 0 ? dropdown.offsetWidth : 160; // Usa larghezza reale

        if (rect.left + dropdownWidth > viewportWidth) {
          dropdown.style.left = `${window.scrollX + viewportWidth - dropdownWidth - 10}px`; // 10px di margine
        }
         // Assicurati che non vada fuori a sinistra
         if (rect.left < 0) {
             dropdown.style.left = `${window.scrollX + 10}px`;
         }
      }
    } catch (error) {
      console.error("Errore nel gestire il click sulla data:", error);
    }
  };

  // Funzione per chiudere il dropdown quando il mouse esce dalla cella O dal dropdown stesso
  const handleMouseLeaveWithDelay = (relatedTarget: EventTarget | null) => {
      // Verifica se il mouse si sta spostando verso il dropdown associato
      if (activeDropdown && relatedTarget instanceof Element && relatedTarget.closest(`#${activeDropdown}`)) {
          // Non chiudere se il mouse entra nel dropdown attivo
          return;
      }
      // Chiudi il dropdown con un piccolo ritardo
      setTimeout(() => {
          // Ricontrolla se nel frattempo il mouse è rientrato nella cella o nel dropdown
          const elementUnderMouse = document.elementFromPoint(lastMouseEvent.clientX, lastMouseEvent.clientY);
          if (activeDropdown && elementUnderMouse?.closest(`[data-dropdown-id="${activeDropdown}"]`)) {
              // Non chiudere se siamo ancora sulla cella o sul dropdown
              return;
          }
           if (activeDropdown && elementUnderMouse?.closest(`#${activeDropdown}`)) {
                // Non chiudere se siamo ancora sul dropdown
               return;
           }
          setActiveDropdown(null);
      }, 200); // Ridotto il ritardo
  };

  // Memorizza l'ultimo evento mouse per il controllo nel setTimeout
  let lastMouseEvent: MouseEvent;
  useEffect(() => {
    const storeLastMouse = (e: MouseEvent) => { lastMouseEvent = e; };
    window.addEventListener('mousemove', storeLastMouse);
    return () => window.removeEventListener('mousemove', storeLastMouse);
  }, []);


  // Funzione per gestire il click sulla checkbox
  const handleCheckboxChange = (apartmentId: string, date: Date, isChecked: boolean) => {
    try {
      const dateKey = date.toISOString().split('T')[0]; // Usa solo la data YYYY-MM-DD come chiave

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

  // Funzione per verificare se una data è nel passato (considerando il fuso orario italiano)
  const isPastDate = (date: Date): boolean => {
    try {
      const todayItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
      todayItaly.setHours(0, 0, 0, 0); // Azzera l'ora per confronto solo sulla data

      // Confronta usando UTC per coerenza con le date del calendario
      const dateToCheck = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

      return dateToCheck < todayItaly;
    } catch (error) {
      console.error("Errore nel controllare se la data è passata:", error);
      return false;
    }
  };

  // Funzione per formattare la data nel formato "Mar 20" (usa UTC)
  const formatDate = (date: Date): { weekday: string; day: number } => {
    try {
      const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      // Usa getUTCDay e getUTCDate perché le date in calendarDays sono UTC
      return {
        weekday: weekdays[date.getUTCDay()],
        day: date.getUTCDate()
      };
    } catch (error) {
      console.error("Errore nel formattare la data:", error);
      return { weekday: "", day: 0 };
    }
  };

  // Funzione per ottenere il prezzo per una data specifica
  const getPriceForDate = (apartment: ApartmentWithBookings, date: Date): number => {
    try {
        const dateString = date.toISOString().split('T')[0];
      // Verifica se c'è una tariffa personalizzata
      const customRate = apartment.rates.find(rate => {
        try {
          // Confronta le stringhe YYYY-MM-DD per evitare problemi di fuso orario
          return new Date(rate.date).toISOString().split('T')[0] === dateString && rate.price !== undefined;
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

    const selectedApartmentDates = selectedDates[bulkEditApartmentId] || {};
    const dateKeys = Object.keys(selectedApartmentDates); // Array di stringhe YYYY-MM-DD

    if (dateKeys.length === 0) {
      toast.error("Nessuna data selezionata");
      return;
    }

    setLoading(true);

    try {
        // Converti le chiavi in oggetti Date (UTC) e ordina
        const datesArray = dateKeys.map(key => new Date(key + 'T00:00:00.000Z')).sort((a, b) => a.getTime() - b.getTime());

      // Crea l'oggetto dati per l'aggiornamento
      const updateData: any = {};

      if (bulkEditPrice !== '') updateData.price = Number(bulkEditPrice);
      if (bulkEditMinStay !== '') updateData.minStay = Number(bulkEditMinStay);
      if (bulkEditIsBlocked !== null) updateData.isBlocked = bulkEditIsBlocked;
      // Aggiungi anche notes se necessario in futuro
      // if (bulkEditNotes !== '') updateData.notes = bulkEditNotes;


      // Chiamata all'API per l'aggiornamento in blocco
      const response = await fetch(`/api/apartments/${bulkEditApartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Invia le date come array di stringhe YYYY-MM-DD
           dates: dateKeys,
          // Oppure invia start/end se l'API lo preferisce (assicurati che l'API gestisca range non contigui se invii start/end)
          // startDate: datesArray[0].toISOString().split('T')[0],
          // endDate: datesArray[datesArray.length - 1].toISOString().split('T')[0],
          updates: updateData // Invia i valori da aggiornare
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore nell'aggiornamento");
      }

      toast.success(`Modifiche applicate a ${dateKeys.length} date`);

      // Chiudi il modal e resetta le selezioni per questo appartamento
      setIsBulkEditModalOpen(false);
      setSelectedDates(prev => {
        const newSelectedDates = { ...prev };
        delete newSelectedDates[bulkEditApartmentId];
        return newSelectedDates;
      });

      // Aggiorna i dati visualizzati senza ricaricare tutta la pagina
      router.refresh();

    } catch (error: any) {
      console.error("Errore nell'aggiornamento in blocco:", error);
      toast.error(`Errore: ${error.message || 'Aggiornamento fallito'}`);
    } finally {
      setLoading(false);
      setBulkEditApartmentId(null); // Resetta l'ID appartamento
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
            // Potresti voler inviare anche price: null, minStay: null per resettare quando blocchi/sblocchi
          }),
        });

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.message || `Errore: ${response.statusText}`);
        }

        toast.success(action === 'block' ? 'Data bloccata' : 'Data sbloccata');
      } else if (action === 'book') {
        // Naviga alla pagina di creazione prenotazione
        router.push(`/bookings/new?apartmentId=${apartmentId}&checkIn=${date.toISOString().split('T')[0]}`);
        setLoading(false); // Interrompi il loading perché c'è navigazione
        return; // Esci dalla funzione
      }

      // Aggiorna i dati
      router.refresh();
    } catch (error: any) {
      console.error('Errore nell\'azione rapida:', error);
      toast.error(`Errore: ${error.message || 'Si è verificato un errore'}`);
    } finally {
      // Assicurati che setLoading sia false solo se non c'è stata navigazione
       if (action !== 'book') {
           setLoading(false);
       }
    }
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Verifica se la data è oggi (considerando il fuso orario italiano)
  const isToday = (date: Date): boolean => {
    try {
      const todayItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
      // Confronta usando le componenti UTC della data del calendario con la data italiana
      return date.getUTCDate() === todayItaly.getDate() &&
             date.getUTCMonth() === todayItaly.getMonth() &&
             date.getUTCFullYear() === todayItaly.getFullYear();
    } catch (error) {
      console.error("Errore nel verificare se la data è oggi:", error);
      return false;
    }
  };

  // Trova la prenotazione per una data specifica (usa UTC per confronto)
  const getBookingForDate = (apartment: ApartmentWithBookings, date: Date): Booking | null => {
    try {
        const dateToCheckUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

      return apartment.bookings.find(booking => {
        try {
          // Assicurati che le date di booking siano interpretate correttamente (idealmente come UTC o YYYY-MM-DD)
          // Converti checkIn e checkOut in timestamp UTC a mezzanotte
          const checkInDate = new Date(booking.checkIn);
          const checkOutDate = new Date(booking.checkOut);
          // Normalizza a mezzanotte UTC
          const checkInUTC = Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate());
          // CheckOut è esclusivo, quindi non serve normalizzare l'ora per il confronto '<'
          const checkOutUTC = Date.UTC(checkOutDate.getUTCFullYear(), checkOutDate.getUTCMonth(), checkOutDate.getUTCDate());

          // La data è prenotata se è >= checkIn e < checkOut
          return booking.status === 'confirmed' && dateToCheckUTC >= checkInUTC && dateToCheckUTC < checkOutUTC;
        } catch (e) {
          console.error("Errore parsing date prenotazione", booking, e);
          return false;
        }
      }) || null;
    } catch (error) {
      console.error("Errore nel trovare la prenotazione per la data:", error);
      return null;
    }
  };

  // Verifica la posizione di una data in una prenotazione (inizio, centro, fine, singolo) - Usa UTC
  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' | 'single' => {
    try {
        const dateToCheckUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const checkInUTC = Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate());
      const checkOutUTC = Date.UTC(checkOutDate.getUTCFullYear(), checkOutDate.getUTCMonth(), checkOutDate.getUTCDate());

      // Calcola il giorno prima del check-out in UTC
      const dayBeforeCheckoutUTC = checkOutUTC - 86400000; // Millisecondi in un giorno

      // Caso di prenotazione di un solo giorno (checkOut è il giorno *dopo*)
      if (checkOutUTC === checkInUTC + 86400000) {
          // Verifica se la data corrente è il giorno di check-in
          return dateToCheckUTC === checkInUTC ? 'single' : 'middle'; // Dovrebbe essere sempre 'single' se getBookingForDate funziona
      }

      if (dateToCheckUTC === checkInUTC) {
        return 'start';
      }

      if (dateToCheckUTC === dayBeforeCheckoutUTC) {
        return 'end';
      }

      return 'middle';
    } catch (error) {
      console.error("Errore nel determinare la posizione della prenotazione:", error, booking);
      return 'middle'; // Fallback
    }
  };

  // Verifica se una data è bloccata (usa UTC)
  const isDateBlocked = (apartment: ApartmentWithBookings, date: Date): boolean => {
    try {
        const dateString = date.toISOString().split('T')[0];
      return apartment.rates.some(rate => {
        try {
          // Confronta le stringhe YYYY-MM-DD
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

  // Verifica se una data è selezionata
  const isDateSelected = (apartmentId: string, date: Date): boolean => {
    try {
      const apartmentDates = selectedDates[apartmentId] || {};
      const dateKey = date.toISOString().split('T')[0]; // Usa YYYY-MM-DD
      return !!apartmentDates[dateKey];
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

  // Raggruppa le prenotazioni per appartamento considerando il cambio di mese (Usa UTC)
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

    if (calendarDays.length === 0) return result; // Se non ci sono giorni, non fare nulla

    // Ottieni il primo e l'ultimo giorno del mese corrente in UTC
    const firstDayOfMonthUTC = Date.UTC(currentYear, currentMonth, 1);
    // L'ultimo giorno del mese è il giorno 0 del mese successivo
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    const lastDayOfMonthUTC = Date.UTC(lastDayOfMonth.getUTCFullYear(), lastDayOfMonth.getUTCMonth(), lastDayOfMonth.getUTCDate());


    for (const booking of confirmedBookings) {
      try {
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        // Normalizza a mezzanotte UTC
        const checkInUTC = Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate());
        const checkOutUTC = Date.UTC(checkOutDate.getUTCFullYear(), checkOutDate.getUTCMonth(), checkOutDate.getUTCDate());


        // Verifica se la prenotazione è visibile nel mese corrente
        // La prenotazione è visibile se il check-out (esclusivo) è DOPO l'inizio del mese
        // e il check-in (inclusivo) è PRIMA o UGUALE alla fine del mese
        if (checkOutUTC > firstDayOfMonthUTC && checkInUTC <= lastDayOfMonthUTC) {

          // Determina se la prenotazione inizia nel mese precedente
          const startsInPreviousMonth = checkInUTC < firstDayOfMonthUTC;

          // Determina se la prenotazione finisce nel mese successivo
          // Finisce nel mese successivo se checkOutUTC è maggiore dell'inizio del giorno *dopo* l'ultimo del mese
          const endsInNextMonth = checkOutUTC > (lastDayOfMonthUTC + 86400000);

          // Trova gli indici dei giorni nel calendario (array calendarDays basato su UTC)
          let firstVisibleDayIdx = -1;
          let lastVisibleDayIdx = -1;

          // Trova il primo giorno VISIBILE della prenotazione nel mese corrente
           if (startsInPreviousMonth) {
               firstVisibleDayIdx = 0; // Inizia dal primo giorno del calendario visualizzato
           } else {
               // Trova l'indice del giorno di check-in
               firstVisibleDayIdx = calendarDays.findIndex(day => Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) === checkInUTC);
           }

           // Trova l'ultimo giorno VISIBILE della prenotazione nel mese corrente
           if (endsInNextMonth) {
               lastVisibleDayIdx = calendarDays.length - 1; // Finisce all'ultimo giorno del calendario visualizzato
           } else {
               // Trova l'indice del giorno PRIMA del check-out
               const dayBeforeCheckoutUTC = checkOutUTC - 86400000;
               lastVisibleDayIdx = calendarDays.findIndex(day => Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) === dayBeforeCheckoutUTC);
           }


          // Se entrambi gli indici sono validi (la prenotazione ha almeno un giorno visibile nel mese)
          if (firstVisibleDayIdx !== -1 && lastVisibleDayIdx !== -1 && lastVisibleDayIdx >= firstVisibleDayIdx) {
            result.push({
              booking,
              startIdx: firstVisibleDayIdx,
              endIdx: lastVisibleDayIdx,
              checkIn: checkInDate, // Manteniamo le date originali per riferimento
              checkOut: checkOutDate,
              startsInPreviousMonth,
              endsInNextMonth
            });
          }
        }
      } catch (error) {
        console.error("Errore nell'elaborazione della prenotazione:", booking.id, error);
      }
    }

    return result;
  };


  // Controlla se c'è almeno un giorno da visualizzare
  if (calendarDays.length === 0 && !loading) { // Aggiunto !loading per evitare flicker iniziale
    return (
      <div className="p-4 text-center">
        <p>Caricamento del calendario...</p>
        {/* Potresti aggiungere uno spinner qui */}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex justify-between items-center mb-4 px-1 md:px-0">
        <div className="flex items-center">
          {/* Nome Mese e Anno */}
           <div className="w-36 md:w-48"> {/* Larghezza fissa per evitare spostamenti */}
             <h2 className="text-lg md:text-xl font-semibold mr-2 md:mr-6 truncate">
               {monthNames[currentMonth]} {currentYear}
             </h2>
           </div>

          {/* Pulsanti Navigazione Mese */}
          <div className="flex items-center space-x-1 md:space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={loading}
              aria-label="Mese precedente"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={loading}
              aria-label="Mese successivo"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tasto "Oggi" */}
        <button
          onClick={goToToday}
          className="flex items-center px-2 md:px-3 py-1 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          disabled={loading}
        >
          <CalendarIcon className="w-4 h-4 mr-1 text-gray-500" />
          Oggi
        </button>
      </div>

      {/* Legenda (nascosta su mobile per spazio) */}
       <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-gray-600 px-1">
         <div className="flex items-center"><div className="w-3 h-3 bg-green-100 border border-green-400 mr-1 rounded-sm"></div>Prenotato</div>
         <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-400 mr-1 rounded-sm"></div>Bloccato</div>
         {/* <div className="flex items-center"><div className="w-3 h-3 bg-blue-100 border border-blue-300 mr-1"></div>Disponibile</div> */}
         <div className="flex items-center"><div className="w-3 h-3 bg-purple-100 border border-purple-400 mr-1 rounded-sm"></div>Tariffa Spec.</div>
         <div className="flex items-center"><div className="w-3 h-3 bg-indigo-100 border border-indigo-400 mr-1 rounded-sm"></div>Selezionato</div>
         <div className="flex items-center"><div className="w-3 h-3 bg-blue-50 border border-blue-400 mr-1 rounded-sm"></div>Oggi</div>
         <div className="flex items-center"><div className="w-3 h-3 bg-gray-100 border border-gray-300 mr-1 rounded-sm"></div>Passato</div>
       </div>

      {/* Calendario principale */}
      {/* Aggiunto un contenitore per lo scroll orizzontale */}
       <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
         <table className="min-w-full border-collapse align-top">
          {/* Intestazione Tabella */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {/* Colonna Fissa Appartamento */}
              <th className="sticky left-0 z-20 bg-gray-100 border-b border-r border-gray-200 p-2 min-w-[120px] md:min-w-[180px] text-left text-sm font-medium text-gray-600">
                Appartamento
              </th>

              {/* Colonne Giorni */}
              {calendarDays.map((day, index) => {
                const dateInfo = formatDate(day);
                const isCurrentDay = isToday(day);

                return (
                  <th
                    key={index}
                    className={`border-b border-r border-gray-200 py-1 px-1 min-w-[65px] md:min-w-[70px] text-center font-medium ${
                      isCurrentDay ? "bg-blue-100" : "bg-gray-50" // Sfondo leggermente diverso per oggi nell'header
                    }`}
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }} // Fix rendering issues on scroll with sticky
                  >
                    <div className="text-xs text-gray-500">{dateInfo.weekday}</div>
                    <div className={`text-base md:text-lg ${isCurrentDay ? "font-bold text-blue-600" : "text-gray-700"}`}>
                      {dateInfo.day}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Corpo Tabella */}
          <tbody className="bg-white">
            {apartments.map((apartment) => {
              const selectedCount = getSelectedDatesCount(apartment.id);
              const processedBookings = processBookings(apartment); // Calcola una volta per riga

              return (
                <tr key={apartment.id} className="relative hover:bg-gray-50/50 transition-colors duration-150">
                  {/* Cella Fissa Nome Appartamento */}
                  <td
                    className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 font-medium group" // Aggiunto group per hover
                    // style={{ backgroundColor: 'inherit' }} // Eredita sfondo da TR per hover
                     style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }} // Fix rendering issues on scroll with sticky
                  >
                    <div className="flex justify-between items-center min-h-[40px]"> {/* Altezza minima per allineamento */}
                      <span
                        className="cursor-pointer hover:text-blue-600 truncate text-sm md:text-base text-gray-800 group-hover:text-blue-700" // Cambia colore al passaggio del mouse sulla riga
                        onClick={() => handleApartmentClick(apartment.id)}
                        title={apartment.data?.name || "Appartamento"}
                      >
                        {apartment.data?.name || "Appartamento"}
                      </span>

                      {/* Pulsante modifica in blocco */}
                      {selectedCount > 0 && (
                        <button
                          className="ml-1 md:ml-2 p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs flex items-center flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); openBulkEditModal(apartment.id); }} // Stop propagation
                          title={`Modifica ${selectedCount} date`}
                        >
                          <AdjustmentsHorizontalIcon className="w-4 h-4 md:mr-0.5" />
                          <span className="hidden sm:inline font-normal">{selectedCount}</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Celle Giorni */}
                  {calendarDays.map((day, dayIndex) => {
                    const isPast = isPastDate(day);
                    const isCurrentDay = isToday(day);
                    const isBlocked = isDateBlocked(apartment, day);
                    const isSelected = isDateSelected(apartment.id, day);
                    const price = getPriceForDate(apartment, day);
                    const rateInfo = apartment.rates.find(rate => new Date(rate.date).toISOString().split('T')[0] === day.toISOString().split('T')[0]);
                    const hasCustomPrice = rateInfo?.price !== undefined && rateInfo.price !== apartment.data.price;
                    const minStay = rateInfo?.minStay ?? apartment.data.minStay ?? null; // Trova minStay

                    // ** INIZIO LOGICA RENDER CELLA MODIFICATA **
                    const bookingInfo = processedBookings.find(b => dayIndex >= b.startIdx && dayIndex <= b.endIdx);

                    let cellClass = "border-b border-r border-gray-200 relative text-center align-top h-[60px] p-0"; // Altezza fissa, padding 0
                    let content = null;
                    let title = ''; // Tooltip per la cella

                    const dropdownId = `dropdown-${apartment.id}-${day.getTime()}`;
                    const isDropdownActive = activeDropdown === dropdownId;

                    // --- 1. Gestione Cella Prenotata ---
                    if (bookingInfo) {
                      const position = getBookingPosition(day, bookingInfo.booking);
                      cellClass += " bg-green-100"; // Sfondo verde base per tutte le celle prenotate

                      // Bordi per creare l'effetto striscia continua
                      cellClass += " border-t-2 border-b-2 border-green-400"; // Bordi sopra/sotto sempre presenti
                      if (dayIndex === bookingInfo.startIdx) {
                           cellClass += " border-l-2 rounded-l-md"; // Bordo sinistro e arrotondamento inizio
                           if(bookingInfo.startsInPreviousMonth) cellClass += " border-l-emerald-600"; // Bordo più scuro se continua da prima
                      } else {
                           cellClass += " border-l-green-100"; // Bordo interno dello stesso colore dello sfondo per continuità
                      }
                       if (dayIndex === bookingInfo.endIdx) {
                            cellClass += " border-r-2 rounded-r-md"; // Bordo destro e arrotondamento fine
                            if(bookingInfo.endsInNextMonth) cellClass += " border-r-emerald-600"; // Bordo più scuro se continua dopo
                       } else {
                            cellClass += " border-r-green-100"; // Bordo interno
                       }

                       // Rimuovi bordi grigi di default dove ci sono quelli verdi
                       cellClass = cellClass.replace("border-r border-gray-200", "");
                       if (dayIndex > bookingInfo.startIdx) cellClass = cellClass.replace("border-l border-gray-200", "");


                      // Contenuto testuale (solo sulla prima cella visibile)
                      if (dayIndex === bookingInfo.startIdx) {
                        content = (
                          <div
                            data-booking-clickable="true" // Attributo per evitare apertura dropdown su click testo
                            className="absolute inset-0 flex flex-col justify-center items-center p-1 text-xs overflow-hidden cursor-pointer z-5 text-green-900"
                            onClick={(e) => {
                              e.stopPropagation(); // Impedisce al click sulla cella di aprirsi
                              router.push(`/bookings/${bookingInfo.booking.id}`);
                            }}
                             title={`Vai a prenotazione ${bookingInfo.booking.guestName}`} // Tooltip specifico per il link
                          >
                            <div className="font-semibold truncate w-full text-center">{bookingInfo.booking.guestName}</div>
                             {/* <div className="truncate w-full text-center">{bookingInfo.booking.numberOfGuests} ospiti</div> */}
                             {/* <div className="font-medium truncate w-full text-center">{bookingInfo.booking.totalPrice}€</div> */}
                          </div>
                        );
                      } else {
                           // Celle successive della prenotazione: solo sfondo, nessun contenuto sovrapposto
                           content = <div className="h-full w-full"></div>;
                      }
                       title = `${bookingInfo.booking.guestName} (${bookingInfo.booking.numberOfGuests} ospiti) - Check-in: ${bookingInfo.checkIn.toLocaleDateString()}, Check-out: ${bookingInfo.checkOut.toLocaleDateString()}`;

                    // --- 2. Gestione Cella Selezionata (non prenotata) ---
                    } else if (isSelected) {
                        cellClass += " bg-indigo-100 border-indigo-400"; // Sfondo e bordo selezione
                        content = (
                            <div className="h-full flex flex-col items-center justify-center pt-1">
                                <span className="text-xs md:text-sm text-indigo-800 mb-1">{price}€</span>
                                 <input
                                    type="checkbox"
                                    className="h-3 w-3 md:h-4 md:w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    checked={true}
                                    aria-label={`Deseleziona ${formatDate(day).day} ${monthNames[currentMonth]}`}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleCheckboxChange(apartment.id, day, e.target.checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        );
                        title = `Data selezionata. Prezzo: ${price}€.`;
                        if (minStay && minStay > 1) title += ` Min stay: ${minStay} notti.`;


                    // --- 3. Gestione Cella Bloccata (non prenotata, non selezionata) ---
                    } else if (isBlocked) {
                      cellClass += " bg-red-100 border-red-400"; // Sfondo rosso bloccato
                      // Pattern a righe diagonali per maggiore visibilità
                      cellClass += " bg-[repeating-linear-gradient(45deg,_rgba(254,202,202,0.5),_rgba(254,202,202,0.5)_5px,_rgba(254,226,226,0.5)_5px,_rgba(254,226,226,0.5)_10px)]";
                      content = (
                        <div className="h-full flex items-center justify-center text-xs font-medium text-red-700 px-1">
                          {/* Bloccato */}
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                           </svg>
                        </div>
                      );
                      title = "Data bloccata manualmente.";

                    // --- 4. Gestione Cella Disponibile (non prenotata, non sel, non bloccata) ---
                    } else {
                       // Applica sfondi diversi per passato, oggi, futuro
                       if (hasCustomPrice && !isPast) {
                           cellClass += " bg-purple-100 border-purple-400"; // Tariffa speciale
                           title = `Tariffa speciale: ${price}€.`;
                       } else if (isCurrentDay) {
                           cellClass += " bg-blue-50 border-blue-400"; // Oggi
                           title = `Oggi. Prezzo: ${price}€.`;
                       } else if (isPast) {
                           cellClass += " bg-gray-100 text-gray-400 border-gray-300"; // Passato
                           title = `Data passata. Prezzo storico: ${price}€.`;
                       } else {
                           cellClass += " bg-white hover:bg-gray-50"; // Disponibile futura (standard)
                           title = `Disponibile. Prezzo: ${price}€.`;
                       }
                       if (minStay && minStay > 1 && !isPast) title += ` Min stay: ${minStay} notti.`;


                      // Contenuto per celle disponibili (prezzo e checkbox se non passata)
                      content = (
                        <div className="h-full flex flex-col items-center justify-between py-1 px-0.5">
                          <span className={`text-xs md:text-sm font-medium ${isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                            {price}€
                          </span>
                           {/* Mostra MinStay se > 1 e non nel passato */}
                           {minStay && minStay > 1 && !isPast && (
                               <span className="text-[10px] text-gray-500 -mt-1">min {minStay}n</span>
                           )}
                           {/* Spazio vuoto se non c'è min stay per allineare checkbox */}
                           {(!minStay || minStay <= 1) && !isPast && <span className="h-[14px]"></span>}

                          {/* Checkbox solo se non è passata */}
                          {!isPast ? (
                            <input
                              type="checkbox"
                              className="h-3 w-3 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              checked={isSelected} // Sarà sempre false qui, ma lo teniamo per coerenza logica
                              aria-label={`Seleziona ${formatDate(day).day} ${monthNames[currentMonth]}`}
                              disabled={isPast}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleCheckboxChange(apartment.id, day, e.target.checked);
                              }}
                              onClick={(e) => e.stopPropagation()} // Impedisce apertura dropdown
                            />
                          ) : (
                            // Placeholder per mantenere l'altezza nelle date passate
                             <div className="h-3 w-3 md:h-4 md:w-4"></div>
                          )}
                        </div>
                      );
                    }
                     // ** FINE LOGICA RENDER CELLA MODIFICATA **


                    return (
                      <td
                        key={dayIndex}
                        className={cellClass}
                        title={title} // Aggiunto tooltip alla cella
                        ref={isCurrentDay ? todayCellRef : null}
                         // Aggiungi data attribute per aiutare il leave timeout
                         data-dropdown-id={`dropdown-${apartment.id}-${day.getTime()}`}
                         // Apri dropdown al click sulla cella (non sul contenuto interattivo)
                         onClick={(e) => handleDateClick(apartment.id, day, e, bookingInfo ? bookingInfo.booking : null)}
                         // Gestisci uscita mouse con ritardo
                         onMouseLeave={(e) => handleMouseLeaveWithDelay(e.relatedTarget)}
                      >
                        {/* Contenitore interno per posizionamento relativo del contenuto */}
                        <div className="relative w-full h-full">
                          {content}
                        </div>

                        {/* Menu contestuale dropdown (invariato ma posizionato fuori dal flusso normale) */}
                        {isDropdownActive && (
                             <div
                             id={dropdownId}
                             className="fixed z-50 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1"
                             // Impedisce al mouse leave della cella di chiuderlo se il mouse è sopra
                             onMouseEnter={() => { /* Potrebbe servire a mantenere aperto */ }}
                             onMouseLeave={(e) => handleMouseLeaveWithDelay(e.relatedTarget)}
                             >
                             {/* Titolo Dropdown con Data */}
                             <div className="px-3 py-1 border-b border-gray-100 mb-1">
                                 <p className="text-sm font-medium text-gray-800">
                                     {formatDate(day).weekday} {formatDate(day).day} {monthNames[currentMonth]}
                                 </p>
                                 {bookingInfo && <p className="text-xs text-green-700 font-medium">Prenotato</p>}
                                 {isBlocked && !bookingInfo && <p className="text-xs text-red-700 font-medium">Bloccato</p>}
                                 {!bookingInfo && !isBlocked && <p className="text-xs text-blue-700 font-medium">Disponibile</p>}
                             </div>

                             {/* Azioni Dropdown */}
                             <div className="text-sm">
                               {/* Azione Calendario Singolo */}
                               <button
                                 className="flex w-full items-center px-3 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                 onClick={() => {
                                   setActiveDropdown(null);
                                   router.push(`/apartments/${apartment.id}/calendar?date=${day.toISOString().split('T')[0]}`);
                                 }}
                               >
                                 <CalendarIcon className="w-4 h-4 mr-2 text-gray-400"/> Calendario
                               </button>

                               {/* Azioni per Prenotazioni */}
                               {bookingInfo && (
                                 <>
                                 <button
                                   className="flex w-full items-center px-3 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                   onClick={() => { setActiveDropdown(null); router.push(`/bookings/${bookingInfo.booking.id}`); }}
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-gray-400"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.18l.879-.581a1.724 1.724 0 0 0 .52-.777l.581-.879A1.651 1.651 0 0 1 3.49 6.84l.879.581a1.724 1.724 0 0 0 .777.52l.879.581a1.651 1.651 0 0 1 1.18 0l.879-.581a1.724 1.724 0 0 0 .777-.52l.581-.879a1.651 1.651 0 0 1 1.825 0l.581.879a1.724 1.724 0 0 0 .777.52l.879.581a1.651 1.651 0 0 1 1.18 0l.879.581a1.724 1.724 0 0 0 .52.777l.581.879a1.651 1.651 0 0 1 0 1.18l-.879.581a1.724 1.724 0 0 0-.52.777l-.581.879a1.651 1.651 0 0 1-1.825 0l-.581-.879a1.724 1.724 0 0 0-.777-.52l-.879-.581a1.651 1.651 0 0 1-1.18 0l-.879.581a1.724 1.724 0 0 0-.777.52l-.581.879a1.651 1.651 0 0 1-1.825 0l-.581-.879a1.724 1.724 0 0 0-.777-.52l-.879-.581a1.651 1.651 0 0 1-1.18 0l-.879-.581a1.724 1.724 0 0 0-.52-.777l-.581-.879a1.651 1.651 0 0 1 0-1.18l.879-.581.001.001ZM10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" clipRule="evenodd" /></svg>
                                     Dettagli
                                 </button>
                                 <button
                                   className="flex w-full items-center px-3 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                   onClick={() => { setActiveDropdown(null); router.push(`/bookings/${bookingInfo.booking.id}/edit`); }}
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-gray-400"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.886 1.343Z" /></svg>
                                     Modifica
                                 </button>
                                 </>
                               )}

                               {/* Azioni per Disponibili/Bloccate (solo se non passato) */}
                               {!isPast && !bookingInfo && (
                                 <>
                                   {!isBlocked ? (
                                     <button
                                       className="flex w-full items-center px-3 py-1.5 text-gray-700 hover:bg-red-50 hover:text-red-700"
                                       onClick={() => handleQuickAction(apartment.id, day, 'block')}
                                       disabled={loading}
                                     >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-gray-400"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                                         Blocca
                                     </button>
                                   ) : (
                                     <button
                                       className="flex w-full items-center px-3 py-1.5 text-gray-700 hover:bg-green-50 hover:text-green-700"
                                       onClick={() => handleQuickAction(apartment.id, day, 'unblock')}
                                       disabled={loading}
                                     >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-gray-400"><path fillRule="evenodd" d="M14.5 1A4.5 4.5 0 0 0 10 5.5V9H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 14.5 1Zm-5 8V5.5a3 3 0 1 1 6 0V9h-6Z" clipRule="evenodd" /></svg>
                                         Sblocca
                                     </button>
                                   )}
                                   {!isBlocked && ( // Mostra "Prenota" solo se disponibile
                                     <button
                                       className="flex w-full items-center px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                       onClick={() => handleQuickAction(apartment.id, day, 'book')}
                                       disabled={loading}
                                     >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-gray-400"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                                         Prenota
                                     </button>
                                   )}
                                 </>
                               )}

                               {/* Messaggio per date passate */}
                               {isPast && !bookingInfo && (
                                   <span className="block px-3 py-1.5 text-xs text-gray-400 italic">Data passata</span>
                               )}
                             </div>
                           </div>
                        )}

                      </td>
                    );
                  })} {/* Fine map giorni */}
                </tr>
              );
            })} {/* Fine map appartamenti */}
          </tbody>
        </table>
       </div> {/* Fine div overflow */}

      {/* Pulsanti rapidi appartamenti - visibili solo su mobile */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 z-30 shadow-[0_-2px_5px_rgba(0,0,0,0.1)]">
         <div className="grid grid-cols-3 gap-2">
           {apartments.slice(0, 2).map((apt) => ( // Mostra solo i primi 2 + Aggiungi
             <Link
               key={apt.id}
               href={`/apartments/${apt.id}/calendar`}
               className="flex flex-col items-center justify-center h-14 bg-gray-50 border border-gray-200 rounded-lg shadow-sm text-center px-1 py-1"
             >
               {/* Icona semplice o iniziale */}
                <span className="text-xl font-bold text-blue-600">{apt.data?.name?.charAt(0) || 'A'}</span>
               <span className="text-xs font-medium text-gray-700 truncate w-full mt-0.5">{apt.data?.name || "Appartamento"}</span>
             </Link>
           ))}
           {/* Pulsante Aggiungi */}
           <Link
             href="/apartments/new"
             className="flex flex-col items-center justify-center h-14 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg shadow-sm text-center px-1 py-1"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-0.5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
             </svg>
             <span className="text-xs font-medium">Aggiungi</span>
           </Link>
           {/* Se ci sono più di 2 appartamenti, potresti aggiungere un pulsante "Altro..." */}
         </div>
       </div>
       {/* Padding bottom per evitare che il contenuto finisca sotto i pulsanti fissi */}
       <div className="pb-20 md:pb-0"></div>


      {/* Modal per la modifica in blocco (invariato) */}
      <Transition.Root show={isBulkEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !loading && setIsBulkEditModalOpen(false)}> {/* Impedisci chiusura durante loading */}
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
                        Modifica Tariffe/Restrizioni in Blocco
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 mt-1">
                         Applica modifiche a {getSelectedDatesCount(bulkEditApartmentId || '')} date selezionate
                         per {apartments.find(a => a.id === bulkEditApartmentId)?.data?.name || 'Appartamento'}.
                      </p>

                      <div className="mt-4 space-y-4">
                        {/* Prezzo */}
                        <div>
                          <label htmlFor="bulkPrice" className="block text-sm font-medium text-gray-700">
                            Nuovo Prezzo (€) <span className="text-gray-400 font-normal">(opzionale)</span>
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
                            Soggiorno Minimo (notti) <span className="text-gray-400 font-normal">(opzionale)</span>
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
                                 Rendi Disponibile (Sblocca)
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
                                 Rendi Non Disponibile (Blocca)
                               </label>
                             </div>
                           </div>
                         </fieldset>

                      </div>
                    </div>
                  </div>

                  {/* Pulsanti Azione Modal */}
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-start-2 ${
                        loading
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600'
                      }`}
                      onClick={handleBulkEditSave}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Salvataggio...
                        </>
                      ) : 'Salva Modifiche'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 disabled:opacity-50"
                      onClick={() => setIsBulkEditModalOpen(false)}
                      disabled={loading} // Disabilita anche annulla durante il caricamento
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

    </div> // Fine contenitore principale
  );
}
