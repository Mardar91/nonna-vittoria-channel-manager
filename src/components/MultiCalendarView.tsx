'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, AdjustmentsHorizontalIcon, LockClosedIcon, LockOpenIcon, PlusCircleIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Interfacce aggiornate
interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  numberOfGuests: number;
  totalPrice: number;
}

interface Rate {
  _id?: string; // Potrebbe essere assente se non salvata
  date: Date;
  price?: number;
  isBlocked: boolean;
  minStay?: number;
  notes?: string;
}

interface ApartmentData {
    _id: string; // Aggiunto _id per coerenza
    name: string;
    price: number; // Prezzo base
    minStay?: number;
    // Altri campi necessari...
}


interface ApartmentWithDetails {
  id: string; // Corrisponde a _id dell'appartamento
  data: ApartmentData;
  // Includi TUTTE le prenotazioni (anche pending) per questo appartamento nel range visualizzato
  bookings: Booking[];
  // Includi le tariffe giornaliere per questo appartamento nel range visualizzato
  rates: Rate[];
}

interface MultiCalendarViewProps {
  // La prop apartments ora dovrebbe contenere dati più dettagliati
  apartments: ApartmentWithDetails[];
}

export default function MultiCalendarView({ apartments }: MultiCalendarViewProps) {
  const router = useRouter();
  const todayCellRef = useRef<HTMLTableCellElement>(null);

  const [currentDateState, setCurrentDateState] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDateState.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateState.getFullYear());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Stato per selezione multipla { apartmentId: { dateISO: Date } }
  const [selectedDates, setSelectedDates] = useState<{[key: string]: {[key: string]: Date}}>({});
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditApartmentId, setBulkEditApartmentId] = useState<string | null>(null);
  const [bulkEditData, setBulkEditData] = useState<{ price?: number | '', minStay?: number | '', isBlocked?: boolean | null }>({
      price: '', minStay: '', isBlocked: null
  });


  // --- FUNZIONI HELPER (Date, Formattazione, etc.) ---
   const dateToString = (date: Date): string => {
     const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
     const year = d.getUTCFullYear();
     const month = String(d.getUTCMonth() + 1).padStart(2, '0');
     const day = String(d.getUTCDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
   };

   const getTodayInItaly = (): Date => {
     const now = new Date();
     const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
     const [year, month, day] = formatter.format(now).split('-');
     return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
   };

   const isPastDate = (date: Date): boolean => {
     const todayUTCStart = getTodayInItaly();
     const compareDateUTCStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
     return compareDateUTCStart < todayUTCStart;
   };

   const isToday = (date: Date): boolean => {
     const todayUTCStart = getTodayInItaly();
     const compareDateUTCStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
     return compareDateUTCStart.getTime() === todayUTCStart.getTime();
   };

   const formatDateHeader = (date: Date): { weekday: string; day: number } => {
     const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
     // Usa getUTCDay per coerenza con la generazione del calendario in UTC
     return { weekday: weekdays[date.getUTCDay()], day: date.getUTCDate() };
   };


  // --- GENERAZIONE CALENDARIO & CARICAMENTO DATI ---
   useEffect(() => {
       generateCalendarDays(currentYear, currentMonth);
       // Le tariffe e le prenotazioni sono passate come props, non le carichiamo qui
       // Ma resettiamo la selezione quando cambia il mese
       setSelectedDates({});
   }, [currentMonth, currentYear]);

   const generateCalendarDays = (year: number, month: number) => {
     // Genera giorni in UTC
     const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
     const days: Date[] = [];
     for (let i = 1; i <= daysInMonth; i++) {
       days.push(new Date(Date.UTC(year, month, i)));
     }
     setCalendarDays(days);
   };


   // Scrolla ad oggi al mount e quando cambiano i giorni
   useEffect(() => {
     const timer = setTimeout(() => {
       if (todayCellRef.current) {
         todayCellRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
       }
     }, 300); // Leggero ritardo per assicurare il rendering
     return () => clearTimeout(timer);
   }, [calendarDays]); // Si attiva quando calendarDays è pronto


  // --- NAVIGAZIONE ---
  const goToPreviousMonth = () => {
     setCurrentMonth((prev) => {
         if (prev === 0) { setCurrentYear(y => y - 1); return 11; }
         return prev - 1;
     });
  };
  const goToNextMonth = () => {
     setCurrentMonth((prev) => {
         if (prev === 11) { setCurrentYear(y => y + 1); return 0; }
         return prev + 1;
     });
  };
  const goToToday = () => {
     const today = new Date();
     setCurrentMonth(today.getMonth());
     setCurrentYear(today.getFullYear());
     toast.success('Visualizzazione impostata al mese corrente');
     // Scroll to today viene gestito dall'useEffect su calendarDays
  };

  // --- GESTIONE INTERAZIONI (Click, Checkbox, Dropdown) ---
  const handleApartmentClick = (apartmentId: string) => {
    router.push(`/apartments/${apartmentId}/calendar`); // Vai al calendario specifico
  };

  const handleDateClick = (apartmentId: string, date: Date, event: React.MouseEvent) => {
    // Impedisci apertura dropdown se si clicca sulla checkbox
    if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).closest('input')) {
        return;
    }
    // Impedisci apertura dropdown per date passate? Forse sì.
     if (isPastDate(date)) {
         toast("Data passata", { icon: '⏳'});
         return;
     }

    const dropdownId = `dropdown-${apartmentId}-${dateToString(date)}`;
    setActiveDropdown(activeDropdown === dropdownId ? null : dropdownId);
  };

   // Chiudi dropdown se si clicca fuori
   useEffect(() => {
       const handleClickOutside = (event: MouseEvent) => {
           if (activeDropdown && !(event.target as HTMLElement).closest(`#${activeDropdown}`)) {
                // Verifica anche che non si stia cliccando su una cella per aprire un nuovo dropdown
                if (!(event.target as HTMLElement).closest('td[data-dropdown-target]')) {
                     setActiveDropdown(null);
                }
           }
       };
       document.addEventListener('mousedown', handleClickOutside);
       return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [activeDropdown]);


  const handleCheckboxChange = (apartmentId: string, date: Date, isChecked: boolean) => {
    const dateKey = dateToString(date); // Usa la stringa UTC come chiave
    setSelectedDates(prev => {
      const newSelectedDates = { ...prev };
      if (!newSelectedDates[apartmentId]) newSelectedDates[apartmentId] = {};

      if (isChecked) {
        newSelectedDates[apartmentId][dateKey] = date;
      } else {
        delete newSelectedDates[apartmentId][dateKey];
        if (Object.keys(newSelectedDates[apartmentId]).length === 0) {
          delete newSelectedDates[apartmentId];
        }
      }
      return newSelectedDates;
    });
  };

  // --- LOGICA DI VISUALIZZAZIONE CELLE E PRENOTAZIONI ---

   // **MODIFICA CHIAVE**: Trova solo la prenotazione CONFERMATA (o completata) per una data
   const getConfirmedBookingForDate = (apartment: ApartmentWithDetails, date: Date): Booking | null => {
     const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
     return apartment.bookings.find(booking => {
         if (booking.status !== 'confirmed' && booking.status !== 'completed') return false;

         const checkIn = new Date(booking.checkIn);
         const checkOut = new Date(booking.checkOut);
         const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));
         const checkOutUTC = new Date(Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()));

         return dateUTC >= checkInUTC && dateUTC < checkOutUTC;
     }) || null;
   };

  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' | 'single' => {
     const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
     const checkIn = new Date(booking.checkIn);
     const checkOut = new Date(booking.checkOut);
     const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));
     const checkOutUTC = new Date(Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()));
     const lastDayUTC = new Date(checkOutUTC);
     lastDayUTC.setUTCDate(lastDayUTC.getUTCDate() - 1);

     if (checkInUTC.getTime() === lastDayUTC.getTime()) return 'single';
     if (dateUTC.getTime() === checkInUTC.getTime()) return 'start';
     if (dateUTC.getTime() === lastDayUTC.getTime()) return 'end';
     return 'middle';
  };

   // Trova la tariffa specifica per una data (se esiste)
   const getRateForDate = (apartment: ApartmentWithDetails, date: Date): Rate | null => {
       const dateStr = dateToString(date);
       // Cerca prima nelle tariffe passate come prop
       const foundRate = apartment.rates.find(rate => dateToString(new Date(rate.date)) === dateStr);
       return foundRate || null;
        // Potrebbe essere necessario fare fallback a tariffe stagionali o base se non trovata,
        // ma per isBlocked, price, minStay la tariffa giornaliera ha priorità.
   };

  const isDateBlockedManually = (apartment: ApartmentWithDetails, date: Date): boolean => {
    const rate = getRateForDate(apartment, date);
    return rate?.isBlocked === true;
  };

  const getPriceForDate = (apartment: ApartmentWithDetails, date: Date): number => {
    const rate = getRateForDate(apartment, date);
    if (rate?.price !== undefined) return rate.price;
    // TODO: Aggiungere logica stagionale se necessaria anche qui
    return apartment.data.price || 0; // Prezzo base
  };

   const hasCustomRate = (apartment: ApartmentWithDetails, date: Date): boolean => {
       const rate = getRateForDate(apartment, date);
       // Ha tariffa custom se prezzo o minStay sono definiti sulla tariffa giornaliera
       return !!rate && (rate.price !== undefined || rate.minStay !== undefined);
   };


  const isDateSelected = (apartmentId: string, date: Date): boolean => {
    const dateKey = dateToString(date);
    return !!selectedDates[apartmentId]?.[dateKey];
  };

  const getSelectedDatesCount = (apartmentId: string): number => {
    return Object.keys(selectedDates[apartmentId] || {}).length;
  };

  // --- AZIONI (Bulk Edit, Quick Actions) ---
  const openBulkEditModal = (apartmentId: string) => {
    setBulkEditApartmentId(apartmentId);
    setBulkEditData({ price: '', minStay: '', isBlocked: null }); // Resetta dati modal
    setIsBulkEditModalOpen(true);
  };

  const handleBulkEditSave = async () => {
    if (!bulkEditApartmentId) return;
    const apartmentDates = selectedDates[bulkEditApartmentId] || {};
    const datesArray = Object.values(apartmentDates);
    if (datesArray.length === 0) {
      toast.error("Nessuna data selezionata per la modifica");
      return;
    }

    setLoading(true);
    try {
      datesArray.sort((a, b) => a.getTime() - b.getTime());
      const updatePayload: any = {
        startDate: datesArray[0].toISOString(),
        endDate: datesArray[datesArray.length - 1].toISOString(),
        // Includi solo i campi che hanno un valore
      };
      if (bulkEditData.price !== '') updatePayload.price = Number(bulkEditData.price);
      if (bulkEditData.minStay !== '') updatePayload.minStay = Number(bulkEditData.minStay);
      if (bulkEditData.isBlocked !== null) updatePayload.isBlocked = bulkEditData.isBlocked;

       // Non inviare se non c'è nulla da modificare
       if (Object.keys(updatePayload).length <= 2) { // solo startDate e endDate
            toast("Nessuna modifica specificata.", { icon: "ℹ️"});
            setIsBulkEditModalOpen(false);
            return;
       }


      const response = await fetch(`/api/apartments/${bulkEditApartmentId}/bulk-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || "Errore nell'aggiornamento in blocco");
      }

      toast.success(`Modifiche applicate a ${datesArray.length} date`);
      setIsBulkEditModalOpen(false);
      // Resetta selezione per l'appartamento modificato
      setSelectedDates(prev => {
        const next = { ...prev };
        delete next[bulkEditApartmentId];
        return next;
      });
      router.refresh(); // Ricarica dati pagina
    } catch (error: any) {
      console.error("Errore nell'aggiornamento in blocco:", error);
      toast.error(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (apartmentId: string, date: Date, action: 'block' | 'unblock' | 'book') => {
    setActiveDropdown(null); // Chiudi dropdown prima dell'azione
    setLoading(true);

    try {
      if (action === 'block' || action === 'unblock') {
        const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: date.toISOString(), isBlocked: action === 'block' }),
        });
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.error || `Errore nel ${action === 'block' ? 'bloccare' : 'sbloccare'} la data`);
        }
        toast.success(action === 'block' ? 'Data bloccata' : 'Data sbloccata');
      } else if (action === 'book') {
         // Calcola data checkout base (es. +1 notte)
         const checkOutDate = new Date(date);
         checkOutDate.setUTCDate(checkOutDate.getUTCDate() + 1); // +1 giorno per checkout
         // Redirect alla pagina di nuova prenotazione precompilata
         router.push(`/bookings/new?apartmentId=${apartmentId}&checkIn=${dateToString(date)}&checkOut=${dateToString(checkOutDate)}`);
         // Non serve refresh qui, la navigazione cambia pagina
         setLoading(false); // Interrompi loading perché navighiamo via
         return;
      }
      router.refresh(); // Ricarica dati dopo blocco/sblocco
    } catch (error: any) {
      console.error(`Errore nell'azione rapida (${action}):`, error);
      toast.error(`Errore: ${error.message}`);
    } finally {
       // Assicurati che loading sia false solo se non abbiamo navigato via
       if (action !== 'book') {
           setLoading(false);
       }
    }
  };

  // --- RENDER ---
  const monthNames = [ /* ... */ 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

   // Verifica se ci sono dati da mostrare
   if (!apartments || apartments.length === 0) {
       return (
           <div className="p-4 text-center text-gray-500">
               Nessun appartamento da visualizzare. <Link href="/apartments/new" className="text-blue-600 hover:underline">Aggiungi il primo!</Link>
           </div>
       );
   }
    if (calendarDays.length === 0) {
      return <div className="p-4 text-center">Caricamento calendario...</div>;
    }

  return (
    <div className="space-y-4">
      {/* Header Calendario */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center">
          <h2 className="text-lg md:text-xl font-semibold mr-4 md:mr-6">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center space-x-1 md:space-x-2">
            <button onClick={goToPreviousMonth} className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50" disabled={loading}><ChevronLeftIcon className="w-5 h-5" /></button>
            <button onClick={goToNextMonth} className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50" disabled={loading}><ChevronRightIcon className="w-5 h-5" /></button>
          </div>
        </div>
        <button onClick={goToToday} className="flex items-center px-2 py-1 md:px-3 md:py-1 text-xs md:text-sm font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50" disabled={loading}>
          <CalendarIcon className="w-4 h-4 mr-1" /> Oggi
        </button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 mb-4 text-xs text-gray-600">
        <div className="flex items-center"><div className="w-3 h-3 bg-green-100 border border-green-400 mr-1"></div><span>Confermata</span></div>
        <div className="flex items-center"><div className="w-3 h-3 bg-blue-100 border border-blue-400 mr-1"></div><span>Completata</span></div>
        <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-400 mr-1"></div><span>Bloccato</span></div>
        <div className="flex items-center"><div className="w-3 h-3 bg-yellow-100 border border-yellow-400 mr-1"></div><span>Tariffa Custom</span></div>
        <div className="flex items-center"><div className="w-3 h-3 bg-indigo-100 border border-indigo-400 mr-1"></div><span>Selezionato</span></div>
        <div className="flex items-center"><div className="w-3 h-3 bg-gray-100 border border-gray-300 mr-1"></div><span>Passato</span></div>
      </div>

      {/* Tabella Calendario */}
      <div className="overflow-x-auto pb-4 border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full border-collapse">
          {/* Header Tabella */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-100 border-b border-r border-gray-200 p-2 min-w-[120px] md:min-w-[180px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Appartamento
              </th>
              {calendarDays.map((day) => {
                const { weekday, day: dayNum } = formatDateHeader(day);
                const isCurrentDay = isToday(day);
                return (
                  <th key={dateToString(day)} className={`border-b border-l border-gray-200 py-1 px-1 min-w-[60px] md:min-w-[70px] text-center ${isCurrentDay ? "bg-blue-50" : ""}`}>
                    <div className="text-[10px] md:text-xs font-medium text-gray-500">{weekday}</div>
                    <div className={`text-sm md:text-base ${isCurrentDay ? "font-bold text-blue-600" : "text-gray-700"}`}>
                      {dayNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body Tabella */}
          <tbody>
            {apartments.map((apartment) => {
              const selectedCount = getSelectedDatesCount(apartment.id);
              return (
                <tr key={apartment.id} className="bg-white hover:bg-gray-50 transition-colors">
                  {/* Cella Nome Appartamento */}
                  <td className="sticky left-0 z-10 bg-inherit border-b border-r border-gray-200 p-2 font-medium">
                    <div className="flex justify-between items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 truncate text-sm"
                        onClick={() => handleApartmentClick(apartment.id)}
                        title={apartment.data?.name}
                      >
                        {apartment.data?.name || `ID: ${apartment.id.substring(0,6)}...`}
                      </span>
                      {selectedCount > 0 && (
                        <button
                          className="flex-shrink-0 p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs flex items-center"
                          onClick={() => openBulkEditModal(apartment.id)}
                           title={`Modifica ${selectedCount} date selezionate`}
                        >
                          <AdjustmentsHorizontalIcon className="w-3 h-3 md:mr-1" />
                          <span className="hidden md:inline">{selectedCount}</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Celle Giorni per Appartamento */}
                  {calendarDays.map((day) => {
                    const dateKey = dateToString(day);
                    const isPast = isPastDate(day);
                    const isCurrentDay = isToday(day);
                    // ** USA getConfirmedBookingForDate **
                    const confirmedBooking = getConfirmedBookingForDate(apartment, day);
                    const isBlocked = isDateBlockedManually(apartment, day);
                    const isSelected = isDateSelected(apartment.id, day);
                    const price = getPriceForDate(apartment, day);
                    const hasCustom = hasCustomRate(apartment, day);

                    // Cella è occupata se prenotata O bloccata manualmente
                    const isOccupied = !!confirmedBooking || isBlocked;
                    const bookingPos = confirmedBooking ? getBookingPosition(day, confirmedBooking) : null;

                    let cellClasses = "border-b border-l border-gray-200 p-1 h-14 md:h-16 relative text-center ";
                    let contentClasses = "flex flex-col items-center justify-center h-full text-xs ";
                    let priceOrStatus = null;

                    if (isSelected) cellClasses += "bg-indigo-50 ";
                    else if (isCurrentDay && !isOccupied && !isPast) cellClasses += "bg-blue-50 ";

                    if (isPast) {
                      cellClasses += "bg-gray-100 cursor-not-allowed ";
                      contentClasses += "text-gray-400";
                      priceOrStatus = <span title="Data passata">--</span>;
                    } else if (confirmedBooking) {
                      cellClasses += `bg-green-50 ${bookingPos === 'start' ? 'rounded-l-sm' : ''} ${bookingPos === 'end' ? 'rounded-r-sm' : ''}`;
                       contentClasses += "text-green-800 font-medium";
                       priceOrStatus = (
                           <div className="text-[10px] leading-tight truncate max-w-full" title={`${confirmedBooking.guestName} (${confirmedBooking.status})`}>
                              {confirmedBooking.guestName.split(' ')[0]}
                               {confirmedBooking.status === 'completed' ? <span className='text-blue-700'>(C)</span> : ''}
                           </div>
                       );
                    } else if (isBlocked) {
                      cellClasses += "bg-red-50 ";
                      contentClasses += "text-red-600 font-medium";
                      priceOrStatus = <LockClosedIcon className="w-4 h-4" title="Bloccato"/>;
                    } else {
                      // Disponibile
                      cellClasses += "cursor-pointer "; // Cliccabile
                       contentClasses += "text-gray-700";
                       priceOrStatus = (
                           <span className={hasCustom ? "font-bold text-yellow-700" : ""}>
                               {price.toFixed(0)}€
                           </span>
                       );
                    }

                    return (
                      <td
                        key={dateKey}
                        className={cellClasses}
                        onClick={(e) => handleDateClick(apartment.id, day, e)}
                        data-dropdown-target // Marca per gestione chiusura dropdown
                      >
                        <div className={contentClasses}>
                          {priceOrStatus}
                        </div>
                        {/* Checkbox solo se futuro e disponibile */}
                        {!isPast && !isOccupied && (
                          <input
                            type="checkbox"
                            className="absolute bottom-1 right-1 h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition"
                            checked={isSelected}
                            onChange={(e) => handleCheckboxChange(apartment.id, day, e.target.checked)}
                            onClick={(e) => e.stopPropagation()} // Non triggerare handleDateClick
                          />
                        )}

                        {/* Dropdown (visibile solo se activeDropdown corrisponde) */}
                        <div
                          id={`dropdown-${apartment.id}-${dateKey}`}
                          className={`absolute z-30 top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 text-left ${activeDropdown === `dropdown-${apartment.id}-${dateKey}` ? '' : 'hidden'}`}
                           onMouseLeave={() => setActiveDropdown(null)} // Chiudi se il mouse esce dal dropdown
                        >
                            <button onClick={() => handleQuickAction(apartment.id, day, 'book')} className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800"><PlusCircleIcon className="w-4 h-4 mr-2"/>Prenota</button>
                             {isBlocked
                                 ? <button onClick={() => handleQuickAction(apartment.id, day, 'unblock')} className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800"><LockOpenIcon className="w-4 h-4 mr-2"/>Sblocca</button>
                                 : <button onClick={() => handleQuickAction(apartment.id, day, 'block')} className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800"><LockClosedIcon className="w-4 h-4 mr-2"/>Blocca</button>
                             }
                             <div className="border-t border-gray-100 my-1"></div>
                             <button onClick={() => router.push(`/apartments/${apartment.id}/calendar?date=${dateKey}`)} className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><CalendarIcon className="w-4 h-4 mr-2"/>Calendario Apt.</button>
                             {confirmedBooking && (
                                <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button onClick={() => router.push(`/bookings/${confirmedBooking.id}`)} className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><EyeIcon className="w-4 h-4 mr-2"/>Vedi Prenot.</button>
                                 <button onClick={() => router.push(`/bookings/${confirmedBooking.id}/edit`)} className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><PencilIcon className="w-4 h-4 mr-2"/>Modifica Prenot.</button>
                                </>
                             )}
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

      {/* Pulsanti Azioni Globali (Aggiungi Apt) */}
       <div className="mt-6 flex justify-end">
           <Link href="/apartments/new" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
               <PlusCircleIcon className="h-5 w-5 mr-2" />
               Aggiungi Appartamento
           </Link>
       </div>


      {/* Modal Bulk Edit */}
       <Transition.Root show={isBulkEditModalOpen} as={Fragment}>
         <Dialog as="div" className="relative z-50" onClose={() => setIsBulkEditModalOpen(false)}>
             {/* Overlay */}
             <Transition.Child /* ... */> <div className="fixed inset-0 bg-gray-500 bg-opacity-75"/> </Transition.Child>
              {/* Panel */}
               <div className="fixed inset-0 z-10 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center p-4 text-center">
                     <Transition.Child /* ... */>
                        <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                           <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">Modifica Date Selezionate</Dialog.Title>
                           <div className="mt-4 space-y-4">
                               {/* Input Prezzo */}
                               <div>
                                   <label htmlFor="bulkPrice" className="block text-sm font-medium text-gray-700">Prezzo (€)</label>
                                   <input type="number" id="bulkPrice" value={bulkEditData.price ?? ''} onChange={(e) => setBulkEditData(d => ({...d, price: e.target.value === '' ? '' : Number(e.target.value)}))} min="0" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="Lascia vuoto per non modificare"/>
                               </div>
                               {/* Input Min Stay */}
                                <div>
                                   <label htmlFor="bulkMinStay" className="block text-sm font-medium text-gray-700">Soggiorno minimo</label>
                                   <input type="number" id="bulkMinStay" value={bulkEditData.minStay ?? ''} onChange={(e) => setBulkEditData(d => ({...d, minStay: e.target.value === '' ? '' : Number(e.target.value)}))} min="1" step="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="Lascia vuoto per non modificare"/>
                               </div>
                                {/* Radio Blocco */}
                               <fieldset>
                                    <legend className="text-sm font-medium text-gray-700">Stato Blocco</legend>
                                    <div className="mt-2 space-y-2 sm:flex sm:items-center sm:space-y-0 sm:space-x-6">
                                        <div className="flex items-center"><input id="blk-true" name="blk" type="radio" checked={bulkEditData.isBlocked === true} onChange={()=>setBulkEditData(d=>({...d, isBlocked: true}))} className="h-4 w-4"/> <label htmlFor="blk-true" className="ml-2">Blocca</label></div>
                                        <div className="flex items-center"><input id="blk-false" name="blk" type="radio" checked={bulkEditData.isBlocked === false} onChange={()=>setBulkEditData(d=>({...d, isBlocked: false}))} className="h-4 w-4"/> <label htmlFor="blk-false" className="ml-2">Sblocca</label></div>
                                        <div className="flex items-center"><input id="blk-null" name="blk" type="radio" checked={bulkEditData.isBlocked === null} onChange={()=>setBulkEditData(d=>({...d, isBlocked: null}))} className="h-4 w-4"/> <label htmlFor="blk-null" className="ml-2">Non Modificare</label></div>
                                    </div>
                               </fieldset>
                           </div>
                            {/* Buttons */}
                           <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                             <button type="button" className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-blue-500 sm:col-start-2 disabled:opacity-50" onClick={handleBulkEditSave} disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</button>
                             <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0" onClick={() => setIsBulkEditModalOpen(false)}>Annulla</button>
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
