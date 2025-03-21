'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import DayCell from '@/components/DayCell';
import RateModal from '@/components/RateModal';
import BulkEditModal from '@/components/BulkEditModal';
import BookingFormModal from '@/components/BookingFormModal';
import BookingStrip from '@/components/BookingStrip';

interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  status: string;
  numberOfGuests: number;
  totalPrice: number;
}

interface DailyRate {
  _id?: string;
  date: Date;
  price?: number;
  isBlocked: boolean;
  minStay?: number;
  notes?: string;
}

interface ApartmentCalendarProps {
  apartmentId: string;
  apartmentData: any;
  bookings: Booking[];
}

export default function ApartmentCalendar({ apartmentId, apartmentData, bookings }: ApartmentCalendarProps) {
  const router = useRouter();
  const calendarGridRef = useRef<HTMLDivElement>(null);
  
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
  const [calendarPositions, setCalendarPositions] = useState<{[key: string]: DOMRect | null}>({});
  
  // Selezione multipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  
  // Modal per nuova prenotazione
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBookingStartDate, setNewBookingStartDate] = useState<Date>(new Date());
  
  // Formattazione date
  const dateToString = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Carica il calendario per il mese corrente
  useEffect(() => {
    generateCalendarDays(currentYear, currentMonth);
    loadDailyRates();
  }, [currentYear, currentMonth]);
  
  // Memorizza le posizioni delle celle del calendario dopo il rendering
  useEffect(() => {
    if (calendarGridRef.current) {
      const grid = calendarGridRef.current;
      const dayCells = grid.querySelectorAll('.day-cell');
      
      const positions: {[key: string]: DOMRect | null} = {};
      
      dayCells.forEach((cell, index) => {
        if (calendarDays[index]) {
          const date = calendarDays[index];
          if (date) {
            const key = dateToString(date);
            positions[key] = cell.getBoundingClientRect();
          }
        }
      });
      
      setCalendarPositions(positions);
    }
  }, [calendarDays, calendarGridRef.current]);
  
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
    
    // Imposta la data di check-in alla prima data selezionata
    // e la data di check-out al giorno successivo all'ultima data selezionata
    const checkIn = new Date(sortedDates[0]);
    const checkOut = new Date(sortedDates[sortedDates.length - 1]);
    checkOut.setDate(checkOut.getDate() + 1); // Aggiunge un giorno per il check-out
    
    // Salva la data iniziale per il form di prenotazione
    setNewBookingStartDate(checkIn);
    
    // Apri il modal per la creazione della prenotazione
    setIsNewBookingModalOpen(true);
  };
  
  // Funzione per creare una prenotazione da una singola data
  const handleCreateBookingFromDate = (date: Date) => {
    // Imposta la data di inizio per il form di prenotazione
    setNewBookingStartDate(date);
    
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
  
  // Ottieni le informazioni di prenotazione per una data specifica
  const getBookingForDate = (date: Date): Booking | null => {
    const dateStr = dateToString(date);
    
    return bookings.find(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      const checkInStr = dateToString(checkIn);
      const checkOutStr = dateToString(checkOut);
      
      // La data è compresa tra check-in e check-out (incluso il check-in, escluso il check-out)
      return (dateStr >= checkInStr && dateStr < checkOutStr);
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
  
  // Ottieni il prezzo per una data specifica
  const getPriceForDate = (date: Date): number => {
    const dateStr = dateToString(date);
    if (dateStr in dailyRates && dailyRates[dateStr].price) {
      return dailyRates[dateStr].price!;
    }
    return apartmentData.price;
  };
  
  // Verifica se una data è oggi (considerando il fuso orario italiano)
  const isToday = (date: Date): boolean => {
    const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
    return dateToString(date) === dateToString(today);
  };
  
  // Ottieni tutte le prenotazioni raggruppate per periodo
  const getGroupedBookings = () => {
    // Filtra le prenotazioni visibili nel mese corrente
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // Aggiungiamo 7 giorni a inizio e fine mese per includere prenotazioni che si estendono da/verso altri mesi
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - 7);
    
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + 7);
    
    const startDateStr = dateToString(startDate);
    const endDateStr = dateToString(endDate);
    
    return bookings.filter(booking => {
      const checkInStr = dateToString(new Date(booking.checkIn));
      const checkOutStr = dateToString(new Date(booking.checkOut));
      
      // La prenotazione si sovrappone con il mese visualizzato
      return (checkInStr <= endDateStr && checkOutStr >= startDateStr);
    });
  };
  
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  // Prenotazioni visibili
  const visibleBookings = getGroupedBookings();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center space-x-2">
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
        
        {/* Modalità selezione */}
        <div className="flex items-center space-x-2">
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
            className={`px-3 py-1 text-sm rounded-md ${
              isSelectionMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {isSelectionMode ? 'Annulla Selezione' : 'Seleziona Più Date'}
          </button>
          
          {isSelectionMode && selectedDates.length > 0 && (
            <>
              <button
                onClick={() => setIsBulkEditModalOpen(true)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Modifica {selectedDates.length} Date
              </button>
              <button
                onClick={handleCreateBooking}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Nuova Prenotazione
              </button>
            </>
          )}
        </div>
        
        {/* Leggenda */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-500 mr-1"></div>
            <span>Prenotato</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-500 mr-1"></div>
            <span>Bloccato</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-500 mr-1"></div>
            <span>Prezzo Personalizzato</span>
          </div>
          {isSelectionMode && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-purple-100 border border-purple-500 mr-1"></div>
              <span>Selezionato</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Wrapper con posizionamento relativo per le prenotazioni */}
      <div className="relative">
        {/* Calendario */}
        <div ref={calendarGridRef} className="grid grid-cols-7 gap-1">
          {/* Intestazione giorni della settimana */}
          {weekdayNames.map((day, index) => (
            <div key={index} className="h-10 flex items-center justify-center font-medium">
              {day}
            </div>
          ))}
          
          {/* Celle del calendario */}
          {calendarDays.map((day, index) => {
            if (!day) return <div key={index} className="h-24 border border-gray-200"></div>;
            
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isTodayCell = isToday(day);
            const booking = getBookingForDate(day);
            const bookingPosition = booking ? getBookingPosition(day, booking) : undefined;
            const isBlocked = isDateBlocked(day);
            const hasCustomPrice = hasCustomRate(day) && dailyRates[dateToString(day)].price !== undefined;
            const price = getPriceForDate(day);
            const isSelected = isSelectionMode && isDateSelected(day);
            
            return (
              <DayCell
                key={index}
                date={day}
                isCurrentMonth={isCurrentMonth}
                isToday={isTodayCell}
                booking={booking}
                bookingPosition={bookingPosition}
                isBlocked={isBlocked}
                hasCustomPrice={hasCustomPrice}
                price={price}
                isSelected={isSelected}
                isSelectionMode={isSelectionMode}
                onClick={() => handleDayClick(day)}
                hideBookingDetails={true} // Nasconde i dettagli della prenotazione nella cella
                className="day-cell" // Classe per identificare le celle
              />
            );
          })}
        </div>
        
        {/* Prenotazioni sopra il calendario */}
        <div className="absolute top-10 left-0 right-0 pointer-events-none">
          {visibleBookings.map((booking) => {
            // Ottieni le date di inizio e fine nel formato corretto
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            
            // Trova le posizioni delle celle di inizio e fine
            const checkInPos = calendarPositions[dateToString(checkIn)];
            
            // Il giorno prima del checkout
            const lastDayDate = new Date(checkOut);
            lastDayDate.setDate(lastDayDate.getDate() - 1);
            const lastDayPos = calendarPositions[dateToString(lastDayDate)];
            
            // Se non abbiamo posizioni per queste date, non mostrare la prenotazione
            if (!checkInPos || !lastDayPos) return null;
            
            // Calcola la durata in giorni
            const durationMs = checkOut.getTime() - checkIn.getTime();
            const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
            
            // Calcola larghezza e posizione
            const left = checkInPos.left;
            const width = (lastDayPos.right - checkInPos.left) + 1; // +1 per il bordo
            
            return (
              <BookingStrip
                key={booking.id}
                booking={booking}
                style={{
                  left: `${left}px`,
                  width: `${width}px`,
                  top: `${checkInPos.top + 22}px`, // Posiziona sotto il numero del giorno
                }}
                onClick={() => {
                  // Trova la data di check-in e apri il modal per quella data
                  setSelectedDate(checkIn);
                  setIsRateModalOpen(true);
                }}
              />
            );
          })}
        </div>
      </div>
      
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
        endDate={new Date(new Date(newBookingStartDate).setDate(newBookingStartDate.getDate() + 1))}
        apartmentId={apartmentId}
        apartmentData={apartmentData}
      />
    </div>
  );
}
