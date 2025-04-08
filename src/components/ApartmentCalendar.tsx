'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, XMarkIcon, TrashIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import DayCell from '@/components/DayCell';
import RateModal from '@/components/RateModal';
import BulkEditModal from '@/components/BulkEditModal';
import BookingFormModal from '@/components/BookingFormModal';

// Interfaccia Booking aggiornata per rispecchiare il modello Mongoose
interface Booking {
  id: string; // Corrisponde a _id
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; // Stato della prenotazione
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed'; // Stato del pagamento
  numberOfGuests: number;
  totalPrice: number;
  guestEmail?: string;
  guestPhone?: string;
  source?: string;
}

interface DailyRate {
  _id?: string;
  date: Date;
  price?: number;
  isBlocked: boolean;
  minStay?: number;
  notes?: string;
}

interface SeasonalPrice {
  name: string;
  startDate: Date;
  endDate: Date;
  price: number;
}

interface ApartmentCalendarProps {
  apartmentId: string;
  apartmentData: any; // Considera di tipizzare meglio apartmentData
  // Le bookings passate qui dovrebbero includere TUTTE le prenotazioni (anche pending)
  // Il componente deciderà come visualizzarle
  bookings: Booking[];
}

export default function ApartmentCalendar({ apartmentId, apartmentData, bookings }: ApartmentCalendarProps) {
  const router = useRouter();

  // Usa Date object standard, la formattazione specifica per timezone avverrà dove serve
  const [currentDateState, setCurrentDateState] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDateState.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateState.getFullYear());
  const [calendarDays, setCalendarDays] = useState<Array<Date | null>>([]);
  const [dailyRates, setDailyRates] = useState<Record<string, DailyRate>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seasonalInfo, setSeasonalInfo] = useState<Record<string, SeasonalPrice>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBookingStartDate, setNewBookingStartDate] = useState<Date>(new Date());
  const [newBookingEndDate, setNewBookingEndDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const calendarGridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  const setCellRef = useCallback((el: HTMLDivElement | null, index: number) => {
    cellRefs.current[index] = el;
  }, []); // Rimosso dependency array perché cellRefs.current viene mutato

  // --- FUNZIONI HELPER ---
  const dateToString = (date: Date): string => {
    // Usa UTC per evitare problemi di timezone nella chiave stringa
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getTodayInItaly = (): Date => {
     // Più robusto per ottenere l'inizio del giorno in Italia
     const now = new Date();
     const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
     const [year, month, day] = formatter.format(now).split('-');
     return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  };


  const isPastDate = (date: Date): boolean => {
    const todayUTCStart = getTodayInItaly(); // Ottiene mezzanotte UTC per la data italiana
    const compareDateUTCStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return compareDateUTCStart < todayUTCStart;
  };

   const isToday = (date: Date): boolean => {
     const todayUTCStart = getTodayInItaly();
     const compareDateUTCStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
     return compareDateUTCStart.getTime() === todayUTCStart.getTime();
   };


  // --- CARICAMENTO DATI ---
  useEffect(() => {
    generateCalendarDays(currentYear, currentMonth);
    loadDailyRates();
    processSeasonalPrices();
  }, [currentYear, currentMonth, apartmentData.seasonalPrices]); // Aggiunto dependency

  const processSeasonalPrices = useCallback(() => { // useCallback per stabilità
    if (!apartmentData.seasonalPrices || !apartmentData.seasonalPrices.length) {
      setSeasonalInfo({});
      return;
    }
    const seasonMap: Record<string, SeasonalPrice> = {};
    apartmentData.seasonalPrices.forEach((season: any) => { // Usa 'any' se la struttura non è garantita
      // Converti le stringhe di data in oggetti Date UTC per coerenza
      const startDate = new Date(season.startDate);
      const endDate = new Date(season.endDate);
      const startUTC = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
      const endUTC = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()));


      let currentDate = new Date(startUTC);
      while (currentDate <= endUTC) {
        const dateStr = dateToString(currentDate); // Usa la funzione helper standardizzata
        seasonMap[dateStr] = {
          ...season,
          startDate: startUTC, // Salva come Date UTC
          endDate: endUTC     // Salva come Date UTC
        };
        currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Incrementa in UTC
      }
    });
    setSeasonalInfo(seasonMap);
  }, [apartmentData.seasonalPrices]); // Dipende da seasonalPrices

  const generateCalendarDays = (year: number, month: number) => {
    // Usa UTC per la logica del calendario per evitare problemi con DST
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDayOfMonth.getUTCDate();

    // getDay() restituisce 0 (Dom) - 6 (Sab). Vogliamo Lun (0) - Dom (6)
    const firstDayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7;

    const days: Array<Date | null> = [];

    // Giorni mese precedente (in UTC)
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDay = new Date(Date.UTC(year, month, 1 - firstDayOfWeek + i));
      days.push(prevMonthDay);
    }

    // Giorni mese corrente (in UTC)
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(Date.UTC(year, month, i)));
    }

    // Giorni mese successivo (in UTC)
    const totalCells = days.length;
    const remainingCells = totalCells < 35 ? 35 - totalCells : 42 - totalCells; // Assicura 5 o 6 righe
    for (let i = 1; i <= remainingCells; i++) {
       const nextMonthDay = new Date(Date.UTC(year, month + 1, i));
      days.push(nextMonthDay);
    }

    setCalendarDays(days);
    cellRefs.current = Array(days.length).fill(null);
  };

  const loadDailyRates = useCallback(async () => { // useCallback
    setLoading(true);
    try {
       // Calcola primo/ultimo giorno visualizzato basandosi su calendarDays generato in UTC
       if (calendarDays.length === 0) {
           // Se calendarDays non è ancora pronto, aspetta il prossimo render
           // Questo può succedere al primo caricamento. generateCalendarDays verrà chiamato prima.
           // Potremmo anche derivare le date qui, ma usare calendarDays è più sicuro.
            const firstOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
            const lastOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
            // Stima approssimativa se calendarDays non è pronto
            const approxStartDate = new Date(firstOfMonth);
            approxStartDate.setUTCDate(approxStartDate.getUTCDate() - 7);
            const approxEndDate = new Date(lastOfMonth);
            approxEndDate.setUTCDate(approxEndDate.getUTCDate() + 7);

            const firstDayStr = dateToString(approxStartDate);
            const lastDayStr = dateToString(approxEndDate);

             const response = await fetch(`/api/apartments/${apartmentId}/rates?startDate=${firstDayStr}&endDate=${lastDayStr}`);
             if (!response.ok) throw new Error(`Errore caricamento tariffe: ${response.statusText}`);
             const data = await response.json();
             const ratesMap: Record<string, DailyRate> = {};
             data.forEach((rate: any) => {
               const rateDate = new Date(rate.date); // Assume che l'API ritorni date ISO valide
               const dateStr = dateToString(rateDate);
               ratesMap[dateStr] = { ...rate, date: rateDate };
             });
             setDailyRates(ratesMap);

       } else {
          // Usa le date esatte dal calendario visualizzato
          const firstDayShown = calendarDays[0]!;
          const lastDayShown = calendarDays[calendarDays.length - 1]!;
          const firstDayStr = dateToString(firstDayShown);
          const lastDayStr = dateToString(lastDayShown);

          const response = await fetch(`/api/apartments/${apartmentId}/rates?startDate=${firstDayStr}&endDate=${lastDayStr}`);
          if (!response.ok) throw new Error(`Errore caricamento tariffe: ${response.statusText}`);
          const data = await response.json();
          const ratesMap: Record<string, DailyRate> = {};
          data.forEach((rate: any) => {
            const rateDate = new Date(rate.date); // Assume date ISO
             const dateStr = dateToString(rateDate);
             ratesMap[dateStr] = { ...rate, date: rateDate };
          });
          setDailyRates(ratesMap);
       }

    } catch (error) {
      console.error('Error loading daily rates:', error);
      toast.error('Errore nel caricamento delle tariffe');
    } finally {
      setLoading(false);
    }
  }, [apartmentId, currentYear, currentMonth, calendarDays]); // Aggiunto calendarDays

  // --- NAVIGAZIONE CALENDARIO ---
  const goToPreviousMonth = () => {
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 0) {
        setCurrentYear(currentYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
    // Resetta selezione date
    setSelectedDates([]);
    setIsSelectionMode(false);
  };

  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 11) {
        setCurrentYear(currentYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
     // Resetta selezione date
     setSelectedDates([]);
     setIsSelectionMode(false);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    toast.success('Visualizzazione impostata al mese corrente');
    setSelectedDates([]);
    setIsSelectionMode(false);
  };

  // --- GESTIONE INTERAZIONI ---
  const handleDayClick = (date: Date) => {
    if (isPastDate(date) && !isSelectionMode) {
        toast("Non puoi modificare date passate.", { icon: '⚠️'});
        return; // Non aprire modal per date passate se non in selezione
    }

    if (isSelectionMode) {
      const dateStr = dateToString(date);
      const index = selectedDates.findIndex(d => dateToString(d) === dateStr);
      if (index >= 0) {
        setSelectedDates(selectedDates.filter((_, i) => i !== index));
      } else {
        // Non permettere selezione di date passate in selection mode? O sì? Decidiamo di sì.
        setSelectedDates([...selectedDates, date].sort((a, b) => a.getTime() - b.getTime()));
      }
    } else {
      // Apri sempre il modal se non siamo in selection mode (anche per date passate, in sola lettura?)
      // Oppure impedisci l'apertura se la data è passata? Modifichiamo per aprirlo.
       setSelectedDate(date);
       setIsRateModalOpen(true);
    }
  };

  const selectAllMonth = () => {
    setIsSelectionMode(true);
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
    const dates: Date[] = [];
    const today = getTodayInItaly(); // Per confronto date passate

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(Date.UTC(currentYear, currentMonth, i));
       // Decidi se includere date passate nella selezione di tutto il mese
       // if (!isPastDate(date)) { // Opzione: escludi passate
          dates.push(date);
       // }
    }
    setSelectedDates(dates);
    toast.success(`Selezionate ${dates.length} date nel mese`);
  };

  // --- LOGICA DI VISUALIZZAZIONE PRENOTAZIONI ---

  // **MODIFICA CHIAVE**: Ottieni solo le prenotazioni CONFERMATE per una data specifica
  // Le prenotazioni 'pending' non contano come blocco visivo/logico qui.
  const getConfirmedBookingForDate = (date: Date): Booking | null => {
    const dateStr = dateToString(date); // Confronto basato sulla stringa YYYY-MM-DD UTC

    return bookings.find(booking => {
        // Considera solo prenotazioni CONFERMATE o COMPLETATE come bloccanti
        if (booking.status !== 'confirmed' && booking.status !== 'completed') {
            return false;
        }
        // Confronta le date in UTC per evitare problemi di timezone/DST
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));
        const checkOutUTC = new Date(Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()));
        const dateToCheckUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

        // La data è compresa tra check-in (incluso) e check-out (escluso)
        return dateToCheckUTC >= checkInUTC && dateToCheckUTC < checkOutUTC;
    }) || null;
  };

  // Funzione originale mantenuta se serve per altri scopi, ma rinominata per chiarezza
   const getAnyBookingForDate = (date: Date): Booking | null => {
     const dateStr = dateToString(date);
     return bookings.find(booking => {
       const checkIn = new Date(booking.checkIn);
       const checkOut = new Date(booking.checkOut);
       const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));
       const checkOutUTC = new Date(Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()));
       const dateToCheckUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
       return dateToCheckUTC >= checkInUTC && dateToCheckUTC < checkOutUTC;
     }) || null;
   };


  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' | 'single' => {
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));
    const checkOutUTC = new Date(Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()));

    const lastDayOfBookingUTC = new Date(checkOutUTC);
    lastDayOfBookingUTC.setUTCDate(lastDayOfBookingUTC.getUTCDate() - 1); // Giorno prima del checkout

    if (checkInUTC.getTime() === lastDayOfBookingUTC.getTime()) {
      return 'single';
    }
    if (dateUTC.getTime() === checkInUTC.getTime()) {
      return 'start';
    }
    if (dateUTC.getTime() === lastDayOfBookingUTC.getTime()) {
      return 'end';
    }
    return 'middle';
  };

  // --- LOGICA VISUALIZZAZIONE CELLE ---
  const hasCustomRate = (date: Date): boolean => {
    const dateStr = dateToString(date);
    // Considera custom se ha un prezzo o minStay definito
    return dateStr in dailyRates && (dailyRates[dateStr].price !== undefined || dailyRates[dateStr].minStay !== undefined);
  };

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return dateStr in dailyRates && dailyRates[dateStr].isBlocked === true;
  };

  const isDateSelected = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return selectedDates.some(d => dateToString(d) === dateStr);
  };

  const getSeasonForDate = (date: Date): SeasonalPrice | null => {
    const dateStr = dateToString(date);
    return seasonalInfo[dateStr] || null;
  };

  const getPriceForDate = (date: Date): number => {
    const dateStr = dateToString(date);
    if (dateStr in dailyRates && dailyRates[dateStr].price !== undefined) {
      return dailyRates[dateStr].price!;
    }
    const season = getSeasonForDate(date);
    if (season) {
      return season.price;
    }
    return apartmentData.price || 0; // Prezzo base
  };

  const getMinStayForDate = (date: Date): number => {
    const dateStr = dateToString(date);
    if (dateStr in dailyRates && dailyRates[dateStr].minStay !== undefined) {
      return dailyRates[dateStr].minStay!;
    }
    // Non considerare minStay stagionale per ora, solo giornaliero o base
    return apartmentData.minStay || 1; // Min stay base
  };

  // --- AZIONI (Salvataggio, Modifica, Blocco, etc.) ---

   const handleCreateBooking = () => {
     if (selectedDates.length === 0) {
       toast.error('Seleziona almeno una data per creare una prenotazione');
       return;
     }
     const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

     // Verifica se QUALSIASI data selezionata ha GIA' una prenotazione CONFERMATA
     for (const date of sortedDates) {
       if (getConfirmedBookingForDate(date)) {
         toast.error('Ci sono già prenotazioni confermate nelle date selezionate');
         return;
       }
     }

     // Verifica se le date selezionate sono consecutive (opzionale ma consigliato)
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const current = sortedDates[i];
        const next = sortedDates[i+1];
        const diff = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
        if (diff !== 1) {
          toast.error("Le date selezionate devono essere consecutive.");
          return;
        }
      }


     // Verifica soggiorno minimo sulla PRIMA data (o potresti calcolarlo su tutto il range)
     const minStay = getMinStayForDate(sortedDates[0]);
     if (sortedDates.length < minStay) {
       toast.error(`Il soggiorno minimo per l'inizio del periodo è di ${minStay} notti`);
       return;
     }

     const checkIn = new Date(sortedDates[0]); // Prima data selezionata
     const checkOut = new Date(sortedDates[sortedDates.length - 1]);
     checkOut.setDate(checkOut.getDate() + 1); // Giorno DOPO l'ultima data selezionata

     setNewBookingStartDate(checkIn);
     setNewBookingEndDate(checkOut);
     setIsNewBookingModalOpen(true);
     // Esci dalla modalità selezione dopo aver aperto il modal
     // setIsSelectionMode(false);
     // setSelectedDates([]); // Svuota selezione? Forse no, l'utente potrebbe annullare il modal
   };

   const handleCreateBookingFromDate = (date: Date) => {
      if (isPastDate(date)){
          toast.error("Non puoi creare prenotazioni nel passato.");
          return;
      }

     const minStay = getMinStayForDate(date);
     const startDate = new Date(date);
     const endDate = new Date(date);
     endDate.setDate(endDate.getDate() + minStay); // Data di checkout

     // Verifica che non ci siano prenotazioni CONFERMATE nel periodo minimo
     for (let i = 0; i < minStay; i++) {
       const checkDate = new Date(startDate);
       checkDate.setDate(checkDate.getDate() + i);
       if (getConfirmedBookingForDate(checkDate)) {
         toast.error('Ci sono già prenotazioni confermate nel periodo minimo di soggiorno');
         return;
       }
     }

     setNewBookingStartDate(startDate);
     setNewBookingEndDate(endDate);
     setIsRateModalOpen(false); // Chiudi il modal tariffe se aperto
     setIsNewBookingModalOpen(true);
   };

   // Funzioni saveRate, bulkEdit, blockDates, resetPrices, resetMinStay
   // dovrebbero usare fetch API e poi chiamare loadDailyRates() o router.refresh()
   // per aggiornare la vista. Il codice API sembra corretto.
   // Aggiungiamo gestione loading e refresh.

   const handleSaveRate = async (rateData: any) => {
     if (!selectedDate) return;
     setLoading(true);
     try {
       const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ date: selectedDate.toISOString(), ...rateData }),
       });
       if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Errore nel salvataggio della tariffa');
       }
       await loadDailyRates(); // Ricarica le tariffe aggiornate
       toast.success('Tariffa aggiornata con successo');
       setIsRateModalOpen(false);
     } catch (error: any) {
       console.error('Error saving rate:', error);
       toast.error(`Errore: ${error.message}`);
     } finally {
       setLoading(false);
     }
   };

  const handleBulkEdit = async (rateData: any) => {
    if (selectedDates.length === 0) return;
    setLoading(true);
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: sortedDates[0].toISOString(),
          endDate: sortedDates[sortedDates.length - 1].toISOString(),
          ...rateData
        }),
      });
       if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Errore nella modifica in blocco');
       }
      await loadDailyRates();
      toast.success(`Modifiche applicate a ${selectedDates.length} date`);
      setIsBulkEditModalOpen(false);
      setIsSelectionMode(false);
      setSelectedDates([]);
    } catch (error: any) {
      console.error('Error bulk editing:', error);
      toast.error(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

   const handleBlockDates = async (startDate: Date, endDate: Date, isBlocked: boolean) => {
       setLoading(true);
       try {
         const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             startDate: startDate.toISOString(),
             endDate: endDate.toISOString(),
             isBlocked
           }),
         });
         if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Errore nella modifica delle date');
         }
         await loadDailyRates();
         toast.success(isBlocked ? 'Date bloccate con successo' : 'Date sbloccate con successo');
       } catch (error: any) {
         console.error('Error blocking/unblocking dates:', error);
         toast.error(`Errore: ${error.message}`);
       } finally {
         setLoading(false);
       }
     };

    const handleResetPrices = async () => {
       setLoading(true);
       try {
           const today = getTodayInItaly();
           const datesToReset = Object.values(dailyRates)
               .filter(rate => new Date(rate.date) >= today && rate.price !== undefined)
               .map(rate => new Date(rate.date));

           if (datesToReset.length === 0) {
               toast('Nessun prezzo personalizzato futuro da resettare');
               return;
           }
           const sortedDates = datesToReset.sort((a, b) => a.getTime() - b.getTime());
           const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   startDate: sortedDates[0].toISOString(),
                   endDate: sortedDates[sortedDates.length - 1].toISOString(),
                   price: null, // Resetta prezzo
                   resetPrices: true // Flag opzionale per API
               }),
           });
           if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel reset dei prezzi');
           }
           await loadDailyRates();
           toast.success(`Prezzi personalizzati resettati per ${datesToReset.length} date future`);
       } catch (error: any) {
           console.error('Error resetting prices:', error);
           toast.error(`Errore: ${error.message}`);
       } finally {
           setLoading(false);
       }
    };

    const handleResetMinStay = async () => {
       setLoading(true);
       try {
           const today = getTodayInItaly();
           const defaultMinStay = apartmentData.minStay || 1;
           const datesToReset = Object.values(dailyRates)
               .filter(rate => {
                  const rateDate = new Date(rate.date);
                  return rateDate >= today && rate.minStay !== undefined && rate.minStay !== defaultMinStay;
                })
               .map(rate => new Date(rate.date));

           if (datesToReset.length === 0) {
               toast('Nessun soggiorno minimo personalizzato futuro da resettare');
               return;
           }
            const sortedDates = datesToReset.sort((a, b) => a.getTime() - b.getTime());
           const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   startDate: sortedDates[0].toISOString(),
                   endDate: sortedDates[sortedDates.length - 1].toISOString(),
                   minStay: defaultMinStay, // Resetta al valore base dell'appartamento
                   resetMinStay: true // Flag opzionale per API
               }),
           });
           if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel reset del soggiorno minimo');
           }
           await loadDailyRates();
           toast.success(`Soggiorno minimo resettato per ${datesToReset.length} date future`);
       } catch (error: any) {
           console.error('Error resetting min stay:', error);
           toast.error(`Errore: ${error.message}`);
       } finally {
           setLoading(false);
       }
    };

    // --- GESTIONE MODAL DETTAGLI/ELIMINA PRENOTAZIONE ---
    const handleBookingStripClick = (booking: Booking) => {
       // Mostra i dettagli della prenotazione cliccata, indipendentemente dallo stato
       setSelectedBooking(booking);
       setIsBookingModalOpen(true);
    };

    const handleDeleteBooking = async () => {
     if (!selectedBooking) return;
     setLoading(true); // Usa lo stato loading globale o uno specifico per delete
     try {
       const response = await fetch(`/api/bookings/${selectedBooking.id}`, { method: 'DELETE' });
       if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Errore nell\'eliminazione della prenotazione');
       }
       toast.success('Prenotazione eliminata con successo');
       setDeleteConfirmOpen(false);
       setIsBookingModalOpen(false);
       router.refresh(); // Ricarica i dati della pagina (inclusi le prenotazioni)
     } catch (error: any) {
       console.error('Error deleting booking:', error);
       toast.error(`Errore: ${error.message}`);
     } finally {
       setLoading(false);
     }
    };


  // --- RENDER STRISCE PRENOTAZIONI ---
  const renderBookingStrips = () => {
    // Ricalcola ogni volta che le dipendenze cambiano
    if (!calendarGridRef.current || calendarDays.length === 0 || cellRefs.current.some(ref => ref === null)) {
      return null;
    }

    // Filtra solo le prenotazioni CONFERMATE o COMPLETATE da mostrare come strisce
    const visibleBookings = bookings.filter(booking => {
        if (booking.status !== 'confirmed' && booking.status !== 'completed') {
            return false; // Ignora pending, cancelled, ecc. per le strisce visive
        }

      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const firstDay = calendarDays[0]!; // Primo giorno visualizzato (UTC)
      const lastDay = calendarDays[calendarDays.length - 1]!; // Ultimo giorno visualizzato (UTC)
      const lastDayPlusOne = new Date(lastDay);
      lastDayPlusOne.setUTCDate(lastDayPlusOne.getUTCDate() + 1);

      // Logica di overlap standard (usa date locali o UTC coerentemente)
       const checkInLocal = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
       const checkOutLocal = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
       const firstDayLocal = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate());
       const lastDayPlusOneLocal = new Date(lastDayPlusOne.getFullYear(), lastDayPlusOne.getMonth(), lastDayPlusOne.getDate());


       // La prenotazione è visibile se si sovrappone al range del calendario
       return checkInLocal < lastDayPlusOneLocal && checkOutLocal > firstDayLocal;

    });

    // Raggruppa le strisce per riga e calcola posizione/dimensioni
    const strips = [];
    const renderedBookingIds = new Set(); // Per evitare duplicati se una prenotazione appare più volte

    visibleBookings.forEach(booking => {
        if (renderedBookingIds.has(booking.id)) return;

      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const lastDayOfBooking = new Date(checkOut);
      lastDayOfBooking.setDate(lastDayOfBooking.getDate() - 1); // Ultimo giorno effettivo della prenotazione

      // Trova gli indici nel calendario (usa isSameDay per confronto locale)
      let firstCellIndex = calendarDays.findIndex(day => day !== null && isSameDay(day, checkIn));
      let lastCellIndex = calendarDays.findIndex(day => day !== null && isSameDay(day, lastDayOfBooking));

       // Se la prenotazione inizia prima o finisce dopo il calendario visualizzato
       const startsBefore = firstCellIndex === -1 && checkIn < calendarDays[0]!;
       const endsAfter = lastCellIndex === -1 && lastDayOfBooking > calendarDays[calendarDays.length - 1]!;

       if (startsBefore) firstCellIndex = 0; // Inizia dalla prima cella visibile
       if (endsAfter) lastCellIndex = calendarDays.length - 1; // Finisce sull'ultima cella visibile

        // Se ancora non trovata, non è nel range visibile
       if (firstCellIndex === -1 || lastCellIndex === -1 || firstCellIndex > lastCellIndex) {
          return;
       }


      let currentRowStartIndex = firstCellIndex;

      while (currentRowStartIndex <= lastCellIndex) {
        const currentRow = Math.floor(currentRowStartIndex / 7);
        // Calcola l'indice di fine per questa riga specifica
        const rowEndIndexInCalendar = (currentRow + 1) * 7 - 1;
        const currentStripEndIndex = Math.min(lastCellIndex, rowEndIndexInCalendar);

        const startCellRef = cellRefs.current[currentRowStartIndex];
        const endCellRef = cellRefs.current[currentStripEndIndex];

        if (startCellRef && endCellRef) {
          const left = startCellRef.offsetLeft;
          const top = startCellRef.offsetTop + 28; // Spazio per numero giorno + padding
          const width = (endCellRef.offsetLeft + endCellRef.offsetWidth) - startCellRef.offsetLeft - 2; // -2 per bordi/gap
          const height = 50; // Altezza striscia

          // Determina stile basato su stato (anche se filtriamo, potremmo voler differenziare completed)
           let bgColor = 'bg-green-100';
           let borderColor = 'border-green-500';
           let textColor = 'text-green-800';
           if (booking.status === 'completed') {
              bgColor = 'bg-blue-100';
              borderColor = 'border-blue-500';
              textColor = 'text-blue-800';
           }
           // Aggiungi 'blocked' se necessario (ma 'blocked' è uno stato della tariffa, non della prenotazione)
           // const isVisuallyBlocked = isDateBlocked(...)? Non applicabile qui direttamente.

          strips.push(
            <div
              key={`${booking.id}-${currentRow}`}
              className={`absolute cursor-pointer px-2 py-1 rounded-md z-10 overflow-hidden border ${bgColor} ${borderColor} ${textColor}`}
              style={{ left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }}
              onClick={(e) => { e.stopPropagation(); handleBookingStripClick(booking); }} // Ferma la propagazione per non triggerare handleDayClick
            >
              <div className="text-xs font-semibold truncate">
                 {booking.guestName} ({booking.status === 'completed' ? 'Completata' : 'Confermata'})
              </div>
              <div className="text-xs">
                {booking.numberOfGuests} ospiti - €{booking.totalPrice.toFixed(0)}
              </div>
              <div className="text-xs font-medium">
                {formatDate(checkIn)} - {formatDate(checkOut)}
              </div>
            </div>
          );
        }
        // Passa alla riga successiva, iniziando dalla prima cella della nuova riga
        currentRowStartIndex = (currentRow + 1) * 7;
      }
       renderedBookingIds.add(booking.id); // Marca come renderizzata
    });

    return strips;
  };


  // --- NOMI MESI/GIORNI ---
  const monthNames = [ /* ... come prima ... */ 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  // --- RENDER COMPONENTE ---
  return (
    <div className="space-y-4">
      {/* Header e Controlli ... come prima ... */}
        <div className="flex flex-col mb-6 space-y-4">
            {/* Riga 1: Navigazione Mese & Oggi */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold mr-4 md:mr-6">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <div className="flex items-center space-x-2 md:space-x-4">
                  <button onClick={goToPreviousMonth} className="p-1 rounded-full hover:bg-gray-200" disabled={loading}><ChevronLeftIcon className="w-5 h-5" /></button>
                  <button onClick={goToNextMonth} className="p-1 rounded-full hover:bg-gray-200" disabled={loading}><ChevronRightIcon className="w-5 h-5" /></button>
                </div>
              </div>
              <button onClick={goToToday} className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200" disabled={loading}>
                <CalendarIcon className="w-4 h-4 mr-1" /> Oggi
              </button>
            </div>

             {/* Riga 2: Selezione Multipla & Azioni Contestuali */}
             <div className="flex flex-wrap items-center gap-4">
               <button
                 onClick={() => {
                   setIsSelectionMode(!isSelectionMode);
                   if (isSelectionMode) setSelectedDates([]); // Cancella selezione uscendo dalla modalità
                 }}
                 className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                   isSelectionMode
                     ? 'bg-red-100 text-red-700 hover:bg-red-200'
                     : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                 }`}
                 disabled={loading}
               >
                 {isSelectionMode ? <><XMarkIcon className="w-4 h-4 mr-1 inline"/>Annulla Selezione</> : 'Seleziona Più Date'}
               </button>

                {isSelectionMode && (
                     <button
                         onClick={selectAllMonth}
                         className="px-3 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-md hover:bg-purple-200"
                         disabled={loading}
                     >
                         Seleziona Mese
                     </button>
                 )}

               {isSelectionMode && selectedDates.length > 0 && (
                 <>
                   <button
                     onClick={() => setIsBulkEditModalOpen(true)}
                     className="px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-md hover:bg-yellow-200"
                     disabled={loading}
                   >
                     Modifica {selectedDates.length} Date
                   </button>
                   <button
                     onClick={handleCreateBooking}
                     className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                     disabled={loading || isPastDate(selectedDates[0])} // Disabilita se la prima data selezionata è passata
                     title={isPastDate(selectedDates[0]) ? "Non puoi creare prenotazioni nel passato" : ""}
                   >
                     Nuova Prenotazione
                   </button>
                 </>
               )}
             </div>

            {/* Riga 3: Legenda */}
             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                 <div className="flex items-center"><div className="w-3 h-3 bg-green-100 border border-green-500 mr-1"></div><span>Confermata</span></div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-blue-100 border border-blue-500 mr-1"></div><span>Completata</span></div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-500 mr-1"></div><span>Bloccato Manualmente</span></div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-yellow-100 border border-yellow-500 mr-1"></div><span>Tariffa Personalizzata</span></div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-purple-100 border border-purple-500 mr-1"></div><span>Tariffa Stagionale</span></div>
                 {isSelectionMode && <div className="flex items-center"><div className="w-3 h-3 bg-indigo-100 border border-indigo-500 mr-1"></div><span>Selezionato</span></div>}
                 <div className="flex items-center"><div className="w-3 h-3 bg-gray-100 border border-gray-300 mr-1"></div><span>Data Passata</span></div>
                 {apartmentData.minStay > 1 && <div className="ml-auto font-semibold">Min. Stay: {apartmentData.minStay} notti</div>}
             </div>
        </div>

      {/* Calendario */}
      <div className="relative" ref={calendarGridRef}>
        {/* Griglia */}
        <div className="grid grid-cols-7 gap-px border border-gray-200 bg-gray-200"> {/* Usa gap-px per linee sottili */}
          {/* Header Giorni Settimana */}
          {weekdayNames.map((day) => (
            <div key={day} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500 uppercase">
              {day}
            </div>
          ))}

          {/* Celle Calendario */}
          {calendarDays.map((day, index) => {
            if (!day) return <div key={index} className="bg-gray-50 aspect-square"></div>; // Cella vuota placeholder

             // Calcola stati per la cella
             const isCurrentMonthDay = day.getMonth() === currentMonth;
             const isTodayCell = isToday(day);
             // **USA getConfirmedBookingForDate per determinare se è BLOCCATA da una prenotazione**
             const confirmedBooking = getConfirmedBookingForDate(day);
             const bookingPosition = confirmedBooking ? getBookingPosition(day, confirmedBooking) : undefined;
             const isBlockedManually = isDateBlocked(day); // Blocco manuale da tariffe
             const hasCustomPriceOrMinStay = hasCustomRate(day);
             const season = getSeasonForDate(day);
             const hasSeasonalPrice = !!season && !hasCustomPriceOrMinStay; // Mostra solo se non c'è custom
             const price = getPriceForDate(day);
             const minStay = getMinStayForDate(day);
             const isSelected = isSelectionMode && isDateSelected(day);
             const isPastDay = isPastDate(day);

             // La cella è considerata "occupata" se c'è una prenotazione confermata O è bloccata manualmente
             const isOccupied = !!confirmedBooking || isBlockedManually;

            return (
              <div
                key={dateToString(day)} // Usa una chiave stabile
                className="relative bg-white min-h-[100px] md:min-h-[120px]" // Altezza minima per contenuto
                ref={(el) => setCellRef(el, index)}
              >
                <DayCell
                  date={day}
                  isCurrentMonth={isCurrentMonthDay}
                  isToday={isTodayCell}
                  // Passa solo la prenotazione CONFERMATA a DayCell per la visualizzazione interna (se necessaria)
                  // Ma la logica di blocco principale è gestita da 'isOccupied' e 'isBlockedManually'
                  booking={null} // Non passiamo la booking qui, gestita da strisce sovrapposte
                  bookingPosition={bookingPosition} // Passa la posizione per stile (arrotondamenti) se serve a DayCell
                  isBlocked={isBlockedManually} // Passa il blocco manuale
                  isOccupied={isOccupied} // Passa lo stato generale di occupazione
                  hasCustomPrice={hasCustomPriceOrMinStay && !isOccupied} // Mostra solo se disponibile
                  hasSeasonalPrice={hasSeasonalPrice && !isOccupied} // Mostra solo se disponibile
                  seasonName={season?.name}
                  price={!isOccupied ? price : undefined} // Mostra prezzo solo se disponibile
                  minStay={!isOccupied && minStay > 1 ? minStay : undefined} // Mostra min stay solo se disponibile e > 1
                  isSelected={isSelected}
                  isSelectionMode={isSelectionMode}
                  isPastDate={isPastDay}
                  onClick={() => handleDayClick(day)}
                />
              </div>
            );
          })}
        </div>

        {/* Strisce Prenotazioni CONFERMATE (sovrapposte) */}
         <div className="absolute inset-0 pointer-events-none"> {/* Contenitore per posizionamento assoluto strisce */}
             {renderBookingStrips()}
         </div>
      </div>

      {/* Stagioni e Azioni Rapide ... come prima ... */}
       {Object.keys(seasonalInfo).length > 0 && (
         <div className="mt-4 p-3 bg-gray-50 rounded-lg">
           <h3 className="font-medium text-sm mb-2">Stagioni Attive nel Mese</h3>
           <div className="flex flex-wrap gap-2">
             {/* Filtra stagioni uniche visibili nel mese */}
             {Object.values(seasonalInfo)
               .filter((season, index, self) => self.findIndex(s => s.name === season.name) === index)
               .map((season) => (
                 <div key={season.name} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs">
                   {season.name}: €{season.price.toFixed(2)}
                   <span className="ml-1 opacity-80">({formatDate(new Date(season.startDate))} - {formatDate(new Date(season.endDate))})</span>
                 </div>
               ))}
           </div>
         </div>
       )}

       <div className="mt-4 p-3 bg-gray-50 rounded-lg">
         <h3 className="font-medium text-sm mb-2">Azioni Rapide sul Mese</h3>
         <div className="flex flex-wrap gap-2">
             {/* Pulsanti Azioni Rapide con gestione loading */}
             <button onClick={() => { const start = new Date(Date.UTC(currentYear, currentMonth, 1)); const end = new Date(Date.UTC(currentYear, currentMonth + 1, 0)); handleBlockDates(start, end, true); }} className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 disabled:opacity-50" disabled={loading}>Blocca Mese</button>
             <button onClick={() => { const start = new Date(Date.UTC(currentYear, currentMonth, 1)); const end = new Date(Date.UTC(currentYear, currentMonth + 1, 0)); handleBlockDates(start, end, false); }} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-md hover:bg-green-200 disabled:opacity-50" disabled={loading}>Sblocca Mese</button>
             <button onClick={handleResetPrices} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-md hover:bg-blue-200 disabled:opacity-50" disabled={loading}>Reset Prezzi Futuri</button>
             <button onClick={handleResetMinStay} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md hover:bg-yellow-200 disabled:opacity-50" disabled={loading}>Reset Min. Stay Futuri</button>
         </div>
       </div>


      {/* Modals ... come prima, assicurati che passino le props corrette ... */}
      {selectedDate && (
        <RateModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          date={selectedDate}
          apartmentData={apartmentData}
          rateData={dailyRates[dateToString(selectedDate)]}
          seasonData={getSeasonForDate(selectedDate)}
          // Passa la prenotazione CONFERMATA se esiste per visualizzazione info
          booking={getConfirmedBookingForDate(selectedDate)}
          isPastDate={isPastDate(selectedDate)} // Passa info se è passata
          onSave={handleSaveRate}
          onCreateBooking={handleCreateBookingFromDate}
        />
      )}

      {selectedDates.length > 0 && (
        <BulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          dates={selectedDates}
          apartmentData={apartmentData}
          onSave={handleBulkEdit}
        />
      )}

      <BookingFormModal
        isOpen={isNewBookingModalOpen}
        onClose={() => {
            setIsNewBookingModalOpen(false);
            // Resetta selezione se il modal viene chiuso senza successo?
            // setIsSelectionMode(false);
            // setSelectedDates([]);
        }}
        startDate={newBookingStartDate}
        endDate={newBookingEndDate}
        apartmentId={apartmentId}
        apartmentData={apartmentData}
        // Passa il min stay calcolato per la data di inizio
        customMinStay={getMinStayForDate(newBookingStartDate)}
        onBookingCreated={() => {
             setIsNewBookingModalOpen(false);
             setIsSelectionMode(false);
             setSelectedDates([]);
             router.refresh(); // Aggiorna i dati dopo creazione prenotazione dal backend
        }}
      />

      {/* Modal Dettagli Prenotazione */}
      <Transition.Root show={isBookingModalOpen} as={Fragment}>
         {/* ... Struttura modal come prima ... */}
         <Dialog as="div" className="relative z-30" onClose={() => setIsBookingModalOpen(false)}>
              {/* Overlay */}
              <Transition.Child /* ... */ >
                 <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>
              {/* Contenuto Modal */}
               <div className="fixed inset-0 z-10 overflow-y-auto">
                   <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                         <Transition.Child /* ... */>
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                               {/* Bottone chiusura */}
                               <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button type="button" /* ... */ onClick={() => setIsBookingModalOpen(false)}><XMarkIcon/></button>
                               </div>

                               {selectedBooking && (
                                 <div>
                                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                                          Dettagli Prenotazione #{selectedBooking.id.substring(0, 6)}...
                                      </Dialog.Title>
                                      {/* Info Prenotazione */}
                                       <div className="mt-2 space-y-3 text-sm">
                                           <p><strong>Ospite:</strong> {selectedBooking.guestName}</p>
                                           <p><strong>Email:</strong> {selectedBooking.guestEmail || 'N/D'}</p>
                                           <p><strong>Telefono:</strong> {selectedBooking.guestPhone || 'N/D'}</p>
                                           <p><strong>Periodo:</strong> {formatDate(new Date(selectedBooking.checkIn))} - {formatDate(new Date(selectedBooking.checkOut))}</p>
                                           <p><strong>Ospiti:</strong> {selectedBooking.numberOfGuests}</p>
                                           <p><strong>Prezzo Totale:</strong> €{selectedBooking.totalPrice.toFixed(2)}</p>
                                           <p><strong>Stato Prenotazione:</strong> <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedBooking.status)}`}>{translateStatus(selectedBooking.status)}</span></p>
                                           <p><strong>Stato Pagamento:</strong> <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>{translatePaymentStatus(selectedBooking.paymentStatus)}</span></p>
                                            <p><strong>Fonte:</strong> {selectedBooking.source || 'N/D'}</p>
                                       </div>
                                       {/* Azioni sul Modal */}
                                       <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row-reverse gap-2">
                                            {/* Bottone Elimina */}
                                            <button
                                              type="button"
                                              onClick={() => setDeleteConfirmOpen(true)}
                                              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:opacity-50"
                                              disabled={loading} // Disabilita durante altre azioni
                                            >
                                               <TrashIcon className="h-4 w-4 mr-1"/> Elimina
                                            </button>
                                            {/* Bottone Modifica (se non completata/cancellata?) */}
                                            {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                                                <button
                                                   type="button"
                                                   onClick={() => router.push(`/bookings/${selectedBooking.id}/edit`)}
                                                   className="inline-flex w-full justify-center rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-400 sm:w-auto"
                                                >
                                                   <PencilIcon className="h-4 w-4 mr-1"/> Modifica
                                                </button>
                                            )}
                                            {/* Bottone Visualizza Completo */}
                                            <button
                                              type="button"
                                              onClick={() => router.push(`/bookings/${selectedBooking.id}`)}
                                              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
                                            >
                                               <EyeIcon className="h-4 w-4 mr-1"/> Vedi Dettagli Completi
                                            </button>
                                            {/* Bottone Annulla (chiude modal) */}
                                             <button
                                                 type="button"
                                                 className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                                 onClick={() => setIsBookingModalOpen(false)}
                                             >
                                                 Chiudi
                                             </button>
                                       </div>
                                 </div>
                               )}
                            </Dialog.Panel>
                         </Transition.Child>
                   </div>
               </div>
         </Dialog>
      </Transition.Root>

      {/* Modal Conferma Eliminazione */}
      <Transition.Root show={deleteConfirmOpen} as={Fragment}>
         {/* ... Struttura modal come prima ... */}
         <Dialog as="div" className="relative z-40" onClose={() => setDeleteConfirmOpen(false)}>
              <Transition.Child /* ... */>
                 <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>
               <div className="fixed inset-0 z-10 overflow-y-auto">
                  <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child /* ... */>
                           <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                              <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                       <TrashIcon className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                       <Dialog.Title /* ... */>Conferma eliminazione</Dialog.Title>
                                       <div className="mt-2"><p className="text-sm text-gray-500">Sei sicuro? L'azione è irreversibile.</p></div>
                                    </div>
                              </div>
                               <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                 <button type="button" className="..." onClick={handleDeleteBooking} disabled={loading}> {loading ? 'Eliminazione...' : 'Elimina'} </button>
                                 <button type="button" className="..." onClick={() => setDeleteConfirmOpen(false)}>Annulla</button>
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

// Helper functions per colori e traduzioni stati (da spostare in utils se usate altrove)
const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
};
const translateStatus = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confermata';
      case 'pending': return 'In attesa Pagamento'; // Più specifico
      case 'cancelled': return 'Cancellata';
      case 'completed': return 'Completata';
      default: return status;
    }
};
const getPaymentStatusColor = (status: string) => {
     switch (status) {
       case 'paid': return 'bg-green-100 text-green-800';
       case 'pending': return 'bg-yellow-100 text-yellow-800';
       case 'failed': return 'bg-red-100 text-red-800';
       case 'refunded': return 'bg-purple-100 text-purple-800';
       default: return 'bg-gray-100 text-gray-800';
     }
};
const translatePaymentStatus = (status: string) => {
     switch (status) {
       case 'paid': return 'Pagato';
       case 'pending': return 'In attesa';
       case 'failed': return 'Fallito';
       case 'refunded': return 'Rimborsato';
       default: return status;
     }
};
