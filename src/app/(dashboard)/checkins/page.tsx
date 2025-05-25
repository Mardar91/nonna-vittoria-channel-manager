'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardDocumentCheckIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AssignCheckInModal from '@/components/AssignCheckInModal';
import toast from 'react-hot-toast';

interface GuestInCheckIn {
  isMainGuest: boolean;
  firstName: string;
  lastName: string;
}

interface CheckInData {
  id: string;
  bookingId: string | null;
  apartmentName: string;
  mainGuestName: string;
  guestCount: number;
  checkInDate: string;
  completedAt: string | null;
  completedBy: string | null;
  status: string;
  bookingCheckIn?: string;
  bookingCheckOut?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  notes?: string;
}

export default function CheckInsPage() {
  const searchParams = useSearchParams();
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInData | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_assignment' | 'completed'>('all');
  
  // Controlla se c'è un'azione di assegnazione nei parametri URL
  useEffect(() => {
    const action = searchParams.get('action');
    const checkInId = searchParams.get('checkInId');
    
    if (action === 'assign' && checkInId) {
      // Trova il check-in da assegnare
      const checkIn = checkIns.find(c => c.id === checkInId);
      if (checkIn) {
        setSelectedCheckIn(checkIn);
        setShowAssignModal(true);
      }
    }
  }, [searchParams, checkIns]);
  
  useEffect(() => {
    fetchCheckIns();
  }, []);
  
  const fetchCheckIns = async () => {
    try {
      const response = await fetch('/api/checkins');
      if (!response.ok) throw new Error('Failed to fetch check-ins');
      
      const data = await response.json();
      setCheckIns(data);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      toast.error('Errore nel caricamento dei check-in');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignCheckIn = (checkIn: CheckInData) => {
    setSelectedCheckIn(checkIn);
    setShowAssignModal(true);
  };
  
  const handleAssignmentComplete = () => {
    setShowAssignModal(false);
    setSelectedCheckIn(null);
    fetchCheckIns(); // Ricarica la lista
    toast.success('Check-in assegnato con successo!');
  };
  
  const formatDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return 'N/A';
    return new Date(dateInput).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatCompletedBy = (completedBy: string | null): string => {
    if (!completedBy) return 'N/A';
    return completedBy === 'guest' ? 'Ospite' : 'Manuale';
  };
  
  const getStatusBadge = (checkIn: CheckInData) => {
    if (checkIn.status === 'pending_assignment') {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Da Smistare
        </span>
      );
    } else if (checkIn.completedBy === 'guest') {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          Online
        </span>
      );
    } else if (checkIn.completedBy) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          Manuale
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
        N/A
      </span>
    );
  };
  
  // Filtra i check-in in base allo stato selezionato
  const filteredCheckIns = checkIns.filter(checkIn => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending_assignment') return checkIn.status === 'pending_assignment';
    if (filterStatus === 'completed') return checkIn.status !== 'pending_assignment';
    return true;
  });
  
  // Conta i check-in per tipo
  const pendingAssignmentCount = checkIns.filter(c => c.status === 'pending_assignment').length;
  const onlineCount = checkIns.filter(c => c.completedBy === 'guest' && c.status !== 'pending_assignment').length;
  const manualCount = checkIns.filter(c => c.completedBy !== 'guest' && c.completedBy && c.status !== 'pending_assignment').length;
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <ClipboardDocumentCheckIcon className="h-8 w-8 mr-2 text-blue-600" />
          Check-ins
        </h1>
        
        {/* Filtri */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tutti ({checkIns.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending_assignment')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterStatus === 'pending_assignment'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Da Smistare ({pendingAssignmentCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterStatus === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Completati ({onlineCount + manualCount})
          </button>
        </div>
      </div>
      
      {/* Alert per check-in da smistare */}
      {pendingAssignmentCount > 0 && filterStatus !== 'pending_assignment' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Ci sono <strong>{pendingAssignmentCount}</strong> check-in da smistare.{' '}
                <button
                  onClick={() => setFilterStatus('pending_assignment')}
                  className="font-medium underline text-yellow-700 hover:text-yellow-600"
                >
                  Visualizza
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Check-in Totali</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {checkIns.length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Da Smistare</h3>
          <p className="mt-2 text-3xl font-semibold text-yellow-600">
            {pendingAssignmentCount}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Completati</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {onlineCount + manualCount}
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            {filterStatus === 'all' ? 'Tutti i Check-ins' : 
             filterStatus === 'pending_assignment' ? 'Check-ins da Smistare' :
             'Check-ins Completati'}
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          {filteredCheckIns.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filterStatus === 'pending_assignment' 
                  ? 'Nessun check-in da smistare'
                  : 'Nessun check-in trovato'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterStatus === 'pending_assignment'
                  ? 'Tutti i check-in sono stati assegnati.'
                  : 'Non ci sono check-in registrati.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ospite Principale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appartamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Ospiti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periodo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCheckIns.map((checkIn) => (
                  <tr key={checkIn.id} className={checkIn.status === 'pending_assignment' ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(checkIn.checkInDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {checkIn.mainGuestName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {checkIn.apartmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {checkIn.guestCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkIn.status === 'pending_assignment' && checkIn.requestedCheckIn ? (
                        <>
                          {new Date(checkIn.requestedCheckIn).toLocaleDateString('it-IT')} - 
                          {checkIn.requestedCheckOut ? new Date(checkIn.requestedCheckOut).toLocaleDateString('it-IT') : 'N/A'}
                        </>
                      ) : checkIn.bookingCheckIn && checkIn.bookingCheckOut ? (
                        <>
                          {new Date(checkIn.bookingCheckIn).toLocaleDateString('it-IT')} - 
                          {new Date(checkIn.bookingCheckOut).toLocaleDateString('it-IT')}
                        </>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkIn.completedAt ? formatDate(checkIn.completedAt) : 'Non completato'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(checkIn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/checkins/${checkIn.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <MagnifyingGlassIcon className="h-5 w-5" />
                        </Link>
                        {checkIn.status === 'pending_assignment' ? (
                          <button
                            onClick={() => handleAssignCheckIn(checkIn)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Smista
                          </button>
                        ) : checkIn.bookingId ? (
                          <Link
                            href={`/bookings/${checkIn.bookingId}`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Prenotazione
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Modal per assegnare check-in */}
      {showAssignModal && selectedCheckIn && (
        <AssignCheckInModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedCheckIn(null);
          }}
          checkIn={selectedCheckIn}
          onAssignmentComplete={handleAssignmentComplete}
        />
      )}
    </div>
  );
}
