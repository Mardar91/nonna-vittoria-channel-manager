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

interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: string;
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
  apartmentData: any;
  bookings: Booking[];
}

export default function ApartmentCalendar({ apartmentId, apartmentData, bookings }: ApartmentCalendarProps) {
  const router = useRouter();
  
  // Crea una data con il fuso orario italiano
  const currentDateItaly = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  const [currentDate, setCurrentDate] = useState(currentDateItaly);
  const [currentMonth, setCurrentMonth] = useState(currentDateItaly.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateItaly.getFullYear());
  const [calendarDays, setCalendarDays] = useState<Array<Date | null>>([]);
  const [dailyRates, setDailyRates] = useState<Record<string, DailyRate>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Stato per le stagioni
  const [seasonalInfo, setSeasonalInfo] = useState<Record<string, SeasonalPrice>>({});
  
  // Selezione multipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  
  // Modal per nuova prenotazione
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBookingStartDate, setNewBookingStartDate] = useState<Date>(new Date());
  const [newBookingEndDate, setNewBookingEndDate] = useState<Date>(new Date()); // Nuovo stato per la data di fine
  
  // Stato per il modal della prenotazione
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Riferimento alla griglia del calendario
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  
  // Callback per impostare i riferimenti delle celle
  const setCellRef = useCallback((el: HTMLDivElement | null, index: number) => {
    if (cellRefs.current.length > index) {
      cellRefs.current[index] = el;
    }
  }, []);
  
  // Formattazione date
  const dateToString = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Funzione per formattare una data in formato leggibile
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Confronta solo la data (giorno, mese, anno) ignorando l'ora
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };
  
  // Nuova funzione: Verifica se una data è nel passato
  const isPastDate = (date: Date): boolean => {
    // Usa la data corrente del fuso orario italiano
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    today.setHours(0, 0, 0, 0); // Imposta l'ora a mezzanotte per confrontare solo le date
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return compareDate < today;
  };
  
  // Carica il calendario per il mese corrente
  useEffect(() => {
    generateCalendarDays(currentYear, currentMonth);
    loadDailyRates();
    processSeasonalPrices();
  }, [currentYear, currentMonth]);

  // Elabora le informazioni sui prezzi stagionali
  const processSeasonalPrices = () => {
    if (!apartmentData.seasonalPrices || !apartmentData.seasonalPrices.length) {
      setSeasonalInfo({});
      return;
    }

    const seasonMap: Record<string, SeasonalPrice> = {};
    
    apartmentData.seasonalPrices.forEach((season: SeasonalPrice) => {
      const startDate = new Date(season.startDate);
      const endDate = new Date(season.endDate);
      
      // Iteriamo attraverso tutte le date di questa stagione
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = dateToString(currentDate);
        seasonMap[dateStr] = {
          ...season,
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate)
        };
        
        // Passa al giorno successivo
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    setSeasonalInfo(seasonMap);
  };
  
  // Funzione per generare i giorni del calendario
  const generateCalendarDays = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    const firstDayOfWeek = firstDayOfMonth.getDay();
    // Converte da domenica (0) - sabato (6) a lunedì (0) - domenica (6)
    const adjustedFirstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    
    // Genera un array di 42 elementi (6 righe x 7 giorni) per il calendario
    const days: Array<Date | null> = [];
    
    // Giorni del mese precedente
    for (let i = 0; i < adjustedFirstDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -adjustedFirstDayOfWeek + i + 1);
      days.push(prevMonthDay);
    }
    
    // Giorni del mese corrente
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Giorni del mese successivo per riempire il calendario
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDay = new Date(year, month + 1, i);
      days.push(nextMonthDay);
    }
    
    setCalendarDays(days);
    // Reimposta il riferimento alle celle quando cambiano i giorni
    cellRefs.current = Array(days.length).fill(null);
  };
  
  // Funzione per caricare le tariffe giornaliere
  const loadDailyRates = async () => {
    setLoading(true);
    try {
      // Calcola primo e ultimo giorno del calendario visualizzato
      const firstDayShown = new Date(currentYear, currentMonth, 1);
      firstDayShown.setDate(1 - ((firstDayShown.getDay() + 6) % 7)); // Aggiusta al lunedì della prima settimana
      
      const lastDayShown = new Date(currentYear, currentMonth + 1, 0);
      const remainingDays = 6 - ((lastDayShown.getDay() + 6) % 7); // Aggiusta alla domenica dell'ultima settimana
      lastDayShown.setDate(lastDayShown.getDate() + remainingDays);
      
      const response = await fetch(`/api/apartments/${apartmentId}/rates?startDate=${dateToString(firstDayShown)}&endDate=${dateToString(lastDayShown)}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle tariffe');
      }
      
      const data = await response.json();
      
      // Converte l'array in un oggetto indicizzato per data
      const ratesMap: Record<string, DailyRate> = {};
      data.forEach((rate: DailyRate) => {
        const dateStr = dateToString(new Date(rate.date));
        ratesMap[dateStr] = {
          ...rate,
          date: new Date(rate.date)
        };
      });
      
      setDailyRates(ratesMap);
    } catch (error) {
      console.error('Error loading daily rates:', error);
      toast.error('Errore nel caricamento delle tariffe');
    } finally {
      setLoading(false);
    }
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
  
  // Funzione per gestire il click su una cella del calendario
  const handleDayClick = (date: Date) => {
    if (isSelectionMode) {
      // Se siamo in modalità selezione, aggiungi o rimuovi la data dalla selezione
      const dateStr = dateToString(date);
      const index = selectedDates.findIndex(d => dateToString(d) === dateStr);
      
      if (index >= 0) {
        // Rimuovi la data se già selezionata
        const newSelectedDates = [...selectedDates];
        newSelectedDates.splice(index, 1);
        setSelectedDates(newSelectedDates);
      } else {
        // Aggiungi la data alla selezione
        setSelectedDates([...selectedDates, date]);
      }
    } else {
      // In ogni caso, apri il modal per la tariffa giornaliera
      setSelectedDate(date);
      setIsRateModalOpen(true);
    }
  };
  
  // Funzione per selezionare tutto il mese corrente
  const selectAllMonth = () => {
    // Attiva la modalità selezione
    setIsSelectionMode(true);
    
    // Crea un array con tutte le date del mese corrente
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dates: Date[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(currentYear, currentMonth, i));
    }
    
    // Imposta le date selezionate
    setSelectedDates(dates);
    
    // Conferma all'utente
    toast.success(`Selezionate ${dates.length} date`);
  };
  
  // Funzione per creare una nuova prenotazione dalle date selezionate
  const handleCreateBooking = () => {
    if (selectedDates.length === 0) {
      toast.error('Seleziona almeno una data per creare una prenotazione');
      return;
    }
    
    // Ordina le date
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    
    // Verifico che non ci siano prenotazioni esistenti in queste date
    for (const date of sortedDates) {
      if (getBookingForDate(date)) {
        toast.error('Ci sono già prenotazioni esistenti nelle date selezionate');
        return;
      }
    }

    // Verifica che la selezione rispetti il soggiorno minimo
    const minStay = apartmentData.minStay || 1;
    if (sortedDates.length < minStay) {
      toast.error(`Il soggiorno minimo è di ${minStay} notti`);
      return;
    }
    
    // Imposta la data di check-in alla prima data selezionata
    // e la data di check-out al giorno successivo all'ultima data selezionata
    const checkIn = new Date(sortedDates[0]);
    const checkOut = new Date(sortedDates[sortedDates.length - 1]);
    checkOut.setDate(checkOut.getDate() + 1); // Aggiunge un giorno per il check-out
    
    // Salva le date per il form di prenotazione
    setNewBookingStartDate(checkIn);
    setNewBookingEndDate(checkOut); // Ora settiamo correttamente la data di fine
    
    // Apri il modal per la creazione della prenotazione
    setIsNewBookingModalOpen(true);
  };
  
  // Funzione per creare una prenotazione da una singola data
  const handleCreateBookingFromDate = (date: Date) => {
    // Calcola la data di fine in base al soggiorno minimo
    const minStay = getMinStayForDate(date);
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + minStay); // Aggiunge il soggiorno minimo per il check-out
    
    // Verifica che non ci siano prenotazioni nel periodo
    for (let i = 0; i < minStay; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      if (getBookingForDate(checkDate)) {
        toast.error('Ci sono già prenotazioni esistenti nel periodo minimo di soggiorno');
        return;
      }
    }
    
    setNewBookingStartDate(startDate);
    setNewBookingEndDate(endDate);
    
    // Chiudi il modal delle tariffe
    setIsRateModalOpen(false);
    
    // Apri il modal di creazione prenotazione
    setIsNewBookingModalOpen(true);
  };
  
  // Funzione per salvare le modifiche alla tariffa
  const handleSaveRate = async (rateData: any) => {
    if (!selectedDate) return;
    
    try {
      const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          ...rateData
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio della tariffa');
      }
      
      const data = await response.json();
      
      // Aggiorna lo stato locale
      const dateStr = dateToString(selectedDate);
      setDailyRates({
        ...dailyRates,
        [dateStr]: {
          ...data,
          date: new Date(data.date)
        }
      });
      
      toast.success('Tariffa aggiornata con successo');
      setIsRateModalOpen(false);
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error('Errore nel salvataggio della tariffa');
    }
  };
  
  // Funzione per gestire la modifica in blocco
  const handleBulkEdit = async (rateData: any) => {
    if (selectedDates.length === 0) return;
    
    try {
      // Ordina le date
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      
      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: sortedDates[0].toISOString(),
          endDate: sortedDates[sortedDates.length - 1].toISOString(),
          ...rateData
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nella modifica in blocco');
      }
      
      await loadDailyRates();
      toast.success(`Modifiche applicate a ${selectedDates.length} date`);
      
      // Esci dalla modalità selezione
      setIsBulkEditModalOpen(false);
      setIsSelectionMode(false);
      setSelectedDates([]);
    } catch (error) {
      console.error('Error bulk editing:', error);
      toast.error('Errore nella modifica in blocco');
    }
  };
  
  // Funzione per gestire il blocco di un intervallo di date
  const handleBlockDates = async (startDate: Date, endDate: Date, isBlocked: boolean) => {
    try {
      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          isBlocked
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nella modifica delle date');
      }
      
      await loadDailyRates();
      toast.success(isBlocked ? 'Date bloccate con successo' : 'Date sbloccate con successo');
    } catch (error) {
      console.error('Error blocking dates:', error);
      toast.error('Errore nella modifica delle date');
    }
  };

  // Funzione per resettare i prezzi personalizzati per le date future
  const handleResetPrices = async () => {
    try {
      // Ottieni la data corrente (fuso orario italiano)
      const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
      today.setHours(0, 0, 0, 0);
      
      // Filtra solo le tariffe giornaliere future con prezzi personalizzati
      const datesToReset = Object.entries(dailyRates)
        .filter(([dateStr, rate]) => {
          const date = new Date(rate.date);
          return date >= today && rate.price !== undefined;
        })
        .map(([dateStr, rate]) => new Date(rate.date));
      
      if (datesToReset.length === 0) {
        toast('Nessun prezzo personalizzato da resettare per le date future');
        return;
      }
      
      // Ordina le date
      const sortedDates = datesToReset.sort((a, b) => a.getTime() - b.getTime());
      
      // Usa l'endpoint bulk-rates per aggiornare tutte le date
      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: sortedDates[0].toISOString(),
          endDate: sortedDates[sortedDates.length - 1].toISOString(),
          price: null, // Impostare a null per ripristinare il prezzo predefinito
          resetPrices: true // Flag per indicare che stiamo resettando i prezzi
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel reset dei prezzi');
      }
      
      await loadDailyRates();
      toast.success(`Prezzi personalizzati resettati per ${datesToReset.length} date future`);
    } catch (error) {
      console.error('Error resetting prices:', error);
      toast.error('Errore nel reset dei prezzi');
    }
  };

  // Funzione per resettare il soggiorno minimo per le date future
  const handleResetMinStay = async () => {
    try {
      // Ottieni la data corrente (fuso orario italiano)
      const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
      today.setHours(0, 0, 0, 0);
      
      // Filtra solo le tariffe giornaliere future con soggiorno minimo personalizzato
      const datesToReset = Object.entries(dailyRates)
        .filter(([dateStr, rate]) => {
          const date = new Date(rate.date);
          return date >= today && rate.minStay !== undefined && rate.minStay !== apartmentData.minStay;
        })
        .map(([dateStr, rate]) => new Date(rate.date));
      
      if (datesToReset.length === 0) {
        toast('Nessun soggiorno minimo personalizzato da resettare per le date future');
        return;
      }
      
      // Ordina le date
      const sortedDates = datesToReset.sort((a, b) => a.getTime() - b.getTime());
      
      // Usa l'endpoint bulk-rates per aggiornare tutte le date
      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: sortedDates[0].toISOString(),
          endDate: sortedDates[sortedDates.length - 1].toISOString(),
          minStay: apartmentData.minStay, // Imposta al valore predefinito dell'appartamento
          resetMinStay: true // Flag per indicare che stiamo resettando il soggiorno minimo
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel reset del soggiorno minimo');
      }
      
      await loadDailyRates();
      toast.success(`Soggiorno minimo resettato per ${datesToReset.length} date future`);
    } catch (error) {
      console.error('Error resetting min stay:', error);
      toast.error('Errore nel reset del soggiorno minimo');
    }
  };
  
  // Ottieni le informazioni di prenotazione per una data specifica
  const getBookingForDate = (date: Date): Booking | null => {
    const dateStr = dateToString(date);
    
    return bookings.find(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      const checkInStr = dateToString(checkIn);
      const checkOutStr = dateToString(checkOut);
      
      // La data è compresa tra check-in e check-out (incluso il check-in, escluso il check-out)
      // Solo se la prenotazione è confermata
      return (booking.status === 'confirmed' && dateStr >= checkInStr && dateStr < checkOutStr);
    }) || null;
  };
  
  // Ottieni la posizione di una data all'interno di una prenotazione (inizio, mezzo, fine)
  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' | 'single' => {
    const dateStr = dateToString(date);
    const checkInStr = dateToString(new Date(booking.checkIn));
    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setDate(checkOutDate.getDate() - 1); // Il giorno prima del check-out
    const checkOutStr = dateToString(checkOutDate);
    
    if (checkInStr === checkOutStr) {
      return 'single';
    }
    
    if (dateStr === checkInStr) {
      return 'start';
    }
    
    if (dateStr === checkOutStr) {
      return 'end';
    }
    
    return 'middle';
  };
  
  // Verifica se una data ha una tariffa personalizzata
  const hasCustomRate = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return dateStr in dailyRates;
  };
  
  // Verifica se una data è bloccata
  const isDateBlocked = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return dateStr in dailyRates && dailyRates[dateStr].isBlocked;
  };
  
  // Verifica se una data è selezionata
  const isDateSelected = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return selectedDates.some(d => dateToString(d) === dateStr);
  };
  
  // Verifica se una data appartiene a una stagione specifica
  const getSeasonForDate = (date: Date): SeasonalPrice | null => {
    const dateStr = dateToString(date);
    return seasonalInfo[dateStr] || null;
  };
  
  // Ottieni il prezzo per una data specifica
  const getPriceForDate = (date: Date): number => {
    const dateStr = dateToString(date);
    
    // Prima controlla se c'è una tariffa personalizzata giornaliera
    if (dateStr in dailyRates && dailyRates[dateStr].price !== undefined) {
      return dailyRates[dateStr].price!;
    }
    
    // Poi controlla se la data appartiene a una stagione
    const season = getSeasonForDate(date);
    if (season) {
      return season.price;
    }
    
    // Altrimenti usa il prezzo base dell'appartamento
    return apartmentData.price;
  };
  
  // Ottieni il soggiorno minimo per una data specifica
  const getMinStayForDate = (date: Date): number => {
    const dateStr = dateToString(date);
    
    // Prima controlla se c'è un soggiorno minimo personalizzato giornaliero
    if (dateStr in dailyRates && dailyRates[dateStr].minStay !== undefined) {
      return dailyRates[dateStr].minStay!;
    }
    
    // Altrimenti usa il soggiorno minimo dell'appartamento
    return apartmentData.minStay || 1;
  };
  
  // Verifica se una data è oggi (considerando il fuso orario italiano)
  const isToday = (date: Date): boolean => {
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    return dateToString(date) === dateToString(today);
  };
  
  // Gestisci il click sulla striscia della prenotazione
  const handleBookingStripClick = (booking: Booking) => {
    // Invece di navigare direttamente, apriamo il modal con i dettagli della prenotazione
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };
  
  // Funzione per eliminare una prenotazione
  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione della prenotazione');
      }
      
      toast.success('Prenotazione eliminata con successo');
      
      // Chiudi i modal
      setDeleteConfirmOpen(false);
      setIsBookingModalOpen(false);
      
      // Aggiorna la pagina
      router.refresh();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Errore nell\'eliminazione della prenotazione');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizza le strisce delle prenotazioni sovrapposte alla griglia del calendario
  const renderBookingStrips = () => {
    if (!calendarGridRef.current || calendarDays.length === 0 || cellRefs.current.some(ref => ref === null)) {
      return null;
    }
    
    // Ottieni tutte le prenotazioni uniche nel periodo visualizzato
    const visibleBookings = bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      // Trova il primo e l'ultimo giorno visualizzati nel calendario
      const firstDay = calendarDays[0]!;
      const lastDay = calendarDays[calendarDays.length - 1]!;
      
      // Aggiungi un giorno a lastDay per includerlo nella visualizzazione
      const lastDayPlusOne = new Date(lastDay);
      lastDayPlusOne.setDate(lastDayPlusOne.getDate() + 1);
      
      // La prenotazione è visibile se si sovrappone con il calendario visualizzato
      return (booking.status === 'confirmed' && checkIn < lastDayPlusOne && checkOut > firstDay);
    });
    
    return visibleBookings.map((booking, bookingIndex) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const isBlocked = booking.status === 'blocked';
      
      // Trova gli indici dei giorni di check-in e check-out nel calendario
      const firstCellIndex = calendarDays.findIndex(day => day !== null && isSameDay(day, checkIn));
      
      // Il check-out è escluso, quindi cerchiamo il giorno prima del check-out come ultimo giorno
      const lastDay = new Date(checkOut);
      lastDay.setDate(lastDay.getDate() - 1);
      const lastCellIndex = calendarDays.findIndex(day => day !== null && isSameDay(day, lastDay));
      
      // Se entrambi gli indici sono -1, questa prenotazione non è visibile nel calendario attuale
      if (firstCellIndex === -1 && lastCellIndex === -1) {
        return null;
      }
      
      // Calcola gli indici di inizio e fine effettivi (tenendo conto delle prenotazioni che iniziano o finiscono fuori dal calendario)
      const effectiveFirstIndex = firstCellIndex !== -1 ? firstCellIndex : 0;
      const effectiveLastIndex = lastCellIndex !== -1 ? lastCellIndex : calendarDays.length - 1;
      
      // Raggruppa le prenotazioni per riga
      const bookingStrips = [];
      let currentRowStartIndex = effectiveFirstIndex;
      
      while (currentRowStartIndex <= effectiveLastIndex) {
        const currentRow = Math.floor(currentRowStartIndex / 7);
        const rowEndIndex = Math.min(effectiveLastIndex, (currentRow + 1) * 7 - 1);
        
        // Calcola le posizioni della striscia corrente
        const startCellRef = cellRefs.current[currentRowStartIndex];
        const endCellRef = cellRefs.current[rowEndIndex];
        
        if (startCellRef && endCellRef) {
          // Calcola la posizione e le dimensioni della striscia
          const left = startCellRef.offsetLeft;
          const top = startCellRef.offsetTop + 25; // Spazio per il numero del giorno
          const width = (endCellRef.offsetLeft + endCellRef.offsetWidth) - startCellRef.offsetLeft - 2; // -2 per i bordi
          const height = 55; // Altezza fissa per la striscia
          
          bookingStrips.push(
            <div
              key={`${booking.id}-${currentRow}`}
              className={`absolute pointer-events-auto px-2 py-1 rounded-md z-10 overflow-hidden ${
                isBlocked ? 'bg-red-100 border border-red-500 text-red-800' : 'bg-green-100 border border-green-500 text-green-800'
              }`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              onClick={() => handleBookingStripClick(booking)}
            >
              <div className="text-xs font-semibold truncate">
                {isBlocked ? 'CLOSED - Not available' : booking.guestName}
              </div>
              <div className="text-xs">
                {booking.numberOfGuests} ospiti
              </div>
              <div className="text-xs font-medium">
                {new Date(booking.checkIn).toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit'})} - {new Date(booking.checkOut).toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit'})}
              </div>
            </div>
          );
        }
        
        // Passa alla riga successiva
        currentRowStartIndex = (currentRow + 1) * 7;
      }
      
      return bookingStrips;
    });
  };
  
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  return (
    <div className="space-y-4">
      {/* Header del calendario con miglioramento della spaziatura */}
      <div className="flex flex-col mb-6 space-y-4">
        {/* Prima riga: Nome del mese/anno, frecce di navigazione e tasto Oggi */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold mr-6">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Tasto "Oggi" */}
          <button
            onClick={goToToday}
            className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            <CalendarIcon className="w-4 h-4 mr-1" />
            Oggi
          </button>
        </div>
        
        {/* Seconda riga: Pulsanti di selezione e azioni */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => {
              if (isSelectionMode) {
                // Esci dalla modalità selezione
                setIsSelectionMode(false);
                setSelectedDates([]);
              } else {
                // Entra in modalità selezione
                setIsSelectionMode(true);
              }
            }}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              isSelectionMode 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {isSelectionMode ? 'Annulla Selezione' : 'Seleziona Più Date'}
          </button>
          
          {isSelectionMode && selectedDates.length > 0 && (
            <>
              <button
                onClick={() => setIsBulkEditModalOpen(true)}
                className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                Modifica {selectedDates.length} Date
              </button>
              <button
                onClick={handleCreateBooking}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Nuova Prenotazione
              </button>
            </>
          )}
        </div>
        
        {/* Terza riga: Legenda con maggiore separazione */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-500 mr-2"></div>
            <span>Prenotato</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-500 mr-2"></div>
            <span>Bloccato</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-500 mr-2"></div>
            <span>Prezzo Personalizzato</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-100 border border-purple-500 mr-2"></div>
            <span>Prezzo Stagionale</span>
          </div>
          {isSelectionMode && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-indigo-100 border border-indigo-500 mr-2"></div>
              <span>Selezionato</span>
            </div>
          )}
          {apartmentData.minStay > 1 && (
            <div className="flex items-center ml-auto">
              <span className="font-semibold">Soggiorno minimo: {apartmentData.minStay} notti</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative" ref={calendarGridRef}>
        {/* Griglia del calendario */}
        <div className="grid grid-cols-7 gap-1">
          {/* Intestazione giorni della settimana */}
          {weekdayNames.map((day, index) => (
            <div key={index} className="h-10 flex items-center justify-center font-medium">
              {day}
            </div>
          ))}
          
          {/* Celle del calendario */}
          {calendarDays.map((day, index) => {
            if (!day) return <div key={index} className="h-28 border border-gray-200"></div>;
            
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isTodayCell = isToday(day);
            const booking = getBookingForDate(day);
            const bookingPosition = booking ? getBookingPosition(day, booking) : undefined;
            const isBlocked = isDateBlocked(day);
            const hasCustomPrice = hasCustomRate(day) && dailyRates[dateToString(day)].price !== undefined;
            const season = getSeasonForDate(day);
            const hasSeasonalPrice = !!season;
            const price = getPriceForDate(day);
            const minStay = getMinStayForDate(day);
            const isSelected = isSelectionMode && isDateSelected(day);
            const isPastDay = isPastDate(day); // Verifica se la data è passata
            
            // Non mostrare le informazioni di prenotazione nella cella
            // quando queste sono mostrate come strisce
            const showBookingInCell = false;
            
            return (
              <div 
                key={index} 
                className="relative h-28"
                ref={(el) => setCellRef(el, index)}
              >
                <DayCell
                  date={day}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isTodayCell}
                  booking={showBookingInCell ? booking : null}
                  bookingPosition={bookingPosition}
                  isBlocked={isBlocked}
                  hasCustomPrice={hasCustomPrice}
                  hasSeasonalPrice={hasSeasonalPrice}
                  seasonName={season?.name}
                  price={price}
                  minStay={minStay > 1 ? minStay : undefined}
                  isSelected={isSelected}
                  isSelectionMode={isSelectionMode}
                  isPastDate={isPastDay}
                  onClick={() => handleDayClick(day)}
                />
              </div>
            );
          })}
        </div>
        
        {/* Strisce delle prenotazioni */}
        {renderBookingStrips()}
      </div>
      
      {/* Stagioni attive */}
      {Object.keys(seasonalInfo).length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Stagioni Attive</h3>
          <div className="flex flex-wrap gap-2">
            {Object.values(seasonalInfo)
              .filter((season, index, self) => 
                self.findIndex(s => s.name === season.name) === index
              )
              .map((season) => (
                <div key={season.name} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-md">
                  {season.name}: €{season.price.toFixed(2)} 
                  <span className="text-xs ml-1">
                    ({formatDate(season.startDate)} - {formatDate(season.endDate)})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Azioni rapide */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Azioni Rapide</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={selectAllMonth}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
          >
            Seleziona Tutto il Mese
          </button>
          <button
            onClick={() => {
              const startDate = new Date(currentYear, currentMonth, 1);
              const endDate = new Date(currentYear, currentMonth + 1, 0);
              handleBlockDates(startDate, endDate, true);
            }}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Blocca Tutto il Mese
          </button>
          <button
            onClick={() => {
              const startDate = new Date(currentYear, currentMonth, 1);
              const endDate = new Date(currentYear, currentMonth + 1, 0);
              handleBlockDates(startDate, endDate, false);
            }}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Sblocca Tutto il Mese
          </button>

          {/* Nuovi pulsanti per il reset */}
          <button
            onClick={handleResetPrices}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Reset Prezzi
          </button>
          <button
            onClick={handleResetMinStay}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
          >
            Reset Soggiorno Minimo
          </button>
        </div>
      </div>
      
      {/* Modal per modificare la tariffa singola */}
      {selectedDate && (
        <RateModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          date={selectedDate}
          apartmentData={apartmentData}
          rateData={selectedDate ? dailyRates[dateToString(selectedDate)] : undefined}
          seasonData={getSeasonForDate(selectedDate)}
          booking={getBookingForDate(selectedDate)}
          onSave={handleSaveRate}
          onCreateBooking={handleCreateBookingFromDate}
        />
      )}
      
      {/* Modal per modifiche in blocco */}
      {selectedDates.length > 0 && (
        <BulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          dates={selectedDates}
          apartmentData={apartmentData}
          onSave={handleBulkEdit}
        />
      )}
      
      {/* Modal per nuova prenotazione */}
      <BookingFormModal
        isOpen={isNewBookingModalOpen}
        onClose={() => setIsNewBookingModalOpen(false)}
        startDate={newBookingStartDate}
        endDate={newBookingEndDate}
        apartmentId={apartmentId}
        apartmentData={apartmentData}
        customMinStay={getMinStayForDate(newBookingStartDate)}
      />
      
      {/* Nuovo Modal per visualizzare i dettagli della prenotazione */}
      <Transition.Root show={isBookingModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsBookingModalOpen(false)}>
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
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => setIsBookingModalOpen(false)}
                    >
                      <span className="sr-only">Chiudi</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  {selectedBooking && (
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          Prenotazione: {selectedBooking.guestName}
                        </Dialog.Title>
                        
                        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Check-in</p>
                              <p className="mt-1 text-sm text-gray-900">{formatDate(new Date(selectedBooking.checkIn))}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Check-out</p>
                              <p className="mt-1 text-sm text-gray-900">{formatDate(new Date(selectedBooking.checkOut))}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Ospiti</p>
                              <p className="mt-1 text-sm text-gray-900">{selectedBooking.numberOfGuests}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Prezzo</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">€{selectedBooking.totalPrice.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {selectedBooking.guestEmail && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-500">Email</p>
                              <p className="mt-1 text-sm text-gray-900">{selectedBooking.guestEmail}</p>
                            </div>
                          )}
                          
                          {selectedBooking.guestPhone && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-500">Telefono</p>
                              <p className="mt-1 text-sm text-gray-900">{selectedBooking.guestPhone}</p>
                            </div>
                          )}
                          
                          {selectedBooking.source && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-500">Fonte</p>
                              <p className="mt-1 text-sm text-gray-900">
                                {selectedBooking.source === 'direct' ? 'Diretta' : 
                                 selectedBooking.source === 'airbnb' ? 'Airbnb' :
                                 selectedBooking.source === 'booking' ? 'Booking.com' : 
                                 selectedBooking.source}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-5 sm:mt-4 flex flex-row-reverse justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/bookings/${selectedBooking.id}`)}
                            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Dettagli
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => router.push(`/bookings/${selectedBooking.id}/edit`)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Modifica
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmOpen(true)}
                            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Elimina
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      
      {/* Modal di conferma eliminazione */}
      <Transition.Root show={deleteConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-20" onClose={() => setDeleteConfirmOpen(false)}>
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
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Conferma eliminazione
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Sei sicuro di voler eliminare questa prenotazione? Questa azione non può essere annullata.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      onClick={handleDeleteBooking}
                      disabled={loading}
                    >
                      {loading ? 'Eliminazione...' : 'Elimina'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={() => setDeleteConfirmOpen(false)}
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
