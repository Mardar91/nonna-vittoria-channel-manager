'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import DayCell from '@/components/DayCell';
import RateModal from '@/components/RateModal';
import BulkEditModal from '@/components/BulkEditModal';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [calendarDays, setCalendarDays] = useState<Array<Date | null>>([]);
  const [dailyRates, setDailyRates] = useState<Record<string, DailyRate>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Selezione multipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  
  // Formattazione date
  const dateToString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Carica il calendario per il mese corrente
  useEffect(() => {
    generateCalendarDays(currentYear, currentMonth);
    loadDailyRates();
  }, [currentYear, currentMonth]);
  
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
      // Altrimenti, apri il modal per una singola data
      setSelectedDate(date);
      setIsRateModalOpen(true);
    }
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
  
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
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
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Modifica {selectedDates.length} Date
            </button>
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
      
      {/* Calendario */}
      <div className="grid grid-cols-7 gap-1">
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
          const isToday = dateToString(day) === dateToString(new Date());
          const booking = getBookingForDate(day);
          const isBlocked = isDateBlocked(day);
          const hasCustomPrice = hasCustomRate(day) && dailyRates[dateToString(day)].price !== undefined;
          const price = getPriceForDate(day);
          const isSelected = isSelectionMode && isDateSelected(day);
          
          return (
            <DayCell
              key={index}
              date={day}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              booking={booking}
              isBlocked={isBlocked}
              hasCustomPrice={hasCustomPrice}
              price={price}
              isSelected={isSelected}
              isSelectionMode={isSelectionMode}
              onClick={() => handleDayClick(day)}
            />
          );
        })}
      </div>
      
      {/* Azioni rapide */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Azioni Rapide</h3>
        <div className="flex flex-wrap gap-2">
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
          onSave={handleSaveRate}
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
    </div>
  );
}
