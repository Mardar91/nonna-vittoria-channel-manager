'use client';

import { useState, useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from '@/components/NotificationItem';
import { BellIcon, CheckIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'unread' | 'booking' | 'checkin' | 'ical';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh
  } = useNotifications({ limit: 20 });

  // Filtra le notifiche in base al filtro selezionato
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'booking':
        return notification.type === 'new_booking' || notification.type === 'booking_inquiry';
      case 'checkin':
        return notification.type === 'new_checkin';
      case 'ical':
        return notification.type === 'ical_import';
      default:
        return true;
    }
  });

  // Gestisci mark as read
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);
      toast.success('Notifica segnata come letta');
    } catch (error) {
      toast.error('Errore nel marcare la notifica');
    }
  }, [markAsRead]);

  // Gestisci mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      toast.success('Tutte le notifiche sono state segnate come lette');
    } catch (error) {
      toast.error('Errore nel marcare tutte le notifiche');
    }
  }, [markAllAsRead]);

  // Gestisci eliminazione notifica
  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione');
      }
      
      await refresh();
      toast.success('Notifica eliminata');
    } catch (error) {
      toast.error('Errore nell\'eliminazione della notifica');
    }
  }, [refresh]);

  const filterButtons = [
    { value: 'all', label: 'Tutte', count: notifications.length },
    { value: 'unread', label: 'Non lette', count: unreadCount },
    { value: 'booking', label: 'Prenotazioni', icon: '📅' },
    { value: 'checkin', label: 'Check-in', icon: '✅' },
    { value: 'ical', label: 'Importate', icon: '🔄' }
  ];

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>Errore nel caricamento delle notifiche: {error}</p>
          <button
            onClick={refresh}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BellIcon className="h-8 w-8 text-gray-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} non lette` : 'Tutte lette'}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Segna tutte come lette</span>
            </button>
          )}
        </div>

        {/* Filtri */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <FunnelIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value as FilterType)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === btn.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {btn.icon && <span className="mr-1">{btn.icon}</span>}
              {btn.label}
              {btn.count !== undefined && (
                <span className="ml-1">({btn.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Notifiche */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Caricamento notifiche...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Nessuna notifica presente'
                : `Nessuna notifica ${filter === 'unread' ? 'non letta' : 'di questo tipo'}`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* Carica altro */}
        {hasMore && filter === 'all' && (
          <div className="p-4 text-center border-t">
            <button
              onClick={loadMore}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {loading ? 'Caricamento...' : 'Carica altre notifiche'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
