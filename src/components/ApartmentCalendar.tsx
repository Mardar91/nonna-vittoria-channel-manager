'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, XMarkIcon, TrashIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import DayCell from '@/components/DayCell'; // Assicurati che DayCell sia stilisticamente coerente
import RateModal from '@/components/RateModal'; // Assicurati che i modal siano stilisticamente coerenti
import BulkEditModal from '@/components/BulkEditModal'; // Assicurati che i modal siano stilisticamente coerenti
import BookingFormModal from '@/components/BookingFormModal'; // Assicurati che i modal siano stilisticamente coerenti

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

  const currentDateItaly = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const [currentDate, setCurrentDate] = useState(currentDateItaly);
  const [currentMonth, setCurrentMonth] = useState(currentDateItaly.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDateItaly.getFullYear());
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
    if (cellRefs.current.length > index) {
      cellRefs.current[index] = el;
    }
  }, []);

  const dateToString = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const generateCalendarDays = useCallback((year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const adjustedFirstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < adjustedFirstDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -adjustedFirstDayOfWeek + i + 1);
      days.push(prevMonthDay);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDay = new Date(year, month + 1, i);
      days.push(nextMonthDay);
    }
    setCalendarDays(days);
    cellRefs.current = Array(days.length).fill(null);
  }, [setCalendarDays]);

  const loadDailyRates = useCallback(async () => {
    setLoading(true);
    try {
      const firstDayShown = new Date(currentYear, currentMonth, 1);
      firstDayShown.setDate(1 - ((firstDayShown.getDay() + 6) % 7));
      const lastDayShown = new Date(currentYear, currentMonth + 1, 0);
      const remainingDays = 6 - ((lastDayShown.getDay() + 6) % 7);
      lastDayShown.setDate(lastDayShown.getDate() + remainingDays);

      const response = await fetch(`/api/apartments/${apartmentId}/rates?startDate=${dateToString(firstDayShown)}&endDate=${dateToString(lastDayShown)}`);
      if (!response.ok) throw new Error('Errore nel caricamento delle tariffe');
      const data = await response.json();
      const ratesMap: Record<string, DailyRate> = {};
      data.forEach((rate: DailyRate) => {
        const dateStr = dateToString(new Date(rate.date));
        ratesMap[dateStr] = { ...rate, date: new Date(rate.date) };
      });
      setDailyRates(ratesMap);
    } catch (error) {
      console.error('Error loading daily rates:', error);
      toast.error('Errore nel caricamento delle tariffe');
    } finally {
      setLoading(false);
    }
  }, [apartmentId, currentMonth, currentYear, setLoading, setDailyRates]);

  const processSeasonalPrices = useCallback(() => {
    if (!apartmentData.seasonalPrices || !apartmentData.seasonalPrices.length) {
      setSeasonalInfo({});
      return;
    }
    const seasonMap: Record<string, SeasonalPrice> = {};
    apartmentData.seasonalPrices.forEach((season: SeasonalPrice) => {
      const startDate = new Date(season.startDate);
      const endDate = new Date(season.endDate);
      let currentDateLoop = new Date(startDate); // Renamed to avoid conflict
      while (currentDateLoop <= endDate) {
        const dateStr = dateToString(currentDateLoop);
        seasonMap[dateStr] = {
          ...season,
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate)
        };
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
    });
    setSeasonalInfo(seasonMap);
  }, [apartmentData, setSeasonalInfo]);

  useEffect(() => {
    generateCalendarDays(currentYear, currentMonth);
    loadDailyRates();
    processSeasonalPrices();
  }, [currentYear, currentMonth, generateCalendarDays, loadDailyRates, processSeasonalPrices]);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    toast.success('Visualizzazione impostata alla data corrente');
  };

  const handleDayClick = (date: Date) => {
    if (isSelectionMode) {
      const dateStr = dateToString(date);
      const index = selectedDates.findIndex(d => dateToString(d) === dateStr);
      if (index >= 0) {
        const newSelectedDates = [...selectedDates];
        newSelectedDates.splice(index, 1);
        setSelectedDates(newSelectedDates);
      } else {
        setSelectedDates([...selectedDates, date]);
      }
    } else {
      setSelectedDate(date);
      setIsRateModalOpen(true);
    }
  };

  const selectAllMonth = () => {
    setIsSelectionMode(true);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dates: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(currentYear, currentMonth, i));
    }
    setSelectedDates(dates);
    toast.success(`Selezionate ${dates.length} date`);
  };

  const handleCreateBooking = () => {
    if (selectedDates.length === 0) {
      toast.error('Seleziona almeno una data per creare una prenotazione');
      return;
    }
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    for (const date of sortedDates) {
      if (getBookingForDate(date)) {
        toast.error('Ci sono già prenotazioni esistenti nelle date selezionate');
        return;
      }
    }
    const minStay = apartmentData.minStay || 1;
    if (sortedDates.length < minStay) {
      toast.error(`Il soggiorno minimo è di ${minStay} notti`);
      return;
    }
    const checkIn = new Date(sortedDates[0]);
    const checkOut = new Date(sortedDates[sortedDates.length - 1]);
    checkOut.setDate(checkOut.getDate() + 1);
    setNewBookingStartDate(checkIn);
    setNewBookingEndDate(checkOut);
    setIsNewBookingModalOpen(true);
  };

  const handleCreateBookingFromDate = (date: Date) => {
    const minStay = getMinStayForDate(date);
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + minStay);
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
    setIsRateModalOpen(false);
    setIsNewBookingModalOpen(true);
  };

  const handleSaveRate = async (rateData: any) => {
    if (!selectedDate) return;
    try {
      // Add formatting for selectedDate (if selectedDate is not null)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const response = await fetch(`/api/apartments/${apartmentId}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formattedDate, ...rateData }),
      });
      if (!response.ok) throw new Error('Errore nel salvataggio della tariffa');
      const data = await response.json();
      const dateStr = dateToString(selectedDate);
      setDailyRates({ ...dailyRates, [dateStr]: { ...data, date: new Date(data.date) } });
      toast.success('Tariffa aggiornata con successo');
      setIsRateModalOpen(false);
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error('Errore nel salvataggio della tariffa');
    }
  };

  const handleBulkEdit = async (rateData: any) => {
    if (selectedDates.length === 0) return;
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

      // Formatting for startDate (from sortedDates[0])
      const startDateObj = sortedDates[0];
      const startYearBulk = startDateObj.getFullYear();
      const startMonthBulk = String(startDateObj.getMonth() + 1).padStart(2, '0');
      const startDayBulk = String(startDateObj.getDate()).padStart(2, '0');
      const formattedStartDateBulk = `${startYearBulk}-${startMonthBulk}-${startDayBulk}`;

      // Formatting for endDate (from sortedDates[sortedDates.length - 1])
      const endDateObj = sortedDates[sortedDates.length - 1];
      const endYearBulk = endDateObj.getFullYear();
      const endMonthBulk = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const endDayBulk = String(endDateObj.getDate()).padStart(2, '0');
      const formattedEndDateBulk = `${endYearBulk}-${endMonthBulk}-${endDayBulk}`;

      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formattedStartDateBulk,
          endDate: formattedEndDateBulk,
          ...rateData
        }),
      });
      if (!response.ok) throw new Error('Errore nella modifica in blocco');
      await loadDailyRates();
      toast.success(`Modifiche applicate a ${selectedDates.length} date`);
      setIsBulkEditModalOpen(false);
      setIsSelectionMode(false);
      setSelectedDates([]);
    } catch (error) {
      console.error('Error bulk editing:', error);
      toast.error('Errore nella modifica in blocco');
    }
  };

  const handleBlockDates = async (startDate: Date, endDate: Date, isBlocked: boolean) => {
    try {
      // Formatting for startDate
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const formattedStartDate = `${startYear}-${startMonth}-${startDay}`;

      // Formatting for endDate
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const formattedEndDate = `${endYear}-${endMonth}-${endDay}`;

      const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formattedStartDate, // Use YYYY-MM-DD
          endDate: formattedEndDate,   // Use YYYY-MM-DD
          isBlocked
        }),
      });
      if (!response.ok) throw new Error('Errore nella modifica delle date');
      await loadDailyRates();
      toast.success(isBlocked ? 'Date bloccate con successo' : 'Date sbloccate con successo');
    } catch (error) {
      console.error('Error blocking dates:', error);
      toast.error('Errore nella modifica delle date');
    }
  };

  const handleResetPrices = async () => {
      try {
        const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
        today.setHours(0, 0, 0, 0);
        const datesToReset = Object.values(dailyRates)
          .filter(rate => {
            const date = new Date(rate.date);
            return date >= today && rate.price !== undefined;
          })
          .map(rate => new Date(rate.date));

        if (datesToReset.length === 0) {
          toast('Nessun prezzo personalizzato da resettare per le date future');
          return;
        }
        const sortedDates = datesToReset.sort((a, b) => a.getTime() - b.getTime());
        const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: sortedDates[0].toISOString(),
            endDate: sortedDates[sortedDates.length - 1].toISOString(),
            price: null,
            resetPrices: true
          }),
        });
        if (!response.ok) throw new Error('Errore nel reset dei prezzi');
        await loadDailyRates();
        toast.success(`Prezzi personalizzati resettati per ${datesToReset.length} date future`);
      } catch (error) {
        console.error('Error resetting prices:', error);
        toast.error('Errore nel reset dei prezzi');
      }
    };

    const handleResetMinStay = async () => {
      try {
        const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
        today.setHours(0, 0, 0, 0);
        const datesToReset = Object.values(dailyRates)
          .filter(rate => {
            const date = new Date(rate.date);
            return date >= today && rate.minStay !== undefined && rate.minStay !== apartmentData.minStay;
          })
          .map(rate => new Date(rate.date));

        if (datesToReset.length === 0) {
          toast('Nessun soggiorno minimo personalizzato da resettare per le date future');
          return;
        }
        const sortedDates = datesToReset.sort((a, b) => a.getTime() - b.getTime());
        const response = await fetch(`/api/apartments/${apartmentId}/bulk-rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: sortedDates[0].toISOString(),
            endDate: sortedDates[sortedDates.length - 1].toISOString(),
            minStay: apartmentData.minStay,
            resetMinStay: true
          }),
        });
        if (!response.ok) throw new Error('Errore nel reset del soggiorno minimo');
        await loadDailyRates();
        toast.success(`Soggiorno minimo resettato per ${datesToReset.length} date future`);
      } catch (error) {
        console.error('Error resetting min stay:', error);
        toast.error('Errore nel reset del soggiorno minimo');
      }
    };

  const getBookingForDate = (date: Date): Booking | null => {
    const dateStr = dateToString(date);
    return bookings.find(booking => {
      const checkInStr = dateToString(new Date(booking.checkIn));
      // For getBookingForDate, checkOutStr is the day of check-out, so booking is active if date < checkOutStr
      const checkOutStr = dateToString(new Date(booking.checkOut));
      return dateStr >= checkInStr && dateStr < checkOutStr;
    }) || null;
  };

  const getBookingPosition = (date: Date, booking: Booking): 'start' | 'middle' | 'end' | 'single' => {
    const dateStr = dateToString(date);
    const checkInStr = dateToString(new Date(booking.checkIn));
    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    const checkOutStr = dateToString(checkOutDate);
    if (checkInStr === checkOutStr) return 'single';
    if (dateStr === checkInStr) return 'start';
    if (dateStr === checkOutStr) return 'end';
    return 'middle';
  };

  const hasCustomRate = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return dateStr in dailyRates;
  };

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = dateToString(date);
    return dateStr in dailyRates && dailyRates[dateStr].isBlocked;
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
    return apartmentData.price;
  };

  const getMinStayForDate = (date: Date): number => {
    const dateStr = dateToString(date);
    if (dateStr in dailyRates && dailyRates[dateStr].minStay !== undefined) {
      return dailyRates[dateStr].minStay!;
    }
    return apartmentData.minStay || 1;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    return dateToString(date) === dateToString(today);
  };

  const handleBookingStripClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Errore nell&apos;eliminazione della prenotazione');
      toast.success('Prenotazione eliminata con successo');
      setDeleteConfirmOpen(false);
      setIsBookingModalOpen(false);
      router.refresh(); // Aggiorna dati
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Errore nell&apos;eliminazione della prenotazione');
    } finally {
      setLoading(false);
    }
  };

  const renderBookingStrips = () => {
    if (!calendarGridRef.current || calendarDays.length === 0 || cellRefs.current.some(ref => ref === null)) {
      return null;
    }

    const firstDay = calendarDays[0]!;
    const lastDay = calendarDays[calendarDays.length - 1]!;
    const lastDayPlusOne = new Date(lastDay);
    lastDayPlusOne.setDate(lastDayPlusOne.getDate() + 1);

    const visibleBookings = bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      // Removed status check, assuming parent component filters out 'cancelled'
      return checkIn < lastDayPlusOne && checkOut > firstDay;
    });

    return visibleBookings.map((booking, bookingIndex) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      // const isBlocked = booking.status === 'blocked'; // This variable is not directly used for stripClass anymore

      const firstCellIndex = calendarDays.findIndex(day => day !== null && isSameDay(day, checkIn));
      const lastDayOfBooking = new Date(checkOut);
      lastDayOfBooking.setDate(lastDayOfBooking.getDate() - 1);
      const lastCellIndex = calendarDays.findIndex(day => day !== null && isSameDay(day, lastDayOfBooking));

      if (firstCellIndex === -1 && lastCellIndex === -1) return null;

      const effectiveFirstIndex = firstCellIndex !== -1 ? firstCellIndex : 0;
      const effectiveLastIndex = lastCellIndex !== -1 ? lastCellIndex : calendarDays.length - 1;

      const bookingStrips = [];
      let currentRowStartIndex = effectiveFirstIndex;

      while (currentRowStartIndex <= effectiveLastIndex) {
        const currentRow = Math.floor(currentRowStartIndex / 7);
        const rowEndIndex = Math.min(effectiveLastIndex, (currentRow + 1) * 7 - 1);

        const startCellRef = cellRefs.current[currentRowStartIndex];
        const endCellRef = cellRefs.current[rowEndIndex];

        if (startCellRef && endCellRef) {
          const left = startCellRef.offsetLeft + 4; // Aggiunto piccolo offset
          const top = startCellRef.offsetTop + 28; // Spazio per numero giorno + padding
          const width = (endCellRef.offsetLeft + endCellRef.offsetWidth) - startCellRef.offsetLeft - 8; // Ridotto per padding
          const height = 50; // Altezza leggermente ridotta

          bookingStrips.push(
            (() => { // IIFE to use the calculated stripClass
              let stripClass = "absolute pointer-events-auto px-2 py-1 rounded-lg shadow-sm z-10 overflow-hidden cursor-pointer transition-all duration-150 ease-in-out hover:shadow-md ";
              if (booking.status === 'pending') {
                stripClass += 'bg-yellow-50 border border-yellow-300 text-yellow-700 border-dashed';
              } else if (booking.status === 'confirmed') {
                stripClass += 'bg-green-50 border border-green-300 text-green-700';
              } else if (booking.status === 'blocked') { 
                stripClass += 'bg-red-50 border border-red-300 text-red-700';
              } else { 
                stripClass += 'bg-gray-100 border border-gray-300 text-gray-700';
              }
              return (
                <div
                  key={`${booking.id}-${currentRow}`}
                  className={stripClass}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                  onClick={() => handleBookingStripClick(booking)}
                >
                  <div className="text-xs font-semibold truncate">
                    {booking.guestName} {booking.status === 'pending' && <span className="italic opacity-80">(In attesa)</span>}
                  </div>
                  <div className="text-xs opacity-80">
                    {booking.numberOfGuests} ospiti
                  </div>
                  <div className="text-xs font-medium opacity-90">
                    {new Date(booking.checkIn).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} - {new Date(booking.checkOut).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              );
            })()
          );
        }
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
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md space-y-6"> {/* Contenitore principale con stile */}
      {/* Header del calendario */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Mese precedente"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Mese successivo"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onClick={goToToday}
          className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <CalendarIcon className="w-4 h-4 mr-1.5" />
          Oggi
        </button>
      </div>

      {/* Controlli Selezione e Legenda */}
      <div className="space-y-4">
        {/* Pulsanti di selezione */}
         <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={() => {
               setIsSelectionMode(!isSelectionMode);
               if (isSelectionMode) setSelectedDates([]); // Cancella selezione uscendo dalla modalità
             }}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm ${
               isSelectionMode
                 ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                 : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
             }`}
           >
             {isSelectionMode ? 'Annulla Selezione' : 'Seleziona Più Date'}
           </button>

           {isSelectionMode && selectedDates.length > 0 && (
             <>
               <button
                 onClick={() => setIsBulkEditModalOpen(true)}
                 className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm"
               >
                 Modifica {selectedDates.length} Date
               </button>
               <button
                 onClick={handleCreateBooking}
                 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
               >
                 Nuova Prenotazione
               </button>
             </>
           )}
         </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-100 border border-green-400 rounded-sm mr-1.5"></span>
            <span>Prenotato</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-red-100 border border-red-400 rounded-sm mr-1.5"></span>
            <span>Bloccato</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded-sm mr-1.5"></span>
            <span>Prezzo Pers.</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-purple-100 border border-purple-400 rounded-sm mr-1.5"></span>
            <span>Stagionale</span>
          </div>
          {isSelectionMode && (
            <div className="flex items-center">
              <span className="w-3 h-3 bg-indigo-100 border border-indigo-400 rounded-sm mr-1.5"></span>
              <span>Selezionato</span>
            </div>
          )}
          {apartmentData.minStay > 1 && (
             <div className="flex items-center ml-auto text-xs font-medium text-gray-500">
               <span>Sogg. min: {apartmentData.minStay} notti</span>
             </div>
           )}
        </div>
      </div>

      {/* Griglia Calendario */}
      <div className="relative border border-gray-200 rounded-lg overflow-hidden" ref={calendarGridRef}>
        {/* Intestazione giorni settimana */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {weekdayNames.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Griglia giorni */}
        <div className="grid grid-cols-7 gap-px bg-gray-200"> {/* gap-px crea linee sottili */}
          {calendarDays.map((day, index) => {
            if (!day) return <div key={index} className="bg-gray-50 h-28"></div>; // Cella vuota per giorni fuori mese (se non mostrati)

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
            const isPastDay = isPastDate(day);
            const showBookingInCell = false; // Mantenuto false per usare le strisce

            return (
              <div
                key={index}
                className="relative h-28 bg-white" // Rimosso border, gap-px crea la separazione
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
                  // Aggiungi qui eventuali props per lo stile moderno a DayCell se necessario
                />
              </div>
            );
          })}
        </div>

        {/* Strisce prenotazioni (Overlay) */}
        <div className="absolute inset-0 pointer-events-none"> {/* Contenitore per strisce */}
          {renderBookingStrips()}
        </div>
      </div>

      {/* Sezioni Aggiuntive (Stagioni, Azioni Rapide) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stagioni attive */}
          {Object.keys(seasonalInfo).length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Stagioni Attive</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(seasonalInfo)
                  .filter((season, index, self) =>
                    self.findIndex(s => s.name === season.name) === index
                  )
                  .map((season) => (
                    <div key={season.name} className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-xs font-medium">
                      {season.name}: €{season.price.toFixed(0)}
                      <span className="font-normal opacity-80 ml-1">
                        ({formatDate(season.startDate)} - {formatDate(season.endDate)})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Azioni rapide */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Azioni Rapide</h3>
            <div className="flex flex-wrap gap-2">
                {/* Pulsanti Azioni Rapide con stile aggiornato */}
                <button onClick={selectAllMonth} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm">Seleziona Mese</button>
                <button onClick={() => { const start = new Date(currentYear, currentMonth, 1); const end = new Date(currentYear, currentMonth + 1, 0); handleBlockDates(start, end, true); }} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm">Blocca Mese</button>
                <button onClick={() => { const start = new Date(currentYear, currentMonth, 1); const end = new Date(currentYear, currentMonth + 1, 0); handleBlockDates(start, end, false); }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm">Sblocca Mese</button>
                <button onClick={handleResetPrices} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm">Reset Prezzi Futuri</button>
                <button onClick={handleResetMinStay} className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-md hover:bg-yellow-600 transition-colors shadow-sm">Reset Sogg. Min. Futuri</button>
            </div>
          </div>
      </div>


      {/* Modals (Assicurati che i componenti Modal abbiano uno stile moderno coerente) */}
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
        onClose={() => setIsNewBookingModalOpen(false)}
        startDate={newBookingStartDate}
        endDate={newBookingEndDate}
        apartmentId={apartmentId}
        apartmentData={apartmentData}
        customMinStay={getMinStayForDate(newBookingStartDate)}
      />

      {/* Modal Dettagli Prenotazione (CON CORREZIONE) */}
      <Transition.Root show={isBookingModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-30" onClose={() => setIsBookingModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="absolute right-4 top-4">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => setIsBookingModalOpen(false)}
                    >
                      <span className="sr-only">Chiudi</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Contenuto e pulsanti ora DENTRO la guardia */}
                  {selectedBooking && (
                    <> {/* Usa un Fragment per raggruppare contenuto e footer */}
                      {/* Contenuto Principale */}
                      <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                              Dettagli Prenotazione
                            </Dialog.Title>
                            <div className="space-y-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                              <p className="text-base font-medium text-gray-800">{selectedBooking.guestName}</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div>
                                  <p className="font-medium text-gray-500">Check-in</p>
                                  <p className="text-gray-900">{formatDate(new Date(selectedBooking.checkIn))}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-500">Check-out</p>
                                  <p className="text-gray-900">{formatDate(new Date(selectedBooking.checkOut))}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-500">Ospiti</p>
                                  <p className="text-gray-900">{selectedBooking.numberOfGuests}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-500">Prezzo Tot.</p>
                                  <p className="font-semibold text-gray-900">€{selectedBooking.totalPrice.toFixed(2)}</p>
                                </div>
                                {selectedBooking.guestEmail && (
                                    <div className="col-span-2">
                                      <p className="font-medium text-gray-500">Email</p>
                                      <p className="text-gray-900 truncate">{selectedBooking.guestEmail}</p>
                                    </div>
                                )}
                                {selectedBooking.guestPhone && (
                                    <div className="col-span-2">
                                      <p className="font-medium text-gray-500">Telefono</p>
                                      <p className="text-gray-900">{selectedBooking.guestPhone}</p>
                                    </div>
                                )}
                                {selectedBooking.source && (
                                    <div className="col-span-2">
                                      <p className="font-medium text-gray-500">Fonte</p>
                                      <p className="text-gray-900 capitalize">
                                         {selectedBooking.source === 'direct' ? 'Diretta' : selectedBooking.source}
                                      </p>
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pulsanti Azioni Modal (Footer) - ORA DENTRO la guardia */}
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/bookings/${selectedBooking.id}`)} // Tolto ?.id
                          className="inline-flex w-full justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
                        >
                          <EyeIcon className="h-4 w-4 mr-1.5" />
                          Vedi
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/bookings/${selectedBooking.id}/edit`)} // Tolto ?.id
                          className="mt-3 sm:mt-0 inline-flex w-full justify-center items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:w-auto"
                        >
                          <PencilIcon className="h-4 w-4 mr-1.5" />
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="mt-3 sm:mt-0 inline-flex w-full justify-center items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto"
                        >
                          <TrashIcon className="h-4 w-4 mr-1.5" />
                          Elimina
                        </button>
                        <button
                          type="button"
                          className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                          onClick={() => setIsBookingModalOpen(false)}
                        >
                          Chiudi
                        </button>
                      </div>
                    </>
                  )} {/* Fine del Fragment e della guardia selectedBooking */}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Modal Conferma Eliminazione (Stile aggiornato) */}
      <Transition.Root show={deleteConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={() => setDeleteConfirmOpen(false)}> {/* Aumentato z-index rispetto al precedente */}
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
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
                            Sei sicuro di voler eliminare questa prenotazione? L&apos;azione è irreversibile.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:opacity-50"
                      onClick={handleDeleteBooking}
                      disabled={loading}
                    >
                      {loading ? 'Eliminazione...' : 'Elimina Conferma'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={() => setDeleteConfirmOpen(false)}
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
